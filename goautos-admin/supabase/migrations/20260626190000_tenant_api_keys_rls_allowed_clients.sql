-- Realinea la RLS de tenant_api_keys con el patrón multi-automotora / superadmin.
--
-- Las policies originales (migr 20260625130000) usaban el patrón clásico
--   client_id IN (SELECT u.client_id FROM users u WHERE u.auth_id = auth.uid())
-- que SOLO permite el client_id propio del usuario. Eso bloqueaba a:
--   - superadmins (rol = 'superadmin'), y
--   - admins multi-automotora (users.allowed_client_ids)
-- al generar/gestionar API keys de un tenant que no es su client_id propio
-- → error 42501 "new row violates row-level security policy".
--
-- Se reemplazan por el helper central public.user_can_access_client(client_id)
-- (creado en 20260624010000), que devuelve true si el usuario es superadmin,
-- si es su client_id, o si está en su allowed_client_ids.

DROP POLICY IF EXISTS tenant_api_keys_select_own ON public.tenant_api_keys;
CREATE POLICY tenant_api_keys_select_own ON public.tenant_api_keys
  FOR SELECT USING (public.user_can_access_client(client_id));

DROP POLICY IF EXISTS tenant_api_keys_insert_own ON public.tenant_api_keys;
CREATE POLICY tenant_api_keys_insert_own ON public.tenant_api_keys
  FOR INSERT WITH CHECK (public.user_can_access_client(client_id));

DROP POLICY IF EXISTS tenant_api_keys_update_own ON public.tenant_api_keys;
CREATE POLICY tenant_api_keys_update_own ON public.tenant_api_keys
  FOR UPDATE USING (public.user_can_access_client(client_id));

DROP POLICY IF EXISTS tenant_api_keys_delete_own ON public.tenant_api_keys;
CREATE POLICY tenant_api_keys_delete_own ON public.tenant_api_keys
  FOR DELETE USING (public.user_can_access_client(client_id));
