-- ============================================================
-- Setup: Tablero de proyecto (estilo Jira)
-- Un PROYECTO (forja_projects) tiene su propio tablero de tareas
-- en 3 columnas (todo / doing / done). Como un proyecto puede estar
-- en varios días del calendario, todas sus tarjetas comparten este
-- mismo tablero. Por eso project_id apunta a forja_projects.
--
-- Instalación desde cero: correr setup_project_calendar.sql y luego
-- este archivo. Si vienes de una versión anterior donde el tablero
-- apuntaba a las tarjetas del calendario, corre además
-- setup_shared_projects.sql (migra los datos y reapunta la FK).
--
-- Ejecutar en el SQL Editor de Supabase (proyecto Forja).
-- ============================================================

create table if not exists forja_project_tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references forja_projects(id) on delete cascade,
  column_key  text not null default 'todo',   -- 'todo' | 'doing' | 'done'
  title       text not null,
  description text default '',
  position    int  default 0,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

alter table forja_project_tasks enable row level security;

-- Solo Nicolás y Ramón (igual que el resto del apartado).
drop policy if exists "ramon_project_tasks" on forja_project_tasks;
create policy "ramon_project_tasks" on forja_project_tasks
  for all to authenticated
  using ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'))
  with check ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'));
