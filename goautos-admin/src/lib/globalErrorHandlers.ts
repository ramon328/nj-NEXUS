/**
 * Handlers globales de errores no capturados (catch global).
 *
 * Captura promesas rechazadas sin `.catch` y errores sueltos en runtime y los
 * enruta a `notifyError`, que ya resuelve el mensaje en español y deduplica
 * (un solo toast por error). Antes estos errores caían al vacío (solo consola),
 * sin avisar al usuario.
 *
 * Los errores de RENDER de React los maneja <ErrorBoundary> (App.tsx); acá
 * cubrimos el resto: async / event handlers / promesas sueltas.
 */
import { notifyError } from '@/lib/handleError';

let installed = false;

// Errores conocidos NO accionables: ruido de browser/observers y requests
// abortados. No se filtran los de red reales ("Failed to fetch"), que sí
// queremos mostrar (notifyError los mapea a "Problema de conexión").
function isIgnorable(err: unknown): boolean {
  if (err == null) return true;
  const e = err as { name?: string; message?: string };
  if (e?.name === 'AbortError') return true;
  const msg = String(e?.message ?? err ?? '');
  if (!msg) return true;
  if (
    /ResizeObserver loop (completed|limit)|Non-Error promise rejection captured/i.test(
      msg
    )
  )
    return true;
  return false;
}

export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (isIgnorable(reason)) return;
    notifyError(reason);
  });

  window.addEventListener('error', (event) => {
    // Errores de carga de recursos (img/script/link) llegan sin `error` → ignorar.
    const err = event.error;
    if (!err || isIgnorable(err)) return;
    notifyError(err);
  });
}
