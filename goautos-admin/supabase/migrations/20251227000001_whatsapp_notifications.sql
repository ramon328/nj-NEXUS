-- ============================================================================
-- WHATSAPP NOTIFICATIONS - Simple notification system
-- ============================================================================
-- Cada tenant puede recibir notificaciones de leads, contactos, etc. por WhatsApp
-- Usando la cuenta de Kapso de GoAuto
-- ============================================================================

-- Agregar columna para numero de WhatsApp de notificaciones en clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'notification_whatsapp'
  ) THEN
    ALTER TABLE clients ADD COLUMN notification_whatsapp TEXT;
    COMMENT ON COLUMN clients.notification_whatsapp IS 'Numero de WhatsApp para recibir notificaciones (formato E.164: +56912345678)';
  END IF;
END $$;

-- Agregar columna para configuracion de notificaciones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'whatsapp_notifications_enabled'
  ) THEN
    ALTER TABLE clients ADD COLUMN whatsapp_notifications_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Agregar columna para configurar que notificaciones recibir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'whatsapp_notification_settings'
  ) THEN
    ALTER TABLE clients ADD COLUMN whatsapp_notification_settings JSONB DEFAULT '{
      "new_lead": true,
      "new_contact": true,
      "instagram_message": true,
      "vehicle_inquiry": true,
      "financing_request": true,
      "test_drive_request": true
    }'::jsonb;
  END IF;
END $$;

-- ============================================================================
-- TABLA: whatsapp_notification_log
-- Historial de notificaciones enviadas
-- ============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Tipo de notificacion
  notification_type TEXT NOT NULL,  -- 'new_lead', 'instagram_message', etc.

  -- Datos de la notificacion
  recipient_phone TEXT NOT NULL,
  message_content TEXT NOT NULL,

  -- Referencia al objeto que disparo la notificacion
  reference_type TEXT,  -- 'lead', 'customer', 'instagram_message', etc.
  reference_id TEXT,    -- ID del objeto

  -- Estado
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message TEXT,
  external_message_id TEXT,  -- ID del mensaje en WhatsApp/Kapso

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_log_client ON whatsapp_notification_log(client_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON whatsapp_notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON whatsapp_notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON whatsapp_notification_log(created_at DESC);

-- RLS
ALTER TABLE whatsapp_notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notification logs" ON whatsapp_notification_log;
CREATE POLICY "Users can view their notification logs" ON whatsapp_notification_log
  FOR SELECT USING (
    client_id IN (
      SELECT client_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Permisos para service role
GRANT ALL ON whatsapp_notification_log TO service_role;

-- ============================================================================
-- TABLA: whatsapp_notification_queue
-- Cola de notificaciones pendientes de enviar
-- ============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Tipo de notificacion
  notification_type TEXT NOT NULL,  -- 'new_lead', 'instagram_message', etc.

  -- Datos para construir el mensaje
  notification_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Estado
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_message TEXT,
  attempts INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_pending ON whatsapp_notification_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_client ON whatsapp_notification_queue(client_id);

-- RLS para notification_queue
ALTER TABLE whatsapp_notification_queue ENABLE ROW LEVEL SECURITY;

GRANT ALL ON whatsapp_notification_queue TO service_role;

-- ============================================================================
-- FUNCION: queue_whatsapp_notification
-- Funcion para agregar una notificacion a la cola
-- Puede ser llamada desde triggers o directamente
-- ============================================================================
CREATE OR REPLACE FUNCTION queue_whatsapp_notification(
  p_client_id INTEGER,
  p_notification_type TEXT,
  p_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_notifications_enabled BOOLEAN;
  v_notification_settings JSONB;
BEGIN
  -- Verificar si el cliente tiene notificaciones habilitadas
  SELECT
    whatsapp_notifications_enabled,
    whatsapp_notification_settings
  INTO
    v_notifications_enabled,
    v_notification_settings
  FROM clients
  WHERE id = p_client_id;

  -- Si no estan habilitadas, no hacer nada
  IF NOT COALESCE(v_notifications_enabled, false) THEN
    RETURN NULL;
  END IF;

  -- Verificar si este tipo de notificacion esta habilitado
  IF v_notification_settings IS NOT NULL
     AND (v_notification_settings->>p_notification_type)::boolean = false THEN
    RETURN NULL;
  END IF;

  -- Insertar en la cola
  INSERT INTO whatsapp_notification_queue (
    client_id,
    notification_type,
    notification_data
  ) VALUES (
    p_client_id,
    p_notification_type,
    p_data
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Notificar cuando se crea un nuevo lead
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_new_lead() RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_customer_email TEXT;
BEGIN
  -- Obtener datos del cliente asociado al lead
  IF NEW.customer_id IS NOT NULL THEN
    SELECT
      COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''),
      phone,
      email
    INTO
      v_customer_name,
      v_customer_phone,
      v_customer_email
    FROM customers
    WHERE id = NEW.customer_id;
  END IF;

  -- Encolar notificacion
  PERFORM queue_whatsapp_notification(
    NEW.client_id,
    'new_lead',
    jsonb_build_object(
      'name', COALESCE(v_customer_name, 'Sin nombre'),
      'phone', v_customer_phone,
      'email', v_customer_email,
      'source', NEW.type,
      'referenceType', 'lead',
      'referenceId', NEW.id::text
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_lead ON leads;
CREATE TRIGGER trigger_notify_new_lead
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

-- ============================================================================
-- TRIGGER: Notificar cuando se crea un nuevo customer
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_new_customer() RETURNS TRIGGER AS $$
BEGIN
  -- Encolar notificacion
  PERFORM queue_whatsapp_notification(
    NEW.client_id,
    'new_contact',
    jsonb_build_object(
      'name', COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''),
      'phone', NEW.phone,
      'email', NEW.email,
      'rut', NEW.rut,
      'referenceType', 'customer',
      'referenceId', NEW.id::text
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_customer ON customers;
CREATE TRIGGER trigger_notify_new_customer
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_customer();

-- ============================================================================
-- ALTERNATIVA: Llamar Edge Function directamente con pg_net
-- (Solo si pg_net está habilitado en tu proyecto Supabase)
-- ============================================================================

-- Habilitar pg_net si no está habilitado
-- CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Función para enviar notificación inmediatamente via HTTP
CREATE OR REPLACE FUNCTION send_notification_immediately()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_client_phone TEXT;
  v_client_enabled BOOLEAN;
BEGIN
  -- Obtener configuración del cliente
  SELECT
    notification_whatsapp,
    whatsapp_notifications_enabled
  INTO
    v_client_phone,
    v_client_enabled
  FROM clients
  WHERE id = NEW.client_id;

  -- Solo proceder si hay teléfono configurado y notificaciones habilitadas
  IF v_client_phone IS NOT NULL AND COALESCE(v_client_enabled, false) THEN
    -- La notificación ya está en la cola, el procesador la enviará
    -- Este trigger es solo para logging/debugging
    RAISE NOTICE 'Notification queued for client %', NEW.client_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger opcional para logging
DROP TRIGGER IF EXISTS trigger_log_notification ON whatsapp_notification_queue;
CREATE TRIGGER trigger_log_notification
  AFTER INSERT ON whatsapp_notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION send_notification_immediately();
