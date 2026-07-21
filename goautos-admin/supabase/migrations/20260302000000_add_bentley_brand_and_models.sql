-- Migration: Add Bentley brand and models (global)
-- This migration adds the Bentley brand and its comprehensive model lineup

-- First, insert Bentley brand if it doesn't exist
INSERT INTO brands (id, name)
SELECT gen_random_uuid(), 'Bentley'
WHERE NOT EXISTS (
  SELECT 1 FROM brands WHERE LOWER(name) = 'bentley'
);

-- Get the brand ID and insert all models
DO $$
DECLARE
  bentley_id TEXT;
BEGIN
  -- Get the Bentley brand ID (cast to text for compatibility)
  SELECT id::text INTO bentley_id FROM brands WHERE LOWER(name) = 'bentley';

  IF bentley_id IS NULL THEN
    RAISE EXCEPTION 'Bentley brand not found';
  END IF;

  -- Insert models (only if they don't already exist)

  -- Continental GT Family (current & historic)
  INSERT INTO models (name, brand_id) SELECT 'Continental GT', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gt');
  INSERT INTO models (name, brand_id) SELECT 'Continental GT Convertible', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gt convertible');
  INSERT INTO models (name, brand_id) SELECT 'Continental GT Speed', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gt speed');
  INSERT INTO models (name, brand_id) SELECT 'Continental GT Speed Convertible', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gt speed convertible');
  INSERT INTO models (name, brand_id) SELECT 'Continental GT V8', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gt v8');
  INSERT INTO models (name, brand_id) SELECT 'Continental GT V8 Convertible', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gt v8 convertible');
  INSERT INTO models (name, brand_id) SELECT 'Continental GT V8 S', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gt v8 s');
  INSERT INTO models (name, brand_id) SELECT 'Continental GT Mulliner', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gt mulliner');
  INSERT INTO models (name, brand_id) SELECT 'Continental GT3', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gt3');
  INSERT INTO models (name, brand_id) SELECT 'Continental GT3-R', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gt3-r');

  -- Continental GTC Family
  INSERT INTO models (name, brand_id) SELECT 'Continental GTC', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gtc');
  INSERT INTO models (name, brand_id) SELECT 'Continental GTC Speed', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gtc speed');
  INSERT INTO models (name, brand_id) SELECT 'Continental GTC V8', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gtc v8');
  INSERT INTO models (name, brand_id) SELECT 'Continental GTC V8 S', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental gtc v8 s');

  -- Continental Supersports
  INSERT INTO models (name, brand_id) SELECT 'Continental Supersports', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental supersports');
  INSERT INTO models (name, brand_id) SELECT 'Continental Supersports Convertible', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental supersports convertible');

  -- Continental Flying Spur (older gen)
  INSERT INTO models (name, brand_id) SELECT 'Continental Flying Spur', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental flying spur');
  INSERT INTO models (name, brand_id) SELECT 'Continental Flying Spur Speed', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental flying spur speed');

  -- Flying Spur (current gen)
  INSERT INTO models (name, brand_id) SELECT 'Flying Spur', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'flying spur');
  INSERT INTO models (name, brand_id) SELECT 'Flying Spur V8', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'flying spur v8');
  INSERT INTO models (name, brand_id) SELECT 'Flying Spur W12', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'flying spur w12');
  INSERT INTO models (name, brand_id) SELECT 'Flying Spur Speed', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'flying spur speed');
  INSERT INTO models (name, brand_id) SELECT 'Flying Spur Mulliner', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'flying spur mulliner');
  INSERT INTO models (name, brand_id) SELECT 'Flying Spur Hybrid', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'flying spur hybrid');
  INSERT INTO models (name, brand_id) SELECT 'Flying Spur S', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'flying spur s');

  -- Bentayga Family
  INSERT INTO models (name, brand_id) SELECT 'Bentayga', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'bentayga');
  INSERT INTO models (name, brand_id) SELECT 'Bentayga V8', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'bentayga v8');
  INSERT INTO models (name, brand_id) SELECT 'Bentayga W12', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'bentayga w12');
  INSERT INTO models (name, brand_id) SELECT 'Bentayga Speed', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'bentayga speed');
  INSERT INTO models (name, brand_id) SELECT 'Bentayga Hybrid', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'bentayga hybrid');
  INSERT INTO models (name, brand_id) SELECT 'Bentayga S', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'bentayga s');
  INSERT INTO models (name, brand_id) SELECT 'Bentayga S V8', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'bentayga s v8');
  INSERT INTO models (name, brand_id) SELECT 'Bentayga Mulliner', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'bentayga mulliner');
  INSERT INTO models (name, brand_id) SELECT 'Bentayga EWB', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'bentayga ewb');
  INSERT INTO models (name, brand_id) SELECT 'Bentayga EWB Mulliner', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'bentayga ewb mulliner');

  -- Mulsanne Family
  INSERT INTO models (name, brand_id) SELECT 'Mulsanne', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'mulsanne');
  INSERT INTO models (name, brand_id) SELECT 'Mulsanne Speed', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'mulsanne speed');
  INSERT INTO models (name, brand_id) SELECT 'Mulsanne Extended Wheelbase', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'mulsanne extended wheelbase');
  INSERT INTO models (name, brand_id) SELECT 'Mulsanne Grand Limousine', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'mulsanne grand limousine');

  -- Arnage Family
  INSERT INTO models (name, brand_id) SELECT 'Arnage', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'arnage');
  INSERT INTO models (name, brand_id) SELECT 'Arnage R', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'arnage r');
  INSERT INTO models (name, brand_id) SELECT 'Arnage T', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'arnage t');
  INSERT INTO models (name, brand_id) SELECT 'Arnage RL', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'arnage rl');

  -- Azure Family
  INSERT INTO models (name, brand_id) SELECT 'Azure', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'azure');
  INSERT INTO models (name, brand_id) SELECT 'Azure T', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'azure t');

  -- Brooklands
  INSERT INTO models (name, brand_id) SELECT 'Brooklands', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'brooklands');

  -- Batur & Bacalar (Mulliner Coach-built)
  INSERT INTO models (name, brand_id) SELECT 'Batur', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'batur');
  INSERT INTO models (name, brand_id) SELECT 'Bacalar', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'bacalar');

  -- Classic / Heritage Models
  INSERT INTO models (name, brand_id) SELECT 'Turbo R', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'turbo r');
  INSERT INTO models (name, brand_id) SELECT 'Turbo RT', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'turbo rt');
  INSERT INTO models (name, brand_id) SELECT 'Eight', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'eight');
  INSERT INTO models (name, brand_id) SELECT 'Continental R', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental r');
  INSERT INTO models (name, brand_id) SELECT 'Continental T', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental t');
  INSERT INTO models (name, brand_id) SELECT 'Continental SC', bentley_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = bentley_id AND LOWER(name) = 'continental sc');

  RAISE NOTICE 'Bentley brand and models added successfully';
END $$;
