-- Versiona en el repo dos funciones que YA existen en producción pero cuya
-- definición (CREATE FUNCTION) nunca se versionó (drift). Solo se las llamaba:
--   * restore_vehicle_status() se invoca desde
--     20260502120000_allow_revert_approved_sale.sql, pero nunca se definía.
--   * get_published_status_id() es dependencia de la anterior y tampoco estaba
--     en ninguna migración (get_sold_status_id sí está en 20260305240000).
--
-- Ambas son CREATE OR REPLACE idénticas a lo que hoy corre en prod, así que
-- aplicar esta migración a producción NO cambia nada; su único objetivo es que
-- un rebuild limpio (CI / ambiente nuevo / db reset) reconstruya el flujo de
-- "devolver venta -> el vehículo vuelve a Publicado" sin que falten funciones.

-- Resuelve el id del estado "Publicado" del cliente (con fallback al primer
-- estado del pipeline si no existe uno llamado "publicado").
CREATE OR REPLACE FUNCTION public.get_published_status_id(p_client_id bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_id BIGINT;
BEGIN
  SELECT id INTO v_id FROM clients_vehicles_states
  WHERE client_id = p_client_id AND name ILIKE '%publicado%'
  ORDER BY "order" ASC LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- Fallback: primer estado del pipeline
  SELECT id INTO v_id FROM clients_vehicles_states
  WHERE client_id = p_client_id
  ORDER BY "order" ASC LIMIT 1;

  RETURN v_id;
END;
$function$;

-- Cuando se devuelve/rechaza una venta, mueve el vehículo de "Vendido" a
-- "Publicado". Solo actúa si el vehículo está actualmente en "Vendido".
CREATE OR REPLACE FUNCTION public.restore_vehicle_status(p_vehicle_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_client_id    BIGINT;
  v_published_id BIGINT;
  v_sold_id      BIGINT;
  v_current_id   BIGINT;
BEGIN
  SELECT client_id, status_id INTO v_client_id, v_current_id
  FROM vehicles WHERE id = p_vehicle_id;
  IF v_client_id IS NULL THEN RETURN; END IF;

  v_sold_id := get_sold_status_id(v_client_id);

  -- Solo restaurar si el vehículo está actualmente en "Vendido"
  IF v_sold_id IS NOT NULL AND v_current_id = v_sold_id THEN
    v_published_id := get_published_status_id(v_client_id);
    IF v_published_id IS NOT NULL THEN
      UPDATE vehicles
      SET status_id = v_published_id, updated_at = NOW()
      WHERE id = p_vehicle_id;
    END IF;
  END IF;
END;
$function$;
