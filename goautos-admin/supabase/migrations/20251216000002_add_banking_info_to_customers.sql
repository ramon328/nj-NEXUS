-- Migration: Add banking information to customers table
-- This allows storing bank account details for consignors and customers

-- Add banking information columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS account_holder_rut VARCHAR(20);

-- Add constraint to validate account_type values
ALTER TABLE customers
ADD CONSTRAINT customers_account_type_check
CHECK (account_type IS NULL OR account_type IN ('corriente', 'ahorro', 'vista', 'rut'));

-- Add comments to explain the columns
COMMENT ON COLUMN customers.bank_name IS 'Name of the bank where the customer has an account';
COMMENT ON COLUMN customers.account_type IS 'Type of bank account: corriente (checking), ahorro (savings), vista (sight), rut (RUT account)';
COMMENT ON COLUMN customers.account_number IS 'Bank account number';
COMMENT ON COLUMN customers.account_holder_name IS 'Name of the account holder (may differ from customer name)';
COMMENT ON COLUMN customers.account_holder_rut IS 'RUT of the account holder';
