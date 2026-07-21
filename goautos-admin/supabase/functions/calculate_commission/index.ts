
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client with the Auth context of the function
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sellerId, saleAmount } = await req.json();

    // Validate input
    if (!sellerId || !saleAmount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sellerId and saleAmount' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get the commission tiers for this seller
    const { data: tiers, error } = await supabase
      .from('seller_commission_tiers')
      .select('*')
      .eq('seller_id', sellerId)
      .order('max_amount', { ascending: true });

    if (error) {
      console.error('Error fetching commission tiers:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch commission tiers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // If no tiers are found, return default 0% commission
    if (!tiers || tiers.length === 0) {
      return new Response(
        JSON.stringify({ 
          commission: 0, 
          percentage: 0,
          message: 'No commission tiers found for this seller' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the applicable tier
    let applicableTier = tiers[0];
    for (const tier of tiers) {
      if (tier.is_infinity || saleAmount <= tier.max_amount) {
        applicableTier = tier;
        break;
      }
    }

    // Calculate commission. Soporta monto fijo (commission_type='fixed') además
    // del porcentaje. Para fijo, la comisión es el monto fijo configurado,
    // independiente del precio de venta.
    const commissionType = applicableTier.commission_type || 'percentage';
    let commission: number;
    let percentage: number;
    if (commissionType === 'fixed') {
      commission = Number(applicableTier.fixed_amount) || 0;
      percentage = 0;
    } else {
      percentage = Number(applicableTier.percentage);
      commission = saleAmount * (percentage / 100);
    }

    return new Response(
      JSON.stringify({
        commission,
        percentage,
        commission_type: commissionType,
        fixed_amount: Number(applicableTier.fixed_amount) || 0,
        tier: applicableTier,
        message: 'Commission calculated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating commission:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
