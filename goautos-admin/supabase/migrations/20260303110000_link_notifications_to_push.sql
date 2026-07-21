-- ============================================================================
-- Link in-app notifications with push notification system
-- Every create_notification() now also queues a push notification
-- Push queue now supports targeting by user_id and role
-- ============================================================================

-- 1) Add targeting columns to push_notification_queue
ALTER TABLE push_notification_queue
  ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_role TEXT;

-- 2) Update queue_push_notification() to accept targeting params
CREATE OR REPLACE FUNCTION queue_push_notification(
  p_client_id BIGINT,
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_icon TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_target_user_id UUID DEFAULT NULL,
  p_target_role TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_has_subscriptions BOOLEAN;
BEGIN
  -- Check if there are active push subscriptions for this client
  -- If targeting a specific user, check that user has subscriptions
  IF p_target_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM push_subscriptions
      WHERE client_id = p_client_id
        AND user_auth_id = p_target_user_id
        AND is_active = true
    ) INTO v_has_subscriptions;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM push_subscriptions
      WHERE client_id = p_client_id AND is_active = true
    ) INTO v_has_subscriptions;
  END IF;

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
    data,
    target_user_id,
    target_role
  ) VALUES (
    p_client_id,
    p_notification_type,
    p_title,
    p_body,
    p_icon,
    p_url,
    p_data,
    p_target_user_id,
    p_target_role
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Update create_notification() to also queue push
CREATE OR REPLACE FUNCTION create_notification(
  p_client_id INTEGER,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_icon TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_target_user_id UUID DEFAULT NULL,
  p_target_role TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Insert in-app notification
  INSERT INTO notifications (client_id, type, title, body, icon, url, data, target_user_id, target_role, created_by)
  VALUES (p_client_id, p_type, p_title, p_body, p_icon, p_url, p_data, p_target_user_id, p_target_role, p_created_by)
  RETURNING id INTO v_notification_id;

  -- Also queue a push notification (function checks for active subscriptions)
  PERFORM queue_push_notification(
    p_client_id,
    p_type,
    p_title,
    p_body,
    p_icon,
    p_url,
    p_data,
    p_target_user_id,
    p_target_role
  );

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Add in-app notification for new leads (complements existing push-only trigger)
CREATE OR REPLACE FUNCTION notify_new_lead() RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    SELECT COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
    INTO v_customer_name
    FROM customers
    WHERE id = NEW.customer_id;
  END IF;

  -- In-app notification for admins (leads are managed by admins/jefes)
  INSERT INTO notifications (client_id, type, title, body, icon, url, data, target_role, created_by)
  VALUES (
    NEW.client_id,
    'new_lead',
    'Nuevo lead',
    COALESCE(NULLIF(TRIM(v_customer_name), ''), 'Sin nombre') || ' — ' || COALESCE(NEW.type, 'web'),
    'mail-plus',
    '/leads',
    jsonb_build_object('lead_id', NEW.id::text, 'source', NEW.type),
    NULL,  -- all roles see new leads
    NULL
  );

  -- Note: push is already handled by push_notify_new_lead trigger
  -- (we don't call create_notification here to avoid double push)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_lead
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

-- 5) Update existing push_notify_new_lead to use targeting
-- (keeps the separate push trigger for leads since it pre-dates this system)
CREATE OR REPLACE FUNCTION push_notify_new_lead() RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
BEGIN
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
    jsonb_build_object('leadId', NEW.id::text, 'source', NEW.type),
    NULL,  -- all users
    NULL   -- all roles
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6) Auto-process push queue via pg_net when items are inserted
-- Calls the edge function immediately so pushes arrive in real-time
-- ============================================================================
CREATE OR REPLACE FUNCTION process_push_queue_via_edge() RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Get Supabase URL and service role key from vault or config
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- Fallback to environment-based URL if setting not available
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://miuiujntdjrjhhcysiba.supabase.co';
  END IF;

  -- Use pg_net to call the edge function asynchronously (non-blocking)
  IF v_service_role_key IS NOT NULL AND v_service_role_key != '' THEN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-push-notification',
      body := '{"processQueue": true}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  -- If pg_net is not available or call fails, silently continue
  -- Push will be processed on next manual/cron invocation
  WHEN OTHERS THEN
    RAISE WARNING 'push queue auto-process failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if pg_net extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    DROP TRIGGER IF EXISTS trigger_process_push_queue ON push_notification_queue;
    CREATE TRIGGER trigger_process_push_queue
      AFTER INSERT ON push_notification_queue
      FOR EACH ROW
      EXECUTE FUNCTION process_push_queue_via_edge();
  END IF;
END;
$$;
