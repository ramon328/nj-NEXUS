-- Registra la aceptación de Términos y Condiciones a nivel de cliente
-- (cuenta/tenant). El primer usuario admin de la cuenta que inicia sesión
-- después del despliegue tiene que aceptar los TyC; al hacerlo se persiste
-- el timestamp y la referencia al usuario que aceptó.
--
-- NULL en `terms_accepted_at` indica que la cuenta aún no aceptó
-- explícitamente. Para los clientes existentes (anteriores a esta feature)
-- la UI debe considerar la aceptación como implícita y mostrar
-- `created_at` como fecha de referencia.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.clients.terms_accepted_at IS
  'Timestamp en el que algún usuario admin del cliente aceptó los Términos y Condiciones. NULL = aún no aceptado.';

COMMENT ON COLUMN public.clients.terms_accepted_by IS
  'auth.users.id del usuario que aceptó los TyC en nombre del cliente.';
