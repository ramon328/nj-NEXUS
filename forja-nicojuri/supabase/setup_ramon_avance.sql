-- ============================================================
-- Setup: apartado "Ramón · Calendario / Avance"
-- Ejecutar en el SQL Editor de Supabase (proyecto Forja:
-- https://ydcpsihovvaefyobnhws.supabase.co)
-- ============================================================

-- Proyectos del tablero de avance
create table if not exists forja_projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- Tarjetas (estilo Trello) de cada proyecto
create table if not exists forja_cards (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references forja_projects(id) on delete cascade,
  column_key  text not null default 'todo',   -- 'todo' | 'doing' | 'done'
  title       text not null,
  description text default '',
  position    int default 0,
  created_at  timestamptz default now()
);

alter table forja_projects enable row level security;
alter table forja_cards    enable row level security;

-- Solo Nicolás y Ramón Molina tienen acceso al apartado
drop policy if exists "ramon_avance_projects" on forja_projects;
create policy "ramon_avance_projects" on forja_projects
  for all to authenticated
  using ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'))
  with check ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'));

drop policy if exists "ramon_avance_cards" on forja_cards;
create policy "ramon_avance_cards" on forja_cards
  for all to authenticated
  using ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'))
  with check ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'));

-- ============================================================
-- Permitir que cada usuario lea y edite SU propio perfil
-- (necesario para que las cuentas creadas por Nicolás puedan
-- cambiar su nombre desde "Mi Cuenta")
-- ============================================================
drop policy if exists "own_profile_select" on forja_profiles;
create policy "own_profile_select" on forja_profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists "own_profile_update" on forja_profiles;
create policy "own_profile_update" on forja_profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
