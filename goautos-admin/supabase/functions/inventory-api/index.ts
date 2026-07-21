import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';

// API pública de inventario por tenant.
// Auth: header `x-api-key: <key>` (o `Authorization: Bearer <key>`). La key se
// valida hasheándola (SHA-256) y buscándola en `tenant_api_keys` (no revocada).
// El client_id sale de la key — el caller NO lo elige. verify_jwt=false.
//
// Rutas:
//   GET /functions/v1/inventory-api/vehicles            → lista paginada (+filtros)
//   GET /functions/v1/inventory-api/vehicles/{id}       → detalle de un vehículo
//
// Solo expone datos COMERCIALES (nada financiero: ni compra, ni márgenes, ni
// comisiones, ni datos de consignación).
//
// Para agentes AI (opt-in, no cambia el contrato por defecto):
//   - `view=compact`: solo campos comerciales — sin galeria, main_image_url,
//     video_url, patente ni timestamps (~12% del payload completo).
//   - `exclude=galeria`: vista completa pero sin el array de fotos.
//   - Filtros por nombre (parciales, case-insensitive): `marca`, `modelo`,
//     `categoria`, `combustible`. Aliases en español: `precio_min`/`precio_max`,
//     `anio_min`/`anio_max`.
//   - ETag débil + If-None-Match → 304 (inventario sin cambios no se retransmite).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, x-client-info, apikey, content-type, if-none-match',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Expose-Headers': 'ETag',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Respuesta 200 con ETag débil, o 304 si el If-None-Match del caller coincide.
// El agente AI baja el inventario completo en cada conversación; cuando no
// cambió, el 304 evita retransmitir el payload.
async function jsonWithEtag(req: Request, body: unknown): Promise<Response> {
  const payload = JSON.stringify(body);
  const etag = `W/"${(await sha256hex(payload)).slice(0, 32)}"`;
  const base = { ...corsHeaders, ETag: etag, 'Cache-Control': 'no-cache' };
  const inm = (req.headers.get('if-none-match') || '').split(',').map((t) => t.trim());
  if (inm.includes(etag)) return new Response(null, { status: 304, headers: base });
  return new Response(payload, {
    status: 200,
    headers: { ...base, 'Content-Type': 'application/json' },
  });
}

// Comuna/ciudad desde una dirección estilo Google Places (último segmento sin
// dígitos, descartando país y región): "Prieto Sur 1073, Temuco, Región de La
// Araucanía 4780000, Chile" → "Temuco".
function cityFromAddress(address?: string | null): string {
  const parts = (address || '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t && !/^chile$/i.test(t) && !/regi[oó]n|metropolitan/i.test(t));
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!/\d/.test(parts[i])) return parts[i];
  }
  return '';
}

// Etiqueta visible de la sucursal: name personalizado tal cual; autogenerado
// ("Sucursal - <dirección>", "Sucursal Principal", "Sucursal #4") → comuna.
// Misma lógica que dealershipLabel() del website.
function dealershipLabel(d?: { name?: string | null; address?: string | null } | null): string | null {
  if (!d) return null;
  const name = (d.name || '').trim();
  const address = (d.address || '').trim();
  const isAutoName =
    !name ||
    /^sucursal(\s+principal)?(\s*#?\d*)?$/i.test(name) ||
    (!!address && name.toLowerCase().endsWith(address.toLowerCase()));
  if (!isAutoName) return name;
  return cityFromAddress(address) || name || address || null;
}

// `!inner` solo en las relaciones con filtro por nombre: sin él, PostgREST
// deja el embed en null en vez de excluir la fila.
function vehicleSelect(inner: { brand?: boolean; model?: boolean; category?: boolean; fuel?: boolean } = {}) {
  return `
  id, year, price, mileage, main_image, gallery, label, description,
  transmission, traction, owners, keys, license_plate, video_url,
  created_at, updated_at,
  brand:brand_id${inner.brand ? '!inner' : ''}(name),
  model:model_id${inner.model ? '!inner' : ''}(name),
  version:version_id(name),
  category:category_id${inner.category ? '!inner' : ''}(name),
  color:color_id(name),
  fuel_type:fuel_type_id${inner.fuel ? '!inner' : ''}(name),
  dealership:dealership_id(name, address),
  status:status_id(name, show_in_web)
`;
}

const VEHICLE_SELECT = vehicleSelect();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(
  v: any,
  links: { web: string | null; chileautos: string | null; mercadolibre: string | null } = {
    web: null,
    chileautos: null,
    mercadolibre: null,
  }
) {
  return {
    id: v.id,
    marca: v.brand?.name || '',
    modelo: v.model?.name || '',
    version: v.version?.name || v.label || null,
    anio: v.year || null,
    precio: v.price || 0,
    kms: v.mileage || 0,
    transmision: v.transmission || null,
    traccion: v.traction || null,
    combustible: v.fuel_type?.name || null,
    color: v.color?.name || null,
    categoria: v.category?.name || null,
    duenos: v.owners ?? null,
    llaves: v.keys ?? null,
    sucursal: dealershipLabel(v.dealership),
    patente: v.license_plate || null,
    descripcion: v.description || null,
    video_url: v.video_url || null,
    main_image_url: v.main_image || null,
    galeria: Array.isArray(v.gallery) ? v.gallery : [],
    estado: v.status?.name || null,
    disponible: v.status?.show_in_web || false,
    created_at: v.created_at,
    updated_at: v.updated_at, // last updated
    // Links de la publicación del auto (web del tenant, ChileAutos, MercadoLibre).
    links,
  };
}

// Vista compacta para agentes AI: solo los datos comerciales que usan para
// vender. Sin galeria (75% del payload), sin main_image_url/video, sin patente
// (dato personal) y sin timestamps.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeCompact(
  v: any,
  links: { web: string | null; chileautos: string | null; mercadolibre: string | null }
) {
  return {
    id: v.id,
    marca: v.brand?.name || '',
    modelo: v.model?.name || '',
    version: v.version?.name || v.label || null,
    anio: v.year || null,
    precio: v.price || 0,
    kms: v.mileage || 0,
    transmision: v.transmission || null,
    traccion: v.traction || null,
    combustible: v.fuel_type?.name || null,
    color: v.color?.name || null,
    categoria: v.category?.name || null,
    duenos: v.owners ?? null,
    llaves: v.keys ?? null,
    sucursal: dealershipLabel(v.dealership),
    descripcion: v.description || null,
    estado: v.status?.name || null,
    disponible: v.status?.show_in_web || false,
    links,
  };
}

// Base de la web del tenant: custom domain verificado, o el subdominio por defecto.
async function clientWebBase(clientId: number): Promise<string | null> {
  const { data } = await supabase
    .from('clients')
    .select('domain, custom_domain, custom_domain_verified')
    .eq('id', clientId)
    .maybeSingle();
  if (!data) return null;
  const host =
    (data as any).custom_domain_verified && (data as any).custom_domain
      ? (data as any).custom_domain
      : (data as any).domain;
  return host ? `https://${host}` : null;
}

// Links de publicación por vehículo (MELI + ChileAutos), en lote.
async function publicationLinks(
  vehicleIds: number[]
): Promise<{ meli: Map<number, string>; ca: Map<number, string> }> {
  const meli = new Map<number, string>();
  const ca = new Map<number, string>();
  if (vehicleIds.length === 0) return { meli, ca };
  const [meliRes, caRes] = await Promise.all([
    supabase.from('meli_post').select('vehicle_id, url_post').in('vehicle_id', vehicleIds),
    supabase.from('chileautos_listing').select('vehicle_id, chileautos_identifier').in('vehicle_id', vehicleIds),
  ]);
  (meliRes.data || []).forEach((r: any) => {
    if (r.url_post) meli.set(r.vehicle_id, r.url_post);
  });
  (caRes.data || []).forEach((r: any) => {
    if (r.chileautos_identifier)
      ca.set(r.vehicle_id, `https://www.chileautos.cl/details/${r.chileautos_identifier}`);
  });
  return { meli, ca };
}

// Estados "disponibles" del tenant (show_in_web=true o nombre tipo 'Publicado').
async function availableStatusIds(clientId: number): Promise<number[]> {
  const [{ data: web }, { data: pub }] = await Promise.all([
    supabase.from('clients_vehicles_states').select('id').eq('client_id', clientId).eq('show_in_web', true),
    supabase.from('clients_vehicles_states').select('id').eq('client_id', clientId).ilike('name', '%publicado%'),
  ]);
  return [...new Set([...(web || []).map((s) => s.id), ...(pub || []).map((s) => s.id)])];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') return json({ success: false, error: 'Método no permitido. Usa GET.' }, 405);

  // 1) Autenticación por API key.
  const rawKey =
    req.headers.get('x-api-key') ||
    (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();

  if (!rawKey) {
    return json({ success: false, error: 'Falta la API key (header x-api-key).' }, 401);
  }

  const keyHash = await sha256hex(rawKey);
  const { data: keyRow } = await supabase
    .from('tenant_api_keys')
    .select('id, client_id, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (!keyRow || keyRow.revoked_at) {
    return json({ success: false, error: 'API key inválida o revocada.' }, 401);
  }

  const clientId: number = keyRow.client_id;
  // Marca el último uso (sin bloquear la respuesta).
  supabase
    .from('tenant_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id)
    .then(() => {});

  try {
    const url = new URL(req.url);
    // Lo que viene después de /inventory-api: '', '/vehicles', '/vehicles/123'.
    // Se acepta un alias opcional /v1 (futuro versionado de path).
    const sub = url.pathname
      .replace(/^.*\/inventory-api/, '')
      .replace(/^\/v1/, '')
      .replace(/\/+$/, '');
    const detailMatch = sub.match(/^\/vehicles\/(\d+)$/);

    // Vista: 'compact' (solo datos comerciales) u opcionalmente excluir la
    // galería de la vista completa. Aplica a lista y detalle.
    const compact = url.searchParams.get('view') === 'compact';
    const excludeGaleria = (url.searchParams.get('exclude') || '')
      .split(',')
      .map((t) => t.trim())
      .includes('galeria');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toJson = (v: any, links: { web: string | null; chileautos: string | null; mercadolibre: string | null }) => {
      if (compact) return serializeCompact(v, links);
      const row = serialize(v, links);
      if (excludeGaleria) delete (row as { galeria?: unknown }).galeria;
      return row;
    };

    // 2a) Detalle.
    if (detailMatch) {
      const id = parseInt(detailMatch[1]);
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select(VEHICLE_SELECT)
        .eq('id', id)
        .eq('client_id', clientId) // scope al tenant de la key
        .maybeSingle();

      if (error) return json({ success: false, error: 'Error al obtener el vehículo.' }, 500);
      if (!vehicle) return json({ success: false, error: 'Vehículo no encontrado.' }, 404);
      const [webBaseD, linksD] = await Promise.all([
        clientWebBase(clientId),
        publicationLinks([(vehicle as any).id]),
      ]);
      return await jsonWithEtag(req, {
        success: true,
        version: '1',
        data: toJson(vehicle, {
          web: webBaseD ? `${webBaseD}/vehicles/${(vehicle as any).id}` : null,
          chileautos: linksD.ca.get((vehicle as any).id) || null,
          mercadolibre: linksD.meli.get((vehicle as any).id) || null,
        }),
      });
    }

    // 2b) Lista (default y /vehicles).
    const num = (k: string): number | null => {
      const v = url.searchParams.get(k);
      if (v === null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1);
    const limitParam = url.searchParams.get('limit');
    const limit =
      !limitParam || limitParam === 'all'
        ? null
        : Math.min(200, Math.max(1, parseInt(limitParam) || 50));
    const availableOnly = url.searchParams.get('available_only') !== 'false';

    // Filtros opcionales.
    const brandId = num('brand_id');
    const modelId = num('model_id');
    const yearMin = num('year_min') ?? num('anio_min');
    const yearMax = num('year_max') ?? num('anio_max');
    const priceMin = num('price_min') ?? num('precio_min');
    const priceMax = num('price_max') ?? num('precio_max');
    // Filtros por NOMBRE (parciales, case-insensitive), pensados para agentes:
    // ?marca=BMW&categoria=SUV. Sanitizados igual que `search`.
    const nameParam = (k: string): string | null => {
      const v = (url.searchParams.get(k) || '').replace(/[%,()*]/g, ' ').trim().slice(0, 60);
      return v || null;
    };
    const marca = nameParam('marca');
    const modelo = nameParam('modelo');
    const categoria = nameParam('categoria');
    const combustible = nameParam('combustible');
    // Sanitiza la búsqueda: saca chars con significado en el filtro PostgREST.
    const search = (url.searchParams.get('search') || '').replace(/[%,()*]/g, ' ').trim().slice(0, 80);

    const sortField = ['created_at', 'price', 'year'].includes(url.searchParams.get('sort') || '')
      ? (url.searchParams.get('sort') as string)
      : 'created_at';
    const ascending = url.searchParams.get('order') === 'asc';

    let query = supabase
      .from('vehicles')
      .select(
        vehicleSelect({ brand: !!marca, model: !!modelo, category: !!categoria, fuel: !!combustible }),
        { count: 'exact' }
      )
      .eq('client_id', clientId);

    if (availableOnly) {
      const ids = await availableStatusIds(clientId);
      if (ids.length === 0) {
        return json({ success: true, version: '1', data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      }
      query = query.in('status_id', ids);
    }

    if (brandId !== null) query = query.eq('brand_id', brandId);
    if (modelId !== null) query = query.eq('model_id', modelId);
    if (yearMin !== null) query = query.gte('year', yearMin);
    if (yearMax !== null) query = query.lte('year', yearMax);
    if (priceMin !== null) query = query.gte('price', priceMin);
    if (priceMax !== null) query = query.lte('price', priceMax);
    if (marca) query = query.ilike('brand.name', `%${marca}%`);
    if (modelo) query = query.ilike('model.name', `%${modelo}%`);
    if (categoria) query = query.ilike('category.name', `%${categoria}%`);
    if (combustible) query = query.ilike('fuel_type.name', `%${combustible}%`);
    if (search) query = query.or(`description.ilike.%${search}%,label.ilike.%${search}%`);

    query = query.order(sortField, { ascending });
    if (limit) {
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }

    const { data: vehicles, error, count } = await query;
    if (error) {
      console.error('inventory-api list error:', error);
      return json({ success: false, error: 'Error al obtener los vehículos.' }, 500);
    }

    const total = count || 0;
    const list = vehicles || [];
    const [webBase, linksMap] = await Promise.all([
      clientWebBase(clientId),
      publicationLinks(list.map((v: any) => v.id)),
    ]);
    return await jsonWithEtag(req, {
      success: true,
      version: '1',
      data: list.map((v: any) =>
        toJson(v, {
          web: webBase ? `${webBase}/vehicles/${v.id}` : null,
          chileautos: linksMap.ca.get(v.id) || null,
          mercadolibre: linksMap.meli.get(v.id) || null,
        })
      ),
      pagination: {
        page: limit ? page : 1,
        limit: limit || total,
        total,
        totalPages: limit ? Math.ceil(total / limit) : 1,
      },
    });
  } catch (e) {
    console.error('inventory-api error:', e);
    return json({ success: false, error: 'Error interno.' }, 500);
  }
});
