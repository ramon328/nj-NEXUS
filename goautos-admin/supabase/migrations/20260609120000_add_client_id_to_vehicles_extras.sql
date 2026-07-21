-- Agrega client_id a vehicles_extras para poder cargar "gastos puntuales del mes"
-- no atribuibles a un vehículo (vehicle_id NULL) sin mezclar tenants.
--
-- Migración ADITIVA: solo agrega una columna opcional + FK + índice.
-- No borra ni modifica filas existentes. El código en producción no usa esta
-- columna, así que no rompe nada de lo actual. Los gastos puntuales nuevos se
-- insertan vía useUnattributedExpenses con client_id + type='expense'.

ALTER TABLE public.vehicles_extras
  ADD COLUMN IF NOT EXISTS client_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_extras_client_id_fkey'
  ) THEN
    ALTER TABLE public.vehicles_extras
      ADD CONSTRAINT vehicles_extras_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vehicles_extras_client_id
  ON public.vehicles_extras (client_id);
