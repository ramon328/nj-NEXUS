-- Hardening de las funciones de estado vendido/publicado.
--
-- A DIFERENCIA de 20260628000000 (que es un no-op idéntico a prod), esta
-- migración SÍ cambia producción de forma deliberada para cerrar 2 hallazgos
-- de auditoría:
--
-- 1) IDOR vía RPC (seguridad): restore_vehicle_status() y get_published_status_id()
--    son SECURITY DEFINER y tenían EXECUTE para PUBLIC/anon/authenticated, por lo
--    que PostgREST las exponía como RPC anónima (p.ej. /rpc/restore_vehicle_status?
--    p_vehicle_id=N). Al correr con privilegios del owner evaden RLS, permitiendo
--    mover CUALQUIER vehículo de CUALQUIER automotora de "Vendido" a "Publicado"
--    iterando ids (cross-tenant). Se revoca el EXECUTE a los roles públicos.
--    SEGURO: el trigger trg_sale_status_changed (SECURITY DEFINER, owner postgres)
--    las sigue llamando vía PERFORM sin necesitar el grant directo; service_role
--    (edge functions) conserva el acceso; y el frontend NO las llama por RPC
--    (verificado: la única invocación es interna desde el trigger).
--
-- 2) Drift del trigger protect_sold_vehicle_status: la definición versionada
--    (20260305250000) filtraba status IN ('approved','pending','completed'), pero
--    PROD usa IN ('approved','completed'). Se versiona la definición REAL de prod
--    para que un rebuild limpio reproduzca el comportamiento actual y calce con el
--    guard del frontend (src/hooks/vehicle/useStatusUpdate.ts).
--
-- Además se fija search_path en las tres funciones (defensa ante shadowing, ya
-- que referencian tablas sin esquema).

-- 1) Revocar EXECUTE público de las funciones expuestas como RPC.
REVOKE EXECUTE ON FUNCTION public.restore_vehicle_status(bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_published_status_id(bigint) FROM PUBLIC, anon, authenticated;

-- 2) Fijar search_path en las funciones helper.
ALTER FUNCTION public.restore_vehicle_status(bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_published_status_id(bigint) SET search_path = public, pg_temp;

-- 3) Versionar la definición REAL de prod del trigger (mata el drift de 'pending')
--    y de paso fijar su search_path.
CREATE OR REPLACE FUNCTION public.protect_sold_vehicle_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_has_confirmed_sale BOOLEAN;
  v_sold_id BIGINT;
BEGIN
  -- Solo actuar si status_id está cambiando
  IF NEW.status_id IS NOT DISTINCT FROM OLD.status_id THEN
    RETURN NEW;
  END IF;

  -- Verificar si tiene venta CONFIRMADA (no pending, no rejected)
  SELECT EXISTS(
    SELECT 1 FROM vehicles_sales
    WHERE vehicle_id = NEW.id
      AND status IN ('approved', 'completed')
  ) INTO v_has_confirmed_sale;

  IF NOT v_has_confirmed_sale THEN
    RETURN NEW; -- Sin venta confirmada, permitir cambio libre
  END IF;

  -- Tiene venta confirmada: forzar a Vendido
  v_sold_id := get_sold_status_id(NEW.client_id);

  IF v_sold_id IS NOT NULL THEN
    NEW.status_id := v_sold_id;
  END IF;

  RETURN NEW;
END;
$function$;
