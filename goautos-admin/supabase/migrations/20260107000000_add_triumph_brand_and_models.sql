-- Migration: Add Triumph brand and models (global)
-- This migration adds the Triumph brand and its comprehensive model lineup

-- First, insert Triumph brand if it doesn't exist
INSERT INTO brands (id, name)
SELECT gen_random_uuid(), 'Triumph'
WHERE NOT EXISTS (
  SELECT 1 FROM brands WHERE LOWER(name) = 'triumph'
);

-- Get the brand ID and insert all models
DO $$
DECLARE
  triumph_id TEXT;
BEGIN
  -- Get the Triumph brand ID (cast to text for compatibility)
  SELECT id::text INTO triumph_id FROM brands WHERE LOWER(name) = 'triumph';

  IF triumph_id IS NULL THEN
    RAISE EXCEPTION 'Triumph brand not found';
  END IF;

  -- Insert models (only if they don't already exist)

  -- Bonneville Family (Modern Classics)
  INSERT INTO models (name, brand_id) SELECT 'Bonneville T120', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'bonneville t120');
  INSERT INTO models (name, brand_id) SELECT 'Bonneville T120 Black', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'bonneville t120 black');
  INSERT INTO models (name, brand_id) SELECT 'Bonneville T100', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'bonneville t100');
  INSERT INTO models (name, brand_id) SELECT 'Bonneville Speedmaster', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'bonneville speedmaster');
  INSERT INTO models (name, brand_id) SELECT 'Bonneville Bobber', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'bonneville bobber');
  INSERT INTO models (name, brand_id) SELECT 'Bonneville Bobber Black', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'bonneville bobber black');

  -- Speed Twin Family
  INSERT INTO models (name, brand_id) SELECT 'Speed Twin 900', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'speed twin 900');
  INSERT INTO models (name, brand_id) SELECT 'Speed Twin 1200', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'speed twin 1200');
  INSERT INTO models (name, brand_id) SELECT 'Speed Twin 1200 RS', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'speed twin 1200 rs');

  -- Thruxton
  INSERT INTO models (name, brand_id) SELECT 'Thruxton RS', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'thruxton rs');
  INSERT INTO models (name, brand_id) SELECT 'Thruxton 1200', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'thruxton 1200');
  INSERT INTO models (name, brand_id) SELECT 'Thruxton R', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'thruxton r');

  -- Street Twin / Street Scrambler
  INSERT INTO models (name, brand_id) SELECT 'Street Twin', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'street twin');
  INSERT INTO models (name, brand_id) SELECT 'Street Scrambler', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'street scrambler');

  -- Scrambler Family
  INSERT INTO models (name, brand_id) SELECT 'Scrambler 400 X', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'scrambler 400 x');
  INSERT INTO models (name, brand_id) SELECT 'Scrambler 1200 XC', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'scrambler 1200 xc');
  INSERT INTO models (name, brand_id) SELECT 'Scrambler 1200 XE', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'scrambler 1200 xe');

  -- Tiger Adventure Family
  INSERT INTO models (name, brand_id) SELECT 'Tiger 900 GT', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tiger 900 gt');
  INSERT INTO models (name, brand_id) SELECT 'Tiger 900 GT Pro', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tiger 900 gt pro');
  INSERT INTO models (name, brand_id) SELECT 'Tiger 900 Rally', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tiger 900 rally');
  INSERT INTO models (name, brand_id) SELECT 'Tiger 900 Rally Pro', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tiger 900 rally pro');
  INSERT INTO models (name, brand_id) SELECT 'Tiger 1200 GT', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tiger 1200 gt');
  INSERT INTO models (name, brand_id) SELECT 'Tiger 1200 GT Pro', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tiger 1200 gt pro');
  INSERT INTO models (name, brand_id) SELECT 'Tiger 1200 GT Explorer', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tiger 1200 gt explorer');
  INSERT INTO models (name, brand_id) SELECT 'Tiger 1200 Rally Pro', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tiger 1200 rally pro');
  INSERT INTO models (name, brand_id) SELECT 'Tiger 1200 Rally Explorer', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tiger 1200 rally explorer');
  INSERT INTO models (name, brand_id) SELECT 'Tiger Sport 660', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tiger sport 660');
  INSERT INTO models (name, brand_id) SELECT 'Tiger 850 Sport', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tiger 850 sport');

  -- Speed Triple Family (Roadsters)
  INSERT INTO models (name, brand_id) SELECT 'Speed Triple 1200 RS', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'speed triple 1200 rs');
  INSERT INTO models (name, brand_id) SELECT 'Speed Triple 1200 RR', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'speed triple 1200 rr');
  INSERT INTO models (name, brand_id) SELECT 'Speed Triple R', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'speed triple r');
  INSERT INTO models (name, brand_id) SELECT 'Speed Triple S', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'speed triple s');

  -- Street Triple Family
  INSERT INTO models (name, brand_id) SELECT 'Street Triple 765 R', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'street triple 765 r');
  INSERT INTO models (name, brand_id) SELECT 'Street Triple 765 RS', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'street triple 765 rs');
  INSERT INTO models (name, brand_id) SELECT 'Street Triple 765 Moto2 Edition', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'street triple 765 moto2 edition');
  INSERT INTO models (name, brand_id) SELECT 'Street Triple R', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'street triple r');
  INSERT INTO models (name, brand_id) SELECT 'Street Triple S', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'street triple s');

  -- Trident
  INSERT INTO models (name, brand_id) SELECT 'Trident 660', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'trident 660');

  -- Daytona
  INSERT INTO models (name, brand_id) SELECT 'Daytona 660', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'daytona 660');
  INSERT INTO models (name, brand_id) SELECT 'Daytona Moto2 765', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'daytona moto2 765');
  INSERT INTO models (name, brand_id) SELECT 'Daytona 675', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'daytona 675');
  INSERT INTO models (name, brand_id) SELECT 'Daytona 675 R', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'daytona 675 r');

  -- Rocket 3 Family (Cruisers)
  INSERT INTO models (name, brand_id) SELECT 'Rocket 3 R', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'rocket 3 r');
  INSERT INTO models (name, brand_id) SELECT 'Rocket 3 GT', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'rocket 3 gt');
  INSERT INTO models (name, brand_id) SELECT 'Rocket 3 R 221 Special Edition', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'rocket 3 r 221 special edition');
  INSERT INTO models (name, brand_id) SELECT 'Rocket 3 Storm R', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'rocket 3 storm r');
  INSERT INTO models (name, brand_id) SELECT 'Rocket 3 Storm GT', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'rocket 3 storm gt');

  -- Thunderbird
  INSERT INTO models (name, brand_id) SELECT 'Thunderbird', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'thunderbird');
  INSERT INTO models (name, brand_id) SELECT 'Thunderbird Storm', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'thunderbird storm');
  INSERT INTO models (name, brand_id) SELECT 'Thunderbird LT', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'thunderbird lt');
  INSERT INTO models (name, brand_id) SELECT 'Thunderbird Commander', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'thunderbird commander');

  -- Off-Road / Motocross
  INSERT INTO models (name, brand_id) SELECT 'TF 250-X', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tf 250-x');
  INSERT INTO models (name, brand_id) SELECT 'TF 450-RC', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'tf 450-rc');

  -- America (Cruisers clasicas)
  INSERT INTO models (name, brand_id) SELECT 'America', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'america');
  INSERT INTO models (name, brand_id) SELECT 'America LT', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'america lt');

  -- Sprint
  INSERT INTO models (name, brand_id) SELECT 'Sprint GT', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'sprint gt');
  INSERT INTO models (name, brand_id) SELECT 'Sprint ST', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'sprint st');

  -- Trophy
  INSERT INTO models (name, brand_id) SELECT 'Trophy', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'trophy');
  INSERT INTO models (name, brand_id) SELECT 'Trophy SE', triumph_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = triumph_id AND LOWER(name) = 'trophy se');

  RAISE NOTICE 'Triumph brand and models added successfully';
END $$;
