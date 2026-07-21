-- Migration: Add DeLorean brand and models (global)

-- First, insert DeLorean brand if it doesn't exist
INSERT INTO brands (id, name)
SELECT gen_random_uuid(), 'DeLorean'
WHERE NOT EXISTS (
  SELECT 1 FROM brands WHERE LOWER(name) = 'delorean'
);

-- Get the brand ID and insert all models
DO $$
DECLARE
  delorean_id TEXT;
BEGIN
  SELECT id::text INTO delorean_id FROM brands WHERE LOWER(name) = 'delorean';

  IF delorean_id IS NULL THEN
    RAISE EXCEPTION 'DeLorean brand not found';
  END IF;

  -- DMC-12 (the original classic)
  INSERT INTO models (name, brand_id) SELECT 'DMC-12', delorean_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = delorean_id AND LOWER(name) = 'dmc-12');

  -- Alpha5 (2024+ EV revival)
  INSERT INTO models (name, brand_id) SELECT 'Alpha5', delorean_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = delorean_id AND LOWER(name) = 'alpha5');

  RAISE NOTICE 'DeLorean brand and models added successfully';
END $$;
