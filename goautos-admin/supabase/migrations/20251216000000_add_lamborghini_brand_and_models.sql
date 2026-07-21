-- Migration: Add Lamborghini brand and models (global)
-- This migration adds the Lamborghini brand and its comprehensive model lineup

-- First, insert Lamborghini brand if it doesn't exist
INSERT INTO brands (id, name)
SELECT gen_random_uuid(), 'Lamborghini'
WHERE NOT EXISTS (
  SELECT 1 FROM brands WHERE LOWER(name) = 'lamborghini'
);

-- Get the brand ID and insert all models
DO $$
DECLARE
  lamborghini_id TEXT;
BEGIN
  -- Get the Lamborghini brand ID (cast to text for compatibility)
  SELECT id::text INTO lamborghini_id FROM brands WHERE LOWER(name) = 'lamborghini';

  IF lamborghini_id IS NULL THEN
    RAISE EXCEPTION 'Lamborghini brand not found';
  END IF;

  -- Insert models (only if they don't already exist)
  -- Current Production Models
  INSERT INTO models (name, brand_id) SELECT 'Huracán', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'huracán');
  INSERT INTO models (name, brand_id) SELECT 'Huracán EVO', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'huracán evo');
  INSERT INTO models (name, brand_id) SELECT 'Huracán EVO Spyder', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'huracán evo spyder');
  INSERT INTO models (name, brand_id) SELECT 'Huracán STO', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'huracán sto');
  INSERT INTO models (name, brand_id) SELECT 'Huracán Tecnica', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'huracán tecnica');
  INSERT INTO models (name, brand_id) SELECT 'Huracán Sterrato', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'huracán sterrato');
  INSERT INTO models (name, brand_id) SELECT 'Urus', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'urus');
  INSERT INTO models (name, brand_id) SELECT 'Urus S', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'urus s');
  INSERT INTO models (name, brand_id) SELECT 'Urus Performante', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'urus performante');
  INSERT INTO models (name, brand_id) SELECT 'Revuelto', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'revuelto');

  -- Aventador Family (2011-2022)
  INSERT INTO models (name, brand_id) SELECT 'Aventador', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'aventador');
  INSERT INTO models (name, brand_id) SELECT 'Aventador LP 700-4', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'aventador lp 700-4');
  INSERT INTO models (name, brand_id) SELECT 'Aventador LP 720-4', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'aventador lp 720-4');
  INSERT INTO models (name, brand_id) SELECT 'Aventador LP 750-4 SV', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'aventador lp 750-4 sv');
  INSERT INTO models (name, brand_id) SELECT 'Aventador S', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'aventador s');
  INSERT INTO models (name, brand_id) SELECT 'Aventador SVJ', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'aventador svj');
  INSERT INTO models (name, brand_id) SELECT 'Aventador Roadster', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'aventador roadster');
  INSERT INTO models (name, brand_id) SELECT 'Aventador Ultimae', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'aventador ultimae');

  -- Gallardo Family (2003-2013)
  INSERT INTO models (name, brand_id) SELECT 'Gallardo', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'gallardo');
  INSERT INTO models (name, brand_id) SELECT 'Gallardo LP 550-2', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'gallardo lp 550-2');
  INSERT INTO models (name, brand_id) SELECT 'Gallardo LP 560-4', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'gallardo lp 560-4');
  INSERT INTO models (name, brand_id) SELECT 'Gallardo LP 570-4', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'gallardo lp 570-4');
  INSERT INTO models (name, brand_id) SELECT 'Gallardo Spyder', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'gallardo spyder');
  INSERT INTO models (name, brand_id) SELECT 'Gallardo Superleggera', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'gallardo superleggera');
  INSERT INTO models (name, brand_id) SELECT 'Gallardo Performante', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'gallardo performante');

  -- Murciélago Family (2001-2010)
  INSERT INTO models (name, brand_id) SELECT 'Murciélago', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'murciélago');
  INSERT INTO models (name, brand_id) SELECT 'Murciélago LP 640', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'murciélago lp 640');
  INSERT INTO models (name, brand_id) SELECT 'Murciélago LP 670-4 SV', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'murciélago lp 670-4 sv');
  INSERT INTO models (name, brand_id) SELECT 'Murciélago Roadster', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'murciélago roadster');

  -- Limited Edition / Special
  INSERT INTO models (name, brand_id) SELECT 'Countach LPI 800-4', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'countach lpi 800-4');
  INSERT INTO models (name, brand_id) SELECT 'Sián', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'sián');
  INSERT INTO models (name, brand_id) SELECT 'Sián Roadster', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'sián roadster');
  INSERT INTO models (name, brand_id) SELECT 'Centenario', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'centenario');
  INSERT INTO models (name, brand_id) SELECT 'Veneno', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'veneno');
  INSERT INTO models (name, brand_id) SELECT 'Veneno Roadster', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'veneno roadster');
  INSERT INTO models (name, brand_id) SELECT 'Reventón', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'reventón');
  INSERT INTO models (name, brand_id) SELECT 'Sesto Elemento', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'sesto elemento');

  -- Classic Models
  INSERT INTO models (name, brand_id) SELECT 'Diablo', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'diablo');
  INSERT INTO models (name, brand_id) SELECT 'Diablo VT', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'diablo vt');
  INSERT INTO models (name, brand_id) SELECT 'Diablo SV', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'diablo sv');
  INSERT INTO models (name, brand_id) SELECT 'Diablo GT', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'diablo gt');
  INSERT INTO models (name, brand_id) SELECT 'Countach', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'countach');
  INSERT INTO models (name, brand_id) SELECT 'Countach LP400', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'countach lp400');
  INSERT INTO models (name, brand_id) SELECT 'Countach LP500', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'countach lp500');
  INSERT INTO models (name, brand_id) SELECT 'Miura', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'miura');
  INSERT INTO models (name, brand_id) SELECT 'Miura P400', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'miura p400');
  INSERT INTO models (name, brand_id) SELECT 'Miura SV', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'miura sv');
  INSERT INTO models (name, brand_id) SELECT 'Espada', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'espada');
  INSERT INTO models (name, brand_id) SELECT 'Jalpa', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'jalpa');
  INSERT INTO models (name, brand_id) SELECT 'Urraco', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'urraco');
  INSERT INTO models (name, brand_id) SELECT 'Silhouette', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'silhouette');
  INSERT INTO models (name, brand_id) SELECT 'LM002', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'lm002');
  INSERT INTO models (name, brand_id) SELECT '350 GT', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = '350 gt');
  INSERT INTO models (name, brand_id) SELECT '400 GT', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = '400 gt');
  INSERT INTO models (name, brand_id) SELECT 'Islero', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'islero');
  INSERT INTO models (name, brand_id) SELECT 'Jarama', lamborghini_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = lamborghini_id AND LOWER(name) = 'jarama');

  RAISE NOTICE 'Lamborghini brand and models added successfully';
END $$;
