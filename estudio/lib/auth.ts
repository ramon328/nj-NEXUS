// Portón de acceso por contraseña para toda la app.
//
// La protección se activa SOLO si process.env.APP_PASSWORD está definida:
// en local sin la variable todo funciona como siempre (app abierta); en
// Vercel se define la variable y la app queda protegida.
//
// IMPORTANTE: este módulo es compatible con el runtime edge — usa SOLO
// Web Crypto (crypto.subtle), nada de require("crypto").

/** Nombre de la cookie de sesión. */
export const NOMBRE_COOKIE = "acceso_estudio";

/** Duración de la sesión: 30 días. */
const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000;

const codificador = new TextEncoder();

/** ¿Está activado el portón? Solo cuando APP_PASSWORD está definida. */
export function proteccionActiva(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

// ---------------------------------------------------------------------------
// Helpers base64url (sin Buffer, para que funcione igual en edge y en Node)
// ---------------------------------------------------------------------------

function aBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function desdeBase64Url(texto: string): Uint8Array<ArrayBuffer> | null {
  try {
    const base64 = texto.replace(/-/g, "+").replace(/_/g, "/");
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Comparación de bytes en tiempo constante (timingSafeEqual manual):
 * recorre SIEMPRE todos los bytes, sin cortar al primer distinto, para no
 * filtrar información por tiempos de respuesta.
 */
function bytesIguales(a: Uint8Array, b: Uint8Array): boolean {
  const largo = Math.max(a.length, b.length);
  let diferencia = a.length === b.length ? 0 : 1;
  for (let i = 0; i < largo; i++) {
    diferencia |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diferencia === 0;
}

/**
 * Compara dos textos en tiempo constante. Primero hashea ambos con SHA-256
 * para que ni el largo ni el contenido de la contraseña se filtren por
 * tiempos de respuesta. Se usa para validar la contraseña del login.
 */
export async function compararSeguro(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", codificador.encode(a)),
    crypto.subtle.digest("SHA-256", codificador.encode(b)),
  ]);
  return bytesIguales(new Uint8Array(hashA), new Uint8Array(hashB));
}

// ---------------------------------------------------------------------------
// Token de sesión: base64url(payload).base64url(firma HMAC-SHA256)
// ---------------------------------------------------------------------------

/** Deriva la clave HMAC-SHA256 a partir de la contraseña. */
async function claveHmac(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    codificador.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * Crea el token de sesión: un payload { exp } (ahora + 30 días) firmado con
 * HMAC-SHA256 usando la contraseña como clave.
 */
export async function crearTokenSesion(password: string): Promise<string> {
  const payloadBytes = codificador.encode(
    JSON.stringify({ exp: Date.now() + DURACION_SESION_MS })
  );
  const clave = await claveHmac(password);
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", clave, payloadBytes));
  return `${aBase64Url(payloadBytes)}.${aBase64Url(firma)}`;
}

/**
 * Valida un token de sesión: verifica la firma (en tiempo constante) y que
 * no esté expirado. Si no hay APP_PASSWORD definida, la app está abierta y
 * cualquier token vale.
 */
export async function validarTokenSesion(token: string): Promise<boolean> {
  const password = process.env.APP_PASSWORD;
  if (!password) return true;

  const partes = token.split(".");
  if (partes.length !== 2) return false;

  const payloadBytes = desdeBase64Url(partes[0]);
  const firmaRecibida = desdeBase64Url(partes[1]);
  if (!payloadBytes || !firmaRecibida) return false;

  // Recalcular la firma esperada y comparar en tiempo constante.
  const clave = await claveHmac(password);
  const firmaEsperada = new Uint8Array(
    await crypto.subtle.sign("HMAC", clave, payloadBytes)
  );
  if (!bytesIguales(firmaRecibida, firmaEsperada)) return false;

  // Verificar la expiración del payload.
  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
      exp?: unknown;
    };
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Defensa en profundidad para route handlers
// ---------------------------------------------------------------------------

/** Lee una cookie concreta de la cabecera Cookie cruda. */
function leerCookie(cabecera: string, nombre: string): string | null {
  for (const parte of cabecera.split(";")) {
    const [clave, ...resto] = parte.trim().split("=");
    if (clave === nombre) return decodeURIComponent(resto.join("="));
  }
  return null;
}

/** Extrae el token de una cabecera "Authorization: Bearer <token>", si viene. */
function extraerBearer(request: Request): string | null {
  const cabecera = request.headers.get("authorization") ?? "";
  const coincidencia = cabecera.match(/^Bearer\s+(.+)$/i);
  return coincidencia ? coincidencia[1].trim() : null;
}

/**
 * ¿La petición trae "Authorization: Bearer <BACKEND_SECRET>" correcto?
 * Es el acceso servidor-a-servidor: el front (Vercel) llama al backend de
 * render (Mac mini) con este secreto en vez de cookie de sesión. La
 * comparación es en tiempo constante (hash SHA-256, igual que el login).
 * Compatible con edge: lo usan tanto proxy.ts como los route handlers.
 */
export async function bearerBackendValido(request: Request): Promise<boolean> {
  const secreto = process.env.BACKEND_SECRET;
  if (!secreto) return false;
  const bearer = extraerBearer(request);
  if (!bearer) return false;
  return compararSeguro(bearer, secreto);
}

/**
 * Verifica el acceso directamente en un route handler (defensa en
 * profundidad, por si el proxy no corre en algún entorno). Devuelve true si:
 * - la petición trae "Authorization: Bearer <BACKEND_SECRET>" y coincide con
 *   process.env.BACKEND_SECRET (acceso servidor-a-servidor: así el front en
 *   Vercel puede llamar al backend de render del Mac mini sin cookie), o
 * - la protección está desactivada (sin APP_PASSWORD), o
 * - la cookie de sesión trae un token válido.
 */
export async function verificarAcceso(request: Request): Promise<boolean> {
  // Acceso servidor-a-servidor con secreto compartido.
  if (await bearerBackendValido(request)) return true;

  if (!proteccionActiva()) return true;
  const token = leerCookie(request.headers.get("cookie") ?? "", NOMBRE_COOKIE);
  if (!token) return false;
  return validarTokenSesion(token);
}
