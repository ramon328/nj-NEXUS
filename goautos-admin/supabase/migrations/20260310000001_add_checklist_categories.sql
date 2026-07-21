-- =============================================
-- AGREGAR CATEGORÍAS Y ROLES AL CHECKLIST
-- =============================================

-- Agregar columna category a client_checklist_items
ALTER TABLE client_checklist_items
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

-- Agregar columna assigned_role_id (referencia a roles del cliente)
ALTER TABLE client_checklist_items
  ADD COLUMN IF NOT EXISTS assigned_role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;

-- Índice para filtrar por categoría
CREATE INDEX IF NOT EXISTS idx_client_checklist_items_category
  ON client_checklist_items(client_id, category);

-- Comentarios
COMMENT ON COLUMN client_checklist_items.category IS 'Categoría del item (operativo, venta, documentacion, etc.)';
COMMENT ON COLUMN client_checklist_items.assigned_role_id IS 'Rol asignado para completar este item';

-- =============================================
-- Actualizar items existentes con categorías por defecto
-- =============================================
UPDATE client_checklist_items SET category = 'operativo'
  WHERE item_key IN ('maintenance', 'spare_parts', 'tires', 'keys', 'safety_kit', 'cleaning')
  AND category = 'general';

UPDATE client_checklist_items SET category = 'documentacion'
  WHERE item_key IN ('documentation')
  AND category = 'general';

UPDATE client_checklist_items SET category = 'venta'
  WHERE item_key IN ('photos')
  AND category = 'general';

-- =============================================
-- Actualizar función de items por defecto
-- =============================================
CREATE OR REPLACE FUNCTION create_default_checklist_items(p_client_id INTEGER)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM client_checklist_items WHERE client_id = p_client_id LIMIT 1) THEN
    INSERT INTO client_checklist_items (client_id, item_key, item_label, display_order, category)
    VALUES
      (p_client_id, 'maintenance', 'Mantenimiento realizado', 1, 'operativo'),
      (p_client_id, 'spare_parts', 'Repuestos verificados', 2, 'operativo'),
      (p_client_id, 'tires', 'Neumáticos revisados', 3, 'operativo'),
      (p_client_id, 'keys', 'Llaves completas', 4, 'operativo'),
      (p_client_id, 'safety_kit', 'Kit de seguridad', 5, 'operativo'),
      (p_client_id, 'cleaning', 'Limpieza realizada', 6, 'operativo'),
      (p_client_id, 'documentation', 'Documentación completa', 7, 'documentacion'),
      (p_client_id, 'photos', 'Fotos tomadas', 8, 'venta')
    ON CONFLICT (client_id, item_key) DO NOTHING;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating default checklist items for client %: %', p_client_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
