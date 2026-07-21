/**
 * Verifica si una URL es del mismo origen o de Supabase (confiable)
 */
function isInternalOrSupabaseUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const currentOrigin = window.location.origin;

    // Mismo origen
    if (urlObj.origin === currentOrigin) return true;

    // URLs de Supabase Storage (confiables) - incluir múltiples variantes
    const supabasePatterns = [
      'supabase.co',
      'supabase.in',
      'supabase.com',
      'supabase.io',
      'supabasestorage', // CDN de Supabase
    ];

    if (supabasePatterns.some(pattern => urlObj.hostname.includes(pattern))) {
      return true;
    }

    // También permitir URLs que parecen ser de storage (path contiene /storage/)
    if (urlObj.pathname.includes('/storage/')) return true;

    return false;
  } catch (e) {
    console.error('[imageUtils] Error parsing URL:', e);
    return false;
  }
}

/**
 * Helper para crear una promesa con timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Convierte una URL de imagen a base64 para uso en @react-pdf/renderer
 * Esto es necesario porque react-pdf no siempre puede validar las extensiones
 * de URLs de Supabase Storage u otros servicios
 *
 * Incluye timeout y reintentos para mayor robustez
 */
export async function imageUrlToBase64(url: string | undefined | null, retries = 2): Promise<string | null> {
  if (!url) return null;

  // Si la URL es externa (no Supabase ni mismo origen), no intentar convertir
  // para evitar errores de CORS
  if (!isInternalOrSupabaseUrl(url)) {
    console.log('[imageUtils] External URL detected, skipping conversion to avoid CORS:', url.substring(0, 100) + '...');
    return null; // Retornar null para que no se muestre el logo
  }

  const attemptConversion = async (): Promise<string | null> => {
    console.log('[imageUtils] Converting image to base64:', url.substring(0, 100) + '...');

    // Fetch la imagen con timeout de 10 segundos
    const response = await withTimeout(
      fetch(url),
      10000,
      'Timeout fetching image'
    );

    if (!response.ok) {
      console.error('[imageUtils] Failed to fetch image:', response.status, response.statusText);
      return null;
    }

    // Verificar que es una imagen
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.startsWith('image/')) {
      console.error('[imageUtils] URL is not an image. Content-Type:', contentType);
      return null;
    }

    // Convertir a blob con timeout
    const blob = await withTimeout(
      response.blob(),
      5000,
      'Timeout converting response to blob'
    );
    console.log('[imageUtils] Image fetched successfully. Size:', blob.size, 'bytes, Type:', blob.type);

    // Convertir blob a base64 con timeout
    return new Promise((resolve) => {
      const reader = new FileReader();
      const timeoutId = setTimeout(() => {
        console.error('[imageUtils] FileReader timeout');
        resolve(null);
      }, 5000);

      reader.onloadend = () => {
        clearTimeout(timeoutId);
        const base64String = reader.result as string;
        console.log('[imageUtils] Image converted to base64 successfully. Length:', base64String.length);
        resolve(base64String);
      };
      reader.onerror = (error) => {
        clearTimeout(timeoutId);
        console.error('[imageUtils] FileReader error:', error);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  };

  // Intentar con reintentos
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await attemptConversion();
      if (result) return result;

      // Si el resultado es null pero no hubo excepción, no reintentar
      if (attempt === retries) {
        console.warn('[imageUtils] All conversion attempts returned null');
        return null;
      }
    } catch (error) {
      console.error(`[imageUtils] Attempt ${attempt + 1}/${retries + 1} failed:`, error);
      if (attempt === retries) {
        console.error('[imageUtils] All retry attempts exhausted');
        return null;
      }
      // Esperar antes de reintentar (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  return null;
}

/**
 * Verifica si una URL es una imagen base64
 */
export function isBase64Image(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith('data:image/');
}

/**
 * Convierte un SVG a PNG usando canvas para compatibilidad con @react-pdf/renderer
 * Los SVG directos (incluso en base64) pueden fallar en react-pdf
 * Incluye timeout para evitar bloqueos
 */
async function convertSvgToPng(svgUrl: string): Promise<string> {
  try {
    console.log('[imageUtils] Converting SVG to PNG for PDF compatibility');

    const response = await withTimeout(
      fetch(svgUrl),
      10000,
      'Timeout fetching SVG'
    );

    if (!response.ok) {
      console.error('[imageUtils] Failed to fetch SVG:', response.status);
      throw new Error('Failed to fetch SVG');
    }

    const svgText = await withTimeout(
      response.text(),
      5000,
      'Timeout reading SVG text'
    );

    // Crear un canvas para renderizar el SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Dimensiones para el logo en PDFs (proporción 10:3 aproximadamente)
    canvas.width = 200;
    canvas.height = 60;

    // Crear una imagen desde el SVG
    const img = new Image();
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
      // Timeout para la carga de imagen
      const timeoutId = setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Timeout loading SVG image'));
      }, 5000);

      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          // Limpiar el canvas con fondo blanco
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Dibujar la imagen escalada
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convertir a PNG base64
          const pngDataUrl = canvas.toDataURL('image/png');

          // Limpiar
          URL.revokeObjectURL(objectUrl);

          console.log('[imageUtils] SVG converted to PNG successfully');
          resolve(pngDataUrl);
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load SVG image'));
      };

      img.src = objectUrl;
    });
  } catch (error) {
    console.error('[imageUtils] Error converting SVG to PNG:', error);
    throw error;
  }
}

/**
 * Prepara una imagen para uso en react-pdf
 * Convierte a base64 para garantizar compatibilidad con @react-pdf/renderer
 */
export async function prepareImageForPDF(url: string | undefined | null): Promise<string | null> {
  console.log('[imageUtils] prepareImageForPDF called with URL:', url);

  if (!url) {
    console.log('[imageUtils] URL is null or undefined, returning null');
    return null;
  }

  // Si ya es base64, retornar tal cual
  if (isBase64Image(url)) {
    console.log('[imageUtils] URL is already base64, returning as-is');
    return url;
  }

  // Log para verificar si la URL es válida
  console.log('[imageUtils] URL validation - isInternalOrSupabase:', isInternalOrSupabaseUrl(url));

  // Verificar si es SVG (por URL o haciendo un HEAD request)
  let isSvg = url.toLowerCase().includes('.svg') || url.toLowerCase().includes('image/svg');

  // Si no está claro por la URL, hacer un HEAD request para verificar Content-Type (con timeout)
  if (!isSvg) {
    try {
      const response = await withTimeout(
        fetch(url, { method: 'HEAD' }),
        3000,
        'Timeout checking image type'
      );
      const contentType = response.headers.get('content-type');
      isSvg = contentType?.includes('svg') || false;
    } catch (error) {
      console.log('[imageUtils] Could not determine image type via HEAD request:', error);
    }
  }

  // Los SVG necesitan convertirse a PNG para @react-pdf/renderer
  // porque los SVG (incluso en base64) pueden causar errores de "Not valid image extension"
  if (isSvg) {
    try {
      return await convertSvgToPng(url);
    } catch (error) {
      console.error('[imageUtils] Failed to convert SVG to PNG, falling back to base64:', error);
      // Si falla la conversión a PNG, intentar base64 como fallback
      return imageUrlToBase64(url);
    }
  }

  // Para otros formatos, convertir a base64
  // ya que las URLs de Supabase Storage pueden tener parámetros o tokens
  // que confunden la validación de extensiones de la librería
  return imageUrlToBase64(url);
}
