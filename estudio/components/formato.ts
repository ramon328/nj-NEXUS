// Utilidades de formato compartidas por la interfaz.

// Convierte segundos a "mm:ss". Devuelve "--:--" si no hay dato.
export function formatearDuracion(
  segundos: number | null | undefined
): string {
  if (segundos == null || !Number.isFinite(segundos)) return "--:--";
  const total = Math.max(0, Math.round(segundos));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

// Normaliza un hashtag para mostrarlo siempre con "#".
export function conNumeral(tag: string): string {
  const limpio = tag.trim();
  return limpio.startsWith("#") ? limpio : `#${limpio}`;
}

// Extrae un mensaje legible de cualquier error capturado.
export function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}
