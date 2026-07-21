import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/definitions.ts';

interface VehicleResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface AppraisalResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface CombinedVehicleInfo {
  vehicleInfo?: VehicleResponse;
  appraisal?: AppraisalResponse;
}

type InfoType = 'vehicle' | 'appraisal' | 'both';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight reques
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Solo permitir métodos GET y POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Obtener la API key desde las variables de entorno
    const apiKey = Deno.env.get('GETAPI_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let patent: string;
    let infoType: InfoType = 'both'; // valor por defecto

    // Obtener la patente y tipo de información según el método
    if (req.method === 'GET') {
      const url = new URL(req.url);
      patent = url.searchParams.get('patent') || '';
      const typeParam = url.searchParams.get('type');
      if (typeParam && ['vehicle', 'appraisal', 'both'].includes(typeParam)) {
        infoType = typeParam as InfoType;
      }
    } else {
      const body = await req.json();
      patent = body.patent || '';
      if (body.type && ['vehicle', 'appraisal', 'both'].includes(body.type)) {
        infoType = body.type as InfoType;
      }
    }

    // Validar que se proporcionó una patente
    if (!patent) {
      return new Response(
        JSON.stringify({ error: 'Patent parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Limpiar la patente (remover espacios y convertir a mayúsculas)
    patent = patent.trim().toUpperCase();

    // Headers para las peticiones a la API
    const headers = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    };

    // Preparar las consultas según el tipo solicitado
    const requests: Promise<Response>[] = [];
    let vehicleInfoIndex = -1;
    let appraisalIndex = -1;

    if (infoType === 'vehicle' || infoType === 'both') {
      vehicleInfoIndex = requests.length;
      requests.push(
        fetch(`https://chile.getapi.cl/v1/vehicles/plate/${patent}`, {
          method: 'GET',
          headers,
        })
      );
    }

    if (infoType === 'appraisal' || infoType === 'both') {
      appraisalIndex = requests.length;
      requests.push(
        fetch(`https://chile.getapi.cl/v1/vehicles/appraisal/${patent}`, {
          method: 'GET',
          headers,
        })
      );
    }

    // Realizar las consultas en paralelo
    const responses = await Promise.allSettled(requests);

    // Inicializar respuestas
    let vehicleInfo: VehicleResponse | undefined;
    let appraisal: AppraisalResponse | undefined;

    // Procesar respuesta de información del vehículo si se solicitó
    if (vehicleInfoIndex >= 0) {
      const vehicleInfoResponse = responses[vehicleInfoIndex];
      if (
        vehicleInfoResponse.status === 'fulfilled' &&
        vehicleInfoResponse.value.ok
      ) {
        try {
          const data = await vehicleInfoResponse.value.json();
          vehicleInfo = { success: true, data };
        } catch (error) {
          vehicleInfo = {
            success: false,
            error: 'Error parsing vehicle info response',
          };
        }
      } else {
        const errorText =
          vehicleInfoResponse.status === 'fulfilled'
            ? await vehicleInfoResponse.value.text()
            : 'Request failed';
        vehicleInfo = {
          success: false,
          error: `Vehicle info request failed: ${errorText}`,
        };
      }
    }

    // Procesar respuesta de tasación si se solicitó
    if (appraisalIndex >= 0) {
      const appraisalResponse = responses[appraisalIndex];
      if (
        appraisalResponse.status === 'fulfilled' &&
        appraisalResponse.value.ok
      ) {
        try {
          const data = await appraisalResponse.value.json();
          appraisal = { success: true, data };
        } catch (error) {
          appraisal = {
            success: false,
            error: 'Error parsing appraisal response',
          };
        }
      } else {
        const errorText =
          appraisalResponse.status === 'fulfilled'
            ? await appraisalResponse.value.text()
            : 'Request failed';
        appraisal = {
          success: false,
          error: `Appraisal request failed: ${errorText}`,
        };
      }
    }

    // Respuesta combinada - solo incluir las propiedades solicitadas
    const response: CombinedVehicleInfo = {};
    if (vehicleInfo !== undefined) {
      response.vehicleInfo = vehicleInfo;
    }
    if (appraisal !== undefined) {
      response.appraisal = appraisal;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-info-by-patent function:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
