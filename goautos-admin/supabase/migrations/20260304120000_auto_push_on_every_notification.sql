-- ============================================================
-- Auto-queue push for EVERY notification
-- ============================================================
-- Problem: only notifications created via create_notification()
-- get queued for push. Notifications inserted directly (from
-- frontend code, or some triggers) are missing push delivery.
--
-- Solution: trigger on `notifications` INSERT that automatically
-- calls queue_push_notification(). Then remove redundant queue
-- calls from create_notification() and the standalone lead trigger.
-- ============================================================

-- 1) Trigger function: auto-queue push for every new notification
CREATE OR REPLACE FUNCTION auto_queue_push_on_notification() RETURNS TRIGGER AS $$
BEGIN
  PERFORM queue_push_notification(
    NEW.client_id,
    NEW.type,
    NEW.title,
    NEW.body,
    NEW.icon,
    NEW.url,
    COALESCE(NEW.data, '{}'::jsonb),
    NEW.target_user_id,
    NEW.target_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_queue_push ON notifications;
CREATE TRIGGER trigger_auto_queue_push
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION auto_queue_push_on_notification();

-- 2) Simplify create_notification() — remove the manual queue call
--    (the trigger above now handles it automatically)
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
  -- Push is auto-queued by trigger_auto_queue_push
  INSERT INTO notifications (client_id, type, title, body, icon, url, data, target_user_id, target_role, created_by)
  VALUES (p_client_id, p_type, p_title, p_body, p_icon, p_url, p_data, p_target_user_id, p_target_role, p_created_by)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Drop the standalone push trigger for leads
--    (was only needed because notify_new_lead() didn't go through create_notification)
--    Now: notify_new_lead → INSERT notifications → trigger_auto_queue_push → push
DROP TRIGGER IF EXISTS trigger_push_notify_new_lead ON leads;
