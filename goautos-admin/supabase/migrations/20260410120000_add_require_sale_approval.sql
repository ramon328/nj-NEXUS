-- Add require_sale_approval column to clients table
-- When false (default): all sales are auto-approved and vehicle status changes immediately
-- When true: sales registered by sellers require admin approval before vehicle status changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'require_sale_approval'
  ) THEN
    ALTER TABLE clients ADD COLUMN require_sale_approval BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN clients.require_sale_approval IS 'When true, sales by sellers require admin approval before marking vehicle as sold';
  END IF;
END $$;
