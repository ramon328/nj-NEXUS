-- Autos Intel — migración 2026-06-10
-- Soporte para: (a) archivar avisos desde el dashboard, (b) detección de vendidos.
--
-- Contexto validado contra la estructura existente:
--   * listings.status es enum public.listing_status = {active, sold, removed, stale}
--     => 'sold' YA existe, no se requiere ALTER TYPE para la detección de vendidos.
--   * RLS está activo en public.listings con políticas:
--       anon_read_listings     (SELECT, todos)
--       service_write_listings (ALL, solo service_role)
--     => el frontend (anon key) NO puede hacer UPDATE directo. Por eso el
--        archivado se expone vía un RPC SECURITY DEFINER acotado SOLO al flag
--        `archived`, en vez de abrir un UPDATE amplio para anon.
--
-- Idempotente: se puede correr más de una vez sin error.

begin;

-- 1) Columna de archivado (flag separado del status; un auto puede estar
--    vendido y/o archivado de forma independiente).
alter table public.listings
  add column if not exists archived boolean not null default false;

-- 2) Índice para filtrar rápido las vistas (dashboard excluye archived,
--    la vista Archivo filtra archived = true).
create index if not exists idx_listings_archived
  on public.listings (archived);

create index if not exists idx_listings_status_archived
  on public.listings (status, archived);

-- 3) RPC acotado para archivar/desarchivar desde el cliente (anon/authenticated).
--    SECURITY DEFINER => corre con privilegios del dueño y solo toca `archived`,
--    sin permitir modificar precio/estado/otros campos.
create or replace function public.set_listing_archived(p_id uuid, p_archived boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings
     set archived = p_archived
   where id = p_id;
$$;

revoke all on function public.set_listing_archived(uuid, boolean) from public;
grant execute on function public.set_listing_archived(uuid, boolean) to anon, authenticated;

commit;
