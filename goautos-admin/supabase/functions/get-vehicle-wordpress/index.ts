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
  gallery?: string[];
  description?: string;
  color?: string;
  transmision?: string;
  combustible?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const url = new URL(req.url);
    const id = parseInt(url.searchParams.get('id') || '0');

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing or invalid vehicle id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select(
        `
        id,
        year,
        price,
        mileage,
        main_image,
        gallery,
        label,
        description,
        transmission,
        brand:brand_id(name),
        model:model_id(name),
        color:color_id(name),
        fuel_type:fuel_type_id(name)
      `
      )
      .eq('id', id)
      .single();

    if (error || !vehicle) {
      return new Response(
        JSON.stringify({ success: false, message: 'Vehicle not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const formatted: VehicleResponse = {
      id: vehicle.id,
      marca: vehicle.brand?.name || '',
      modelo: vehicle.model?.name || '',
      version: vehicle.label || undefined,
      año: vehicle.year || 0,
      precio: vehicle.price || 0,
      kms: vehicle.mileage || 0,
      gallery: vehicle.gallery || [],
      description: vehicle.description || '',
      main_image_url: vehicle.main_image || undefined,
      color: vehicle.color?.name || undefined,
      transmision: vehicle.transmission || undefined,
      combustible: vehicle.fuel_type?.name || undefined,
    };

    return new Response(JSON.stringify({ success: true, data: formatted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
