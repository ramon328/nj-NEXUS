-- ============================================================================
-- Multi-automotora (allowed_client_ids): RLS aditiva
-- Permite que un admin con users.allowed_client_ids acceda a la data de esas
-- automotoras bajo impersonacion. CAMBIO PURAMENTE ADITIVO (superset estricto):
-- a cada policy gateada por cliente se le agrega OR acceso-por-allowed_client_ids
-- via el helper central. Como allowed_client_ids es NULL para todos los usuarios
-- actuales, este cambio es no-op para ellos (no gana/pierde acceso nadie).
-- Generado + verificado adversarialmente (superset + condiciones no-cliente).
-- ============================================================================

-- Helper central. bigint para aceptar client_id bigint (vehicles/tasks) e integer.
CREATE OR REPLACE FUNCTION public.user_can_access_client(target_client_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR u.client_id = target_client_id
        OR target_client_id = ANY(u.allowed_client_ids)
      )
  );
$fn$;

-- Parche ADITIVO al helper existente (lo usan algunas policies legacy):
-- ahora tambien acepta allowed_client_ids. Firma integer sin cambios.
CREATE OR REPLACE FUNCTION public.user_belongs_to_client(check_client_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  belongs BOOLEAN;
  user_role TEXT;
BEGIN
  SELECT rol INTO user_role FROM users WHERE auth_id = auth.uid();
  IF user_role = 'superadmin' THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
      AND (client_id = check_client_id OR check_client_id = ANY(allowed_client_ids))
  ) INTO belongs;

  RETURN COALESCE(belongs, false);
END;
$function$;


-- ######################## public.ai_conversation_context (verdict OK) ########################
-- Tabla: public.ai_conversation_context
-- (El helper public.user_can_access_client(integer) se asume YA creado al inicio de la migracion)

DROP POLICY IF EXISTS "Users can view ai context from their conversations" ON public.ai_conversation_context;
CREATE POLICY "Users can view ai context from their conversations" ON public.ai_conversation_context
  AS PERMISSIVE FOR SELECT TO public
  USING (
    conversation_id IN (
      SELECT c.id
      FROM conversations c
      WHERE public.user_can_access_client(c.client_id)
    )
  );

-- ######################## public.calendar_events (verdict OK) ########################
-- ============================================================
-- RLS aditiva (superset) para public.calendar_events
-- Helper public.user_can_access_client(integer) asumido ya creado.
-- ============================================================

-- 1) DELETE
DROP POLICY IF EXISTS "calendar_events_delete_policy" ON public.calendar_events;
CREATE POLICY "calendar_events_delete_policy" ON public.calendar_events
  AS PERMISSIVE FOR DELETE TO public
  USING (
    public.user_can_access_client(client_id)
    AND (
      user_has_permission('calendar.manage'::text)
      OR (
        (created_by = auth.uid())
        AND user_has_permission('calendar.create'::text)
      )
    )
  );

-- 2) INSERT
DROP POLICY IF EXISTS "calendar_events_insert_policy" ON public.calendar_events;
CREATE POLICY "calendar_events_insert_policy" ON public.calendar_events
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    public.user_can_access_client(calendar_events.client_id)
  );

-- 3) SELECT
DROP POLICY IF EXISTS "calendar_events_select_policy" ON public.calendar_events;
CREATE POLICY "calendar_events_select_policy" ON public.calendar_events
  AS PERMISSIVE FOR SELECT TO public
  USING (
    public.user_can_access_client(calendar_events.client_id)
  );

-- 4) UPDATE
DROP POLICY IF EXISTS "calendar_events_update_policy" ON public.calendar_events;
CREATE POLICY "calendar_events_update_policy" ON public.calendar_events
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    public.user_can_access_client(calendar_events.client_id)
  );

-- ######################## public.chileautos_integration (verdict OK) ########################
-- Tabla: public.chileautos_integration
-- Reescritura aditiva (superset) usando public.user_can_access_client (asumido ya creado).
-- Las 4 policies tienen forma escalar directa identica sin condiciones extra sobre 'users u',
-- por lo que la sub-expresion de pertenencia (entera) se reemplaza por el helper.

DROP POLICY IF EXISTS "Users can view their own chileautos integrations" ON public.chileautos_integration;
CREATE POLICY "Users can view their own chileautos integrations" ON public.chileautos_integration AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(chileautos_integration.client_id));

DROP POLICY IF EXISTS "Users can insert their own chileautos integrations" ON public.chileautos_integration;
CREATE POLICY "Users can insert their own chileautos integrations" ON public.chileautos_integration AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (public.user_can_access_client(chileautos_integration.client_id));

DROP POLICY IF EXISTS "Users can update their own chileautos integrations" ON public.chileautos_integration;
CREATE POLICY "Users can update their own chileautos integrations" ON public.chileautos_integration AS PERMISSIVE FOR UPDATE TO public
  USING (public.user_can_access_client(chileautos_integration.client_id))
  WITH CHECK (public.user_can_access_client(chileautos_integration.client_id));

DROP POLICY IF EXISTS "Users can delete their own chileautos integrations" ON public.chileautos_integration;
CREATE POLICY "Users can delete their own chileautos integrations" ON public.chileautos_integration AS PERMISSIVE FOR DELETE TO public
  USING (public.user_can_access_client(chileautos_integration.client_id));

-- ######################## public.chileautos_leads (verdict OK) ########################
-- ============================================================
-- Tabla: public.chileautos_leads
-- Reescritura aditiva de policies usando public.user_can_access_client(...)
-- (el helper se asume YA creado al inicio de la migracion; NO se redefine aqui)
-- ============================================================

-- Policy 1: INSERT de servicio (sin pertenencia de cliente) -> se recrea identica
DROP POLICY IF EXISTS "chileautos_leads_insert_service" ON public.chileautos_leads;
CREATE POLICY "chileautos_leads_insert_service" ON public.chileautos_leads
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

-- Policy 2: SELECT propio (forma escalar) -> pertenencia via helper
DROP POLICY IF EXISTS "chileautos_leads_select_own" ON public.chileautos_leads;
CREATE POLICY "chileautos_leads_select_own" ON public.chileautos_leads
  AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(chileautos_leads.client_id));

-- ######################## public.chileautos_listing (verdict OK) ########################
-- Reescritura aditiva (superset estricto) de RLS de public.chileautos_listing
-- Asume que public.user_can_access_client(integer) YA existe.

DROP POLICY IF EXISTS "Users can delete their own chileautos listings" ON public.chileautos_listing;
CREATE POLICY "Users can delete their own chileautos listings" ON public.chileautos_listing
  AS PERMISSIVE FOR DELETE TO public
  USING (public.user_can_access_client(chileautos_listing.client_id));

DROP POLICY IF EXISTS "Users can insert their own chileautos listings" ON public.chileautos_listing;
CREATE POLICY "Users can insert their own chileautos listings" ON public.chileautos_listing
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (public.user_can_access_client(chileautos_listing.client_id));

DROP POLICY IF EXISTS "Users can update their own chileautos listings" ON public.chileautos_listing;
CREATE POLICY "Users can update their own chileautos listings" ON public.chileautos_listing
  AS PERMISSIVE FOR UPDATE TO public
  USING (public.user_can_access_client(chileautos_listing.client_id))
  WITH CHECK (public.user_can_access_client(chileautos_listing.client_id));

DROP POLICY IF EXISTS "Users can view their own chileautos listings" ON public.chileautos_listing;
CREATE POLICY "Users can view their own chileautos listings" ON public.chileautos_listing
  AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(chileautos_listing.client_id));

-- ######################## public.client_custom_pages (verdict OK) ########################
DROP POLICY IF EXISTS "client_custom_pages_access" ON public.client_custom_pages;
CREATE POLICY "client_custom_pages_access" ON public.client_custom_pages AS PERMISSIVE FOR ALL TO public
  USING (public.user_can_access_client(client_custom_pages.client_id))
  WITH CHECK (public.user_can_access_client(client_custom_pages.client_id));

-- ######################## public.conversations (verdict OK) ########################
-- ============================================================
-- Tabla: public.conversations
-- Reescritura aditiva de policies (superset estricto via helper)
-- Helper public.user_can_access_client(integer) se asume YA creado.
-- ============================================================

-- 1) INSERT
DROP POLICY IF EXISTS "Users can insert conversations for their client" ON public.conversations;
CREATE POLICY "Users can insert conversations for their client" ON public.conversations
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (public.user_can_access_client(client_id));

-- 2) UPDATE
DROP POLICY IF EXISTS "Users can update conversations from their client" ON public.conversations;
CREATE POLICY "Users can update conversations from their client" ON public.conversations
  AS PERMISSIVE FOR UPDATE TO public
  USING (public.user_can_access_client(client_id));

-- 3) SELECT
DROP POLICY IF EXISTS "Users can view conversations from their client" ON public.conversations;
CREATE POLICY "Users can view conversations from their client" ON public.conversations
  AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(client_id));

-- ######################## public.fb_marketplace_integration (verdict OK) ########################
-- =====================================================================
-- Tabla: public.fb_marketplace_integration
-- Reescritura ADITIVA de RLS (superset estricto) usando el helper
-- public.user_can_access_client(integer). El helper YA existe.
-- Las 4 policies son forma "columna IN (subquery de users)" pura:
--   client_id IN (SELECT users.client_id FROM users WHERE users.auth_id = auth.uid())
-- -> public.user_can_access_client(client_id)
-- No hay condiciones extra que conservar.
-- =====================================================================

-- SELECT --------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.fb_marketplace_integration;
CREATE POLICY "Users can view their own integrations" ON public.fb_marketplace_integration
  AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(client_id));

-- INSERT --------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.fb_marketplace_integration;
CREATE POLICY "Users can insert their own integrations" ON public.fb_marketplace_integration
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (public.user_can_access_client(client_id));

-- UPDATE --------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their own integrations" ON public.fb_marketplace_integration;
CREATE POLICY "Users can update their own integrations" ON public.fb_marketplace_integration
  AS PERMISSIVE FOR UPDATE TO public
  USING (public.user_can_access_client(client_id));

-- DELETE --------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.fb_marketplace_integration;
CREATE POLICY "Users can delete their own integrations" ON public.fb_marketplace_integration
  AS PERMISSIVE FOR DELETE TO public
  USING (public.user_can_access_client(client_id));

-- ######################## public.fb_marketplace_post (verdict OK) ########################
-- Tabla: public.fb_marketplace_post
-- Reescritura aditiva (superset estricto) de las 4 policies.
-- Todas son forma "columna IN (SELECT users.client_id ...)" => public.user_can_access_client(client_id)
-- (El helper public.user_can_access_client ya existe; NO se redefine aqui.)

-- SELECT
DROP POLICY IF EXISTS "Users can view their own posts" ON public.fb_marketplace_post;
CREATE POLICY "Users can view their own posts" ON public.fb_marketplace_post AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(client_id));

-- INSERT
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.fb_marketplace_post;
CREATE POLICY "Users can insert their own posts" ON public.fb_marketplace_post AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (public.user_can_access_client(client_id));

-- UPDATE
DROP POLICY IF EXISTS "Users can update their own posts" ON public.fb_marketplace_post;
CREATE POLICY "Users can update their own posts" ON public.fb_marketplace_post AS PERMISSIVE FOR UPDATE TO public
  USING (public.user_can_access_client(client_id));

-- DELETE
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.fb_marketplace_post;
CREATE POLICY "Users can delete their own posts" ON public.fb_marketplace_post AS PERMISSIVE FOR DELETE TO public
  USING (public.user_can_access_client(client_id));

-- ######################## public.kapso_integrations (verdict OK) ########################
-- Tabla: public.kapso_integrations
-- Reescritura aditiva (superset) de RLS usando public.user_can_access_client(client_id).

DROP POLICY IF EXISTS "Users can manage kapso integrations for their client" ON public.kapso_integrations;
CREATE POLICY "Users can manage kapso integrations for their client" ON public.kapso_integrations AS PERMISSIVE FOR ALL TO public
  USING (public.user_can_access_client(client_id));

DROP POLICY IF EXISTS "Users can view kapso integrations from their client" ON public.kapso_integrations;
CREATE POLICY "Users can view kapso integrations from their client" ON public.kapso_integrations AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(client_id));

-- ######################## public.lead_activity_log (verdict OK) ########################
-- Tabla: public.lead_activity_log
-- (Helper public.user_can_access_client ya creado previamente en la migracion; NO redefinir.)

DROP POLICY IF EXISTS "lead_activity_log_select_own" ON public.lead_activity_log;
CREATE POLICY "lead_activity_log_select_own" ON public.lead_activity_log AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(lead_activity_log.client_id));

-- ######################## public.lead_export_log (verdict OK) ########################
DROP POLICY IF EXISTS "lead_export_log_select_own" ON public.lead_export_log;
CREATE POLICY "lead_export_log_select_own" ON public.lead_export_log AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(lead_export_log.client_id));

-- ######################## public.lead_scores (verdict OK) ########################
DROP POLICY IF EXISTS "Users can view lead scores from their contacts" ON public.lead_scores;
CREATE POLICY "Users can view lead scores from their contacts" ON public.lead_scores AS PERMISSIVE FOR SELECT TO public
  USING (
    unified_contact_id IN (
      SELECT uc.id
      FROM unified_contacts uc
      WHERE public.user_can_access_client(uc.client_id)
    )
  );

-- ######################## public.messages (verdict OK) ########################
-- ============================================================
-- RLS aditivo (superset estricto) para public.messages
-- Helper public.user_can_access_client(integer) se asume YA creado.
-- Forma original (las 3): conversation_id IN (
--   SELECT c.id FROM conversations c JOIN users u ON c.client_id = u.client_id
--   WHERE u.auth_id = auth.uid())
-- Reescrita (forma JOIN, regla 3): el filtro de cliente del usuario pasa al helper.
-- ============================================================

-- INSERT
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
CREATE POLICY "Users can insert messages in their conversations" ON public.messages
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = messages.conversation_id
        AND public.user_can_access_client(c.client_id)
    )
  );

-- UPDATE
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;
CREATE POLICY "Users can update messages in their conversations" ON public.messages
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = messages.conversation_id
        AND public.user_can_access_client(c.client_id)
    )
  );

-- SELECT
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;
CREATE POLICY "Users can view messages from their conversations" ON public.messages
  AS PERMISSIVE FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = messages.conversation_id
        AND public.user_can_access_client(c.client_id)
    )
  );

-- ######################## public.notifications (verdict OK) ########################
-- ============================================================
-- Tabla: public.notifications
-- Reescritura ADITIVA (superset estricto) de policies usando el
-- helper public.user_can_access_client(integer) (asumido YA creado).
-- ============================================================

-- 1) INSERT: "Users create notifications for own client"
DROP POLICY IF EXISTS "Users create notifications for own client" ON public.notifications;
CREATE POLICY "Users create notifications for own client" ON public.notifications
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    public.user_can_access_client(client_id)
  );

-- 2) SELECT: "Users see own client notifications"
DROP POLICY IF EXISTS "Users see own client notifications" ON public.notifications;
CREATE POLICY "Users see own client notifications" ON public.notifications
  AS PERMISSIVE FOR SELECT TO public
  USING (
    public.user_can_access_client(client_id)
    AND ((target_user_id IS NULL) OR (target_user_id = auth.uid()))
    AND ((target_role IS NULL) OR (target_role = (( SELECT users.rol
       FROM users
      WHERE (users.auth_id = auth.uid())))::text))
  );

-- ######################## public.role_permissions (verdict OK) ########################
-- =====================================================================
-- role_permissions: reescritura ADITIVA de policies (superset estricto)
-- Helper public.user_can_access_client(integer) asumido ya creado.
-- =====================================================================

-- 1) SELECT
DROP POLICY IF EXISTS "Users can view role_permissions" ON public.role_permissions;
CREATE POLICY "Users can view role_permissions" ON public.role_permissions AS PERMISSIVE FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM roles r
      WHERE r.id = role_permissions.role_id
        AND public.user_can_access_client(r.client_id)
    )
  );

-- 2) DELETE
DROP POLICY IF EXISTS "Users with roles.manage can delete role_permissions" ON public.role_permissions;
CREATE POLICY "Users with roles.manage can delete role_permissions" ON public.role_permissions AS PERMISSIVE FOR DELETE TO public
  USING (
    (EXISTS (
      SELECT 1
      FROM roles r
      WHERE r.id = role_permissions.role_id
        AND public.user_can_access_client(r.client_id)
    ))
    AND user_has_permission('roles.manage'::text)
  );

-- 3) INSERT
DROP POLICY IF EXISTS "Users with roles.manage can insert role_permissions" ON public.role_permissions;
CREATE POLICY "Users with roles.manage can insert role_permissions" ON public.role_permissions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (EXISTS (
      SELECT 1
      FROM roles r
      WHERE r.id = role_permissions.role_id
        AND public.user_can_access_client(r.client_id)
    ))
    AND user_has_permission('roles.manage'::text)
  );

-- 4) UPDATE
DROP POLICY IF EXISTS "Users with roles.manage can update role_permissions" ON public.role_permissions;
CREATE POLICY "Users with roles.manage can update role_permissions" ON public.role_permissions AS PERMISSIVE FOR UPDATE TO public
  USING (
    (EXISTS (
      SELECT 1
      FROM roles r
      WHERE r.id = role_permissions.role_id
        AND public.user_can_access_client(r.client_id)
    ))
    AND user_has_permission('roles.manage'::text)
  );

-- ######################## public.roles (verdict OK) ########################
-- Migracion ADITIVA (superset estricto) para public.roles
-- Asume que public.user_can_access_client(integer) YA existe (NO se redefine aqui).

-- 1) SELECT: ver roles del propio cliente
DROP POLICY IF EXISTS "Users can view roles in their client" ON public.roles;
CREATE POLICY "Users can view roles in their client" ON public.roles
  AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(client_id));

-- 2) DELETE: borrar roles no-system con permiso roles.manage
DROP POLICY IF EXISTS "Users with roles.manage can delete non-system roles" ON public.roles;
CREATE POLICY "Users with roles.manage can delete non-system roles" ON public.roles
  AS PERMISSIVE FOR DELETE TO public
  USING (
    (is_system_role = false)
    AND public.user_can_access_client(client_id)
    AND user_has_permission('roles.manage'::text)
  );

-- 3) INSERT: insertar roles con permiso roles.manage
DROP POLICY IF EXISTS "Users with roles.manage can insert roles" ON public.roles;
CREATE POLICY "Users with roles.manage can insert roles" ON public.roles
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    public.user_can_access_client(client_id)
    AND user_has_permission('roles.manage'::text)
  );

-- 4) UPDATE: actualizar roles con permiso roles.manage
DROP POLICY IF EXISTS "Users with roles.manage can update roles" ON public.roles;
CREATE POLICY "Users with roles.manage can update roles" ON public.roles
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    public.user_can_access_client(client_id)
    AND user_has_permission('roles.manage'::text)
  );

-- ######################## public.sale_commission_splits (verdict OK) ########################
-- ============================================================
-- RLS aditiva (superset estricto) para public.sale_commission_splits
-- Helper public.user_can_access_client(integer) se asume YA creado.
-- Todas las policies son Form 3 (JOIN): el client objetivo = v.client_id,
-- obtenido de vehicles v JOIN vehicles_sales vs WHERE vs.id = sale_commission_splits.sale_id.
-- ============================================================

-- SELECT
DROP POLICY IF EXISTS "Users can view commission splits for their client's sales" ON public.sale_commission_splits;
CREATE POLICY "Users can view commission splits for their client's sales" ON public.sale_commission_splits
  AS PERMISSIVE FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM vehicles_sales vs
        JOIN vehicles v ON (v.id = vs.vehicle_id)
      WHERE vs.id = sale_commission_splits.sale_id
        AND public.user_can_access_client(v.client_id)
    )
  );

-- INSERT
DROP POLICY IF EXISTS "Users can insert commission splits for their client's sales" ON public.sale_commission_splits;
CREATE POLICY "Users can insert commission splits for their client's sales" ON public.sale_commission_splits
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM vehicles_sales vs
        JOIN vehicles v ON (v.id = vs.vehicle_id)
      WHERE vs.id = sale_commission_splits.sale_id
        AND public.user_can_access_client(v.client_id)
    )
  );

-- UPDATE
DROP POLICY IF EXISTS "Users can update commission splits for their client's sales" ON public.sale_commission_splits;
CREATE POLICY "Users can update commission splits for their client's sales" ON public.sale_commission_splits
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM vehicles_sales vs
        JOIN vehicles v ON (v.id = vs.vehicle_id)
      WHERE vs.id = sale_commission_splits.sale_id
        AND public.user_can_access_client(v.client_id)
    )
  );

-- DELETE
DROP POLICY IF EXISTS "Users can delete commission splits for their client's sales" ON public.sale_commission_splits;
CREATE POLICY "Users can delete commission splits for their client's sales" ON public.sale_commission_splits
  AS PERMISSIVE FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM vehicles_sales vs
        JOIN vehicles v ON (v.id = vs.vehicle_id)
      WHERE vs.id = sale_commission_splits.sale_id
        AND public.user_can_access_client(v.client_id)
    )
  );

-- ######################## public.sale_commission_splits_history (verdict OK) ########################
DROP POLICY IF EXISTS "Read commission history for their client's sales" ON public.sale_commission_splits_history;
CREATE POLICY "Read commission history for their client's sales" ON public.sale_commission_splits_history AS PERMISSIVE FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM (vehicles_sales vs
        JOIN vehicles v ON ((v.id = vs.vehicle_id)))
      WHERE ((vs.id = sale_commission_splits_history.sale_id)
        AND public.user_can_access_client(v.client_id))
    )
  );

-- ######################## public.tasks (verdict OK) ########################
-- ============================================================
-- Reescritura aditiva (superset) de policies de public.tasks
-- Helper public.user_can_access_client(integer) asumido YA creado.
-- ============================================================

-- ---- SELECT ----
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy" ON public.tasks AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(tasks.client_id));

-- ---- INSERT ----
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
CREATE POLICY "tasks_insert_policy" ON public.tasks AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (public.user_can_access_client(tasks.client_id));

-- ---- UPDATE ----
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy" ON public.tasks AS PERMISSIVE FOR UPDATE TO public
  USING (public.user_can_access_client(tasks.client_id));

-- ---- DELETE ----
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
CREATE POLICY "tasks_delete_policy" ON public.tasks AS PERMISSIVE FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.auth_id = auth.uid()
        AND (u.rol)::text = ANY (ARRAY[('admin'::character varying)::text, ('superadmin'::character varying)::text])
    )
    AND public.user_can_access_client(tasks.client_id)
  );

-- ######################## public.unified_contacts (verdict OK) ########################
-- unified_contacts: reescritura aditiva de policies (superset estricto via helper user_can_access_client)

DROP POLICY IF EXISTS "Users can view contacts from their client" ON public.unified_contacts;
CREATE POLICY "Users can view contacts from their client" ON public.unified_contacts
  AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(client_id));

DROP POLICY IF EXISTS "Users can insert contacts for their client" ON public.unified_contacts;
CREATE POLICY "Users can insert contacts for their client" ON public.unified_contacts
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (public.user_can_access_client(client_id));

DROP POLICY IF EXISTS "Users can update contacts from their client" ON public.unified_contacts;
CREATE POLICY "Users can update contacts from their client" ON public.unified_contacts
  AS PERMISSIVE FOR UPDATE TO public
  USING (public.user_can_access_client(client_id));

-- ######################## public.updates (verdict OK) ########################
-- ============================================================
-- RLS aditiva (superset estricto) para public.updates
-- Helper public.user_can_access_client(integer) se asume YA creado.
-- ============================================================

-- 1) "Admins can manage their client's updates" (ALL)
DROP POLICY IF EXISTS "Admins can manage their client's updates" ON public.updates;
CREATE POLICY "Admins can manage their client's updates" ON public.updates AS PERMISSIVE FOR ALL TO public
  USING (
    (EXISTS ( SELECT 1
       FROM users
      WHERE ((users.auth_id = auth.uid()) AND ((users.rol)::text = 'admin'::text))))
    AND public.user_can_access_client(updates.client_id)
  );

-- 2) "Anyone can view published updates" (SELECT) -- sin cambios (no es de cliente)
DROP POLICY IF EXISTS "Anyone can view published updates" ON public.updates;
CREATE POLICY "Anyone can view published updates" ON public.updates AS PERMISSIVE FOR SELECT TO public
  USING (
    (status = 'published'::text)
  );

-- 3) "Authors can manage their own updates" (ALL) -- sin cambios (ownership puro)
DROP POLICY IF EXISTS "Authors can manage their own updates" ON public.updates;
CREATE POLICY "Authors can manage their own updates" ON public.updates AS PERMISSIVE FOR ALL TO public
  USING (
    (author_id = auth.uid())
  );

-- 4) "Superadmins can do everything with updates" (ALL) -- sin cambios (JWT-based)
DROP POLICY IF EXISTS "Superadmins can do everything with updates" ON public.updates;
CREATE POLICY "Superadmins can do everything with updates" ON public.updates AS PERMISSIVE FOR ALL TO public
  USING (
    ((auth.jwt() ->> 'role'::text) = 'superadmin'::text)
  );

-- ######################## public.user_roles (verdict OK) ########################
-- ============================================================
-- RLS aditiva (superset) para public.user_roles
-- Helper public.user_can_access_client(integer) se asume YA creado.
-- ============================================================

-- 1) Managers can manage user_roles (ALL) -- sin pertenencia a cliente: identica
DROP POLICY IF EXISTS "Managers can manage user_roles" ON public.user_roles;
CREATE POLICY "Managers can manage user_roles" ON public.user_roles AS PERMISSIVE FOR ALL TO public
  USING (user_has_permission('roles.manage'::text))
  WITH CHECK (user_has_permission('roles.manage'::text));

-- 2) Users can view client user_roles (SELECT) -- pertenencia escalar -> helper
DROP POLICY IF EXISTS "Users can view client user_roles" ON public.user_roles;
CREATE POLICY "Users can view client user_roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = user_roles.user_id
        AND public.user_can_access_client(u.client_id)
    )
  );

-- 3) Users can view own roles (SELECT) -- ownership puro: identica
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = user_roles.user_id
        AND u.auth_id = auth.uid()
    )
  );

-- ######################## public.vehicle_checklist_comments (verdict OK) ########################
-- =====================================================================
-- Migracion aditiva (superset estricto) de policies de
-- public.vehicle_checklist_comments para usar el helper central
-- public.user_can_access_client(integer). El helper se asume YA creado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- SELECT
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "vehicle_checklist_comments_select_policy" ON public.vehicle_checklist_comments;
CREATE POLICY "vehicle_checklist_comments_select_policy" ON public.vehicle_checklist_comments
  AS PERMISSIVE FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.vehicle_checklist vc
        JOIN public.vehicles v ON v.id = vc.vehicle_id
      WHERE vc.id = vehicle_checklist_comments.vehicle_checklist_id
        AND public.user_can_access_client(v.client_id)
    )
  );

-- ---------------------------------------------------------------------
-- INSERT
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "vehicle_checklist_comments_insert_policy" ON public.vehicle_checklist_comments;
CREATE POLICY "vehicle_checklist_comments_insert_policy" ON public.vehicle_checklist_comments
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.vehicle_checklist vc
        JOIN public.vehicles v ON v.id = vc.vehicle_id
      WHERE vc.id = vehicle_checklist_comments.vehicle_checklist_id
        AND public.user_can_access_client(v.client_id)
    )
  );

-- ---------------------------------------------------------------------
-- DELETE  (conserva rama de ownership y el filtro de rol admin/superadmin)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "vehicle_checklist_comments_delete_policy" ON public.vehicle_checklist_comments;
CREATE POLICY "vehicle_checklist_comments_delete_policy" ON public.vehicle_checklist_comments
  AS PERMISSIVE FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.vehicle_checklist vc
        JOIN public.vehicles v ON v.id = vc.vehicle_id
        JOIN public.users u ON u.auth_id = auth.uid()
      WHERE vc.id = vehicle_checklist_comments.vehicle_checklist_id
        AND (
          u.id = vehicle_checklist_comments.user_id
          OR (
            (u.rol)::text = ANY (ARRAY['admin'::text, 'superadmin'::text])
            AND public.user_can_access_client(v.client_id)
          )
        )
    )
  );

-- ######################## public.vehicle_fines (verdict FIX) ########################
-- =====================================================================
-- vehicle_fines: reescritura ADITIVA de policies usando helper canonico
-- public.user_can_access_client(integer) (asumido ya creado).
-- NOTA: vehicles.client_id es bigint y el helper toma integer; el cast
-- bigint->integer es de assignment (no implicit) y NO resuelve el overload,
-- por eso se castea explicitamente vehicles.client_id::integer.
-- =====================================================================

-- 1) Service role full access (ALL) -- sin cambios (no hay expr de cliente)
DROP POLICY IF EXISTS "Service role full access on vehicle_fines" ON public.vehicle_fines;
CREATE POLICY "Service role full access on vehicle_fines" ON public.vehicle_fines
  AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));

-- 2) Users can insert fines for their client vehicles (INSERT)
DROP POLICY IF EXISTS "Users can insert fines for their client vehicles" ON public.vehicle_fines;
CREATE POLICY "Users can insert fines for their client vehicles" ON public.vehicle_fines
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    vehicle_id IN (
      SELECT vehicles.id
      FROM vehicles
      WHERE public.user_can_access_client(vehicles.client_id::integer)
    )
  );

-- 3) Users can view fines of their client vehicles (SELECT)
DROP POLICY IF EXISTS "Users can view fines of their client vehicles" ON public.vehicle_fines;
CREATE POLICY "Users can view fines of their client vehicles" ON public.vehicle_fines
  AS PERMISSIVE FOR SELECT TO public
  USING (
    vehicle_id IN (
      SELECT vehicles.id
      FROM vehicles
      WHERE public.user_can_access_client(vehicles.client_id::integer)
    )
  );

-- ######################## public.vehicle_requests (verdict OK) ########################
DROP POLICY IF EXISTS "Users see own client requests" ON public.vehicle_requests;
CREATE POLICY "Users see own client requests" ON public.vehicle_requests AS PERMISSIVE FOR ALL TO public
  USING (public.user_can_access_client(client_id));

-- ######################## public.vehicles_sales_trade_ins (verdict OK) ########################
-- ============================================================
-- Tabla: public.vehicles_sales_trade_ins
-- Reescritura aditiva (superset) de las 4 policies.
-- Helper public.user_can_access_client(integer) asumido ya creado.
-- Todas las policies tienen la MISMA forma 3 (JOIN): el client objetivo
-- viene de vehicles_sales vs JOIN vehicles v via vs.id = vehicle_sale_id.
-- ============================================================

-- SELECT
DROP POLICY IF EXISTS "Users can view trade-ins for their sales" ON public.vehicles_sales_trade_ins;
CREATE POLICY "Users can view trade-ins for their sales" ON public.vehicles_sales_trade_ins
  AS PERMISSIVE FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM vehicles_sales vs
        JOIN vehicles v ON (v.id = vs.vehicle_id)
      WHERE vs.id = vehicles_sales_trade_ins.vehicle_sale_id
        AND public.user_can_access_client(v.client_id)
    )
  );

-- INSERT
DROP POLICY IF EXISTS "Users can insert trade-ins for their sales" ON public.vehicles_sales_trade_ins;
CREATE POLICY "Users can insert trade-ins for their sales" ON public.vehicles_sales_trade_ins
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM vehicles_sales vs
        JOIN vehicles v ON (v.id = vs.vehicle_id)
      WHERE vs.id = vehicles_sales_trade_ins.vehicle_sale_id
        AND public.user_can_access_client(v.client_id)
    )
  );

-- UPDATE
DROP POLICY IF EXISTS "Users can update trade-ins for their sales" ON public.vehicles_sales_trade_ins;
CREATE POLICY "Users can update trade-ins for their sales" ON public.vehicles_sales_trade_ins
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM vehicles_sales vs
        JOIN vehicles v ON (v.id = vs.vehicle_id)
      WHERE vs.id = vehicles_sales_trade_ins.vehicle_sale_id
        AND public.user_can_access_client(v.client_id)
    )
  );

-- DELETE
DROP POLICY IF EXISTS "Users can delete trade-ins for their sales" ON public.vehicles_sales_trade_ins;
CREATE POLICY "Users can delete trade-ins for their sales" ON public.vehicles_sales_trade_ins
  AS PERMISSIVE FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1
      FROM vehicles_sales vs
        JOIN vehicles v ON (v.id = vs.vehicle_id)
      WHERE vs.id = vehicles_sales_trade_ins.vehicle_sale_id
        AND public.user_can_access_client(v.client_id)
    )
  );

-- ######################## public.whatsapp_notification_log (verdict OK) ########################
DROP POLICY IF EXISTS "Users can view their notification logs" ON public.whatsapp_notification_log;
CREATE POLICY "Users can view their notification logs" ON public.whatsapp_notification_log AS PERMISSIVE FOR SELECT TO public
  USING (public.user_can_access_client(client_id));
