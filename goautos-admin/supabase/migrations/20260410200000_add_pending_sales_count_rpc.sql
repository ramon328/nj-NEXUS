-- RPC: get_pending_sales_count
-- Returns count of pending (unapproved) sales for active vehicles only.
-- Replaces 3 separate queries (vehicles + approved sales + pending count)
-- with a single database call.

CREATE OR REPLACE FUNCTION get_pending_sales_count(p_client_id bigint)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT coalesce(count(*)::int, 0)
  FROM vehicles_sales vs
  JOIN vehicles v ON v.id = vs.vehicle_id
  JOIN clients_vehicles_states cvs ON cvs.id = v.status_id
  WHERE v.client_id = p_client_id
    AND vs.status = 'pending'
    AND lower(cvs.name) NOT SIMILAR TO '%(vendido|sold|reservado|archivado)%'
    AND NOT EXISTS (
      SELECT 1 FROM vehicles_sales vs2
      WHERE vs2.vehicle_id = v.id AND vs2.status = 'approved'
    );
$$;
