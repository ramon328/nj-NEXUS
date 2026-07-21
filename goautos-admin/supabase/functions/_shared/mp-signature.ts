// Validación de la firma x-signature de los webhooks de MercadoPago (HMAC-SHA256).
//
// MercadoPago firma cada notificación. El header viene así:
//   x-signature: ts=<unix_seconds>,v1=<hmac_hex>
//   x-request-id: <uuid>
// Y el "manifest" que se firma es EXACTAMENTE:
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// Se calcula HMAC-SHA256(manifest, secret) y se compara (tiempo constante) con v1.
//
// El secret es la "clave secreta" del webhook en la config de la aplicación de MP.
// OJO footguns:
//  - El secret de PRODUCCIÓN es DISTINTO al de PRUEBA (cada credencial tiene el suyo).
//  - data.id: si es alfanumérico, MP exige compararlo en minúsculas.
//  - ts está en SEGUNDOS (no ms).
//  - data.id sale del query param `data.id` de la URL de la notificación; si no está,
//    se usa el del body. Para preapproval es el id del recurso.

export interface MpSignatureResult {
  checked: boolean;      // ¿había secret + header como para intentar validar?
  valid: boolean | null; // resultado del HMAC (null = no se pudo chequear)
  ts: string | null;
  requestId: string | null;
}

/** Parsea el header x-signature "ts=...,v1=..." en sus partes. */
function parseSignatureHeader(header: string | null): { ts: string | null; v1: string | null } {
  if (!header) return { ts: null, v1: null };
  let ts: string | null = null;
  let v1: string | null = null;
  for (const part of header.split(',')) {
    const [k, v] = part.split('=').map((s) => s?.trim());
    if (k === 'ts') ts = v ?? null;
    else if (k === 'v1') v1 = v ?? null;
  }
  return { ts, v1 };
}

/** Comparación en tiempo constante para evitar timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Valida la firma de un webhook de MercadoPago.
 * @param req      La request entrante (para leer headers + query).
 * @param dataId   El id del recurso (body.data.id) como fallback si no viene en la URL.
 * @param secret   El webhook secret de MP (Deno.env MP_WEBHOOK_SECRET).
 */
export async function verifyMpSignature(
  req: Request,
  dataId: string | null,
  secret: string
): Promise<MpSignatureResult> {
  const sigHeader = req.headers.get('x-signature');
  const requestId = req.headers.get('x-request-id');
  const { ts, v1 } = parseSignatureHeader(sigHeader);

  // Sin secret o sin header no se puede validar → degradación segura (no chequeado).
  if (!secret || !sigHeader || !ts || !v1) {
    return { checked: false, valid: null, ts, requestId };
  }

  // data.id: preferir el query param de la URL (lo que firma MP); fallback al del
  // body. Minúsculas (regla de MP para ids alfanuméricos).
  let id: string | null = dataId;
  try {
    const qp = new URL(req.url).searchParams.get('data.id');
    if (qp) id = qp;
  } catch (_) {
    // URL no parseable → usar dataId
  }
  const normId = id ? id.toLowerCase() : null;

  // MP EXIGE construir el manifest OMITIENDO los pares cuyo valor no viene (no
  // dejarlos vacíos como `id:;`). Dejar segmentos vacíos produce un HMAC distinto
  // al que MP firmó → falsos "inválido" para webhooks legítimos.
  const parts: string[] = [];
  if (normId) parts.push(`id:${normId};`);
  if (requestId) parts.push(`request-id:${requestId};`);
  parts.push(`ts:${ts};`); // ts siempre presente (el guard ya exigió ts && v1)
  const manifest = parts.join('');
  const computed = await hmacSha256Hex(manifest, secret);
  const valid = timingSafeEqual(computed, v1);

  return { checked: true, valid, ts, requestId };
}
