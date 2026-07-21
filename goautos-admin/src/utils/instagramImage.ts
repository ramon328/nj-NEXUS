// Procesa una imagen al formato de Instagram (vertical 4:5, 1080x1350) con recorte
// COVER centrado. Así Instagram no recorta las fotos a su criterio (todas van con el
// mismo formato y buena resolución) y el preview coincide exacto con lo publicado.

export const IG_TARGET_W = 1080;
export const IG_TARGET_H = 1350; // 4:5

/**
 * Devuelve un File JPEG 1080x1350 (cover, centrado) a partir de una URL o un File.
 * Usa fetch+createImageBitmap para no "tintar" el canvas (las URLs públicas de
 * Supabase mandan CORS).
 */
export async function processToInstagram45(
  src: string | File,
  index = 0
): Promise<File> {
  let blob: Blob;
  if (src instanceof File) {
    blob = src;
  } else {
    const res = await fetch(src);
    if (!res.ok) throw new Error('No se pudo cargar la imagen');
    blob = await res.blob();
  }

  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement('canvas');
  canvas.width = IG_TARGET_W;
  canvas.height = IG_TARGET_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el canvas');

  // Fondo blanco (por si la imagen tuviera transparencia).
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, IG_TARGET_W, IG_TARGET_H);

  // Cover: escala para llenar el cuadro y centra (recorta el excedente).
  const scale = Math.max(IG_TARGET_W / bitmap.width, IG_TARGET_H / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (IG_TARGET_W - w) / 2, (IG_TARGET_H - h) / 2, w, h);
  bitmap.close?.();

  const out = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo exportar la imagen'))),
      'image/jpeg',
      0.92
    )
  );

  return new File([out], `ig-${index}-${out.size}.jpg`, { type: 'image/jpeg' });
}

// ── Recorte manual + aspect ratio elegidos por el usuario ──────────────────

export interface IGRatio {
  key: string;
  label: string;
  w: number;
  h: number;
  aspect: number; // w/h
}

// Los 3 formatos que soporta el feed de Instagram. En un carrusel todas las
// fotos comparten el mismo ratio (IG aplica el de la primera).
export const IG_RATIOS: IGRatio[] = [
  { key: '4:5', label: 'Vertical 4:5', w: 1080, h: 1350, aspect: 4 / 5 },
  { key: '1:1', label: 'Cuadrada 1:1', w: 1080, h: 1080, aspect: 1 },
  { key: '1.91:1', label: 'Horizontal 1.91:1', w: 1080, h: 566, aspect: 1.91 },
];

/**
 * Elige el formato IG estándar (4:5 / 1:1 / 1.91:1) más cercano al aspect (w/h)
 * dado. Replica cómo Instagram bloquea el ratio del carrusel según la PRIMERA
 * foto (la portada) y recorta el resto a ese formato.
 */
export function nearestIGRatioKey(aspect: number): string {
  if (!Number.isFinite(aspect) || aspect <= 0) return '4:5';
  let best = IG_RATIOS[0];
  let bestDiff = Infinity;
  for (const r of IG_RATIOS) {
    const d = Math.abs(aspect - r.aspect);
    if (d < bestDiff) {
      bestDiff = d;
      best = r;
    }
  }
  return best.key;
}

/** Recorte en porcentaje (0–100) sobre la imagen natural (lo que devuelve react-image-crop). */
export interface PercentCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Exporta un JPEG del tamaño objetivo (targetW×targetH) recortando según `crop`
 * (en % sobre la imagen natural). Si no hay crop, hace un recorte COVER centrado
 * para ese ratio. Igual que processToInstagram45, usa fetch+createImageBitmap
 * para no tintar el canvas con URLs públicas (CORS).
 */
export async function processToInstagramRatio(
  src: string | File,
  targetW: number,
  targetH: number,
  crop?: PercentCropRect | null,
  index = 0,
  fit: 'cover' | 'contain' = 'cover'
): Promise<File> {
  let blob: Blob;
  if (src instanceof File) {
    blob = src;
  } else {
    const res = await fetch(src);
    if (!res.ok) throw new Error('No se pudo cargar la imagen');
    blob = await res.blob();
  }

  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el canvas');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);

  if (fit === 'contain') {
    // Foto COMPLETA: escala para CABER dentro del marco, centrada, con fondo
    // blanco. No recorta nada (ideal para fotos apaisadas de autos, sobre todo
    // en horizontal donde el cover se comía techo y ruedas).
    const scale = Math.min(targetW / bitmap.width, targetH / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.drawImage(bitmap, (targetW - w) / 2, (targetH - h) / 2, w, h);
  } else {
    let sx: number, sy: number, sw: number, sh: number;
    if (crop && crop.width > 0 && crop.height > 0) {
      // Recorte elegido por el usuario (porcentaje sobre la imagen natural).
      sx = (crop.x / 100) * bitmap.width;
      sy = (crop.y / 100) * bitmap.height;
      sw = (crop.width / 100) * bitmap.width;
      sh = (crop.height / 100) * bitmap.height;
    } else {
      // Cover centrado para el ratio objetivo.
      const targetAspect = targetW / targetH;
      const imgAspect = bitmap.width / bitmap.height;
      if (imgAspect > targetAspect) {
        sh = bitmap.height;
        sw = sh * targetAspect;
        sx = (bitmap.width - sw) / 2;
        sy = 0;
      } else {
        sw = bitmap.width;
        sh = sw / targetAspect;
        sx = 0;
        sy = (bitmap.height - sh) / 2;
      }
    }
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetW, targetH);
  }
  bitmap.close?.();

  const out = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo exportar la imagen'))),
      'image/jpeg',
      0.92
    )
  );

  return new File([out], `ig-${index}-${out.size}.jpg`, { type: 'image/jpeg' });
}
