-- ============================================================
-- RLS para forja_permissions
--
-- Esta tabla controla a qué apps tiene acceso cada usuario. Sin
-- RLS, cualquier usuario autenticado podría leer los permisos de
-- todos o —peor— concederse acceso a sí mismo a apps que no le
-- corresponden (el frontend escribe directo con la anon key, así
-- que la única barrera real es RLS).
--
-- Modelo:
--   • SELECT  → cada usuario ve SOLO sus permisos; los admins ven
--               los de todos (usePermissions lee los propios;
--               UsersManager y agentTools leen los de varios).
--   • INSERT / UPDATE / DELETE → solo administradores (conceder o
--               revocar accesos es exclusivo de admins).
--
-- Reutiliza el helper public.is_forja_admin() definido en
-- setup_hidden_apps.sql (SECURITY DEFINER, evita recursión de RLS).
--
-- Ejecutar en el SQL Editor de Supabase (proyecto Forja:
-- https://ydcpsihovvaefyobnhws.supabase.co)
-- ============================================================

alter table public.forja_permissions enable row level security;

-- Lectura: el usuario ve lo suyo; el admin ve todo.
drop policy if exists "permissions_select" on public.forja_permissions;
create policy "permissions_select" on public.forja_permissions
  for select to authenticated
  using (user_id = auth.uid() or public.is_forja_admin());

-- Alta: solo administradores conceden accesos.
drop policy if exists "permissions_admin_insert" on public.forja_permissions;
create policy "permissions_admin_insert" on public.forja_permissions
  for insert to authenticated
  with check (public.is_forja_admin());

-- Edición: solo administradores.
drop policy if exists "permissions_admin_update" on public.forja_permissions;
create policy "permissions_admin_update" on public.forja_permissions
  for update to authenticated
  using (public.is_forja_admin())
  with check (public.is_forja_admin());

-- Baja: solo administradores revocan accesos.
drop policy if exists "permissions_admin_delete" on public.forja_permissions;
create policy "permissions_admin_delete" on public.forja_permissions
  for delete to authenticated
  using (public.is_forja_admin());

-- ============================================================
-- Verificación rápida (opcional):
--   • Como usuario normal: el select debe devolver SOLO sus filas.
--   • Como admin: debe devolver las de todos.
-- ============================================================
-- select user_id, app_id from public.forja_permissions order by user_id;
