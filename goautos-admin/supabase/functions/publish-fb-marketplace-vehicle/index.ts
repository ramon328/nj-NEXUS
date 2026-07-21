import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { createMarketplaceListing } from '../_shared/facebook-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Helper functions for mapping vehicle data to Marketplace listing format
function mapCondition(condition: string | null): 'NEW' | 'USED_LIKE_NEW' | 'USED_GOOD' | 'USED_FAIR' {
  if (!condition) return 'USED_GOOD';
  const lower = condition.toLowerCase();
  if (lower.includes('nuevo') || lower.includes('new') || lower === '0km') return 'NEW';
  if (lower.includes('excelente') || lower.includes('excellent')) return 'USED_LIKE_NEW';
  if (lower.includes('bueno') || lower.includes('good')) return 'USED_GOOD';
  return 'USED_FAIR';
}

function mapBodyStyle(category: string | null): string {
  if (!category) return 'OTHER';
  const categoryMap: Record<string, string> = {
    'sedan': 'SEDAN',
    'sedán': 'SEDAN',
    'suv': 'SUV',
    'camioneta': 'TRUCK',
    'pickup': 'TRUCK',
    'hatchback': 'HATCHBACK',
    'coupe': 'COUPE',
    'coupé': 'COUPE',
    'van': 'VAN',
    'minivan': 'MINIVAN',
    'wagon': 'WAGON',
  };
  const lower = category.toLowerCase();
  return categoryMap[lower] || 'OTHER';
}

function mapFuelType(fuelType: string | null): string {
  if (!fuelType) return 'GASOLINE';
  const lower = fuelType.toLowerCase();
  if (lower.includes('diesel') || lower.includes('petrol')) return 'DIESEL';
  if (lower.includes('electr')) return 'ELECTRIC';
  if (lower.includes('hibrid') || lower.includes('hybrid')) return 'HYBRID';
  if (lower.includes('gas') || lower.includes('glp')) return 'FLEX';
  return 'GASOLINE';
}

function mapTransmission(transmission: string | null): string {
  if (!transmission) return 'AUTOMATIC';
  const lower = transmission.toLowerCase();
  if (lower.includes('manual') || lower.includes('mecanic')) return 'MANUAL';
  return 'AUTOMATIC';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vehicleId, integrationId, clientId } = await req.json();
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!vehicleId || !integrationId || !clientId) {
      return new Response(
        JSON.stringify({
          error: 'Vehicle ID, Integration ID, and Client ID are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Publishing vehicle to Facebook Marketplace:', vehicleId);

    // Fetch the integration
    const { data: integration, error: integrationError } = await supabase
      .from('fb_marketplace_integration')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Facebook Marketplace integration not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!integration.access_token || !integration.fb_page_id) {
      return new Response(
        JSON.stringify({
          error: 'Integration is missing access token or Facebook Page ID',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if token is expired
    if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          error: 'Token de Facebook expirado. Por favor, reconecta tu cuenta.',
          tokenExpired: true,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch the vehicle with all relations
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select(`
        *,
        brand:brand_id(name),
        model:model_id(name),
        category:category_id(name),
        color:color_id(name),
        condition:condition_id(name),
        fuel_type:fuel_type_id(name),
        dealership:dealership_id(address, location, name)
      `)
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      console.error('Vehicle not found:', vehicleError);
      return new Response(
        JSON.stringify({ error: 'Vehicle not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if vehicle is already published
    const { data: existingPost } = await supabase
      .from('fb_marketplace_post')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('integration_id', integrationId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingPost) {
      return new Response(
        JSON.stringify({
          error: 'Este vehículo ya está publicado en Facebook Marketplace',
          existingPost,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build listing data for Facebook Marketplace
    const brandName = vehicle.brand?.name || '';
    const modelName = vehicle.model?.name || '';
    const title = `${vehicle.year || ''} ${brandName} ${modelName}`.trim();

    // Build description
    const descriptionParts = [title];
    if (vehicle.mileage) {
      descriptionParts.push(`Kilometraje: ${vehicle.mileage.toLocaleString()} km`);
    }
    if (vehicle.transmission) {
      descriptionParts.push(`Transmisión: ${vehicle.transmission}`);
    }
    if (vehicle.fuel_type?.name) {
      descriptionParts.push(`Combustible: ${vehicle.fuel_type.name}`);
    }
    if (vehicle.color?.name) {
      descriptionParts.push(`Color: ${vehicle.color.name}`);
    }
    if (vehicle.description) {
      descriptionParts.push('', vehicle.description);
    }

    // Prepare photos (main image + gallery, max 10)
    const photos: string[] = [];
    if (vehicle.main_image) {
      photos.push(vehicle.main_image);
    }
    if (vehicle.gallery && Array.isArray(vehicle.gallery)) {
      for (const img of vehicle.gallery) {
        if (img && photos.length < 10) {
          photos.push(img);
        }
      }
    }

    // Build listing data
    const listingData: any = {
      listing_type: 'VEHICLES',
      description: descriptionParts.join('\n').substring(0, 5000),
      price: Math.round(vehicle.price || 0),
      currency: 'CLP',
      photos,
      availability: 'IN_STOCK',
      condition: mapCondition(vehicle.condition?.name),
    };

    // Add vehicle-specific fields
    if (brandName) listingData.make = brandName;
    if (modelName) listingData.model = modelName;
    if (vehicle.year) listingData.year = vehicle.year;
    if (vehicle.mileage) {
      listingData.mileage = { value: vehicle.mileage, unit: 'KM' };
    }
    if (vehicle.category?.name) {
      listingData.body_style = mapBodyStyle(vehicle.category.name);
    }
    if (vehicle.fuel_type?.name) {
      listingData.fuel_type = mapFuelType(vehicle.fuel_type.name);
    }
    if (vehicle.transmission) {
      listingData.transmission = mapTransmission(vehicle.transmission);
    }
    if (vehicle.color?.name) {
      listingData.exterior_color = vehicle.color.name;
    }
    if (vehicle.chassis_number) {
      listingData.vin = vehicle.chassis_number;
    }

    console.log('Publishing to Facebook Page:', integration.fb_page_id);
    console.log('Listing data:', JSON.stringify(listingData, null, 2));

    // Publish to Facebook Marketplace
    const fbResponse = await createMarketplaceListing(
      integration.fb_page_id,
      listingData,
      integration.access_token
    );

    console.log('Facebook response:', fbResponse);

    if (!fbResponse.id) {
      throw new Error('No listing ID returned from Facebook');
    }

    // Save to database
    const postData = {
      vehicle_id: vehicleId,
      integration_id: integrationId,
      client_id: clientId,
      fb_product_id: fbResponse.id,
      title,
      price: vehicle.price,
      currency: 'CLP',
      status: 'active',
      availability: 'available',
      fb_product_url: `https://www.facebook.com/marketplace/item/${fbResponse.id}`,
      last_synced_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: dbError } = await supabase
      .from('fb_marketplace_post')
      .insert(postData);

    if (dbError) {
      console.error('Error saving post to database:', dbError);
      // Don't fail the request, the listing is already on Facebook
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          fb_listing_id: fbResponse.id,
          title,
          fb_product_url: `https://www.facebook.com/marketplace/item/${fbResponse.id}`,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error publishing to Facebook Marketplace:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al publicar en Facebook Marketplace',
        details: error.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
