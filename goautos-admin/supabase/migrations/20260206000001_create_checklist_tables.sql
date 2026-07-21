-- =============================================
-- SISTEMA DE CHECKLIST PARA VEHÍCULOS
-- Migración segura con manejo de errores
-- =============================================

-- =============================================
-- PASO 1: Crear tablas (IF NOT EXISTS es seguro)
-- =============================================

-- Tabla de items configurables por automotora (client)
CREATE TABLE IF NOT EXISTS client_checklist_items (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  item_key VARCHAR(50) NOT NULL,
  item_label VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, item_key)
);

-- Tabla de checklist por vehículo
CREATE TABLE IF NOT EXISTS vehicle_checklist (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES client_checklist_items(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vehicle_id, item_id)
);

-- =============================================
-- PASO 2: Crear índices (IF NOT EXISTS es seguro)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_vehicle_checklist_vehicle_id ON vehicle_checklist(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_client_checklist_items_client_id ON client_checklist_items(client_id);
CREATE INDEX IF NOT EXISTS idx_client_checklist_items_active ON client_checklist_items(client_id, is_active);

-- =============================================
-- PASO 3: Agregar comentarios descriptivos
-- =============================================

COMMENT ON TABLE client_checklist_items IS 'Items de checklist configurables por cada automotora';
COMMENT ON TABLE vehicle_checklist IS 'Estado del checklist para cada vehículo';
COMMENT ON COLUMN client_checklist_items.item_key IS 'Clave única del item dentro de la automotora';
COMMENT ON COLUMN client_checklist_items.item_label IS 'Etiqueta visible del item';
COMMENT ON COLUMN client_checklist_items.display_order IS 'Orden de visualización';
COMMENT ON COLUMN vehicle_checklist.is_completed IS 'Si el item está completado';
COMMENT ON COLUMN vehicle_checklist.completed_at IS 'Fecha de completación';
COMMENT ON COLUMN vehicle_checklist.completed_by IS 'Usuario que completó el item';
COMMENT ON COLUMN vehicle_checklist.notes IS 'Notas adicionales del item';

-- =============================================
-- PASO 4: Funciones (CREATE OR REPLACE es seguro)
-- =============================================

-- Función para crear items por defecto para un cliente
CREATE OR REPLACE FUNCTION create_default_checklist_items(p_client_id INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Solo insertar si el cliente no tiene items activos
  IF NOT EXISTS (SELECT 1 FROM client_checklist_items WHERE client_id = p_client_id LIMIT 1) THEN
    INSERT INTO client_checklist_items (client_id, item_key, item_label, display_order)
    VALUES
      (p_client_id, 'maintenance', 'Mantenimiento realizado', 1),
      (p_client_id, 'spare_parts', 'Repuestos verificados', 2),
      (p_client_id, 'tires', 'Neumáticos revisados', 3),
      (p_client_id, 'keys', 'Llaves completas', 4),
      (p_client_id, 'safety_kit', 'Kit de seguridad', 5),
      (p_client_id, 'documentation', 'Documentación completa', 6),
      (p_client_id, 'cleaning', 'Limpieza realizada', 7),
      (p_client_id, 'photos', 'Fotos tomadas', 8)
    ON CONFLICT (client_id, item_key) DO NOTHING;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error pero no fallar
    RAISE WARNING 'Error creating default checklist items for client %: %', p_client_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para inicializar checklist de un vehículo
CREATE OR REPLACE FUNCTION initialize_vehicle_checklist(p_vehicle_id INTEGER, p_client_id INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Validar parámetros
  IF p_vehicle_id IS NULL OR p_client_id IS NULL THEN
    RETURN;
  END IF;

  -- Primero asegurar que el cliente tenga items de checklist
  PERFORM create_default_checklist_items(p_client_id);

  -- Insertar items de checklist para el vehículo (solo los activos)
  INSERT INTO vehicle_checklist (vehicle_id, item_id, is_completed)
  SELECT p_vehicle_id, id, FALSE
  FROM client_checklist_items
  WHERE client_id = p_client_id AND is_active = TRUE
  ON CONFLICT (vehicle_id, item_id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error pero no fallar (no queremos bloquear creación de vehículos)
    RAISE WARNING 'Error initializing vehicle checklist for vehicle % client %: %', p_vehicle_id, p_client_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función trigger para auto-crear checklist al crear vehículo
CREATE OR REPLACE FUNCTION trigger_initialize_vehicle_checklist()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si tiene client_id válido
  IF NEW.client_id IS NOT NULL THEN
    -- Usar bloque BEGIN/EXCEPTION para no fallar el INSERT del vehículo
    BEGIN
      PERFORM initialize_vehicle_checklist(NEW.id, NEW.client_id);
    EXCEPTION
      WHEN OTHERS THEN
        -- Log pero no fallar
        RAISE WARNING 'Checklist initialization failed for vehicle %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION trigger_update_vehicle_checklist_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PASO 5: Crear triggers de forma segura
-- Nota: DROP IF EXISTS seguido de CREATE es el patrón estándar
-- para garantizar que el trigger existe con la definición correcta
-- =============================================

-- Trigger para inicializar checklist al crear vehículo
DO $$
BEGIN
  -- Eliminar trigger si existe (para poder recrearlo)
  DROP TRIGGER IF EXISTS trg_initialize_vehicle_checklist ON vehicles;

  -- Crear el trigger
  CREATE TRIGGER trg_initialize_vehicle_checklist
    AFTER INSERT ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_initialize_vehicle_checklist();

  RAISE NOTICE 'Trigger trg_initialize_vehicle_checklist creado exitosamente';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creando trigger trg_initialize_vehicle_checklist: %', SQLERRM;
END;
$$;

-- Trigger para actualizar timestamp
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_update_vehicle_checklist_timestamp ON vehicle_checklist;

  CREATE TRIGGER trg_update_vehicle_checklist_timestamp
    BEFORE UPDATE ON vehicle_checklist
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_vehicle_checklist_timestamp();

  RAISE NOTICE 'Trigger trg_update_vehicle_checklist_timestamp creado exitosamente';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creando trigger trg_update_vehicle_checklist_timestamp: %', SQLERRM;
END;
$$;

-- =============================================
-- PASO 6: Row Level Security (RLS)
-- =============================================

-- Habilitar RLS en las tablas
ALTER TABLE client_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_checklist ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PASO 6.1: Políticas para client_checklist_items
-- =============================================

-- Política SELECT: usuarios pueden ver items de su cliente
DO $$
BEGIN
  DROP POLICY IF EXISTS "client_checklist_items_select_policy" ON client_checklist_items;

  CREATE POLICY "client_checklist_items_select_policy"
    ON client_checklist_items FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id::text = auth.uid()::text
        AND (u.client_id = client_checklist_items.client_id OR u.role = 'superadmin')
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating client_checklist_items_select_policy: %', SQLERRM;
END;
$$;

-- Política INSERT: admins pueden insertar items para su cliente
DO $$
BEGIN
  DROP POLICY IF EXISTS "client_checklist_items_insert_policy" ON client_checklist_items;

  CREATE POLICY "client_checklist_items_insert_policy"
    ON client_checklist_items FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id::text = auth.uid()::text
        AND u.role IN ('admin', 'superadmin')
        AND (u.client_id = client_checklist_items.client_id OR u.role = 'superadmin')
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating client_checklist_items_insert_policy: %', SQLERRM;
END;
$$;

-- Política UPDATE: admins pueden actualizar items de su cliente
DO $$
BEGIN
  DROP POLICY IF EXISTS "client_checklist_items_update_policy" ON client_checklist_items;

  CREATE POLICY "client_checklist_items_update_policy"
    ON client_checklist_items FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id::text = auth.uid()::text
        AND u.role IN ('admin', 'superadmin')
        AND (u.client_id = client_checklist_items.client_id OR u.role = 'superadmin')
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating client_checklist_items_update_policy: %', SQLERRM;
END;
$$;

-- Política DELETE: admins pueden eliminar items de su cliente
DO $$
BEGIN
  DROP POLICY IF EXISTS "client_checklist_items_delete_policy" ON client_checklist_items;

  CREATE POLICY "client_checklist_items_delete_policy"
    ON client_checklist_items FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id::text = auth.uid()::text
        AND u.role IN ('admin', 'superadmin')
        AND (u.client_id = client_checklist_items.client_id OR u.role = 'superadmin')
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating client_checklist_items_delete_policy: %', SQLERRM;
END;
$$;

-- =============================================
-- PASO 6.2: Políticas para vehicle_checklist
-- =============================================

-- Política SELECT: usuarios pueden ver checklists de vehículos de su cliente
DO $$
BEGIN
  DROP POLICY IF EXISTS "vehicle_checklist_select_policy" ON vehicle_checklist;

  CREATE POLICY "vehicle_checklist_select_policy"
    ON vehicle_checklist FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM vehicles v
        JOIN users u ON u.client_id = v.client_id OR u.role = 'superadmin'
        WHERE v.id = vehicle_checklist.vehicle_id
        AND u.id::text = auth.uid()::text
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating vehicle_checklist_select_policy: %', SQLERRM;
END;
$$;

-- Política INSERT: sistema puede insertar (para triggers y funciones)
DO $$
BEGIN
  DROP POLICY IF EXISTS "vehicle_checklist_insert_policy" ON vehicle_checklist;

  -- Política permisiva para INSERT - el trigger necesita poder insertar
  CREATE POLICY "vehicle_checklist_insert_policy"
    ON vehicle_checklist FOR INSERT
    WITH CHECK (TRUE);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating vehicle_checklist_insert_policy: %', SQLERRM;
END;
$$;

-- Política UPDATE: usuarios pueden actualizar checklists de vehículos de su cliente
DO $$
BEGIN
  DROP POLICY IF EXISTS "vehicle_checklist_update_policy" ON vehicle_checklist;

  CREATE POLICY "vehicle_checklist_update_policy"
    ON vehicle_checklist FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM vehicles v
        JOIN users u ON u.client_id = v.client_id OR u.role = 'superadmin'
        WHERE v.id = vehicle_checklist.vehicle_id
        AND u.id::text = auth.uid()::text
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating vehicle_checklist_update_policy: %', SQLERRM;
END;
$$;

-- Política DELETE: solo superadmin puede eliminar
DO $$
BEGIN
  DROP POLICY IF EXISTS "vehicle_checklist_delete_policy" ON vehicle_checklist;

  CREATE POLICY "vehicle_checklist_delete_policy"
    ON vehicle_checklist FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id::text = auth.uid()::text
        AND u.role = 'superadmin'
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating vehicle_checklist_delete_policy: %', SQLERRM;
END;
$$;

-- =============================================
-- PASO 7: Grants para service_role (necesario para triggers)
-- =============================================

-- Permitir que el service_role bypasee RLS para operaciones del sistema
ALTER TABLE client_checklist_items FORCE ROW LEVEL SECURITY;
ALTER TABLE vehicle_checklist FORCE ROW LEVEL SECURITY;

-- Grants explícitos
GRANT ALL ON client_checklist_items TO service_role;
GRANT ALL ON vehicle_checklist TO service_role;
GRANT USAGE, SELECT ON SEQUENCE client_checklist_items_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE vehicle_checklist_id_seq TO service_role;

-- =============================================
-- FIN DE LA MIGRACIÓN
-- =============================================
