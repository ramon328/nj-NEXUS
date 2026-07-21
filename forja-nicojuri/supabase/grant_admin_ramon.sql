-- Dar a ramon@dropout.cl el mismo rol que njuri@dropout.cl (admin).
-- Ejecutar en el SQL Editor del dashboard de Supabase (proyecto ydcpsihovvaefyobnhws).

-- 1. Rol admin en el perfil (crea el perfil si no existe)
insert into forja_profiles (id, name, email, role)
select u.id, coalesce(u.raw_user_meta_data->>'name', 'Ramón'), u.email, 'admin'
from auth.users u
where u.email = 'ramon@dropout.cl'
on conflict (id) do update set role = 'admin';

-- 2. Copiar los permisos por app que tenga njuri a ramon (por si algún flujo los lee directamente)
insert into forja_permissions (user_id, app_id, aliace_filters)
select r.id, p.app_id, p.aliace_filters
from forja_permissions p
join auth.users n on n.id = p.user_id and n.email = 'njuri@dropout.cl'
cross join (select id from auth.users where email = 'ramon@dropout.cl') r
on conflict do nothing;

-- Verificación
select pr.email, pr.role, pe.app_id
from forja_profiles pr
left join forja_permissions pe on pe.user_id = pr.id
where pr.email in ('njuri@dropout.cl', 'ramon@dropout.cl')
order by pr.email;
