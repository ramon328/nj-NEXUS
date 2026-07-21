-- Fix RLS on sale_commission_splits to allow superadmin access
-- The original policies (20260107100000) joined users by client_id only
-- (JOIN users u ON u.client_id = v.client_id), which excludes superadmins
-- (client_id = NULL). A superadmin assigning a seller commission from a
-- vehicle therefore hit: "new row violates row-level security policy for
-- table sale_commission_splits". Same pattern already fixed for
-- vehicles_sales_trade_ins (20260411000000) and client_custom_pages
-- (20260523120000): add an OR u.rol = 'superadmin' branch.

DROP POLICY IF EXISTS "Users can view commission splits for their client's sales" ON sale_commission_splits;
DROP POLICY IF EXISTS "Users can insert commission splits for their client's sales" ON sale_commission_splits;
DROP POLICY IF EXISTS "Users can update commission splits for their client's sales" ON sale_commission_splits;
DROP POLICY IF EXISTS "Users can delete commission splits for their client's sales" ON sale_commission_splits;

CREATE POLICY "Users can view commission splits for their client's sales"
  ON sale_commission_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR u.client_id IN (
          SELECT v.client_id FROM vehicles_sales vs
          JOIN vehicles v ON v.id = vs.vehicle_id
          WHERE vs.id = sale_commission_splits.sale_id
        )
      )
    )
  );

CREATE POLICY "Users can insert commission splits for their client's sales"
  ON sale_commission_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR u.client_id IN (
          SELECT v.client_id FROM vehicles_sales vs
          JOIN vehicles v ON v.id = vs.vehicle_id
          WHERE vs.id = sale_commission_splits.sale_id
        )
      )
    )
  );

CREATE POLICY "Users can update commission splits for their client's sales"
  ON sale_commission_splits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR u.client_id IN (
          SELECT v.client_id FROM vehicles_sales vs
          JOIN vehicles v ON v.id = vs.vehicle_id
          WHERE vs.id = sale_commission_splits.sale_id
        )
      )
    )
  );

CREATE POLICY "Users can delete commission splits for their client's sales"
  ON sale_commission_splits FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR u.client_id IN (
          SELECT v.client_id FROM vehicles_sales vs
          JOIN vehicles v ON v.id = vs.vehicle_id
          WHERE vs.id = sale_commission_splits.sale_id
        )
      )
    )
  );
