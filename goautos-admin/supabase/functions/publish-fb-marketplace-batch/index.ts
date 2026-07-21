import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { batchAddProducts, getCatalogInfo, getCatalogProducts } from '../_shared/facebook-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Helper functions for mapping
function mapCondition(condition: string | null): 'new' | 'used' {
  if (!condition) return 'used';
  const lower = condition.toLowerCase();
  if (lower.includes('nuevo') || lower.includes('new') || lower === '0km') return 'new';
  return 'used';
}

function mapVehicleToProduct(vehicle: any) {
  const brandName = vehicle.brand?.name || 'Desconocido';
  const modelName = vehicle.model?.name || 'Desconocido';
  const retailerId = vehicle.chassis_number || `goautos-${vehicle.id}`;
  const title = `${vehicle.year || ''} ${brandName} ${modelName}`.trim();

  // Build description with vehicle details
  const descriptionParts = [
    `🚗 ${brandName} ${modelName} ${vehicle.year || ''}`,
  ];
  if (vehicle.mileage) {
    descriptionParts.push(`📍 Kilometraje: ${vehicle.mileage.toLocaleString()} km`);
  }
  if (vehicle.transmission) {
    descriptionParts.push(`⚙️ Transmisión: ${vehicle.transmission}`);
  }
  if (vehicle.fuel_type?.name) {
    descriptionParts.push(`⛽ Combustible: ${vehicle.fuel_type.name}`);
  }
  if (vehicle.color?.name) {
    descriptionParts.push(`🎨 Color: ${vehicle.color.name}`);
  }
  if (vehicle.category?.name) {
    descriptionParts.push(`🏷️ Tipo: ${vehicle.category.name}`);
  }
  if (vehicle.description) {
    descriptionParts.push('', vehicle.description);
  }

  // Use simple product fields that work with batch API
  return {
    retailer_id: retailerId,
    name: title,
    description: descriptionParts.join('\n').substring(0, 5000),
    availability: 'in stock',
    condition: mapCondition(vehicle.condition?.name),
    price: vehicle.price || 0,
    currency: 'CLP',
    url: `https://portal.goauto.cl/vehiculos/${vehicle.id}`,
    image_url: vehicle.main_image || '',
    brand: brandName,
    // Internal fields for tracking (will be removed before sending)
    _vehicle_id: vehicle.id,
    _title: title,
    _price: vehicle.price,
    _retailer_id: retailerId,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vehicleIds, integrationId, clientId } = await req.json();
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

    if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Vehicle IDs array is required and must not be empty',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!integrationId || !clientId) {
      return new Response(
        JSON.stringify({
          error: 'Integration ID and Client ID are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Limit batch size to 100 vehicles per request
    if (vehicleIds.length > 100) {
      return new Response(
        JSON.stringify({
          error: 'Maximum 100 vehicles per batch request',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Batch adding vehicles to Facebook Catalog:', vehicleIds.length);

    // Fetch the integration
    const { data: integration, error: integrationError } = await supabase
      .from('fb_marketplace_integration')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Facebook integration not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!integration.access_token || !integration.catalog_id) {
      return new Response(
        JSON.stringify({
          error: 'Integration is missing access token or catalog ID',
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

    // DEBUG: Check catalog info and existing products
    console.log('=== DEBUG: Checking catalog ===');
    const catalogInfo = await getCatalogInfo(integration.catalog_id, integration.access_token);
    console.log('Catalog type:', catalogInfo.vertical);
    console.log('Product count:', catalogInfo.product_count);

    try {
      const existingProducts = await getCatalogProducts(integration.catalog_id, integration.access_token, 10);
      console.log('Existing products in catalog:', existingProducts.data?.length || 0);
    } catch (e) {
      console.log('Could not fetch existing products:', e);
    }
    console.log('=== END DEBUG ===');

    // Fetch all vehicles with relations
    const { data: vehicles, error: vehiclesError } = await supabase
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
      .in('id', vehicleIds);

    if (vehiclesError || !vehicles || vehicles.length === 0) {
      console.error('Vehicles not found:', vehiclesError);
      return new Response(
        JSON.stringify({ error: 'No vehicles found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check which vehicles are already in catalog
    const { data: existingPosts } = await supabase
      .from('fb_marketplace_post')
      .select('vehicle_id, status')
      .in('vehicle_id', vehicleIds)
      .eq('integration_id', integrationId)
      .eq('status', 'active');

    const alreadyPublishedIds = new Set(existingPosts?.map(p => p.vehicle_id) || []);

    // Filter out already published vehicles
    const vehiclesToPublish = vehicles.filter(v => !alreadyPublishedIds.has(v.id));

    if (vehiclesToPublish.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Todos los vehículos ya están en el catálogo',
          published: 0,
          skipped: vehicles.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map vehicles to Facebook product format
    const products = vehiclesToPublish.map(vehicle => mapVehicleToProduct(vehicle));

    console.log('Adding to Facebook Catalog:', integration.catalog_id);

    // Send batch request to Facebook
    // Clean up internal fields before sending
    const cleanProducts = products.map(({ _vehicle_id, _title, _price, _retailer_id, ...product }) => product);

    const fbResponse = await batchAddProducts(
      integration.catalog_id,
      cleanProducts,
      integration.access_token
    );

    console.log('Facebook batch response:', JSON.stringify(fbResponse, null, 2));

    // Process results and save to database
    const results = {
      success: [] as any[],
      errors: [] as any[],
    };

    // If batch was received successfully, save all vehicles to our database
    // Facebook processes them asynchronously, so we mark them as pending initially
    for (const product of products) {
      try {
        const postData = {
          vehicle_id: product._vehicle_id,
          integration_id: integrationId,
          client_id: clientId,
          fb_product_id: product._retailer_id, // Use vehicle_id as product reference
          fb_retailer_id: product._retailer_id,
          title: product._title,
          price: product._price,
          currency: 'CLP',
          status: 'active',
          availability: 'available',
          url_landing: `https://portal.goauto.cl/vehiculos/${product._vehicle_id}`,
          fb_product_url: `https://business.facebook.com/commerce/catalogs/${integration.catalog_id}/products`,
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabase.from('fb_marketplace_post').insert(postData);
        results.success.push({
          vehicle_id: product._vehicle_id,
          fb_retailer_id: product._retailer_id,
        });
      } catch (dbError: any) {
        console.error('Error saving post to database:', dbError);
        results.errors.push({
          vehicle_id: product._vehicle_id,
          error: dbError.message,
        });
      }
    }

    // Check for validation errors from Facebook
    if (fbResponse.validation_status && Array.isArray(fbResponse.validation_status)) {
      for (const item of fbResponse.validation_status) {
        if (item.errors && item.errors.length > 0) {
          results.errors.push({
            vehicle_id: item.vehicle_id,
            errors: item.errors.map((e: any) => e.message || e),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        published: results.success.length,
        errors: results.errors.length,
        skipped: alreadyPublishedIds.size,
        catalog_url: `https://business.facebook.com/commerce/catalogs/${integration.catalog_id}/products`,
        details: {
          success: results.success,
          errors: results.errors,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in batch publish:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al agregar vehículos al catálogo de Facebook',
        details: error.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
