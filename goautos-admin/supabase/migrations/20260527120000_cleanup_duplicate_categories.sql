-- Clean up duplicate categories and add missing ones
-- Issue: some categories were inserted multiple times or manually added with inconsistent names

-- 1. Add "Clásico" category if it doesn't exist
INSERT INTO categories (name)
SELECT 'Clásico'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = 'clásico');

-- 2. Add "Coupe" (without accent) variant if only "Coupé" exists
-- Some vehicles may have been assigned "Coupe" manually; ensure consistency
INSERT INTO categories (name)
SELECT 'Coupe'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = 'coupe')
  AND NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = 'coupé');

-- 3. Deduplicate: if both "Coupe" and "Coupé" exist, merge vehicles to "Coupé" and remove "Coupe"
DO $$
DECLARE
  v_coupe_id INT;
  v_coupé_id INT;
BEGIN
  SELECT id INTO v_coupé_id FROM categories WHERE name = 'Coupé' LIMIT 1;
  SELECT id INTO v_coupe_id FROM categories WHERE name = 'Coupe' LIMIT 1;

  IF v_coupé_id IS NOT NULL AND v_coupe_id IS NOT NULL AND v_coupé_id != v_coupe_id THEN
    UPDATE vehicles SET category_id = v_coupé_id WHERE category_id = v_coupe_id;
    UPDATE meli_post SET category_id = v_coupé_id WHERE category_id = v_coupe_id;
    DELETE FROM categories WHERE id = v_coupe_id;
  END IF;
END $$;

-- 4. Remove exact duplicate categories (same name, keep lowest id)
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT LOWER(name) AS lname, MIN(id) AS keep_id
    FROM categories
    GROUP BY LOWER(name)
    HAVING COUNT(*) > 1
  LOOP
    UPDATE vehicles
    SET category_id = dup.keep_id
    WHERE category_id IN (
      SELECT id FROM categories
      WHERE LOWER(name) = dup.lname AND id != dup.keep_id
    );

    UPDATE meli_post
    SET category_id = dup.keep_id
    WHERE category_id IN (
      SELECT id FROM categories
      WHERE LOWER(name) = dup.lname AND id != dup.keep_id
    );

    DELETE FROM categories
    WHERE LOWER(name) = dup.lname AND id != dup.keep_id;
  END LOOP;
END $$;
