-- Add financiera column to vehicles_sales
-- Stores the financial institution when payment_method is 'credit'
ALTER TABLE vehicles_sales
ADD COLUMN IF NOT EXISTS financiera TEXT;
