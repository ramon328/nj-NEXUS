-- Migration: Add McLaren brand and models (global)
-- This migration adds the McLaren brand and its comprehensive model lineup

-- First, insert McLaren brand if it doesn't exist
INSERT INTO brands (id, name)
SELECT gen_random_uuid(), 'McLaren'
WHERE NOT EXISTS (
  SELECT 1 FROM brands WHERE LOWER(name) = 'mclaren'
);

-- Get the brand ID and insert all models
DO $$
DECLARE
  mclaren_id TEXT;
BEGIN
  -- Get the McLaren brand ID (cast to text for compatibility)
  SELECT id::text INTO mclaren_id FROM brands WHERE LOWER(name) = 'mclaren';

  IF mclaren_id IS NULL THEN
    RAISE EXCEPTION 'McLaren brand not found';
  END IF;

  -- Insert models (only if they don't already exist)

  -- Current Production Models (2024-2025)
  INSERT INTO models (name, brand_id) SELECT '750S', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '750s');
  INSERT INTO models (name, brand_id) SELECT '750S Spider', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '750s spider');
  INSERT INTO models (name, brand_id) SELECT 'Artura', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'artura');
  INSERT INTO models (name, brand_id) SELECT 'Artura Spider', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'artura spider');
  INSERT INTO models (name, brand_id) SELECT 'GT', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'gt');
  INSERT INTO models (name, brand_id) SELECT 'GTS', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'gts');
  INSERT INTO models (name, brand_id) SELECT 'W1', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'w1');

  -- 720S Family (2017-2022)
  INSERT INTO models (name, brand_id) SELECT '720S', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '720s');
  INSERT INTO models (name, brand_id) SELECT '720S Spider', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '720s spider');
  INSERT INTO models (name, brand_id) SELECT '765LT', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '765lt');
  INSERT INTO models (name, brand_id) SELECT '765LT Spider', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '765lt spider');

  -- Ultimate Series
  INSERT INTO models (name, brand_id) SELECT 'P1', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'p1');
  INSERT INTO models (name, brand_id) SELECT 'P1 GTR', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'p1 gtr');
  INSERT INTO models (name, brand_id) SELECT 'Senna', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'senna');
  INSERT INTO models (name, brand_id) SELECT 'Senna GTR', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'senna gtr');
  INSERT INTO models (name, brand_id) SELECT 'Speedtail', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'speedtail');
  INSERT INTO models (name, brand_id) SELECT 'Elva', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'elva');
  INSERT INTO models (name, brand_id) SELECT 'Solus GT', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'solus gt');

  -- 650S / 675LT Family (2014-2017)
  INSERT INTO models (name, brand_id) SELECT '650S', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '650s');
  INSERT INTO models (name, brand_id) SELECT '650S Spider', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '650s spider');
  INSERT INTO models (name, brand_id) SELECT '650S GT3', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '650s gt3');
  INSERT INTO models (name, brand_id) SELECT '675LT', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '675lt');
  INSERT INTO models (name, brand_id) SELECT '675LT Spider', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '675lt spider');
  INSERT INTO models (name, brand_id) SELECT '625C', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '625c');

  -- Sports Series / 570S Family (2015-2021)
  INSERT INTO models (name, brand_id) SELECT '570S', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '570s');
  INSERT INTO models (name, brand_id) SELECT '570S Spider', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '570s spider');
  INSERT INTO models (name, brand_id) SELECT '570GT', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '570gt');
  INSERT INTO models (name, brand_id) SELECT '540C', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '540c');
  INSERT INTO models (name, brand_id) SELECT '600LT', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '600lt');
  INSERT INTO models (name, brand_id) SELECT '600LT Spider', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '600lt spider');
  INSERT INTO models (name, brand_id) SELECT '620R', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '620r');

  -- MP4-12C Family (2011-2014)
  INSERT INTO models (name, brand_id) SELECT 'MP4-12C', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'mp4-12c');
  INSERT INTO models (name, brand_id) SELECT 'MP4-12C Spider', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'mp4-12c spider');
  INSERT INTO models (name, brand_id) SELECT '12C', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '12c');
  INSERT INTO models (name, brand_id) SELECT '12C Spider', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '12c spider');
  INSERT INTO models (name, brand_id) SELECT '12C GT3', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = '12c gt3');

  -- Classic / Heritage Models
  INSERT INTO models (name, brand_id) SELECT 'F1', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'f1');
  INSERT INTO models (name, brand_id) SELECT 'F1 GTR', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'f1 gtr');
  INSERT INTO models (name, brand_id) SELECT 'F1 LM', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'f1 lm');

  -- Limited/Special Editions
  INSERT INTO models (name, brand_id) SELECT 'Sabre', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'sabre');
  INSERT INTO models (name, brand_id) SELECT 'MSO HS', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'mso hs');
  INSERT INTO models (name, brand_id) SELECT 'MSO X', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'mso x');
  INSERT INTO models (name, brand_id) SELECT 'X-1', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'x-1');
  INSERT INTO models (name, brand_id) SELECT 'BC-03', mclaren_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = mclaren_id AND LOWER(name) = 'bc-03');

  RAISE NOTICE 'McLaren brand and models added successfully';
END $$;
