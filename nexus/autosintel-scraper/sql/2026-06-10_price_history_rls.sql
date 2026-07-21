-- Autos Intel — migración 2026-06-10 (b): asegurar price_history.
--
-- Problema detectado: price_history tenía RLS DESACTIVADO y el rol anon conserva
-- los grants por defecto (INSERT/UPDATE/DELETE/TRUNCATE) => cualquiera con la
-- anon key pública podía escribir o vaciar la tabla. Esta migración la deja
-- igual que `listings`: lectura para anon, escritura solo service_role.
--
-- El scraper escribe con SUPABASE_SERVICE_KEY (service_role) => no se ve afectado.
-- Idempotente.

begin;

alter table public.price_history enable row level security;

drop policy if exists anon_read_price_history on public.price_history;
create policy anon_read_price_history
  on public.price_history for select
  using (true);

drop policy if exists service_write_price_history on public.price_history;
create policy service_write_price_history
  on public.price_history for all
  to service_role
  using (true) with check (true);

-- Realtime: el hook usePriceDrops se refresca al INSERT de price_history.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'price_history'
  ) then
    alter publication supabase_realtime add table public.price_history;
  end if;
end$$;

commit;
