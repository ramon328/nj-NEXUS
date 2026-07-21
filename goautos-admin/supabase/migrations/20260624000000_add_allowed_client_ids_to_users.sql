-- Permite que un admin (no superadmin) acceda a un set acotado de automotoras.
-- NULL/vacio = comportamiento actual. No-op para usuarios existentes.
alter table public.users add column if not exists allowed_client_ids integer[];
comment on column public.users.allowed_client_ids is 'Lista blanca de client_id a los que este usuario admin puede cambiar (multi-automotora) sin ser superadmin. NULL/vacio = solo su client_id base.';
