import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { publishToInstagram } from '../_shared/instagram-api.ts';

// Procesa las publicaciones de Instagram PROGRAMADAS que ya vencieron.
// Lo invoca el cron `process-scheduled-instagram` (cada 5 min) vía pg_net.
// verify_jwt = false (ver config.toml): usa su propia SERVICE_ROLE_KEY (saltea
// RLS) y, opcionalmente, valida un secreto compartido (SCHEDULE_CRON_SECRET).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const MAX_ATTEMPTS = 3;
const BATCH = 10;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Guard opcional: si SCHEDULE_CRON_SECRET está seteado, exige el header.
  const secret = Deno.env.get('SCHEDULE_CRON_SECRET');
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const nowIso = new Date().toISOString();
  const result = { processed: 0, published: 0, failed: 0, skipped: 0 };

  try {
    const { data: due, error } = await supabase
      .from('instagram_scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(BATCH);

    if (error) throw error;

    for (const post of due ?? []) {
      // Reclamo atómico: solo procesa si sigue 'pending' (evita doble-publicado
      // si dos corridas del cron se solapan).
      const { data: claimed } = await supabase
        .from('instagram_scheduled_posts')
        .update({ status: 'processing' })
        .eq('id', post.id)
        .eq('status', 'pending')
        .select('id');

      if (!claimed || claimed.length === 0) {
        result.skipped++;
        continue;
      }
      result.processed++;

      try {
        const { data: integration } = await supabase
          .from('instagram_integrations')
          .select('ig_account_id, access_token')
          .eq('client_id', post.client_id)
          .maybeSingle();

        if (!integration?.ig_account_id || !integration?.access_token) {
          throw new Error('No hay integración de Instagram para el cliente');
        }

        const imageUrls: string[] = Array.isArray(post.image_urls)
          ? post.image_urls
          : [];

        const { id: postId } = await publishToInstagram(
          integration.ig_account_id,
          integration.access_token,
          imageUrls,
          post.description ?? ''
        );

        await supabase
          .from('instagram_scheduled_posts')
          .update({
            status: 'published',
            instagram_post_id: postId,
            error_message: null,
            processed_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        // Refleja el último post publicado en el vehículo (igual que el flujo on-demand).
        await supabase
          .from('vehicles')
          .update({ instagram_post_id: postId })
          .eq('id', post.vehicle_id);

        result.published++;
      } catch (e) {
        const attempts = (post.attempts ?? 0) + 1;
        const failedNow = attempts >= MAX_ATTEMPTS;
        await supabase
          .from('instagram_scheduled_posts')
          .update({
            status: failedNow ? 'failed' : 'pending', // reintenta hasta MAX_ATTEMPTS
            attempts,
            error_message: String((e as Error)?.message ?? e).slice(0, 500),
            processed_at: failedNow ? new Date().toISOString() : null,
          })
          .eq('id', post.id);
        if (failedNow) result.failed++;
        console.error('scheduled IG publish failed for post', post.id, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, at: nowIso, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('process-scheduled-instagram error:', e);
    return new Response(
      JSON.stringify({ error: String((e as Error)?.message ?? e) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
