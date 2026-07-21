-- ============================================================
-- Tarjetas de apps ocultables por los administradores (global).
--
-- Permite a Nico y Ramón esconder tarjetas del hub para TODOS
-- los usuarios. Los admins las siguen viendo (atenuadas) y las
-- gestionan desde el panel Admin → pestaña "Apps".
--
-- Ejecutar en el SQL Editor de Supabase (proyecto Forja:
-- https://ydcpsihovvaefyobnhws.supabase.co)
-- ============================================================

-- Helper: ¿el usuario actual es admin de Forja?
-- SECURITY DEFINER para evitar recursión de RLS al leer forja_profiles.
create or replace function public.is_forja_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.forja_profiles
      where id = auth.uid() and role = 'admin'
    )
    or coalesce(
      lower(auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'),
      false
    );
$$;

-- Tabla: una fila por cada app oculta (la presencia = oculta).
create table if not exists public.forja_hidden_apps (
  app_id    text primary key,
  hidden_by uuid,
  hidden_at timestamptz default now()
);

alter table public.forja_hidden_apps enable row level security;

-- Todos los autenticados pueden LEER (el hub filtra con esto).
drop policy if exists "hidden_apps_select" on public.forja_hidden_apps;
create policy "hidden_apps_select" on public.forja_hidden_apps
  for select to authenticated using (true);

-- Solo administradores pueden ocultar / mostrar.
drop policy if exists "hidden_apps_admin_write" on public.forja_hidden_apps;
create policy "hidden_apps_admin_write" on public.forja_hidden_apps
  for all to authenticated
  using (public.is_forja_admin())
  with check (public.is_forja_admin());
