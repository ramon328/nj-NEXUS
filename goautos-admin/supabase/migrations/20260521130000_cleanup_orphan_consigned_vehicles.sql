-- Cleanup de vehículos consignados huérfanos.
--
-- Contexto: antes del fix #803 (createConsignment/createPurchase silenciaba
-- errores) y del check de duplicado en useVehicleCreation, era posible que
-- quedaran vehicles con is_consigned=true sin row en vehicles_consignments
-- ni en vehicles_purchases. Aparecían en el listado como "consignado" pero
-- al entrar al detalle no mostraban consignante (caso reportado por QA con
-- el Opel CORSA duplicado).
--
-- Estrategia conservadora: NO borramos el vehicle (puede tener fotos, gastos,
-- timeline, etc.). Sólo normalizamos is_consigned=false para que el listado
-- deje de mentir. Si el usuario quiere recuperar la consignación, edita el
-- vehículo y vuelve a marcarlo como consignado (ahora con el flujo robusto
-- del fix #803 + el check de duplicado del useVehicleCreation).

UPDATE vehicles v
SET is_consigned = false
WHERE v.is_consigned = true
  AND NOT EXISTS (
    SELECT 1 FROM vehicles_consignments c WHERE c.vehicle_id = v.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM vehicles_purchases p WHERE p.vehicle_id = v.id
  );
