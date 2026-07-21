-- ============================================================================
-- RLS para que la app Forja (apartado "Chat") LEA las conversaciones de cobranza
-- pero SOLO los admins (Nico y Ramón). Correr en el MISMO Supabase del Hub/Forja
-- (proyecto ydcpsihovvaefyobnhws) → SQL Editor.
--
-- Forja se autentica en este mismo proyecto, así que auth.uid() = id del usuario
-- en forja_profiles. Se permite SELECT solo si ese perfil es admin.
-- (La escritura la hace el Hub con service_role, que SALTA RLS — no necesita política.)
-- ============================================================================

drop policy if exists cob_conv_admin_read on cobranza_conversaciones;
create policy cob_conv_admin_read on cobranza_conversaciones
  for select to authenticated
  using (exists (
    select 1 from forja_profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or lower(p.email) in ('njuri@dropout.cl', 'ramon@dropout.cl'))
  ));

drop policy if exists cob_msg_admin_read on cobranza_mensajes;
create policy cob_msg_admin_read on cobranza_mensajes
  for select to authenticated
  using (exists (
    select 1 from forja_profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or lower(p.email) in ('njuri@dropout.cl', 'ramon@dropout.cl'))
  ));
