-- Columna clients.access_source: distingue POR QUÉ una automotora tiene acceso.
--
-- Problema que ataca: hoy clients.subscription_status nace con DEFAULT 'active', así que
-- las ~148 automotoras figuran "activas" aunque NO tengan un pago real detrás. No podemos
-- distinguir "acceso heredado por default" de "acceso por pago verificado", y por eso no
-- se puede endurecer el paywall sin arriesgar cortarle el acceso a clientes que sí pagan.
--
-- Esta columna es la base del enforcement GRADUAL y NO-ROMPEDOR:
--   - inherited_default : acceso histórico por default de columna (sin pago verificado).
--   - paid_verified     : el webhook/cobro real de MercadoPago confirmó el pago.
--   - trial             : período de prueba vigente.
--   - comp              : cortesía / acuerdo especial (no se corta nunca).
--
-- El gate (ProtectedRoute) NO lee esta columna todavía: por ahora SOLO se observa
-- (alimenta el tablero de conciliación). El corte real de acceso se activará más adelante,
-- y SOLO para 'paid_verified' con suscripción vencida — nunca un corte masivo.
--
-- Additiva y no-rompedora: agrega una columna con default; el ADD COLUMN rellena las
-- filas existentes con 'inherited_default'. No cambia accesos ni el default de
-- subscription_status (ese cambio va aparte, tras auditar los caminos de alta).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS access_source text NOT NULL DEFAULT 'inherited_default';

COMMENT ON COLUMN public.clients.access_source IS
  'Origen del acceso: inherited_default | paid_verified | trial | comp. Base del enforcement gradual; hoy solo se observa (no gatea).';

-- Backfill explícito y seguro para dejar el estado inicial documentado.
-- (El ADD COLUMN ya deja 'inherited_default'; este UPDATE es idempotente y no cambia nada.)
UPDATE public.clients SET access_source = 'inherited_default' WHERE access_source IS NULL;
