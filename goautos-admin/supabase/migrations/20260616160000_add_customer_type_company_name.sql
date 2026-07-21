-- Migration: Add customer type (person/company) and company name to customers
-- Allows registering business customers (empresa) with razón social + RUT,
-- in addition to natural persons (first_name + last_name).
-- Additive + safe: existing rows default to 'person', so current behaviour
-- (natural-person customers) is unchanged.

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) NOT NULL DEFAULT 'person',
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- Validate customer_type values (idempotent: only add if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_customer_type_check'
  ) THEN
    ALTER TABLE customers
    ADD CONSTRAINT customers_customer_type_check
    CHECK (customer_type IN ('person', 'company'));
  END IF;
END $$;

COMMENT ON COLUMN customers.customer_type IS 'Type of customer: person (natural person) or company (empresa / persona jurídica)';
COMMENT ON COLUMN customers.company_name IS 'Razón social — legal name of the company (used when customer_type = company)';
