import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const client_id = Number(url.searchParams.get("client_id"));
    const dealership_id = Number(url.searchParams.get("dealership_id"));
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const tz = url.searchParams.get("tz") || "America/Santiago";

    if (!client_id || !dealership_id) {
      return new Response(
        JSON.stringify({ error: "Missing required query params: client_id and dealership_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const { data, error } = await supabase
      .schema("goauto_sched")
      .rpc("fn_compute_availability", {
        p_client_id: client_id,
        p_dealership_id: dealership_id,
        p_date: date,
        p_timezone: tz,
      });

    if (error) {
      console.error("RPC fn_compute_availability error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to compute availability", details: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    return new Response(JSON.stringify(data ?? []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("availability function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
