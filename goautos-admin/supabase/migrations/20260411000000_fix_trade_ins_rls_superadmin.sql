-- Fix RLS on vehicles_sales_trade_ins to allow superadmin access
-- The original policies (20260325100000) only matched users by client_id,
-- which excluded superadmins (who have client_id = NULL) even when impersonating
-- a tenant. This made trade-in purchase notes invisible from the sold vehicle's
-- documents tab when accessed by a superadmin.

DROP POLICY IF EXISTS "Users can view trade-ins for their sales" ON vehicles_sales_trade_ins;
DROP POLICY IF EXISTS "Users can insert trade-ins for their sales" ON vehicles_sales_trade_ins;
DROP POLICY IF EXISTS "Users can update trade-ins for their sales" ON vehicles_sales_trade_ins;
DROP POLICY IF EXISTS "Users can delete trade-ins for their sales" ON vehicles_sales_trade_ins;

CREATE POLICY "Users can view trade-ins for their sales"
  ON vehicles_sales_trade_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR u.client_id IN (
          SELECT v.client_id FROM vehicles_sales vs
          JOIN vehicles v ON v.id = vs.vehicle_id
          WHERE vs.id = vehicles_sales_trade_ins.vehicle_sale_id
        )
      )
    )
  );

CREATE POLICY "Users can insert trade-ins for their sales"
  ON vehicles_sales_trade_ins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR u.client_id IN (
          SELECT v.client_id FROM vehicles_sales vs
          JOIN vehicles v ON v.id = vs.vehicle_id
          WHERE vs.id = vehicles_sales_trade_ins.vehicle_sale_id
        )
      )
    )
  );

CREATE POLICY "Users can update trade-ins for their sales"
  ON vehicles_sales_trade_ins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR u.client_id IN (
          SELECT v.client_id FROM vehicles_sales vs
          JOIN vehicles v ON v.id = vs.vehicle_id
          WHERE vs.id = vehicles_sales_trade_ins.vehicle_sale_id
        )
      )
    )
  );

CREATE POLICY "Users can delete trade-ins for their sales"
  ON vehicles_sales_trade_ins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR u.client_id IN (
          SELECT v.client_id FROM vehicles_sales vs
          JOIN vehicles v ON v.id = vs.vehicle_id
          WHERE vs.id = vehicles_sales_trade_ins.vehicle_sale_id
        )
      )
    )
  );
