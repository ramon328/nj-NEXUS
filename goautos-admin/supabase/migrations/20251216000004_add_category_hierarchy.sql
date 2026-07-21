-- Migration: Add hierarchy support to transaction_categories
-- This allows creating subcategories for better expense/income organization

-- Add parent_id column for hierarchy
ALTER TABLE transaction_categories
ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES transaction_categories(id);

-- Add level column to track depth in hierarchy (0 = root, 1 = child, etc.)
ALTER TABLE transaction_categories
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;

-- Add hierarchy_path for quick breadcrumb generation
ALTER TABLE transaction_categories
ADD COLUMN IF NOT EXISTS hierarchy_path TEXT;

-- Create index for parent lookups
CREATE INDEX IF NOT EXISTS idx_transaction_categories_parent
  ON transaction_categories(parent_id);

-- Create index for level-based queries
CREATE INDEX IF NOT EXISTS idx_transaction_categories_level
  ON transaction_categories(level);

-- Add comments
COMMENT ON COLUMN transaction_categories.parent_id IS 'Reference to parent category for hierarchy. NULL means root category.';
COMMENT ON COLUMN transaction_categories.level IS 'Depth level in hierarchy: 0=root, 1=subcategory, 2=sub-subcategory, etc.';
COMMENT ON COLUMN transaction_categories.hierarchy_path IS 'Full path from root to current category for breadcrumbs.';

-- Insert some example hierarchical categories (optional - can be customized)
-- These create subcategories under existing categories

-- Example: If "Reparaciones" exists, we could add subcategories
-- This is commented out as it depends on existing data
/*
INSERT INTO transaction_categories (value, label_es, label_en, type, parent_id, level, hierarchy_path, sort_order, is_active)
SELECT
  'repair_engine', 'Motor', 'Engine', 'expense', c.id, 1, c.label_es || ' > Motor', 100, true
FROM transaction_categories c
WHERE c.value = 'repairs' AND c.type = 'expense'
ON CONFLICT DO NOTHING;
*/
