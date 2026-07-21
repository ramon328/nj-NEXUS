-- FIX (hallado en el test e2e de Fase B, 2026-07-02):
-- onboard-client Step 8.5 hace `.upsert(..., { onConflict: 'preapproval_id' })`
-- sobre public.subscriptions, pero el UNIQUE creado en 20260701130000_billing_idempotency
-- era PARCIAL (WHERE preapproval_id IS NOT NULL). Postgres NO acepta un índice parcial
-- como target de ON CONFLICT a menos que la sentencia repita el mismo predicado, cosa
-- que PostgREST no hace -> el upsert fallaba con SQLSTATE 42P10 y la suscripción del
-- admin nunca se escribía (y access_source nunca pasaba a paid_verified). Silencioso:
-- Step 8.5 es no-fatal, así que el tenant se creaba "sin billing".
--
-- Un UNIQUE FULL sobre una columna nullable sigue permitiendo múltiples NULL
-- (NULLS DISTINCT por defecto) y SÍ es un target válido de ON CONFLICT. Cambio additivo
-- y prod-safe: el índice parcial previo ya garantizaba que no hay duplicados no-nulos.

DROP INDEX IF EXISTS public.subscriptions_preapproval_id_key;

CREATE UNIQUE INDEX subscriptions_preapproval_id_key
  ON public.subscriptions (preapproval_id);
