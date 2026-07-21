-- ============================================================
-- Limpieza puntual: eliminar por completo a alejandro@impomin.cl
--
-- Este usuario se borró del front ANTES del arreglo, así que su
-- perfil/permisos pudieron quedar y, sobre todo, su cuenta sigue
-- viva en auth.users (por eso el correo aparece "ya registrado").
--
-- Ejecutar UNA vez en el SQL Editor de Supabase (proyecto Forja:
-- https://ydcpsihovvaefyobnhws.supabase.co)
-- ============================================================

-- 1) Permisos del usuario (por id, vía auth.users o forja_profiles)
delete from public.forja_permissions
where user_id in (
  select id from auth.users        where lower(email) = 'alejandro@impomin.cl'
  union
  select id from public.forja_profiles where lower(email) = 'alejandro@impomin.cl'
);

-- 2) Perfil en Forja
delete from public.forja_profiles
where lower(email) = 'alejandro@impomin.cl';

-- 3) Cuenta de autenticación (libera el correo para recrearlo)
delete from auth.users
where lower(email) = 'alejandro@impomin.cl';

-- 4) Verificación: las tres consultas deben devolver 0 filas
select 'auth.users'       as tabla, count(*) from auth.users        where lower(email) = 'alejandro@impomin.cl'
union all
select 'forja_profiles'   as tabla, count(*) from public.forja_profiles where lower(email) = 'alejandro@impomin.cl';
