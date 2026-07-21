-- ============================================================
-- Setup: Calendario de "Avance de Proyectos"
-- Reemplaza el tablero Kanban por un calendario semanal
-- (lunes a domingo × franjas horarias) con tarjetas por día.
--
-- Ejecutar en el SQL Editor de Supabase (proyecto Forja:
-- https://ydcpsihovvaefyobnhws.supabase.co)
-- ============================================================

-- 1) Elimina el sistema anterior de tarjetas Kanban (tareas/avances por columna).
--    Los PROYECTOS (forja_projects) se conservan como catálogo para asignar a
--    las tarjetas del calendario.
drop table if exists forja_cards cascade;

-- 2) Color por proyecto (para pintar sus tarjetas en el calendario).
alter table forja_projects add column if not exists color text default '#00d4ff';

-- 3) Tarjetas del calendario: cada una vive en una celda (día + franja horaria)
--    y pertenece (opcionalmente) a un proyecto.
create table if not exists forja_calendar_cards (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references forja_projects(id) on delete cascade,
  day_index   int  not null,          -- 0=lunes ... 6=domingo
  slot_index  int  not null,          -- índice de la franja horaria (ver ProjectCalendar.jsx)
  title       text not null,
  description text default '',
  color       text default '#00d4ff',
  position    int  default 0,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

alter table forja_calendar_cards enable row level security;

-- Solo Nicolás y Ramón tienen acceso (igual que el resto del apartado).
drop policy if exists "ramon_calendar_cards" on forja_calendar_cards;
create policy "ramon_calendar_cards" on forja_calendar_cards
  for all to authenticated
  using ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'))
  with check ((auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl'));

-- ------------------------------------------------------------
-- OPCIONAL: si además quieres empezar con el catálogo de
-- proyectos vacío (borrar los 13 proyectos sembrados), descomenta:
--
--   delete from forja_projects;
--
-- (No es necesario: puedes gestionar los proyectos desde el botón
--  "Proyectos" dentro del apartado.)
-- ------------------------------------------------------------
