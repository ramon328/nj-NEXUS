import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/definitions.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.48/deno-dom-wasm.ts';

interface FineRecord {
  plate: string;
  rut: string;
  name: string;
  fine: string;
  year: string;
  reason: string;
  location: string;
}

function parseFinesHtml(html: string): FineRecord[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) return [];

  const rows = doc.querySelectorAll('table.tabla > tbody > tr');
  const fines: FineRecord[] = [];
  const keys: (keyof FineRecord)[] = ['plate', 'rut', 'name', 'fine', 'year', 'reason', 'location'];

  for (const row of rows) {
    const cells = row.querySelectorAll('th');
    if (cells.length >= keys.length) {
      const record: any = {};
      keys.forEach((key, i) => {
        record[key] = (cells[i]?.textContent || '').trim();
      });
      fines.push(record as FineRecord);
    }
  }

  return fines;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    let { patent, vehicle_id } = body;

    if (!patent) {
      return new Response(
        JSON.stringify({ error: 'Patent parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Limpiar patente
    patent = patent.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Consultar SEM (Sistema Electrónico de Multas) — fuente pública gratuita
    let tickets: FineRecord[] = [];
    let finesCount = 0;
    let hasFines = false;
    let errorMsg: string | undefined;

    try {
      const semResponse = await fetch(
        `https://www.sem.gob.cl/pcirc/buscar_multas.php?tipo=0&patente=${patent}&rut=`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GoAutos/1.0)',
          },
        }
      );

      if (semResponse.ok) {
        const html = await semResponse.text();
        tickets = parseFinesHtml(html);
        finesCount = tickets.length;
        hasFines = finesCount > 0;
      } else {
        errorMsg = `SEM responded with status ${semResponse.status}`;
      }
    } catch (fetchError) {
      errorMsg = `Error fetching SEM: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`;
    }

    const checkedAt = new Date().toISOString();

    // Si viene vehicle_id, guardar en BD
    if (vehicle_id) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Insertar registro en vehicle_fines
        await supabaseAdmin.from('vehicle_fines').insert({
          vehicle_id,
          license_plate: patent,
          fines_count: finesCount,
          has_fines: hasFines,
          fines_data: tickets,
          checked_at: checkedAt,
          source: 'sem',
          error: errorMsg || null,
        });

        // Actualizar columnas desnormalizadas en vehicles
        await supabaseAdmin
          .from('vehicles')
          .update({
            fines_count: errorMsg ? null : finesCount,
            fines_last_checked: checkedAt,
          })
          .eq('id', vehicle_id);
      } catch (dbError) {
        console.error('Error saving fines to database:', dbError);
      }
    }

    return new Response(
      JSON.stringify({
        success: !errorMsg,
        data: {
          plate: patent,
          fines_count: finesCount,
          has_fines: hasFines,
          tickets,
          checked_at: checkedAt,
        },
        error: errorMsg,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in check-vehicle-fines function:', error);

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
