-- ============================================================
-- Migración: proyectos DISTINTOS y COMPARTIDOS entre días.
--
-- Antes cada tarjeta del calendario era su propio proyecto/tablero.
-- Ahora un proyecto es una entidad (forja_projects) que puede estar
-- en varios días: todas sus tarjetas comparten UN tablero.
--
--   forja_projects        → proyectos (name, color) + su tablero.
--   forja_calendar_cards  → ubicaciones del proyecto en (day, slot); project_id → forja_projects.
--   forja_project_tasks   → tareas del tablero; project_id → forja_projects.
--
-- Idempotente: se puede correr más de una vez.
-- Ejecutar en el SQL Editor de Supabase (proyecto Forja).
-- ============================================================

-- 0) Color en forja_projects.
alter table forja_projects add column if not exists color text default '#00d4ff';

-- 1) Soltamos la FK de las tareas para poder remapear project_id sin conflictos.
alter table forja_project_tasks
  drop constraint if exists forja_project_tasks_project_id_fkey;

-- 2) Crea un proyecto por cada nombre distinto que ya esté en el calendario
--    (si aún no existe), tomando el color de una de sus tarjetas.
insert into forja_projects (name, color)
select distinct on (lower(btrim(cc.title))) btrim(cc.title), coalesce(cc.color, '#00d4ff')
from forja_calendar_cards cc
where cc.title is not null and btrim(cc.title) <> ''
  and not exists (select 1 from forja_projects p where lower(p.name) = lower(btrim(cc.title)))
order by lower(btrim(cc.title)), cc.created_at;

-- 3) Enlaza cada tarjeta del calendario a su proyecto (por nombre).
update forja_calendar_cards cc
set project_id = p.id
from forja_projects p
where lower(p.name) = lower(btrim(cc.title));

-- 4) Remapea las tareas del tablero: hoy project_id = id de la tarjeta;
--    lo cambiamos al id del proyecto de esa tarjeta.
update forja_project_tasks t
set project_id = cc.project_id
from forja_calendar_cards cc
where t.project_id = cc.id and cc.project_id is not null;

-- 5) Elimina tareas que no se pudieron mapear (evita violar la nueva FK).
delete from forja_project_tasks t
where not exists (select 1 from forja_projects p where p.id = t.project_id);

-- 6) FK de las tareas de vuelta a forja_projects.
alter table forja_project_tasks
  add constraint forja_project_tasks_project_id_fkey
  foreign key (project_id) references forja_projects(id) on delete cascade;
