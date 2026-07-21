-- Migration: Add commission splits table
-- This migration adds support for splitting commissions between multiple people

-- Create the commission splits table
CREATE TABLE IF NOT EXISTS sale_commission_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id INTEGER NOT NULL REFERENCES vehicles_sales(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  split_type TEXT NOT NULL CHECK (split_type IN ('percentage', 'amount')),
  percentage DECIMAL(5,2),          -- Used if split_type = 'percentage'
  amount DECIMAL(12,2) NOT NULL,    -- Calculated amount (always populated)
  notes TEXT,                       -- Optional notes (e.g., "Client acquisition")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_commission_splits_sale_id ON sale_commission_splits(sale_id);
CREATE INDEX IF NOT EXISTS idx_commission_splits_user_id ON sale_commission_splits(user_id);

-- Enable RLS
ALTER TABLE sale_commission_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view commission splits for sales in their client
CREATE POLICY "Users can view commission splits for their client's sales"
  ON sale_commission_splits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles_sales vs
      JOIN vehicles v ON vs.vehicle_id = v.id
      JOIN users u ON u.client_id = v.client_id
      WHERE vs.id = sale_commission_splits.sale_id
      AND u.auth_id = auth.uid()
    )
  );

-- Users can insert commission splits for sales in their client
CREATE POLICY "Users can insert commission splits for their client's sales"
  ON sale_commission_splits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles_sales vs
      JOIN vehicles v ON vs.vehicle_id = v.id
      JOIN users u ON u.client_id = v.client_id
      WHERE vs.id = sale_commission_splits.sale_id
      AND u.auth_id = auth.uid()
    )
  );

-- Users can update commission splits for sales in their client
CREATE POLICY "Users can update commission splits for their client's sales"
  ON sale_commission_splits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM vehicles_sales vs
      JOIN vehicles v ON vs.vehicle_id = v.id
      JOIN users u ON u.client_id = v.client_id
      WHERE vs.id = sale_commission_splits.sale_id
      AND u.auth_id = auth.uid()
    )
  );

-- Users can delete commission splits for sales in their client
CREATE POLICY "Users can delete commission splits for their client's sales"
  ON sale_commission_splits
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM vehicles_sales vs
      JOIN vehicles v ON vs.vehicle_id = v.id
      JOIN users u ON u.client_id = v.client_id
      WHERE vs.id = sale_commission_splits.sale_id
      AND u.auth_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_commission_splits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_commission_splits_updated_at
  BEFORE UPDATE ON sale_commission_splits
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_splits_updated_at();

-- Add comment
COMMENT ON TABLE sale_commission_splits IS 'Stores commission splits for sales between multiple users';
