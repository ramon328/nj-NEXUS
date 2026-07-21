import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { ensureFreshMeliToken } from '../_shared/meli-token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Map Chilean coordinates to ML region code (CL-XX format).
// ML's /geolocation/address endpoint returns 404 (verified 2026-05-18 with and
// without Bearer auth) so we derive the region from latitude bounds. Chile is
// long and narrow, so latitude is enough to distinguish regions; longitude only
// guards against coords outside Chile. Mapping validated against all real
// clients with MeLi connected on 2026-05-18 (12/12 correct).
function inferChileRegionCode(lat: number, lng: number): string | null {
  if (lat > -17.5 || lat < -56 || lng > -66 || lng < -76) return null;
  if (lat > -19)    return 'AP'; // Arica y Parinacota
  if (lat > -22)    return 'TA'; // Tarapacá
  if (lat > -26)    return 'AN'; // Antofagasta
  if (lat > -29.5)  return 'AT'; // Atacama
  if (lat > -32)    return 'CO'; // Coquimbo
  if (lat > -33.13) return 'VS'; // Valparaíso
  if (lat > -34.3)  return 'RM'; // Metropolitana
  if (lat > -35.2)  return 'LI'; // O'Higgins
  if (lat > -36.0)  return 'ML'; // Maule
  if (lat > -36.6)  return 'NB'; // Ñuble
  if (lat > -38.5)  return 'BI'; // Biobío
  if (lat > -39.5)  return 'AR'; // Araucanía
  if (lat > -40.5)  return 'LR'; // Los Ríos
  if (lat > -43.5)  return 'LL'; // Los Lagos
  if (lat > -49)    return 'AI'; // Aysén
  return 'MA';                   // Magallanes
}

// Normaliza para comparar comunas: minúsculas, sin acentos, sin espacios extra.
function normalizeForMatch(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Elige el city_id correcto matcheando la comuna de la dirección del vendedor
// contra la lista de comunas que devuelve ML para la región. Antes se tomaba
// cities[0] a ciegas y, como ML devuelve "Alhue" primero en RM, TODOS los autos
// de la Metropolitana salían publicados en Alhué. La dirección de Google viene
// como "Calle 123, Comuna, Región ..., Chile", así que partimos por comas y
// buscamos qué comuna de ML coincide con una de esas partes.
function pickCityId(
  cities: { id: string; name: string }[],
  address: string
): string | undefined {
  if (!cities?.length) return undefined;
  const parts = (address || '')
    .split(',')
    .map((p) => normalizeForMatch(p))
    .filter(Boolean);
  if (parts.length) {
    // 1) Match exacto: una parte de la dirección == nombre de la comuna.
    const exact = cities.find((c) => parts.includes(normalizeForMatch(c.name)));
    if (exact) return exact.id;
    // 2) Match por contención: la comuna aparece dentro de alguna parte.
    const contained = cities.find((c) => {
      const name = normalizeForMatch(c.name);
      return name.length > 0 && parts.some((p) => p.includes(name));
    });
    if (contained) return contained.id;
  }
  // 3) Fallback: comportamiento anterior (primera comuna de la lista).
  return cities[0].id;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { publicationId } = await req.json();
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

    if (!publicationId) {
      return new Response(
        JSON.stringify({
          error: 'Publication ID is required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Republishing MercadoLibre publication:', publicationId);

    // Fetch the existing publication
    const { data: publication, error: publicationError } = await supabase
      .from('meli_post')
      .select('*, vehicle:vehicle_id(*)')
      .eq('id', publicationId)
      .single();

    if (publicationError || !publication) {
      console.error('Publication not found:', publicationError);
      return new Response(
        JSON.stringify({ error: 'Publication not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Publication data:', {
      id: publication.id,
      type_post: publication.type_post,
      status: publication.status,
      vehicle_id: publication.vehicle_id,
    });

    // Only allow republishing closed publications
    if (publication.status !== 'closed') {
      return new Response(
        JSON.stringify({
          error: 'Solo se pueden republicar publicaciones cerradas',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate that type_post exists
    if (!publication.type_post) {
      console.error('Publication type_post is null or undefined');
      return new Response(
        JSON.stringify({
          error: 'La publicación no tiene un tipo definido. Por favor, contacta al soporte.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch the MercadoLibre integration
    const { data: integration, error: integrationError } = await supabase
      .from('meli_integration')
      .select('*')
      .eq('user_id', publication.user_id)
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      console.error('MercadoLibre integration not found:', integrationError);
      return new Response(
        JSON.stringify({
          error: 'No se encontró una integración activa de MercadoLibre',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!integration.access_token) {
      return new Response(
        JSON.stringify({
          error: 'No access token found for this integration',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Asegurar token fresco (refresh robusto centralizado en _shared/meli-token).
    const tokenResult = await ensureFreshMeliToken(integration);
    if (!tokenResult.ok) {
      return new Response(
        JSON.stringify({
          error: tokenResult.error,
          tokenExpired: tokenResult.tokenExpired ?? false,
          details: tokenResult.details,
        }),
        {
          status: tokenResult.tokenExpired ? 401 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const accessToken = tokenResult.accessToken;

    // Validate token with /users/me endpoint
    console.log('Validating MercadoLibre token...');
    const validateTokenResponse = await fetch(
      'https://api.mercadolibre.com/users/me',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!validateTokenResponse.ok) {
      console.error('Token validation failed:', validateTokenResponse.status);
      return new Response(
        JSON.stringify({
          error: 'Token de MercadoLibre inválido o expirado. Por favor, reconecta tu cuenta en la configuración de MercadoLibre.',
          tokenExpired: true,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Token validated successfully');

    // Fetch the vehicle details with all relations
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select(
        `
        *,
        brand:brand_id(name),
        model:model_id(name),
        category:category_id(id, name),
        color:color_id(name),
        fuel_type:fuel_type_id(name),
        client:client_id(location),
        dealership:dealership_id(address, location)
      `
      )
      .eq('id', publication.vehicle_id)
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

    console.log('Vehicle fetched successfully');

    // Use fixed category for vehicles (cars and trucks) in Chile
    const categoryId = 'MLC1744';
    console.log('Using category for vehicles:', categoryId);

    // Resolve location from dealership/client coordinates using ML's geolocation API.
    // Antes adivinábamos la región por latitud y caía siempre en RM; ahora exigimos coords reales.
    console.log('Resolving location for republish...');

    let locationData = vehicle.dealership?.location || vehicle.client?.location;
    let fallbackDealershipAddress = '';

    if (!locationData?.lat || !locationData?.lng) {
      const { data: clientDealership } = await supabase
        .from('dealerships')
        .select('address, location')
        .eq('client_id', vehicle.client_id)
        .limit(1)
        .maybeSingle();
      if (clientDealership?.location?.lat && clientDealership?.location?.lng) {
        locationData = clientDealership.location;
        fallbackDealershipAddress = clientDealership.address || '';
        console.log('Using client dealership fallback location:', locationData);
      }
    }

    if (!locationData?.lat || !locationData?.lng) {
      return new Response(
        JSON.stringify({
          error:
            'Tu sucursal no tiene una ubicación configurada. Ve a Configuración → Sucursales, edita tu sucursal y marca tu ubicación real en el mapa antes de republicar.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const lat = parseFloat(locationData.lat);
    const lng = parseFloat(locationData.lng);
    console.log('Using coordinates for location lookup:', { lat, lng });

    const regionCode = inferChileRegionCode(lat, lng);
    if (!regionCode) {
      return new Response(
        JSON.stringify({
          error:
            'Las coordenadas de tu sucursal no parecen estar dentro de Chile. Edita la sucursal en Configuración → Sucursales y vuelve a marcar tu ubicación real en el mapa.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mlLocation: { state_id?: string; city_id?: string; zip_code?: string } = {};

    try {
      const stateResponse = await fetch(
        `https://api.mercadolibre.com/classified_locations/states/CL-${regionCode}`
      );
      if (stateResponse.ok) {
        const stateData = await stateResponse.json();
        if (stateData.id) mlLocation.state_id = stateData.id;
        if (stateData.cities?.length > 0) {
          // Para detectar la comuna preferimos la dirección geocodificada
          // (location.address: "Calle 123, Comuna, Región ..., Chile"), que trae
          // la comuna como parte propia; la columna address cruda a veces no la tiene.
          const sellerAddress =
            locationData?.address ||
            vehicle.dealership?.address ||
            fallbackDealershipAddress ||
            '';
          mlLocation.city_id = pickCityId(stateData.cities, sellerAddress);
        }
        console.log('Resolved ML location:', { regionCode, ...mlLocation });
      } else {
        console.error('classified_locations responded with non-ok status:', stateResponse.status);
      }
    } catch (err) {
      console.error('classified_locations lookup failed:', err);
    }

    if (!mlLocation.state_id) {
      return new Response(
        JSON.stringify({
          error:
            'No pudimos validar tu región con MercadoLibre. Inténtalo más tarde. Si el problema persiste, contacta a soporte.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Final ML location:', mlLocation);

    // Prepare pictures array
    const pictures = [];
    if (vehicle.main_image) {
      pictures.push({ source: vehicle.main_image });
    }
    if (vehicle.gallery && Array.isArray(vehicle.gallery)) {
      vehicle.gallery.forEach((imageUrl: string) => {
        if (imageUrl) {
          pictures.push({ source: imageUrl });
        }
      });
    }

    // Map type_post to MercadoLibre listing_type_id
    const listingTypeMap: Record<string, string> = {
      'free': 'free',
      'silver': 'silver',
      'gold': 'gold',
      'gold_premium': 'gold_premium',
    };

    const listingTypeId = listingTypeMap[publication.type_post] || 'free';

    console.log('Original type_post:', publication.type_post);
    console.log('Mapped listing_type_id:', listingTypeId);

    // Build the MercadoLibre post payload.
    // Importante: NO mandar `description` aquí. Aunque la doc sugiere `{plain_text}` inline,
    // ML lo ignora silenciosamente — verificado 2026-05-19 con items reales de Beichek.
    // La description se sube por separado vía PUT /items/{id}/description después de crear el item.
    const postPayload: any = {
      title: `${vehicle.brand?.name || ''} ${vehicle.model?.name || ''} ${
        vehicle.year || ''
      }`.trim(),
      channels: ['marketplace'],
      // MLC1744 (autos y camionetas) permite hasta 25 fotos. Antes el tope estaba
      // hardcodeado en 10 y se perdían las demás.
      pictures: pictures.slice(0, 25),
      category_id: categoryId,
      price: vehicle.price || 0,
      currency_id: 'CLP',
      listing_type_id: listingTypeId,
      available_quantity: 1,
      attributes: [],
    };

    // Location object — usa lo que devolvió la geolocation API, sin zip_code hardcoded.
    const address =
      fallbackDealershipAddress ||
      vehicle.dealership?.address ||
      locationData?.address ||
      '';
    const locationObj: any = { address_line: address };
    if (mlLocation.zip_code) locationObj.zip_code = mlLocation.zip_code;
    if (mlLocation.city_id) locationObj.city = { id: mlLocation.city_id };
    if (mlLocation.state_id) locationObj.state = { id: mlLocation.state_id };
    postPayload.location = locationObj;

    // Add video_id if available
    if (vehicle.video_url) {
      const youtubeMatch = vehicle.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      if (youtubeMatch) {
        postPayload.video_id = youtubeMatch[1];
      }
    }

    // Parse features JSON if available
    let features: any = {};
    if (vehicle.features && typeof vehicle.features === 'object') {
      features = vehicle.features;
    }

    // Add brand attribute
    if (vehicle.brand?.name) {
      postPayload.attributes.push({
        id: 'BRAND',
        value_name: vehicle.brand.name,
      });
    }

    // Add model attribute
    if (vehicle.model?.name) {
      postPayload.attributes.push({
        id: 'MODEL',
        value_name: vehicle.model.name,
      });
    }

    // Add license plate attribute — ML acepta LICENSE_PLATE en MLC1744.
    if (vehicle.license_plate) {
      postPayload.attributes.push({
        id: 'LICENSE_PLATE',
        value_name: vehicle.license_plate,
      });
    }

    // Add year attribute
    if (vehicle.year) {
      postPayload.attributes.push({
        id: 'VEHICLE_YEAR',
        value_name: vehicle.year.toString(),
      });
    }

    // Add doors attribute
    const doors = features.doors || features.Doors || features.puertas || 4;
    postPayload.attributes.push({
      id: 'DOORS',
      value_name: doors.toString(),
    });

    // Add mileage attribute
    if (vehicle.mileage) {
      postPayload.attributes.push({
        id: 'KILOMETERS',
        value_name: `${vehicle.mileage} km`,
      });
    }

    // Add fuel type attribute
    if (vehicle.fuel_type?.name) {
      const fuelTypeMap: Record<string, string> = {
        'gasolina': 'Bencina',
        'Gasolina': 'Bencina',
        'bencina': 'Bencina',
        'Bencina': 'Bencina',
        'diesel': 'Diésel',
        'Diesel': 'Diésel',
        'diésel': 'Diésel',
        'Diésel': 'Diésel',
        'eléctrico': 'Eléctrico',
        'Eléctrico': 'Eléctrico',
        'electrico': 'Eléctrico',
        'Electrico': 'Eléctrico',
        'híbrido': 'Híbrido',
        'Híbrido': 'Híbrido',
        'hibrido': 'Híbrido',
        'Hibrido': 'Híbrido',
        'gnc': 'GNC',
        'GNC': 'GNC',
        'glp': 'GLP',
        'GLP': 'GLP',
      };

      const mappedFuelType = fuelTypeMap[vehicle.fuel_type.name] || vehicle.fuel_type.name;

      postPayload.attributes.push({
        id: 'FUEL_TYPE',
        value_name: mappedFuelType,
      });
    }

    // Add color attribute
    if (vehicle.color?.name) {
      const colorName = vehicle.color.name.charAt(0).toUpperCase() + vehicle.color.name.slice(1);
      postPayload.attributes.push({
        id: 'COLOR',
        value_name: colorName,
      });
    }

    // Add transmission attribute
    if (vehicle.transmission) {
      const transmissionMap: Record<string, string> = {
        'manual': 'Manual',
        'Manual': 'Manual',
        'automática': 'Automática',
        'Automática': 'Automática',
        'automatica': 'Automática',
        'Automatica': 'Automática',
        'semiautomática': 'Semiautomática',
        'Semiautomática': 'Semiautomática',
        'semiautomatica': 'Semiautomática',
        'Semiautomatica': 'Semiautomática',
        'cvt': 'CVT',
        'CVT': 'CVT',
      };

      const mappedTransmission = transmissionMap[vehicle.transmission] || vehicle.transmission;

      postPayload.attributes.push({
        id: 'TRANSMISSION',
        value_name: mappedTransmission,
      });
    }

    // Add engine attribute
    if (features.engine) {
      postPayload.attributes.push({
        id: 'ENGINE',
        value_name: features.engine.toString(),
      });
    }

    // Add condition attribute
    postPayload.attributes.push({
      id: 'ITEM_CONDITION',
      value_id: '2230581',
    });

    // Add passenger capacity attribute
    if (features.passenger_capacity || features.passengerCapacity) {
      postPayload.attributes.push({
        id: 'PASSENGER_CAPACITY',
        value_name: (features.passenger_capacity || features.passengerCapacity).toString(),
      });
    }

    // Add trim attribute (REQUIRED en ML) - preferir la versión real del
    // vehículo; si no hay, caer a features y por último 'Base' (ML exige valor).
    const versionName =
      typeof vehicle.version_name === 'string' ? vehicle.version_name.trim() : '';
    const trim = versionName || features.trim || features.Trim || 'Base';
    postPayload.attributes.push({
      id: 'TRIM',
      value_name: trim,
    });

    console.log('========================================');
    console.log('PAYLOAD COMPLETO PARA REPUBLICAR EN MERCADOLIBRE:');
    console.log('========================================');
    console.log(JSON.stringify(postPayload, null, 2));
    console.log('========================================');

    // Create new item in MercadoLibre (republishing creates a new item)
    const meliResponse = await fetch('https://api.mercadolibre.com/items', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postPayload),
    });

    const meliData = await meliResponse.json();

    console.log(
      'MercadoLibre API response status:',
      meliResponse.status,
      meliData
    );

    // Status 402 (payment_required) is considered a successful creation
    const isSuccess = meliResponse.ok || meliResponse.status === 402;

    if (!isSuccess || meliData.error) {
      console.error('Error republishing to MercadoLibre:', JSON.stringify(meliData));

      let errorMessage = 'Failed to republish vehicle to MercadoLibre';
      if (meliData.message && meliData.message.includes('free')) {
        errorMessage = 'Has alcanzado el límite de publicaciones gratuitas. Por favor, elimina una publicación Free existente o selecciona un plan de pago.';
      } else if (meliData.cause && Array.isArray(meliData.cause)) {
        const freeError = meliData.cause.find((c: any) =>
          c.message && c.message.toLowerCase().includes('free')
        );
        if (freeError) {
          errorMessage = 'Has alcanzado el límite de publicaciones gratuitas. Por favor, elimina una publicación Free existente o selecciona un plan de pago.';
        }
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          details: meliData,
        }),
        {
          status: meliResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!meliData.id) {
      console.error('No item ID returned from MercadoLibre');
      return new Response(
        JSON.stringify({
          error: 'No se pudo crear la publicación en MercadoLibre',
          details: meliData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Upload description as separate PUT — ML ignora `description` en el POST de /items
    // pero acepta el endpoint dedicado /items/{id}/description con body { plain_text }.
    // Si falla, no queremos romper la republicación que ya está creada; solo logueamos.
    const descriptionText = vehicle.description?.trim();
    if (descriptionText) {
      try {
        const descResponse = await fetch(
          `https://api.mercadolibre.com/items/${meliData.id}/description`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ plain_text: descriptionText }),
          }
        );
        if (!descResponse.ok) {
          const descError = await descResponse.text();
          console.error('Description upload failed:', descResponse.status, descError);
        } else {
          console.log('Description uploaded successfully for item', meliData.id);
        }
      } catch (descErr) {
        console.error('Description upload threw:', descErr);
      }
    }

    // Update the existing publication record with new item ID and URL
    const { error: updateError } = await supabase
      .from('meli_post')
      .update({
        meli_item_id: meliData.id,
        url_post: meliData.permalink,
        status: meliData.status,
        update_at: new Date().toISOString(),
      })
      .eq('id', publicationId);

    if (updateError) {
      console.error('Error updating meli_post table:', updateError);
    }

    console.log(
      'Successfully republished vehicle to MercadoLibre with ID:',
      meliData.id
    );

    return new Response(
      JSON.stringify({
        success: true,
        itemId: meliData.id,
        permalink: meliData.permalink,
        status: meliData.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in republish-mercadolibre-vehicle function:', error);
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
