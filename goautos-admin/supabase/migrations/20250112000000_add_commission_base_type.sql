-- Add commission_base_type column to vehicles_sales table
-- This column stores whether commission is calculated on 'total' (sale price) or 'margin' (sale price - acquisition cost)
ALTER TABLE vehicles_sales
ADD COLUMN commission_base_type TEXT DEFAULT 'total' CHECK (commission_base_type IN ('total', 'margin'));

-- Add comment to explain the column
COMMENT ON COLUMN vehicles_sales.commission_base_type IS 'Defines the base for commission calculation: "total" for sale price, "margin" for (sale price - acquisition cost)';
