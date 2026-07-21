-- Asignación de leads por vendedor
--
-- Permite que cada lead tenga un vendedor "dueño" (assigned_to). Los vendedores
-- (rol 'seller') ven SOLO sus leads asignados; admins y gerentes ven todos.
--
-- El control de visibilidad se hace en la capa de aplicación (useLeads), igual que
-- con los vehículos (vehicles.seller_id + clients.sellers_see_all_vehicles). La tabla
-- leads NO tiene RLS activo, así que no se agregan policies aquí.

-- 1. Columna de vendedor asignado en leads (FK a public.users.id, igual que vehicles.seller_id)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_to bigint REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.leads.assigned_to IS
  'Vendedor dueño del lead (users.id). Se setea al crear (creador) o al reasignar. Los vendedores solo ven sus leads asignados.';

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);

-- 2. Toggle por cliente: si los vendedores ven todos los leads o solo los suyos.
--    DEFAULT true para NO cambiar el comportamiento de los clientes existentes
--    (hoy ningún lead tiene assigned_to; un default false los dejaría sin ver nada).
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS sellers_see_all_leads boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.clients.sellers_see_all_leads IS
  'Si true (default), los vendedores ven todos los leads del cliente. Si false, cada vendedor ve solo los leads asignados a él.';

-- 3. Miami Motors (client_id 283) pidió restringir: cada vendedor ve solo sus leads.
UPDATE public.clients SET sellers_see_all_leads = false WHERE id = 283;
