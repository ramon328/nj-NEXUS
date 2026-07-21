/**
 * Manejo de errores centralizado.
 *
 * `notifyError` mapea errores de Supabase/Postgres/red a mensajes en español y
 * dispara UN solo toast (con dedupe para no apilar el mismo error). Se usa:
 *  - Global, vía el MutationCache del QueryClient (App.tsx) para TODAS las
 *    mutations de React Query sin tocar cada call site.
 *  - Manual, en catches de flujos que usan supabase directo (no React Query).
 *
 * Para mensajes de Edge Functions reutiliza `friendlyError` (edgeFunctionErrors).
 */
import { toast } from '@/hooks/use-toast';
import { friendlyError } from '@/utils/edgeFunctionErrors';

// Códigos Postgres / PostgREST más comunes → mensaje claro en español.
const CODE_MESSAGES: Record<string, string> = {
  '42501': 'No tienes permisos para realizar esta acción.',
  '23505': 'Ya existe un registro con esos datos.',
  '23503': 'No se puede completar: hay datos relacionados.',
  '23502': 'Faltan datos obligatorios.',
  '23514': 'Algún dato no cumple las validaciones.',
  PGRST301: 'Tu sesión expiró. Vuelve a iniciar sesión.',
};

function extract(error: unknown): { code?: string; message: string } {
  if (!error) return { message: '' };
  const e = error as any;
  const code = e?.code ?? e?.error?.code ?? e?.cause?.code;
  const message =
    e?.message ??
    e?.error?.message ??
    e?.error_description ??
    e?.hint ??
    String(error);
  return { code: code ? String(code) : undefined, message: String(message) };
}

/** Devuelve el mensaje de error legible (sin disparar toast). */
export function resolveErrorMessage(
  error: unknown,
  fallback?: string,
  fnName?: string
): string {
  const { code, message } = extract(error);

  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  // Detección por texto cuando no viene código.
  if (/row-level security|violates row-level/i.test(message))
    return CODE_MESSAGES['42501'];
  if (/duplicate key|already exists/i.test(message))
    return CODE_MESSAGES['23505'];
  if (/Failed to fetch|NetworkError|network error|timeout|fetch failed/i.test(message))
    return 'Problema de conexión. Revisa tu internet e intenta de nuevo.';

  // Edge functions u otros mensajes ya descriptivos.
  const friendly = friendlyError(error, fnName);
  if (friendly) return friendly;

  return message || fallback || 'Ocurrió un error. Intenta de nuevo.';
}

// Dedupe: evita apilar el mismo mensaje en una ráfaga corta.
let lastKey = '';
let lastAt = 0;

/** Resuelve el mensaje y muestra un único toast de error (con dedupe). */
export function notifyError(
  error: unknown,
  fallback?: string,
  fnName?: string
): void {
  const message = resolveErrorMessage(error, fallback, fnName);
  const now = Date.now();
  if (message === lastKey && now - lastAt < 3000) return;
  lastKey = message;
  lastAt = now;

  // eslint-disable-next-line no-console
  console.error('[notifyError]', error);
  toast({ title: 'Error', description: message, variant: 'destructive' });
}
