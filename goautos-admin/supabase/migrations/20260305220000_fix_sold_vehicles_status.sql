-- =============================================
-- Fix: Mover vehículos con venta registrada al estado "Vendido"
-- Problema: Algunos vehículos tienen venta pero quedaron en su estado original
-- porque updateVehicleStatus falló silenciosamente
-- =============================================

-- Actualizar el status_id de vehículos que tienen una venta (approved o pending)
-- pero no están en el estado "Vendido"
UPDATE vehicles v
SET status_id = sold_state.id,
    updated_at = NOW()
FROM vehicles_sales vs,
     clients_vehicles_states sold_state
WHERE vs.vehicle_id = v.id
  AND vs.status IN ('approved', 'pending')
  AND sold_state.client_id = v.client_id
  AND sold_state.name ILIKE '%vendido%'
  AND v.status_id IS DISTINCT FROM sold_state.id;

-- Fallback: Para clientes que no tienen un estado "Vendido" por nombre,
-- usar el estado con el order más alto
UPDATE vehicles v
SET status_id = (
    SELECT cvs.id
    FROM clients_vehicles_states cvs
    WHERE cvs.client_id = v.client_id
    ORDER BY cvs."order" DESC
    LIMIT 1
  ),
  updated_at = NOW()
FROM vehicles_sales vs
WHERE vs.vehicle_id = v.id
  AND vs.status IN ('approved', 'pending')
  AND NOT EXISTS (
    SELECT 1 FROM clients_vehicles_states cvs
    WHERE cvs.client_id = v.client_id
      AND cvs.name ILIKE '%vendido%'
  )
  AND v.status_id IS DISTINCT FROM (
    SELECT cvs2.id
    FROM clients_vehicles_states cvs2
    WHERE cvs2.client_id = v.client_id
    ORDER BY cvs2."order" DESC
    LIMIT 1
  );
