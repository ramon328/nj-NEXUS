import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { validateRequest } from '../_shared/validation.ts';
import {
  createMediaContainer,
  createCarouselContainer,
  checkContainerStatus,
  publishCarousel,
  publishSingleImage,
} from '../_shared/instagram-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Received request:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body...');
    const { vehicle, description, clientId, imageUrls: reqImageUrls } = await req.json();
    console.log('Request body parsed. Vehicle ID:', vehicle?.id, 'Client ID:', clientId);

    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Validating request...');
    const validationError = validateRequest(vehicle, description, clientId);
    if (validationError) {
      console.error('Validation error:', validationError);
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Validation passed');

    console.log('Attempting to create Instagram post for vehicle:', vehicle.id);

    console.log('Fetching Instagram integration for client:', clientId);
    const { data: integration, error: integrationError } = await supabase
      .from('instagram_integrations')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

    console.log('Integration query result:', { integration: integration ? 'found' : 'not found', error: integrationError });

    if (integrationError || !integration) {
      console.error('Instagram integration not found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Instagram integration not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Integration found. IG Account ID:', integration.ig_account_id);

    // Pre-publish check: verify account type supports content publishing
    try {
      const checkUrl = `https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type&access_token=${integration.access_token}`;
      console.log('Checking account type...');
      const checkResponse = await fetch(checkUrl);
      const checkData = await checkResponse.json();
      console.log('Account info:', JSON.stringify(checkData));

      if (checkData.error) {
        console.error('Failed to verify account:', checkData.error);
        if (checkData.error.code === 190) {
          return new Response(
            JSON.stringify({
              error: 'El token de Instagram ha expirado. Por favor reconecta tu cuenta de Instagram.',
              code: 'TOKEN_EXPIRED',
            }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      } else if (checkData.account_type === 'PERSONAL') {
        console.error('Account is PERSONAL, content publishing not supported');
        return new Response(
          JSON.stringify({
            error: 'Para publicar en Instagram desde GoAuto necesitamos terminar de conectar tu cuenta. Escríbenos por el grupo de WhatsApp y la dejamos lista en unos minutos.',
            code: 'PERSONAL_ACCOUNT',
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (e) {
      console.warn('Could not verify account type, proceeding anyway:', e.message);
    }

    // Si el front mandó imágenes ya procesadas (4:5, optimizadas), usamos esas para que
    // Instagram NO las recorte. Si no, fallback a las imágenes del vehículo (legacy).
    const imageUrls = (
      Array.isArray(reqImageUrls) && reqImageUrls.length > 0
        ? reqImageUrls
        : [vehicle.main_image, ...(vehicle.gallery || [])].filter(Boolean)
    ).slice(0, 10); // Máximo 10 para el carrusel de Instagram
    console.log(
      `Processing ${imageUrls.length} images (max 10 allowed):`,
      imageUrls
    );

    let publishData: { id?: string; error?: any };

    // Instagram carousels require at least 2 images
    // If only 1 image, create a single image post instead
    if (imageUrls.length === 1) {
      console.log('Single image detected, creating single image post');

      // Create media container with caption for single image
      const mediaData = await createMediaContainer(
        integration.ig_account_id,
        imageUrls[0],
        integration.access_token,
        description // Include caption for single image post
      );

      if (mediaData.error) {
        console.error('Failed to create media container:', mediaData.error);
        const isUnsupported = mediaData.error?.message?.includes('Unsupported request') || mediaData.error?.message?.includes('All API URL formats failed');
        return new Response(
          JSON.stringify({
            error: isUnsupported
              ? 'Para publicar en Instagram desde GoAuto necesitamos terminar de conectar tu cuenta. Escríbenos por el grupo de WhatsApp y la dejamos lista en unos minutos.'
              : 'Failed to create media container',
            code: isUnsupported ? 'PUBLISH_NOT_SUPPORTED' : undefined,
            details: mediaData.error,
          }),
          {
            status: isUnsupported ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!mediaData.id) {
        console.error('No media ID returned:', mediaData);
        return new Response(
          JSON.stringify({
            error: 'Failed to get media ID',
            details: mediaData,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Successfully created media container with ID:', mediaData.id);

      // Check status and wait if needed
      const statusData = await checkContainerStatus(
        mediaData.id,
        integration.access_token
      );
      console.log('Media container status:', statusData);

      if (statusData.status_code && statusData.status_code !== 'FINISHED') {
        console.log('Waiting for media container to be ready. Status:', statusData.status_code);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      // Publish single image
      publishData = await publishSingleImage(
        integration.ig_account_id,
        mediaData.id,
        integration.access_token
      );
    } else {
      // Multiple images - create carousel
      console.log('Multiple images detected, creating carousel post');

      // Crear los contenedores de cada imagen EN PARALELO (antes era un loop
      // secuencial con esperas → lento con varias fotos).
      const childResults = await Promise.all(
        imageUrls.map((imageUrl) =>
          createMediaContainer(
            integration.ig_account_id,
            imageUrl,
            integration.access_token,
            undefined, // No caption for carousel children
            true // is_carousel_item
          )
        )
      );

      const failed = childResults.find((r) => r.error || !r.id);
      if (failed) {
        console.error('Failed to create media container for image:', failed.error);
        const isUnsupported =
          failed.error?.message?.includes('Unsupported request') ||
          failed.error?.message?.includes('All API URL formats failed');
        return new Response(
          JSON.stringify({
            error: isUnsupported
              ? 'Para publicar en Instagram desde GoAuto necesitamos terminar de conectar tu cuenta. Escríbenos por el grupo de WhatsApp y la dejamos lista en unos minutos.'
              : 'Failed to create media container for image',
            code: isUnsupported ? 'PUBLISH_NOT_SUPPORTED' : undefined,
            details: failed.error,
          }),
          {
            status: isUnsupported ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const childrenIds: string[] = childResults.map((r) => r.id as string);

      console.log('Successfully created media containers with IDs:', childrenIds);

      const carouselData = await createCarouselContainer(
        integration.ig_account_id,
        description,
        childrenIds,
        integration.access_token
      );

      if (carouselData.error) {
        console.error('Failed to create carousel container:', carouselData.error);
        return new Response(
          JSON.stringify({
            error: 'Failed to create carousel container',
            details: carouselData.error,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!carouselData.id) {
        console.error('No carousel ID returned:', carouselData);
        return new Response(
          JSON.stringify({
            error: 'Failed to get carousel ID',
            details: carouselData,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const carouselId = carouselData.id;
      console.log('Successfully created carousel container with ID:', carouselId);

      const statusData = await checkContainerStatus(
        carouselId,
        integration.access_token
      );
      console.log('Carousel container status:', statusData);

      if (statusData.status_code && statusData.status_code !== 'FINISHED') {
        console.log(
          'Waiting for carousel container to be ready. Current status:',
          statusData.status_code
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      publishData = await publishCarousel(
        integration.ig_account_id,
        carouselId,
        integration.access_token
      );
    }

    if (publishData.error) {
      console.error('Failed to publish post:', publishData.error);
      return new Response(
        JSON.stringify({
          error: 'Failed to publish Instagram post',
          details: publishData.error,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!publishData.id) {
      console.error('No publish ID returned:', publishData);
      return new Response(
        JSON.stringify({
          error: 'Failed to get published post ID',
          details: publishData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: updateError } = await supabase
      .from('vehicles')
      .update({ instagram_post_id: publishData.id })
      .eq('id', vehicle.id);

    if (updateError) {
      console.error(
        'Failed to update vehicle with Instagram post ID:',
        updateError
      );
    }

    console.log('Successfully created Instagram post with ID:', publishData.id);

    return new Response(
      JSON.stringify({
        success: true,
        postId: publishData.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-instagram-post function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An unknown error occurred',
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
