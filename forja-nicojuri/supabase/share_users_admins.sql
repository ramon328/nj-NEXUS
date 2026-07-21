-- ============================================================
-- Compartir usuarios entre administradores
--
-- Problema: forja_profiles tiene RLS y la única política de
-- lectura es "own_profile_select" (auth.uid() = id), así que
-- cada cuenta solo ve SU propio perfil. Resultado: los usuarios
-- creados por njuri@dropout.cl NO aparecen para ramon@dropout.cl
-- (ni viceversa) en el panel de administración.
--
-- Solución: agregar políticas para que los administradores
-- (por email, igual que en setup_ramon_avance.sql) puedan leer,
-- actualizar, crear y borrar TODOS los perfiles. Se usa el email
-- del JWT en lugar de consultar forja_profiles dentro de su propia
-- política para evitar recursión infinita de RLS.
--
-- Ejecutar en el SQL Editor de Supabase (proyecto Forja:
-- https://ydcpsihovvaefyobnhws.supabase.co)
-- ============================================================

-- Lectura: los admins ven todos los perfiles
drop policy if exists "admin_profile_select" on forja_profiles;
create policy "admin_profile_select" on forja_profiles
  for select to authenticated
  using ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'));

-- Edición: los admins pueden actualizar cualquier perfil
drop policy if exists "admin_profile_update" on forja_profiles;
create policy "admin_profile_update" on forja_profiles
  for update to authenticated
  using ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'))
  with check ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'));

-- Alta: los admins pueden insertar perfiles (crear usuarios)
drop policy if exists "admin_profile_insert" on forja_profiles;
create policy "admin_profile_insert" on forja_profiles
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'));

-- Baja: los admins pueden borrar perfiles
drop policy if exists "admin_profile_delete" on forja_profiles;
create policy "admin_profile_delete" on forja_profiles
  for delete to authenticated
  using ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'));

-- ============================================================
-- Verificación: ejecutado como admin, debe devolver TODOS los
-- usuarios (los de njuri y los de ramon).
-- ============================================================
select email, role, created_at from forja_profiles order by created_at desc;
