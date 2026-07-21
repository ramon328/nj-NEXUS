-- ============================================================
-- Eliminación COMPLETA de usuarios desde el panel admin.
--
-- Problema: borrar solo forja_profiles / forja_permissions deja
-- la cuenta en auth.users, por lo que al recrear con el mismo
-- correo Supabase responde "User already registered".
--
-- Solución: función SECURITY DEFINER que borra perfil, permisos
-- y la cuenta de auth.users. Se ejecuta con privilegios del
-- dueño (postgres), así el frontend puede llamarla por RPC con
-- el anon key SIN exponer el service_role. Solo administradores.
--
-- Ejecutar en el SQL Editor de Supabase (proyecto Forja:
-- https://ydcpsihovvaefyobnhws.supabase.co)
-- ============================================================

create or replace function public.forja_delete_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Solo administradores de Forja pueden eliminar usuarios.
  if not exists (
    select 1 from public.forja_profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'No autorizado: solo administradores pueden eliminar usuarios';
  end if;

  -- Evitar auto-eliminación accidental.
  if target_id = auth.uid() then
    raise exception 'No puedes eliminarte a ti mismo';
  end if;

  delete from public.forja_permissions where user_id = target_id;
  delete from public.forja_profiles  where id = target_id;
  delete from auth.users             where id = target_id;
end;
$$;

-- Solo usuarios autenticados pueden invocarla (la propia función valida que sea admin).
revoke all on function public.forja_delete_user(uuid) from public;
revoke all on function public.forja_delete_user(uuid) from anon;
grant execute on function public.forja_delete_user(uuid) to authenticated;
