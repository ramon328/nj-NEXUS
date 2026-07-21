import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Proxy server-side de la API de dominios de Vercel. El token NUNCA llega al
// cliente: vive como secret de la edge function. Maneja subdominios *.goauto.cl
// (onboarding) y dominios propios (custom domains) de los clientes.
//
// Secrets requeridos (supabase secrets set ...):
//   VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID
// verify_jwt = true → sólo usuarios autenticados pueden invocarla.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VERCEL_TOKEN = Deno.env.get('VERCEL_TOKEN') || '';
const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID') || '';
const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID') || '';

const vercelHeaders = { Authorization: `Bearer ${VERCEL_TOKEN}` };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const normalize = (data: any, fallback: string) => ({
  name: data?.name ?? fallback,
  verified: !!data?.verified,
  verification: Array.isArray(data?.verification) ? data.verification : undefined,
});

// Estado REAL: propiedad verificada (verified) + DNS apuntando a Vercel
// (misconfigured). El dominio sirve tráfico sólo si verified && !misconfigured.
async function getStatus(domain: string) {
  const projUrl = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`;
  const projRes = await fetch(projUrl, { headers: vercelHeaders });
  if (!projRes.ok) {
    throw new Error(`status ${projRes.status}: ${await projRes.text()}`);
  }
  const base = normalize(await projRes.json(), domain);

  let misconfigured = true;
  try {
    const cfgRes = await fetch(
      `https://api.vercel.com/v6/domains/${domain}/config?teamId=${VERCEL_TEAM_ID}`,
      { headers: vercelHeaders }
    );
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      misconfigured = !!cfg?.misconfigured;
    }
  } catch (_e) {
    misconfigured = true;
  }
  return { ...base, misconfigured };
}

async function addDomain(domain: string) {
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`,
    {
      method: 'POST',
      headers: { ...vercelHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: domain }),
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    if (
      res.status === 409 &&
      (txt.includes('domain_already_exists') || txt.includes('domain_already_in_use'))
    ) {
      // Ya estaba conectado al proyecto: devolvemos su estado actual.
      return { conflict: false, body: txt };
    }
    return { error: txt, status: res.status };
  }
  return { ok: true, body: await res.json() };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID || !VERCEL_TEAM_ID) {
    return json(
      {
        error:
          'Vercel no está configurado en el servidor. Falta VERCEL_TOKEN / VERCEL_PROJECT_ID / VERCEL_TEAM_ID.',
      },
      500
    );
  }

  try {
    const { action, domain, name } = await req.json();

    if (action === 'add-subdomain') {
      // Onboarding: crea {name}.goauto.cl
      const slug = String(name || '')
        .trim()
        .toLowerCase();
      if (!slug) return json({ error: 'name requerido' }, 400);
      const full = `${slug}.goauto.cl`;
      const result = await addDomain(full);
      if ('error' in result && result.error) {
        return json({ error: `No se pudo crear el subdominio: ${result.error}` }, 502);
      }
      return json({ ok: true, name: full });
    }

    const clean = String(domain || '')
      .trim()
      .toLowerCase();
    if (!clean) return json({ error: 'domain requerido' }, 400);

    if (action === 'add') {
      const result = await addDomain(clean);
      if ('error' in result && result.error) {
        return json({ error: `No se pudo conectar el dominio: ${result.error}` }, 502);
      }
      // Tras agregar (o si ya existía), devolvemos el estado completo.
      return json(await getStatus(clean));
    }

    if (action === 'status') {
      return json(await getStatus(clean));
    }

    if (action === 'remove') {
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${clean}?teamId=${VERCEL_TEAM_ID}`,
        { method: 'DELETE', headers: vercelHeaders }
      );
      if (!res.ok && res.status !== 404) {
        return json(
          { error: `No se pudo desconectar el dominio: ${await res.text()}` },
          502
        );
      }
      return json({ ok: true });
    }

    return json({ error: 'action inválida' }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message || 'Error inesperado' }, 500);
  }
});
