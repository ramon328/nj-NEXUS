import { useEffect, useRef } from 'react';

/**
 * Cuando `enabled` está activo y el PDF (blob) ya se generó, lo descarga UNA sola vez
 * y llama a `onDone` (típicamente cierra el viewer). Sirve para "descargar directo"
 * desde la lista de documentos reutilizando la misma generación del viewer.
 */
export function useAutoDownloadPdf(
  enabled: boolean | undefined,
  blob: Blob | null,
  filename: string,
  onDone: () => void
): void {
  const done = useRef(false);
  useEffect(() => {
    if (!enabled) {
      done.current = false;
      return;
    }
    if (blob && !done.current) {
      done.current = true;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onDone();
    }
  }, [enabled, blob, filename, onDone]);
}
