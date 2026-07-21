-- Migration: Add Husqvarna brand and models (global)
-- Husqvarna Motorcycles - Swedish brand owned by KTM/Pierer Mobility

-- First, insert Husqvarna brand if it doesn't exist
INSERT INTO brands (id, name)
SELECT gen_random_uuid(), 'Husqvarna'
WHERE NOT EXISTS (
  SELECT 1 FROM brands WHERE LOWER(name) = 'husqvarna'
);

-- Get the brand ID and insert all models
DO $$
DECLARE
  husqvarna_id TEXT;
BEGIN
  SELECT id::text INTO husqvarna_id FROM brands WHERE LOWER(name) = 'husqvarna';

  IF husqvarna_id IS NULL THEN
    RAISE EXCEPTION 'Husqvarna brand not found';
  END IF;

  -- Motocross
  INSERT INTO models (name, brand_id) SELECT 'TC 50', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'tc 50');
  INSERT INTO models (name, brand_id) SELECT 'TC 65', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'tc 65');
  INSERT INTO models (name, brand_id) SELECT 'TC 85', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'tc 85');
  INSERT INTO models (name, brand_id) SELECT 'TC 125', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'tc 125');
  INSERT INTO models (name, brand_id) SELECT 'TC 250', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'tc 250');
  INSERT INTO models (name, brand_id) SELECT 'FC 250', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'fc 250');
  INSERT INTO models (name, brand_id) SELECT 'FC 350', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'fc 350');
  INSERT INTO models (name, brand_id) SELECT 'FC 450', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'fc 450');

  -- Enduro
  INSERT INTO models (name, brand_id) SELECT 'TE 150i', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'te 150i');
  INSERT INTO models (name, brand_id) SELECT 'TE 250i', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'te 250i');
  INSERT INTO models (name, brand_id) SELECT 'TE 300i', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'te 300i');
  INSERT INTO models (name, brand_id) SELECT 'FE 250', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'fe 250');
  INSERT INTO models (name, brand_id) SELECT 'FE 350', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'fe 350');
  INSERT INTO models (name, brand_id) SELECT 'FE 450', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'fe 450');
  INSERT INTO models (name, brand_id) SELECT 'FE 501', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'fe 501');

  -- Cross-Country
  INSERT INTO models (name, brand_id) SELECT 'FX 350', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'fx 350');
  INSERT INTO models (name, brand_id) SELECT 'FX 450', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'fx 450');
  INSERT INTO models (name, brand_id) SELECT 'TX 300i', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'tx 300i');

  -- Street / Naked
  INSERT INTO models (name, brand_id) SELECT 'Svartpilen 125', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'svartpilen 125');
  INSERT INTO models (name, brand_id) SELECT 'Svartpilen 401', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'svartpilen 401');
  INSERT INTO models (name, brand_id) SELECT 'Svartpilen 801', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'svartpilen 801');
  INSERT INTO models (name, brand_id) SELECT 'Vitpilen 125', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'vitpilen 125');
  INSERT INTO models (name, brand_id) SELECT 'Vitpilen 401', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'vitpilen 401');
  INSERT INTO models (name, brand_id) SELECT 'Vitpilen 801', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'vitpilen 801');

  -- Adventure / Travel
  INSERT INTO models (name, brand_id) SELECT 'Norden 901', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'norden 901');
  INSERT INTO models (name, brand_id) SELECT 'Norden 901 Expedition', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'norden 901 expedition');

  -- Supermoto
  INSERT INTO models (name, brand_id) SELECT 'FS 450', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'fs 450');
  INSERT INTO models (name, brand_id) SELECT '701 Supermoto', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = '701 supermoto');

  -- Dual Sport
  INSERT INTO models (name, brand_id) SELECT '701 Enduro', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = '701 enduro');
  INSERT INTO models (name, brand_id) SELECT '701 Enduro LR', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = '701 enduro lr');

  -- Electric
  INSERT INTO models (name, brand_id) SELECT 'EE 5', husqvarna_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = husqvarna_id AND LOWER(name) = 'ee 5');

  RAISE NOTICE 'Husqvarna brand and models added successfully';
END $$;
