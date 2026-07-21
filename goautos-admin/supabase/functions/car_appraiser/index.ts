import { corsHeaders } from '../_shared/definitions.ts';
import { openai } from '../_shared/openai-client.ts';
import { supabase } from '../_shared/supabase-client.ts';

// ============================================================
// Search Prompts — Two focused groups for parallel execution
// ============================================================

const SEARCH_PROMPT_GROUP_A = `Eres un buscador de publicaciones de vehículos en Chile.
Busca publicaciones REALES y ACTUALES en chileautos.cl.

REGLAS CRÍTICAS:
- NUNCA generes URLs de mercadolibre.cl — esas se obtienen por API aparte
- NUNCA inventes URLs ni IDs de publicaciones. Si no encuentras una publicación real, no la incluyas
- Solo URLs de publicaciones INDIVIDUALES con slug real (no páginas de búsqueda/categoría)
- Un URL de chileautos válido se ve así: https://www.chileautos.cl/vehiculos/detalle/...
- Cada publicación debe tener: fuente, vehículo completo, año, versión, km, precio CLP, URL directa al aviso
- Formato por publicación: "FUENTE | VEHICULO | AÑO | VERSION | KM | PRECIO | URL"
- Busca mínimo 5 publicaciones, idealmente 8-10
- Es preferible devolver MENOS resultados reales que inventar URLs falsas`;

const SEARCH_PROMPT_GROUP_B = `Eres un buscador de publicaciones de vehículos en Chile.
Busca publicaciones REALES y ACTUALES en yapo.cl y autocosmos.cl.

REGLAS CRÍTICAS:
- NUNCA generes URLs de mercadolibre.cl — esas se obtienen por API aparte
- NUNCA inventes URLs ni IDs de publicaciones. Si no encuentras una publicación real, no la incluyas
- Solo URLs de publicaciones INDIVIDUALES (no páginas de búsqueda/listados)
- Un URL de yapo válido termina con un ID numérico real
- Cada publicación debe tener: fuente, vehículo completo, año, versión, km, precio CLP, URL directa al aviso
- Formato por publicación: "FUENTE | VEHICULO | AÑO | VERSION | KM | PRECIO | URL"
- Busca mínimo 5 publicaciones, idealmente 8-10
- Es preferible devolver MENOS resultados reales que inventar URLs falsas`;

const SEARCH_PROMPT_GROUP_C = `Eres un buscador de publicaciones de vehículos en Chile.
Busca publicaciones REALES y ACTUALES en kavak.com/cl y chileautos.cl.

REGLAS CRÍTICAS:
- Busca SOLO en sitios chilenos con precios en pesos chilenos (CLP). NUNCA uses seminuevos.com ni otros sitios extranjeros (sus precios están en moneda extranjera y no sirven para tasar en Chile)
- NUNCA generes URLs de mercadolibre.cl — esas se obtienen por API aparte
- NUNCA inventes URLs ni IDs de publicaciones
- Solo URLs de publicaciones INDIVIDUALES (no páginas de búsqueda/categoría)
- Un URL de kavak válido se ve así: https://www.kavak.com/cl/comprar/<slug>
- Cada publicación debe tener: fuente, vehículo completo, año, versión, km, precio CLP, URL directa al aviso
- Formato por publicación: "FUENTE | VEHICULO | AÑO | VERSION | KM | PRECIO | URL"
- Busca mínimo 3-5 publicaciones
- Es preferible devolver MENOS resultados reales que inventar URLs falsas`;

// ============================================================
// Vehicle extraction prompt (unchanged — works well)
// ============================================================

const EXTRACTION_PROMPT = `Extrae los detalles del vehículo de la consulta del usuario.

Devuelve un JSON con estos campos:
{
  "brand": string,           // Marca (Toyota, Nissan, etc.)
  "model": string,           // Modelo (Corolla, Versa, etc.)
  "year": number | null,     // Año del vehículo
  "yearRange": {             // Si no hay año específico
    "min": number,
    "max": number
  } | null,
  "version": string | null,  // Versión/trim (XLE, SR, Limited, etc.)
  "transmission": "automatic" | "manual" | null,
  "fuel": "gasoline" | "diesel" | "hybrid" | "electric" | null,
  "mileage": number | null,  // Kilometraje si se menciona
  "mileageRange": {          // Si hay rango de km
    "min": number,
    "max": number
  } | null,
  "condition": "new" | "used" | "certified" | null,
  "color": string | null,
  "country": "Chile",        // Siempre Chile por defecto
  "isComparison": boolean,   // True si pide comparar vehículos
  "comparisonVehicles": [    // Si es comparación, lista de vehículos
    {
      "brand": string,
      "model": string,
      "year": number | null
    }
  ] | null,
  "additionalContext": string | null  // Cualquier otro detalle relevante
}

Ejemplos:
- "Toyota Corolla 2020" → brand: "Toyota", model: "Corolla", year: 2020
- "Nissan Versa automático 2022" → brand: "Nissan", model: "Versa", year: 2022, transmission: "automatic"
- "Comparar Kia Sportage vs Hyundai Tucson 2021" → isComparison: true, comparisonVehicles: [{brand: "Kia", model: "Sportage"}, {brand: "Hyundai", model: "Tucson", year: 2021}]
- "SUV usado entre 10 y 15 millones" → condition: "used", additionalContext: "SUV con presupuesto 10-15 millones CLP"`;

// Source extraction prompt — structured JSON output
const SOURCE_EXTRACTION_PROMPT = `Extrae las publicaciones de vehículos del texto proporcionado.

Devuelve JSON con este formato exacto:
{
  "sources": [
    {
      "source": "Nombre del sitio (Chileautos, Yapo, MercadoLibre, Kavak, etc.)",
      "vehicle": "Descripción completa del vehículo",
      "year": 2020,
      "version": "Versión si aplica o null",
      "mileage": 45000,
      "price": 12990000,
      "url": "https://..."
    }
  ]
}

REGLAS:
- Solo extrae publicaciones con URL válida (https://...)
- price debe ser número entero en CLP (sin puntos ni símbolos)
- mileage en km como número entero, null si no se menciona
- year como número entero, null si no se menciona
- NO inventes datos que no estén en el texto`;

// ============================================================
// Types
// ============================================================

interface VehicleSource {
  source: string;
  vehicle: string;
  year: number | null;
  version: string | null;
  mileage: number | null;
  price: number;
  url: string;
}

interface PriceAnalysis {
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
  sampleSize: number;
}

// ============================================================
// URL Validation — Smart, Cloudflare-aware
// ============================================================

// Domains behind Cloudflare that block server-side requests
const CLOUDFLARE_DOMAINS = ['chileautos.cl', 'kavak.com', 'autofact.cl', 'yapo.cl'];

// Domains that are never vehicle listing sites — reject outright
const BLOCKED_DOMAINS = [
  'google.com',
  'google.cl',
  'google.es',
  'google.com.mx',
  'maps.google',
  'bing.com',
  'facebook.com',
  'instagram.com',
  'youtube.com',
  'wikipedia.org',
  'twitter.com',
  'x.com',
  'whatsapp.com',
  'tiktok.com',
];

// Sitios de avisos REALES pero extranjeros: sus precios vienen en moneda
// extranjera (ej. seminuevos.com es mexicano → precios en MXN) y al leerse
// como CLP producen autos falsos de "$200.000". Se rechazan de plano.
const FOREIGN_LISTING_DOMAINS = ['seminuevos.com'];

/** Reject URLs that are search/listing pages, not individual vehicle ads */
function isValidListingUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    const hostname = u.hostname;

    // Reject non-listing domains (Google Maps, social networks, etc.)
    if (BLOCKED_DOMAINS.some((d) => hostname.includes(d))) return false;

    // Reject foreign listing sites (precios en moneda extranjera)
    if (FOREIGN_LISTING_DOMAINS.some((d) => hostname.includes(d))) return false;

    // Reject homepage/root URLs — un aviso individual nunca vive en la raíz del
    // sitio. Los links inventados por el modelo suelen apuntar a la home
    // (ej. profesoresparticulares.cl/?utm_source=openai), que pasaba la validación
    // por no ser 404 ni buscador. Una publicación real siempre tiene ruta con slug/ID.
    if (u.pathname.replace(/\/+$/, '') === '') return false;

    // Generic search pages to reject
    const searchPatterns = [
      /[?&]q=/i,
      /[?&]query=/i,
      /[?&]search=/i,
      /\/buscar\?/i,
      /\/search\?/i,
    ];
    if (searchPatterns.some((p) => p.test(path))) return false;

    // Reject bare category/listing pages (no slug or ID)
    // e.g., chileautos.cl/vehiculos or yapo.cl/autos
    if (hostname.includes('chileautos.cl') && /^\/vehiculos\/?(\?.*)?$/.test(path)) return false;
    if (hostname.includes('yapo.cl') && /^\/(autos|vehiculos)\/?(\?.*)?$/.test(path)) return false;
    if (hostname.includes('mercadolibre.cl') && /^\/(vehiculos|autos)\/?(\?.*)?$/.test(path)) return false;
    if (hostname.includes('kavak.com') && /^\/cl\/?(\?.*)?$/.test(path)) return false;

    return true;
  } catch {
    return false;
  }
}

/** Validate URL matches known listing patterns for Cloudflare-protected domains */
function isValidUrlPattern(url: string, hostname: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname;

    // ChileAutos: /vehiculos/<slug-or-id> or /vehiculos/detalle/...
    if (hostname.includes('chileautos.cl')) {
      return /^\/vehiculos\/.+\/.+/.test(path);
    }

    // Kavak: /comprar/<slug> or vehicle ID patterns
    if (hostname.includes('kavak.com')) {
      return /^\/(cl\/)?(comprar|auto|detalle)\/.+/.test(path);
    }

    // Autofact: typically /informe/ or /auto/
    if (hostname.includes('autofact.cl')) {
      return /^\/(informe|auto|ficha)\/.+/.test(path);
    }

    // Yapo: must have a numeric ID in the URL
    if (hostname.includes('yapo.cl')) {
      return /\/\d{5,}/.test(path);
    }

    return true; // Unknown domain, trust it
  } catch {
    return false;
  }
}

/** Check if a URL is from MercadoLibre (GPT-generated ML URLs are always fake) */
function isMercadoLibreUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes('mercadolibre.cl') || u.hostname.includes('mercadolibre.com');
  } catch {
    return false;
  }
}

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-CL,es;q=0.9,en;q=0.5',
};

async function smartValidateUrls(sources: VehicleSource[]): Promise<VehicleSource[]> {
  if (sources.length === 0) return [];

  const toValidate = sources.slice(0, 25);
  console.log(`[car_appraiser] Smart-validating ${toValidate.length} URLs...`);

  const results = await Promise.allSettled(
    toValidate.map(async (source): Promise<VehicleSource | null> => {
      try {
        const u = new URL(source.url);
        const hostname = u.hostname;

        // 1. Always check listing URL format
        if (!isValidListingUrl(source.url)) {
          console.log(`[car_appraiser] Rejected search-page URL: ${source.url}`);
          return null;
        }

        // 2. Cloudflare domains — validate by URL pattern only (no HTTP)
        if (CLOUDFLARE_DOMAINS.some((d) => hostname.includes(d))) {
          if (isValidUrlPattern(source.url, hostname)) {
            return source;
          }
          console.log(`[car_appraiser] Rejected bad pattern (Cloudflare domain): ${source.url}`);
          return null;
        }

        // 3. Other domains — HTTP validation, only reject on 404
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5_000);
        try {
          const resp = await fetch(source.url, {
            method: 'HEAD',
            headers: BROWSER_HEADERS,
            signal: controller.signal,
            redirect: 'follow',
          });
          clearTimeout(timeoutId);
          if (resp.status === 404) {
            console.log(`[car_appraiser] URL 404: ${source.url}`);
            return null;
          }
          return source; // Accept 200, 301, 302, 403, etc.
        } catch {
          clearTimeout(timeoutId);
          return source; // Network error — benefit of the doubt
        }
      } catch {
        return null; // Invalid URL format
      }
    })
  );

  const validated = results
    .filter(
      (r): r is PromiseFulfilledResult<VehicleSource | null> =>
        r.status === 'fulfilled' && r.value !== null
    )
    .map((r) => r.value!);

  console.log(
    `[car_appraiser] Smart validation: ${toValidate.length} checked → ${validated.length} valid`
  );
  return validated;
}

// ============================================================
// Deduplication
// ============================================================

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove tracking params, trailing slashes
    u.searchParams.delete('utm_source');
    u.searchParams.delete('utm_medium');
    u.searchParams.delete('utm_campaign');
    u.searchParams.delete('utm_content');
    u.searchParams.delete('utm_term');
    u.searchParams.delete('ref');
    u.searchParams.delete('fbclid');
    let path = u.pathname.replace(/\/+$/, '');
    return `${u.hostname}${path}${u.search}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function deduplicateSources(sources: VehicleSource[]): VehicleSource[] {
  const seen = new Map<string, VehicleSource>();
  for (const s of sources) {
    const key = normalizeUrl(s.url);
    if (!seen.has(key)) {
      seen.set(key, s);
    }
  }
  return Array.from(seen.values());
}

// ============================================================
// GPT Search Group Execution
// ============================================================

async function executeSearchGroup(
  groupName: string,
  systemPrompt: string,
  vehicleQuery: string,
  vehicleDetails: any
): Promise<string> {
  const { brand, model, year, version, transmission } = vehicleDetails;

  let searchDesc = `${brand || ''} ${model || ''}`;
  if (year) searchDesc += ` ${year}`;
  if (version) searchDesc += ` ${version}`;
  if (transmission === 'automatic') searchDesc += ' automático';
  if (transmission === 'manual') searchDesc += ' mecánico';

  const userMessage = `Busca publicaciones reales de: ${searchDesc.trim()}

Busca con estos términos:
- "${brand} ${model}${year ? ` ${year}` : ''} Chile precio"
${version ? `- "${brand} ${model} ${version}${year ? ` ${year}` : ''}"` : ''}

Necesito publicaciones con precio en CLP y URL directa al aviso.`;

  console.log(`[car_appraiser] Executing search group ${groupName}...`);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-search-preview',
    web_search_options: {
      search_context_size: 'high',
    },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  const response = completion.choices[0].message.content || '';
  console.log(
    `[car_appraiser] Group ${groupName} response length: ${response.length}`
  );
  return response;
}

// ============================================================
// Structured Source Extraction from GPT response
// ============================================================

async function extractSourcesStructured(
  searchResponse: string
): Promise<VehicleSource[]> {
  if (!searchResponse || searchResponse.length < 50) return [];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SOURCE_EXTRACTION_PROMPT },
        { role: 'user', content: searchResponse },
      ],
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');

    if (Array.isArray(parsed.sources)) {
      return parsed.sources.filter(
        (s: any) =>
          s &&
          typeof s.source === 'string' &&
          typeof s.url === 'string' &&
          s.url.startsWith('http') &&
          typeof s.price === 'number' &&
          s.price > 0
      );
    }
    return [];
  } catch (err) {
    console.error('[car_appraiser] Error extracting sources:', err);
    return [];
  }
}

// ============================================================
// MercadoLibre API Search
// ============================================================

function getMeliAttribute(item: any, id: string): string | null {
  if (!item.attributes || !Array.isArray(item.attributes)) return null;
  const attr = item.attributes.find((a: any) => a.id === id);
  return attr?.value_name || null;
}

async function searchMercadoLibreAPI(
  brand: string,
  model: string,
  year: number | null,
  clientId: number
): Promise<VehicleSource[]> {
  try {
    // Find ML integration for this client
    const { data: integration, error: fetchErr } = await supabase
      .from('meli_integration')
      .select('id, access_token, expires_at, refresh_token')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .single();

    if (fetchErr || !integration?.access_token) {
      console.log('[car_appraiser] No ML integration for client', clientId);
      return [];
    }

    // Check if token is expired, refresh if needed
    let accessToken = integration.access_token;
    if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
      console.log('[car_appraiser] ML token expired, refreshing...');
      try {
        const refreshResp = await supabase.functions.invoke('refresh-mercadolibre-token', {
          body: { integrationId: integration.id },
        });
        if (refreshResp.data?.success) {
          // Re-fetch the updated token
          const { data: refreshed } = await supabase
            .from('meli_integration')
            .select('access_token')
            .eq('id', integration.id)
            .single();
          if (refreshed?.access_token) {
            accessToken = refreshed.access_token;
          }
        }
      } catch (refreshErr) {
        console.error('[car_appraiser] ML token refresh failed:', refreshErr);
        return [];
      }
    }

    const q = `${brand} ${model}${year ? ` ${year}` : ''}`;
    console.log(`[car_appraiser] Searching MercadoLibre API: "${q}"`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const resp = await fetch(
      `https://api.mercadolibre.com/sites/MLC/search?q=${encodeURIComponent(q)}&category=MLC1744&limit=10`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!resp.ok) {
      console.log(`[car_appraiser] ML API error: ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    console.log(`[car_appraiser] ML API returned ${data.results.length} results`);

    return data.results
      .filter((item: any) => item.price > 0 && item.permalink)
      .map((item: any) => ({
        source: 'MercadoLibre',
        vehicle: item.title || '',
        year: parseInt(getMeliAttribute(item, 'VEHICLE_YEAR') || '0') || null,
        version: getMeliAttribute(item, 'TRIM'),
        mileage: parseInt(getMeliAttribute(item, 'KILOMETERS') || '0') || null,
        price: Math.round(item.price),
        url: item.permalink,
      }));
  } catch (err) {
    console.error('[car_appraiser] ML API search error:', err);
    return [];
  }
}

// ============================================================
// Price Sanity Filtering
// ============================================================
// Un auto usado real en Chile prácticamente nunca se publica bajo $1M CLP.
// Lo que aparece bajo ese piso son cuotas mensuales, pies, accesorios o
// precios en moneda extranjera mal interpretados como CLP (ej. seminuevos.com
// en MXN). Tampoco hay autos sobre ~$500M CLP. Estos valores basura
// distorsionan el rango y producen tasaciones tipo "$200.000".
const PRICE_FLOOR_CLP = 1_000_000;
const PRICE_CEILING_CLP = 500_000_000;

/** Descarta fuentes con precio basura: fuera de los límites absolutos y
 *  outliers groseros respecto a la mediana cuando hay muestra suficiente. */
function cleanSources(sources: VehicleSource[]): VehicleSource[] {
  // 1. Límites absolutos
  const withinBounds = sources.filter(
    (s) => s.price >= PRICE_FLOOR_CLP && s.price <= PRICE_CEILING_CLP
  );
  const removedByBounds = sources.length - withinBounds.length;
  if (removedByBounds > 0) {
    console.log(
      `[car_appraiser] cleanSources: ${removedByBounds} fuera de [${PRICE_FLOOR_CLP}, ${PRICE_CEILING_CLP}] CLP`
    );
  }

  // 2. Outliers relativos a la mediana (cuotas/pies que igual pasan el piso).
  //    Solo con >=3 precios, donde la mediana ya es informativa.
  if (withinBounds.length < 3) return withinBounds;

  const prices = withinBounds.map((s) => s.price).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  const low = median * 0.35;
  const high = median * 3;
  const cleaned = withinBounds.filter((s) => s.price >= low && s.price <= high);
  const removedByOutlier = withinBounds.length - cleaned.length;
  if (removedByOutlier > 0) {
    console.log(
      `[car_appraiser] cleanSources: ${removedByOutlier} outliers descartados vs mediana ${median}`
    );
  }
  return cleaned;
}

// ============================================================
// Price Analysis Calculation
// ============================================================

function calculatePriceAnalysis(
  sources: VehicleSource[]
): { priceAnalysis: PriceAnalysis; estimatedRange: { low: number; high: number } | null } {
  const prices = sources
    .map((s) => s.price)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return {
      priceAnalysis: { min: null, max: null, average: null, median: null, sampleSize: 0 },
      estimatedRange: null,
    };
  }

  const sum = prices.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / prices.length);
  const median =
    prices.length % 2 === 0
      ? Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
      : prices[Math.floor(prices.length / 2)];

  const priceAnalysis: PriceAnalysis = {
    min: prices[0],
    max: prices[prices.length - 1],
    average: avg,
    median,
    sampleSize: prices.length,
  };

  // Estimated range: trim outliers if enough data
  let low: number;
  let high: number;
  if (prices.length >= 5) {
    // Remove bottom and top 10%
    const trimIdx = Math.max(1, Math.floor(prices.length * 0.1));
    low = prices[trimIdx];
    high = prices[prices.length - 1 - trimIdx];
  } else {
    low = prices[0];
    high = prices[prices.length - 1];
  }

  return { priceAnalysis, estimatedRange: { low, high } };
}

// ============================================================
// Analysis Generation
// ============================================================

async function generateAnalysis(
  query: string,
  vehicleDetails: any,
  sources: VehicleSource[],
  priceAnalysis: PriceAnalysis,
  estimatedRange: { low: number; high: number } | null,
  similarVehicles: any[],
  inventoryVehicle?: any
): Promise<string> {
  const formatCLP = (n: number) =>
    `$${n.toLocaleString('es-CL')} CLP`;

  let sourcesText = '';
  if (sources.length > 0) {
    sourcesText = sources
      .map(
        (s) =>
          `- **${s.source}**: ${s.vehicle}${s.year ? ` ${s.year}` : ''}${s.version ? ` ${s.version}` : ''}${s.mileage ? ` con ${s.mileage.toLocaleString('es-CL')} km` : ''} a **${formatCLP(s.price)}** → [Ver publicación](${s.url})`
      )
      .join('\n');
  }

  const analysisPrompt = `Eres un tasador automotriz profesional chileno. Genera un análisis breve y profesional basado ÚNICAMENTE en los datos proporcionados. NO inventes datos adicionales ni publicaciones.

Vehículo consultado: ${query}
${vehicleDetails.version ? `Versión: ${vehicleDetails.version}` : ''}
${vehicleDetails.transmission ? `Transmisión: ${vehicleDetails.transmission === 'automatic' ? 'Automático' : 'Manual'}` : ''}

## Publicaciones verificadas (${sources.length}):
${sourcesText || 'No se encontraron publicaciones verificables.'}

${priceAnalysis.sampleSize > 0 ? `## Datos de precios:
- Mínimo: ${formatCLP(priceAnalysis.min!)}
- Máximo: ${formatCLP(priceAnalysis.max!)}
- Promedio: ${formatCLP(priceAnalysis.average!)}
- Mediana: ${formatCLP(priceAnalysis.median!)}
${estimatedRange ? `- Rango estimado: ${formatCLP(estimatedRange.low)} — ${formatCLP(estimatedRange.high)}` : ''}` : ''}

${inventoryVehicle ? `## Vehículo del inventario (datos reales de la automotora):
- Marca/Modelo: ${inventoryVehicle.brand?.name || 'N/A'} ${inventoryVehicle.model?.name || 'N/A'}
- Año: ${inventoryVehicle.year || 'N/A'}
- Precio publicado: $${inventoryVehicle.price?.toLocaleString('es-CL') || 'N/A'} CLP
- Precio de compra: $${inventoryVehicle.purchase_price?.toLocaleString('es-CL') || 'N/A'} CLP
- Kilometraje: ${inventoryVehicle.mileage?.toLocaleString('es-CL') || 'N/A'} km
- Versión: ${inventoryVehicle.version || 'N/A'}
- Transmisión: ${inventoryVehicle.transmission || 'N/A'}
- Combustible: ${inventoryVehicle.fuel_type?.name || 'N/A'}
- Color: ${inventoryVehicle.color?.name || 'N/A'}
- Condición: ${inventoryVehicle.condition?.name || 'N/A'}
- Extras: ${inventoryVehicle.extras || 'N/A'}
→ Compara el precio publicado de este vehículo con el mercado y da recomendaciones específicas.` : ''}

${similarVehicles.length > 0 ? `## Otros vehículos similares en el inventario:
${similarVehicles.map((v) => `- ${v.brand?.name || 'N/A'} ${v.model?.name || 'N/A'} ${v.year || 'N/A'}: $${v.price?.toLocaleString('es-CL') || 'N/A'} CLP`).join('\n')}` : ''}

INSTRUCCIONES:
1. Lista las publicaciones encontradas con sus precios y URLs (ya formateadas arriba, úsalas tal cual)
2. Presenta el análisis de precios en tabla
3. Da una conclusión breve
4. Si hay pocas publicaciones (<3), menciona que los datos son limitados
5. NO agregues publicaciones que no estén en la lista
6. Usa formato markdown`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Eres un tasador automotriz profesional chileno. Genera análisis claros y concisos basados SOLO en datos reales proporcionados.',
      },
      { role: 'user', content: analysisPrompt },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  return completion.choices[0].message.content || '';
}

// ============================================================
// Comparison Analysis Generation
// ============================================================

async function generateComparisonAnalysis(
  query: string,
  vehicleResults: { vehicle: any; sources: VehicleSource[]; priceAnalysis: PriceAnalysis; estimatedRange: { low: number; high: number } | null }[]
): Promise<string> {
  const formatCLP = (n: number) =>
    `$${n.toLocaleString('es-CL')} CLP`;

  let comparisonText = '';
  for (const vr of vehicleResults) {
    const v = vr.vehicle;
    const label = `${v.brand} ${v.model}${v.year ? ` ${v.year}` : ''}`;
    comparisonText += `\n### ${label}\n`;
    if (vr.sources.length > 0) {
      comparisonText += '**Publicaciones encontradas:**\n';
      for (const s of vr.sources) {
        comparisonText += `- **${s.source}**: ${s.vehicle}${s.mileage ? ` con ${s.mileage.toLocaleString('es-CL')} km` : ''} a **${formatCLP(s.price)}** → [Ver publicación](${s.url})\n`;
      }
      if (vr.priceAnalysis.sampleSize > 0) {
        comparisonText += `\n**Rango verificado:** ${formatCLP(vr.priceAnalysis.min!)} — ${formatCLP(vr.priceAnalysis.max!)} (${vr.priceAnalysis.sampleSize} publicaciones)\n`;
        comparisonText += `**Promedio:** ${formatCLP(vr.priceAnalysis.average!)}\n`;
      }
    } else {
      comparisonText += 'No se encontraron publicaciones verificables.\n';
    }
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Eres un tasador automotriz profesional chileno. Genera comparaciones claras basadas SOLO en datos reales.',
      },
      {
        role: 'user',
        content: `El usuario preguntó: "${query}"

Datos de cada vehículo:
${comparisonText}

Genera una comparación profesional que incluya:
1. Los datos de cada vehículo (publicaciones + rangos) ya formateados arriba
2. Una tabla comparativa resumida
3. Una conclusión breve comparando ambos
Usa formato markdown. NO inventes datos adicionales.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  return completion.choices[0].message.content || '';
}

// ============================================================
// Search a single vehicle (used for both single and comparison)
// ============================================================

async function searchSingleVehicle(
  vehicleDetails: any,
  clientId: number,
  limitGroups: boolean = false
): Promise<{
  sources: VehicleSource[];
  rawCount: number;
  errors: string[];
  groupResults: { a: string; b: string };
}> {
  const { brand, model, year } = vehicleDetails;
  const errors: string[] = [];

  // Launch parallel searches — 3 GPT groups + ML API
  const searchPromises: Promise<any>[] = [
    executeSearchGroup('A', SEARCH_PROMPT_GROUP_A, '', vehicleDetails)
      .catch((err) => {
        errors.push(`Group A: ${err.message}`);
        return '';
      }),
  ];

  // For comparison with 3+ vehicles, limit to 1 GPT group
  if (!limitGroups) {
    searchPromises.push(
      executeSearchGroup('B', SEARCH_PROMPT_GROUP_B, '', vehicleDetails)
        .catch((err) => {
          errors.push(`Group B: ${err.message}`);
          return '';
        }),
      executeSearchGroup('C', SEARCH_PROMPT_GROUP_C, '', vehicleDetails)
        .catch((err) => {
          errors.push(`Group C: ${err.message}`);
          return '';
        })
    );
  }

  searchPromises.push(
    searchMercadoLibreAPI(brand || '', model || '', year, clientId)
      .catch((err) => {
        errors.push(`ML API: ${err.message}`);
        return [] as VehicleSource[];
      })
  );

  const results = await Promise.allSettled(searchPromises);

  const groupAResponse =
    results[0].status === 'fulfilled' ? (results[0].value as string) : '';

  const groupBResponse = !limitGroups && results[1].status === 'fulfilled'
    ? (results[1].value as string)
    : '';

  const groupCResponse = !limitGroups && results[2]?.status === 'fulfilled'
    ? (results[2].value as string)
    : '';

  const mlApiIdx = limitGroups ? 1 : 3;
  const mlApiSources: VehicleSource[] =
    results[mlApiIdx]?.status === 'fulfilled'
      ? (results[mlApiIdx].value as VehicleSource[])
      : [];

  // Extract sources from GPT responses in parallel
  const [extractedA, extractedB, extractedC] = await Promise.allSettled([
    extractSourcesStructured(groupAResponse),
    extractSourcesStructured(groupBResponse),
    extractSourcesStructured(groupCResponse),
  ]);

  const sourcesA =
    extractedA.status === 'fulfilled' ? extractedA.value : [];
  const sourcesB =
    extractedB.status === 'fulfilled' ? extractedB.value : [];
  const sourcesC =
    extractedC.status === 'fulfilled' ? extractedC.value : [];

  console.log(
    `[car_appraiser] Sources extracted — A: ${sourcesA.length}, B: ${sourcesB.length}, C: ${sourcesC.length}, ML: ${mlApiSources.length}`
  );

  // Combine GPT sources and filter out any MercadoLibre URLs (GPT invents fake ML URLs)
  const gptSources = [...sourcesA, ...sourcesB, ...sourcesC]
    .filter((s) => !isMercadoLibreUrl(s.url));

  const rawCount = gptSources.length + mlApiSources.length;

  // Deduplicate and validate GPT sources only (ML API sources are pre-validated)
  const dedupedGpt = deduplicateSources(gptSources);
  console.log(
    `[car_appraiser] GPT after dedup: ${gptSources.length} → ${dedupedGpt.length}`
  );

  const validatedGpt = await smartValidateUrls(dedupedGpt);

  // Merge with ML API sources and final dedup
  const merged = deduplicateSources([...validatedGpt, ...mlApiSources]);

  // Sanea precios basura (moneda extranjera, cuotas, pies, outliers) antes
  // de calcular cualquier estadística — esto evita rangos engañosos.
  const allValidated = cleanSources(merged);
  console.log(
    `[car_appraiser] Final sources: ${allValidated.length} (post-clean, de ${merged.length} validadas — GPT: ${validatedGpt.length}, ML API: ${mlApiSources.length})`
  );

  return {
    sources: allValidated,
    rawCount,
    errors,
    groupResults: { a: groupAResponse, b: groupBResponse },
  };
}

// ============================================================
// Plate lookup via GetAPI — resolves a Chilean license plate to
// brand/model/year so the tasador can work with patente input.
// Consulta /plate/ y /appraisal/ en paralelo (mismo patrón que
// la edge get-info-by-patent) para que un fallo en /plate/ no
// produzca un falso negativo si /appraisal/ sí tiene los datos.
// ============================================================
interface GetApiVehicleShape {
  year?: number;
  model?: { name?: string; brand?: { name?: string } };
}
interface GetApiPlateResponse { data?: GetApiVehicleShape }
interface GetApiAppraisalResponse { data?: { vehicle?: GetApiVehicleShape } }

async function fetchVehicleFromPlate(
  patent: string
): Promise<{ brand?: string; model?: string; year?: number } | null> {
  // @ts-expect-error: Deno is available in the Supabase Functions environment
  const apiKey = Deno.env.get('GETAPI_KEY');
  if (!apiKey) {
    console.warn('[car_appraiser] GETAPI_KEY no configurada — omito lookup de patente');
    return null;
  }

  const headers = { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' };

  const [plateRes, appraisalRes] = await Promise.allSettled([
    fetch(`https://chile.getapi.cl/v1/vehicles/plate/${patent}`, { method: 'GET', headers }),
    fetch(`https://chile.getapi.cl/v1/vehicles/appraisal/${patent}`, { method: 'GET', headers }),
  ]);

  const parseJson = async <T,>(settled: PromiseSettledResult<Response>): Promise<T | null> => {
    if (settled.status !== 'fulfilled' || !settled.value.ok) return null;
    try {
      return (await settled.value.json()) as T;
    } catch {
      return null;
    }
  };

  const plateJson = await parseJson<GetApiPlateResponse>(plateRes);
  const appraisalJson = await parseJson<GetApiAppraisalResponse>(appraisalRes);

  // /plate/ devuelve { data: { year, model: { name, brand: { name } } } }
  // /appraisal/ devuelve { data: { vehicle: { year, model: { name, brand: { name } } }, ... } }
  const vehicleData: GetApiVehicleShape | null =
    plateJson?.data || appraisalJson?.data?.vehicle || null;
  if (!vehicleData) {
    console.log(`[car_appraiser] GetAPI sin datos de vehículo para patente ${patent}`);
    return null;
  }

  const brand = vehicleData?.model?.brand?.name;
  const model = vehicleData?.model?.name;
  const year = vehicleData?.year;

  if (!brand && !model) return null;
  return { brand, model, year };
}

// ============================================================
// Main Handler
// ============================================================

// @ts-ignore: Deno is available in the Supabase Functions environment
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, client_id, user_id, vehicle_id } = await req.json();

    if (!query || !client_id) {
      return new Response(
        JSON.stringify({
          error: 'Query and client_id parameters are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[car_appraiser] Processing query: "${query}" for client: ${client_id}`);

    // ========================================
    // Step 1: Extract vehicle details
    // ========================================
    const extractionCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: query },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const vehicleDetails = JSON.parse(
      extractionCompletion.choices[0].message.content || '{}'
    );

    console.log('[car_appraiser] Extracted vehicle details:', vehicleDetails);

    // ========================================
    // Step 1b: Enrich from inventory if vehicle_id provided
    // ========================================
    let inventoryVehicle: any = null;
    if (vehicle_id) {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select(`
            id, year, price, mileage, transmission, version, purchase_price, extras,
            brand:brand_id(name),
            model:model_id(name),
            fuel_type:fuel_type_id(name),
            condition:condition_id(name),
            color:color_id(name)
          `)
          .eq('id', vehicle_id)
          .eq('client_id', client_id)
          .single();

        if (!error && data) {
          inventoryVehicle = data;
          // Enrich vehicleDetails with real data
          if (data.brand?.name) vehicleDetails.brand = data.brand.name;
          if (data.model?.name) vehicleDetails.model = data.model.name;
          if (data.year) vehicleDetails.year = data.year;
          if (data.mileage) vehicleDetails.mileage = data.mileage;
          if (data.transmission) vehicleDetails.transmission = data.transmission;
          if (data.version) vehicleDetails.version = data.version;
          if (data.fuel_type?.name) vehicleDetails.fuel = data.fuel_type.name;
          if (data.condition?.name) vehicleDetails.condition = data.condition.name;
          console.log('[car_appraiser] Enriched from inventory vehicle:', vehicle_id);
        }
      } catch (err) {
        console.error('[car_appraiser] Error fetching inventory vehicle:', err);
      }
    }

    // ========================================
    // Step 1c: Si no tenemos marca+modelo y el input parece patente,
    // intentamos resolverla vía GetAPI antes de rechazar. Si la API
    // nos da los datos, enriquecemos vehicleDetails y seguimos con el
    // flujo normal del tasador. Si falla, rechazamos pidiendo
    // marca/modelo (no derivamos al usuario a "Agregar vehículo"
    // porque ese flujo usa la MISMA API — si falló acá, fallará allá).
    //
    // Sin brand+model el web-search devuelve avisos random de
    // chileautos/yapo y produce un rango de precios engañoso.
    // Mejor rechazar que fantasear.
    // ========================================
    let hasBrand = typeof vehicleDetails.brand === 'string' && vehicleDetails.brand.trim().length > 0;
    let hasModel = typeof vehicleDetails.model === 'string' && vehicleDetails.model.trim().length > 0;

    // Detect Chilean license plates so we can give a more specific message.
    // Modern format: 4 letters + 2 digits (e.g. VDPS43). Legacy: 2 letters + 4 digits.
    const cleanedQuery = (query || '').replace(/[\s\-·.]/g, '').toUpperCase();
    const isLikelyPlate = /^[A-Z]{4}\d{2}$/.test(cleanedQuery) || /^[A-Z]{2}\d{4}$/.test(cleanedQuery);

    // Cuando la patente fue resuelta vía GetAPI, lo recordamos para
    // anteponer un aviso al texto final del tasador (transparencia +
    // permite al usuario detectar si la API devolvió datos viejos).
    let resolvedFromPlate: { plate: string; brand?: string; model?: string; year?: number } | null = null;

    if ((!hasBrand || !hasModel) && isLikelyPlate) {
      console.log(`[car_appraiser] Query parece patente (${cleanedQuery}) — intentando lookup en GetAPI`);
      const plateInfo = await fetchVehicleFromPlate(cleanedQuery);
      if (plateInfo && (plateInfo.brand || plateInfo.model)) {
        if (plateInfo.brand) vehicleDetails.brand = plateInfo.brand;
        if (plateInfo.model) vehicleDetails.model = plateInfo.model;
        if (plateInfo.year) vehicleDetails.year = plateInfo.year;
        resolvedFromPlate = {
          plate: cleanedQuery,
          brand: plateInfo.brand,
          model: plateInfo.model,
          year: plateInfo.year,
        };
        hasBrand = typeof vehicleDetails.brand === 'string' && vehicleDetails.brand.trim().length > 0;
        hasModel = typeof vehicleDetails.model === 'string' && vehicleDetails.model.trim().length > 0;
        console.log(`[car_appraiser] Patente resuelta vía GetAPI:`, resolvedFromPlate);
      }
    }

    if (!hasBrand || !hasModel) {
      const reason = isLikelyPlate
        ? `No encontré información para la patente "${query}" en la base de datos. Indícame al menos marca y modelo (por ejemplo: "Toyota Corolla 2020 automático"). Si me das también año y versión, la estimación va a ser más precisa.`
        : `No pude identificar el vehículo a partir de "${query}". Indícame al menos marca y modelo (por ejemplo: "Toyota Corolla 2020 automático"). Si me das también año y versión, la estimación va a ser más precisa.`;

      console.log(`[car_appraiser] Rejected — brand/model missing. isLikelyPlate=${isLikelyPlate}, query="${query}"`);

      return new Response(
        JSON.stringify({
          appraisal: reason,
          vehicle_details: vehicleDetails,
          original_query: query,
          contains_links: false,
          sources: [],
          price_analysis: { min: null, max: null, average: null, median: null, sampleSize: 0 },
          estimated_range: null,
          confidence: 'low',
          search_stats: { rejected: true, reason: isLikelyPlate ? 'license_plate_unknown' : 'unidentified_vehicle' },
          saved: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // Step 2: Search internal database
    // ========================================
    let similarVehicles: any[] = [];
    try {
      let dbQuery = supabase
        .from('vehicles')
        .select(
          'brand, model, year, price, mileage, version, transmission, fuel_type, created_at'
        )
        .eq('client_id', client_id);

      if (vehicleDetails.brand) {
        dbQuery = dbQuery.ilike('brand->>name', `%${vehicleDetails.brand}%`);
      }
      if (vehicleDetails.model) {
        dbQuery = dbQuery.ilike('model->>name', `%${vehicleDetails.model}%`);
      }
      if (vehicleDetails.year) {
        dbQuery = dbQuery
          .gte('year', vehicleDetails.year - 2)
          .lte('year', vehicleDetails.year + 2);
      }

      const { data, error } = await dbQuery.limit(5);
      if (!error && data) similarVehicles = data;
    } catch (dbError) {
      console.error('[car_appraiser] Database query error:', dbError);
    }

    // ========================================
    // Step 3-8: Search, extract, validate, analyze
    // ========================================

    let appraisalResponse = '';
    let allSources: VehicleSource[] = [];
    let priceAnalysis: PriceAnalysis = {
      min: null, max: null, average: null, median: null, sampleSize: 0,
    };
    let estimatedRange: { low: number; high: number } | null = null;
    let dataConfidence: 'high' | 'medium' | 'low' = 'low';
    let searchStats: any = {};
    const errorMessages: string[] = [];

    if (vehicleDetails.isComparison && vehicleDetails.comparisonVehicles?.length > 0) {
      // ---- COMPARISON MODE ----
      const vehicles = vehicleDetails.comparisonVehicles;
      const limitGroups = vehicles.length >= 3;

      const vehicleResults = await Promise.all(
        vehicles.map(async (v: any) => {
          const details = { brand: v.brand, model: v.model, year: v.year };
          const result = await searchSingleVehicle(details, client_id, limitGroups);
          const { priceAnalysis: pa, estimatedRange: er } = calculatePriceAnalysis(result.sources);
          errorMessages.push(...result.errors);
          return {
            vehicle: v,
            sources: result.sources,
            rawCount: result.rawCount,
            priceAnalysis: pa,
            estimatedRange: er,
          };
        })
      );

      // Aggregate all sources for storage
      allSources = vehicleResults.flatMap((vr) => vr.sources);
      const totalRaw = vehicleResults.reduce((sum, vr) => sum + vr.rawCount, 0);

      // Calculate overall price analysis from all sources
      const overall = calculatePriceAnalysis(allSources);
      priceAnalysis = overall.priceAnalysis;
      estimatedRange = overall.estimatedRange;

      // Generate comparison analysis
      appraisalResponse = await generateComparisonAnalysis(query, vehicleResults);

      // Confidence
      if (allSources.length >= 8) dataConfidence = 'high';
      else if (allSources.length >= 4) dataConfidence = 'medium';

      searchStats = {
        totalGroups: vehicles.length * (limitGroups ? 2 : 3),
        successful: vehicleResults.filter((vr) => vr.sources.length > 0).length,
        failed: vehicleResults.filter((vr) => vr.sources.length === 0).length,
        sourcesBeforeDedup: totalRaw,
        sourcesAfterDedup: allSources.length,
        distinctSites: new Set(allSources.map((s) => s.source.toLowerCase())).size,
        scrapers: {
          mercadolibre: allSources.filter((s) =>
            s.source.toLowerCase().includes('mercadolibre')
          ).length,
          chileautos: allSources.filter((s) =>
            s.source.toLowerCase().includes('chileauto')
          ).length,
          yapo: allSources.filter((s) =>
            s.source.toLowerCase().includes('yapo')
          ).length,
        },
        errors: errorMessages.length > 0 ? errorMessages : undefined,
      };
    } else {
      // ---- SINGLE VEHICLE MODE ----
      const result = await searchSingleVehicle(vehicleDetails, client_id);
      allSources = result.sources;
      errorMessages.push(...result.errors);

      // Calculate price analysis from validated sources
      const calc = calculatePriceAnalysis(allSources);
      priceAnalysis = calc.priceAnalysis;
      estimatedRange = calc.estimatedRange;

      // Confidence
      if (allSources.length >= 5) dataConfidence = 'high';
      else if (allSources.length >= 3) dataConfidence = 'medium';

      // Generate clean analysis
      appraisalResponse = await generateAnalysis(
        query,
        vehicleDetails,
        allSources,
        priceAnalysis,
        estimatedRange,
        similarVehicles,
        inventoryVehicle
      );

      // If no sources at all, add disclaimer
      if (allSources.length === 0) {
        appraisalResponse = `⚠️ **NOTA**: No se pudieron encontrar publicaciones específicas con enlaces verificables para este vehículo en este momento. La siguiente información está basada en datos generales del mercado y puede ser menos precisa.\n\n${appraisalResponse}`;
      }

      searchStats = {
        totalGroups: 3,
        successful: (result.groupResults.a ? 1 : 0) +
          (result.groupResults.b ? 1 : 0) +
          (allSources.some((s) => s.source.toLowerCase().includes('mercadolibre')) ? 1 : 0),
        failed: errorMessages.length,
        sourcesBeforeDedup: result.rawCount,
        sourcesAfterDedup: allSources.length,
        distinctSites: new Set(allSources.map((s) => s.source.toLowerCase())).size,
        scrapers: {
          mercadolibre: allSources.filter((s) =>
            s.source.toLowerCase().includes('mercadolibre')
          ).length,
          chileautos: allSources.filter((s) =>
            s.source.toLowerCase().includes('chileauto')
          ).length,
          yapo: allSources.filter((s) =>
            s.source.toLowerCase().includes('yapo')
          ).length,
        },
        errors: errorMessages.length > 0 ? errorMessages : undefined,
      };
    }

    // ========================================
    // Step 9: Save to database
    // ========================================
    const containsLinks = allSources.length > 0;
    const currentTimestamp = new Date().toISOString();

    const appraisalData: Record<string, any> = {
      client_id,
      query,
      vehicle_details: vehicleDetails,
      appraisal_result: appraisalResponse,
      contains_links: containsLinks,
      sources: allSources,
      price_analysis: priceAnalysis,
      estimated_range: estimatedRange,
      confidence: dataConfidence,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
      created_by: user_id,
    };
    if (vehicle_id) appraisalData.vehicle_id = vehicle_id;

    // Only save if we actually found sources
    let saveError = null;
    if (allSources.length > 0) {
      const { error } = await supabase
        .from('appraisals')
        .insert(appraisalData);
      saveError = error;

      if (saveError) {
        console.error('[car_appraiser] Error saving to database:', saveError);
      }
    } else {
      console.log('[car_appraiser] Skipping save — no sources found');
    }

    // ========================================
    // Step 10: Return response
    // ========================================
    console.log(
      `[car_appraiser] Done — ${allSources.length} sources, confidence: ${dataConfidence}`
    );

    // Si la patente se resolvió vía GetAPI, devolvemos `resolved_from_plate`
    // como campo estructurado; el frontend renderiza un banner arriba del
    // resultado para que el usuario sepa de dónde vinieron marca/modelo/año.
    return new Response(
      JSON.stringify({
        appraisal: appraisalResponse,
        vehicle_details: vehicleDetails,
        original_query: query,
        contains_links: containsLinks,
        sources: allSources,
        price_analysis: priceAnalysis,
        estimated_range: estimatedRange,
        confidence: dataConfidence,
        search_stats: searchStats,
        saved: !saveError,
        resolved_from_plate: resolvedFromPlate,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[car_appraiser] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
