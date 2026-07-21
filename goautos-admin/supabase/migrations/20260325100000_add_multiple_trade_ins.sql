-- Junction table for multiple trade-in vehicles per sale
CREATE TABLE IF NOT EXISTS vehicles_sales_trade_ins (
  id SERIAL PRIMARY KEY,
  vehicle_sale_id INTEGER NOT NULL REFERENCES vehicles_sales(id) ON DELETE CASCADE,
  trade_in_vehicle_id INTEGER REFERENCES vehicles(id),
  license_plate TEXT NOT NULL,
  brand_name TEXT,
  model_name TEXT,
  year INTEGER,
  trade_in_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vsti_vehicle_sale_id ON vehicles_sales_trade_ins(vehicle_sale_id);

-- RLS
ALTER TABLE vehicles_sales_trade_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trade-ins for their sales"
  ON vehicles_sales_trade_ins FOR SELECT
  USING (
    vehicle_sale_id IN (
      SELECT vs.id FROM vehicles_sales vs
      JOIN vehicles v ON v.id = vs.vehicle_id
      WHERE v.client_id IN (
        SELECT client_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert trade-ins for their sales"
  ON vehicles_sales_trade_ins FOR INSERT
  WITH CHECK (
    vehicle_sale_id IN (
      SELECT vs.id FROM vehicles_sales vs
      JOIN vehicles v ON v.id = vs.vehicle_id
      WHERE v.client_id IN (
        SELECT client_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update trade-ins for their sales"
  ON vehicles_sales_trade_ins FOR UPDATE
  USING (
    vehicle_sale_id IN (
      SELECT vs.id FROM vehicles_sales vs
      JOIN vehicles v ON v.id = vs.vehicle_id
      WHERE v.client_id IN (
        SELECT client_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete trade-ins for their sales"
  ON vehicles_sales_trade_ins FOR DELETE
  USING (
    vehicle_sale_id IN (
      SELECT vs.id FROM vehicles_sales vs
      JOIN vehicles v ON v.id = vs.vehicle_id
      WHERE v.client_id IN (
        SELECT client_id FROM users WHERE auth_id = auth.uid()
      )
    )
  );
