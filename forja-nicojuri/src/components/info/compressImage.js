// Comprime imágenes en el navegador antes de subirlas para ahorrar espacio:
// redimensiona a un máximo de 1920px por lado y reencoda a WebP (calidad 0.85).
// Si el resultado no es más liviano que el original, se mantiene el original.
// Los formatos no rasterizables (gif animado, svg) o ya pequeños se dejan intactos.
const COMPRESSIBLE = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp'])
const MAX_SIDE = 1920

export async function maybeCompressImage(file) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!COMPRESSIBLE.has(ext)) return { blob: file, name: file.name }

  try {
    const bitmap = await createImageBitmap(file)
    let { width, height } = bitmap
    if (width > MAX_SIDE || height > MAX_SIDE) {
      const scale = MAX_SIDE / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', 0.85))
    if (blob && blob.size < file.size) {
      const base = file.name.replace(/\.[^.]+$/, '')
      return { blob, name: `${base}.webp` }
    }
  } catch {
    // Si algo falla, subimos el original sin comprimir.
  }
  return { blob: file, name: file.name }
}
