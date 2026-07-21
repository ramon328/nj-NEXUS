-- Fix RLS de lead_activity_log: contemplar al superadmin (client_id NULL).
--
-- La policy original (client_id IN (SELECT client_id FROM users WHERE auth_id=auth.uid()))
-- devolvía 0 filas para superadmins (client_id NULL) que ven una marca por tenant-override,
-- así el historial salía vacío para ellos. Se alinea con el patrón estándar del proyecto
-- (ej. calendar_events): match por client_id O rol='superadmin'.

DROP POLICY IF EXISTS lead_activity_log_select_own ON public.lead_activity_log;
CREATE POLICY lead_activity_log_select_own ON public.lead_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND (u.client_id = lead_activity_log.client_id OR u.rol = 'superadmin')
    )
  );
