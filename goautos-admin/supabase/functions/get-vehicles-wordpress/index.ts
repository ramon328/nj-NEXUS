import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface VehicleResponse {
  id: number;
  marca: string;
  modelo: string;
  version?: string;
  año: number;
  precio: number;
  kms: number;
  main_image_url?: string;
  category?: string;
  transmision?: string;
  combustible?: string;
  status?: string;
  disponible: boolean;
}

interface ApiResponse {
  success: boolean;
  data: VehicleResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Method not allowed. Use GET.',
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  console.log('Request received:', req.url);

  try {
    const url = new URL(req.url);
    const client_id = parseInt(url.searchParams.get('client_id') || '0');
    console.log('Client ID:', client_id);
    const page = parseInt(url.searchParams.get('page') || '1');
    console.log('Page:', page);
    const limitParam = url.searchParams.get('limit');
    // Si no se pasa limit o es 'all', retorna todos. Si se pasa un número, usa ese límite.
    const limit = !limitParam || limitParam === 'all' ? null : parseInt(limitParam);
    console.log('Limit:', limit ?? 'all');
    const available_only = url.searchParams.get('available_only') !== 'false';
    console.log('Available only (show_in_web=true):', available_only);

    // Validate required parameters
    if (!client_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'client_id parameter is required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate pagination parameters
    if (page < 1) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'page must be greater than 0',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (limit !== null && (limit < 1 || limit > 1000)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'limit must be between 1 and 1000, or use "all" for no limit',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', client_id)
      .single();
    console.log('Client:', client);

    if (clientError || !client) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid client_id',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate offset for pagination (only if limit is set)
    const offset = limit ? (page - 1) * limit : 0;

    // If filtering by available, get status IDs with show_in_web = true OR name = 'Publicado'
    let availableStatusIds: number[] = [];
    if (available_only) {
      // Get statuses with show_in_web = true
      const { data: showInWebStatuses } = await supabase
        .from('clients_vehicles_states')
        .select('id')
        .eq('client_id', client_id)
        .eq('show_in_web', true);

      // Get statuses with name 'Publicado' (case insensitive)
      const { data: publishedStatuses } = await supabase
        .from('clients_vehicles_states')
        .select('id')
        .eq('client_id', client_id)
        .ilike('name', '%publicado%');

      // Combine both sets of IDs (removing duplicates)
      const showInWebIds = showInWebStatuses?.map(s => s.id) || [];
      const publishedIds = publishedStatuses?.map(s => s.id) || [];
      availableStatusIds = [...new Set([...showInWebIds, ...publishedIds])];

      console.log('Available status IDs (show_in_web OR Publicado):', availableStatusIds);

      if (availableStatusIds.length === 0) {
        // No matching statuses, return empty result
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Fetch vehicles with pagination and required relationships
    let query = supabase
      .from('vehicles')
      .select(
        `
        id,
        year,
        price,
        mileage,
        main_image,
        label,
        transmission,
        fuel_type:fuel_type_id(name),
        brand:brand_id(name),
        model:model_id(name),
        category:category_id(name),
        status:status_id(name, show_in_web)
      `,
        { count: 'exact' }
      )
      .eq('client_id', client_id);

    // Only filter by available status (show_in_web=true) if available_only is true
    if (available_only && availableStatusIds.length > 0) {
      query = query.in('status_id', availableStatusIds);
    }

    // Apply ordering
    query = query.order('created_at', { ascending: false });

    // Apply pagination only if limit is set
    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    const {
      data: vehicles,
      error: vehiclesError,
      count,
    } = await query;

    if (vehiclesError) {
      console.error('Error fetching vehicles:', vehiclesError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Error fetching vehicles',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Format response data
    const formattedVehicles: VehicleResponse[] = vehicles.map((vehicle) => ({
      id: vehicle.id,
      marca: vehicle.brand?.name || '',
      modelo: vehicle.model?.name || '',
      version: vehicle.label || undefined,
      año: vehicle.year || 0,
      precio: vehicle.price || 0,
      kms: vehicle.mileage || 0,
      main_image_url: vehicle.main_image || undefined,
      category: vehicle.category?.name || '',
      transmision: vehicle.transmission || '',
      combustible: vehicle.fuel_type?.name || '',
      status: vehicle.status?.name || '',
      disponible: vehicle.status?.show_in_web || false,
    }));
    console.log('Formatted vehicles:', formattedVehicles);

    const total = count || 0;
    const totalPages = limit ? Math.ceil(total / limit) : 1;

    const response: ApiResponse = {
      success: true,
      data: formattedVehicles,
      pagination: {
        page: limit ? page : 1,
        limit: limit || total,
        total,
        totalPages,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
