-- ============================================================
-- Notifications System + Vehicle Requests
-- ============================================================

-- 1) In-app notifications (persistent, role-aware)
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,  -- 'vehicle_request', 'fast_sale_restock', 'sale_completed', 'lead_assigned', 'general'
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  icon            TEXT,           -- lucide icon name or emoji
  url             TEXT,           -- in-app route to navigate on click
  data            JSONB DEFAULT '{}'::jsonb,

  -- Targeting: NULL = all users of client, specific user_id = targeted
  target_user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Role targeting: NULL = all roles, or specific role
  target_role     TEXT,           -- 'admin', 'jefe', 'seller', NULL=all

  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Per-user read/dismiss tracking
CREATE TABLE notification_reads (
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (notification_id, user_id)
);

-- 3) Vehicle requests board
CREATE TABLE vehicle_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- What they're looking for
  brand_name      TEXT,
  model_name      TEXT,
  year_min        INTEGER,
  year_max        INTEGER,
  budget_min      NUMERIC,
  budget_max      NUMERIC,
  notes           TEXT,

  -- Who's asking
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  customer_email  TEXT,

  -- Status tracking
  status          TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fulfilled', 'expired', 'cancelled')),
  assigned_to     UUID REFERENCES auth.users(id),
  fulfilled_vehicle_id INTEGER REFERENCES vehicles(id),

  -- Metadata
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_notifications_client ON notifications(client_id);
CREATE INDEX idx_notifications_target_user ON notifications(target_user_id);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notification_reads_user ON notification_reads(user_id);
CREATE INDEX idx_vehicle_requests_client ON vehicle_requests(client_id);
CREATE INDEX idx_vehicle_requests_status ON vehicle_requests(status);
CREATE INDEX idx_vehicle_requests_assigned ON vehicle_requests(assigned_to);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_requests ENABLE ROW LEVEL SECURITY;

-- Users can see notifications for their client that target them or their role or everyone
CREATE POLICY "Users see own client notifications" ON notifications
  FOR SELECT USING (
    client_id IN (SELECT client_id FROM users WHERE auth_id = auth.uid())
    AND (
      target_user_id IS NULL
      OR target_user_id = auth.uid()
    )
    AND (
      target_role IS NULL
      OR target_role = (SELECT rol FROM users WHERE auth_id = auth.uid())
    )
  );

-- Users can insert notifications for their own client
CREATE POLICY "Users create notifications for own client" ON notifications
  FOR INSERT WITH CHECK (
    client_id IN (SELECT client_id FROM users WHERE auth_id = auth.uid())
  );

-- Users manage their own reads
CREATE POLICY "Users manage own reads" ON notification_reads
  FOR ALL USING (user_id = auth.uid());

-- Users see/manage vehicle requests for their own client
CREATE POLICY "Users see own client requests" ON vehicle_requests
  FOR ALL USING (
    client_id IN (SELECT client_id FROM users WHERE auth_id = auth.uid())
  );

-- ============================================================
-- Helper function to create notification
-- ============================================================
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
  INSERT INTO notifications (client_id, type, title, body, icon, url, data, target_user_id, target_role, created_by)
  VALUES (p_client_id, p_type, p_title, p_body, p_icon, p_url, p_data, p_target_user_id, p_target_role, p_created_by)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Trigger: Notify sellers when a vehicle request is created
-- ============================================================
CREATE OR REPLACE FUNCTION notify_vehicle_request() RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.client_id,
    'vehicle_request',
    'Nueva solicitud de vehículo',
    'Cliente busca: ' || COALESCE(NEW.brand_name, '') || ' ' || COALESCE(NEW.model_name, '') ||
    CASE WHEN NEW.year_min IS NOT NULL THEN ' (' || NEW.year_min || '-' || COALESCE(NEW.year_max::TEXT, '...') || ')' ELSE '' END,
    'search',
    '/solicitudes',
    jsonb_build_object('request_id', NEW.id, 'customer_name', NEW.customer_name),
    NULL,
    'seller',
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_vehicle_request
  AFTER INSERT ON vehicle_requests
  FOR EACH ROW EXECUTE FUNCTION notify_vehicle_request();

-- ============================================================
-- Trigger: Fast-sale restock alert (vehicle sold in <30 days)
-- ============================================================
CREATE OR REPLACE FUNCTION alert_fast_sale_restock() RETURNS TRIGGER AS $$
DECLARE
  v_days_in_stock INTEGER;
  v_brand TEXT;
  v_model TEXT;
  v_year INTEGER;
  v_vendido_name TEXT;
BEGIN
  SELECT name INTO v_vendido_name
  FROM clients_vehicles_states
  WHERE id = NEW.status_id AND client_id = NEW.client_id;

  IF v_vendido_name IS DISTINCT FROM 'Vendido' THEN
    RETURN NEW;
  END IF;

  v_days_in_stock := EXTRACT(DAY FROM (NOW() - NEW.created_at));

  IF v_days_in_stock <= 30 THEN
    SELECT b.name, m.name, NEW.year
    INTO v_brand, v_model, v_year
    FROM brands b
    LEFT JOIN models m ON m.id = NEW.model_id
    WHERE b.id = NEW.brand_id;

    PERFORM create_notification(
      NEW.client_id,
      'fast_sale_restock',
      'Venta rápida — buscar reemplazo',
      COALESCE(v_brand, '') || ' ' || COALESCE(v_model, '') || ' ' || COALESCE(v_year::TEXT, '') ||
      ' se vendió en ' || v_days_in_stock || ' días. Busca uno similar.',
      'zap',
      '/vehiculos/' || NEW.id,
      jsonb_build_object('vehicle_id', NEW.id, 'days_in_stock', v_days_in_stock, 'brand', v_brand, 'model', v_model),
      NULL,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_alert_fast_sale_restock
  AFTER UPDATE OF status_id ON vehicles
  FOR EACH ROW
  WHEN (OLD.status_id IS DISTINCT FROM NEW.status_id)
  EXECUTE FUNCTION alert_fast_sale_restock();

-- ============================================================
-- Trigger: Notify when a sale is completed
-- ============================================================
CREATE OR REPLACE FUNCTION notify_sale_completed() RETURNS TRIGGER AS $$
DECLARE
  v_brand TEXT;
  v_model TEXT;
  v_seller TEXT;
BEGIN
  SELECT b.name, m.name INTO v_brand, v_model
  FROM vehicles v
  JOIN brands b ON b.id = v.brand_id
  LEFT JOIN models m ON m.id = v.model_id
  WHERE v.id = NEW.vehicle_id;

  SELECT first_name || ' ' || last_name INTO v_seller
  FROM users WHERE auth_id = NEW.seller_id;

  PERFORM create_notification(
    NEW.client_id,
    'sale_completed',
    'Venta registrada',
    COALESCE(v_seller, 'Un vendedor') || ' vendió ' || COALESCE(v_brand, '') || ' ' || COALESCE(v_model, ''),
    'check-circle',
    '/ventas',
    jsonb_build_object('sale_id', NEW.id, 'vehicle_id', NEW.vehicle_id),
    NULL, NULL, NEW.seller_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_sale_completed
  AFTER INSERT ON vehicles_sales
  FOR EACH ROW EXECUTE FUNCTION notify_sale_completed();

-- ============================================================
-- Enable realtime for notifications
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
