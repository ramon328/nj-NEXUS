import { uploadFile } from './storage';

/**
 * Optimización de imágenes del builder antes de subirlas.
 *
 * CONTEXTO: históricamente, los selectores de imagen del builder guardaban el
 * archivo como base64 (`FileReader.readAsDataURL`) directamente en el prop del
 * componente. Eso incrustaba la foto completa dentro de `elements_structure`,
 * inflando la config del cliente a decenas de MB (un cliente llegó a 45 MB) y
 * volviendo lentísima la carga del sitio público — además, los fondos van por
 * CSS `background-image`, así que NO pasan por la optimización de Next/Image.
 *
 * Este helper, en cambio: redimensiona a un máximo razonable, convierte a WebP
 * (con fallback a JPEG) y SUBE el archivo a Storage, devolviendo solo la URL.
 */

const MAX_DIMENSION = 2400; // px — suficiente para fondos full-width con algo de margen para zoom
const QUALITY = 0.82;
const BUCKET = 'production';
const PATH_PREFIX = 'website-builder/';

type DrawableSource = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  close?: () => void;
};

async function loadSource(file: File): Promise<DrawableSource> {
  // createImageBitmap respeta la orientación EXIF (fotos de celular) y es más rápido.
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      } as ImageBitmapOptions);
      return {
        width: bmp.width,
        height: bmp.height,
        draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h),
        close: () => bmp.close(),
      };
    } catch {
      // cae al fallback con <img>
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Optimiza una imagen y la sube a Storage. Devuelve la URL pública.
 * Para SVG no rasteriza (es vectorial y liviano): lo sube tal cual.
 */
export async function optimizeAndUploadBuilderImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen.');
  }

  // SVG: vectorial, ya es liviano — subir sin tocar.
  if (file.type === 'image/svg+xml') {
    return uploadFile(file, BUCKET, PATH_PREFIX);
  }

  const source = await loadSource(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    source.close?.();
    // Sin canvas no podemos optimizar: subir el original es mejor que incrustar base64.
    return uploadFile(file, BUCKET, PATH_PREFIX);
  }
  source.draw(ctx, width, height);
  source.close?.();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

  let blob = await toBlob('image/webp');
  let ext = 'webp';
  if (!blob) {
    blob = await toBlob('image/jpeg');
    ext = 'jpg';
  }
  if (!blob) {
    // Último recurso: subir el original (igual evita el base64 incrustado).
    return uploadFile(file, BUCKET, PATH_PREFIX);
  }

  const optimized = new File([blob], `image.${ext}`, { type: blob.type });
  return uploadFile(optimized, BUCKET, PATH_PREFIX);
}
