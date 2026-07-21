-- ============================================================================
-- PUSH NOTIFICATIONS - Web Push para PWA
-- ============================================================================
-- Los usuarios pueden suscribirse a push notifications desde cada dispositivo.
-- Cuando ocurre un evento (nuevo lead, etc.) se encola una notificación push
-- que luego se envía via la edge function send-push-notification.
-- ============================================================================

-- ============================================================================
-- TABLA: push_subscriptions
-- Una fila por cada dispositivo/browser suscrito
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Push subscription data (from PushSubscription.toJSON())
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_auth_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_client ON push_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_active ON push_subscriptions(client_id, is_active) WHERE is_active = true;

-- RLS: users manage their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (user_auth_id = auth.uid());

GRANT ALL ON push_subscriptions TO service_role;

-- ============================================================================
-- TABLA: push_notification_queue
-- Cola de notificaciones push pendientes de enviar
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Notification content
  notification_type TEXT NOT NULL,  -- 'new_lead', 'test', etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  url TEXT,                         -- URL to navigate on click
  data JSONB DEFAULT '{}'::jsonb,

  -- Processing state
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_message TEXT,
  attempts INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_queue_pending ON push_notification_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_push_queue_client ON push_notification_queue(client_id);

ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;

GRANT ALL ON push_notification_queue TO service_role;

-- ============================================================================
-- FUNCION: queue_push_notification
-- Inserta en la cola solo si hay suscripciones activas para ese client_id
-- ============================================================================
CREATE OR REPLACE FUNCTION queue_push_notification(
  p_client_id BIGINT,
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_icon TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_has_subscriptions BOOLEAN;
BEGIN
  -- Check if there are active push subscriptions for this client
  SELECT EXISTS (
    SELECT 1 FROM push_subscriptions
    WHERE client_id = p_client_id AND is_active = true
  ) INTO v_has_subscriptions;

  IF NOT v_has_subscriptions THEN
    RETURN NULL;
  END IF;

  INSERT INTO push_notification_queue (
    client_id,
    notification_type,
    title,
    body,
    icon,
    url,
    data
  ) VALUES (
    p_client_id,
    p_notification_type,
    p_title,
    p_body,
    p_icon,
    p_url,
    p_data
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: push_notify_new_lead
-- Encola push notification cuando se crea un lead
-- ============================================================================
CREATE OR REPLACE FUNCTION push_notify_new_lead() RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
BEGIN
  -- Get customer name if available
  IF NEW.customer_id IS NOT NULL THEN
    SELECT COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
    INTO v_customer_name
    FROM customers
    WHERE id = NEW.customer_id;
  END IF;

  PERFORM queue_push_notification(
    NEW.client_id,
    'new_lead',
    'Nuevo Lead',
    COALESCE(NULLIF(TRIM(v_customer_name), ''), 'Sin nombre') || ' — ' || COALESCE(NEW.type, 'web'),
    NULL,
    '/leads',
    jsonb_build_object(
      'leadId', NEW.id::text,
      'source', NEW.type
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_push_notify_new_lead ON leads;
CREATE TRIGGER trigger_push_notify_new_lead
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION push_notify_new_lead();
