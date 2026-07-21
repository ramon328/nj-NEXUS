-- ============================================================
-- Setup: apartado "Información de Proyectos"
-- Carpetas (Aliace, Mallorcautos, HN, Impomin, ACE, Food Expert)
-- con subida de archivos vía Supabase Storage.
--
-- Acceso RESTRINGIDO a Nicolás y Ramón:
--   njuri@dropout.cl  /  ramon@dropout.cl
--
-- Ejecutar en el SQL Editor de Supabase (proyecto Forja:
-- https://ydcpsihovvaefyobnhws.supabase.co)
-- ============================================================

-- 1) Bucket privado donde se guardan los archivos.
--    Los archivos se organizan por carpeta: '<folder.key>/<archivo>'.
insert into storage.buckets (id, name, public)
values ('project-info', 'project-info', false)
on conflict (id) do nothing;

-- 2) Políticas de acceso: solo Nico y Ramón pueden
--    listar, subir, descargar y eliminar archivos del bucket.

drop policy if exists "project_info_read" on storage.objects;
create policy "project_info_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-info'
    and (auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl')
  );

drop policy if exists "project_info_insert" on storage.objects;
create policy "project_info_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-info'
    and (auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl')
  );

drop policy if exists "project_info_update" on storage.objects;
create policy "project_info_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-info'
    and (auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl')
  )
  with check (
    bucket_id = 'project-info'
    and (auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl')
  );

drop policy if exists "project_info_delete" on storage.objects;
create policy "project_info_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-info'
    and (auth.jwt() ->> 'email') in ('njuri@dropout.cl', 'ramon@dropout.cl')
  );
