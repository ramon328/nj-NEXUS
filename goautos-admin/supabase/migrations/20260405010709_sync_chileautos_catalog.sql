-- ChileAutos Catalog Sync Migration
-- Generated: 2026-04-05T01:07:09.207Z
-- Source: ChileAutos API + Internet Research, date 2026-04-05T00:56:39.847Z

-- === Abarth ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'abarth';

  INSERT INTO models (name, brand_id) SELECT '595 Competizione 1.4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '595 competizione 1.4');

  INSERT INTO models (name, brand_id) SELECT '595 Tjet Hb 1.4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '595 tjet hb 1.4');

  INSERT INTO models (name, brand_id) SELECT '595 Turismo 500C', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '595 turismo 500c');

  INSERT INTO models (name, brand_id) SELECT '695', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '695');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '695';
  INSERT INTO versions (name, model_id) SELECT '695 Esseesse', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '695 esseesse');

END $$;

-- === Acadian ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Acadian'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'acadian');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'acadian';

  INSERT INTO models (name, brand_id) SELECT '123', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '123');

  INSERT INTO models (name, brand_id) SELECT 'Beaumont', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'beaumont');

END $$;

-- === Acura ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'acura';

  INSERT INTO models (name, brand_id) SELECT 'Dc5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dc5');

  INSERT INTO models (name, brand_id) SELECT 'Ilx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ilx');

  INSERT INTO models (name, brand_id) SELECT 'NSX', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nsx');

  INSERT INTO models (name, brand_id) SELECT 'Rlx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rlx');

  INSERT INTO models (name, brand_id) SELECT 'Tl', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tl');

  INSERT INTO models (name, brand_id) SELECT 'TLX ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tlx ');

END $$;

-- === Adler ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Adler'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'adler');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'adler';

  INSERT INTO models (name, brand_id) SELECT 'Junior', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'junior');

END $$;

-- === Alfa Romeo ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'alfa romeo';

  INSERT INTO models (name, brand_id) SELECT 'Sportwagon', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sportwagon');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '75';
  INSERT INTO versions (name, model_id) SELECT '75 Ts', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '75 ts');

END $$;

-- === Amc ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Amc'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'amc');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'amc';

  INSERT INTO models (name, brand_id) SELECT 'Hornet', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hornet');

  INSERT INTO models (name, brand_id) SELECT 'Pacer', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pacer');

END $$;

-- === American Motors ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'American Motors'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'american motors');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'american motors';

  INSERT INTO models (name, brand_id) SELECT 'Carrier', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'carrier');

  INSERT INTO models (name, brand_id) SELECT 'CJ8', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cj8');

  INSERT INTO models (name, brand_id) SELECT 'Hornet', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hornet');

  INSERT INTO models (name, brand_id) SELECT 'Locomovil', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'locomovil');

  INSERT INTO models (name, brand_id) SELECT 'Pacer', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pacer');

END $$;

-- === Aprilia ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'aprilia';

  INSERT INTO models (name, brand_id) SELECT 'Rxv', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rxv');

  INSERT INTO models (name, brand_id) SELECT 'Shiver', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'shiver');

END $$;

-- === Asia ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'asia';

  INSERT INTO models (name, brand_id) SELECT 'Spark', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spark');

  INSERT INTO models (name, brand_id) SELECT 'Towner', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'towner');

END $$;

-- === Aston Martin ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'aston martin';

  INSERT INTO models (name, brand_id) SELECT 'Db11', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'db11');

  INSERT INTO models (name, brand_id) SELECT 'Dbx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dbx');

  INSERT INTO models (name, brand_id) SELECT 'Mini Cooper', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mini cooper');

  INSERT INTO models (name, brand_id) SELECT 'Rapide', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rapide');

  INSERT INTO models (name, brand_id) SELECT 'V12 Vantage', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v12 vantage');

  INSERT INTO models (name, brand_id) SELECT 'V12 Vintage', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v12 vintage');

  INSERT INTO models (name, brand_id) SELECT 'V8 Vantage', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v8 vantage');

  INSERT INTO models (name, brand_id) SELECT 'Vantage', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vantage');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vantage';
  INSERT INTO versions (name, model_id) SELECT 'Vantage V8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'vantage v8');
  INSERT INTO versions (name, model_id) SELECT 'Vantage Roadster', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'vantage roadster');

  INSERT INTO models (name, brand_id) SELECT 'Virage', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'virage');

END $$;

-- === Auburn ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Auburn'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'auburn');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'auburn';

  INSERT INTO models (name, brand_id) SELECT '654', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '654');

END $$;

-- === Audi ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'audi';

  INSERT INTO models (name, brand_id) SELECT 'Allroad Quattro', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'allroad quattro');

  INSERT INTO models (name, brand_id) SELECT 'E-Tron Sportback', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e-tron sportback');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e-tron sportback';
  INSERT INTO versions (name, model_id) SELECT 'e-tron 50', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-tron 50');
  INSERT INTO versions (name, model_id) SELECT 'e-tron 55', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-tron 55');
  INSERT INTO versions (name, model_id) SELECT 'e-tron S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-tron s');
  INSERT INTO versions (name, model_id) SELECT 'Sportback 50', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback 50');
  INSERT INTO versions (name, model_id) SELECT 'Sportback 55', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback 55');
  INSERT INTO versions (name, model_id) SELECT 'Sportback S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback s');

  INSERT INTO models (name, brand_id) SELECT 'Q4 Sportback E-Tron', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q4 sportback e-tron');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q4 sportback e-tron';
  INSERT INTO versions (name, model_id) SELECT 'Q4 35 e-tron', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'q4 35 e-tron');
  INSERT INTO versions (name, model_id) SELECT 'Q4 40 e-tron', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'q4 40 e-tron');
  INSERT INTO versions (name, model_id) SELECT 'Q4 45 e-tron', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'q4 45 e-tron');
  INSERT INTO versions (name, model_id) SELECT 'Q4 50 e-tron', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'q4 50 e-tron');
  INSERT INTO versions (name, model_id) SELECT 'Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback');

  INSERT INTO models (name, brand_id) SELECT 'Q6 E-Tron', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q6 e-tron');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q6 e-tron';
  INSERT INTO versions (name, model_id) SELECT 'Q6 e-tron', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'q6 e-tron');
  INSERT INTO versions (name, model_id) SELECT 'Q6 e-tron Performance', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'q6 e-tron performance');
  INSERT INTO versions (name, model_id) SELECT 'SQ6 e-tron', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sq6 e-tron');

  INSERT INTO models (name, brand_id) SELECT 'Q6 Sportback E-Tron', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q6 sportback e-tron');

  INSERT INTO models (name, brand_id) SELECT 'Rs 2', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs 2');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs 2';
  INSERT INTO versions (name, model_id) SELECT 'Rs 2 2.2', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs 2 2.2');

  INSERT INTO models (name, brand_id) SELECT 'RSQ8', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rsq8');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rsq8';
  INSERT INTO versions (name, model_id) SELECT 'RSQ8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rsq8');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a1';
  INSERT INTO versions (name, model_id) SELECT 'A1', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a1');
  INSERT INTO versions (name, model_id) SELECT 'A1 Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a1 sportback');
  INSERT INTO versions (name, model_id) SELECT '30 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '30 tfsi');
  INSERT INTO versions (name, model_id) SELECT '35 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '35 tfsi');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a3';
  INSERT INTO versions (name, model_id) SELECT '30 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '30 tfsi');
  INSERT INTO versions (name, model_id) SELECT '35 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '35 tfsi');
  INSERT INTO versions (name, model_id) SELECT '40 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '40 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback');
  INSERT INTO versions (name, model_id) SELECT 'Sedan', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sedan');
  INSERT INTO versions (name, model_id) SELECT 'Cabrio', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cabrio');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a4';
  INSERT INTO versions (name, model_id) SELECT '35 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '35 tfsi');
  INSERT INTO versions (name, model_id) SELECT '40 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '40 tfsi');
  INSERT INTO versions (name, model_id) SELECT '45 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '45 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Avant', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'avant');
  INSERT INTO versions (name, model_id) SELECT 'Allroad', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allroad');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a5';
  INSERT INTO versions (name, model_id) SELECT '35 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '35 tfsi');
  INSERT INTO versions (name, model_id) SELECT '40 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '40 tfsi');
  INSERT INTO versions (name, model_id) SELECT '45 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '45 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback');
  INSERT INTO versions (name, model_id) SELECT 'Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe');
  INSERT INTO versions (name, model_id) SELECT 'Cabrio', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cabrio');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a6';
  INSERT INTO versions (name, model_id) SELECT '40 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '40 tfsi');
  INSERT INTO versions (name, model_id) SELECT '45 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '45 tfsi');
  INSERT INTO versions (name, model_id) SELECT '50 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '50 tfsi');
  INSERT INTO versions (name, model_id) SELECT '55 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '55 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Avant', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'avant');
  INSERT INTO versions (name, model_id) SELECT 'Allroad', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allroad');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a7';
  INSERT INTO versions (name, model_id) SELECT '45 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '45 tfsi');
  INSERT INTO versions (name, model_id) SELECT '50 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '50 tfsi');
  INSERT INTO versions (name, model_id) SELECT '55 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '55 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a8';
  INSERT INTO versions (name, model_id) SELECT '50 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '50 tfsi');
  INSERT INTO versions (name, model_id) SELECT '55 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '55 tfsi');
  INSERT INTO versions (name, model_id) SELECT '60 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '60 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'L', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'l');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e-tron gt';
  INSERT INTO versions (name, model_id) SELECT 'e-tron GT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-tron gt');
  INSERT INTO versions (name, model_id) SELECT 'RS e-tron GT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs e-tron gt');
  INSERT INTO versions (name, model_id) SELECT 'RS e-tron GT Performance', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs e-tron gt performance');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q2';
  INSERT INTO versions (name, model_id) SELECT '30 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '30 tfsi');
  INSERT INTO versions (name, model_id) SELECT '35 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '35 tfsi');
  INSERT INTO versions (name, model_id) SELECT '40 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '40 tfsi');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q3';
  INSERT INTO versions (name, model_id) SELECT '35 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '35 tfsi');
  INSERT INTO versions (name, model_id) SELECT '40 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '40 tfsi');
  INSERT INTO versions (name, model_id) SELECT '45 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '45 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q5';
  INSERT INTO versions (name, model_id) SELECT '40 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '40 tfsi');
  INSERT INTO versions (name, model_id) SELECT '45 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '45 tfsi');
  INSERT INTO versions (name, model_id) SELECT '55 TFSI e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '55 tfsi e');
  INSERT INTO versions (name, model_id) SELECT 'Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q7';
  INSERT INTO versions (name, model_id) SELECT '45 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '45 tfsi');
  INSERT INTO versions (name, model_id) SELECT '50 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '50 tfsi');
  INSERT INTO versions (name, model_id) SELECT '55 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '55 tfsi');
  INSERT INTO versions (name, model_id) SELECT '60 TFSI e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '60 tfsi e');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q8';
  INSERT INTO versions (name, model_id) SELECT '55 TFSI', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '55 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'SQ8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sq8');
  INSERT INTO versions (name, model_id) SELECT 'RSQ8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rsq8');
  INSERT INTO versions (name, model_id) SELECT 'e-tron', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-tron');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'r8';
  INSERT INTO versions (name, model_id) SELECT 'V10', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v10');
  INSERT INTO versions (name, model_id) SELECT 'V10 Plus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v10 plus');
  INSERT INTO versions (name, model_id) SELECT 'V10 Performance', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v10 performance');
  INSERT INTO versions (name, model_id) SELECT 'V10 Decennium', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v10 decennium');
  INSERT INTO versions (name, model_id) SELECT 'V10 GT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v10 gt');
  INSERT INTO versions (name, model_id) SELECT 'Spyder', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'spyder');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs q3';
  INSERT INTO versions (name, model_id) SELECT 'RSQ3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rsq3');
  INSERT INTO versions (name, model_id) SELECT 'RSQ3 Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rsq3 sportback');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs3';
  INSERT INTO versions (name, model_id) SELECT 'RS3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs3');
  INSERT INTO versions (name, model_id) SELECT 'RS3 Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs3 sportback');
  INSERT INTO versions (name, model_id) SELECT 'RS3 Sedan', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs3 sedan');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs4';
  INSERT INTO versions (name, model_id) SELECT 'RS4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs4');
  INSERT INTO versions (name, model_id) SELECT 'RS4 Avant', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs4 avant');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs5';
  INSERT INTO versions (name, model_id) SELECT 'RS5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs5');
  INSERT INTO versions (name, model_id) SELECT 'RS5 Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs5 sportback');
  INSERT INTO versions (name, model_id) SELECT 'RS5 Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs5 coupe');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs6';
  INSERT INTO versions (name, model_id) SELECT 'RS6', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs6');
  INSERT INTO versions (name, model_id) SELECT 'RS6 Avant', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs6 avant');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs7';
  INSERT INTO versions (name, model_id) SELECT 'RS7', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs7');
  INSERT INTO versions (name, model_id) SELECT 'RS7 Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs7 sportback');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's3';
  INSERT INTO versions (name, model_id) SELECT 'S3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's3');
  INSERT INTO versions (name, model_id) SELECT 'S3 Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's3 sportback');
  INSERT INTO versions (name, model_id) SELECT 'S3 Sedan', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's3 sedan');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's4';
  INSERT INTO versions (name, model_id) SELECT 'S4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's4');
  INSERT INTO versions (name, model_id) SELECT 'S4 Avant', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's4 avant');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's5';
  INSERT INTO versions (name, model_id) SELECT 'S5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's5');
  INSERT INTO versions (name, model_id) SELECT 'S5 Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's5 sportback');
  INSERT INTO versions (name, model_id) SELECT 'S5 Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's5 coupe');
  INSERT INTO versions (name, model_id) SELECT 'S5 Cabrio', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's5 cabrio');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's6';
  INSERT INTO versions (name, model_id) SELECT 'S6', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's6');
  INSERT INTO versions (name, model_id) SELECT 'S6 Avant', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's6 avant');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's7';
  INSERT INTO versions (name, model_id) SELECT 'S7', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's7');
  INSERT INTO versions (name, model_id) SELECT 'S7 Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's7 sportback');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's8';
  INSERT INTO versions (name, model_id) SELECT 'S8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's8');
  INSERT INTO versions (name, model_id) SELECT 'S8 L', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's8 l');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sq5';
  INSERT INTO versions (name, model_id) SELECT 'SQ5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sq5');
  INSERT INTO versions (name, model_id) SELECT 'SQ5 Sportback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sq5 sportback');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tt';
  INSERT INTO versions (name, model_id) SELECT 'TT Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tt coupe');
  INSERT INTO versions (name, model_id) SELECT 'TT Roadster', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tt roadster');
  INSERT INTO versions (name, model_id) SELECT 'TTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tts');
  INSERT INTO versions (name, model_id) SELECT 'TT RS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tt rs');

END $$;

-- === Austin ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'austin';

  INSERT INTO models (name, brand_id) SELECT 'A40', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a40');

  INSERT INTO models (name, brand_id) SELECT 'A60', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a60');

  INSERT INTO models (name, brand_id) SELECT 'Allegro', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'allegro');

  INSERT INTO models (name, brand_id) SELECT 'Hraley', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hraley');

  INSERT INTO models (name, brand_id) SELECT 'Mg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mini';
  INSERT INTO versions (name, model_id) SELECT 'Mini Cooper', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mini cooper');

END $$;

-- === Austin Healey ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Austin Healey'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'austin healey');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'austin healey';

  INSERT INTO models (name, brand_id) SELECT 'MK III', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mk iii');

  INSERT INTO models (name, brand_id) SELECT 'Sprite', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sprite');

END $$;

-- === Austin-healey ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Austin-healey'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'austin-healey');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'austin-healey';

  INSERT INTO models (name, brand_id) SELECT 'Sprite', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sprite');

END $$;

-- === Avatr ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Avatr'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'avatr');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'avatr';

  INSERT INTO models (name, brand_id) SELECT '11', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '11');

END $$;

-- === Aveling-barford ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Aveling-barford'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'aveling-barford');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'aveling-barford';

  INSERT INTO models (name, brand_id) SELECT 'Explorer', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'explorer');

  INSERT INTO models (name, brand_id) SELECT 'Mustang', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mustang');

END $$;

-- === Backdraft Racing ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Backdraft Racing'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'backdraft racing');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'backdraft racing';

  INSERT INTO models (name, brand_id) SELECT 'Roadster', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'roadster');

END $$;

-- === BAIC ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'baic';

  INSERT INTO models (name, brand_id) SELECT 'Bj60', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bj60');

  INSERT INTO models (name, brand_id) SELECT 'U5 Plus', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'u5 plus');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bj40';
  INSERT INTO versions (name, model_id) SELECT 'Bj40 Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'bj40 pro');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x55';
  INSERT INTO versions (name, model_id) SELECT 'X55 Plus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x55 plus');

END $$;

-- === Bajaj ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'bajaj';

  INSERT INTO models (name, brand_id) SELECT 'Pulsar', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pulsar');

END $$;

-- === Baw ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Baw'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'baw');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'baw';

  INSERT INTO models (name, brand_id) SELECT 'Z3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'z3');

END $$;

-- === Bentley ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'bentley';

  INSERT INTO models (name, brand_id) SELECT 'Continental', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'continental');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'continental';
  INSERT INTO versions (name, model_id) SELECT 'GT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt');
  INSERT INTO versions (name, model_id) SELECT 'GT V8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt v8');
  INSERT INTO versions (name, model_id) SELECT 'GT V8 S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt v8 s');
  INSERT INTO versions (name, model_id) SELECT 'GT Speed', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt speed');
  INSERT INTO versions (name, model_id) SELECT 'GT Supersports', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt supersports');
  INSERT INTO versions (name, model_id) SELECT 'GT S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt s');
  INSERT INTO versions (name, model_id) SELECT 'GT Azure', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt azure');
  INSERT INTO versions (name, model_id) SELECT 'GT Mulliner', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt mulliner');
  INSERT INTO versions (name, model_id) SELECT 'GTC', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gtc');
  INSERT INTO versions (name, model_id) SELECT 'GTC V8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gtc v8');
  INSERT INTO versions (name, model_id) SELECT 'GTC V8 S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gtc v8 s');
  INSERT INTO versions (name, model_id) SELECT 'GTC Speed', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gtc speed');
  INSERT INTO versions (name, model_id) SELECT 'GTC S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gtc s');
  INSERT INTO versions (name, model_id) SELECT 'GTC Azure', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gtc azure');
  INSERT INTO versions (name, model_id) SELECT 'GTC Mulliner', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gtc mulliner');

  INSERT INTO models (name, brand_id) SELECT 'Serie III', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie iii');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bentayga';
  INSERT INTO versions (name, model_id) SELECT 'Bentayga', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'bentayga');
  INSERT INTO versions (name, model_id) SELECT 'V8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v8');
  INSERT INTO versions (name, model_id) SELECT 'W12', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'w12');
  INSERT INTO versions (name, model_id) SELECT 'Speed', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'speed');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'Azure', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'azure');
  INSERT INTO versions (name, model_id) SELECT 'Mulliner', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mulliner');
  INSERT INTO versions (name, model_id) SELECT 'EWB', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ewb');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'flying spur';
  INSERT INTO versions (name, model_id) SELECT 'Flying Spur', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'flying spur');
  INSERT INTO versions (name, model_id) SELECT 'V8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v8');
  INSERT INTO versions (name, model_id) SELECT 'W12', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'w12');
  INSERT INTO versions (name, model_id) SELECT 'Speed', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'speed');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'Azure', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'azure');
  INSERT INTO versions (name, model_id) SELECT 'Mulliner', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mulliner');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mulsanne';
  INSERT INTO versions (name, model_id) SELECT 'Mulsanne', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mulsanne');
  INSERT INTO versions (name, model_id) SELECT 'Speed', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'speed');
  INSERT INTO versions (name, model_id) SELECT 'Extended Wheelbase', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'extended wheelbase');

END $$;

-- === Bigfoot ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Bigfoot'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'bigfoot');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'bigfoot';

  INSERT INTO models (name, brand_id) SELECT 'X3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x3');

END $$;

-- === Bimota ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Bimota'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'bimota');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'bimota';

  INSERT INTO models (name, brand_id) SELECT 'Db7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'db7');

  INSERT INTO models (name, brand_id) SELECT 'Db8', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'db8');

  INSERT INTO models (name, brand_id) SELECT 'Db9', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'db9');

END $$;

-- === BMW ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'bmw';

  INSERT INTO models (name, brand_id) SELECT '128Ia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '128ia');

  INSERT INTO models (name, brand_id) SELECT '128TI', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '128ti');

  INSERT INTO models (name, brand_id) SELECT '1602', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1602');

  INSERT INTO models (name, brand_id) SELECT '2002', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2002');

  INSERT INTO models (name, brand_id) SELECT '240I', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '240i');

  INSERT INTO models (name, brand_id) SELECT '240M', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '240m');

  INSERT INTO models (name, brand_id) SELECT '320I', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '320i');

  INSERT INTO models (name, brand_id) SELECT '418', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '418');

  INSERT INTO models (name, brand_id) SELECT '7 Activehybrid', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '7 activehybrid');

  INSERT INTO models (name, brand_id) SELECT 'I5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i5';
  INSERT INTO versions (name, model_id) SELECT 'eDrive40', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'edrive40');
  INSERT INTO versions (name, model_id) SELECT 'xDrive40', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive40');
  INSERT INTO versions (name, model_id) SELECT 'M60 xDrive', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm60 xdrive');

  INSERT INTO models (name, brand_id) SELECT 'Isseta', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'isseta');

  INSERT INTO models (name, brand_id) SELECT 'Ls', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ls');

  INSERT INTO models (name, brand_id) SELECT 'M440i', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm440i');

  INSERT INTO models (name, brand_id) SELECT 'M8 Competition', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm8 competition');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm8 competition';
  INSERT INTO versions (name, model_id) SELECT 'M8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm8');
  INSERT INTO versions (name, model_id) SELECT 'M8 Competition', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm8 competition');
  INSERT INTO versions (name, model_id) SELECT 'M8 Gran Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm8 gran coupe');

  INSERT INTO models (name, brand_id) SELECT 'M850', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm850');

  INSERT INTO models (name, brand_id) SELECT 'Serie 6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 6');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 6';
  INSERT INTO versions (name, model_id) SELECT '630i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '630i');
  INSERT INTO versions (name, model_id) SELECT '640i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '640i');
  INSERT INTO versions (name, model_id) SELECT '650i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '650i');
  INSERT INTO versions (name, model_id) SELECT '620d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '620d');
  INSERT INTO versions (name, model_id) SELECT '630d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '630d');
  INSERT INTO versions (name, model_id) SELECT '640d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '640d');
  INSERT INTO versions (name, model_id) SELECT 'Gran Turismo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gran turismo');
  INSERT INTO versions (name, model_id) SELECT 'Gran Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gran coupe');

  INSERT INTO models (name, brand_id) SELECT 'Series 1', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'series 1');

  INSERT INTO models (name, brand_id) SELECT 'Series 3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'series 3');

  INSERT INTO models (name, brand_id) SELECT 'Series 5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'series 5');

  INSERT INTO models (name, brand_id) SELECT 'Series 6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'series 6');

  INSERT INTO models (name, brand_id) SELECT 'Series 7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'series 7');

  INSERT INTO models (name, brand_id) SELECT 'Z8', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'z8');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '116i';
  INSERT INTO versions (name, model_id) SELECT '116I SPORT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '116i sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i3';
  INSERT INTO versions (name, model_id) SELECT 'i3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'i3');
  INSERT INTO versions (name, model_id) SELECT 'i3s', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'i3s');
  INSERT INTO versions (name, model_id) SELECT 'i3 120 Ah', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'i3 120 ah');
  INSERT INTO versions (name, model_id) SELECT 'i3s 120 Ah', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'i3s 120 ah');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i4';
  INSERT INTO versions (name, model_id) SELECT 'eDrive35', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'edrive35');
  INSERT INTO versions (name, model_id) SELECT 'eDrive40', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'edrive40');
  INSERT INTO versions (name, model_id) SELECT 'xDrive40', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive40');
  INSERT INTO versions (name, model_id) SELECT 'M50', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm50');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i7';
  INSERT INTO versions (name, model_id) SELECT 'eDrive50', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'edrive50');
  INSERT INTO versions (name, model_id) SELECT 'xDrive60', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive60');
  INSERT INTO versions (name, model_id) SELECT 'M70 xDrive', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm70 xdrive');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i8';
  INSERT INTO versions (name, model_id) SELECT 'Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe');
  INSERT INTO versions (name, model_id) SELECT 'Roadster', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'roadster');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ix';
  INSERT INTO versions (name, model_id) SELECT 'xDrive40', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive40');
  INSERT INTO versions (name, model_id) SELECT 'xDrive45', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive45');
  INSERT INTO versions (name, model_id) SELECT 'xDrive50', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive50');
  INSERT INTO versions (name, model_id) SELECT 'xDrive60', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive60');
  INSERT INTO versions (name, model_id) SELECT 'M70', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm70');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ix1';
  INSERT INTO versions (name, model_id) SELECT 'eDrive20', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'edrive20');
  INSERT INTO versions (name, model_id) SELECT 'xDrive30', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive30');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ix2';
  INSERT INTO versions (name, model_id) SELECT 'eDrive20', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'edrive20');
  INSERT INTO versions (name, model_id) SELECT 'xDrive30', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive30');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ix3';
  INSERT INTO versions (name, model_id) SELECT 'iX3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ix3');
  INSERT INTO versions (name, model_id) SELECT 'iX3 50 xDrive', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ix3 50 xdrive');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm2';
  INSERT INTO versions (name, model_id) SELECT 'M2', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm2');
  INSERT INTO versions (name, model_id) SELECT 'M2 Competition', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm2 competition');
  INSERT INTO versions (name, model_id) SELECT 'M2 CS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm2 cs');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm3';
  INSERT INTO versions (name, model_id) SELECT 'M3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm3');
  INSERT INTO versions (name, model_id) SELECT 'M3 Competition', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm3 competition');
  INSERT INTO versions (name, model_id) SELECT 'M3 CS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm3 cs');
  INSERT INTO versions (name, model_id) SELECT 'M3 Touring', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm3 touring');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm4';
  INSERT INTO versions (name, model_id) SELECT 'M4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm4');
  INSERT INTO versions (name, model_id) SELECT 'M4 Competition', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm4 competition');
  INSERT INTO versions (name, model_id) SELECT 'M4 CS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm4 cs');
  INSERT INTO versions (name, model_id) SELECT 'M4 GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm4 gts');
  INSERT INTO versions (name, model_id) SELECT 'M4 CSL', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm4 csl');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm5';
  INSERT INTO versions (name, model_id) SELECT 'M5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm5');
  INSERT INTO versions (name, model_id) SELECT 'M5 Competition', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm5 competition');
  INSERT INTO versions (name, model_id) SELECT 'M5 CS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm5 cs');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm6';
  INSERT INTO versions (name, model_id) SELECT 'M6', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm6');
  INSERT INTO versions (name, model_id) SELECT 'M6 Competition', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm6 competition');
  INSERT INTO versions (name, model_id) SELECT 'M6 Gran Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm6 gran coupe');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 1';
  INSERT INTO versions (name, model_id) SELECT '114i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '114i');
  INSERT INTO versions (name, model_id) SELECT '116i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '116i');
  INSERT INTO versions (name, model_id) SELECT '118i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '118i');
  INSERT INTO versions (name, model_id) SELECT '120i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '120i');
  INSERT INTO versions (name, model_id) SELECT '125i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '125i');
  INSERT INTO versions (name, model_id) SELECT '128ti', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '128ti');
  INSERT INTO versions (name, model_id) SELECT 'M135i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm135i');
  INSERT INTO versions (name, model_id) SELECT 'M140i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm140i');
  INSERT INTO versions (name, model_id) SELECT '114d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '114d');
  INSERT INTO versions (name, model_id) SELECT '116d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '116d');
  INSERT INTO versions (name, model_id) SELECT '118d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '118d');
  INSERT INTO versions (name, model_id) SELECT '120d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '120d');
  INSERT INTO versions (name, model_id) SELECT '125d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '125d');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 2';
  INSERT INTO versions (name, model_id) SELECT '218i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '218i');
  INSERT INTO versions (name, model_id) SELECT '220i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '220i');
  INSERT INTO versions (name, model_id) SELECT '225i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '225i');
  INSERT INTO versions (name, model_id) SELECT '228i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '228i');
  INSERT INTO versions (name, model_id) SELECT '230i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '230i');
  INSERT INTO versions (name, model_id) SELECT 'M235i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm235i');
  INSERT INTO versions (name, model_id) SELECT 'M240i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm240i');
  INSERT INTO versions (name, model_id) SELECT '218d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '218d');
  INSERT INTO versions (name, model_id) SELECT '220d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '220d');
  INSERT INTO versions (name, model_id) SELECT '225d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '225d');
  INSERT INTO versions (name, model_id) SELECT '225xe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '225xe');
  INSERT INTO versions (name, model_id) SELECT 'Active Tourer', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'active tourer');
  INSERT INTO versions (name, model_id) SELECT 'Gran Tourer', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gran tourer');
  INSERT INTO versions (name, model_id) SELECT 'Gran Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gran coupe');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 3';
  INSERT INTO versions (name, model_id) SELECT '316i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '316i');
  INSERT INTO versions (name, model_id) SELECT '318i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '318i');
  INSERT INTO versions (name, model_id) SELECT '320i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '320i');
  INSERT INTO versions (name, model_id) SELECT '325i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '325i');
  INSERT INTO versions (name, model_id) SELECT '328i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '328i');
  INSERT INTO versions (name, model_id) SELECT '330i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '330i');
  INSERT INTO versions (name, model_id) SELECT '335i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '335i');
  INSERT INTO versions (name, model_id) SELECT '340i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '340i');
  INSERT INTO versions (name, model_id) SELECT 'M340i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm340i');
  INSERT INTO versions (name, model_id) SELECT '316d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '316d');
  INSERT INTO versions (name, model_id) SELECT '318d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '318d');
  INSERT INTO versions (name, model_id) SELECT '320d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '320d');
  INSERT INTO versions (name, model_id) SELECT '325d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '325d');
  INSERT INTO versions (name, model_id) SELECT '328d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '328d');
  INSERT INTO versions (name, model_id) SELECT '330d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '330d');
  INSERT INTO versions (name, model_id) SELECT '335d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '335d');
  INSERT INTO versions (name, model_id) SELECT '330e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '330e');
  INSERT INTO versions (name, model_id) SELECT 'Touring', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'touring');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 4';
  INSERT INTO versions (name, model_id) SELECT '418i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '418i');
  INSERT INTO versions (name, model_id) SELECT '420i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '420i');
  INSERT INTO versions (name, model_id) SELECT '428i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '428i');
  INSERT INTO versions (name, model_id) SELECT '430i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '430i');
  INSERT INTO versions (name, model_id) SELECT '435i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '435i');
  INSERT INTO versions (name, model_id) SELECT '440i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '440i');
  INSERT INTO versions (name, model_id) SELECT 'M440i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm440i');
  INSERT INTO versions (name, model_id) SELECT '418d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '418d');
  INSERT INTO versions (name, model_id) SELECT '420d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '420d');
  INSERT INTO versions (name, model_id) SELECT '425d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '425d');
  INSERT INTO versions (name, model_id) SELECT '430d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '430d');
  INSERT INTO versions (name, model_id) SELECT '435d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '435d');
  INSERT INTO versions (name, model_id) SELECT 'M440d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm440d');
  INSERT INTO versions (name, model_id) SELECT 'Gran Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gran coupe');
  INSERT INTO versions (name, model_id) SELECT 'Cabrio', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cabrio');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 5';
  INSERT INTO versions (name, model_id) SELECT '520i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '520i');
  INSERT INTO versions (name, model_id) SELECT '523i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '523i');
  INSERT INTO versions (name, model_id) SELECT '525i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '525i');
  INSERT INTO versions (name, model_id) SELECT '528i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '528i');
  INSERT INTO versions (name, model_id) SELECT '530i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '530i');
  INSERT INTO versions (name, model_id) SELECT '535i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '535i');
  INSERT INTO versions (name, model_id) SELECT '540i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '540i');
  INSERT INTO versions (name, model_id) SELECT '545i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '545i');
  INSERT INTO versions (name, model_id) SELECT '550i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '550i');
  INSERT INTO versions (name, model_id) SELECT 'M550i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm550i');
  INSERT INTO versions (name, model_id) SELECT '518d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '518d');
  INSERT INTO versions (name, model_id) SELECT '520d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '520d');
  INSERT INTO versions (name, model_id) SELECT '525d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '525d');
  INSERT INTO versions (name, model_id) SELECT '530d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '530d');
  INSERT INTO versions (name, model_id) SELECT '535d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '535d');
  INSERT INTO versions (name, model_id) SELECT '540d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '540d');
  INSERT INTO versions (name, model_id) SELECT 'M550d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm550d');
  INSERT INTO versions (name, model_id) SELECT '530e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '530e');
  INSERT INTO versions (name, model_id) SELECT '550e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '550e');
  INSERT INTO versions (name, model_id) SELECT 'Touring', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'touring');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 7';
  INSERT INTO versions (name, model_id) SELECT '730i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '730i');
  INSERT INTO versions (name, model_id) SELECT '735i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '735i');
  INSERT INTO versions (name, model_id) SELECT '740i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '740i');
  INSERT INTO versions (name, model_id) SELECT '745i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '745i');
  INSERT INTO versions (name, model_id) SELECT '750i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '750i');
  INSERT INTO versions (name, model_id) SELECT '760i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '760i');
  INSERT INTO versions (name, model_id) SELECT 'M760i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm760i');
  INSERT INTO versions (name, model_id) SELECT '725d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '725d');
  INSERT INTO versions (name, model_id) SELECT '730d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '730d');
  INSERT INTO versions (name, model_id) SELECT '740d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '740d');
  INSERT INTO versions (name, model_id) SELECT '750d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '750d');
  INSERT INTO versions (name, model_id) SELECT '740e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '740e');
  INSERT INTO versions (name, model_id) SELECT '745e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '745e');
  INSERT INTO versions (name, model_id) SELECT '750e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '750e');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 8';
  INSERT INTO versions (name, model_id) SELECT '840i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '840i');
  INSERT INTO versions (name, model_id) SELECT 'M850i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm850i');
  INSERT INTO versions (name, model_id) SELECT '840d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '840d');
  INSERT INTO versions (name, model_id) SELECT 'Gran Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gran coupe');
  INSERT INTO versions (name, model_id) SELECT 'Cabrio', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cabrio');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x1';
  INSERT INTO versions (name, model_id) SELECT 'sDrive16i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive16i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive18i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive18i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive20i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive20i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive20i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive20i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive25i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive25i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive28i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive28i');
  INSERT INTO versions (name, model_id) SELECT 'M35i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm35i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive16d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive16d');
  INSERT INTO versions (name, model_id) SELECT 'sDrive18d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive18d');
  INSERT INTO versions (name, model_id) SELECT 'sDrive20d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive20d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive18d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive18d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive20d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive20d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive23d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive23d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive25d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive25d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive25e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive25e');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x2';
  INSERT INTO versions (name, model_id) SELECT 'sDrive18i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive18i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive20i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive20i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive20i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive20i');
  INSERT INTO versions (name, model_id) SELECT 'M35i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm35i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive16d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive16d');
  INSERT INTO versions (name, model_id) SELECT 'sDrive18d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive18d');
  INSERT INTO versions (name, model_id) SELECT 'sDrive20d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive20d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive18d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive18d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive20d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive20d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive25d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive25d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive25e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive25e');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x3';
  INSERT INTO versions (name, model_id) SELECT 'sDrive20i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive20i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive20i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive20i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive28i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive28i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive30i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive30i');
  INSERT INTO versions (name, model_id) SELECT 'M40i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm40i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive18d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive18d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive20d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive20d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive25d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive25d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive30d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive30d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive35d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive35d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive30e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive30e');
  INSERT INTO versions (name, model_id) SELECT 'X3 M', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x3 m');
  INSERT INTO versions (name, model_id) SELECT 'X3 M Competition', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x3 m competition');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x4';
  INSERT INTO versions (name, model_id) SELECT 'xDrive20i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive20i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive28i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive28i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive30i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive30i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive35i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive35i');
  INSERT INTO versions (name, model_id) SELECT 'M40i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm40i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive20d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive20d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive25d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive25d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive30d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive30d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive35d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive35d');
  INSERT INTO versions (name, model_id) SELECT 'M40d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm40d');
  INSERT INTO versions (name, model_id) SELECT 'X4 M', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x4 m');
  INSERT INTO versions (name, model_id) SELECT 'X4 M Competition', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x4 m competition');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x5';
  INSERT INTO versions (name, model_id) SELECT 'sDrive35i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive35i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive35i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive35i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive40i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive40i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive48i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive48i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive50i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive50i');
  INSERT INTO versions (name, model_id) SELECT 'M50i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm50i');
  INSERT INTO versions (name, model_id) SELECT 'M60i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm60i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive25d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive25d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive25d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive25d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive30d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive30d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive35d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive35d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive40d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive40d');
  INSERT INTO versions (name, model_id) SELECT 'M50d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm50d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive40e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive40e');
  INSERT INTO versions (name, model_id) SELECT 'xDrive45e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive45e');
  INSERT INTO versions (name, model_id) SELECT 'xDrive50e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive50e');
  INSERT INTO versions (name, model_id) SELECT 'X5 M', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x5 m');
  INSERT INTO versions (name, model_id) SELECT 'X5 M Competition', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x5 m competition');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x6';
  INSERT INTO versions (name, model_id) SELECT 'xDrive35i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive35i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive40i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive40i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive50i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive50i');
  INSERT INTO versions (name, model_id) SELECT 'M50i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm50i');
  INSERT INTO versions (name, model_id) SELECT 'M60i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm60i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive30d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive30d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive35d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive35d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive40d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive40d');
  INSERT INTO versions (name, model_id) SELECT 'M50d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm50d');
  INSERT INTO versions (name, model_id) SELECT 'X6 M', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x6 m');
  INSERT INTO versions (name, model_id) SELECT 'X6 M Competition', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x6 m competition');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x7';
  INSERT INTO versions (name, model_id) SELECT 'xDrive40i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive40i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive50i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive50i');
  INSERT INTO versions (name, model_id) SELECT 'M50i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm50i');
  INSERT INTO versions (name, model_id) SELECT 'M60i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm60i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive30d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive30d');
  INSERT INTO versions (name, model_id) SELECT 'xDrive40d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive40d');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xm';
  INSERT INTO versions (name, model_id) SELECT 'XM', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xm');
  INSERT INTO versions (name, model_id) SELECT 'XM 50e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xm 50e');
  INSERT INTO versions (name, model_id) SELECT 'XM Label Red', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xm label red');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'z4';
  INSERT INTO versions (name, model_id) SELECT 'sDrive18i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive18i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive20i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive20i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive23i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive23i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive28i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive28i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive30i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive30i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive35i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive35i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive35is', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive35is');
  INSERT INTO versions (name, model_id) SELECT 'M40i', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm40i');

END $$;

-- === Bombardier ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'bombardier';

  INSERT INTO models (name, brand_id) SELECT 'F 700', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f 700');

END $$;

-- === Boogie ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Boogie'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'boogie');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'boogie';

  INSERT INTO models (name, brand_id) SELECT 'Beast ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'beast ');

END $$;

-- === Borgward ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Borgward'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'borgward');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'borgward';

  INSERT INTO models (name, brand_id) SELECT 'Isabella', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'isabella');

END $$;

-- === Brilliance ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'brilliance';

  INSERT INTO models (name, brand_id) SELECT 'Cargo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cargo');

  INSERT INTO models (name, brand_id) SELECT 'Deluxe', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'deluxe');

  INSERT INTO models (name, brand_id) SELECT 'G05 ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'g05 ');

  INSERT INTO models (name, brand_id) SELECT 'H2l', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h2l');

  INSERT INTO models (name, brand_id) SELECT 'Mini Bus', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mini bus');

  INSERT INTO models (name, brand_id) SELECT 'Shineray G05', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'shineray g05');

  INSERT INTO models (name, brand_id) SELECT 'T32', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't32');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't32';
  INSERT INTO versions (name, model_id) SELECT 'T32 Doble Cabina ', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't32 doble cabina ');

  INSERT INTO models (name, brand_id) SELECT 'T50', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't50');

  INSERT INTO models (name, brand_id) SELECT 'T52', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't52');

  INSERT INTO models (name, brand_id) SELECT 'X30', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x30');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't30';
  INSERT INTO versions (name, model_id) SELECT 'T30 Cs 1.5 5M', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't30 cs 1.5 5m');

END $$;

-- === Buggy ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Buggy'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'buggy');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'buggy';

  INSERT INTO models (name, brand_id) SELECT 'Can-Am', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'can-am');

  INSERT INTO models (name, brand_id) SELECT 'Z6 R1', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'z6 r1');

END $$;

-- === Buick ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'buick';

  INSERT INTO models (name, brand_id) SELECT 'Century', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'century');

  INSERT INTO models (name, brand_id) SELECT 'Enclave CXL', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'enclave cxl');

  INSERT INTO models (name, brand_id) SELECT 'Le Sabre', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'le sabre');

  INSERT INTO models (name, brand_id) SELECT 'Regal', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'regal');

  INSERT INTO models (name, brand_id) SELECT 'Riviera', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'riviera');

  INSERT INTO models (name, brand_id) SELECT 'Roadmaster', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'roadmaster');

END $$;

-- === BYD ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'byd';

  INSERT INTO models (name, brand_id) SELECT 'F3r', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f3r');

  INSERT INTO models (name, brand_id) SELECT 'F6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f6');

  INSERT INTO models (name, brand_id) SELECT 'Qin', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'qin');

  INSERT INTO models (name, brand_id) SELECT 'Sealion 7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sealion 7');

  INSERT INTO models (name, brand_id) SELECT 'T3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't3');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dolphin';
  INSERT INTO versions (name, model_id) SELECT 'Dolphin Mini', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dolphin mini');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f3';
  INSERT INTO versions (name, model_id) SELECT 'F3-R', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'f3-r');

END $$;

-- === Cadillac ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'cadillac';

  INSERT INTO models (name, brand_id) SELECT 'Ats-V', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ats-v');

  INSERT INTO models (name, brand_id) SELECT 'Coupe', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'coupe');

  INSERT INTO models (name, brand_id) SELECT 'Ct6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ct6');

  INSERT INTO models (name, brand_id) SELECT 'Cts', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cts');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cts';
  INSERT INTO versions (name, model_id) SELECT 'Cts-V', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cts-v');

  INSERT INTO models (name, brand_id) SELECT 'Deville', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'deville');

  INSERT INTO models (name, brand_id) SELECT 'Escalade', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'escalade');

  INSERT INTO models (name, brand_id) SELECT 'Fleetwood', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fleetwood');

  INSERT INTO models (name, brand_id) SELECT 'Seville', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'seville');

  INSERT INTO models (name, brand_id) SELECT 'Srx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'srx');

  INSERT INTO models (name, brand_id) SELECT 'Sts', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sts');

  INSERT INTO models (name, brand_id) SELECT 'Xt5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xt5');

END $$;

-- === Can-am ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'can-am';

  INSERT INTO models (name, brand_id) SELECT 'Mavarick Xrs', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mavarick xrs');

  INSERT INTO models (name, brand_id) SELECT 'Maverick', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'maverick');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'maverick';
  INSERT INTO versions (name, model_id) SELECT 'Maverick X3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'maverick x3');

END $$;

-- === Caterham ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'caterham';

  INSERT INTO models (name, brand_id) SELECT '485', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '485');

  INSERT INTO models (name, brand_id) SELECT 'Ds7 Crossback', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ds7 crossback');

END $$;

-- === Chana ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Chana'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'chana');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'chana';

  INSERT INTO models (name, brand_id) SELECT 'Benni', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'benni');

  INSERT INTO models (name, brand_id) SELECT 'Cargo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cargo');

  INSERT INTO models (name, brand_id) SELECT 'Pickup', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pickup');

END $$;

-- === Changan ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'changan';

  INSERT INTO models (name, brand_id) SELECT 'Cargo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cargo');

  INSERT INTO models (name, brand_id) SELECT 'Cf15', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cf15');

  INSERT INTO models (name, brand_id) SELECT 'Lumin', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lumin');

  INSERT INTO models (name, brand_id) SELECT 'Md301', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'md301');

  INSERT INTO models (name, brand_id) SELECT 'Pick Up', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pick up');

  INSERT INTO models (name, brand_id) SELECT 'Star Truck', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'star truck');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cs15';
  INSERT INTO versions (name, model_id) SELECT 'Cs15 Plus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cs15 plus');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cs35';
  INSERT INTO versions (name, model_id) SELECT 'Cs35 Max', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cs35 max');
  INSERT INTO versions (name, model_id) SELECT 'Cs35 Plus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cs35 plus');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cs55';
  INSERT INTO versions (name, model_id) SELECT 'Cs55 Plus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cs55 plus');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx70';
  INSERT INTO versions (name, model_id) SELECT 'Cx70 Luxury 1.6', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cx70 luxury 1.6');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eado';
  INSERT INTO versions (name, model_id) SELECT 'Eado Plus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eado plus');

END $$;

-- === Changfeng ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Changfeng'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'changfeng');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'changfeng';

  INSERT INTO models (name, brand_id) SELECT 'Liebao', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'liebao');

END $$;

-- === Changhe ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Changhe'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'changhe');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'changhe';

  INSERT INTO models (name, brand_id) SELECT 'Spla', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spla');

END $$;

-- === Chery ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'chery';

  INSERT INTO models (name, brand_id) SELECT 'A5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a5');

  INSERT INTO models (name, brand_id) SELECT 'Arrizo 6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'arrizo 6');

  INSERT INTO models (name, brand_id) SELECT 'Arrizo3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'arrizo3');

  INSERT INTO models (name, brand_id) SELECT 'Arrizo5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'arrizo5');

  INSERT INTO models (name, brand_id) SELECT 'Arrizo7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'arrizo7');

  INSERT INTO models (name, brand_id) SELECT 'Fulwin2', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fulwin2');

  INSERT INTO models (name, brand_id) SELECT 'Little', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'little');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiggo';
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 2', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 2');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 3');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 4');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 7', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 7');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 8');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 9', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 9');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 2 Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 2 pro');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 3 Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 3 pro');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 7 Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 7 pro');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 8 Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 8 pro');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 2 Pro Max', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 2 pro max');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 4 Pro Max', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 4 pro max');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 7 Pro Max', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 7 pro max');
  INSERT INTO versions (name, model_id) SELECT 'Tiggo 8 Pro Max', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiggo 8 pro max');

END $$;

-- === Chevrolet ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'chevrolet';

  INSERT INTO models (name, brand_id) SELECT '260E', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '260e');

  INSERT INTO models (name, brand_id) SELECT '3100', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '3100');

  INSERT INTO models (name, brand_id) SELECT '400', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '400');

  INSERT INTO models (name, brand_id) SELECT '51', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '51');

  INSERT INTO models (name, brand_id) SELECT 'A', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a');

  INSERT INTO models (name, brand_id) SELECT 'Aska', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aska');

  INSERT INTO models (name, brand_id) SELECT 'B-10', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'b-10');

  INSERT INTO models (name, brand_id) SELECT 'B-20', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'b-20');

  INSERT INTO models (name, brand_id) SELECT 'Bel Air', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bel air');

  INSERT INTO models (name, brand_id) SELECT 'Beretta', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'beretta');

  INSERT INTO models (name, brand_id) SELECT 'Bolt', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bolt');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bolt';
  INSERT INTO versions (name, model_id) SELECT 'Bolt Euv', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'bolt euv');

  INSERT INTO models (name, brand_id) SELECT 'Business', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'business');

  INSERT INTO models (name, brand_id) SELECT 'Byscayne', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'byscayne');

  INSERT INTO models (name, brand_id) SELECT 'C-20', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c-20');

  INSERT INTO models (name, brand_id) SELECT 'Caprice', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'caprice');

  INSERT INTO models (name, brand_id) SELECT 'Carry All', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'carry all');

  INSERT INTO models (name, brand_id) SELECT 'Celebrity', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'celebrity');

  INSERT INTO models (name, brand_id) SELECT 'Chevelle', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'chevelle');

  INSERT INTO models (name, brand_id) SELECT 'Chevy', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'chevy');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'chevy';
  INSERT INTO versions (name, model_id) SELECT 'Chevy Nova', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'chevy nova');

  INSERT INTO models (name, brand_id) SELECT 'Corsica', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'corsica');

  INSERT INTO models (name, brand_id) SELECT 'Corvair', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'corvair');

  INSERT INTO models (name, brand_id) SELECT 'D-40', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd-40');

  INSERT INTO models (name, brand_id) SELECT 'D-Max', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd-max');

  INSERT INTO models (name, brand_id) SELECT 'D-MAX', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd-max');

  INSERT INTO models (name, brand_id) SELECT 'Deluxe', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'deluxe');

  INSERT INTO models (name, brand_id) SELECT 'El Camino', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'el camino');

  INSERT INTO models (name, brand_id) SELECT 'Fleetmaster', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fleetmaster');

  INSERT INTO models (name, brand_id) SELECT 'Frr 1119', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'frr 1119');

  INSERT INTO models (name, brand_id) SELECT 'Ftr 1524', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ftr 1524');

  INSERT INTO models (name, brand_id) SELECT 'Fvr 1826', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fvr 1826');

  INSERT INTO models (name, brand_id) SELECT 'Gemini', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gemini');

  INSERT INTO models (name, brand_id) SELECT 'HHR 2.0 AUT', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hhr 2.0 aut');

  INSERT INTO models (name, brand_id) SELECT 'Malibu', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'malibu');

  INSERT INTO models (name, brand_id) SELECT 'Marajo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'marajo');

  INSERT INTO models (name, brand_id) SELECT 'Monte Carlo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'monte carlo');

  INSERT INTO models (name, brand_id) SELECT 'N300', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'n300');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'n300';
  INSERT INTO versions (name, model_id) SELECT 'N300 Max', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'n300 max');

  INSERT INTO models (name, brand_id) SELECT 'Nkr', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nkr');

  INSERT INTO models (name, brand_id) SELECT 'Nomad', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nomad');

  INSERT INTO models (name, brand_id) SELECT 'Nova', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nova');

  INSERT INTO models (name, brand_id) SELECT 'Opala', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'opala');

  INSERT INTO models (name, brand_id) SELECT 'Pick Up', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pick up');

  INSERT INTO models (name, brand_id) SELECT 'Scottdale', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'scottdale');

  INSERT INTO models (name, brand_id) SELECT 'Spectrum', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spectrum');

  INSERT INTO models (name, brand_id) SELECT 'SSR', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ssr');

  INSERT INTO models (name, brand_id) SELECT 'Vega', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vega');

  INSERT INTO models (name, brand_id) SELECT 'Veraneio', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'veraneio');

  INSERT INTO models (name, brand_id) SELECT 'Volt', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'volt');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'astra';
  INSERT INTO versions (name, model_id) SELECT 'Astra II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'astra ii');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'astro';
  INSERT INTO versions (name, model_id) SELECT 'Astro Van', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'astro van');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aveo';
  INSERT INTO versions (name, model_id) SELECT 'Aveo II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'aveo ii');
  INSERT INTO versions (name, model_id) SELECT 'Aveo III', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'aveo iii');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'blazer';
  INSERT INTO versions (name, model_id) SELECT 'Blazer Ev', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'blazer ev');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'captiva';
  INSERT INTO versions (name, model_id) SELECT 'Captiva Ev', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'captiva ev');
  INSERT INTO versions (name, model_id) SELECT 'Captiva II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'captiva ii');
  INSERT INTO versions (name, model_id) SELECT 'Captiva Phev', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'captiva phev');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'combo';
  INSERT INTO versions (name, model_id) SELECT 'Combo II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'combo ii');
  INSERT INTO versions (name, model_id) SELECT 'Combo Van', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'combo van');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'corsa';
  INSERT INTO versions (name, model_id) SELECT 'Corsa Plus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'corsa plus');
  INSERT INTO versions (name, model_id) SELECT 'Corsa Evolution', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'corsa evolution');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'equinox';
  INSERT INTO versions (name, model_id) SELECT 'Equinox Ev', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'equinox ev');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'luv';
  INSERT INTO versions (name, model_id) SELECT 'Luv D-Max', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luv d-max');
  INSERT INTO versions (name, model_id) SELECT 'Luv Wagon', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luv wagon');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'montana';
  INSERT INTO versions (name, model_id) SELECT 'Montana Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'montana sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'onix';
  INSERT INTO versions (name, model_id) SELECT 'Onix Hb', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'onix hb');
  INSERT INTO versions (name, model_id) SELECT 'Onix Sedan', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'onix sedan');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sail';
  INSERT INTO versions (name, model_id) SELECT 'Sail Hb', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sail hb');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spark';
  INSERT INTO versions (name, model_id) SELECT 'Spark Gt', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'spark gt');
  INSERT INTO versions (name, model_id) SELECT 'Spark  Gt', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'spark  gt');
  INSERT INTO versions (name, model_id) SELECT 'Spark Euv', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'spark euv');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'uplander';
  INSERT INTO versions (name, model_id) SELECT 'Uplander Ls', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'uplander ls');

END $$;

-- === Chrysler ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'chrysler';

  INSERT INTO models (name, brand_id) SELECT '300C', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '300c');

  INSERT INTO models (name, brand_id) SELECT '300M', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '300m');

  INSERT INTO models (name, brand_id) SELECT 'Desoto', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'desoto');

  INSERT INTO models (name, brand_id) SELECT 'Durango', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'durango');

  INSERT INTO models (name, brand_id) SELECT 'Grand Town Country', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand town country');

  INSERT INTO models (name, brand_id) SELECT 'Imperial', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'imperial');

  INSERT INTO models (name, brand_id) SELECT 'Lebaron', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lebaron');

  INSERT INTO models (name, brand_id) SELECT 'New Yorker', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'new yorker');

  INSERT INTO models (name, brand_id) SELECT 'Town Country', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'town country');

  INSERT INTO models (name, brand_id) SELECT 'Viper', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'viper');

  INSERT INTO models (name, brand_id) SELECT 'Windsor', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'windsor');

END $$;

-- === Citroën ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'citroën';

  INSERT INTO models (name, brand_id) SELECT '11', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '11');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '11';
  INSERT INTO versions (name, model_id) SELECT '11 Ligero', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '11 ligero');

  INSERT INTO models (name, brand_id) SELECT '13Hp', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '13hp');

  INSERT INTO models (name, brand_id) SELECT '2Cv6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2cv6');

  INSERT INTO models (name, brand_id) SELECT 'Ak 6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ak 6');

  INSERT INTO models (name, brand_id) SELECT 'AK6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ak6');

  INSERT INTO models (name, brand_id) SELECT 'Azam', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'azam');

  INSERT INTO models (name, brand_id) SELECT 'B', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'b');

  INSERT INTO models (name, brand_id) SELECT 'Basalt', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'basalt');

  INSERT INTO models (name, brand_id) SELECT 'C-Elysée', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c-elysée');

  INSERT INTO models (name, brand_id) SELECT 'Cerato', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cerato');

  INSERT INTO models (name, brand_id) SELECT 'D19', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd19');

  INSERT INTO models (name, brand_id) SELECT 'Ds 3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ds 3');

  INSERT INTO models (name, brand_id) SELECT 'Gs', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gs');

  INSERT INTO models (name, brand_id) SELECT 'Id 19', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'id 19');

  INSERT INTO models (name, brand_id) SELECT 'Visa', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'visa');

  INSERT INTO models (name, brand_id) SELECT 'Xsara2', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xsara2');

  INSERT INTO models (name, brand_id) SELECT 'Yagan', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'yagan');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'berlingo';
  INSERT INTO versions (name, model_id) SELECT 'Berlingo Multispace', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'berlingo multispace');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c3';
  INSERT INTO versions (name, model_id) SELECT 'C3 Picasso', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c3 picasso');
  INSERT INTO versions (name, model_id) SELECT 'C3 Pluriel', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c3 pluriel');
  INSERT INTO versions (name, model_id) SELECT 'C3 Aircross', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c3 aircross');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c4';
  INSERT INTO versions (name, model_id) SELECT 'C4 Cactus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c4 cactus');
  INSERT INTO versions (name, model_id) SELECT 'C4 Picasso', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c4 picasso');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c5';
  INSERT INTO versions (name, model_id) SELECT 'C5 Aircross', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c5 aircross');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xsara';
  INSERT INTO versions (name, model_id) SELECT 'Xsara 2', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xsara 2');
  INSERT INTO versions (name, model_id) SELECT 'Xsara Picasso', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xsara picasso');

END $$;

-- === Cobra ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Cobra'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'cobra');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'cobra';

  INSERT INTO models (name, brand_id) SELECT 'Backdraft Racing', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'backdraft racing');

  INSERT INTO models (name, brand_id) SELECT 'MKIII', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mkiii');

END $$;

-- === Cupra ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'cupra';

  INSERT INTO models (name, brand_id) SELECT 'Formentor  ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'formentor  ');

  INSERT INTO models (name, brand_id) SELECT 'Tavascan', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tavascan');

  INSERT INTO models (name, brand_id) SELECT 'Terramar', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'terramar');

  INSERT INTO models (name, brand_id) SELECT 'Travascan', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'travascan');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'formentor';
  INSERT INTO versions (name, model_id) SELECT 'Formentor VZ', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'formentor vz');
  INSERT INTO versions (name, model_id) SELECT 'Formentor VZ5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'formentor vz5');

END $$;

-- === Daewoo ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'daewoo';

  INSERT INTO models (name, brand_id) SELECT 'Geyer', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'geyer');

  INSERT INTO models (name, brand_id) SELECT 'Super Salon', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'super salon');

END $$;

-- === Daihatsu ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'daihatsu';

  INSERT INTO models (name, brand_id) SELECT 'Charmant', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'charmant');

  INSERT INTO models (name, brand_id) SELECT 'Delta', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'delta');

  INSERT INTO models (name, brand_id) SELECT 'Gran Move', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gran move');

  INSERT INTO models (name, brand_id) SELECT 'Hijet', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hijet');

  INSERT INTO models (name, brand_id) SELECT 'Rush', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rush');

  INSERT INTO models (name, brand_id) SELECT 'Stage', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'stage');

  INSERT INTO models (name, brand_id) SELECT 'Taft', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'taft');

END $$;

-- === Datsun ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'datsun';

  INSERT INTO models (name, brand_id) SELECT '120-A', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '120-a');

  INSERT INTO models (name, brand_id) SELECT '120-Y', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '120-y');

  INSERT INTO models (name, brand_id) SELECT '1200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1200');

  INSERT INTO models (name, brand_id) SELECT '130-A', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '130-a');

  INSERT INTO models (name, brand_id) SELECT '140-Y', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '140-y');

  INSERT INTO models (name, brand_id) SELECT '150-Y', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '150-y');

  INSERT INTO models (name, brand_id) SELECT '260-C', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '260-c');

  INSERT INTO models (name, brand_id) SELECT 'King-Cab', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'king-cab');

  INSERT INTO models (name, brand_id) SELECT 'Laurel', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'laurel');

  INSERT INTO models (name, brand_id) SELECT 'Sedan', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sedan');

  INSERT INTO models (name, brand_id) SELECT 'Sunny', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sunny');

END $$;

-- === Deepal ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'deepal';

  INSERT INTO models (name, brand_id) SELECT 'S05', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's05');

  INSERT INTO models (name, brand_id) SELECT 'S07', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's07');

END $$;

-- === Dflm ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Dflm'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'dflm');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'dflm';

  INSERT INTO models (name, brand_id) SELECT 'S50 EV AUT', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's50 ev aut');

  INSERT INTO models (name, brand_id) SELECT 'X3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x3');

END $$;

-- === Dfm ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'dfm';

  INSERT INTO models (name, brand_id) SELECT '560', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '560');

  INSERT INTO models (name, brand_id) SELECT '580', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '580');

  INSERT INTO models (name, brand_id) SELECT 'Cargo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cargo');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cargo';
  INSERT INTO versions (name, model_id) SELECT 'Cargo Van', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cargo van');

  INSERT INTO models (name, brand_id) SELECT 'Elegant', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'elegant');

  INSERT INTO models (name, brand_id) SELECT 'Eq1020', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eq1020');

  INSERT INTO models (name, brand_id) SELECT 'Eq1021', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eq1021');

  INSERT INTO models (name, brand_id) SELECT 'Eq5021', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eq5021');

  INSERT INTO models (name, brand_id) SELECT 'Eq6380', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eq6380');

  INSERT INTO models (name, brand_id) SELECT 'S500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's500');

  INSERT INTO models (name, brand_id) SELECT 'Sx5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sx5');

  INSERT INTO models (name, brand_id) SELECT 'Tripcrew', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tripcrew');

  INSERT INTO models (name, brand_id) SELECT 'Truck', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'truck');

  INSERT INTO models (name, brand_id) SELECT 'Van', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'van');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h30';
  INSERT INTO versions (name, model_id) SELECT 'H30 Cross', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'h30 cross');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'joyear';
  INSERT INTO versions (name, model_id) SELECT 'Joyear X3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'joyear x3');

END $$;

-- === DFSK ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'dfsk';

  INSERT INTO models (name, brand_id) SELECT 'D1', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd1');

  INSERT INTO models (name, brand_id) SELECT 'Df 212', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'df 212');

  INSERT INTO models (name, brand_id) SELECT 'Ec35', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ec35');

  INSERT INTO models (name, brand_id) SELECT 'Furgon Refritruck', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'furgon refritruck');

  INSERT INTO models (name, brand_id) SELECT 'Mini Truck', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mini truck');

  INSERT INTO models (name, brand_id) SELECT 'Sc XL', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sc xl');

  INSERT INTO models (name, brand_id) SELECT 'Serie C', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie c');

  INSERT INTO models (name, brand_id) SELECT 'Serie K', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie k');

  INSERT INTO models (name, brand_id) SELECT 'Serie V', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie v');

  INSERT INTO models (name, brand_id) SELECT 'Z9', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'z9');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'truck';
  INSERT INTO versions (name, model_id) SELECT 'Truck Xl 1.3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'truck xl 1.3');

END $$;

-- === Dkw ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Dkw'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'dkw');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'dkw';

  INSERT INTO models (name, brand_id) SELECT 'Auto-Union', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'auto-union');

END $$;

-- === Dodge ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'dodge';

  INSERT INTO models (name, brand_id) SELECT 'Ail', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ail');

  INSERT INTO models (name, brand_id) SELECT 'Aries', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aries');

  INSERT INTO models (name, brand_id) SELECT 'Aspen', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aspen');

  INSERT INTO models (name, brand_id) SELECT 'Caravan', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'caravan');

  INSERT INTO models (name, brand_id) SELECT 'Colt', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'colt');

  INSERT INTO models (name, brand_id) SELECT 'Coronet', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'coronet');

  INSERT INTO models (name, brand_id) SELECT 'Durnago', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'durnago');

  INSERT INTO models (name, brand_id) SELECT 'Galant', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'galant');

  INSERT INTO models (name, brand_id) SELECT 'M 37B1', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm 37b1');

  INSERT INTO models (name, brand_id) SELECT 'Magnum', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'magnum');

  INSERT INTO models (name, brand_id) SELECT 'Polara', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'polara');

  INSERT INTO models (name, brand_id) SELECT 'Six Brother', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'six brother');

  INSERT INTO models (name, brand_id) SELECT 'Sportsman', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sportsman');

  INSERT INTO models (name, brand_id) SELECT 'Van', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'van');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ram';
  INSERT INTO versions (name, model_id) SELECT 'Ram 700', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ram 700');
  INSERT INTO versions (name, model_id) SELECT 'Ram 1500', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ram 1500');
  INSERT INTO versions (name, model_id) SELECT 'Ram 2500', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ram 2500');
  INSERT INTO versions (name, model_id) SELECT 'Ram Pickup', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ram pickup');

END $$;

-- === Dongfeng ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'dongfeng';

  INSERT INTO models (name, brand_id) SELECT 'Aeolus Gs', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aeolus gs');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aeolus gs';
  INSERT INTO versions (name, model_id) SELECT 'Aeolus Gs Cross', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'aeolus gs cross');

  INSERT INTO models (name, brand_id) SELECT 'Aeolus Y3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aeolus y3');

  INSERT INTO models (name, brand_id) SELECT 'Df', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'df');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'df';
  INSERT INTO versions (name, model_id) SELECT 'DF 412', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'df 412');
  INSERT INTO versions (name, model_id) SELECT 'Df-2500', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'df-2500');
  INSERT INTO versions (name, model_id) SELECT 'Df-2900', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'df-2900');

  INSERT INTO models (name, brand_id) SELECT 'Df1516', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'df1516');

  INSERT INTO models (name, brand_id) SELECT 'DF212', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'df212');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'df212';
  INSERT INTO versions (name, model_id) SELECT 'DF212 PLUS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'df212 plus');
  INSERT INTO versions (name, model_id) SELECT 'DF212 PLUS DC', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'df212 plus dc');

  INSERT INTO models (name, brand_id) SELECT 'Eq1020', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eq1020');

  INSERT INTO models (name, brand_id) SELECT 'Huge', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'huge');

  INSERT INTO models (name, brand_id) SELECT 'Joyear ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'joyear ');

  INSERT INTO models (name, brand_id) SELECT 'K61 921', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'k61 921');

  INSERT INTO models (name, brand_id) SELECT 'Mini Truck', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mini truck');

  INSERT INTO models (name, brand_id) SELECT 'Ministar', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ministar');

  INSERT INTO models (name, brand_id) SELECT 'Nammi 001', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nammi 001');

  INSERT INTO models (name, brand_id) SELECT 'Panelvan', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'panelvan');

  INSERT INTO models (name, brand_id) SELECT 'Refritruck', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'refritruck');

  INSERT INTO models (name, brand_id) SELECT 'Spark Lite', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spark lite');

  INSERT INTO models (name, brand_id) SELECT 'T5l', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't5l');

  INSERT INTO models (name, brand_id) SELECT 'Truck', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'truck');

  INSERT INTO models (name, brand_id) SELECT 'Z9', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'z9');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h30';
  INSERT INTO versions (name, model_id) SELECT 'H30 Cross', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'h30 cross');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'joyear';
  INSERT INTO versions (name, model_id) SELECT 'Joyear X3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'joyear x3');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rich';
  INSERT INTO versions (name, model_id) SELECT 'Rich 6', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rich 6');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's50';
  INSERT INTO versions (name, model_id) SELECT 'S50 Eve', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's50 eve');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't5';
  INSERT INTO versions (name, model_id) SELECT 'T5 Evo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't5 evo');

END $$;

-- === DS ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'ds';

  INSERT INTO models (name, brand_id) SELECT 'Ds 3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ds 3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ds 3';
  INSERT INTO versions (name, model_id) SELECT 'Ds 3 Crossback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ds 3 crossback');
  INSERT INTO versions (name, model_id) SELECT 'Ds 3 Crossback E-Tense', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ds 3 crossback e-tense');

  INSERT INTO models (name, brand_id) SELECT 'Ds 4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ds 4');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ds 4';
  INSERT INTO versions (name, model_id) SELECT 'Ds 4 Crossback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ds 4 crossback');

  INSERT INTO models (name, brand_id) SELECT 'Ds 5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ds 5');

  INSERT INTO models (name, brand_id) SELECT 'Ds 7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ds 7');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ds 7';
  INSERT INTO versions (name, model_id) SELECT 'Ds 7 Crossback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ds 7 crossback');

  INSERT INTO models (name, brand_id) SELECT 'Ds7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ds7');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ds7';
  INSERT INTO versions (name, model_id) SELECT 'Ds7 Crossback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ds7 crossback');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ds4';
  INSERT INTO versions (name, model_id) SELECT 'Ds4 Performance Line', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ds4 performance line');

END $$;

-- === Euromot ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Euromot'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'euromot');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'euromot';

  INSERT INTO models (name, brand_id) SELECT 'Hj', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hj');

END $$;

-- === Exeed ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'exeed';

  INSERT INTO models (name, brand_id) SELECT 'Lx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lx');

  INSERT INTO models (name, brand_id) SELECT 'Rx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rx');

  INSERT INTO models (name, brand_id) SELECT 'Vx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vx');

END $$;

-- === Farizon ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Farizon'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'farizon');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'farizon';

  INSERT INTO models (name, brand_id) SELECT 'V6e', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v6e');

END $$;

-- === Farmtrac ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Farmtrac'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'farmtrac');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'farmtrac';

  INSERT INTO models (name, brand_id) SELECT 'Farmall', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'farmall');

END $$;

-- === FAW ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'faw';

  INSERT INTO models (name, brand_id) SELECT 'Mamut', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mamut');

  INSERT INTO models (name, brand_id) SELECT 'T80', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't80');

  INSERT INTO models (name, brand_id) SELECT 'V80', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v80');

END $$;

-- === Ferrari ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'ferrari';

  INSERT INTO models (name, brand_id) SELECT '12Cilindri', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '12cilindri');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '12cilindri';
  INSERT INTO versions (name, model_id) SELECT '12Cilindri', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '12cilindri');
  INSERT INTO versions (name, model_id) SELECT '12Cilindri Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '12cilindri spider');

  INSERT INTO models (name, brand_id) SELECT '296', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '296');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '296';
  INSERT INTO versions (name, model_id) SELECT 'GTB', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gtb');
  INSERT INTO versions (name, model_id) SELECT 'GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gts');

  INSERT INTO models (name, brand_id) SELECT '308 GTS', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '308 gts');

  INSERT INTO models (name, brand_id) SELECT '328 GTS', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '328 gts');

  INSERT INTO models (name, brand_id) SELECT '348', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '348');

  INSERT INTO models (name, brand_id) SELECT '355', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '355');

  INSERT INTO models (name, brand_id) SELECT '360', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '360');

  INSERT INTO models (name, brand_id) SELECT '456', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '456');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '456';
  INSERT INTO versions (name, model_id) SELECT '456 5.5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '456 5.5');

  INSERT INTO models (name, brand_id) SELECT '488', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '488');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '488';
  INSERT INTO versions (name, model_id) SELECT 'GTB', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gtb');
  INSERT INTO versions (name, model_id) SELECT 'Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'spider');
  INSERT INTO versions (name, model_id) SELECT 'Pista', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'pista');
  INSERT INTO versions (name, model_id) SELECT 'Pista Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'pista spider');

  INSERT INTO models (name, brand_id) SELECT '599', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '599');

  INSERT INTO models (name, brand_id) SELECT '812', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '812');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '812';
  INSERT INTO versions (name, model_id) SELECT 'Superfast', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'superfast');
  INSERT INTO versions (name, model_id) SELECT 'GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gts');
  INSERT INTO versions (name, model_id) SELECT 'Competizione', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'competizione');
  INSERT INTO versions (name, model_id) SELECT 'Competizione A', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'competizione a');

  INSERT INTO models (name, brand_id) SELECT 'California', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'california');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'california';
  INSERT INTO versions (name, model_id) SELECT 'California', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'california');
  INSERT INTO versions (name, model_id) SELECT 'California T', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'california t');

  INSERT INTO models (name, brand_id) SELECT 'F12', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f12');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f12';
  INSERT INTO versions (name, model_id) SELECT 'Berlinetta', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'berlinetta');
  INSERT INTO versions (name, model_id) SELECT 'TdF', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tdf');

  INSERT INTO models (name, brand_id) SELECT 'F430', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f430');

  INSERT INTO models (name, brand_id) SELECT 'F8', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f8');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f8';
  INSERT INTO versions (name, model_id) SELECT 'Tributo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tributo');
  INSERT INTO versions (name, model_id) SELECT 'Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'spider');

  INSERT INTO models (name, brand_id) SELECT 'Ff', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ff');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ff';
  INSERT INTO versions (name, model_id) SELECT 'FF', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ff');

  INSERT INTO models (name, brand_id) SELECT 'Gtc 4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gtc 4');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gtc 4';
  INSERT INTO versions (name, model_id) SELECT 'Lusso', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lusso');
  INSERT INTO versions (name, model_id) SELECT 'Lusso T', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lusso t');

  INSERT INTO models (name, brand_id) SELECT 'Portofino', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'portofino');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'portofino';
  INSERT INTO versions (name, model_id) SELECT 'Portofino', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'portofino');
  INSERT INTO versions (name, model_id) SELECT 'Portofino M', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'portofino m');

  INSERT INTO models (name, brand_id) SELECT 'Purosangue', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'purosangue');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'purosangue';
  INSERT INTO versions (name, model_id) SELECT 'Purosangue', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'purosangue');

  INSERT INTO models (name, brand_id) SELECT 'Roma', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'roma');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'roma';
  INSERT INTO versions (name, model_id) SELECT 'Roma', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'roma');
  INSERT INTO versions (name, model_id) SELECT 'Roma Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'roma spider');

  INSERT INTO models (name, brand_id) SELECT 'Sf90', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sf90');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sf90';
  INSERT INTO versions (name, model_id) SELECT 'Stradale', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'stradale');
  INSERT INTO versions (name, model_id) SELECT 'Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'spider');
  INSERT INTO versions (name, model_id) SELECT 'XX Stradale', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xx stradale');
  INSERT INTO versions (name, model_id) SELECT 'XX Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xx spider');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '458';
  INSERT INTO versions (name, model_id) SELECT 'Italia', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'italia');
  INSERT INTO versions (name, model_id) SELECT 'Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'spider');
  INSERT INTO versions (name, model_id) SELECT 'Speciale', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'speciale');
  INSERT INTO versions (name, model_id) SELECT 'Speciale A', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'speciale a');

END $$;

-- === Fest ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Fest'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'fest');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'fest';

  INSERT INTO models (name, brand_id) SELECT 'Ebox-M', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ebox-m');

END $$;

-- === Fiat ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'fiat';

  INSERT INTO models (name, brand_id) SELECT '1100', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1100');

  INSERT INTO models (name, brand_id) SELECT '1200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1200');

  INSERT INTO models (name, brand_id) SELECT '124', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '124');

  INSERT INTO models (name, brand_id) SELECT '128', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '128');

  INSERT INTO models (name, brand_id) SELECT '131', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '131');

  INSERT INTO models (name, brand_id) SELECT '140', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '140');

  INSERT INTO models (name, brand_id) SELECT '1500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1500');

  INSERT INTO models (name, brand_id) SELECT '500 ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '500 ');

  INSERT INTO models (name, brand_id) SELECT '595 Tjet Hb 1.4  ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '595 tjet hb 1.4  ');

  INSERT INTO models (name, brand_id) SELECT '673', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '673');

  INSERT INTO models (name, brand_id) SELECT 'Barchetta', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'barchetta');

  INSERT INTO models (name, brand_id) SELECT 'Bartone X1/9', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bartone x1/9');

  INSERT INTO models (name, brand_id) SELECT 'Coupe 2.0', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'coupe 2.0');

  INSERT INTO models (name, brand_id) SELECT 'Dobl', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dobl');

  INSERT INTO models (name, brand_id) SELECT 'Dobló', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dobló');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dobló';
  INSERT INTO versions (name, model_id) SELECT 'Doblo Cargo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'doblo cargo');

  INSERT INTO models (name, brand_id) SELECT 'Doblò', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'doblò');

  INSERT INTO models (name, brand_id) SELECT 'Grande Punto', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grande punto');

  INSERT INTO models (name, brand_id) SELECT 'Ram 700', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ram 700');

  INSERT INTO models (name, brand_id) SELECT 'Spyder', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spyder');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fiorino';
  INSERT INTO versions (name, model_id) SELECT 'Fiorino City', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'fiorino city');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'punto';
  INSERT INTO versions (name, model_id) SELECT 'Punto Evo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'punto evo');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'uno';
  INSERT INTO versions (name, model_id) SELECT 'Uno Cargo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'uno cargo');

END $$;

-- === Ford ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'ford';

  INSERT INTO models (name, brand_id) SELECT '1939', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1939');

  INSERT INTO models (name, brand_id) SELECT '1946', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1946');

  INSERT INTO models (name, brand_id) SELECT '350', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '350');

  INSERT INTO models (name, brand_id) SELECT '56', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '56');

  INSERT INTO models (name, brand_id) SELECT 'A', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a');

  INSERT INTO models (name, brand_id) SELECT 'Anglia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'anglia');

  INSERT INTO models (name, brand_id) SELECT 'Belina', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'belina');

  INSERT INTO models (name, brand_id) SELECT 'C-Max', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c-max');

  INSERT INTO models (name, brand_id) SELECT 'Capri', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'capri');

  INSERT INTO models (name, brand_id) SELECT 'Cargo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cargo');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cargo';
  INSERT INTO versions (name, model_id) SELECT 'Cargo 1317', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cargo 1317');

  INSERT INTO models (name, brand_id) SELECT 'Cobra', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cobra');

  INSERT INTO models (name, brand_id) SELECT 'Consul', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'consul');

  INSERT INTO models (name, brand_id) SELECT 'Cortina', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cortina');

  INSERT INTO models (name, brand_id) SELECT 'Country', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'country');

  INSERT INTO models (name, brand_id) SELECT 'Courier', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'courier');

  INSERT INTO models (name, brand_id) SELECT 'Crown Victoria', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'crown victoria');

  INSERT INTO models (name, brand_id) SELECT 'Custom', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'custom');

  INSERT INTO models (name, brand_id) SELECT 'E450', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e450');

  INSERT INTO models (name, brand_id) SELECT 'F-100', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f-100');

  INSERT INTO models (name, brand_id) SELECT 'F-1000', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f-1000');

  INSERT INTO models (name, brand_id) SELECT 'F-4000', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f-4000');

  INSERT INTO models (name, brand_id) SELECT 'F-550', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f-550');

  INSERT INTO models (name, brand_id) SELECT 'F-600', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f-600');

  INSERT INTO models (name, brand_id) SELECT 'Fairlaine', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fairlaine');

  INSERT INTO models (name, brand_id) SELECT 'Fairmont', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fairmont');

  INSERT INTO models (name, brand_id) SELECT 'Falcon', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'falcon');

  INSERT INTO models (name, brand_id) SELECT 'Galaxie', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'galaxie');

  INSERT INTO models (name, brand_id) SELECT 'Granada', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'granada');

  INSERT INTO models (name, brand_id) SELECT 'Kombi', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kombi');

  INSERT INTO models (name, brand_id) SELECT 'Laser', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'laser');

  INSERT INTO models (name, brand_id) SELECT 'Ltd', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ltd');

  INSERT INTO models (name, brand_id) SELECT 'Mercury', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mercury');

  INSERT INTO models (name, brand_id) SELECT 'Navigator', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'navigator');

  INSERT INTO models (name, brand_id) SELECT 'Pinto', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pinto');

  INSERT INTO models (name, brand_id) SELECT 'Prefect', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'prefect');

  INSERT INTO models (name, brand_id) SELECT 'Probe', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'probe');

  INSERT INTO models (name, brand_id) SELECT 'Ranchera', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ranchera');

  INSERT INTO models (name, brand_id) SELECT 'Raptor', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'raptor');

  INSERT INTO models (name, brand_id) SELECT 'Shelby Cobra', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'shelby cobra');

  INSERT INTO models (name, brand_id) SELECT 'Shelby Gt', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'shelby gt');

  INSERT INTO models (name, brand_id) SELECT 'Sierra', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sierra');

  INSERT INTO models (name, brand_id) SELECT 'T', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't');

  INSERT INTO models (name, brand_id) SELECT 'Taunus', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'taunus');

  INSERT INTO models (name, brand_id) SELECT 'Tempo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tempo');

  INSERT INTO models (name, brand_id) SELECT 'Thames', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'thames');

  INSERT INTO models (name, brand_id) SELECT 'Torino', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'torino');

  INSERT INTO models (name, brand_id) SELECT 'Tudor', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tudor');

  INSERT INTO models (name, brand_id) SELECT 'U 50', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'u 50');

  INSERT INTO models (name, brand_id) SELECT 'V6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v6');

  INSERT INTO models (name, brand_id) SELECT 'V8', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v8');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bronco';
  INSERT INTO versions (name, model_id) SELECT 'Bronco Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'bronco sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'edge';
  INSERT INTO versions (name, model_id) SELECT 'Edge St', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'edge st');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'explorer';
  INSERT INTO versions (name, model_id) SELECT 'Explorer St', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'explorer st');
  INSERT INTO versions (name, model_id) SELECT 'Explorer Limited', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'explorer limited');
  INSERT INTO versions (name, model_id) SELECT 'Explorer Sport Trac', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'explorer sport trac');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f-150';
  INSERT INTO versions (name, model_id) SELECT 'F-150 3.5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'f-150 3.5');
  INSERT INTO versions (name, model_id) SELECT 'F-150 Raptor', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'f-150 raptor');
  INSERT INTO versions (name, model_id) SELECT ' F-150 Lightning', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = ' f-150 lightning');
  INSERT INTO versions (name, model_id) SELECT 'F-150 Xlt 5.4 4Wd', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'f-150 xlt 5.4 4wd');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fiesta';
  INSERT INTO versions (name, model_id) SELECT 'Fiesta Hb', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'fiesta hb');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mustang';
  INSERT INTO versions (name, model_id) SELECT 'Mustang Mach-E', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mustang mach-e');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ranger';
  INSERT INTO versions (name, model_id) SELECT 'Ranger Raptor', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ranger raptor');
  INSERT INTO versions (name, model_id) SELECT 'Ranger Heritage', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ranger heritage');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'transit';
  INSERT INTO versions (name, model_id) SELECT 'Transit Custom', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'transit custom');

END $$;

-- === Foton ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'foton';

  INSERT INTO models (name, brand_id) SELECT 'Aumark 613', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aumark 613');

  INSERT INTO models (name, brand_id) SELECT 'FT Box', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ft box');

  INSERT INTO models (name, brand_id) SELECT 'Ft-500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ft-500');

  INSERT INTO models (name, brand_id) SELECT 'Miler', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'miler');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'midi';
  INSERT INTO versions (name, model_id) SELECT 'Midi Cargo Box', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'midi cargo box');
  INSERT INTO versions (name, model_id) SELECT 'Midi Doble Cabina', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'midi doble cabina');
  INSERT INTO versions (name, model_id) SELECT 'Midi Cabina Simple', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'midi cabina simple');

END $$;

-- === Gac Gonow ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Gac Gonow'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'gac gonow');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'gac gonow';

  INSERT INTO models (name, brand_id) SELECT 'Cargo Box', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cargo box');

  INSERT INTO models (name, brand_id) SELECT 'Elite', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'elite');

  INSERT INTO models (name, brand_id) SELECT 'Gonow', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gonow');

  INSERT INTO models (name, brand_id) SELECT 'Way', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'way');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'way';
  INSERT INTO versions (name, model_id) SELECT 'Way Pasajeros', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'way pasajeros');

END $$;

-- === Gac Motor ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'gac motor';

  INSERT INTO models (name, brand_id) SELECT 'Aion Es', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aion es');

  INSERT INTO models (name, brand_id) SELECT 'Aion Y', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aion y');

  INSERT INTO models (name, brand_id) SELECT 'Elite', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'elite');

  INSERT INTO models (name, brand_id) SELECT 'Emkoo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'emkoo');

  INSERT INTO models (name, brand_id) SELECT 'Empow', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'empow');

  INSERT INTO models (name, brand_id) SELECT 'Emzoom', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'emzoom');

  INSERT INTO models (name, brand_id) SELECT 'Ga4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ga4');

  INSERT INTO models (name, brand_id) SELECT 'Ga5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ga5');

  INSERT INTO models (name, brand_id) SELECT 'Gs3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gs3');

  INSERT INTO models (name, brand_id) SELECT 'Gs4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gs4');

  INSERT INTO models (name, brand_id) SELECT 'Gs5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gs5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gs5';
  INSERT INTO versions (name, model_id) SELECT 'Gs5 2.0 At Deluxe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gs5 2.0 at deluxe');

  INSERT INTO models (name, brand_id) SELECT 'Gs8', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gs8');

END $$;

-- === Gecko ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Gecko'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'gecko');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'gecko';

  INSERT INTO models (name, brand_id) SELECT 'Ev48', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ev48');

END $$;

-- === Geely ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'geely';

  INSERT INTO models (name, brand_id) SELECT 'Cityray', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cityray');

  INSERT INTO models (name, brand_id) SELECT 'Emgrand Gs', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'emgrand gs');

  INSERT INTO models (name, brand_id) SELECT 'Emgrand X7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'emgrand x7');

  INSERT INTO models (name, brand_id) SELECT 'Ex2', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ex2');

  INSERT INTO models (name, brand_id) SELECT 'Gc', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gc');

  INSERT INTO models (name, brand_id) SELECT 'Geometry C', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'geometry c');

  INSERT INTO models (name, brand_id) SELECT 'X7 Sport', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x7 sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'coolray';
  INSERT INTO versions (name, model_id) SELECT 'Coolray Lite', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coolray lite');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ec7';
  INSERT INTO versions (name, model_id) SELECT 'Ec7-Rv', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ec7-rv');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gs';
  INSERT INTO versions (name, model_id) SELECT 'Gs Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gs sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lc';
  INSERT INTO versions (name, model_id) SELECT 'Lc Cross', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lc cross');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mk';
  INSERT INTO versions (name, model_id) SELECT 'Mk Rsi', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mk rsi');

END $$;

-- === Gem ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Gem'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'gem');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'gem';

  INSERT INTO models (name, brand_id) SELECT 'E2', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e2');

END $$;

-- === Geo ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Geo'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'geo');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'geo';

  INSERT INTO models (name, brand_id) SELECT 'Prizm', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'prizm');

  INSERT INTO models (name, brand_id) SELECT 'Storm', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'storm');

END $$;

-- === Gilera ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Gilera'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'gilera');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'gilera';

  INSERT INTO models (name, brand_id) SELECT 'Runner', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'runner');

END $$;

-- === GMC ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'gmc';

  INSERT INTO models (name, brand_id) SELECT '500Kg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '500kg');

  INSERT INTO models (name, brand_id) SELECT 'Acadia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'acadia');

  INSERT INTO models (name, brand_id) SELECT 'Apache', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'apache');

  INSERT INTO models (name, brand_id) SELECT 'Blazer', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'blazer');

  INSERT INTO models (name, brand_id) SELECT 'Camino', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'camino');

  INSERT INTO models (name, brand_id) SELECT 'Canyon', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'canyon');

  INSERT INTO models (name, brand_id) SELECT 'Jimmy', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jimmy');

  INSERT INTO models (name, brand_id) SELECT 'Pickup', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pickup');

  INSERT INTO models (name, brand_id) SELECT 'Safari', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'safari');

  INSERT INTO models (name, brand_id) SELECT 'Savana', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'savana');

  INSERT INTO models (name, brand_id) SELECT 'Sierra', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sierra');

  INSERT INTO models (name, brand_id) SELECT 'Sprint', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sprint');

  INSERT INTO models (name, brand_id) SELECT 'Terrain', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'terrain');

  INSERT INTO models (name, brand_id) SELECT 'Vandura', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vandura');

  INSERT INTO models (name, brand_id) SELECT 'Yukon', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'yukon');

END $$;

-- === Great Wall ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'great wall';

  INSERT INTO models (name, brand_id) SELECT 'So Cool', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'so cool');

  INSERT INTO models (name, brand_id) SELECT 'Voleex C20r', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'voleex c20r');

  INSERT INTO models (name, brand_id) SELECT 'Voleex C30', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'voleex c30');

  INSERT INTO models (name, brand_id) SELECT 'Wall 3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wall 3');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'haval';
  INSERT INTO versions (name, model_id) SELECT 'Haval 3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'haval 3');
  INSERT INTO versions (name, model_id) SELECT 'Haval 5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'haval 5');
  INSERT INTO versions (name, model_id) SELECT 'Haval 6', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'haval 6');
  INSERT INTO versions (name, model_id) SELECT 'Haval H2', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'haval h2');
  INSERT INTO versions (name, model_id) SELECT 'Haval H3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'haval h3');
  INSERT INTO versions (name, model_id) SELECT 'Haval H5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'haval h5');
  INSERT INTO versions (name, model_id) SELECT 'Haval H6', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'haval h6');
  INSERT INTO versions (name, model_id) SELECT 'Haval M4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'haval m4');
  INSERT INTO versions (name, model_id) SELECT 'Haval H6 Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'haval h6 sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'poer';
  INSERT INTO versions (name, model_id) SELECT 'Poer Plus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'poer plus');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wingle';
  INSERT INTO versions (name, model_id) SELECT 'Wingle 5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wingle 5');
  INSERT INTO versions (name, model_id) SELECT 'Wingle 6', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wingle 6');
  INSERT INTO versions (name, model_id) SELECT 'Wingle 7', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wingle 7');
  INSERT INTO versions (name, model_id) SELECT 'Wingle 7 Deluxe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wingle 7 deluxe');

END $$;

-- === GWM ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'gwm';

  INSERT INTO models (name, brand_id) SELECT 'Haval Dargo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'haval dargo');

  INSERT INTO models (name, brand_id) SELECT 'Haval H6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'haval h6');

  INSERT INTO models (name, brand_id) SELECT 'Haval H7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'haval h7');

  INSERT INTO models (name, brand_id) SELECT 'Haval Jolion', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'haval jolion');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'haval jolion';
  INSERT INTO versions (name, model_id) SELECT 'Haval Jolion Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'haval jolion pro');

  INSERT INTO models (name, brand_id) SELECT 'Ora 03', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ora 03');

  INSERT INTO models (name, brand_id) SELECT 'Poer', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'poer');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'poer';
  INSERT INTO versions (name, model_id) SELECT 'Poer Plus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'poer plus');

  INSERT INTO models (name, brand_id) SELECT 'Tank 300', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tank 300');

  INSERT INTO models (name, brand_id) SELECT 'Tank 500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tank 500');

  INSERT INTO models (name, brand_id) SELECT 'Wingle 7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wingle 7');

END $$;

-- === Hafei ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'hafei';

  INSERT INTO models (name, brand_id) SELECT '2', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2');

  INSERT INTO models (name, brand_id) SELECT 'Cargo Van', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cargo van');

  INSERT INTO models (name, brand_id) SELECT 'Gl', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gl');

  INSERT INTO models (name, brand_id) SELECT 'Hfj', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hfj');

END $$;

-- === Haima ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'haima';

  INSERT INTO models (name, brand_id) SELECT '2 Glx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2 glx');

  INSERT INTO models (name, brand_id) SELECT '3 Gl', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '3 gl');

  INSERT INTO models (name, brand_id) SELECT '7 Glx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '7 glx');

  INSERT INTO models (name, brand_id) SELECT 'F-Star', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f-star');

  INSERT INTO models (name, brand_id) SELECT 'Haima2', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'haima2');

  INSERT INTO models (name, brand_id) SELECT 'Haima3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'haima3');

  INSERT INTO models (name, brand_id) SELECT 'Haima7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'haima7');

END $$;

-- === Haval ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'haval';

  INSERT INTO models (name, brand_id) SELECT 'Haval H2', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'haval h2');

  INSERT INTO models (name, brand_id) SELECT 'Haval H6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'haval h6');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'haval h6';
  INSERT INTO versions (name, model_id) SELECT 'Haval H6 Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'haval h6 sport');

  INSERT INTO models (name, brand_id) SELECT 'Jolion ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jolion ');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h6';
  INSERT INTO versions (name, model_id) SELECT 'H6 GT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'h6 gt');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jolion';
  INSERT INTO versions (name, model_id) SELECT 'Jolion Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'jolion pro');

END $$;

-- === Higer ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'higer';

  INSERT INTO models (name, brand_id) SELECT 'H 75.30', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h 75.30');

  INSERT INTO models (name, brand_id) SELECT 'I10', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i10');

END $$;

-- === Hillman ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Hillman'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'hillman');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'hillman';

  INSERT INTO models (name, brand_id) SELECT 'Minx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'minx');

END $$;

-- === Honda ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'honda';

  INSERT INTO models (name, brand_id) SELECT 'Cr', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cr');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cr';
  INSERT INTO versions (name, model_id) SELECT 'Cr-V', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cr-v');

  INSERT INTO models (name, brand_id) SELECT 'NSX', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nsx');

  INSERT INTO models (name, brand_id) SELECT 'Quintet', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'quintet');

  INSERT INTO models (name, brand_id) SELECT 'S2000', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's2000');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pilot';
  INSERT INTO versions (name, model_id) SELECT 'Pilot 16300 Klms Nue', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'pilot 16300 klms nue');

END $$;

-- === Huanghai - Sg ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Huanghai - Sg'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'huanghai - sg');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'huanghai - sg';

  INSERT INTO models (name, brand_id) SELECT 'Dd1020g', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dd1020g');

  INSERT INTO models (name, brand_id) SELECT 'Plutus', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'plutus');

  INSERT INTO models (name, brand_id) SELECT 'STEED', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'steed');

END $$;

-- === Hudson ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Hudson'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'hudson');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'hudson';

  INSERT INTO models (name, brand_id) SELECT 'Commodore', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'commodore');

  INSERT INTO models (name, brand_id) SELECT 'Sportphaeton', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sportphaeton');

END $$;

-- === Hummer ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'hummer';

  INSERT INTO models (name, brand_id) SELECT 'GMC Pick Up', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gmc pick up');

  INSERT INTO models (name, brand_id) SELECT 'H2t', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h2t');

  INSERT INTO models (name, brand_id) SELECT 'Hmc4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hmc4');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h3';
  INSERT INTO versions (name, model_id) SELECT 'H3 T', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'h3 t');
  INSERT INTO versions (name, model_id) SELECT 'H3 4X4 Automatico 3.', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'h3 4x4 automatico 3.');

END $$;

-- === Husqvarna ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'husqvarna';

  INSERT INTO models (name, brand_id) SELECT 'Tc', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tc');

  INSERT INTO models (name, brand_id) SELECT 'Te', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'te');

END $$;

-- === Hyosung ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Hyosung'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'hyosung');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'hyosung';

  INSERT INTO models (name, brand_id) SELECT 'Aquila', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aquila');

  INSERT INTO models (name, brand_id) SELECT 'Gd', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gd');

  INSERT INTO models (name, brand_id) SELECT 'Gt', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt');

END $$;

-- === Hyundai ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'hyundai';

  INSERT INTO models (name, brand_id) SELECT '12 DLX', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '12 dlx');

  INSERT INTO models (name, brand_id) SELECT 'Altima', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'altima');

  INSERT INTO models (name, brand_id) SELECT 'H-100', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h-100');

  INSERT INTO models (name, brand_id) SELECT 'H350', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h350');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h350';
  INSERT INTO versions (name, model_id) SELECT 'H350 Solati', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'h350 solati');

  INSERT INTO models (name, brand_id) SELECT 'Hd35', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hd35');

  INSERT INTO models (name, brand_id) SELECT 'Hd65', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hd65');

  INSERT INTO models (name, brand_id) SELECT 'L30', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'l30');

  INSERT INTO models (name, brand_id) SELECT 'Maxcruz', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'maxcruz');

  INSERT INTO models (name, brand_id) SELECT 'New Tucson', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'new tucson');

  INSERT INTO models (name, brand_id) SELECT 'Tuscani', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tuscani');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'accent';
  INSERT INTO versions (name, model_id) SELECT 'Accent Prime', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'accent prime');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'creta';
  INSERT INTO versions (name, model_id) SELECT 'Creta Grand', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'creta grand');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'galloper';
  INSERT INTO versions (name, model_id) SELECT 'Galloper II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'galloper ii');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ioniq';
  INSERT INTO versions (name, model_id) SELECT 'Ioniq 5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ioniq 5');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'porter';
  INSERT INTO versions (name, model_id) SELECT 'Porter Hr', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'porter hr');
  INSERT INTO versions (name, model_id) SELECT 'Porter II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'porter ii');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'venue';
  INSERT INTO versions (name, model_id) SELECT 'Venue Qx', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'venue qx');

END $$;

-- === Ika ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Ika'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'ika');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'ika';

  INSERT INTO models (name, brand_id) SELECT 'Imn', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'imn');

END $$;

-- === Ika Renault ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Ika Renault'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'ika renault');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'ika renault';

  INSERT INTO models (name, brand_id) SELECT 'Torino 380', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'torino 380');

END $$;

-- === Infiniti ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'infiniti';

  INSERT INTO models (name, brand_id) SELECT 'G', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'g');

  INSERT INTO models (name, brand_id) SELECT 'M', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm');

  INSERT INTO models (name, brand_id) SELECT 'Q60', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q60');

  INSERT INTO models (name, brand_id) SELECT 'Q70', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q70');

  INSERT INTO models (name, brand_id) SELECT 'Qx30', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'qx30');

  INSERT INTO models (name, brand_id) SELECT 'Qx80', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'qx80');

END $$;

-- === International ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'international';

  INSERT INTO models (name, brand_id) SELECT 'Woody ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'woody ');

END $$;

-- === Isuzu ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'isuzu';

  INSERT INTO models (name, brand_id) SELECT 'Amigo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'amigo');

  INSERT INTO models (name, brand_id) SELECT 'Bighorn', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bighorn');

  INSERT INTO models (name, brand_id) SELECT 'Gemini', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gemini');

  INSERT INTO models (name, brand_id) SELECT 'NKR', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nkr');

  INSERT INTO models (name, brand_id) SELECT 'Piazza', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'piazza');

  INSERT INTO models (name, brand_id) SELECT 'Rodeo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rodeo');

  INSERT INTO models (name, brand_id) SELECT 'Trooper II', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'trooper ii');

  INSERT INTO models (name, brand_id) SELECT 'Troper II', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'troper ii');

  INSERT INTO models (name, brand_id) SELECT 'Vehicross', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vehicross');

END $$;

-- === Iveco ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'iveco';

  INSERT INTO models (name, brand_id) SELECT '40.10', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '40.10');

  INSERT INTO models (name, brand_id) SELECT 'Daili', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'daili');

  INSERT INTO models (name, brand_id) SELECT 'NEW DAILY 40C17HB', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'new daily 40c17hb');

END $$;

-- === JAC ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'jac';

  INSERT INTO models (name, brand_id) SELECT 'B5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'b5');

  INSERT INTO models (name, brand_id) SELECT 'Ignite30x', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ignite30x');

  INSERT INTO models (name, brand_id) SELECT 'Urban', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'urban');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'urban';
  INSERT INTO versions (name, model_id) SELECT 'Urban Hfc', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'urban hfc');
  INSERT INTO versions (name, model_id) SELECT 'Urban-Hfc', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'urban-hfc');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '137';
  INSERT INTO versions (name, model_id) SELECT '137 Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '137 sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'j3';
  INSERT INTO versions (name, model_id) SELECT 'J3 Turin', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'j3 turin');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'js2';
  INSERT INTO versions (name, model_id) SELECT 'Js2 Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'js2 pro');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'js8';
  INSERT INTO versions (name, model_id) SELECT 'Js8 Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'js8 pro');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't8';
  INSERT INTO versions (name, model_id) SELECT 'T8 Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't8 pro');

END $$;

-- === Jaecoo ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'jaecoo';

  INSERT INTO models (name, brand_id) SELECT 'J6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'j6');

  INSERT INTO models (name, brand_id) SELECT 'Jaecoo 5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jaecoo 5');

  INSERT INTO models (name, brand_id) SELECT 'Jaecoo 6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jaecoo 6');

  INSERT INTO models (name, brand_id) SELECT 'Jaecoo 7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jaecoo 7');

  INSERT INTO models (name, brand_id) SELECT 'Jaecoo 8', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jaecoo 8');

END $$;

-- === Jaguar ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'jaguar';

  INSERT INTO models (name, brand_id) SELECT 'E-Type', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e-type');

  INSERT INTO models (name, brand_id) SELECT 'Mark VII', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mark vii');

  INSERT INTO models (name, brand_id) SELECT 'Mk', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mk');

  INSERT INTO models (name, brand_id) SELECT 'Mk2', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mk2');

  INSERT INTO models (name, brand_id) SELECT 'Xr', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xr');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e-pace';
  INSERT INTO versions (name, model_id) SELECT 'E-Pace', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-pace');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hse');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic s');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic se');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic hse');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f-pace';
  INSERT INTO versions (name, model_id) SELECT 'F-Pace', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'f-pace');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hse');
  INSERT INTO versions (name, model_id) SELECT 'R-Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-sport');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic s');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic se');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic hse');
  INSERT INTO versions (name, model_id) SELECT 'SVR', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'svr');
  INSERT INTO versions (name, model_id) SELECT 'P250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p250');
  INSERT INTO versions (name, model_id) SELECT 'P400', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p400');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f-type';
  INSERT INTO versions (name, model_id) SELECT 'F-Type', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'f-type');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'R', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r');
  INSERT INTO versions (name, model_id) SELECT 'SVR', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'svr');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic');
  INSERT INTO versions (name, model_id) SELECT 'P300', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p300');
  INSERT INTO versions (name, model_id) SELECT 'P380', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p380');
  INSERT INTO versions (name, model_id) SELECT 'P450', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p450');
  INSERT INTO versions (name, model_id) SELECT 'P575', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p575');
  INSERT INTO versions (name, model_id) SELECT 'Convertible', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'convertible');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i-pace';
  INSERT INTO versions (name, model_id) SELECT 'I-Pace', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'i-pace');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hse');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic hse');
  INSERT INTO versions (name, model_id) SELECT 'EV400', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ev400');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xe';
  INSERT INTO versions (name, model_id) SELECT 'XE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xe');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'R-Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-sport');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic s');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic se');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic hse');
  INSERT INTO versions (name, model_id) SELECT 'SV Project 8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sv project 8');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xf';
  INSERT INTO versions (name, model_id) SELECT 'XF', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xf');
  INSERT INTO versions (name, model_id) SELECT 'Luxury', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury');
  INSERT INTO versions (name, model_id) SELECT 'Premium Luxury', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'premium luxury');
  INSERT INTO versions (name, model_id) SELECT 'Portfolio', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'portfolio');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'R-Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-sport');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic se');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic hse');
  INSERT INTO versions (name, model_id) SELECT 'XFR', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xfr');
  INSERT INTO versions (name, model_id) SELECT 'XFR-S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xfr-s');
  INSERT INTO versions (name, model_id) SELECT 'Sportbrake', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportbrake');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xj';
  INSERT INTO versions (name, model_id) SELECT 'XJ', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xj');
  INSERT INTO versions (name, model_id) SELECT 'L', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'l');
  INSERT INTO versions (name, model_id) SELECT 'Luxury', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury');
  INSERT INTO versions (name, model_id) SELECT 'Premium Luxury', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'premium luxury');
  INSERT INTO versions (name, model_id) SELECT 'Portfolio', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'portfolio');
  INSERT INTO versions (name, model_id) SELECT 'Supercharged', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'supercharged');
  INSERT INTO versions (name, model_id) SELECT 'R-Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-sport');
  INSERT INTO versions (name, model_id) SELECT 'XJR', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xjr');
  INSERT INTO versions (name, model_id) SELECT 'XJR575', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xjr575');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xk';
  INSERT INTO versions (name, model_id) SELECT 'Xk Series', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xk series');

END $$;

-- === Jeep ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'jeep';

  INSERT INTO models (name, brand_id) SELECT 'Avenger', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'avenger');

  INSERT INTO models (name, brand_id) SELECT 'Cj7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cj7');

  INSERT INTO models (name, brand_id) SELECT 'Grand Cherokee', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand cherokee');

  INSERT INTO models (name, brand_id) SELECT 'Liberty', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'liberty');

  INSERT INTO models (name, brand_id) SELECT 'Willys', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'willys');

END $$;

-- === Jenhoo ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Jenhoo'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'jenhoo');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'jenhoo';

  INSERT INTO models (name, brand_id) SELECT 'Ev48', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ev48');

END $$;

-- === Jensen Healey ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Jensen Healey'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'jensen healey');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'jensen healey';

  INSERT INTO models (name, brand_id) SELECT 'Jensen Healey', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jensen healey');

END $$;

-- === Jetour ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'jetour';

  INSERT INTO models (name, brand_id) SELECT 'T1', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't1');

  INSERT INTO models (name, brand_id) SELECT 'X50', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x50');

  INSERT INTO models (name, brand_id) SELECT 'X90 Plus', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x90 plus');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x70';
  INSERT INTO versions (name, model_id) SELECT 'X70 Plus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x70 plus');

END $$;

-- === JMC ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'jmc';

  INSERT INTO models (name, brand_id) SELECT 'N350', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'n350');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vigus';
  INSERT INTO versions (name, model_id) SELECT 'Vigus 5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'vigus 5');

END $$;

-- === Kaiyi ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'kaiyi';

  INSERT INTO models (name, brand_id) SELECT 'E5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e5');

  INSERT INTO models (name, brand_id) SELECT 'Kyx7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kyx7');

END $$;

-- === Karry ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'karry';

  INSERT INTO models (name, brand_id) SELECT 'Q22', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q22');

  INSERT INTO models (name, brand_id) SELECT 'Q51', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q51');

  INSERT INTO models (name, brand_id) SELECT 'Q52', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q52');

END $$;

-- === Kawasaki ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'kawasaki';

  INSERT INTO models (name, brand_id) SELECT 'Concours', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'concours');

  INSERT INTO models (name, brand_id) SELECT 'Er', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'er');

  INSERT INTO models (name, brand_id) SELECT 'Kdx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kdx');

  INSERT INTO models (name, brand_id) SELECT 'Klr', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'klr');

  INSERT INTO models (name, brand_id) SELECT 'Klx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'klx');

  INSERT INTO models (name, brand_id) SELECT 'Kx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kx');

  INSERT INTO models (name, brand_id) SELECT 'Ninja', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ninja');

  INSERT INTO models (name, brand_id) SELECT 'Versys', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'versys');

  INSERT INTO models (name, brand_id) SELECT 'Vulcan', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vulcan');

  INSERT INTO models (name, brand_id) SELECT 'Zx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'zx');

END $$;

-- === Keeway ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'keeway';

  INSERT INTO models (name, brand_id) SELECT 'Superlight', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'superlight');

END $$;

-- === Kenbo ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Kenbo'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'kenbo');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'kenbo';

  INSERT INTO models (name, brand_id) SELECT 'Cargo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cargo');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cargo';
  INSERT INTO versions (name, model_id) SELECT 'CARGO VAN 1.3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cargo van 1.3');

END $$;

-- === Kenbo Motors ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Kenbo Motors'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'kenbo motors');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'kenbo motors';

  INSERT INTO models (name, brand_id) SELECT 'Van 1.0', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'van 1.0');

END $$;

-- === Kgm ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Kgm'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'kgm');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'kgm';

  INSERT INTO models (name, brand_id) SELECT 'Actyon', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'actyon');

  INSERT INTO models (name, brand_id) SELECT 'Grand Musso', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand musso');

  INSERT INTO models (name, brand_id) SELECT 'Musso', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'musso');

  INSERT INTO models (name, brand_id) SELECT 'Rexton', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rexton');

  INSERT INTO models (name, brand_id) SELECT 'Torres', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'torres');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'torres';
  INSERT INTO versions (name, model_id) SELECT 'Torres Evx', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'torres evx');

END $$;

-- === Kia ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'kia';

  INSERT INTO models (name, brand_id) SELECT '147', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '147');

  INSERT INTO models (name, brand_id) SELECT '370Z', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '370z');

  INSERT INTO models (name, brand_id) SELECT 'Asia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'asia');

  INSERT INTO models (name, brand_id) SELECT 'Bongo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bongo');

  INSERT INTO models (name, brand_id) SELECT 'Bt50', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bt50');

  INSERT INTO models (name, brand_id) SELECT 'Cedric', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cedric');

  INSERT INTO models (name, brand_id) SELECT 'Grace', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grace');

  INSERT INTO models (name, brand_id) SELECT 'Grand Carnival', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand carnival');

  INSERT INTO models (name, brand_id) SELECT 'Gxe', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gxe');

  INSERT INTO models (name, brand_id) SELECT 'K 2400', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'k 2400');

  INSERT INTO models (name, brand_id) SELECT 'K-4000', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'k-4000');

  INSERT INTO models (name, brand_id) SELECT 'Rio3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rio3');

  INSERT INTO models (name, brand_id) SELECT 'Rocsta', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rocsta');

  INSERT INTO models (name, brand_id) SELECT 'Scoupe', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'scoupe');

  INSERT INTO models (name, brand_id) SELECT 'Stanza', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'stanza');

  INSERT INTO models (name, brand_id) SELECT 'Tasman', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tasman');

  INSERT INTO models (name, brand_id) SELECT 'Tj18', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tj18');

  INSERT INTO models (name, brand_id) SELECT 'Towner', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'towner');

  INSERT INTO models (name, brand_id) SELECT 'Vanette', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vanette');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'avella';
  INSERT INTO versions (name, model_id) SELECT 'Avella II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'avella ii');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'besta';
  INSERT INTO versions (name, model_id) SELECT 'Besta II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'besta ii');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'carnival';
  INSERT INTO versions (name, model_id) SELECT 'Carnival II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carnival ii');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cerato';
  INSERT INTO versions (name, model_id) SELECT 'Cerato 5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cerato 5');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'frontier';
  INSERT INTO versions (name, model_id) SELECT 'Frontier II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'frontier ii');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'k3';
  INSERT INTO versions (name, model_id) SELECT 'K3 Cross', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'k3 cross');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rio';
  INSERT INTO versions (name, model_id) SELECT 'Rio 3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rio 3');
  INSERT INTO versions (name, model_id) SELECT 'Rio 4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rio 4');
  INSERT INTO versions (name, model_id) SELECT 'Rio 5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rio 5');
  INSERT INTO versions (name, model_id) SELECT 'Rio II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rio ii');
  INSERT INTO versions (name, model_id) SELECT 'Rio Jb', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rio jb');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sephia';
  INSERT INTO versions (name, model_id) SELECT 'Sephia II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sephia ii');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sportage';
  INSERT INTO versions (name, model_id) SELECT 'Sportage Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportage pro');

END $$;

-- === Kinghike ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Kinghike'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'kinghike');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'kinghike';

  INSERT INTO models (name, brand_id) SELECT 'Pro 4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pro 4');

END $$;

-- === Kr200 ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Kr200'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'kr200');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'kr200';

END $$;

-- === Ktm ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'ktm';

  INSERT INTO models (name, brand_id) SELECT '625', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '625');

  INSERT INTO models (name, brand_id) SELECT '65', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '65');

  INSERT INTO models (name, brand_id) SELECT 'Adventure', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'adventure');

  INSERT INTO models (name, brand_id) SELECT 'Exc', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'exc');

END $$;

-- === Kyc ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'kyc';

  INSERT INTO models (name, brand_id) SELECT 'Mamut Cargo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mamut cargo');

  INSERT INTO models (name, brand_id) SELECT 'T3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't3');

  INSERT INTO models (name, brand_id) SELECT 'V3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v3');

  INSERT INTO models (name, brand_id) SELECT 'V5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v5');

  INSERT INTO models (name, brand_id) SELECT 'X7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x7');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x5';
  INSERT INTO versions (name, model_id) SELECT 'X5 Pick Up', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x5 pick up');
  INSERT INTO versions (name, model_id) SELECT 'X5 Plus Pick Up', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x5 plus pick up');

END $$;

-- === Kymco ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'kymco';

  INSERT INTO models (name, brand_id) SELECT 'Mxu', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mxu');

END $$;

-- === Lada ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'lada';

  INSERT INTO models (name, brand_id) SELECT '2104', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2104');

  INSERT INTO models (name, brand_id) SELECT '21043', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '21043');

  INSERT INTO models (name, brand_id) SELECT '2105', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2105');

  INSERT INTO models (name, brand_id) SELECT '2106', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2106');

  INSERT INTO models (name, brand_id) SELECT '2107', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2107');

  INSERT INTO models (name, brand_id) SELECT '2109', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2109');

  INSERT INTO models (name, brand_id) SELECT '4X4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '4x4');

  INSERT INTO models (name, brand_id) SELECT 'Charlotte', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'charlotte');

  INSERT INTO models (name, brand_id) SELECT 'Kalina', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kalina');

  INSERT INTO models (name, brand_id) SELECT 'Samara', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'samara');

  INSERT INTO models (name, brand_id) SELECT 'Tavria', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tavria');

END $$;

-- === Lamborghini ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'lamborghini';

  INSERT INTO models (name, brand_id) SELECT 'Huracan', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'huracan');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'huracan';
  INSERT INTO versions (name, model_id) SELECT 'LP 610-4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 610-4');
  INSERT INTO versions (name, model_id) SELECT 'LP 610-4 Spyder', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 610-4 spyder');
  INSERT INTO versions (name, model_id) SELECT 'LP 580-2', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 580-2');
  INSERT INTO versions (name, model_id) SELECT 'LP 580-2 Spyder', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 580-2 spyder');
  INSERT INTO versions (name, model_id) SELECT 'Performante', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'performante');
  INSERT INTO versions (name, model_id) SELECT 'Performante Spyder', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'performante spyder');
  INSERT INTO versions (name, model_id) SELECT 'EVO', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'evo');
  INSERT INTO versions (name, model_id) SELECT 'EVO Spyder', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'evo spyder');
  INSERT INTO versions (name, model_id) SELECT 'EVO RWD', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'evo rwd');
  INSERT INTO versions (name, model_id) SELECT 'EVO RWD Spyder', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'evo rwd spyder');
  INSERT INTO versions (name, model_id) SELECT 'STO', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sto');
  INSERT INTO versions (name, model_id) SELECT 'Tecnica', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tecnica');
  INSERT INTO versions (name, model_id) SELECT 'Sterrato', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sterrato');

  INSERT INTO models (name, brand_id) SELECT 'Lp560', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lp560');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aventador';
  INSERT INTO versions (name, model_id) SELECT 'LP 700-4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 700-4');
  INSERT INTO versions (name, model_id) SELECT 'LP 700-4 Roadster', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 700-4 roadster');
  INSERT INTO versions (name, model_id) SELECT 'LP 720-4 50 Anniversario', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 720-4 50 anniversario');
  INSERT INTO versions (name, model_id) SELECT 'LP 750-4 SV', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 750-4 sv');
  INSERT INTO versions (name, model_id) SELECT 'LP 750-4 SV Roadster', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 750-4 sv roadster');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'S Roadster', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's roadster');
  INSERT INTO versions (name, model_id) SELECT 'SVJ', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'svj');
  INSERT INTO versions (name, model_id) SELECT 'SVJ Roadster', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'svj roadster');
  INSERT INTO versions (name, model_id) SELECT 'Ultimae', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ultimae');
  INSERT INTO versions (name, model_id) SELECT 'Ultimae Roadster', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ultimae roadster');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gallardo';
  INSERT INTO versions (name, model_id) SELECT 'LP 550-2', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 550-2');
  INSERT INTO versions (name, model_id) SELECT 'LP 550-2 Spyder', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 550-2 spyder');
  INSERT INTO versions (name, model_id) SELECT 'LP 560-4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 560-4');
  INSERT INTO versions (name, model_id) SELECT 'LP 560-4 Spyder', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 560-4 spyder');
  INSERT INTO versions (name, model_id) SELECT 'LP 570-4 Superleggera', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 570-4 superleggera');
  INSERT INTO versions (name, model_id) SELECT 'LP 570-4 Spyder Performante', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 570-4 spyder performante');
  INSERT INTO versions (name, model_id) SELECT 'LP 570-4 Squadra Corse', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 570-4 squadra corse');
  INSERT INTO versions (name, model_id) SELECT 'LP 570-4 Edizione Tecnica', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lp 570-4 edizione tecnica');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'urus';
  INSERT INTO versions (name, model_id) SELECT 'Urus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'urus');
  INSERT INTO versions (name, model_id) SELECT 'Urus S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'urus s');
  INSERT INTO versions (name, model_id) SELECT 'Urus Performante', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'urus performante');
  INSERT INTO versions (name, model_id) SELECT 'Urus SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'urus se');

END $$;

-- === Lancia ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'lancia';

  INSERT INTO models (name, brand_id) SELECT 'Dedra', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dedra');

  INSERT INTO models (name, brand_id) SELECT 'Delta', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'delta');

  INSERT INTO models (name, brand_id) SELECT 'Fulvia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fulvia');

  INSERT INTO models (name, brand_id) SELECT 'K', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'k');

  INSERT INTO models (name, brand_id) SELECT 'Kappa', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kappa');

  INSERT INTO models (name, brand_id) SELECT 'Prisma', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'prisma');

  INSERT INTO models (name, brand_id) SELECT 'Thema', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'thema');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'thema';
  INSERT INTO versions (name, model_id) SELECT 'Thema Super', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'thema super');

END $$;

-- === Land Rover ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'land rover';

  INSERT INTO models (name, brand_id) SELECT 'Discoery Sport', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'discoery sport');

  INSERT INTO models (name, brand_id) SELECT 'Largo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'largo');

  INSERT INTO models (name, brand_id) SELECT 'Lr3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lr3');

  INSERT INTO models (name, brand_id) SELECT 'Santana', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'santana');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'defender';
  INSERT INTO versions (name, model_id) SELECT 'Defender 90', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'defender 90');
  INSERT INTO versions (name, model_id) SELECT 'Defender 110', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'defender 110');
  INSERT INTO versions (name, model_id) SELECT 'Defender 130', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'defender 130');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'X-Dynamic S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x-dynamic s');
  INSERT INTO versions (name, model_id) SELECT 'X-Dynamic SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x-dynamic se');
  INSERT INTO versions (name, model_id) SELECT 'X-Dynamic HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x-dynamic hse');
  INSERT INTO versions (name, model_id) SELECT 'X', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x');
  INSERT INTO versions (name, model_id) SELECT 'V8', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v8');
  INSERT INTO versions (name, model_id) SELECT 'Outbound', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'outbound');
  INSERT INTO versions (name, model_id) SELECT 'Octa', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'octa');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'discovery';
  INSERT INTO versions (name, model_id) SELECT 'Discovery', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'discovery');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hse');
  INSERT INTO versions (name, model_id) SELECT 'HSE Luxury', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hse luxury');
  INSERT INTO versions (name, model_id) SELECT 'Metropolitan Edition', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'metropolitan edition');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic s');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic se');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic hse');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'evoque';
  INSERT INTO versions (name, model_id) SELECT 'Evoque', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'evoque');
  INSERT INTO versions (name, model_id) SELECT 'Pure', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'pure');
  INSERT INTO versions (name, model_id) SELECT 'Prestige', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'prestige');
  INSERT INTO versions (name, model_id) SELECT 'Dynamic', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dynamic');
  INSERT INTO versions (name, model_id) SELECT 'Autobiography', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'autobiography');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hse');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic s');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic se');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic hse');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'freelander';
  INSERT INTO versions (name, model_id) SELECT 'Freelander 2', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'freelander 2');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'range rover';
  INSERT INTO versions (name, model_id) SELECT 'Range Rover', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'range rover');
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hse');
  INSERT INTO versions (name, model_id) SELECT 'Autobiography', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'autobiography');
  INSERT INTO versions (name, model_id) SELECT 'SVAutobiography', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'svautobiography');
  INSERT INTO versions (name, model_id) SELECT 'SVAutobiography Dynamic', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'svautobiography dynamic');
  INSERT INTO versions (name, model_id) SELECT 'SV', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sv');
  INSERT INTO versions (name, model_id) SELECT 'Westminster', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'westminster');
  INSERT INTO versions (name, model_id) SELECT 'Vogue', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'vogue');
  INSERT INTO versions (name, model_id) SELECT 'P400e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p400e');
  INSERT INTO versions (name, model_id) SELECT 'P530', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p530');
  INSERT INTO versions (name, model_id) SELECT 'P460e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p460e');
  INSERT INTO versions (name, model_id) SELECT 'P550e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p550e');
  INSERT INTO versions (name, model_id) SELECT 'Long Wheelbase', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long wheelbase');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'discovery sport';
  INSERT INTO versions (name, model_id) SELECT 'Discovery Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'discovery sport');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hse');
  INSERT INTO versions (name, model_id) SELECT 'HSE Luxury', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hse luxury');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic s');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic se');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic HSE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic hse');
  INSERT INTO versions (name, model_id) SELECT 'Dynamic SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dynamic se');

END $$;

-- === Landking ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Landking'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'landking');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'landking';

  INSERT INTO models (name, brand_id) SELECT 'LK3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lk3');

  INSERT INTO models (name, brand_id) SELECT 'LK5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lk5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lk5';
  INSERT INTO versions (name, model_id) SELECT 'LK5 EV', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lk5 ev');

  INSERT INTO models (name, brand_id) SELECT 'LK8 EV', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lk8 ev');

END $$;

-- === Leap Motor ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Leap Motor'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'leap motor');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'leap motor';

END $$;

-- === Leapmotor ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'leapmotor';

  INSERT INTO models (name, brand_id) SELECT 'C10', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c10');

  INSERT INTO models (name, brand_id) SELECT 'T03', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't03');

END $$;

-- === Lexus ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'lexus';

  INSERT INTO models (name, brand_id) SELECT ' LUX UX 200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = ' lux ux 200');

  INSERT INTO models (name, brand_id) SELECT 'Ct', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ct');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ct';
  INSERT INTO versions (name, model_id) SELECT 'Ct 200H', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ct 200h');

  INSERT INTO models (name, brand_id) SELECT 'CT200H ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ct200h ');

  INSERT INTO models (name, brand_id) SELECT 'Default', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'default');

  INSERT INTO models (name, brand_id) SELECT 'Gx 460', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gx 460');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gx 460';
  INSERT INTO versions (name, model_id) SELECT 'GX 460', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gx 460');
  INSERT INTO versions (name, model_id) SELECT 'GX 460 Premium', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gx 460 premium');
  INSERT INTO versions (name, model_id) SELECT 'GX 460 Luxury', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gx 460 luxury');
  INSERT INTO versions (name, model_id) SELECT 'GX 550', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gx 550');

  INSERT INTO models (name, brand_id) SELECT 'LUX UX 200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lux ux 200');

  INSERT INTO models (name, brand_id) SELECT 'LX450', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lx450');

  INSERT INTO models (name, brand_id) SELECT 'Rz', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rz');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rz';
  INSERT INTO versions (name, model_id) SELECT 'RZ 300e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rz 300e');
  INSERT INTO versions (name, model_id) SELECT 'RZ 450e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rz 450e');

  INSERT INTO models (name, brand_id) SELECT 'UX250H', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ux250h');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'es';
  INSERT INTO versions (name, model_id) SELECT 'ES 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'es 250');
  INSERT INTO versions (name, model_id) SELECT 'ES 300h', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'es 300h');
  INSERT INTO versions (name, model_id) SELECT 'ES 350', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'es 350');
  INSERT INTO versions (name, model_id) SELECT 'ES 350 F Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'es 350 f sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gs';
  INSERT INTO versions (name, model_id) SELECT 'GS 200t', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gs 200t');
  INSERT INTO versions (name, model_id) SELECT 'GS 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gs 250');
  INSERT INTO versions (name, model_id) SELECT 'GS 300', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gs 300');
  INSERT INTO versions (name, model_id) SELECT 'GS 350', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gs 350');
  INSERT INTO versions (name, model_id) SELECT 'GS 350 F Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gs 350 f sport');
  INSERT INTO versions (name, model_id) SELECT 'GS 450h', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gs 450h');
  INSERT INTO versions (name, model_id) SELECT 'GS F', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gs f');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'is';
  INSERT INTO versions (name, model_id) SELECT 'IS 200t', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'is 200t');
  INSERT INTO versions (name, model_id) SELECT 'IS 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'is 250');
  INSERT INTO versions (name, model_id) SELECT 'IS 300', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'is 300');
  INSERT INTO versions (name, model_id) SELECT 'IS 300h', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'is 300h');
  INSERT INTO versions (name, model_id) SELECT 'IS 350', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'is 350');
  INSERT INTO versions (name, model_id) SELECT 'IS 350 F Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'is 350 f sport');
  INSERT INTO versions (name, model_id) SELECT 'IS 500 F Sport Performance', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'is 500 f sport performance');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lbx';
  INSERT INTO versions (name, model_id) SELECT 'LBX', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lbx');
  INSERT INTO versions (name, model_id) SELECT 'Cool', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cool');
  INSERT INTO versions (name, model_id) SELECT 'Relax', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'relax');
  INSERT INTO versions (name, model_id) SELECT 'Bespoke Build', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'bespoke build');
  INSERT INTO versions (name, model_id) SELECT 'Morizo RR', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'morizo rr');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ls';
  INSERT INTO versions (name, model_id) SELECT 'LS 460', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 460');
  INSERT INTO versions (name, model_id) SELECT 'LS 460 L', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 460 l');
  INSERT INTO versions (name, model_id) SELECT 'LS 500', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 500');
  INSERT INTO versions (name, model_id) SELECT 'LS 500h', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 500h');
  INSERT INTO versions (name, model_id) SELECT 'LS 500 F Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 500 f sport');
  INSERT INTO versions (name, model_id) SELECT 'LS 600h', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 600h');
  INSERT INTO versions (name, model_id) SELECT 'LS 600h L', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 600h l');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lx';
  INSERT INTO versions (name, model_id) SELECT 'LX 450d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 450d');
  INSERT INTO versions (name, model_id) SELECT 'LX 570', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 570');
  INSERT INTO versions (name, model_id) SELECT 'LX 600', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 600');
  INSERT INTO versions (name, model_id) SELECT 'LX 600 F Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 600 f sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nx';
  INSERT INTO versions (name, model_id) SELECT 'NX 200t', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'nx 200t');
  INSERT INTO versions (name, model_id) SELECT 'NX 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'nx 250');
  INSERT INTO versions (name, model_id) SELECT 'NX 300', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'nx 300');
  INSERT INTO versions (name, model_id) SELECT 'NX 300h', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'nx 300h');
  INSERT INTO versions (name, model_id) SELECT 'NX 350', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'nx 350');
  INSERT INTO versions (name, model_id) SELECT 'NX 350h', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'nx 350h');
  INSERT INTO versions (name, model_id) SELECT 'NX 450h+', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'nx 450h+');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rc';
  INSERT INTO versions (name, model_id) SELECT 'RC 200t', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rc 200t');
  INSERT INTO versions (name, model_id) SELECT 'RC 300', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rc 300');
  INSERT INTO versions (name, model_id) SELECT 'RC 350', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rc 350');
  INSERT INTO versions (name, model_id) SELECT 'RC 350 F Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rc 350 f sport');
  INSERT INTO versions (name, model_id) SELECT 'RC F', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rc f');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rx';
  INSERT INTO versions (name, model_id) SELECT 'RX 200t', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rx 200t');
  INSERT INTO versions (name, model_id) SELECT 'RX 300', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rx 300');
  INSERT INTO versions (name, model_id) SELECT 'RX 350', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rx 350');
  INSERT INTO versions (name, model_id) SELECT 'RX 350h', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rx 350h');
  INSERT INTO versions (name, model_id) SELECT 'RX 350L', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rx 350l');
  INSERT INTO versions (name, model_id) SELECT 'RX 350 F Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rx 350 f sport');
  INSERT INTO versions (name, model_id) SELECT 'RX 450h', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rx 450h');
  INSERT INTO versions (name, model_id) SELECT 'RX 450h+', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rx 450h+');
  INSERT INTO versions (name, model_id) SELECT 'RX 500h', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rx 500h');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ux';
  INSERT INTO versions (name, model_id) SELECT 'UX 200', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ux 200');
  INSERT INTO versions (name, model_id) SELECT 'UX 250h', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ux 250h');
  INSERT INTO versions (name, model_id) SELECT 'UX 300e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ux 300e');

END $$;

-- === Lifan ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'lifan';

  INSERT INTO models (name, brand_id) SELECT '520I', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '520i');

  INSERT INTO models (name, brand_id) SELECT '720', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '720');

  INSERT INTO models (name, brand_id) SELECT 'Lf', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lf');

  INSERT INTO models (name, brand_id) SELECT 'Lifan 320', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lifan 320');

  INSERT INTO models (name, brand_id) SELECT 'Lifan 330', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lifan 330');

  INSERT INTO models (name, brand_id) SELECT 'Lifan 520', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lifan 520');

  INSERT INTO models (name, brand_id) SELECT 'Lifan 530', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lifan 530');

  INSERT INTO models (name, brand_id) SELECT 'Lifan 620', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lifan 620');

  INSERT INTO models (name, brand_id) SELECT 'Lifan 630', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lifan 630');

  INSERT INTO models (name, brand_id) SELECT 'Lifan Cargo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lifan cargo');

  INSERT INTO models (name, brand_id) SELECT 'Lifan Truck', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lifan truck');

  INSERT INTO models (name, brand_id) SELECT 'Lifan Van', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lifan van');

END $$;

-- === Lincoln ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'lincoln';

  INSERT INTO models (name, brand_id) SELECT 'Continental', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'continental');

  INSERT INTO models (name, brand_id) SELECT 'MKT', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mkt');

  INSERT INTO models (name, brand_id) SELECT 'Mkx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mkx');

  INSERT INTO models (name, brand_id) SELECT 'Mkz', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mkz');

  INSERT INTO models (name, brand_id) SELECT 'Navigator', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'navigator');

  INSERT INTO models (name, brand_id) SELECT 'Town Car', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'town car');

END $$;

-- === Livan ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'livan';

  INSERT INTO models (name, brand_id) SELECT 'X6Pro Honor', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x6pro honor');

  INSERT INTO models (name, brand_id) SELECT 'X6Pro Lux', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x6pro lux');

END $$;

-- === Loncin ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'loncin';

  INSERT INTO models (name, brand_id) SELECT 'Cr1', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cr1');

END $$;

-- === Lotus ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'lotus';

  INSERT INTO models (name, brand_id) SELECT 'Elise', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'elise');

  INSERT INTO models (name, brand_id) SELECT 'Emira', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'emira');

  INSERT INTO models (name, brand_id) SELECT 'Esprit', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'esprit');

  INSERT INTO models (name, brand_id) SELECT 'Evora', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'evora');

  INSERT INTO models (name, brand_id) SELECT 'Exige', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'exige');

  INSERT INTO models (name, brand_id) SELECT 'Isuzu Plaza', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'isuzu plaza');

END $$;

-- === Lync & Co ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Lync & Co'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'lync & co');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'lync & co';

  INSERT INTO models (name, brand_id) SELECT '06', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '06');

  INSERT INTO models (name, brand_id) SELECT '09', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '09');

END $$;

-- === Lynk & Co ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Lynk & Co'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'lynk & co');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'lynk & co';

  INSERT INTO models (name, brand_id) SELECT '06', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '06');

  INSERT INTO models (name, brand_id) SELECT '08', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '08');

  INSERT INTO models (name, brand_id) SELECT '09', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '09');

END $$;

-- === Mahindra ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mahindra';

  INSERT INTO models (name, brand_id) SELECT 'Kuv100', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kuv100');

  INSERT INTO models (name, brand_id) SELECT 'Pick Up', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pick up');

  INSERT INTO models (name, brand_id) SELECT 'Pik-Up', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pik-up');

  INSERT INTO models (name, brand_id) SELECT 'Xuv', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xuv');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xuv';
  INSERT INTO versions (name, model_id) SELECT 'Xuv 3Xo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xuv 3xo');

  INSERT INTO models (name, brand_id) SELECT 'Xuv300', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xuv300');

END $$;

-- === Maple ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Maple'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'maple');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'maple';

  INSERT INTO models (name, brand_id) SELECT '60S', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '60s');

  INSERT INTO models (name, brand_id) SELECT 'Maple 30X', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'maple 30x');

END $$;

-- === Marcos ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Marcos'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'marcos');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'marcos';

  INSERT INTO models (name, brand_id) SELECT 'Gt', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt');

END $$;

-- === Maserati ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'maserati';

  INSERT INTO models (name, brand_id) SELECT 'Coupe', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'coupe');

  INSERT INTO models (name, brand_id) SELECT 'Grancabrio', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grancabrio');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grancabrio';
  INSERT INTO versions (name, model_id) SELECT 'GranCabrio', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'grancabrio');
  INSERT INTO versions (name, model_id) SELECT 'Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport');
  INSERT INTO versions (name, model_id) SELECT 'MC', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mc');
  INSERT INTO versions (name, model_id) SELECT 'Folgore', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'folgore');

  INSERT INTO models (name, brand_id) SELECT 'Gransport', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gransport');

  INSERT INTO models (name, brand_id) SELECT 'Granturismo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'granturismo');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'granturismo';
  INSERT INTO versions (name, model_id) SELECT 'GranTurismo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'granturismo');
  INSERT INTO versions (name, model_id) SELECT 'Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport');
  INSERT INTO versions (name, model_id) SELECT 'MC', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mc');
  INSERT INTO versions (name, model_id) SELECT 'MC Stradale', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mc stradale');
  INSERT INTO versions (name, model_id) SELECT 'Modena', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'modena');
  INSERT INTO versions (name, model_id) SELECT 'Trofeo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trofeo');
  INSERT INTO versions (name, model_id) SELECT 'Folgore', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'folgore');

  INSERT INTO models (name, brand_id) SELECT 'Grecale', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grecale');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grecale';
  INSERT INTO versions (name, model_id) SELECT 'GT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt');
  INSERT INTO versions (name, model_id) SELECT 'Modena', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'modena');
  INSERT INTO versions (name, model_id) SELECT 'Trofeo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trofeo');
  INSERT INTO versions (name, model_id) SELECT 'Folgore', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'folgore');

  INSERT INTO models (name, brand_id) SELECT 'MC20', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mc20');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mc20';
  INSERT INTO versions (name, model_id) SELECT 'MC20', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mc20');
  INSERT INTO versions (name, model_id) SELECT 'Cielo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cielo');

  INSERT INTO models (name, brand_id) SELECT 'Spyder', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spyder');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ghibli';
  INSERT INTO versions (name, model_id) SELECT 'Ghibli', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ghibli');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'S Q4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's q4');
  INSERT INTO versions (name, model_id) SELECT 'Diesel', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'diesel');
  INSERT INTO versions (name, model_id) SELECT 'Modena', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'modena');
  INSERT INTO versions (name, model_id) SELECT 'Trofeo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trofeo');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'levante';
  INSERT INTO versions (name, model_id) SELECT 'Levante', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'levante');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gts');
  INSERT INTO versions (name, model_id) SELECT 'Diesel', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'diesel');
  INSERT INTO versions (name, model_id) SELECT 'Modena', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'modena');
  INSERT INTO versions (name, model_id) SELECT 'Trofeo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trofeo');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'quattroporte';
  INSERT INTO versions (name, model_id) SELECT 'Quattroporte', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'quattroporte');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'S Q4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's q4');
  INSERT INTO versions (name, model_id) SELECT 'GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gts');
  INSERT INTO versions (name, model_id) SELECT 'Diesel', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'diesel');
  INSERT INTO versions (name, model_id) SELECT 'Modena', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'modena');
  INSERT INTO versions (name, model_id) SELECT 'Trofeo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trofeo');

END $$;

-- === Maxus ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'maxus';

  INSERT INTO models (name, brand_id) SELECT 'C35', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c35');

  INSERT INTO models (name, brand_id) SELECT 'C35L 2.0', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c35l 2.0');

  INSERT INTO models (name, brand_id) SELECT 'Deliver 9', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'deliver 9');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'deliver 9';
  INSERT INTO versions (name, model_id) SELECT 'Deliver 9 Cargo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'deliver 9 cargo');

  INSERT INTO models (name, brand_id) SELECT 'DELIVER 9', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'deliver 9');

  INSERT INTO models (name, brand_id) SELECT 'E-Deliver 3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e-deliver 3');

  INSERT INTO models (name, brand_id) SELECT 'E-Deliver 9', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e-deliver 9');

  INSERT INTO models (name, brand_id) SELECT 'Eg50', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eg50');

  INSERT INTO models (name, brand_id) SELECT 'Ev30', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ev30');

  INSERT INTO models (name, brand_id) SELECT 'Ev80', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ev80');

  INSERT INTO models (name, brand_id) SELECT 'G90', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'g90');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't60';
  INSERT INTO versions (name, model_id) SELECT 'T60 D20', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't60 d20');
  INSERT INTO versions (name, model_id) SELECT 'T60 GLX', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't60 glx');
  INSERT INTO versions (name, model_id) SELECT 'T60 Max', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't60 max');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't90';
  INSERT INTO versions (name, model_id) SELECT 'T90 Ev', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't90 ev');

END $$;

-- === Mazda ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mazda';

  INSERT INTO models (name, brand_id) SELECT '147', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '147');

  INSERT INTO models (name, brand_id) SELECT '808', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '808');

  INSERT INTO models (name, brand_id) SELECT 'B-Series', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'b-series');

  INSERT INTO models (name, brand_id) SELECT 'Cx 6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx 6');

  INSERT INTO models (name, brand_id) SELECT 'CX9 GT AWD', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx9 gt awd');

  INSERT INTO models (name, brand_id) SELECT 'Mazda Rx-8', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mazda rx-8');

  INSERT INTO models (name, brand_id) SELECT 'Mazda5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mazda5');

  INSERT INTO models (name, brand_id) SELECT 'Mx-3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mx-3');

  INSERT INTO models (name, brand_id) SELECT 'Mx-6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mx-6');

  INSERT INTO models (name, brand_id) SELECT 'Navajo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'navajo');

  INSERT INTO models (name, brand_id) SELECT 'Premacy', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'premacy');

  INSERT INTO models (name, brand_id) SELECT 'Rx-7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rx-7');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2';
  INSERT INTO versions (name, model_id) SELECT '2 Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2 sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '3';
  INSERT INTO versions (name, model_id) SELECT '3 Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '3 sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx-7';
  INSERT INTO versions (name, model_id) SELECT 'Cx-7 Fl', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cx-7 fl');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mazda2';
  INSERT INTO versions (name, model_id) SELECT 'Mazda2 Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mazda2 sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mazda3';
  INSERT INTO versions (name, model_id) SELECT 'Mazda3 Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mazda3 sport');

END $$;

-- === Mclaren ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mclaren';

  INSERT INTO models (name, brand_id) SELECT '540 C', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '540 c');

  INSERT INTO models (name, brand_id) SELECT '570 S', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '570 s');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '570 s';
  INSERT INTO versions (name, model_id) SELECT '570 S Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '570 s spider');

  INSERT INTO models (name, brand_id) SELECT '650 S', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '650 s');

  INSERT INTO models (name, brand_id) SELECT '675 Lt', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '675 lt');

  INSERT INTO models (name, brand_id) SELECT '720 S', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '720 s');

  INSERT INTO models (name, brand_id) SELECT '765 Lt 4.0 I', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '765 lt 4.0 i');

END $$;

-- === McLaren ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mclaren';

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '12c';
  INSERT INTO versions (name, model_id) SELECT '12C', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '12c');
  INSERT INTO versions (name, model_id) SELECT '12C Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '12c spider');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '540c';
  INSERT INTO versions (name, model_id) SELECT '540C', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '540c');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '570s';
  INSERT INTO versions (name, model_id) SELECT '570S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '570s');
  INSERT INTO versions (name, model_id) SELECT '570S Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '570s spider');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '570gt';
  INSERT INTO versions (name, model_id) SELECT '570GT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '570gt');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '600lt';
  INSERT INTO versions (name, model_id) SELECT '600LT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '600lt');
  INSERT INTO versions (name, model_id) SELECT '600LT Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '600lt spider');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '620r';
  INSERT INTO versions (name, model_id) SELECT '620R', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '620r');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '650s';
  INSERT INTO versions (name, model_id) SELECT '650S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '650s');
  INSERT INTO versions (name, model_id) SELECT '650S Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '650s spider');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '675lt';
  INSERT INTO versions (name, model_id) SELECT '675LT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '675lt');
  INSERT INTO versions (name, model_id) SELECT '675LT Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '675lt spider');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '720s';
  INSERT INTO versions (name, model_id) SELECT '720S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '720s');
  INSERT INTO versions (name, model_id) SELECT '720S Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '720s spider');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '765lt';
  INSERT INTO versions (name, model_id) SELECT '765LT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '765lt');
  INSERT INTO versions (name, model_id) SELECT '765LT Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '765lt spider');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '750s';
  INSERT INTO versions (name, model_id) SELECT '750S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '750s');
  INSERT INTO versions (name, model_id) SELECT '750S Spider', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '750s spider');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt';
  INSERT INTO versions (name, model_id) SELECT 'GT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'artura';
  INSERT INTO versions (name, model_id) SELECT 'Artura', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'artura');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'p1';
  INSERT INTO versions (name, model_id) SELECT 'P1', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p1');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'senna';
  INSERT INTO versions (name, model_id) SELECT 'Senna', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'senna');
  INSERT INTO versions (name, model_id) SELECT 'Senna GTR', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'senna gtr');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'speedtail';
  INSERT INTO versions (name, model_id) SELECT 'Speedtail', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'speedtail');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'elva';
  INSERT INTO versions (name, model_id) SELECT 'Elva', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'elva');

END $$;

-- === Mercedes-Benz ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mercedes-benz';

  INSERT INTO models (name, brand_id) SELECT '113', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '113');

  INSERT INTO models (name, brand_id) SELECT '180', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '180');

  INSERT INTO models (name, brand_id) SELECT '190', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '190');

  INSERT INTO models (name, brand_id) SELECT '190SL', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '190sl');

  INSERT INTO models (name, brand_id) SELECT '200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '200');

  INSERT INTO models (name, brand_id) SELECT '2002', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2002');

  INSERT INTO models (name, brand_id) SELECT '220', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '220');

  INSERT INTO models (name, brand_id) SELECT '230', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '230');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '230';
  INSERT INTO versions (name, model_id) SELECT '230 Sl', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '230 sl');

  INSERT INTO models (name, brand_id) SELECT '240', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '240');

  INSERT INTO models (name, brand_id) SELECT '250', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '250');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '250';
  INSERT INTO versions (name, model_id) SELECT '250 SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '250 se');

  INSERT INTO models (name, brand_id) SELECT '250Sl', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '250sl');

  INSERT INTO models (name, brand_id) SELECT '260', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '260');

  INSERT INTO models (name, brand_id) SELECT '280', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '280');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '280';
  INSERT INTO versions (name, model_id) SELECT '280 C', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '280 c');
  INSERT INTO versions (name, model_id) SELECT '280 Ce', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '280 ce');
  INSERT INTO versions (name, model_id) SELECT '280 Sl', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '280 sl');

  INSERT INTO models (name, brand_id) SELECT '280GE', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '280ge');

  INSERT INTO models (name, brand_id) SELECT '300', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '300');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '300';
  INSERT INTO versions (name, model_id) SELECT '300 E', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '300 e');
  INSERT INTO versions (name, model_id) SELECT '300 Ce', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '300 ce');
  INSERT INTO versions (name, model_id) SELECT '300 SE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '300 se');
  INSERT INTO versions (name, model_id) SELECT '300 Sel', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '300 sel');

  INSERT INTO models (name, brand_id) SELECT '300SL', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '300sl');

  INSERT INTO models (name, brand_id) SELECT '300Te', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '300te');

  INSERT INTO models (name, brand_id) SELECT '320 CE', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '320 ce');

  INSERT INTO models (name, brand_id) SELECT '350', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '350');

  INSERT INTO models (name, brand_id) SELECT '380', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '380');

  INSERT INTO models (name, brand_id) SELECT '415', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '415');

  INSERT INTO models (name, brand_id) SELECT '420 Se', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '420 se');

  INSERT INTO models (name, brand_id) SELECT '450 Sl', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '450 sl');

  INSERT INTO models (name, brand_id) SELECT '500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '500');

  INSERT INTO models (name, brand_id) SELECT '560', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '560');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '560';
  INSERT INTO versions (name, model_id) SELECT '560 Sl', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '560 sl');

  INSERT INTO models (name, brand_id) SELECT 'A', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a';
  INSERT INTO versions (name, model_id) SELECT 'A 160', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 160');
  INSERT INTO versions (name, model_id) SELECT 'A 170', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 170');
  INSERT INTO versions (name, model_id) SELECT 'A 180', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 180');
  INSERT INTO versions (name, model_id) SELECT 'A 200', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 200');
  INSERT INTO versions (name, model_id) SELECT 'A 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 250');
  INSERT INTO versions (name, model_id) SELECT 'A 35 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 35 amg');
  INSERT INTO versions (name, model_id) SELECT 'A 45 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 45 amg');
  INSERT INTO versions (name, model_id) SELECT 'A 45 S AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 45 s amg');
  INSERT INTO versions (name, model_id) SELECT 'Sedan', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sedan');
  INSERT INTO versions (name, model_id) SELECT 'Hatchback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hatchback');

  INSERT INTO models (name, brand_id) SELECT 'Axor', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'axor');

  INSERT INTO models (name, brand_id) SELECT 'B', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'b');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'b';
  INSERT INTO versions (name, model_id) SELECT 'B 170', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'b 170');
  INSERT INTO versions (name, model_id) SELECT 'B 180', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'b 180');
  INSERT INTO versions (name, model_id) SELECT 'B 200', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'b 200');
  INSERT INTO versions (name, model_id) SELECT 'B 220', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'b 220');
  INSERT INTO versions (name, model_id) SELECT 'B 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'b 250');

  INSERT INTO models (name, brand_id) SELECT 'C', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c';
  INSERT INTO versions (name, model_id) SELECT 'C 180', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 180');
  INSERT INTO versions (name, model_id) SELECT 'C 200', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 200');
  INSERT INTO versions (name, model_id) SELECT 'C 220', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 220');
  INSERT INTO versions (name, model_id) SELECT 'C 230', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 230');
  INSERT INTO versions (name, model_id) SELECT 'C 240', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 240');
  INSERT INTO versions (name, model_id) SELECT 'C 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 250');
  INSERT INTO versions (name, model_id) SELECT 'C 280', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 280');
  INSERT INTO versions (name, model_id) SELECT 'C 300', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 300');
  INSERT INTO versions (name, model_id) SELECT 'C 320', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 320');
  INSERT INTO versions (name, model_id) SELECT 'C 350', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 350');
  INSERT INTO versions (name, model_id) SELECT 'C 400', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 400');
  INSERT INTO versions (name, model_id) SELECT 'C 450', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 450');
  INSERT INTO versions (name, model_id) SELECT 'C 43 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 43 amg');
  INSERT INTO versions (name, model_id) SELECT 'C 55 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 55 amg');
  INSERT INTO versions (name, model_id) SELECT 'C 63 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 63 amg');
  INSERT INTO versions (name, model_id) SELECT 'C 63 S AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 63 s amg');
  INSERT INTO versions (name, model_id) SELECT 'Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe');
  INSERT INTO versions (name, model_id) SELECT 'Cabrio', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cabrio');
  INSERT INTO versions (name, model_id) SELECT 'Estate', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'estate');

  INSERT INTO models (name, brand_id) SELECT 'C32 AMG', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c32 amg');

  INSERT INTO models (name, brand_id) SELECT 'Ce 280', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ce 280');

  INSERT INTO models (name, brand_id) SELECT 'Cl 500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cl 500');

  INSERT INTO models (name, brand_id) SELECT 'Cl 550', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cl 550');

  INSERT INTO models (name, brand_id) SELECT 'Cl 63 Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cl 63 amg');

  INSERT INTO models (name, brand_id) SELECT 'Cl 65 Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cl 65 amg');

  INSERT INTO models (name, brand_id) SELECT 'CL55 AMG 5.5 AUT', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cl55 amg 5.5 aut');

  INSERT INTO models (name, brand_id) SELECT 'Clase CL', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase cl');

  INSERT INTO models (name, brand_id) SELECT 'Clase Cla', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase cla');

  INSERT INTO models (name, brand_id) SELECT 'Clase Clc', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase clc');

  INSERT INTO models (name, brand_id) SELECT 'Clase Clk', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase clk');

  INSERT INTO models (name, brand_id) SELECT 'Clase Cls', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase cls');

  INSERT INTO models (name, brand_id) SELECT 'Clase Gl', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase gl');

  INSERT INTO models (name, brand_id) SELECT 'Clase Gla', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase gla');

  INSERT INTO models (name, brand_id) SELECT 'Clase Glc', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase glc');

  INSERT INTO models (name, brand_id) SELECT 'Clase Gle', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase gle');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase gle';
  INSERT INTO versions (name, model_id) SELECT 'Clase Gle Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'clase gle coupe');

  INSERT INTO models (name, brand_id) SELECT 'Clase Glk', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase glk');

  INSERT INTO models (name, brand_id) SELECT 'Clase Gls', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase gls');

  INSERT INTO models (name, brand_id) SELECT 'Clase M', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase m');

  INSERT INTO models (name, brand_id) SELECT 'Clase Sl', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase sl');

  INSERT INTO models (name, brand_id) SELECT 'Clase Slc', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase slc');

  INSERT INTO models (name, brand_id) SELECT 'Clase Slk', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase slk');

  INSERT INTO models (name, brand_id) SELECT 'Clase Sls Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase sls amg');

  INSERT INTO models (name, brand_id) SELECT 'Clase V', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase v');

  INSERT INTO models (name, brand_id) SELECT 'Clase X', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase x');

  INSERT INTO models (name, brand_id) SELECT 'Clc 200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clc 200');

  INSERT INTO models (name, brand_id) SELECT 'Cle', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cle');

  INSERT INTO models (name, brand_id) SELECT 'Clk 280', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clk 280');

  INSERT INTO models (name, brand_id) SELECT 'Clk 320', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clk 320');

  INSERT INTO models (name, brand_id) SELECT 'Clk 55 Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clk 55 amg');

  INSERT INTO models (name, brand_id) SELECT 'Clk 63 Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clk 63 amg');

  INSERT INTO models (name, brand_id) SELECT 'Cls 350', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cls 350');

  INSERT INTO models (name, brand_id) SELECT 'Cls 400', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cls 400');

  INSERT INTO models (name, brand_id) SELECT 'Cls 63 Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cls 63 amg');

  INSERT INTO models (name, brand_id) SELECT 'E 350', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e 350');

  INSERT INTO models (name, brand_id) SELECT 'E 430', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e 430');

  INSERT INTO models (name, brand_id) SELECT 'E 500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e 500');

  INSERT INTO models (name, brand_id) SELECT 'E 55', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e 55');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e 55';
  INSERT INTO versions (name, model_id) SELECT 'E 55 Amg', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 55 amg');

  INSERT INTO models (name, brand_id) SELECT 'E 63', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e 63');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e 63';
  INSERT INTO versions (name, model_id) SELECT 'E 63 Amg', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 63 amg');

  INSERT INTO models (name, brand_id) SELECT 'E 63S AMG', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e 63s amg');

  INSERT INTO models (name, brand_id) SELECT 'E53 Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e53 amg');

  INSERT INTO models (name, brand_id) SELECT 'G ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'g ');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'g ';
  INSERT INTO versions (name, model_id) SELECT 'G 280', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 280');
  INSERT INTO versions (name, model_id) SELECT 'G 290', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 290');
  INSERT INTO versions (name, model_id) SELECT 'G 350', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 350');
  INSERT INTO versions (name, model_id) SELECT 'G 500', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 500');
  INSERT INTO versions (name, model_id) SELECT 'G 280GE', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 280ge');
  INSERT INTO versions (name, model_id) SELECT 'G 400 D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 400 d');
  INSERT INTO versions (name, model_id) SELECT 'G 55 Amg', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 55 amg');
  INSERT INTO versions (name, model_id) SELECT 'G 63 Amg', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 63 amg');

  INSERT INTO models (name, brand_id) SELECT 'Gl 63 Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gl 63 amg');

  INSERT INTO models (name, brand_id) SELECT 'Glc63', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glc63');

  INSERT INTO models (name, brand_id) SELECT 'Glk 280', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glk 280');

  INSERT INTO models (name, brand_id) SELECT 'Glk 350', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glk 350');

  INSERT INTO models (name, brand_id) SELECT 'Glk-Class', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glk-class');

  INSERT INTO models (name, brand_id) SELECT 'Gt  63 S Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt  63 s amg');

  INSERT INTO models (name, brand_id) SELECT 'Gt 63 Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt 63 amg');

  INSERT INTO models (name, brand_id) SELECT 'Gt C', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt c');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt c';
  INSERT INTO versions (name, model_id) SELECT 'Gt C Amg', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt c amg');

  INSERT INTO models (name, brand_id) SELECT 'Gt-S Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt-s amg');

  INSERT INTO models (name, brand_id) SELECT 'GT63s', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt63s');

  INSERT INTO models (name, brand_id) SELECT 'Maybach 4.0', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'maybach 4.0');

  INSERT INTO models (name, brand_id) SELECT 'Mb140', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mb140');

  INSERT INTO models (name, brand_id) SELECT 'Ml 230', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ml 230');

  INSERT INTO models (name, brand_id) SELECT 'Ml 300', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ml 300');

  INSERT INTO models (name, brand_id) SELECT 'Ml 350', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ml 350');

  INSERT INTO models (name, brand_id) SELECT 'Ml 500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ml 500');

  INSERT INTO models (name, brand_id) SELECT 'Ml 63 Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ml 63 amg');

  INSERT INTO models (name, brand_id) SELECT 'S 220', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's 220');

  INSERT INTO models (name, brand_id) SELECT 'S 280', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's 280');

  INSERT INTO models (name, brand_id) SELECT 'S 320', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's 320');

  INSERT INTO models (name, brand_id) SELECT 'S 450', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's 450');

  INSERT INTO models (name, brand_id) SELECT 'S 65', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's 65');

  INSERT INTO models (name, brand_id) SELECT 'S600L', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's600l');

  INSERT INTO models (name, brand_id) SELECT 'Se 250', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'se 250');

  INSERT INTO models (name, brand_id) SELECT 'Se 280', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'se 280');

  INSERT INTO models (name, brand_id) SELECT 'Sec 500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sec 500');

  INSERT INTO models (name, brand_id) SELECT 'Sel 400', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sel 400');

  INSERT INTO models (name, brand_id) SELECT 'Sinmodelo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sinmodelo');

  INSERT INTO models (name, brand_id) SELECT 'Sl', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sl');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sl';
  INSERT INTO versions (name, model_id) SELECT 'SL 43', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sl 43');
  INSERT INTO versions (name, model_id) SELECT 'SL 55 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sl 55 amg');
  INSERT INTO versions (name, model_id) SELECT 'SL 63 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sl 63 amg');
  INSERT INTO versions (name, model_id) SELECT 'SL 65 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sl 65 amg');
  INSERT INTO versions (name, model_id) SELECT 'SL 400', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sl 400');
  INSERT INTO versions (name, model_id) SELECT 'SL 500', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sl 500');

  INSERT INTO models (name, brand_id) SELECT 'Sl600', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sl600');

  INSERT INTO models (name, brand_id) SELECT 'SL65', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sl65');

  INSERT INTO models (name, brand_id) SELECT 'Slc 43 Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'slc 43 amg');

  INSERT INTO models (name, brand_id) SELECT 'Slc 450', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'slc 450');

  INSERT INTO models (name, brand_id) SELECT 'Slk 300', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'slk 300');

  INSERT INTO models (name, brand_id) SELECT 'Slk 55 Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'slk 55 amg');

  INSERT INTO models (name, brand_id) SELECT 'Sls Amg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sls amg');

  INSERT INTO models (name, brand_id) SELECT 'Unimog', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'unimog');

  INSERT INTO models (name, brand_id) SELECT 'V-220', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v-220');

  INSERT INTO models (name, brand_id) SELECT 'V250', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v250');

  INSERT INTO models (name, brand_id) SELECT 'Vito111 CDI', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vito111 cdi');

  INSERT INTO models (name, brand_id) SELECT 'X 250 D', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x 250 d');

  INSERT INTO models (name, brand_id) SELECT 'X 250D', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x 250d');

  INSERT INTO models (name, brand_id) SELECT 'X 350 D', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x 350 d');

  INSERT INTO models (name, brand_id) SELECT 'X350 D', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x350 d');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'amg gt';
  INSERT INTO versions (name, model_id) SELECT 'GT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt');
  INSERT INTO versions (name, model_id) SELECT 'GT S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt s');
  INSERT INTO versions (name, model_id) SELECT 'GT C', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt c');
  INSERT INTO versions (name, model_id) SELECT 'GT R', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt r');
  INSERT INTO versions (name, model_id) SELECT 'GT R Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt r pro');
  INSERT INTO versions (name, model_id) SELECT 'GT 43', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 43');
  INSERT INTO versions (name, model_id) SELECT 'GT 53', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 53');
  INSERT INTO versions (name, model_id) SELECT 'GT 63', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 63');
  INSERT INTO versions (name, model_id) SELECT 'GT 63 S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 63 s');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'amg gt';
  INSERT INTO versions (name, model_id) SELECT 'GT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt');
  INSERT INTO versions (name, model_id) SELECT 'GT S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt s');
  INSERT INTO versions (name, model_id) SELECT 'GT C', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt c');
  INSERT INTO versions (name, model_id) SELECT 'GT R', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt r');
  INSERT INTO versions (name, model_id) SELECT 'GT R Pro', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt r pro');
  INSERT INTO versions (name, model_id) SELECT 'GT 43', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 43');
  INSERT INTO versions (name, model_id) SELECT 'GT 53', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 53');
  INSERT INTO versions (name, model_id) SELECT 'GT 63', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 63');
  INSERT INTO versions (name, model_id) SELECT 'GT 63 S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 63 s');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'citan';
  INSERT INTO versions (name, model_id) SELECT 'Citan 109', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'citan 109');
  INSERT INTO versions (name, model_id) SELECT 'Citan 111', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'citan 111');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cla';
  INSERT INTO versions (name, model_id) SELECT 'CLA 180', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cla 180');
  INSERT INTO versions (name, model_id) SELECT 'CLA 200', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cla 200');
  INSERT INTO versions (name, model_id) SELECT 'CLA 220', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cla 220');
  INSERT INTO versions (name, model_id) SELECT 'CLA 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cla 250');
  INSERT INTO versions (name, model_id) SELECT 'CLA 35 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cla 35 amg');
  INSERT INTO versions (name, model_id) SELECT 'CLA 45 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cla 45 amg');
  INSERT INTO versions (name, model_id) SELECT 'CLA 45 S AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cla 45 s amg');
  INSERT INTO versions (name, model_id) SELECT 'Shooting Brake', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'shooting brake');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase e';
  INSERT INTO versions (name, model_id) SELECT 'E 200', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 200');
  INSERT INTO versions (name, model_id) SELECT 'E 220d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 220d');
  INSERT INTO versions (name, model_id) SELECT 'E 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 250');
  INSERT INTO versions (name, model_id) SELECT 'E 300', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 300');
  INSERT INTO versions (name, model_id) SELECT 'E 350', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 350');
  INSERT INTO versions (name, model_id) SELECT 'E 400', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 400');
  INSERT INTO versions (name, model_id) SELECT 'E 450', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 450');
  INSERT INTO versions (name, model_id) SELECT 'E 53 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 53 amg');
  INSERT INTO versions (name, model_id) SELECT 'E 63 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 63 amg');
  INSERT INTO versions (name, model_id) SELECT 'E 63 S AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 63 s amg');
  INSERT INTO versions (name, model_id) SELECT 'Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe');
  INSERT INTO versions (name, model_id) SELECT 'Cabrio', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cabrio');
  INSERT INTO versions (name, model_id) SELECT 'All-Terrain', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'all-terrain');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase g';
  INSERT INTO versions (name, model_id) SELECT 'G 350d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 350d');
  INSERT INTO versions (name, model_id) SELECT 'G 400d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 400d');
  INSERT INTO versions (name, model_id) SELECT 'G 500', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 500');
  INSERT INTO versions (name, model_id) SELECT 'G 63 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 63 amg');
  INSERT INTO versions (name, model_id) SELECT 'G 65 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g 65 amg');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase s';
  INSERT INTO versions (name, model_id) SELECT 'S 350d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's 350d');
  INSERT INTO versions (name, model_id) SELECT 'S 400', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's 400');
  INSERT INTO versions (name, model_id) SELECT 'S 450', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's 450');
  INSERT INTO versions (name, model_id) SELECT 'S 500', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's 500');
  INSERT INTO versions (name, model_id) SELECT 'S 560', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's 560');
  INSERT INTO versions (name, model_id) SELECT 'S 580', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's 580');
  INSERT INTO versions (name, model_id) SELECT 'S 63 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's 63 amg');
  INSERT INTO versions (name, model_id) SELECT 'S 65 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's 65 amg');
  INSERT INTO versions (name, model_id) SELECT 'Maybach S 560', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'maybach s 560');
  INSERT INTO versions (name, model_id) SELECT 'Maybach S 580', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'maybach s 580');
  INSERT INTO versions (name, model_id) SELECT 'Maybach S 680', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'maybach s 680');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e 220';
  INSERT INTO versions (name, model_id) SELECT 'E 220 D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 220 d');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eqa';
  INSERT INTO versions (name, model_id) SELECT 'EQA 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqa 250');
  INSERT INTO versions (name, model_id) SELECT 'EQA 300', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqa 300');
  INSERT INTO versions (name, model_id) SELECT 'EQA 350', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqa 350');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eqe';
  INSERT INTO versions (name, model_id) SELECT 'EQE 300', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqe 300');
  INSERT INTO versions (name, model_id) SELECT 'EQE 350', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqe 350');
  INSERT INTO versions (name, model_id) SELECT 'EQE 500', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqe 500');
  INSERT INTO versions (name, model_id) SELECT 'EQE 43 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqe 43 amg');
  INSERT INTO versions (name, model_id) SELECT 'EQE 53 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqe 53 amg');
  INSERT INTO versions (name, model_id) SELECT 'SUV', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'suv');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eqs';
  INSERT INTO versions (name, model_id) SELECT 'EQS 450', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqs 450');
  INSERT INTO versions (name, model_id) SELECT 'EQS 500', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqs 500');
  INSERT INTO versions (name, model_id) SELECT 'EQS 580', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqs 580');
  INSERT INTO versions (name, model_id) SELECT 'EQS 53 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqs 53 amg');
  INSERT INTO versions (name, model_id) SELECT 'EQS SUV 450', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqs suv 450');
  INSERT INTO versions (name, model_id) SELECT 'EQS SUV 580', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eqs suv 580');
  INSERT INTO versions (name, model_id) SELECT 'Maybach EQS 680', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'maybach eqs 680');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gla';
  INSERT INTO versions (name, model_id) SELECT 'GLA 180', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gla 180');
  INSERT INTO versions (name, model_id) SELECT 'GLA 200', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gla 200');
  INSERT INTO versions (name, model_id) SELECT 'GLA 220', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gla 220');
  INSERT INTO versions (name, model_id) SELECT 'GLA 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gla 250');
  INSERT INTO versions (name, model_id) SELECT 'GLA 35 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gla 35 amg');
  INSERT INTO versions (name, model_id) SELECT 'GLA 45 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gla 45 amg');
  INSERT INTO versions (name, model_id) SELECT 'GLA 45 S AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gla 45 s amg');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glb';
  INSERT INTO versions (name, model_id) SELECT 'GLB 180', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glb 180');
  INSERT INTO versions (name, model_id) SELECT 'GLB 200', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glb 200');
  INSERT INTO versions (name, model_id) SELECT 'GLB 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glb 250');
  INSERT INTO versions (name, model_id) SELECT 'GLB 200d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glb 200d');
  INSERT INTO versions (name, model_id) SELECT 'GLB 220d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glb 220d');
  INSERT INTO versions (name, model_id) SELECT 'GLB 35 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glb 35 amg');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glc';
  INSERT INTO versions (name, model_id) SELECT 'GLC 200', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 200');
  INSERT INTO versions (name, model_id) SELECT 'GLC 220d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 220d');
  INSERT INTO versions (name, model_id) SELECT 'GLC 250', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 250');
  INSERT INTO versions (name, model_id) SELECT 'GLC 300', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 300');
  INSERT INTO versions (name, model_id) SELECT 'GLC 350e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 350e');
  INSERT INTO versions (name, model_id) SELECT 'GLC 43 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 43 amg');
  INSERT INTO versions (name, model_id) SELECT 'GLC 63 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 63 amg');
  INSERT INTO versions (name, model_id) SELECT 'GLC 63 S AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 63 s amg');
  INSERT INTO versions (name, model_id) SELECT 'Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gle';
  INSERT INTO versions (name, model_id) SELECT 'GLE 250d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 250d');
  INSERT INTO versions (name, model_id) SELECT 'GLE 300d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 300d');
  INSERT INTO versions (name, model_id) SELECT 'GLE 350', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 350');
  INSERT INTO versions (name, model_id) SELECT 'GLE 350d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 350d');
  INSERT INTO versions (name, model_id) SELECT 'GLE 400d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 400d');
  INSERT INTO versions (name, model_id) SELECT 'GLE 450', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 450');
  INSERT INTO versions (name, model_id) SELECT 'GLE 500e', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 500e');
  INSERT INTO versions (name, model_id) SELECT 'GLE 53 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 53 amg');
  INSERT INTO versions (name, model_id) SELECT 'GLE 63 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 63 amg');
  INSERT INTO versions (name, model_id) SELECT 'GLE 63 S AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 63 s amg');
  INSERT INTO versions (name, model_id) SELECT 'Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gls';
  INSERT INTO versions (name, model_id) SELECT 'GLS 350d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 350d');
  INSERT INTO versions (name, model_id) SELECT 'GLS 400d', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 400d');
  INSERT INTO versions (name, model_id) SELECT 'GLS 450', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 450');
  INSERT INTO versions (name, model_id) SELECT 'GLS 500', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 500');
  INSERT INTO versions (name, model_id) SELECT 'GLS 580', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 580');
  INSERT INTO versions (name, model_id) SELECT 'GLS 600 Maybach', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 600 maybach');
  INSERT INTO versions (name, model_id) SELECT 'GLS 63 AMG', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 63 amg');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sprinter';
  INSERT INTO versions (name, model_id) SELECT 'Sprinter 213', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sprinter 213');
  INSERT INTO versions (name, model_id) SELECT 'Sprinter 308', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sprinter 308');
  INSERT INTO versions (name, model_id) SELECT 'Sprinter 312', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sprinter 312');
  INSERT INTO versions (name, model_id) SELECT 'Sprinter 313', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sprinter 313');
  INSERT INTO versions (name, model_id) SELECT 'Sprinter 314', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sprinter 314');
  INSERT INTO versions (name, model_id) SELECT 'Sprinter 315', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sprinter 315');
  INSERT INTO versions (name, model_id) SELECT 'Sprinter 316', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sprinter 316');
  INSERT INTO versions (name, model_id) SELECT 'Sprinter 413', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sprinter 413');
  INSERT INTO versions (name, model_id) SELECT 'Sprinter 415', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sprinter 415');
  INSERT INTO versions (name, model_id) SELECT 'Sprinter 515', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sprinter 515');
  INSERT INTO versions (name, model_id) SELECT 'Sprinter 516', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sprinter 516');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vito';
  INSERT INTO versions (name, model_id) SELECT 'Vito 109', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'vito 109');
  INSERT INTO versions (name, model_id) SELECT 'Vito 110', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'vito 110');
  INSERT INTO versions (name, model_id) SELECT 'Vito 111', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'vito 111');
  INSERT INTO versions (name, model_id) SELECT 'Vito 113', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'vito 113');
  INSERT INTO versions (name, model_id) SELECT 'Vito 114', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'vito 114');
  INSERT INTO versions (name, model_id) SELECT 'Vito 116', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'vito 116');
  INSERT INTO versions (name, model_id) SELECT 'Tourer', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tourer');

END $$;

-- === Mercury ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mercury';

  INSERT INTO models (name, brand_id) SELECT 'Bobcat', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bobcat');

  INSERT INTO models (name, brand_id) SELECT 'Comet', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'comet');

  INSERT INTO models (name, brand_id) SELECT 'Cougar', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cougar');

  INSERT INTO models (name, brand_id) SELECT 'Monarch', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'monarch');

  INSERT INTO models (name, brand_id) SELECT 'Mountaineer', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mountaineer');

  INSERT INTO models (name, brand_id) SELECT 'Sable', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sable');

END $$;

-- === Messerschmitt ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Messerschmitt'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'messerschmitt');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'messerschmitt';

  INSERT INTO models (name, brand_id) SELECT 'KR200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kr200');

END $$;

-- === MG ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mg';

  INSERT INTO models (name, brand_id) SELECT 'A Convertible', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a convertible');

  INSERT INTO models (name, brand_id) SELECT 'B', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'b');

  INSERT INTO models (name, brand_id) SELECT 'Cyberster', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cyberster');

  INSERT INTO models (name, brand_id) SELECT 'Mg Hs', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg hs');

  INSERT INTO models (name, brand_id) SELECT 'Mg Rx5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg rx5');

  INSERT INTO models (name, brand_id) SELECT 'Mg Zs', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg zs');

  INSERT INTO models (name, brand_id) SELECT 'Mg3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg3');

  INSERT INTO models (name, brand_id) SELECT 'Mg5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg5');

  INSERT INTO models (name, brand_id) SELECT 'Mg7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg7');

  INSERT INTO models (name, brand_id) SELECT 'Rx9', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rx9');

  INSERT INTO models (name, brand_id) SELECT 'ZR', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'zr');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '3';
  INSERT INTO versions (name, model_id) SELECT '3 Confort', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '3 confort');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt';
  INSERT INTO versions (name, model_id) SELECT 'GT 1.5', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 1.5');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'zs';
  INSERT INTO versions (name, model_id) SELECT 'Zs Ev', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'zs ev');

END $$;

-- === Mg Rover ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Mg Rover'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'mg rover');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mg rover';

  INSERT INTO models (name, brand_id) SELECT 'Tf', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tf');

  INSERT INTO models (name, brand_id) SELECT 'Zt', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'zt');

END $$;

-- === MINI ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mini';

  INSERT INTO models (name, brand_id) SELECT '1.5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1.5');

  INSERT INTO models (name, brand_id) SELECT 'Cabrio', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cabrio');

  INSERT INTO models (name, brand_id) SELECT 'Copper ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'copper ');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'copper ';
  INSERT INTO versions (name, model_id) SELECT 'Copper John Cooper W', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'copper john cooper w');

  INSERT INTO models (name, brand_id) SELECT 'F55', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f55');

  INSERT INTO models (name, brand_id) SELECT 'F56', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f56');

  INSERT INTO models (name, brand_id) SELECT 'Roadster', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'roadster');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cooper';
  INSERT INTO versions (name, model_id) SELECT 'Cooper S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cooper s');
  INSERT INTO versions (name, model_id) SELECT 'Cooper 1.6', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cooper 1.6');
  INSERT INTO versions (name, model_id) SELECT 'Cooper F56', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cooper f56');
  INSERT INTO versions (name, model_id) SELECT 'Cooper S F55', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cooper s f55');
  INSERT INTO versions (name, model_id) SELECT 'Cooper S R56', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cooper s r56');
  INSERT INTO versions (name, model_id) SELECT 'Cooper S 2.0 T', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cooper s 2.0 t');
  INSERT INTO versions (name, model_id) SELECT 'Cooper S F56 2.0 Aut', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cooper s f56 2.0 aut');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'countryman';
  INSERT INTO versions (name, model_id) SELECT 'Countryman S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'countryman s');
  INSERT INTO versions (name, model_id) SELECT 'Countryman Cooper', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'countryman cooper');

END $$;

-- === Mitsubishi ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mitsubishi';

  INSERT INTO models (name, brand_id) SELECT 'Amarok 4X4 Highline', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'amarok 4x4 highline');

  INSERT INTO models (name, brand_id) SELECT 'Canter', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'canter');

  INSERT INTO models (name, brand_id) SELECT 'Chariot', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'chariot');

  INSERT INTO models (name, brand_id) SELECT 'Delica', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'delica');

  INSERT INTO models (name, brand_id) SELECT 'Dion', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dion');

  INSERT INTO models (name, brand_id) SELECT 'Evo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'evo');

  INSERT INTO models (name, brand_id) SELECT 'Gt 3000', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt 3000');

  INSERT INTO models (name, brand_id) SELECT 'I', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i';
  INSERT INTO versions (name, model_id) SELECT 'I-Miev', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'i-miev');

  INSERT INTO models (name, brand_id) SELECT 'L100', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'l100');

  INSERT INTO models (name, brand_id) SELECT 'Ram 50', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ram 50');

  INSERT INTO models (name, brand_id) SELECT 'Rvr', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rvr');

  INSERT INTO models (name, brand_id) SELECT 'Sapporo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sapporo');

  INSERT INTO models (name, brand_id) SELECT 'Starion', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'starion');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eclipse';
  INSERT INTO versions (name, model_id) SELECT 'Eclipse Cross', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'eclipse cross');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'montero';
  INSERT INTO versions (name, model_id) SELECT 'Montero Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'montero sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'outlander';
  INSERT INTO versions (name, model_id) SELECT 'Outlander Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'outlander sport');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xpander';
  INSERT INTO versions (name, model_id) SELECT 'Xpander Cross', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xpander cross');

END $$;

-- === Mitsubishi-fuso ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Mitsubishi-fuso'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'mitsubishi-fuso');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mitsubishi-fuso';

  INSERT INTO models (name, brand_id) SELECT 'Canter', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'canter');

END $$;

-- === Morgan ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'morgan';

  INSERT INTO models (name, brand_id) SELECT '4/4 Sport', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '4/4 sport');

END $$;

-- === Morris ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Morris'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'morris');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'morris';

  INSERT INTO models (name, brand_id) SELECT 'Convertible', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'convertible');

  INSERT INTO models (name, brand_id) SELECT 'Minor Pick-Up', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'minor pick-up');

END $$;

-- === Motorrad ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Motorrad'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'motorrad');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'motorrad';

  INSERT INTO models (name, brand_id) SELECT 'Custom', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'custom');

  INSERT INTO models (name, brand_id) SELECT 'Imperial', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'imperial');

  INSERT INTO models (name, brand_id) SELECT 'Naked', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'naked');

  INSERT INTO models (name, brand_id) SELECT 'Racer', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'racer');

  INSERT INTO models (name, brand_id) SELECT 'Ttx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ttx');

END $$;

-- === Mv Agusta ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Mv Agusta'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'mv agusta');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mv agusta';

  INSERT INTO models (name, brand_id) SELECT 'Brutale', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'brutale');

  INSERT INTO models (name, brand_id) SELECT 'F3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f3');

  INSERT INTO models (name, brand_id) SELECT 'F4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f4');

END $$;

-- === Nach ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Nach'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'nach');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'nach';

  INSERT INTO models (name, brand_id) SELECT 'Turing', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'turing');

END $$;

-- === Nammi ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Nammi'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'nammi');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'nammi';

  INSERT INTO models (name, brand_id) SELECT '001', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '001');

END $$;

-- === Nash ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Nash'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'nash');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'nash';

  INSERT INTO models (name, brand_id) SELECT 'Coupe', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'coupe');

  INSERT INTO models (name, brand_id) SELECT 'Mustang', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mustang');

END $$;

-- === Neta ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Neta'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'neta');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'neta';

  INSERT INTO models (name, brand_id) SELECT 'Aya', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aya');

  INSERT INTO models (name, brand_id) SELECT 'GT', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt');

END $$;

-- === Nissan ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'nissan';

  INSERT INTO models (name, brand_id) SELECT '1800', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1800');

  INSERT INTO models (name, brand_id) SELECT '240', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '240');

  INSERT INTO models (name, brand_id) SELECT '240Z', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '240z');

  INSERT INTO models (name, brand_id) SELECT '2500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2500');

  INSERT INTO models (name, brand_id) SELECT '300', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '300');

  INSERT INTO models (name, brand_id) SELECT '300ZX', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '300zx');

  INSERT INTO models (name, brand_id) SELECT 'Ad Wagon', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ad wagon');

  INSERT INTO models (name, brand_id) SELECT 'Bluebird', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bluebird');

  INSERT INTO models (name, brand_id) SELECT 'Fairlady', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fairlady');

  INSERT INTO models (name, brand_id) SELECT 'G10', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'g10');

  INSERT INTO models (name, brand_id) SELECT 'Gtr', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gtr');

  INSERT INTO models (name, brand_id) SELECT 'J18', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'j18');

  INSERT INTO models (name, brand_id) SELECT 'Laurel', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'laurel');

  INSERT INTO models (name, brand_id) SELECT 'Mistral', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mistral');

  INSERT INTO models (name, brand_id) SELECT 'New Primera', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'new primera');

  INSERT INTO models (name, brand_id) SELECT 'Nissan Np300 Navara', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nissan np300 navara');

  INSERT INTO models (name, brand_id) SELECT 'NSX', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nsx');

  INSERT INTO models (name, brand_id) SELECT 'Nx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nx');

  INSERT INTO models (name, brand_id) SELECT 'Prairie', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'prairie');

  INSERT INTO models (name, brand_id) SELECT 'Presage', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'presage');

  INSERT INTO models (name, brand_id) SELECT 'Pulsar', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pulsar');

  INSERT INTO models (name, brand_id) SELECT 'Qashqai+2', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'qashqai+2');

  INSERT INTO models (name, brand_id) SELECT 'Qashqai2', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'qashqai2');

  INSERT INTO models (name, brand_id) SELECT 'Quest', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'quest');

  INSERT INTO models (name, brand_id) SELECT 'Serena', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serena');

  INSERT INTO models (name, brand_id) SELECT 'Silvia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'silvia');

  INSERT INTO models (name, brand_id) SELECT 'Skyline', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'skyline');

  INSERT INTO models (name, brand_id) SELECT 'Utl 720', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'utl 720');

  INSERT INTO models (name, brand_id) SELECT 'X-Terra', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x-terra');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kicks';
  INSERT INTO versions (name, model_id) SELECT 'Kicks Play', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'kicks play');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'navara';
  INSERT INTO versions (name, model_id) SELECT 'Navara NP300', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'navara np300');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nv350';
  INSERT INTO versions (name, model_id) SELECT 'Nv350 Urvan', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'nv350 urvan');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sentra';
  INSERT INTO versions (name, model_id) SELECT 'Sentra II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sentra ii');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'terrano';
  INSERT INTO versions (name, model_id) SELECT 'Terrano II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'terrano ii');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x-trail';
  INSERT INTO versions (name, model_id) SELECT 'X-Trail E-Power', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x-trail e-power');

END $$;

-- === Nissan Cidef ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Nissan Cidef'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'nissan cidef');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'nissan cidef';

  INSERT INTO models (name, brand_id) SELECT 'Altima', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'altima');

  INSERT INTO models (name, brand_id) SELECT 'D21', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd21');

  INSERT INTO models (name, brand_id) SELECT 'D22', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd22');

  INSERT INTO models (name, brand_id) SELECT 'Murano', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'murano');

  INSERT INTO models (name, brand_id) SELECT 'Navara', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'navara');

  INSERT INTO models (name, brand_id) SELECT 'New Primera', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'new primera');

  INSERT INTO models (name, brand_id) SELECT 'Pathfinder', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pathfinder');

  INSERT INTO models (name, brand_id) SELECT 'Platina', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'platina');

  INSERT INTO models (name, brand_id) SELECT 'Primera', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'primera');

  INSERT INTO models (name, brand_id) SELECT 'Qashqai', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'qashqai');

  INSERT INTO models (name, brand_id) SELECT 'Sentra', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sentra');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sentra';
  INSERT INTO versions (name, model_id) SELECT 'Sentra II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sentra ii');

  INSERT INTO models (name, brand_id) SELECT 'Teana', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'teana');

  INSERT INTO models (name, brand_id) SELECT 'Terrano', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'terrano');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'terrano';
  INSERT INTO versions (name, model_id) SELECT 'Terrano II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'terrano ii');

  INSERT INTO models (name, brand_id) SELECT 'Tiida', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiida');

  INSERT INTO models (name, brand_id) SELECT 'V16', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v16');

  INSERT INTO models (name, brand_id) SELECT 'X-Trail', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x-trail');

END $$;

-- === Nissan Marubeni ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Nissan Marubeni'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'nissan marubeni');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'nissan marubeni';

  INSERT INTO models (name, brand_id) SELECT '350Z', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '350z');

  INSERT INTO models (name, brand_id) SELECT '370Z', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '370z');

  INSERT INTO models (name, brand_id) SELECT 'Altima', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'altima');

  INSERT INTO models (name, brand_id) SELECT 'D21', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd21');

  INSERT INTO models (name, brand_id) SELECT 'D22', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd22');

  INSERT INTO models (name, brand_id) SELECT 'March', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'march');

  INSERT INTO models (name, brand_id) SELECT 'Maxima', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'maxima');

  INSERT INTO models (name, brand_id) SELECT 'Murano', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'murano');

  INSERT INTO models (name, brand_id) SELECT 'Navara', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'navara');

  INSERT INTO models (name, brand_id) SELECT 'New Primera', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'new primera');

  INSERT INTO models (name, brand_id) SELECT 'Pathfinder', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pathfinder');

  INSERT INTO models (name, brand_id) SELECT 'Patrol', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'patrol');

  INSERT INTO models (name, brand_id) SELECT 'Platina', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'platina');

  INSERT INTO models (name, brand_id) SELECT 'Primera', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'primera');

  INSERT INTO models (name, brand_id) SELECT 'Qashqai', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'qashqai');

  INSERT INTO models (name, brand_id) SELECT 'Sentra', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sentra');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sentra';
  INSERT INTO versions (name, model_id) SELECT 'Sentra II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sentra ii');

  INSERT INTO models (name, brand_id) SELECT 'Teana', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'teana');

  INSERT INTO models (name, brand_id) SELECT 'Terrano', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'terrano');

  INSERT INTO models (name, brand_id) SELECT 'Tiida', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiida');

  INSERT INTO models (name, brand_id) SELECT 'Urvan', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'urvan');

  INSERT INTO models (name, brand_id) SELECT 'V16', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v16');

  INSERT INTO models (name, brand_id) SELECT 'Versa', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'versa');

  INSERT INTO models (name, brand_id) SELECT 'X-Trail', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x-trail');

END $$;

-- === Nobel ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Nobel'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'nobel');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'nobel';

  INSERT INTO models (name, brand_id) SELECT 'Nobel 200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nobel 200');

END $$;

-- === Nsu ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Nsu'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'nsu');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'nsu';

  INSERT INTO models (name, brand_id) SELECT 'Prinz', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'prinz');

END $$;

-- === Oldsmobile ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'oldsmobile';

  INSERT INTO models (name, brand_id) SELECT '442', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '442');

  INSERT INTO models (name, brand_id) SELECT 'Aurora', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aurora');

  INSERT INTO models (name, brand_id) SELECT 'Cutlass', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cutlass');

  INSERT INTO models (name, brand_id) SELECT 'Delta', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'delta');

  INSERT INTO models (name, brand_id) SELECT 'Dynamic', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dynamic');

  INSERT INTO models (name, brand_id) SELECT 'Ninety Eight', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ninety eight');

  INSERT INTO models (name, brand_id) SELECT 'Omega', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'omega');

  INSERT INTO models (name, brand_id) SELECT 'Regency', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'regency');

  INSERT INTO models (name, brand_id) SELECT 'Toronado', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'toronado');

END $$;

-- === Omoda ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'omoda';

  INSERT INTO models (name, brand_id) SELECT 'C7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c7');

END $$;

-- === Opel ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'opel';

  INSERT INTO models (name, brand_id) SELECT 'Calibra', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'calibra');

  INSERT INTO models (name, brand_id) SELECT 'Caravan', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'caravan');

  INSERT INTO models (name, brand_id) SELECT 'Kapitan', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kapitan');

  INSERT INTO models (name, brand_id) SELECT 'Manta', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'manta');

  INSERT INTO models (name, brand_id) SELECT 'Rekord', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rekord');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rekord';
  INSERT INTO versions (name, model_id) SELECT 'Rekord Olympia', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rekord olympia');

  INSERT INTO models (name, brand_id) SELECT 'Venido', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'venido');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'crossland';
  INSERT INTO versions (name, model_id) SELECT 'Crossland X', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'crossland x');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grandland';
  INSERT INTO versions (name, model_id) SELECT 'Grandland X', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'grandland x');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mokka';
  INSERT INTO versions (name, model_id) SELECT 'Mokka X', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mokka x');

END $$;

-- === Ora ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Ora'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'ora');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'ora';

  INSERT INTO models (name, brand_id) SELECT '03', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '03');

END $$;

-- === Otra Marca ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Otra Marca'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'otra marca');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'otra marca';

  INSERT INTO models (name, brand_id) SELECT 'Cooper', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cooper');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cooper';
  INSERT INTO versions (name, model_id) SELECT 'Cooper S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cooper s');

  INSERT INTO models (name, brand_id) SELECT 'Countryman Cooper', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'countryman cooper');

  INSERT INTO models (name, brand_id) SELECT 'T6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't6');

END $$;

-- === Oz Racing ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Oz Racing'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'oz racing');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'oz racing';

  INSERT INTO models (name, brand_id) SELECT 'Oz Rally', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'oz rally');

END $$;

-- === Packard ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Packard'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'packard');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'packard';

  INSERT INTO models (name, brand_id) SELECT 'Packhard', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'packhard');

END $$;

-- === Parada ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Parada'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'parada');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'parada';

  INSERT INTO models (name, brand_id) SELECT 'Bano Quimico', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bano quimico');

END $$;

-- === Peerless ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Peerless'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'peerless');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'peerless';

  INSERT INTO models (name, brand_id) SELECT 'Boxster', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'boxster');

END $$;

-- === Peugeot ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'peugeot';

  INSERT INTO models (name, brand_id) SELECT '203', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '203');

  INSERT INTO models (name, brand_id) SELECT '403', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '403');

  INSERT INTO models (name, brand_id) SELECT '404', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '404');

  INSERT INTO models (name, brand_id) SELECT 'Doblo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'doblo');

  INSERT INTO models (name, brand_id) SELECT 'Megane', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'megane');

  INSERT INTO models (name, brand_id) SELECT 'Xr', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xr');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '206';
  INSERT INTO versions (name, model_id) SELECT '206 Sw', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '206 sw');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '3008';
  INSERT INTO versions (name, model_id) SELECT '3008 Hybrid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '3008 hybrid');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '307';
  INSERT INTO versions (name, model_id) SELECT '307 Sw', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '307 sw');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '407';
  INSERT INTO versions (name, model_id) SELECT '407 Sw', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '407 sw');
  INSERT INTO versions (name, model_id) SELECT '407 Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '407 coupe');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'partner';
  INSERT INTO versions (name, model_id) SELECT 'Partner Origin', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'partner origin');

END $$;

-- === Pgo ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'pgo';

  INSERT INTO models (name, brand_id) SELECT '600', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '600');

END $$;

-- === Piaggio ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'piaggio';

  INSERT INTO models (name, brand_id) SELECT 'Ape', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ape');

  INSERT INTO models (name, brand_id) SELECT 'Maxxi', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'maxxi');

  INSERT INTO models (name, brand_id) SELECT 'Porter', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'porter');

END $$;

-- === Pierce Arrow ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Pierce Arrow'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'pierce arrow');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'pierce arrow';

  INSERT INTO models (name, brand_id) SELECT '80-Tudor', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '80-tudor');

END $$;

-- === Plymouth ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Plymouth'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'plymouth');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'plymouth';

  INSERT INTO models (name, brand_id) SELECT 'Duster', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'duster');

  INSERT INTO models (name, brand_id) SELECT 'Grand Voyager', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand voyager');

  INSERT INTO models (name, brand_id) SELECT 'Reliant', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'reliant');

  INSERT INTO models (name, brand_id) SELECT 'S', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's');

  INSERT INTO models (name, brand_id) SELECT 'Scamp', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'scamp');

  INSERT INTO models (name, brand_id) SELECT 'Valiant', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'valiant');

  INSERT INTO models (name, brand_id) SELECT 'Volare', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'volare');

  INSERT INTO models (name, brand_id) SELECT 'Voyager', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'voyager');

END $$;

-- === Polaris ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'polaris';

  INSERT INTO models (name, brand_id) SELECT 'Scrambler', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'scrambler');

END $$;

-- === Pontiac ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'pontiac';

  INSERT INTO models (name, brand_id) SELECT 'Boneville', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'boneville');

  INSERT INTO models (name, brand_id) SELECT 'Bonneville', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bonneville');

  INSERT INTO models (name, brand_id) SELECT 'Camaro', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'camaro');

  INSERT INTO models (name, brand_id) SELECT 'Catalina', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'catalina');

  INSERT INTO models (name, brand_id) SELECT 'Chieftain', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'chieftain');

  INSERT INTO models (name, brand_id) SELECT 'Coupe', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'coupe');

  INSERT INTO models (name, brand_id) SELECT 'Firebird', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'firebird');

  INSERT INTO models (name, brand_id) SELECT 'Grand Prix', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand prix');

  INSERT INTO models (name, brand_id) SELECT 'Gto', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gto');

  INSERT INTO models (name, brand_id) SELECT 'Lemans', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lemans');

  INSERT INTO models (name, brand_id) SELECT 'Phoenix', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'phoenix');

  INSERT INTO models (name, brand_id) SELECT 'Safari', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'safari');

  INSERT INTO models (name, brand_id) SELECT 'Solstice', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'solstice');

  INSERT INTO models (name, brand_id) SELECT 'Sunbird', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sunbird');

  INSERT INTO models (name, brand_id) SELECT 'Sunfire', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sunfire');

  INSERT INTO models (name, brand_id) SELECT 'Trans Am', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'trans am');

  INSERT INTO models (name, brand_id) SELECT 'Ventura', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ventura');

END $$;

-- === Porsche ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'porsche';

  INSERT INTO models (name, brand_id) SELECT '356', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '356');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '356';
  INSERT INTO versions (name, model_id) SELECT '356 Sc', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '356 sc');
  INSERT INTO versions (name, model_id) SELECT '356 Speedster', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '356 speedster');

  INSERT INTO models (name, brand_id) SELECT '550', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '550');

  INSERT INTO models (name, brand_id) SELECT '718', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '718');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '718';
  INSERT INTO versions (name, model_id) SELECT 'Cayman', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayman');
  INSERT INTO versions (name, model_id) SELECT 'Cayman S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayman s');
  INSERT INTO versions (name, model_id) SELECT 'Cayman T', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayman t');
  INSERT INTO versions (name, model_id) SELECT 'Cayman GTS 4.0', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayman gts 4.0');
  INSERT INTO versions (name, model_id) SELECT 'Boxster', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'boxster');
  INSERT INTO versions (name, model_id) SELECT 'Boxster S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'boxster s');
  INSERT INTO versions (name, model_id) SELECT 'Boxster T', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'boxster t');
  INSERT INTO versions (name, model_id) SELECT 'Boxster GTS 4.0', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'boxster gts 4.0');
  INSERT INTO versions (name, model_id) SELECT 'Spyder', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'spyder');
  INSERT INTO versions (name, model_id) SELECT 'Spyder RS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'spyder rs');

  INSERT INTO models (name, brand_id) SELECT '910', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '910');

  INSERT INTO models (name, brand_id) SELECT '912', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '912');

  INSERT INTO models (name, brand_id) SELECT '914', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '914');

  INSERT INTO models (name, brand_id) SELECT '924', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '924');

  INSERT INTO models (name, brand_id) SELECT '928', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '928');

  INSERT INTO models (name, brand_id) SELECT '944', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '944');

  INSERT INTO models (name, brand_id) SELECT 'Coupe 968 Cp', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'coupe 968 cp');

  INSERT INTO models (name, brand_id) SELECT 'Gt2 Rs', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt2 rs');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt2 rs';
  INSERT INTO versions (name, model_id) SELECT 'GT2 RS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt2 rs');
  INSERT INTO versions (name, model_id) SELECT 'GT2 RS Weissach', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt2 rs weissach');

  INSERT INTO models (name, brand_id) SELECT 'Gt3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt3';
  INSERT INTO versions (name, model_id) SELECT 'GT3', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt3');
  INSERT INTO versions (name, model_id) SELECT 'GT3 RS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt3 rs');
  INSERT INTO versions (name, model_id) SELECT 'GT3 Touring', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt3 touring');

  INSERT INTO models (name, brand_id) SELECT 'Gt4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt4');

  INSERT INTO models (name, brand_id) SELECT 'Gts', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gts');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '911';
  INSERT INTO versions (name, model_id) SELECT 'Carrera', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera');
  INSERT INTO versions (name, model_id) SELECT 'Carrera S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera s');
  INSERT INTO versions (name, model_id) SELECT 'Carrera T', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera t');
  INSERT INTO versions (name, model_id) SELECT 'Carrera GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera gts');
  INSERT INTO versions (name, model_id) SELECT 'Carrera 4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera 4');
  INSERT INTO versions (name, model_id) SELECT 'Carrera 4S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera 4s');
  INSERT INTO versions (name, model_id) SELECT 'Carrera 4 GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera 4 gts');
  INSERT INTO versions (name, model_id) SELECT 'Targa 4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'targa 4');
  INSERT INTO versions (name, model_id) SELECT 'Targa 4S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'targa 4s');
  INSERT INTO versions (name, model_id) SELECT 'Targa 4 GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'targa 4 gts');
  INSERT INTO versions (name, model_id) SELECT 'Turbo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo');
  INSERT INTO versions (name, model_id) SELECT 'Turbo S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo s');
  INSERT INTO versions (name, model_id) SELECT 'Turbo Cabrio', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo cabrio');
  INSERT INTO versions (name, model_id) SELECT 'Dakar', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dakar');
  INSERT INTO versions (name, model_id) SELECT 'S/T', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's/t');
  INSERT INTO versions (name, model_id) SELECT 'Sport Classic', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport classic');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'boxster';
  INSERT INTO versions (name, model_id) SELECT 'Boxster', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'boxster');
  INSERT INTO versions (name, model_id) SELECT 'Boxster S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'boxster s');
  INSERT INTO versions (name, model_id) SELECT 'Boxster GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'boxster gts');
  INSERT INTO versions (name, model_id) SELECT 'Boxster Spyder', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'boxster spyder');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cayenne';
  INSERT INTO versions (name, model_id) SELECT 'Cayenne', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayenne');
  INSERT INTO versions (name, model_id) SELECT 'Cayenne S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayenne s');
  INSERT INTO versions (name, model_id) SELECT 'Cayenne GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayenne gts');
  INSERT INTO versions (name, model_id) SELECT 'Cayenne Turbo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayenne turbo');
  INSERT INTO versions (name, model_id) SELECT 'Cayenne Turbo GT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayenne turbo gt');
  INSERT INTO versions (name, model_id) SELECT 'Cayenne E-Hybrid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayenne e-hybrid');
  INSERT INTO versions (name, model_id) SELECT 'Cayenne S E-Hybrid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayenne s e-hybrid');
  INSERT INTO versions (name, model_id) SELECT 'Cayenne Turbo S E-Hybrid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayenne turbo s e-hybrid');
  INSERT INTO versions (name, model_id) SELECT 'Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe');
  INSERT INTO versions (name, model_id) SELECT 'Coupe S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe s');
  INSERT INTO versions (name, model_id) SELECT 'Coupe GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe gts');
  INSERT INTO versions (name, model_id) SELECT 'Coupe Turbo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe turbo');
  INSERT INTO versions (name, model_id) SELECT 'Coupe Turbo GT', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe turbo gt');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cayman';
  INSERT INTO versions (name, model_id) SELECT 'Cayman', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayman');
  INSERT INTO versions (name, model_id) SELECT 'Cayman S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayman s');
  INSERT INTO versions (name, model_id) SELECT 'Cayman GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayman gts');
  INSERT INTO versions (name, model_id) SELECT 'Cayman GT4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayman gt4');
  INSERT INTO versions (name, model_id) SELECT 'Cayman GT4 RS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cayman gt4 rs');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'macan';
  INSERT INTO versions (name, model_id) SELECT 'Macan', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'macan');
  INSERT INTO versions (name, model_id) SELECT 'Macan S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'macan s');
  INSERT INTO versions (name, model_id) SELECT 'Macan GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'macan gts');
  INSERT INTO versions (name, model_id) SELECT 'Macan Turbo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'macan turbo');
  INSERT INTO versions (name, model_id) SELECT 'Macan T', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'macan t');
  INSERT INTO versions (name, model_id) SELECT 'Macan 4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'macan 4');
  INSERT INTO versions (name, model_id) SELECT 'Macan 4S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'macan 4s');
  INSERT INTO versions (name, model_id) SELECT 'Macan Turbo Electric', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'macan turbo electric');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'panamera';
  INSERT INTO versions (name, model_id) SELECT 'Panamera', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'panamera');
  INSERT INTO versions (name, model_id) SELECT 'Panamera 4', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'panamera 4');
  INSERT INTO versions (name, model_id) SELECT 'Panamera S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'panamera s');
  INSERT INTO versions (name, model_id) SELECT 'Panamera GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'panamera gts');
  INSERT INTO versions (name, model_id) SELECT 'Panamera Turbo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'panamera turbo');
  INSERT INTO versions (name, model_id) SELECT 'Panamera Turbo S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'panamera turbo s');
  INSERT INTO versions (name, model_id) SELECT 'Panamera 4 E-Hybrid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'panamera 4 e-hybrid');
  INSERT INTO versions (name, model_id) SELECT 'Panamera 4S E-Hybrid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'panamera 4s e-hybrid');
  INSERT INTO versions (name, model_id) SELECT 'Panamera Turbo S E-Hybrid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'panamera turbo s e-hybrid');
  INSERT INTO versions (name, model_id) SELECT 'Sport Turismo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport turismo');
  INSERT INTO versions (name, model_id) SELECT 'Executive', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'executive');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'taycan';
  INSERT INTO versions (name, model_id) SELECT 'Taycan', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'taycan');
  INSERT INTO versions (name, model_id) SELECT 'Taycan 4S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'taycan 4s');
  INSERT INTO versions (name, model_id) SELECT 'Taycan GTS', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'taycan gts');
  INSERT INTO versions (name, model_id) SELECT 'Taycan Turbo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'taycan turbo');
  INSERT INTO versions (name, model_id) SELECT 'Taycan Turbo S', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'taycan turbo s');
  INSERT INTO versions (name, model_id) SELECT 'Taycan Cross Turismo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'taycan cross turismo');
  INSERT INTO versions (name, model_id) SELECT 'Taycan 4S Cross Turismo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'taycan 4s cross turismo');
  INSERT INTO versions (name, model_id) SELECT 'Taycan GTS Cross Turismo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'taycan gts cross turismo');
  INSERT INTO versions (name, model_id) SELECT 'Taycan Turbo Cross Turismo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'taycan turbo cross turismo');
  INSERT INTO versions (name, model_id) SELECT 'Taycan Turbo S Cross Turismo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'taycan turbo s cross turismo');
  INSERT INTO versions (name, model_id) SELECT 'Taycan Sport Turismo', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'taycan sport turismo');

END $$;

-- === Proton ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'proton';

  INSERT INTO models (name, brand_id) SELECT 'Standard', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'standard');

END $$;

-- === RAM ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'ram';

  INSERT INTO models (name, brand_id) SELECT '1000 ', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1000 ');

  INSERT INTO models (name, brand_id) SELECT 'Ram 1200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ram 1200');

  INSERT INTO models (name, brand_id) SELECT 'Ram 1500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ram 1500');

  INSERT INTO models (name, brand_id) SELECT 'Ram 2500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ram 2500');

  INSERT INTO models (name, brand_id) SELECT 'Ram Pickup', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ram pickup');

  INSERT INTO models (name, brand_id) SELECT 'Strada', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'strada');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'van 700';
  INSERT INTO versions (name, model_id) SELECT 'Van 700 Rapid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'van 700 rapid');

END $$;

-- === Randon ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'randon';

  INSERT INTO models (name, brand_id) SELECT '1100A', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1100a');

END $$;

-- === Range Rover ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'range rover';

  INSERT INTO models (name, brand_id) SELECT 'Discovery 4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'discovery 4');

  INSERT INTO models (name, brand_id) SELECT 'Efi', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'efi');

  INSERT INTO models (name, brand_id) SELECT 'Range Rover Sport', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'range rover sport');

  INSERT INTO models (name, brand_id) SELECT 'Ranger Rover Sport', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ranger rover sport');

END $$;

-- === Regal Raptor ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'regal raptor';

  INSERT INTO models (name, brand_id) SELECT 'Raptor', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'raptor');

END $$;

-- === Renault ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'renault';

  INSERT INTO models (name, brand_id) SELECT '21', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '21');

  INSERT INTO models (name, brand_id) SELECT '4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '4');

  INSERT INTO models (name, brand_id) SELECT 'Espace', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'espace');

  INSERT INTO models (name, brand_id) SELECT 'Florida', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'florida');

  INSERT INTO models (name, brand_id) SELECT 'Grand Scenic', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand scenic');

  INSERT INTO models (name, brand_id) SELECT 'Ika', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ika');

  INSERT INTO models (name, brand_id) SELECT 'Kango Express Diesel', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kango express diesel');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kango express diesel';
  INSERT INTO versions (name, model_id) SELECT 'Kango Express Diesel Dh', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'kango express diesel dh');
  INSERT INTO versions (name, model_id) SELECT 'Kango Express Diesel Cerrado', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'kango express diesel cerrado');
  INSERT INTO versions (name, model_id) SELECT 'Kango Express Diesel Company', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'kango express diesel company');

  INSERT INTO models (name, brand_id) SELECT 'Mégane', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mégane');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mégane';
  INSERT INTO versions (name, model_id) SELECT 'Megane II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'megane ii');
  INSERT INTO versions (name, model_id) SELECT 'Megane Rs', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'megane rs');
  INSERT INTO versions (name, model_id) SELECT 'Megane III', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'megane iii');

  INSERT INTO models (name, brand_id) SELECT 'R-11', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'r-11');

  INSERT INTO models (name, brand_id) SELECT 'R-12', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'r-12');

  INSERT INTO models (name, brand_id) SELECT 'R-18', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'r-18');

  INSERT INTO models (name, brand_id) SELECT 'R-19', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'r-19');

  INSERT INTO models (name, brand_id) SELECT 'R-21', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'r-21');

  INSERT INTO models (name, brand_id) SELECT 'R-5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'r-5');

  INSERT INTO models (name, brand_id) SELECT 'R-9', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'r-9');

  INSERT INTO models (name, brand_id) SELECT 'Scénic', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'scénic');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'scénic';
  INSERT INTO versions (name, model_id) SELECT 'Scénic I', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'scénic i');
  INSERT INTO versions (name, model_id) SELECT 'Scenic II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'scenic ii');

  INSERT INTO models (name, brand_id) SELECT 'Vel Satis', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vel satis');

  INSERT INTO models (name, brand_id) SELECT 'Zoe', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'zoe');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clio';
  INSERT INTO versions (name, model_id) SELECT 'Clio 2', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'clio 2');
  INSERT INTO versions (name, model_id) SELECT 'Clio IV', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'clio iv');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kangoo';
  INSERT INTO versions (name, model_id) SELECT 'Kangoo Express', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'kangoo express');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'laguna';
  INSERT INTO versions (name, model_id) SELECT 'Laguna II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'laguna ii');
  INSERT INTO versions (name, model_id) SELECT 'Laguna III', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'laguna iii');

END $$;

-- === Renault-samsung ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Renault-samsung'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'renault-samsung');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'renault-samsung';

  INSERT INTO models (name, brand_id) SELECT 'Sm3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sm3');

  INSERT INTO models (name, brand_id) SELECT 'Sm5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sm5');

  INSERT INTO models (name, brand_id) SELECT 'Sm7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sm7');

END $$;

-- === Riddara ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Riddara'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'riddara');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'riddara';

  INSERT INTO models (name, brand_id) SELECT 'Rd6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rd6');

  INSERT INTO models (name, brand_id) SELECT 'RD6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rd6');

END $$;

-- === Rivian ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'rivian';

  INSERT INTO models (name, brand_id) SELECT 'R1T', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'r1t');

END $$;

-- === Rolls-Royce ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'rolls-royce';

  INSERT INTO models (name, brand_id) SELECT 'Cullinan 4x4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cullinan 4x4');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cullinan 4x4';
  INSERT INTO versions (name, model_id) SELECT 'Cullinan', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cullinan');
  INSERT INTO versions (name, model_id) SELECT 'Black Badge', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'black badge');

  INSERT INTO models (name, brand_id) SELECT 'Ghost', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ghost');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ghost';
  INSERT INTO versions (name, model_id) SELECT 'Ghost', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ghost');
  INSERT INTO versions (name, model_id) SELECT 'Extended', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'extended');
  INSERT INTO versions (name, model_id) SELECT 'Series II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'series ii');
  INSERT INTO versions (name, model_id) SELECT 'Black Badge', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'black badge');

  INSERT INTO models (name, brand_id) SELECT 'Phantom', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'phantom');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'phantom';
  INSERT INTO versions (name, model_id) SELECT 'Phantom', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'phantom');
  INSERT INTO versions (name, model_id) SELECT 'Extended Wheelbase', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'extended wheelbase');
  INSERT INTO versions (name, model_id) SELECT 'Series II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'series ii');
  INSERT INTO versions (name, model_id) SELECT 'Drophead Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'drophead coupe');
  INSERT INTO versions (name, model_id) SELECT 'Coupe', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe');

  INSERT INTO models (name, brand_id) SELECT 'Silver', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'silver');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'silver';
  INSERT INTO versions (name, model_id) SELECT 'Silver Shadow', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'silver shadow');
  INSERT INTO versions (name, model_id) SELECT 'Silver Cloud II', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'silver cloud ii');

  INSERT INTO models (name, brand_id) SELECT 'Twenty', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'twenty');

  INSERT INTO models (name, brand_id) SELECT 'Wraith', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wraith');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wraith';
  INSERT INTO versions (name, model_id) SELECT 'Wraith', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wraith');
  INSERT INTO versions (name, model_id) SELECT 'Black Badge', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'black badge');

END $$;

-- === Rover ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'rover';

  INSERT INTO models (name, brand_id) SELECT '10', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '10');

  INSERT INTO models (name, brand_id) SELECT '400 Series', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '400 series');

  INSERT INTO models (name, brand_id) SELECT '75', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '75');

  INSERT INTO models (name, brand_id) SELECT '800 Series', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '800 series');

  INSERT INTO models (name, brand_id) SELECT 'Cabriolet', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cabriolet');

  INSERT INTO models (name, brand_id) SELECT 'Mini', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mini');

  INSERT INTO models (name, brand_id) SELECT 'Serie 200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 200');

  INSERT INTO models (name, brand_id) SELECT 'Serie 400', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 400');

  INSERT INTO models (name, brand_id) SELECT 'Serie 600', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 600');

  INSERT INTO models (name, brand_id) SELECT 'Serie 800', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 800');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '200';
  INSERT INTO versions (name, model_id) SELECT '200 Series', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '200 series');

END $$;

-- === Saab ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'saab';

  INSERT INTO models (name, brand_id) SELECT '9-3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '9-3');

  INSERT INTO models (name, brand_id) SELECT '9-4X', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '9-4x');

  INSERT INTO models (name, brand_id) SELECT '9-5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '9-5');

  INSERT INTO models (name, brand_id) SELECT '9-7X', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '9-7x');

  INSERT INTO models (name, brand_id) SELECT '900', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '900');

  INSERT INTO models (name, brand_id) SELECT '9000', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '9000');

END $$;

-- === Sachs ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Sachs'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'sachs');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'sachs';

  INSERT INTO models (name, brand_id) SELECT 'Madass', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'madass');

  INSERT INTO models (name, brand_id) SELECT 'X-Road', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x-road');

END $$;

-- === Samsung ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'samsung';

  INSERT INTO models (name, brand_id) SELECT 'Sm 5 Series', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sm 5 series');

  INSERT INTO models (name, brand_id) SELECT 'Sm 7 Series', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sm 7 series');

  INSERT INTO models (name, brand_id) SELECT 'Sm3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sm3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sm3';
  INSERT INTO versions (name, model_id) SELECT 'Sm3 Series', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sm3 series');

  INSERT INTO models (name, brand_id) SELECT 'Sm5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sm5');

  INSERT INTO models (name, brand_id) SELECT 'Sm7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sm7');

  INSERT INTO models (name, brand_id) SELECT 'Sq5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sq5');

  INSERT INTO models (name, brand_id) SELECT 'Sv110', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sv110');

END $$;

-- === Sanlg ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Sanlg'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'sanlg');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'sanlg';

  INSERT INTO models (name, brand_id) SELECT 'Sl', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sl');

END $$;

-- === Saturn ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Saturn'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'saturn');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'saturn';

  INSERT INTO models (name, brand_id) SELECT 'Relay', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'relay');

  INSERT INTO models (name, brand_id) SELECT 'Ski Red Line', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ski red line');

  INSERT INTO models (name, brand_id) SELECT 'Sky', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sky');

END $$;

-- === Scion ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Scion'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'scion');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'scion';

  INSERT INTO models (name, brand_id) SELECT 'Tc 2.5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tc 2.5');

END $$;

-- === SEAT ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'seat';

  INSERT INTO models (name, brand_id) SELECT '127', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '127');

  INSERT INTO models (name, brand_id) SELECT '131', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '131');

  INSERT INTO models (name, brand_id) SELECT '133', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '133');

  INSERT INTO models (name, brand_id) SELECT 'Alhambra', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'alhambra');

  INSERT INTO models (name, brand_id) SELECT 'Fura', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fura');

  INSERT INTO models (name, brand_id) SELECT 'Malaga', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'malaga');

  INSERT INTO models (name, brand_id) SELECT 'Marbella', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'marbella');

  INSERT INTO models (name, brand_id) SELECT 'Ritmo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ritmo');

  INSERT INTO models (name, brand_id) SELECT 'Ronda', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ronda');

  INSERT INTO models (name, brand_id) SELECT 'Terra', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'terra');

END $$;

-- === Shelby ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'shelby';

  INSERT INTO models (name, brand_id) SELECT 'Cobra', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cobra');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cobra';
  INSERT INTO versions (name, model_id) SELECT 'Cobra Mkii', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cobra mkii');

  INSERT INTO models (name, brand_id) SELECT 'GT', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt');

END $$;

-- === Shenyang ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Shenyang'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'shenyang');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'shenyang';

  INSERT INTO models (name, brand_id) SELECT 'Action Sport', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'action sport');

END $$;

-- === Shineray ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'shineray';

  INSERT INTO models (name, brand_id) SELECT 'T30', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't30');

  INSERT INTO models (name, brand_id) SELECT 'T32', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't32');

  INSERT INTO models (name, brand_id) SELECT 'T50', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't50');

  INSERT INTO models (name, brand_id) SELECT 'T52', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't52');

END $$;

-- === Simca ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Simca'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'simca');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'simca';

  INSERT INTO models (name, brand_id) SELECT '1000', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1000');

  INSERT INTO models (name, brand_id) SELECT '1300', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1300');

  INSERT INTO models (name, brand_id) SELECT 'Pininfarina', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pininfarina');

END $$;

-- === Skoda ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Skoda'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'skoda');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'skoda';

  INSERT INTO models (name, brand_id) SELECT 'Elroq', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'elroq');

  INSERT INTO models (name, brand_id) SELECT 'Enyaq', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'enyaq');

  INSERT INTO models (name, brand_id) SELECT 'Fabia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fabia');

  INSERT INTO models (name, brand_id) SELECT 'Favorit', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'favorit');

  INSERT INTO models (name, brand_id) SELECT 'Felicia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'felicia');

  INSERT INTO models (name, brand_id) SELECT 'Forman', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'forman');

  INSERT INTO models (name, brand_id) SELECT 'Kamiq', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kamiq');

  INSERT INTO models (name, brand_id) SELECT 'Karoq', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'karoq');

  INSERT INTO models (name, brand_id) SELECT 'Kodiaq', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kodiaq');

  INSERT INTO models (name, brand_id) SELECT 'Octavia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'octavia');

  INSERT INTO models (name, brand_id) SELECT 'Pick Up', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pick up');

  INSERT INTO models (name, brand_id) SELECT 'Pickup', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pickup');

  INSERT INTO models (name, brand_id) SELECT 'Rapid', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rapid');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rapid';
  INSERT INTO versions (name, model_id) SELECT 'Rapid Spaceback', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rapid spaceback');

  INSERT INTO models (name, brand_id) SELECT 'Roomster', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'roomster');

  INSERT INTO models (name, brand_id) SELECT 'Scala', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'scala');

  INSERT INTO models (name, brand_id) SELECT 'Spaceback', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spaceback');

  INSERT INTO models (name, brand_id) SELECT 'Superb', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'superb');

  INSERT INTO models (name, brand_id) SELECT 'Yeti', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'yeti');

END $$;

-- === Sma ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'sma';

  INSERT INTO models (name, brand_id) SELECT 'Serie C', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie c');

  INSERT INTO models (name, brand_id) SELECT 'Serie R', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie r');

END $$;

-- === Smart ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'smart';

  INSERT INTO models (name, brand_id) SELECT '#1', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '#1');

  INSERT INTO models (name, brand_id) SELECT '#3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '#3');

  INSERT INTO models (name, brand_id) SELECT 'Fortwo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fortwo');

  INSERT INTO models (name, brand_id) SELECT 'Smart 1', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'smart 1');

  INSERT INTO models (name, brand_id) SELECT 'Smart 3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'smart 3');

END $$;

-- === Soueast ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Soueast'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'soueast');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'soueast';

  INSERT INTO models (name, brand_id) SELECT 'S06', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's06');

  INSERT INTO models (name, brand_id) SELECT 'S07', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's07');

  INSERT INTO models (name, brand_id) SELECT 'S09', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's09');

END $$;

-- === SsangYong ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'ssangyong';

  INSERT INTO models (name, brand_id) SELECT 'Cx Luxury 1.6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx luxury 1.6');

  INSERT INTO models (name, brand_id) SELECT 'CX70 Luxury', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx70 luxury');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx70 luxury';
  INSERT INTO versions (name, model_id) SELECT 'Cx70 Luxury 1.6', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cx70 luxury 1.6');

  INSERT INTO models (name, brand_id) SELECT 'Sm3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sm3');

  INSERT INTO models (name, brand_id) SELECT 'Sm7', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sm7');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'actyon';
  INSERT INTO versions (name, model_id) SELECT 'Actyon Sports', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'actyon sports');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'musso';
  INSERT INTO versions (name, model_id) SELECT 'Musso Sports', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'musso sports');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rexton';
  INSERT INTO versions (name, model_id) SELECT 'Rexton W', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rexton w');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'torres';
  INSERT INTO versions (name, model_id) SELECT 'Torres Evx', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'torres evx');

END $$;

-- === Studebaker ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Studebaker'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'studebaker');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'studebaker';

  INSERT INTO models (name, brand_id) SELECT 'Carrera', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'carrera');

  INSERT INTO models (name, brand_id) SELECT 'Commander', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'commander');

END $$;

-- === Subaru ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'subaru';

  INSERT INTO models (name, brand_id) SELECT '2.0', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2.0');

  INSERT INTO models (name, brand_id) SELECT '600', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '600');

  INSERT INTO models (name, brand_id) SELECT '700', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '700');

  INSERT INTO models (name, brand_id) SELECT 'B9', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'b9');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'b9';
  INSERT INTO versions (name, model_id) SELECT 'B9 Tribeca', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'b9 tribeca');

  INSERT INTO models (name, brand_id) SELECT 'Coupe', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'coupe');

  INSERT INTO models (name, brand_id) SELECT 'E-10', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e-10');

  INSERT INTO models (name, brand_id) SELECT 'Gl', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gl');

  INSERT INTO models (name, brand_id) SELECT 'Hardtop', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hardtop');

  INSERT INTO models (name, brand_id) SELECT 'J-10', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'j-10');

  INSERT INTO models (name, brand_id) SELECT 'J-12', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'j-12');

  INSERT INTO models (name, brand_id) SELECT 'Loyale', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'loyale');

  INSERT INTO models (name, brand_id) SELECT 'Mv', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mv');

  INSERT INTO models (name, brand_id) SELECT 'Suv', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'suv');

  INSERT INTO models (name, brand_id) SELECT 'Trezia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'trezia');

  INSERT INTO models (name, brand_id) SELECT 'Utilitario', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'utilitario');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wrx';
  INSERT INTO versions (name, model_id) SELECT 'Wrx Sti', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wrx sti');

END $$;

-- === Suzuki ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'suzuki';

  INSERT INTO models (name, brand_id) SELECT 'Boulevard', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'boulevard');

  INSERT INTO models (name, brand_id) SELECT 'Cross', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cross');

  INSERT INTO models (name, brand_id) SELECT 'Jazz', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jazz');

  INSERT INTO models (name, brand_id) SELECT 'Lj-80', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lj-80');

  INSERT INTO models (name, brand_id) SELECT 'Pickup', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pickup');

  INSERT INTO models (name, brand_id) SELECT 'Sinmodelo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sinmodelo');

  INSERT INTO models (name, brand_id) SELECT 'Sj 408', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sj 408');

  INSERT INTO models (name, brand_id) SELECT 'Sj 410', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sj 410');

  INSERT INTO models (name, brand_id) SELECT 'Sj 413', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sj 413');

  INSERT INTO models (name, brand_id) SELECT 'St', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'st');

  INSERT INTO models (name, brand_id) SELECT 'Super Carry', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'super carry');

  INSERT INTO models (name, brand_id) SELECT 'Wagon R+', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wagon r+');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aerio';
  INSERT INTO versions (name, model_id) SELECT 'Aerio Sx', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'aerio sx');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'apv';
  INSERT INTO versions (name, model_id) SELECT 'Apv Furgon', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'apv furgon');
  INSERT INTO versions (name, model_id) SELECT 'Apv Pick Up', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'apv pick up');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dzire';
  INSERT INTO versions (name, model_id) SELECT 'Dzire Hybrid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dzire hybrid');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand nomade';
  INSERT INTO versions (name, model_id) SELECT 'Grand Nomade Xl-7', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'grand nomade xl-7');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'swift';
  INSERT INTO versions (name, model_id) SELECT 'Swift Dzire', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'swift dzire');
  INSERT INTO versions (name, model_id) SELECT 'Swift Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'swift sport');
  INSERT INTO versions (name, model_id) SELECT 'Swift Hybrid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'swift hybrid');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sx4';
  INSERT INTO versions (name, model_id) SELECT 'Sx4 S-Cross', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sx4 s-cross');

END $$;

-- === Swm ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'swm';

  INSERT INTO models (name, brand_id) SELECT 'G03f', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'g03f');

END $$;

-- === Terrier ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Terrier'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'terrier');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'terrier';

  INSERT INTO models (name, brand_id) SELECT 'Ev', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ev');

END $$;

-- === Tesla ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'tesla';

  INSERT INTO models (name, brand_id) SELECT 'Cybertruck', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cybertruck');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cybertruck';
  INSERT INTO versions (name, model_id) SELECT 'Long Range RWD', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range rwd');
  INSERT INTO versions (name, model_id) SELECT 'All-Wheel Drive', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'all-wheel drive');
  INSERT INTO versions (name, model_id) SELECT 'Cyberbeast', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cyberbeast');
  INSERT INTO versions (name, model_id) SELECT 'Foundation Series', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'foundation series');

  INSERT INTO models (name, brand_id) SELECT 'S', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's';
  INSERT INTO versions (name, model_id) SELECT '60', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '60');
  INSERT INTO versions (name, model_id) SELECT '70', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '70');
  INSERT INTO versions (name, model_id) SELECT '70D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '70d');
  INSERT INTO versions (name, model_id) SELECT '75', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '75');
  INSERT INTO versions (name, model_id) SELECT '75D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '75d');
  INSERT INTO versions (name, model_id) SELECT '85', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '85');
  INSERT INTO versions (name, model_id) SELECT '85D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '85d');
  INSERT INTO versions (name, model_id) SELECT 'P85', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p85');
  INSERT INTO versions (name, model_id) SELECT 'P85D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p85d');
  INSERT INTO versions (name, model_id) SELECT '90D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '90d');
  INSERT INTO versions (name, model_id) SELECT 'P90D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p90d');
  INSERT INTO versions (name, model_id) SELECT '100D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '100d');
  INSERT INTO versions (name, model_id) SELECT 'P100D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p100d');
  INSERT INTO versions (name, model_id) SELECT 'Long Range', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range');
  INSERT INTO versions (name, model_id) SELECT 'Plaid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'plaid');

  INSERT INTO models (name, brand_id) SELECT 'X', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x';
  INSERT INTO versions (name, model_id) SELECT '60D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '60d');
  INSERT INTO versions (name, model_id) SELECT '75D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '75d');
  INSERT INTO versions (name, model_id) SELECT '90D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '90d');
  INSERT INTO versions (name, model_id) SELECT 'P90D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p90d');
  INSERT INTO versions (name, model_id) SELECT '100D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '100d');
  INSERT INTO versions (name, model_id) SELECT 'P100D', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p100d');
  INSERT INTO versions (name, model_id) SELECT 'Long Range', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range');
  INSERT INTO versions (name, model_id) SELECT 'Plaid', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'plaid');

  INSERT INTO models (name, brand_id) SELECT 'Y', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'y');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'y';
  INSERT INTO versions (name, model_id) SELECT 'Long Range', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range');
  INSERT INTO versions (name, model_id) SELECT 'Performance', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'performance');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '3';
  INSERT INTO versions (name, model_id) SELECT 'Standard Range', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'standard range');
  INSERT INTO versions (name, model_id) SELECT 'Long Range', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range');
  INSERT INTO versions (name, model_id) SELECT 'Performance', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'performance');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'model 3';
  INSERT INTO versions (name, model_id) SELECT 'Standard Range', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'standard range');
  INSERT INTO versions (name, model_id) SELECT 'Standard Range Plus', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'standard range plus');
  INSERT INTO versions (name, model_id) SELECT 'Long Range', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range');
  INSERT INTO versions (name, model_id) SELECT 'Long Range AWD', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range awd');
  INSERT INTO versions (name, model_id) SELECT 'Performance', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'performance');
  INSERT INTO versions (name, model_id) SELECT 'Highland RWD', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'highland rwd');
  INSERT INTO versions (name, model_id) SELECT 'Highland Long Range', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'highland long range');
  INSERT INTO versions (name, model_id) SELECT 'Highland Performance', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'highland performance');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'model y';
  INSERT INTO versions (name, model_id) SELECT 'Standard Range', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'standard range');
  INSERT INTO versions (name, model_id) SELECT 'Long Range', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range');
  INSERT INTO versions (name, model_id) SELECT 'Long Range RWD', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range rwd');
  INSERT INTO versions (name, model_id) SELECT 'Long Range AWD', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range awd');
  INSERT INTO versions (name, model_id) SELECT 'Performance', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'performance');
  INSERT INTO versions (name, model_id) SELECT 'Juniper RWD', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'juniper rwd');
  INSERT INTO versions (name, model_id) SELECT 'Juniper Long Range', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'juniper long range');
  INSERT INTO versions (name, model_id) SELECT 'Juniper Performance', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'juniper performance');

END $$;

-- === The London Taxi ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'The London Taxi'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'the london taxi');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'the london taxi';

  INSERT INTO models (name, brand_id) SELECT 'TX4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tx4');

END $$;

-- === Toyota ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'toyota';

  INSERT INTO models (name, brand_id) SELECT '86', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '86');

  INSERT INTO models (name, brand_id) SELECT 'Alphard', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'alphard');

  INSERT INTO models (name, brand_id) SELECT 'Altezza', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'altezza');

  INSERT INTO models (name, brand_id) SELECT 'Aristo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aristo');

  INSERT INTO models (name, brand_id) SELECT 'Cressida', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cressida');

  INSERT INTO models (name, brand_id) SELECT 'Crown', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'crown');

  INSERT INTO models (name, brand_id) SELECT 'Default', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'default');

  INSERT INTO models (name, brand_id) SELECT 'Delta', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'delta');

  INSERT INTO models (name, brand_id) SELECT 'Dyna', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dyna');

  INSERT INTO models (name, brand_id) SELECT 'Emina', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'emina');

  INSERT INTO models (name, brand_id) SELECT 'Ft-86', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ft-86');

  INSERT INTO models (name, brand_id) SELECT 'GR Yaris', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gr yaris');

  INSERT INTO models (name, brand_id) SELECT 'Gts', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gts');

  INSERT INTO models (name, brand_id) SELECT 'Highlander', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'highlander');

  INSERT INTO models (name, brand_id) SELECT 'Horquilla', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'horquilla');

  INSERT INTO models (name, brand_id) SELECT 'Hq 15', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hq 15');

  INSERT INTO models (name, brand_id) SELECT 'Landcruiser Prado', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'landcruiser prado');

  INSERT INTO models (name, brand_id) SELECT 'Lite', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lite');

  INSERT INTO models (name, brand_id) SELECT 'Previa', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'previa');

  INSERT INTO models (name, brand_id) SELECT 'Sienna', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sienna');

  INSERT INTO models (name, brand_id) SELECT 'Sprinter', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sprinter');

  INSERT INTO models (name, brand_id) SELECT 'Stout', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'stout');

  INSERT INTO models (name, brand_id) SELECT 'Terios', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'terios');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'terios';
  INSERT INTO versions (name, model_id) SELECT 'Terios Lei 1.5 Autom', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'terios lei 1.5 autom');

  INSERT INTO models (name, brand_id) SELECT 'Townace', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'townace');

  INSERT INTO models (name, brand_id) SELECT 'Toyo Ace', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'toyo ace');

  INSERT INTO models (name, brand_id) SELECT 'Urban Cruiser', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'urban cruiser');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'corolla';
  INSERT INTO versions (name, model_id) SELECT 'Corolla Cross', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'corolla cross');
  INSERT INTO versions (name, model_id) SELECT 'Corolla Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'corolla sport');
  INSERT INTO versions (name, model_id) SELECT 'Corolla Fielder', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'corolla fielder');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'land cruiser';
  INSERT INTO versions (name, model_id) SELECT 'Land Cruiser Prado', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'land cruiser prado');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'prius';
  INSERT INTO versions (name, model_id) SELECT 'Prius C', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'prius c');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'yaris';
  INSERT INTO versions (name, model_id) SELECT 'Yaris Cross', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'yaris cross');
  INSERT INTO versions (name, model_id) SELECT 'Yaris Sport', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'yaris sport');

END $$;

-- === Triumph ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'triumph';

  INSERT INTO models (name, brand_id) SELECT 'GT6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt6');

  INSERT INTO models (name, brand_id) SELECT 'Herald 1200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'herald 1200');

  INSERT INTO models (name, brand_id) SELECT 'Speedmaster', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'speedmaster');

  INSERT INTO models (name, brand_id) SELECT 'Spitfire', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spitfire');

  INSERT INTO models (name, brand_id) SELECT 'Stag Sport', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'stag sport');

  INSERT INTO models (name, brand_id) SELECT 'Thruxton', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'thruxton');

  INSERT INTO models (name, brand_id) SELECT 'Tiger', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiger');

  INSERT INTO models (name, brand_id) SELECT 'Tr3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tr3');

  INSERT INTO models (name, brand_id) SELECT 'Tr4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tr4');

  INSERT INTO models (name, brand_id) SELECT 'Tr6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tr6');

END $$;

-- === Tvs ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Tvs'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'tvs');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'tvs';

  INSERT INTO models (name, brand_id) SELECT 'Apache', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'apache');

END $$;

-- === Uaz ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'uaz';

  INSERT INTO models (name, brand_id) SELECT 'Bukhanka', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bukhanka');

  INSERT INTO models (name, brand_id) SELECT 'Hunter', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hunter');

  INSERT INTO models (name, brand_id) SELECT 'Kazak', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kazak');

  INSERT INTO models (name, brand_id) SELECT 'Profi', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'profi');

END $$;

-- === United Motors ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'united motors';

  INSERT INTO models (name, brand_id) SELECT 'Dsf', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dsf');

  INSERT INTO models (name, brand_id) SELECT 'Renegade', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'renegade');

END $$;

-- === Vergara ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Vergara'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'vergara');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'vergara';

  INSERT INTO models (name, brand_id) SELECT 'Rampla Acero', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rampla acero');

END $$;

-- === Vespa ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'vespa';

  INSERT INTO models (name, brand_id) SELECT 'Primavera', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'primavera');

END $$;

-- === Volkswagen ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'volkswagen';

  INSERT INTO models (name, brand_id) SELECT '1200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1200');

  INSERT INTO models (name, brand_id) SELECT '8.120', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '8.120');

  INSERT INTO models (name, brand_id) SELECT 'Amazon', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'amazon');

  INSERT INTO models (name, brand_id) SELECT 'Atlantic', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'atlantic');

  INSERT INTO models (name, brand_id) SELECT 'Beelte', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'beelte');

  INSERT INTO models (name, brand_id) SELECT 'Brasilia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'brasilia');

  INSERT INTO models (name, brand_id) SELECT 'Buggy', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'buggy');

  INSERT INTO models (name, brand_id) SELECT 'Camion', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'camion');

  INSERT INTO models (name, brand_id) SELECT 'Camper', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'camper');

  INSERT INTO models (name, brand_id) SELECT 'Camping', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'camping');

  INSERT INTO models (name, brand_id) SELECT 'Combi', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'combi');

  INSERT INTO models (name, brand_id) SELECT 'Constellation', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'constellation');

  INSERT INTO models (name, brand_id) SELECT 'Corrado', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'corrado');

  INSERT INTO models (name, brand_id) SELECT 'Delivery Van', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'delivery van');

  INSERT INTO models (name, brand_id) SELECT 'Eos', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eos');

  INSERT INTO models (name, brand_id) SELECT 'Forester', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'forester');

  INSERT INTO models (name, brand_id) SELECT 'Gti', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gti');

  INSERT INTO models (name, brand_id) SELECT 'Karmann Ghia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'karmann ghia');

  INSERT INTO models (name, brand_id) SELECT 'Kleinbus', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kleinbus');

  INSERT INTO models (name, brand_id) SELECT 'Kombi', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kombi');

  INSERT INTO models (name, brand_id) SELECT 'Motorhome', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'motorhome');

  INSERT INTO models (name, brand_id) SELECT 'New Beetle', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'new beetle');

  INSERT INTO models (name, brand_id) SELECT 'Notchback', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'notchback');

  INSERT INTO models (name, brand_id) SELECT 'Nueva Touareg', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nueva touareg');

  INSERT INTO models (name, brand_id) SELECT 'Porsche Speedster', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'porsche speedster');

  INSERT INTO models (name, brand_id) SELECT 'Quantum', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'quantum');

  INSERT INTO models (name, brand_id) SELECT 'R32', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'r32');

  INSERT INTO models (name, brand_id) SELECT 'S60', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's60');

  INSERT INTO models (name, brand_id) SELECT 'Santana', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'santana');

  INSERT INTO models (name, brand_id) SELECT 'Sinmodelo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sinmodelo');

  INSERT INTO models (name, brand_id) SELECT 'T1 Crew Cab', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't1 crew cab');

  INSERT INTO models (name, brand_id) SELECT 'Tera', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tera');

  INSERT INTO models (name, brand_id) SELECT 'The Beetle', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'the beetle');

  INSERT INTO models (name, brand_id) SELECT 'Trendline 4X4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'trendline 4x4');

  INSERT INTO models (name, brand_id) SELECT 'Variant', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'variant');

  INSERT INTO models (name, brand_id) SELECT 'Volare', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'volare');

  INSERT INTO models (name, brand_id) SELECT 'Westfalia', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'westfalia');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'caddy';
  INSERT INTO versions (name, model_id) SELECT 'Caddy Kombi', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'caddy kombi');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'passat';
  INSERT INTO versions (name, model_id) SELECT 'Passat CC', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'passat cc');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'polo';
  INSERT INTO versions (name, model_id) SELECT 'Polo Classic', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'polo classic');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiguan';
  INSERT INTO versions (name, model_id) SELECT 'Tiguan Allspace', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tiguan allspace');

END $$;

-- === Voltera ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Voltera'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'voltera');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'voltera';

  INSERT INTO models (name, brand_id) SELECT 'R6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'r6');

END $$;

-- === Volvo ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'volvo';

  INSERT INTO models (name, brand_id) SELECT '1.6 T4 Comforf', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1.6 t4 comforf');

  INSERT INTO models (name, brand_id) SELECT '1.6 T4 Comfort', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1.6 t4 comfort');

  INSERT INTO models (name, brand_id) SELECT '121', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '121');

  INSERT INTO models (name, brand_id) SELECT '122', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '122');

  INSERT INTO models (name, brand_id) SELECT '142', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '142');

  INSERT INTO models (name, brand_id) SELECT '144', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '144');

  INSERT INTO models (name, brand_id) SELECT '145 S', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '145 s');

  INSERT INTO models (name, brand_id) SELECT '164', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '164');

  INSERT INTO models (name, brand_id) SELECT '240', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '240');

  INSERT INTO models (name, brand_id) SELECT '242', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '242');

  INSERT INTO models (name, brand_id) SELECT '244', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '244');

  INSERT INTO models (name, brand_id) SELECT '245', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '245');

  INSERT INTO models (name, brand_id) SELECT '264', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '264');

  INSERT INTO models (name, brand_id) SELECT '340', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '340');

  INSERT INTO models (name, brand_id) SELECT '345', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '345');

  INSERT INTO models (name, brand_id) SELECT '360', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '360');

  INSERT INTO models (name, brand_id) SELECT '370', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '370');

  INSERT INTO models (name, brand_id) SELECT '440', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '440');

  INSERT INTO models (name, brand_id) SELECT '544', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '544');

  INSERT INTO models (name, brand_id) SELECT '740', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '740');

  INSERT INTO models (name, brand_id) SELECT '940', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '940');

  INSERT INTO models (name, brand_id) SELECT '960', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '960');

  INSERT INTO models (name, brand_id) SELECT 'B 18', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'b 18');

  INSERT INTO models (name, brand_id) SELECT 'C40', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c40');

  INSERT INTO models (name, brand_id) SELECT 'Ex30', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ex30');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ex30';
  INSERT INTO versions (name, model_id) SELECT 'Ex30 Cross Country', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex30 cross country');

  INSERT INTO models (name, brand_id) SELECT 'Ex40', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ex40');

  INSERT INTO models (name, brand_id) SELECT 'Oferta Credito 6.470', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'oferta credito 6.470');

  INSERT INTO models (name, brand_id) SELECT 'P210', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'p210');

  INSERT INTO models (name, brand_id) SELECT 'S70', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's70');

  INSERT INTO models (name, brand_id) SELECT 'Sinmodelo', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sinmodelo');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's60';
  INSERT INTO versions (name, model_id) SELECT 'S60 Cross Country', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's60 cross country');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v40';
  INSERT INTO versions (name, model_id) SELECT 'V40 1.4 Comfort', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v40 1.4 comfort');
  INSERT INTO versions (name, model_id) SELECT 'V40 Cross Country', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v40 cross country');
  INSERT INTO versions (name, model_id) SELECT 'V40 1.6 T4 Comfort', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v40 1.6 t4 comfort');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v60';
  INSERT INTO versions (name, model_id) SELECT 'V60 Cross Country', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v60 cross country');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v70';
  INSERT INTO versions (name, model_id) SELECT 'V70 XC', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v70 xc');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v90';
  INSERT INTO versions (name, model_id) SELECT 'V90 Cross Country', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v90 cross country');

END $$;

-- === Whippet ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Whippet'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'whippet');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'whippet';

  INSERT INTO models (name, brand_id) SELECT 'Roadster', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'roadster');

END $$;

-- === Willys ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'willys';

  INSERT INTO models (name, brand_id) SELECT 'Cj3a M-38', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cj3a m-38');

  INSERT INTO models (name, brand_id) SELECT 'Cj5', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cj5');

  INSERT INTO models (name, brand_id) SELECT 'Jeep', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jeep');

  INSERT INTO models (name, brand_id) SELECT 'Scout 4X2', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'scout 4x2');

  INSERT INTO models (name, brand_id) SELECT 'Universal', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'universal');

END $$;

-- === Xr 1.8 ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Xr 1.8'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'xr 1.8');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'xr 1.8';

END $$;

-- === Yamaha ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'yamaha';

  INSERT INTO models (name, brand_id) SELECT 'Fz', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fz');

  INSERT INTO models (name, brand_id) SELECT 'Fzr', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fzr');

  INSERT INTO models (name, brand_id) SELECT 'Ttr', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ttr');

  INSERT INTO models (name, brand_id) SELECT 'Wr', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wr');

  INSERT INTO models (name, brand_id) SELECT 'Xt', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xt');

  INSERT INTO models (name, brand_id) SELECT 'Xvs', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xvs');

  INSERT INTO models (name, brand_id) SELECT 'Ybr', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ybr');

  INSERT INTO models (name, brand_id) SELECT 'Yfm', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'yfm');

  INSERT INTO models (name, brand_id) SELECT 'Yfz', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'yfz');

  INSERT INTO models (name, brand_id) SELECT 'Yz', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'yz');

  INSERT INTO models (name, brand_id) SELECT 'Yzf-R15', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'yzf-r15');

END $$;

-- === Yuejin ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'yuejin';

  INSERT INTO models (name, brand_id) SELECT 'NJ 612', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nj 612');

END $$;

-- === Yugo ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Yugo'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'yugo');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'yugo';

  INSERT INTO models (name, brand_id) SELECT '55', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '55');

  INSERT INTO models (name, brand_id) SELECT '65 Gvx', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '65 gvx');

  INSERT INTO models (name, brand_id) SELECT 'Coral 55', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'coral 55');

  INSERT INTO models (name, brand_id) SELECT 'Florida', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'florida');

  INSERT INTO models (name, brand_id) SELECT 'Skala', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'skala');

END $$;

-- === Zastava ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Zastava'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'zastava');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'zastava';

  INSERT INTO models (name, brand_id) SELECT '1100', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1100');

  INSERT INTO models (name, brand_id) SELECT '1500', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1500');

  INSERT INTO models (name, brand_id) SELECT '435', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '435');

  INSERT INTO models (name, brand_id) SELECT 'Kombi', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kombi');

END $$;

-- === ZNA ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'zna';

  INSERT INTO models (name, brand_id) SELECT 'Steed', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'steed');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rich';
  INSERT INTO versions (name, model_id) SELECT 'Rich 6', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rich 6');

  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'succe';
  INSERT INTO versions (name, model_id) SELECT 'Succe Solo 400 Km', v_model_id::int
    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'succe solo 400 km');

END $$;

-- === Zna Dongfeng ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Zna Dongfeng'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'zna dongfeng');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'zna dongfeng';

  INSERT INTO models (name, brand_id) SELECT 'DF6', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'df6');

END $$;

-- === Zotye ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'zotye';

  INSERT INTO models (name, brand_id) SELECT 'T200', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't200');

END $$;

-- === Zxauto ===
DO $$
DECLARE
  v_brand_id TEXT;
BEGIN
  -- Insert brand
  INSERT INTO brands (id, name)
  SELECT gen_random_uuid(), 'Zxauto'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'zxauto');

  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'zxauto';

  INSERT INTO models (name, brand_id) SELECT 'Admiral', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'admiral');

  INSERT INTO models (name, brand_id) SELECT 'Buggu 1.3', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'buggu 1.3');

  INSERT INTO models (name, brand_id) SELECT 'Grand Lion', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand lion');

  INSERT INTO models (name, brand_id) SELECT 'Grandlion', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grandlion');

  INSERT INTO models (name, brand_id) SELECT 'Grandtiger', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grandtiger');

  INSERT INTO models (name, brand_id) SELECT 'Landmark', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'landmark');

  INSERT INTO models (name, brand_id) SELECT 'Terralord', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'terralord');

  INSERT INTO models (name, brand_id) SELECT 'Tuv', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tuv');

END $$;
