-- Migration: Add comprehensive models and versions for top brands sold in Chile (2016-2026)
-- Schema: brands.id (uuid->text), models.brand_id (text), versions.model_id (int)
-- Idempotent: uses WHERE NOT EXISTS so safe to re-run

-- === Toyota ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Toyota'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'toyota');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'toyota';

  -- Hilux
  INSERT INTO models (name, brand_id) SELECT 'Hilux', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hilux');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hilux';
  INSERT INTO versions (name, model_id) SELECT 'DX 2.4 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dx 2.4 4x2');
  INSERT INTO versions (name, model_id) SELECT 'DX 2.4 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dx 2.4 4x4');
  INSERT INTO versions (name, model_id) SELECT 'SR 2.4 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sr 2.4 4x2');
  INSERT INTO versions (name, model_id) SELECT 'SR 2.4 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sr 2.4 4x4');
  INSERT INTO versions (name, model_id) SELECT 'SRV 2.8 4x2 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'srv 2.8 4x2 at');
  INSERT INTO versions (name, model_id) SELECT 'SRV 2.8 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'srv 2.8 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'SRX 2.8 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'srx 2.8 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'GR Sport 2.8 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gr sport 2.8 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'GR Sport II 2.8 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gr sport ii 2.8 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Conquest 2.8 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'conquest 2.8 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Cabina Simple 2.4 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cabina simple 2.4 4x2');
  INSERT INTO versions (name, model_id) SELECT 'Cabina Simple 2.4 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cabina simple 2.4 4x4');

  -- Corolla
  INSERT INTO models (name, brand_id) SELECT 'Corolla', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'corolla');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'corolla';
  INSERT INTO versions (name, model_id) SELECT 'XLI 1.8 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xli 1.8 mt');
  INSERT INTO versions (name, model_id) SELECT 'XLI 1.8 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xli 1.8 cvt');
  INSERT INTO versions (name, model_id) SELECT 'XEI 1.8 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xei 1.8 mt');
  INSERT INTO versions (name, model_id) SELECT 'XEI 1.8 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xei 1.8 cvt');
  INSERT INTO versions (name, model_id) SELECT 'SEG 1.8 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'seg 1.8 cvt');
  INSERT INTO versions (name, model_id) SELECT 'SEG 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'seg 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'GR Sport 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gr sport 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid 1.8 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid 1.8 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid SEG 1.8 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid seg 1.8 cvt');

  -- Yaris
  INSERT INTO models (name, brand_id) SELECT 'Yaris', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'yaris');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'yaris';
  INSERT INTO versions (name, model_id) SELECT 'XLI 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xli 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'XLI 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xli 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'XLS 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xls 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'GR Sport 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gr sport 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid 1.5 cvt');

  -- RAV4
  INSERT INTO models (name, brand_id) SELECT 'RAV4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rav4');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rav4';
  INSERT INTO versions (name, model_id) SELECT 'LE 2.0 4x2 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'le 2.0 4x2 cvt');
  INSERT INTO versions (name, model_id) SELECT 'XLE 2.0 4x2 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xle 2.0 4x2 cvt');
  INSERT INTO versions (name, model_id) SELECT 'XLE 2.5 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xle 2.5 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Limited 2.5 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 2.5 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Adventure 2.5 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'adventure 2.5 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid 2.5 4x2 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid 2.5 4x2 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid 2.5 4x4 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid 2.5 4x4 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid Limited 2.5 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid limited 2.5 4x4');

  -- Land Cruiser
  INSERT INTO models (name, brand_id) SELECT 'Land Cruiser', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'land cruiser');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'land cruiser';
  INSERT INTO versions (name, model_id) SELECT 'Prado VX 2.8 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'prado vx 2.8 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Prado VX-L 2.8 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'prado vx-l 2.8 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Prado TX 2.7 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'prado tx 2.7 4x4 at');
  INSERT INTO versions (name, model_id) SELECT '70 4.0 V6', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '70 4.0 v6');
  INSERT INTO versions (name, model_id) SELECT '70 4.5 V8 Diesel', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '70 4.5 v8 diesel');
  INSERT INTO versions (name, model_id) SELECT '200 VX 4.5 V8 Diesel', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '200 vx 4.5 v8 diesel');
  INSERT INTO versions (name, model_id) SELECT '300 GR Sport 3.3 V6', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '300 gr sport 3.3 v6');

  -- Fortuner / SW4
  INSERT INTO models (name, brand_id) SELECT 'SW4', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sw4');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sw4';
  INSERT INTO versions (name, model_id) SELECT 'SR 2.7 4x2 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sr 2.7 4x2 at');
  INSERT INTO versions (name, model_id) SELECT 'SRV 2.8 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'srv 2.8 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'SRX 2.8 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'srx 2.8 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'GR Sport 2.8 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gr sport 2.8 4x4 at');

  -- Corolla Cross
  INSERT INTO models (name, brand_id) SELECT 'Corolla Cross', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'corolla cross');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'corolla cross';
  INSERT INTO versions (name, model_id) SELECT 'XLI 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xli 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'XEI 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xei 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'SEG 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'seg 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'GR Sport 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gr sport 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid XLI 1.8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid xli 1.8');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid SEG 1.8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid seg 1.8');

  -- C-HR
  INSERT INTO models (name, brand_id) SELECT 'C-HR', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c-hr');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c-hr';
  INSERT INTO versions (name, model_id) SELECT '1.2T CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '1.2t cvt');
  INSERT INTO versions (name, model_id) SELECT '1.8 Hybrid CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '1.8 hybrid cvt');
  INSERT INTO versions (name, model_id) SELECT '2.0 Hybrid GR Sport', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.0 hybrid gr sport');

  -- Camry
  INSERT INTO models (name, brand_id) SELECT 'Camry', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'camry');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'camry';
  INSERT INTO versions (name, model_id) SELECT '2.5 SE AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.5 se at');
  INSERT INTO versions (name, model_id) SELECT '2.5 XLE AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.5 xle at');
  INSERT INTO versions (name, model_id) SELECT '2.5 Hybrid', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.5 hybrid');

  -- Hilux SW4 / Highlander
  INSERT INTO models (name, brand_id) SELECT 'Highlander', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'highlander');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'highlander';
  INSERT INTO versions (name, model_id) SELECT 'XLE 2.5 Hybrid', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xle 2.5 hybrid');
  INSERT INTO versions (name, model_id) SELECT 'Limited 2.5 Hybrid', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 2.5 hybrid');

  -- Hiace
  INSERT INTO models (name, brand_id) SELECT 'Hiace', v_brand_id
    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hiace');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hiace';
  INSERT INTO versions (name, model_id) SELECT 'Wagon GL 2.8 12 Pas', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wagon gl 2.8 12 pas');
  INSERT INTO versions (name, model_id) SELECT 'Furgon 2.8 6 Asientos', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'furgon 2.8 6 asientos');
  INSERT INTO versions (name, model_id) SELECT 'Commuter 2.8 14 Pas', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'commuter 2.8 14 pas');

  -- Other base models
  INSERT INTO models (name, brand_id) SELECT 'Etios', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'etios');
  INSERT INTO models (name, brand_id) SELECT 'Prius', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'prius');
  INSERT INTO models (name, brand_id) SELECT 'Prius C', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'prius c');
  INSERT INTO models (name, brand_id) SELECT 'GR86', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gr86');
  INSERT INTO models (name, brand_id) SELECT 'GR Yaris', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gr yaris');
  INSERT INTO models (name, brand_id) SELECT 'GR Corolla', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gr corolla');
  INSERT INTO models (name, brand_id) SELECT 'bZ4X', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bz4x');
  INSERT INTO models (name, brand_id) SELECT 'Tacoma', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tacoma');
  INSERT INTO models (name, brand_id) SELECT 'Tundra', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tundra');
  INSERT INTO models (name, brand_id) SELECT '4Runner', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '4runner');
END $$;

-- === Suzuki ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Suzuki'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'suzuki');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'suzuki';

  -- Swift
  INSERT INTO models (name, brand_id) SELECT 'Swift', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'swift');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'swift';
  INSERT INTO versions (name, model_id) SELECT 'GA 1.2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ga 1.2 mt');
  INSERT INTO versions (name, model_id) SELECT 'GL 1.2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.2 mt');
  INSERT INTO versions (name, model_id) SELECT 'GL 1.2 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.2 cvt');
  INSERT INTO versions (name, model_id) SELECT 'GLX 1.2 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glx 1.2 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Sport 1.4T MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport 1.4t mt');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid 1.2 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid 1.2 cvt');

  -- Baleno
  INSERT INTO models (name, brand_id) SELECT 'Baleno', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'baleno');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'baleno';
  INSERT INTO versions (name, model_id) SELECT 'GL 1.4 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.4 mt');
  INSERT INTO versions (name, model_id) SELECT 'GL 1.4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.4 at');
  INSERT INTO versions (name, model_id) SELECT 'GLX 1.4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glx 1.4 at');

  -- S-Presso
  INSERT INTO models (name, brand_id) SELECT 'S-Presso', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's-presso');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's-presso';
  INSERT INTO versions (name, model_id) SELECT 'GA 1.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ga 1.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'GL 1.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'GL 1.0 AGS', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.0 ags');

  -- Vitara
  INSERT INTO models (name, brand_id) SELECT 'Vitara', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vitara');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vitara';
  INSERT INTO versions (name, model_id) SELECT 'GL 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'GL 1.6 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.6 at');
  INSERT INTO versions (name, model_id) SELECT 'GLX 1.6 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glx 1.6 at');
  INSERT INTO versions (name, model_id) SELECT 'GLX 1.4T AT 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glx 1.4t at 4wd');
  INSERT INTO versions (name, model_id) SELECT 'AllGrip 1.4T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allgrip 1.4t');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid GL 1.5', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid gl 1.5');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid GLX 1.5', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid glx 1.5');

  -- Grand Vitara
  INSERT INTO models (name, brand_id) SELECT 'Grand Vitara', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand vitara');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand vitara';
  INSERT INTO versions (name, model_id) SELECT 'GL 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'GLX 1.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glx 1.5 at');
  INSERT INTO versions (name, model_id) SELECT 'AllGrip 1.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allgrip 1.5 at');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid AllGrip', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid allgrip');

  -- Jimny
  INSERT INTO models (name, brand_id) SELECT 'Jimny', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jimny');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jimny';
  INSERT INTO versions (name, model_id) SELECT 'GL 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'GLX 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glx 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'GLX 1.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glx 1.5 at');
  INSERT INTO versions (name, model_id) SELECT 'Sierra 5 Door 1.5', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sierra 5 door 1.5');

  -- S-Cross
  INSERT INTO models (name, brand_id) SELECT 'S-Cross', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's-cross');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's-cross';
  INSERT INTO versions (name, model_id) SELECT 'GL 1.4T AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.4t at');
  INSERT INTO versions (name, model_id) SELECT 'GLX 1.4T AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glx 1.4t at');
  INSERT INTO versions (name, model_id) SELECT 'AllGrip 1.4T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allgrip 1.4t');

  -- Other models
  INSERT INTO models (name, brand_id) SELECT 'Celerio', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'celerio');
  INSERT INTO models (name, brand_id) SELECT 'Alto', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'alto');
  INSERT INTO models (name, brand_id) SELECT 'Alto K10', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'alto k10');
  INSERT INTO models (name, brand_id) SELECT 'Ignis', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ignis');
  INSERT INTO models (name, brand_id) SELECT 'Dzire', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dzire');
  INSERT INTO models (name, brand_id) SELECT 'Ciaz', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ciaz');
  INSERT INTO models (name, brand_id) SELECT 'Ertiga', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ertiga');
  INSERT INTO models (name, brand_id) SELECT 'XL7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xl7');
  INSERT INTO models (name, brand_id) SELECT 'Fronx', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fronx');
  INSERT INTO models (name, brand_id) SELECT 'eVitara', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'evitara');
END $$;

-- === Hyundai ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Hyundai'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'hyundai');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'hyundai';

  -- Accent
  INSERT INTO models (name, brand_id) SELECT 'Accent', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'accent');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'accent';
  INSERT INTO versions (name, model_id) SELECT 'GL 1.4 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.4 mt');
  INSERT INTO versions (name, model_id) SELECT 'GL 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'GLS 1.6 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 1.6 at');
  INSERT INTO versions (name, model_id) SELECT 'Limited 1.6 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 1.6 at');

  -- Grand i10
  INSERT INTO models (name, brand_id) SELECT 'Grand i10', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand i10');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand i10';
  INSERT INTO versions (name, model_id) SELECT 'GL 1.2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.2 mt');
  INSERT INTO versions (name, model_id) SELECT 'GLS 1.2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 1.2 mt');
  INSERT INTO versions (name, model_id) SELECT 'GLS 1.2 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 1.2 at');

  -- i20
  INSERT INTO models (name, brand_id) SELECT 'i20', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i20');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i20';
  INSERT INTO versions (name, model_id) SELECT 'GL 1.2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.2 mt');
  INSERT INTO versions (name, model_id) SELECT 'GLS 1.4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 1.4 at');

  -- Elantra
  INSERT INTO models (name, brand_id) SELECT 'Elantra', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'elantra');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'elantra';
  INSERT INTO versions (name, model_id) SELECT 'GL 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'GLS 1.6 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 1.6 at');
  INSERT INTO versions (name, model_id) SELECT 'Limited 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 2.0 at');
  INSERT INTO versions (name, model_id) SELECT 'N Line 1.6T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'n line 1.6t');

  -- Sonata
  INSERT INTO models (name, brand_id) SELECT 'Sonata', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sonata');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sonata';
  INSERT INTO versions (name, model_id) SELECT 'GLS 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 2.0 at');
  INSERT INTO versions (name, model_id) SELECT 'Limited 2.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 2.5 at');

  -- Venue
  INSERT INTO models (name, brand_id) SELECT 'Venue', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'venue');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'venue';
  INSERT INTO versions (name, model_id) SELECT 'GL 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'GLS 1.6 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 1.6 at');
  INSERT INTO versions (name, model_id) SELECT 'Limited 1.6 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 1.6 at');

  -- Creta
  INSERT INTO models (name, brand_id) SELECT 'Creta', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'creta');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'creta';
  INSERT INTO versions (name, model_id) SELECT 'GL 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'GL 1.6 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 1.6 at');
  INSERT INTO versions (name, model_id) SELECT 'GLS 1.6 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 1.6 at');
  INSERT INTO versions (name, model_id) SELECT 'Limited 1.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 1.5 at');
  INSERT INTO versions (name, model_id) SELECT 'N Line 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'n line 1.5t');

  -- Tucson
  INSERT INTO models (name, brand_id) SELECT 'Tucson', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tucson');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tucson';
  INSERT INTO versions (name, model_id) SELECT 'GL 2.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 2.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'GL 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 2.0 at');
  INSERT INTO versions (name, model_id) SELECT 'GLS 2.0 AT 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 2.0 at 4wd');
  INSERT INTO versions (name, model_id) SELECT 'Limited 2.0 CRDi 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 2.0 crdi 4wd');
  INSERT INTO versions (name, model_id) SELECT 'N Line 1.6T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'n line 1.6t');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid Limited', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid limited');

  -- Santa Fe
  INSERT INTO models (name, brand_id) SELECT 'Santa Fe', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'santa fe');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'santa fe';
  INSERT INTO versions (name, model_id) SELECT 'GLS 2.4 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 2.4 4wd');
  INSERT INTO versions (name, model_id) SELECT 'Limited 2.2 CRDi 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 2.2 crdi 4wd');
  INSERT INTO versions (name, model_id) SELECT 'Calligraphy 2.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'calligraphy 2.5t');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid Calligraphy', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid calligraphy');

  -- Kona
  INSERT INTO models (name, brand_id) SELECT 'Kona', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kona');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kona';
  INSERT INTO versions (name, model_id) SELECT 'GL 2.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl 2.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'GLS 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 2.0 at');
  INSERT INTO versions (name, model_id) SELECT 'Limited 1.6T 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 1.6t 4wd');
  INSERT INTO versions (name, model_id) SELECT 'N Line 1.6T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'n line 1.6t');
  INSERT INTO versions (name, model_id) SELECT 'Electric 39 kWh', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'electric 39 kwh');
  INSERT INTO versions (name, model_id) SELECT 'Electric 64 kWh', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'electric 64 kwh');

  -- IONIQ 5 / 6
  INSERT INTO models (name, brand_id) SELECT 'IONIQ 5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ioniq 5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ioniq 5';
  INSERT INTO versions (name, model_id) SELECT 'Standard Range RWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'standard range rwd');
  INSERT INTO versions (name, model_id) SELECT 'Long Range RWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range rwd');
  INSERT INTO versions (name, model_id) SELECT 'Long Range AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range awd');
  INSERT INTO versions (name, model_id) SELECT 'N AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'n awd');

  INSERT INTO models (name, brand_id) SELECT 'IONIQ 6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ioniq 6');
  INSERT INTO models (name, brand_id) SELECT 'Palisade', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'palisade');
  INSERT INTO models (name, brand_id) SELECT 'Staria', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'staria');
  INSERT INTO models (name, brand_id) SELECT 'H1', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h1');
  INSERT INTO models (name, brand_id) SELECT 'H100', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h100');
  INSERT INTO models (name, brand_id) SELECT 'Porter', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'porter');
  INSERT INTO models (name, brand_id) SELECT 'Veloster', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'veloster');
  INSERT INTO models (name, brand_id) SELECT 'Stargazer', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'stargazer');
  INSERT INTO models (name, brand_id) SELECT 'Bayon', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bayon');
END $$;

-- === Kia ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Kia'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'kia');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'kia';

  -- Picanto
  INSERT INTO models (name, brand_id) SELECT 'Picanto', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'picanto');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'picanto';
  INSERT INTO versions (name, model_id) SELECT 'LX 1.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 1.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'EX 1.25 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 1.25 mt');
  INSERT INTO versions (name, model_id) SELECT 'EX 1.25 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 1.25 at');
  INSERT INTO versions (name, model_id) SELECT 'GT-Line 1.25 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt-line 1.25 at');

  -- Rio
  INSERT INTO models (name, brand_id) SELECT 'Rio', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rio');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rio';
  INSERT INTO versions (name, model_id) SELECT 'LX 1.4 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 1.4 mt');
  INSERT INTO versions (name, model_id) SELECT 'EX 1.4 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 1.4 mt');
  INSERT INTO versions (name, model_id) SELECT 'EX 1.4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 1.4 at');
  INSERT INTO versions (name, model_id) SELECT 'GT-Line 1.4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt-line 1.4 at');
  INSERT INTO versions (name, model_id) SELECT 'Sedan EX 1.4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sedan ex 1.4');

  -- Sonet
  INSERT INTO models (name, brand_id) SELECT 'Sonet', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sonet');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sonet';
  INSERT INTO versions (name, model_id) SELECT 'LX 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'EX 1.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 1.5 at');
  INSERT INTO versions (name, model_id) SELECT 'GT-Line 1.0T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt-line 1.0t');

  -- Seltos
  INSERT INTO models (name, brand_id) SELECT 'Seltos', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'seltos');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'seltos';
  INSERT INTO versions (name, model_id) SELECT 'LX 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'EX 1.6 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 1.6 at');
  INSERT INTO versions (name, model_id) SELECT 'SX 1.6T AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sx 1.6t awd');
  INSERT INTO versions (name, model_id) SELECT 'GT-Line 1.6T AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt-line 1.6t awd');
  INSERT INTO versions (name, model_id) SELECT 'X-Line 1.6T AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x-line 1.6t awd');

  -- Sportage
  INSERT INTO models (name, brand_id) SELECT 'Sportage', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sportage');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sportage';
  INSERT INTO versions (name, model_id) SELECT 'LX 2.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 2.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'EX 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 2.0 at');
  INSERT INTO versions (name, model_id) SELECT 'SX 2.0 CRDi 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sx 2.0 crdi 4wd');
  INSERT INTO versions (name, model_id) SELECT 'GT-Line 1.6T AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt-line 1.6t awd');
  INSERT INTO versions (name, model_id) SELECT 'X-Line 1.6T HEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x-line 1.6t hev');

  -- Sorento
  INSERT INTO models (name, brand_id) SELECT 'Sorento', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sorento');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sorento';
  INSERT INTO versions (name, model_id) SELECT 'LX 2.4 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 2.4 4x2');
  INSERT INTO versions (name, model_id) SELECT 'EX 2.2 CRDi 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 2.2 crdi 4wd');
  INSERT INTO versions (name, model_id) SELECT 'SX 2.2 CRDi 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sx 2.2 crdi 4wd');
  INSERT INTO versions (name, model_id) SELECT 'GT-Line HEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt-line hev');
  INSERT INTO versions (name, model_id) SELECT 'PHEV AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'phev awd');

  -- Cerato / K3 / Forte
  INSERT INTO models (name, brand_id) SELECT 'Cerato', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cerato');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cerato';
  INSERT INTO versions (name, model_id) SELECT 'LX 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'EX 1.6 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 1.6 at');
  INSERT INTO versions (name, model_id) SELECT 'SX 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sx 2.0 at');
  INSERT INTO versions (name, model_id) SELECT 'GT 1.6T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 1.6t');

  -- Other models
  INSERT INTO models (name, brand_id) SELECT 'Morning', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'morning');
  INSERT INTO models (name, brand_id) SELECT 'Stonic', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'stonic');
  INSERT INTO models (name, brand_id) SELECT 'Niro', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'niro');
  INSERT INTO models (name, brand_id) SELECT 'Carnival', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'carnival');
  INSERT INTO models (name, brand_id) SELECT 'Carens', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'carens');
  INSERT INTO models (name, brand_id) SELECT 'EV6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ev6');
  INSERT INTO models (name, brand_id) SELECT 'EV9', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ev9');
  INSERT INTO models (name, brand_id) SELECT 'EV3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ev3');
  INSERT INTO models (name, brand_id) SELECT 'EV5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ev5');
  INSERT INTO models (name, brand_id) SELECT 'Frontier', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'frontier');
  INSERT INTO models (name, brand_id) SELECT 'Tasman', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tasman');
  INSERT INTO models (name, brand_id) SELECT 'Stinger', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'stinger');
  INSERT INTO models (name, brand_id) SELECT 'Soul', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'soul');
  INSERT INTO models (name, brand_id) SELECT 'Bongo', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bongo');
  INSERT INTO models (name, brand_id) SELECT 'K2700', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'k2700');
END $$;

-- === Chevrolet ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Chevrolet'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'chevrolet');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'chevrolet';

  -- Sail
  INSERT INTO models (name, brand_id) SELECT 'Sail', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sail');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sail';
  INSERT INTO versions (name, model_id) SELECT 'LS 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'LT 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lt 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'LT 1.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lt 1.5 at');
  INSERT INTO versions (name, model_id) SELECT 'Premier 1.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'premier 1.5 at');

  -- Onix
  INSERT INTO models (name, brand_id) SELECT 'Onix', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'onix');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'onix';
  INSERT INTO versions (name, model_id) SELECT 'LS 1.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 1.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'LT 1.0 Turbo MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lt 1.0 turbo mt');
  INSERT INTO versions (name, model_id) SELECT 'LTZ 1.0 Turbo AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ltz 1.0 turbo at');
  INSERT INTO versions (name, model_id) SELECT 'Premier 1.0 Turbo AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'premier 1.0 turbo at');
  INSERT INTO versions (name, model_id) SELECT 'RS 1.0 Turbo AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs 1.0 turbo at');

  -- Onix Plus / Sedan
  INSERT INTO models (name, brand_id) SELECT 'Onix Plus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'onix plus');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'onix plus';
  INSERT INTO versions (name, model_id) SELECT 'LT 1.0 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lt 1.0 turbo');
  INSERT INTO versions (name, model_id) SELECT 'LTZ 1.0 Turbo AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ltz 1.0 turbo at');
  INSERT INTO versions (name, model_id) SELECT 'Premier 1.0 Turbo AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'premier 1.0 turbo at');

  -- Tracker
  INSERT INTO models (name, brand_id) SELECT 'Tracker', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tracker');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tracker';
  INSERT INTO versions (name, model_id) SELECT 'LS 1.2 Turbo MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 1.2 turbo mt');
  INSERT INTO versions (name, model_id) SELECT 'LT 1.2 Turbo AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lt 1.2 turbo at');
  INSERT INTO versions (name, model_id) SELECT 'LTZ 1.2 Turbo AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ltz 1.2 turbo at');
  INSERT INTO versions (name, model_id) SELECT 'Premier 1.2 Turbo AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'premier 1.2 turbo at');
  INSERT INTO versions (name, model_id) SELECT 'RS 1.2 Turbo AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs 1.2 turbo at');

  -- Spin
  INSERT INTO models (name, brand_id) SELECT 'Spin', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spin');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spin';
  INSERT INTO versions (name, model_id) SELECT 'LS 1.8 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 1.8 mt');
  INSERT INTO versions (name, model_id) SELECT 'LT 1.8 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lt 1.8 at');
  INSERT INTO versions (name, model_id) SELECT 'Premier 1.8 AT 7 Pas', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'premier 1.8 at 7 pas');
  INSERT INTO versions (name, model_id) SELECT 'Activ 1.8 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'activ 1.8 at');

  -- Equinox
  INSERT INTO models (name, brand_id) SELECT 'Equinox', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'equinox');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'equinox';
  INSERT INTO versions (name, model_id) SELECT 'LT 1.5 Turbo AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lt 1.5 turbo awd');
  INSERT INTO versions (name, model_id) SELECT 'Premier 1.5 Turbo AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'premier 1.5 turbo awd');
  INSERT INTO versions (name, model_id) SELECT 'RS 2.0 Turbo AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs 2.0 turbo awd');

  -- Captiva
  INSERT INTO models (name, brand_id) SELECT 'Captiva', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'captiva');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'captiva';
  INSERT INTO versions (name, model_id) SELECT 'LS 1.5 Turbo 5 Pas', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 1.5 turbo 5 pas');
  INSERT INTO versions (name, model_id) SELECT 'LT 1.5 Turbo 7 Pas', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lt 1.5 turbo 7 pas');
  INSERT INTO versions (name, model_id) SELECT 'Premier 1.5 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'premier 1.5 turbo');

  -- Colorado / S10
  INSERT INTO models (name, brand_id) SELECT 'Colorado', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'colorado');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'colorado';
  INSERT INTO versions (name, model_id) SELECT 'LS 2.5 4x2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 2.5 4x2 mt');
  INSERT INTO versions (name, model_id) SELECT 'LT 2.5 4x4 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lt 2.5 4x4 mt');
  INSERT INTO versions (name, model_id) SELECT 'LTZ 2.8 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ltz 2.8 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'High Country 2.8 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'high country 2.8 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Z71 2.8 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'z71 2.8 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'ZR2 2.8 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'zr2 2.8 4x4 at');

  -- Silverado / Cheyenne
  INSERT INTO models (name, brand_id) SELECT 'Silverado', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'silverado');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'silverado';
  INSERT INTO versions (name, model_id) SELECT '1500 LT 5.3 V8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '1500 lt 5.3 v8');
  INSERT INTO versions (name, model_id) SELECT '1500 LTZ 5.3 V8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '1500 ltz 5.3 v8');
  INSERT INTO versions (name, model_id) SELECT '1500 High Country 6.2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '1500 high country 6.2');
  INSERT INTO versions (name, model_id) SELECT '1500 Trail Boss 5.3', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '1500 trail boss 5.3');
  INSERT INTO versions (name, model_id) SELECT '2500 HD LTZ', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2500 hd ltz');

  -- Camaro / Corvette
  INSERT INTO models (name, brand_id) SELECT 'Camaro', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'camaro');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'camaro';
  INSERT INTO versions (name, model_id) SELECT 'RS 2.0 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs 2.0 turbo');
  INSERT INTO versions (name, model_id) SELECT 'SS 6.2 V8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ss 6.2 v8');
  INSERT INTO versions (name, model_id) SELECT 'ZL1 6.2 V8 Supercharged', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'zl1 6.2 v8 supercharged');

  -- Other models
  INSERT INTO models (name, brand_id) SELECT 'Spark', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spark');
  INSERT INTO models (name, brand_id) SELECT 'Spark GT', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spark gt');
  INSERT INTO models (name, brand_id) SELECT 'Aveo', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aveo');
  INSERT INTO models (name, brand_id) SELECT 'Cruze', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cruze');
  INSERT INTO models (name, brand_id) SELECT 'Trax', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'trax');
  INSERT INTO models (name, brand_id) SELECT 'Trailblazer', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'trailblazer');
  INSERT INTO models (name, brand_id) SELECT 'Tahoe', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tahoe');
  INSERT INTO models (name, brand_id) SELECT 'Suburban', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'suburban');
  INSERT INTO models (name, brand_id) SELECT 'Groove', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'groove');
  INSERT INTO models (name, brand_id) SELECT 'Joy', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'joy');
  INSERT INTO models (name, brand_id) SELECT 'NHR', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nhr');
  INSERT INTO models (name, brand_id) SELECT 'NPR', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'npr');
  INSERT INTO models (name, brand_id) SELECT 'Montana', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'montana');
  INSERT INTO models (name, brand_id) SELECT 'N400 Max', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'n400 max');
END $$;

-- === Mazda ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Mazda'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'mazda');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mazda';

  -- Mazda2
  INSERT INTO models (name, brand_id) SELECT 'Mazda2', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mazda2');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mazda2';
  INSERT INTO versions (name, model_id) SELECT 'V 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'V 1.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v 1.5 at');
  INSERT INTO versions (name, model_id) SELECT 'GT 1.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 1.5 at');
  INSERT INTO versions (name, model_id) SELECT 'Sport 1.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport 1.5 at');

  -- Mazda3
  INSERT INTO models (name, brand_id) SELECT 'Mazda3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mazda3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mazda3';
  INSERT INTO versions (name, model_id) SELECT 'V 2.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v 2.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'V 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v 2.0 at');
  INSERT INTO versions (name, model_id) SELECT 'GT 2.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 2.5 at');
  INSERT INTO versions (name, model_id) SELECT 'GT SP 2.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt sp 2.5 at');
  INSERT INTO versions (name, model_id) SELECT 'Sport 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport 2.0 at');
  INSERT INTO versions (name, model_id) SELECT 'Sedan 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sedan 2.0 at');

  -- Mazda6
  INSERT INTO models (name, brand_id) SELECT 'Mazda6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mazda6');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mazda6';
  INSERT INTO versions (name, model_id) SELECT 'V 2.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v 2.5 at');
  INSERT INTO versions (name, model_id) SELECT 'GT 2.5 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 2.5 at');
  INSERT INTO versions (name, model_id) SELECT 'Signature 2.5T AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'signature 2.5t at');

  -- CX-3
  INSERT INTO models (name, brand_id) SELECT 'CX-3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx-3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx-3';
  INSERT INTO versions (name, model_id) SELECT 'V 2.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v 2.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'V 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v 2.0 at');
  INSERT INTO versions (name, model_id) SELECT 'GT 2.0 AWD AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 2.0 awd at');
  INSERT INTO versions (name, model_id) SELECT 'R 2.0 AWD AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r 2.0 awd at');

  -- CX-30
  INSERT INTO models (name, brand_id) SELECT 'CX-30', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx-30');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx-30';
  INSERT INTO versions (name, model_id) SELECT 'V 2.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v 2.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'V 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v 2.0 at');
  INSERT INTO versions (name, model_id) SELECT 'GT 2.5 AWD AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 2.5 awd at');
  INSERT INTO versions (name, model_id) SELECT 'GT SP 2.5 AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt sp 2.5 awd');

  -- CX-5
  INSERT INTO models (name, brand_id) SELECT 'CX-5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx-5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx-5';
  INSERT INTO versions (name, model_id) SELECT 'V 2.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v 2.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'V 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v 2.0 at');
  INSERT INTO versions (name, model_id) SELECT 'GT 2.5 AWD AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 2.5 awd at');
  INSERT INTO versions (name, model_id) SELECT 'GT SP 2.5T AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt sp 2.5t awd');
  INSERT INTO versions (name, model_id) SELECT 'Signature 2.5T AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'signature 2.5t awd');

  -- CX-60 / CX-90
  INSERT INTO models (name, brand_id) SELECT 'CX-60', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx-60');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx-60';
  INSERT INTO versions (name, model_id) SELECT '3.3 Diesel AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '3.3 diesel awd');
  INSERT INTO versions (name, model_id) SELECT 'PHEV AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'phev awd');
  INSERT INTO versions (name, model_id) SELECT 'Homura', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'homura');

  INSERT INTO models (name, brand_id) SELECT 'CX-90', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx-90');
  INSERT INTO models (name, brand_id) SELECT 'CX-9', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx-9');
  INSERT INTO models (name, brand_id) SELECT 'CX-8', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cx-8');
  INSERT INTO models (name, brand_id) SELECT 'BT-50', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bt-50');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bt-50';
  INSERT INTO versions (name, model_id) SELECT 'SDX 3.0 4x2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdx 3.0 4x2 mt');
  INSERT INTO versions (name, model_id) SELECT 'SDX 3.0 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdx 3.0 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'GT 3.0 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 3.0 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Thunder 3.0 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'thunder 3.0 4x4');

  INSERT INTO models (name, brand_id) SELECT 'MX-5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mx-5');
  INSERT INTO models (name, brand_id) SELECT 'MX-30', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mx-30');
END $$;

-- === Nissan ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Nissan'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'nissan');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'nissan';

  -- Versa
  INSERT INTO models (name, brand_id) SELECT 'Versa', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'versa');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'versa';
  INSERT INTO versions (name, model_id) SELECT 'Sense 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sense 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'Sense 1.6 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sense 1.6 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Advance 1.6 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'advance 1.6 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Exclusive 1.6 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'exclusive 1.6 cvt');

  -- March
  INSERT INTO models (name, brand_id) SELECT 'March', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'march');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'march';
  INSERT INTO versions (name, model_id) SELECT 'Sense 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sense 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'Active 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'active 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'Advance 1.6 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'advance 1.6 cvt');

  -- Sentra
  INSERT INTO models (name, brand_id) SELECT 'Sentra', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sentra');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sentra';
  INSERT INTO versions (name, model_id) SELECT 'Sense 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sense 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Advance 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'advance 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Exclusive 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'exclusive 2.0 cvt');

  -- Kicks
  INSERT INTO models (name, brand_id) SELECT 'Kicks', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kicks');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kicks';
  INSERT INTO versions (name, model_id) SELECT 'Sense 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sense 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'Sense 1.6 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sense 1.6 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Advance 1.6 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'advance 1.6 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Exclusive 1.6 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'exclusive 1.6 cvt');
  INSERT INTO versions (name, model_id) SELECT 'e-Power', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-power');

  -- Qashqai
  INSERT INTO models (name, brand_id) SELECT 'Qashqai', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'qashqai');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'qashqai';
  INSERT INTO versions (name, model_id) SELECT 'Sense 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sense 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Advance 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'advance 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Exclusive 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'exclusive 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'e-Power', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-power');

  -- X-Trail
  INSERT INTO models (name, brand_id) SELECT 'X-Trail', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x-trail');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x-trail';
  INSERT INTO versions (name, model_id) SELECT 'Sense 2.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sense 2.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Advance 2.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'advance 2.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Exclusive 2.5 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'exclusive 2.5 4wd');
  INSERT INTO versions (name, model_id) SELECT 'Platinum 2.5 4WD 7 Pas', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'platinum 2.5 4wd 7 pas');
  INSERT INTO versions (name, model_id) SELECT 'e-Power e-4ORCE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-power e-4orce');

  -- Frontier
  INSERT INTO models (name, brand_id) SELECT 'Frontier', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'frontier');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'frontier';
  INSERT INTO versions (name, model_id) SELECT 'S 2.5 4x2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's 2.5 4x2 mt');
  INSERT INTO versions (name, model_id) SELECT 'SE 2.3 4x2 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se 2.3 4x2 at');
  INSERT INTO versions (name, model_id) SELECT 'SE 2.3 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se 2.3 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'LE 2.3 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'le 2.3 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'PRO-4X 2.3 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'pro-4x 2.3 4x4 at');

  -- Patrol
  INSERT INTO models (name, brand_id) SELECT 'Patrol', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'patrol');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'patrol';
  INSERT INTO versions (name, model_id) SELECT 'Y61 4.8 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'y61 4.8 mt');
  INSERT INTO versions (name, model_id) SELECT 'Y62 5.6 V8 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'y62 5.6 v8 at');
  INSERT INTO versions (name, model_id) SELECT 'Nismo 5.6 V8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'nismo 5.6 v8');

  -- Other models
  INSERT INTO models (name, brand_id) SELECT 'Note', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'note');
  INSERT INTO models (name, brand_id) SELECT 'Tiida', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiida');
  INSERT INTO models (name, brand_id) SELECT 'Juke', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'juke');
  INSERT INTO models (name, brand_id) SELECT 'Pathfinder', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pathfinder');
  INSERT INTO models (name, brand_id) SELECT 'Murano', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'murano');
  INSERT INTO models (name, brand_id) SELECT 'Leaf', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'leaf');
  INSERT INTO models (name, brand_id) SELECT 'Ariya', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ariya');
  INSERT INTO models (name, brand_id) SELECT 'GT-R', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt-r');
  INSERT INTO models (name, brand_id) SELECT '370Z', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '370z');
  INSERT INTO models (name, brand_id) SELECT 'Z', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'z');
  INSERT INTO models (name, brand_id) SELECT 'NV200', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nv200');
  INSERT INTO models (name, brand_id) SELECT 'NV350 Urvan', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nv350 urvan');
  INSERT INTO models (name, brand_id) SELECT 'Magnite', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'magnite');
END $$;

-- === Mitsubishi ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Mitsubishi'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'mitsubishi');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mitsubishi';

  -- L200 / Triton
  INSERT INTO models (name, brand_id) SELECT 'L200', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'l200');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'l200';
  INSERT INTO versions (name, model_id) SELECT 'Katana 2.5 4x2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'katana 2.5 4x2 mt');
  INSERT INTO versions (name, model_id) SELECT 'Katana 2.4 4x2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'katana 2.4 4x2 mt');
  INSERT INTO versions (name, model_id) SELECT 'Katana 2.4 4x4 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'katana 2.4 4x4 mt');
  INSERT INTO versions (name, model_id) SELECT 'Katana 2.4 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'katana 2.4 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Dakar 2.4 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dakar 2.4 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Cabina Simple 2.5 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cabina simple 2.5 4x2');
  INSERT INTO versions (name, model_id) SELECT 'Cabina Simple 2.5 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cabina simple 2.5 4x4');

  -- ASX
  INSERT INTO models (name, brand_id) SELECT 'ASX', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'asx');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'asx';
  INSERT INTO versions (name, model_id) SELECT 'GLX 2.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glx 2.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'GLS 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'GT 2.0 4WD CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 2.0 4wd cvt');

  -- Outlander
  INSERT INTO models (name, brand_id) SELECT 'Outlander', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'outlander');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'outlander';
  INSERT INTO versions (name, model_id) SELECT 'GLX 2.0 4x2 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glx 2.0 4x2 cvt');
  INSERT INTO versions (name, model_id) SELECT 'GLS 2.4 4x4 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 2.4 4x4 cvt');
  INSERT INTO versions (name, model_id) SELECT 'GT 2.4 4x4 7 Pas', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 2.4 4x4 7 pas');
  INSERT INTO versions (name, model_id) SELECT 'PHEV S-AWC', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'phev s-awc');

  -- Eclipse Cross
  INSERT INTO models (name, brand_id) SELECT 'Eclipse Cross', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eclipse cross');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eclipse cross';
  INSERT INTO versions (name, model_id) SELECT 'GLX 1.5T MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glx 1.5t mt');
  INSERT INTO versions (name, model_id) SELECT 'GLS 1.5T CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 1.5t cvt');
  INSERT INTO versions (name, model_id) SELECT 'GT 1.5T 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 1.5t 4wd');
  INSERT INTO versions (name, model_id) SELECT 'PHEV S-AWC', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'phev s-awc');

  -- Montero
  INSERT INTO models (name, brand_id) SELECT 'Montero Sport', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'montero sport');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'montero sport';
  INSERT INTO versions (name, model_id) SELECT 'GLX 2.4 4x2 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glx 2.4 4x2 at');
  INSERT INTO versions (name, model_id) SELECT 'GLS 2.4 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gls 2.4 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'GT 2.4 4x4 7 Pas', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 2.4 4x4 7 pas');

  INSERT INTO models (name, brand_id) SELECT 'Montero', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'montero');
  INSERT INTO models (name, brand_id) SELECT 'Lancer', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lancer');
  INSERT INTO models (name, brand_id) SELECT 'Mirage', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mirage');
  INSERT INTO models (name, brand_id) SELECT 'Mirage G4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mirage g4');
  INSERT INTO models (name, brand_id) SELECT 'Xpander', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xpander');
  INSERT INTO models (name, brand_id) SELECT 'Xforce', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xforce');
END $$;

-- === Ford ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Ford'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'ford');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'ford';

  -- Ranger
  INSERT INTO models (name, brand_id) SELECT 'Ranger', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ranger');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ranger';
  INSERT INTO versions (name, model_id) SELECT 'XL 2.2 4x2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xl 2.2 4x2 mt');
  INSERT INTO versions (name, model_id) SELECT 'XL 2.2 4x4 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xl 2.2 4x4 mt');
  INSERT INTO versions (name, model_id) SELECT 'XLS 2.2 4x4 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xls 2.2 4x4 mt');
  INSERT INTO versions (name, model_id) SELECT 'XLS 2.0 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xls 2.0 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'XLT 3.2 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xlt 3.2 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'XLT 2.0 BiTurbo 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xlt 2.0 biturbo 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Limited 3.2 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 3.2 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Limited 2.0 BiTurbo 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 2.0 biturbo 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Wildtrak 3.2 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wildtrak 3.2 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Wildtrak 2.0 BiTurbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wildtrak 2.0 biturbo');
  INSERT INTO versions (name, model_id) SELECT 'Wildtrak 3.0 V6 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wildtrak 3.0 v6 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Raptor 2.0 BiTurbo 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'raptor 2.0 biturbo 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Raptor 3.0 V6 EcoBoost', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'raptor 3.0 v6 ecoboost');
  INSERT INTO versions (name, model_id) SELECT 'Stormtrak 3.0 V6', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'stormtrak 3.0 v6');
  INSERT INTO versions (name, model_id) SELECT 'Tremor 2.0 BiTurbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tremor 2.0 biturbo');

  -- F-150
  INSERT INTO models (name, brand_id) SELECT 'F-150', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f-150');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f-150';
  INSERT INTO versions (name, model_id) SELECT 'XL 5.0 V8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xl 5.0 v8');
  INSERT INTO versions (name, model_id) SELECT 'XLT 3.5 EcoBoost', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xlt 3.5 ecoboost');
  INSERT INTO versions (name, model_id) SELECT 'Lariat 3.5 EcoBoost 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lariat 3.5 ecoboost 4wd');
  INSERT INTO versions (name, model_id) SELECT 'Raptor 3.5 EcoBoost', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'raptor 3.5 ecoboost');
  INSERT INTO versions (name, model_id) SELECT 'Raptor R 5.2 V8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'raptor r 5.2 v8');
  INSERT INTO versions (name, model_id) SELECT 'Limited 3.5 EcoBoost', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 3.5 ecoboost');

  -- EcoSport
  INSERT INTO models (name, brand_id) SELECT 'EcoSport', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ecosport');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ecosport';
  INSERT INTO versions (name, model_id) SELECT 'S 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'SE 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'Titanium 2.0 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'titanium 2.0 at');
  INSERT INTO versions (name, model_id) SELECT 'Storm 2.0 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'storm 2.0 4wd');

  -- Other Ford models
  INSERT INTO models (name, brand_id) SELECT 'Fiesta', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fiesta');
  INSERT INTO models (name, brand_id) SELECT 'Focus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'focus');
  INSERT INTO models (name, brand_id) SELECT 'Mondeo', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mondeo');
  INSERT INTO models (name, brand_id) SELECT 'Escape', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'escape');
  INSERT INTO models (name, brand_id) SELECT 'Edge', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'edge');
  INSERT INTO models (name, brand_id) SELECT 'Explorer', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'explorer');
  INSERT INTO models (name, brand_id) SELECT 'Expedition', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'expedition');
  INSERT INTO models (name, brand_id) SELECT 'Bronco', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bronco');
  INSERT INTO models (name, brand_id) SELECT 'Bronco Sport', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'bronco sport');
  INSERT INTO models (name, brand_id) SELECT 'Maverick', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'maverick');
  INSERT INTO models (name, brand_id) SELECT 'Mustang', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mustang');
  INSERT INTO models (name, brand_id) SELECT 'Mustang Mach-E', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mustang mach-e');
  INSERT INTO models (name, brand_id) SELECT 'Transit', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'transit');
  INSERT INTO models (name, brand_id) SELECT 'Territory', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'territory');
END $$;

-- === Peugeot ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Peugeot'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'peugeot');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'peugeot';

  -- 208
  INSERT INTO models (name, brand_id) SELECT '208', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '208');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '208';
  INSERT INTO versions (name, model_id) SELECT 'Active 1.2 PureTech MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'active 1.2 puretech mt');
  INSERT INTO versions (name, model_id) SELECT 'Allure 1.2 PureTech AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allure 1.2 puretech at');
  INSERT INTO versions (name, model_id) SELECT 'GT 1.2 PureTech AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 1.2 puretech at');
  INSERT INTO versions (name, model_id) SELECT 'GT-Line 1.2 PureTech', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt-line 1.2 puretech');
  INSERT INTO versions (name, model_id) SELECT 'e-208 Electric', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-208 electric');

  -- 2008
  INSERT INTO models (name, brand_id) SELECT '2008', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2008');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2008';
  INSERT INTO versions (name, model_id) SELECT 'Active 1.2 PureTech MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'active 1.2 puretech mt');
  INSERT INTO versions (name, model_id) SELECT 'Allure 1.2 PureTech AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allure 1.2 puretech at');
  INSERT INTO versions (name, model_id) SELECT 'GT 1.2 PureTech AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 1.2 puretech at');
  INSERT INTO versions (name, model_id) SELECT 'GT-Line 1.6 BlueHDi', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt-line 1.6 bluehdi');
  INSERT INTO versions (name, model_id) SELECT 'e-2008 Electric', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-2008 electric');

  -- 3008
  INSERT INTO models (name, brand_id) SELECT '3008', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '3008');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '3008';
  INSERT INTO versions (name, model_id) SELECT 'Active 1.6 PureTech', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'active 1.6 puretech');
  INSERT INTO versions (name, model_id) SELECT 'Allure 1.6 THP AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allure 1.6 thp at');
  INSERT INTO versions (name, model_id) SELECT 'GT 1.6 THP AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 1.6 thp at');
  INSERT INTO versions (name, model_id) SELECT 'GT-Line 2.0 BlueHDi', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt-line 2.0 bluehdi');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid 4 PHEV AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid 4 phev awd');

  -- 5008
  INSERT INTO models (name, brand_id) SELECT '5008', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '5008');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '5008';
  INSERT INTO versions (name, model_id) SELECT 'Allure 1.6 THP 7 Pas', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allure 1.6 thp 7 pas');
  INSERT INTO versions (name, model_id) SELECT 'GT 2.0 BlueHDi 7 Pas', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 2.0 bluehdi 7 pas');
  INSERT INTO versions (name, model_id) SELECT 'GT-Line 2.0 BlueHDi', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt-line 2.0 bluehdi');

  -- Landtrek
  INSERT INTO models (name, brand_id) SELECT 'Landtrek', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'landtrek');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'landtrek';
  INSERT INTO versions (name, model_id) SELECT 'Allure 1.9 4x2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allure 1.9 4x2 mt');
  INSERT INTO versions (name, model_id) SELECT 'Allure 1.9 4x4 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allure 1.9 4x4 mt');
  INSERT INTO versions (name, model_id) SELECT 'GT 1.9 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt 1.9 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Sahara 1.9 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sahara 1.9 4x4 at');

  -- Partner / Rifter
  INSERT INTO models (name, brand_id) SELECT 'Partner', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'partner');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'partner';
  INSERT INTO versions (name, model_id) SELECT 'Furgon 1.6 HDi', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'furgon 1.6 hdi');
  INSERT INTO versions (name, model_id) SELECT 'Maxi 1.6 HDi', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'maxi 1.6 hdi');

  INSERT INTO models (name, brand_id) SELECT 'Rifter', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rifter');
  INSERT INTO models (name, brand_id) SELECT 'Expert', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'expert');
  INSERT INTO models (name, brand_id) SELECT 'Boxer', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'boxer');
  INSERT INTO models (name, brand_id) SELECT 'Traveller', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'traveller');
  INSERT INTO models (name, brand_id) SELECT '301', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '301');
  INSERT INTO models (name, brand_id) SELECT '308', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '308');
  INSERT INTO models (name, brand_id) SELECT '408', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '408');
  INSERT INTO models (name, brand_id) SELECT '508', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '508');
  INSERT INTO models (name, brand_id) SELECT '4008', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '4008');
END $$;

-- === Renault ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Renault'
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'renault');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'renault';

  -- Kwid
  INSERT INTO models (name, brand_id) SELECT 'Kwid', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kwid');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kwid';
  INSERT INTO versions (name, model_id) SELECT 'Life 1.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'life 1.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'Zen 1.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'zen 1.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'Intens 1.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'intens 1.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'Outsider 1.0 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'outsider 1.0 mt');
  INSERT INTO versions (name, model_id) SELECT 'E-Tech Electric', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-tech electric');

  -- Logan / Stepway
  INSERT INTO models (name, brand_id) SELECT 'Logan', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'logan');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'logan';
  INSERT INTO versions (name, model_id) SELECT 'Life 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'life 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'Zen 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'zen 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'Intens 1.6 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'intens 1.6 cvt');

  INSERT INTO models (name, brand_id) SELECT 'Stepway', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'stepway');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'stepway';
  INSERT INTO versions (name, model_id) SELECT 'Life 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'life 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'Zen 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'zen 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'Intens 1.6 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'intens 1.6 cvt');

  -- Duster
  INSERT INTO models (name, brand_id) SELECT 'Duster', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'duster');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'duster';
  INSERT INTO versions (name, model_id) SELECT 'Life 1.6 4x2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'life 1.6 4x2 mt');
  INSERT INTO versions (name, model_id) SELECT 'Zen 1.6 4x2 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'zen 1.6 4x2 mt');
  INSERT INTO versions (name, model_id) SELECT 'Intens 1.3T CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'intens 1.3t cvt');
  INSERT INTO versions (name, model_id) SELECT 'Iconic 1.3T 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'iconic 1.3t 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Outsider 1.3T 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'outsider 1.3t 4x4');

  -- Captur
  INSERT INTO models (name, brand_id) SELECT 'Captur', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'captur');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'captur';
  INSERT INTO versions (name, model_id) SELECT 'Life 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'life 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'Zen 1.6 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'zen 1.6 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Intens 1.3T EDC', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'intens 1.3t edc');

  -- Koleos
  INSERT INTO models (name, brand_id) SELECT 'Koleos', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'koleos');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'koleos';
  INSERT INTO versions (name, model_id) SELECT 'Zen 2.5 4x2 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'zen 2.5 4x2 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Intens 2.5 4x4 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'intens 2.5 4x4 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Iconic 2.5 4x4 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'iconic 2.5 4x4 cvt');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Sandero', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sandero');
  INSERT INTO models (name, brand_id) SELECT 'Clio', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clio');
  INSERT INTO models (name, brand_id) SELECT 'Megane', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'megane');
  INSERT INTO models (name, brand_id) SELECT 'Fluence', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fluence');
  INSERT INTO models (name, brand_id) SELECT 'Symbol', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'symbol');
  INSERT INTO models (name, brand_id) SELECT 'Kangoo', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kangoo');
  INSERT INTO models (name, brand_id) SELECT 'Trafic', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'trafic');
  INSERT INTO models (name, brand_id) SELECT 'Master', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'master');
  INSERT INTO models (name, brand_id) SELECT 'Alaskan', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'alaskan');
  INSERT INTO models (name, brand_id) SELECT 'Oroch', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'oroch');
  INSERT INTO models (name, brand_id) SELECT 'Arkana', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'arkana');
  INSERT INTO models (name, brand_id) SELECT 'Kardian', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kardian');
  INSERT INTO models (name, brand_id) SELECT 'Megane E-Tech', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'megane e-tech');
END $$;

-- === Citroen ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Citroen'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'citroen');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'citroen';

  -- C3
  INSERT INTO models (name, brand_id) SELECT 'C3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c3';
  INSERT INTO versions (name, model_id) SELECT 'Live 1.2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'live 1.2');
  INSERT INTO versions (name, model_id) SELECT 'Feel 1.2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'feel 1.2');
  INSERT INTO versions (name, model_id) SELECT 'Shine 1.2 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'shine 1.2 turbo');
  INSERT INTO versions (name, model_id) SELECT 'Max 1.2 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'max 1.2 turbo');
  INSERT INTO versions (name, model_id) SELECT 'You 1.2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'you 1.2');

  -- C3 Aircross
  INSERT INTO models (name, brand_id) SELECT 'C3 Aircross', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c3 aircross');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c3 aircross';
  INSERT INTO versions (name, model_id) SELECT 'Feel 1.2 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'feel 1.2 turbo');
  INSERT INTO versions (name, model_id) SELECT 'Shine 1.2 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'shine 1.2 turbo');
  INSERT INTO versions (name, model_id) SELECT 'Max 1.2 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'max 1.2 turbo');

  -- C4 Cactus
  INSERT INTO models (name, brand_id) SELECT 'C4 Cactus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c4 cactus');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c4 cactus';
  INSERT INTO versions (name, model_id) SELECT 'Feel 1.6 THP', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'feel 1.6 thp');
  INSERT INTO versions (name, model_id) SELECT 'Shine 1.6 THP', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'shine 1.6 thp');

  -- C4
  INSERT INTO models (name, brand_id) SELECT 'C4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c4');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c4';
  INSERT INTO versions (name, model_id) SELECT 'Feel 1.6 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'feel 1.6 turbo');
  INSERT INTO versions (name, model_id) SELECT 'Shine 1.6 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'shine 1.6 turbo');

  -- Berlingo
  INSERT INTO models (name, brand_id) SELECT 'Berlingo', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'berlingo');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'berlingo';
  INSERT INTO versions (name, model_id) SELECT 'Feel 1.6 HDi', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'feel 1.6 hdi');
  INSERT INTO versions (name, model_id) SELECT 'Live 1.6 HDi', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'live 1.6 hdi');
  INSERT INTO versions (name, model_id) SELECT 'Multispace 1.6 HDi', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'multispace 1.6 hdi');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'C5 Aircross', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c5 aircross');
  INSERT INTO models (name, brand_id) SELECT 'C5 X', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c5 x');
  INSERT INTO models (name, brand_id) SELECT 'Jumpy', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jumpy');
  INSERT INTO models (name, brand_id) SELECT 'Jumper', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jumper');
  INSERT INTO models (name, brand_id) SELECT 'SpaceTourer', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'spacetourer');
  INSERT INTO models (name, brand_id) SELECT 'e-C3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e-c3');
  INSERT INTO models (name, brand_id) SELECT 'Basalt', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'basalt');
END $$;

-- === Honda ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Honda'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'honda');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'honda';

  -- City
  INSERT INTO models (name, brand_id) SELECT 'City', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'city');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'city';
  INSERT INTO versions (name, model_id) SELECT 'LX 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'EX 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'EXL 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'exl 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Touring 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'touring 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Hatchback RS 1.5', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hatchback rs 1.5');

  -- Civic
  INSERT INTO models (name, brand_id) SELECT 'Civic', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'civic');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'civic';
  INSERT INTO versions (name, model_id) SELECT 'LX 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'EX 2.0 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 2.0 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Sport 1.5 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport 1.5 turbo');
  INSERT INTO versions (name, model_id) SELECT 'Touring 1.5 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'touring 1.5 turbo');
  INSERT INTO versions (name, model_id) SELECT 'Si 1.5 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'si 1.5 turbo');
  INSERT INTO versions (name, model_id) SELECT 'Type R 2.0 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'type r 2.0 turbo');
  INSERT INTO versions (name, model_id) SELECT 'e:HEV Sport Touring', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e:hev sport touring');

  -- Fit
  INSERT INTO models (name, brand_id) SELECT 'Fit', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fit');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fit';
  INSERT INTO versions (name, model_id) SELECT 'LX 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'EX 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'EXL 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'exl 1.5 cvt');

  -- HR-V
  INSERT INTO models (name, brand_id) SELECT 'HR-V', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hr-v');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hr-v';
  INSERT INTO versions (name, model_id) SELECT 'LX 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'EX 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'EXL 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'exl 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Touring 1.5 Turbo CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'touring 1.5 turbo cvt');
  INSERT INTO versions (name, model_id) SELECT 'e:HEV Advance', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e:hev advance');

  -- CR-V
  INSERT INTO models (name, brand_id) SELECT 'CR-V', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cr-v');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cr-v';
  INSERT INTO versions (name, model_id) SELECT 'LX 2.4 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lx 2.4 cvt');
  INSERT INTO versions (name, model_id) SELECT 'EX 1.5 Turbo CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ex 1.5 turbo cvt');
  INSERT INTO versions (name, model_id) SELECT 'EXL 1.5 Turbo CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'exl 1.5 turbo cvt');
  INSERT INTO versions (name, model_id) SELECT 'Touring 1.5 Turbo CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'touring 1.5 turbo cvt');
  INSERT INTO versions (name, model_id) SELECT 'e:HEV Sport Touring', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e:hev sport touring');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Accord', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'accord');
  INSERT INTO models (name, brand_id) SELECT 'Pilot', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pilot');
  INSERT INTO models (name, brand_id) SELECT 'Passport', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'passport');
  INSERT INTO models (name, brand_id) SELECT 'Ridgeline', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ridgeline');
  INSERT INTO models (name, brand_id) SELECT 'Odyssey', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'odyssey');
  INSERT INTO models (name, brand_id) SELECT 'BR-V', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'br-v');
  INSERT INTO models (name, brand_id) SELECT 'WR-V', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wr-v');
  INSERT INTO models (name, brand_id) SELECT 'Elevate', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'elevate');
  INSERT INTO models (name, brand_id) SELECT 'e:NP1', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e:np1');
END $$;

-- === Volkswagen ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Volkswagen'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'volkswagen');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'volkswagen';

  -- Polo
  INSERT INTO models (name, brand_id) SELECT 'Polo', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'polo');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'polo';
  INSERT INTO versions (name, model_id) SELECT 'Trendline 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trendline 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'Comfortline 1.6 MSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfortline 1.6 msi');
  INSERT INTO versions (name, model_id) SELECT 'Highline 1.6 MSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'highline 1.6 msi');
  INSERT INTO versions (name, model_id) SELECT 'GTS 1.4 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gts 1.4 tsi');
  INSERT INTO versions (name, model_id) SELECT 'GTI 2.0 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gti 2.0 tsi');

  -- Virtus
  INSERT INTO models (name, brand_id) SELECT 'Virtus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'virtus');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'virtus';
  INSERT INTO versions (name, model_id) SELECT 'Trendline 1.6 MSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trendline 1.6 msi');
  INSERT INTO versions (name, model_id) SELECT 'Comfortline 1.6 MSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfortline 1.6 msi');
  INSERT INTO versions (name, model_id) SELECT 'Highline 1.6 MSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'highline 1.6 msi');
  INSERT INTO versions (name, model_id) SELECT 'GTS 1.4 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gts 1.4 tsi');

  -- Gol
  INSERT INTO models (name, brand_id) SELECT 'Gol', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gol');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gol';
  INSERT INTO versions (name, model_id) SELECT 'Trend 1.6 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trend 1.6 mt');
  INSERT INTO versions (name, model_id) SELECT 'Comfortline 1.6', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfortline 1.6');

  -- Voyage
  INSERT INTO models (name, brand_id) SELECT 'Voyage', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'voyage');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'voyage';
  INSERT INTO versions (name, model_id) SELECT 'Trendline 1.6', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trendline 1.6');
  INSERT INTO versions (name, model_id) SELECT 'Comfortline 1.6', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfortline 1.6');

  -- T-Cross
  INSERT INTO models (name, brand_id) SELECT 'T-Cross', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't-cross');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't-cross';
  INSERT INTO versions (name, model_id) SELECT 'Trendline 1.6 MSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trendline 1.6 msi');
  INSERT INTO versions (name, model_id) SELECT 'Comfortline 1.6 MSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfortline 1.6 msi');
  INSERT INTO versions (name, model_id) SELECT 'Highline 1.4 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'highline 1.4 tsi');

  -- Taos
  INSERT INTO models (name, brand_id) SELECT 'Taos', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'taos');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'taos';
  INSERT INTO versions (name, model_id) SELECT 'Comfortline 1.4 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfortline 1.4 tsi');
  INSERT INTO versions (name, model_id) SELECT 'Highline 1.4 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'highline 1.4 tsi');
  INSERT INTO versions (name, model_id) SELECT 'Highline 4Motion 1.4 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'highline 4motion 1.4 tsi');

  -- Tiguan
  INSERT INTO models (name, brand_id) SELECT 'Tiguan', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiguan');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiguan';
  INSERT INTO versions (name, model_id) SELECT 'Comfortline 1.4 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfortline 1.4 tsi');
  INSERT INTO versions (name, model_id) SELECT 'Highline 2.0 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'highline 2.0 tsi');
  INSERT INTO versions (name, model_id) SELECT 'Allspace 2.0 TDI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allspace 2.0 tdi');
  INSERT INTO versions (name, model_id) SELECT 'R-Line 2.0 TSI 4Motion', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-line 2.0 tsi 4motion');

  -- Amarok
  INSERT INTO models (name, brand_id) SELECT 'Amarok', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'amarok');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'amarok';
  INSERT INTO versions (name, model_id) SELECT 'Trendline 2.0 TDI 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trendline 2.0 tdi 4x2');
  INSERT INTO versions (name, model_id) SELECT 'Comfortline 2.0 TDI 4Motion', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfortline 2.0 tdi 4motion');
  INSERT INTO versions (name, model_id) SELECT 'Highline 3.0 V6 TDI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'highline 3.0 v6 tdi');
  INSERT INTO versions (name, model_id) SELECT 'Extreme V6 3.0 TDI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'extreme v6 3.0 tdi');
  INSERT INTO versions (name, model_id) SELECT 'PanAmericana V6 3.0 TDI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'panamericana v6 3.0 tdi');
  INSERT INTO versions (name, model_id) SELECT 'Aventura V6 3.0 TDI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'aventura v6 3.0 tdi');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Golf', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'golf');
  INSERT INTO models (name, brand_id) SELECT 'Jetta', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jetta');
  INSERT INTO models (name, brand_id) SELECT 'Passat', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'passat');
  INSERT INTO models (name, brand_id) SELECT 'Saveiro', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'saveiro');
  INSERT INTO models (name, brand_id) SELECT 'Nivus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nivus');
  INSERT INTO models (name, brand_id) SELECT 'Teramont', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'teramont');
  INSERT INTO models (name, brand_id) SELECT 'Touareg', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'touareg');
  INSERT INTO models (name, brand_id) SELECT 'Transporter T6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'transporter t6');
  INSERT INTO models (name, brand_id) SELECT 'Caddy', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'caddy');
  INSERT INTO models (name, brand_id) SELECT 'Crafter', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'crafter');
  INSERT INTO models (name, brand_id) SELECT 'ID.4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'id.4');
  INSERT INTO models (name, brand_id) SELECT 'ID.3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'id.3');
  INSERT INTO models (name, brand_id) SELECT 'ID.5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'id.5');
  INSERT INTO models (name, brand_id) SELECT 'ID.7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'id.7');
  INSERT INTO models (name, brand_id) SELECT 'ID. Buzz', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'id. buzz');
END $$;

-- === MG ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'MG'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'mg');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mg';

  -- MG3
  INSERT INTO models (name, brand_id) SELECT 'MG3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg3';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Hybrid+', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hybrid+');

  -- MG5
  INSERT INTO models (name, brand_id) SELECT 'MG5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg5';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5 cvt');

  -- ZS
  INSERT INTO models (name, brand_id) SELECT 'ZS', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'zs');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'zs';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'Deluxe 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'deluxe 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Turbo 1.3 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo 1.3 at');

  -- ZS EV
  INSERT INTO models (name, brand_id) SELECT 'ZS EV', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'zs ev');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'zs ev';
  INSERT INTO versions (name, model_id) SELECT 'Standard Range', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'standard range');
  INSERT INTO versions (name, model_id) SELECT 'Long Range', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range');

  -- HS
  INSERT INTO models (name, brand_id) SELECT 'HS', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hs');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hs';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5 turbo');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5 turbo');
  INSERT INTO versions (name, model_id) SELECT 'Trophy 2.0 Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trophy 2.0 turbo');
  INSERT INTO versions (name, model_id) SELECT 'PHEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'phev');

  -- RX5
  INSERT INTO models (name, brand_id) SELECT 'RX5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rx5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rx5';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'MG6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg6');
  INSERT INTO models (name, brand_id) SELECT 'MG7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg7');
  INSERT INTO models (name, brand_id) SELECT 'MG4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mg4');
  INSERT INTO models (name, brand_id) SELECT 'Cyberster', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cyberster');
  INSERT INTO models (name, brand_id) SELECT 'Marvel R', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'marvel r');
  INSERT INTO models (name, brand_id) SELECT 'Extender', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'extender');
  INSERT INTO models (name, brand_id) SELECT 'Gloster', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gloster');
END $$;

-- === GWM / Haval ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'GWM'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'gwm');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'gwm';

  -- Poer / Pickup
  INSERT INTO models (name, brand_id) SELECT 'Poer', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'poer');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'poer';
  INSERT INTO versions (name, model_id) SELECT 'Work 2.0 TD 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'work 2.0 td 4x2');
  INSERT INTO versions (name, model_id) SELECT 'Comfort 2.0 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 2.0 td 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 2.0 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 2.0 td 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Premium 2.0 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'premium 2.0 td 4x4');

  -- Tank 300
  INSERT INTO models (name, brand_id) SELECT 'Tank 300', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tank 300');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tank 300';
  INSERT INTO versions (name, model_id) SELECT '2.0T AT 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.0t at 4x4');
  INSERT INTO versions (name, model_id) SELECT 'HEV 2.0T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hev 2.0t');

  -- Tank 500
  INSERT INTO models (name, brand_id) SELECT 'Tank 500', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tank 500');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tank 500';
  INSERT INTO versions (name, model_id) SELECT '3.0T V6 HEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '3.0t v6 hev');

  -- Ora
  INSERT INTO models (name, brand_id) SELECT 'Ora 03', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ora 03');
  INSERT INTO models (name, brand_id) SELECT 'Ora Good Cat', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ora good cat');
END $$;

-- === Haval ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Haval'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'haval');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'haval';

  -- H6
  INSERT INTO models (name, brand_id) SELECT 'H6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h6');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h6';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'Supreme 2.0T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'supreme 2.0t');
  INSERT INTO versions (name, model_id) SELECT 'HEV 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hev 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'GT Coupe 2.0T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt coupe 2.0t');

  -- Jolion
  INSERT INTO models (name, brand_id) SELECT 'Jolion', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jolion');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'jolion';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'HEV 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hev 1.5t');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'H2', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h2');
  INSERT INTO models (name, brand_id) SELECT 'H9', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'h9');
  INSERT INTO models (name, brand_id) SELECT 'Dargo', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dargo');
END $$;

-- === Chery ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Chery'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'chery');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'chery';

  -- Tiggo 2
  INSERT INTO models (name, brand_id) SELECT 'Tiggo 2', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiggo 2');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiggo 2';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Pro Luxury 1.5', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'pro luxury 1.5');

  -- Tiggo 4
  INSERT INTO models (name, brand_id) SELECT 'Tiggo 4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiggo 4');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiggo 4';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5 MT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5 mt');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Pro 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'pro 1.5t');

  -- Tiggo 7 Pro
  INSERT INTO models (name, brand_id) SELECT 'Tiggo 7 Pro', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiggo 7 pro');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiggo 7 pro';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'Max 1.6T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'max 1.6t');

  -- Tiggo 8 Pro
  INSERT INTO models (name, brand_id) SELECT 'Tiggo 8 Pro', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiggo 8 pro');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiggo 8 pro';
  INSERT INTO versions (name, model_id) SELECT 'Luxury 2.0T 7 seats', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 2.0t 7 seats');
  INSERT INTO versions (name, model_id) SELECT 'Max 2.0T 7 seats', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'max 2.0t 7 seats');
  INSERT INTO versions (name, model_id) SELECT 'PHEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'phev');

  -- Arrizo 5
  INSERT INTO models (name, brand_id) SELECT 'Arrizo 5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'arrizo 5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'arrizo 5';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5 cvt');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Tiggo 9', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tiggo 9');
  INSERT INTO models (name, brand_id) SELECT 'Arrizo 8', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'arrizo 8');
  INSERT INTO models (name, brand_id) SELECT 'Arrizo 6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'arrizo 6');
  INSERT INTO models (name, brand_id) SELECT 'QQ Ice Cream', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'qq ice cream');
  INSERT INTO models (name, brand_id) SELECT 'eQ1', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eq1');
  INSERT INTO models (name, brand_id) SELECT 'Omoda 5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'omoda 5');
END $$;

-- === BYD ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'BYD'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'byd');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'byd';

  -- Dolphin
  INSERT INTO models (name, brand_id) SELECT 'Dolphin', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dolphin');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dolphin';
  INSERT INTO versions (name, model_id) SELECT 'Active', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'active');
  INSERT INTO versions (name, model_id) SELECT 'Free', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'free');
  INSERT INTO versions (name, model_id) SELECT 'Boost', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'boost');
  INSERT INTO versions (name, model_id) SELECT 'Mini', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'mini');

  -- Yuan Plus / Atto 3
  INSERT INTO models (name, brand_id) SELECT 'Yuan Plus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'yuan plus');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'yuan plus';
  INSERT INTO versions (name, model_id) SELECT 'Standard Range', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'standard range');
  INSERT INTO versions (name, model_id) SELECT 'Extended Range', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'extended range');

  -- Song Plus
  INSERT INTO models (name, brand_id) SELECT 'Song Plus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'song plus');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'song plus';
  INSERT INTO versions (name, model_id) SELECT 'DM-i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dm-i');
  INSERT INTO versions (name, model_id) SELECT 'EV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ev');
  INSERT INTO versions (name, model_id) SELECT 'Champion', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'champion');

  -- Seal
  INSERT INTO models (name, brand_id) SELECT 'Seal', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'seal');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'seal';
  INSERT INTO versions (name, model_id) SELECT 'Dynamic', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dynamic');
  INSERT INTO versions (name, model_id) SELECT 'Premium', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'premium');
  INSERT INTO versions (name, model_id) SELECT 'Performance AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'performance awd');

  -- Han
  INSERT INTO models (name, brand_id) SELECT 'Han', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'han');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'han';
  INSERT INTO versions (name, model_id) SELECT 'EV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ev');
  INSERT INTO versions (name, model_id) SELECT 'DM-i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dm-i');

  -- Shark
  INSERT INTO models (name, brand_id) SELECT 'Shark', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'shark');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'shark';
  INSERT INTO versions (name, model_id) SELECT 'GL', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gl');
  INSERT INTO versions (name, model_id) SELECT 'GS Premium', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gs premium');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Seagull', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'seagull');
  INSERT INTO models (name, brand_id) SELECT 'Song Pro', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'song pro');
  INSERT INTO models (name, brand_id) SELECT 'Tang', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tang');
  INSERT INTO models (name, brand_id) SELECT 'Seal U', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'seal u');
  INSERT INTO models (name, brand_id) SELECT 'Sealion 6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sealion 6');
  INSERT INTO models (name, brand_id) SELECT 'Sealion 7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sealion 7');
  INSERT INTO models (name, brand_id) SELECT 'F3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'f3');
  INSERT INTO models (name, brand_id) SELECT 'e2', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e2');
  INSERT INTO models (name, brand_id) SELECT 'e5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e5');
  INSERT INTO models (name, brand_id) SELECT 'D1', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd1');
END $$;

-- === JAC ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'JAC'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'jac');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'jac';

  -- T6
  INSERT INTO models (name, brand_id) SELECT 'T6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't6');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't6';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 2.0 TD 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 2.0 td 4x2');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 2.0 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 2.0 td 4x4');

  -- T8
  INSERT INTO models (name, brand_id) SELECT 'T8', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't8');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't8';
  INSERT INTO versions (name, model_id) SELECT 'Luxury 2.0 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 2.0 td 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Pro 2.0 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'pro 2.0 td 4x4');

  -- T9
  INSERT INTO models (name, brand_id) SELECT 'T9', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't9');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't9';
  INSERT INTO versions (name, model_id) SELECT '2.0 TD 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.0 td 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Hunter PHEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hunter phev');

  -- S3
  INSERT INTO models (name, brand_id) SELECT 'S3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's3';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5 cvt');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5 cvt');

  -- S4
  INSERT INTO models (name, brand_id) SELECT 'S4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's4');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's4';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'S2', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's2');
  INSERT INTO models (name, brand_id) SELECT 'S7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's7');
  INSERT INTO models (name, brand_id) SELECT 'E-JS1', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e-js1');
  INSERT INTO models (name, brand_id) SELECT 'E-JS4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e-js4');
  INSERT INTO models (name, brand_id) SELECT 'J3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'j3');
  INSERT INTO models (name, brand_id) SELECT 'J4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'j4');
  INSERT INTO models (name, brand_id) SELECT 'J6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'j6');
  INSERT INTO models (name, brand_id) SELECT 'Sunray', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sunray');
  INSERT INTO models (name, brand_id) SELECT 'iEV7S', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'iev7s');
END $$;

-- === Changan ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Changan'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'changan');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'changan';

  -- CS35 Plus
  INSERT INTO models (name, brand_id) SELECT 'CS35 Plus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cs35 plus');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cs35 plus';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.6', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.6');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.4T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.4t');

  -- CS55 Plus
  INSERT INTO models (name, brand_id) SELECT 'CS55 Plus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cs55 plus');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cs55 plus';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t');

  -- CS75 Plus
  INSERT INTO models (name, brand_id) SELECT 'CS75 Plus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cs75 plus');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cs75 plus';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 2.0T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 2.0t');

  -- Hunter
  INSERT INTO models (name, brand_id) SELECT 'Hunter', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hunter');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'hunter';
  INSERT INTO versions (name, model_id) SELECT '2.0T 4x2 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.0t 4x2 at');
  INSERT INTO versions (name, model_id) SELECT '2.0T 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.0t 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'Plus 2.0T 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'plus 2.0t 4x4');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Eado', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eado');
  INSERT INTO models (name, brand_id) SELECT 'Alsvin', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'alsvin');
  INSERT INTO models (name, brand_id) SELECT 'CS15', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cs15');
  INSERT INTO models (name, brand_id) SELECT 'CS85 Coupe', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cs85 coupe');
  INSERT INTO models (name, brand_id) SELECT 'CS95', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cs95');
  INSERT INTO models (name, brand_id) SELECT 'Lumin', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lumin');
  INSERT INTO models (name, brand_id) SELECT 'Uni-T', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'uni-t');
  INSERT INTO models (name, brand_id) SELECT 'Uni-K', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'uni-k');
  INSERT INTO models (name, brand_id) SELECT 'Uni-V', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'uni-v');
  INSERT INTO models (name, brand_id) SELECT 'Star Truck', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'star truck');
END $$;

-- === Maxus ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Maxus'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'maxus');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'maxus';

  -- T60
  INSERT INTO models (name, brand_id) SELECT 'T60', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't60');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't60';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 2.8 TD 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 2.8 td 4x2');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 2.8 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 2.8 td 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Elite 2.0 BiTurbo 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'elite 2.0 biturbo 4x4');

  -- T90
  INSERT INTO models (name, brand_id) SELECT 'T90', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't90');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't90';
  INSERT INTO versions (name, model_id) SELECT '2.0 BiTurbo 4x4 AT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.0 biturbo 4x4 at');
  INSERT INTO versions (name, model_id) SELECT 'EV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ev');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'D60', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd60');
  INSERT INTO models (name, brand_id) SELECT 'D90', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd90');
  INSERT INTO models (name, brand_id) SELECT 'G10', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'g10');
  INSERT INTO models (name, brand_id) SELECT 'G50', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'g50');
  INSERT INTO models (name, brand_id) SELECT 'V80', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v80');
  INSERT INTO models (name, brand_id) SELECT 'eDeliver 3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'edeliver 3');
  INSERT INTO models (name, brand_id) SELECT 'eDeliver 9', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'edeliver 9');
END $$;

-- === Subaru ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Subaru'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'subaru');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'subaru';

  -- XV / Crosstrek
  INSERT INTO models (name, brand_id) SELECT 'XV', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xv');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xv';
  INSERT INTO versions (name, model_id) SELECT '2.0i AWD CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.0i awd cvt');
  INSERT INTO versions (name, model_id) SELECT '2.0i-S AWD CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.0i-s awd cvt');
  INSERT INTO versions (name, model_id) SELECT 'Limited AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited awd');
  INSERT INTO versions (name, model_id) SELECT 'e-Boxer Hybrid', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-boxer hybrid');

  -- Crosstrek
  INSERT INTO models (name, brand_id) SELECT 'Crosstrek', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'crosstrek');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'crosstrek';
  INSERT INTO versions (name, model_id) SELECT 'Sport 2.0', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport 2.0');
  INSERT INTO versions (name, model_id) SELECT 'Limited 2.0', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 2.0');
  INSERT INTO versions (name, model_id) SELECT 'Wilderness', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wilderness');

  -- Forester
  INSERT INTO models (name, brand_id) SELECT 'Forester', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'forester');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'forester';
  INSERT INTO versions (name, model_id) SELECT '2.0i AWD CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.0i awd cvt');
  INSERT INTO versions (name, model_id) SELECT '2.5i Sport', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.5i sport');
  INSERT INTO versions (name, model_id) SELECT '2.5i Limited', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.5i limited');
  INSERT INTO versions (name, model_id) SELECT '2.5i Touring', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.5i touring');
  INSERT INTO versions (name, model_id) SELECT 'Wilderness', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wilderness');
  INSERT INTO versions (name, model_id) SELECT 'e-Boxer Hybrid', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-boxer hybrid');

  -- Outback
  INSERT INTO models (name, brand_id) SELECT 'Outback', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'outback');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'outback';
  INSERT INTO versions (name, model_id) SELECT '2.5i Premium', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.5i premium');
  INSERT INTO versions (name, model_id) SELECT '2.5i Limited', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.5i limited');
  INSERT INTO versions (name, model_id) SELECT '2.5i Touring', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '2.5i touring');
  INSERT INTO versions (name, model_id) SELECT 'XT Touring', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xt touring');
  INSERT INTO versions (name, model_id) SELECT 'Wilderness', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'wilderness');

  -- WRX
  INSERT INTO models (name, brand_id) SELECT 'WRX', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wrx');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wrx';
  INSERT INTO versions (name, model_id) SELECT 'Premium', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'premium');
  INSERT INTO versions (name, model_id) SELECT 'Limited', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited');
  INSERT INTO versions (name, model_id) SELECT 'GT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt');
  INSERT INTO versions (name, model_id) SELECT 'tS', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ts');
  INSERT INTO versions (name, model_id) SELECT 'STI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sti');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Impreza', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'impreza');
  INSERT INTO models (name, brand_id) SELECT 'Legacy', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'legacy');
  INSERT INTO models (name, brand_id) SELECT 'BRZ', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'brz');
  INSERT INTO models (name, brand_id) SELECT 'Ascent', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ascent');
  INSERT INTO models (name, brand_id) SELECT 'Solterra', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'solterra');
  INSERT INTO models (name, brand_id) SELECT 'Levorg', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'levorg');
END $$;

-- === Jeep ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Jeep'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'jeep');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'jeep';

  -- Renegade
  INSERT INTO models (name, brand_id) SELECT 'Renegade', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'renegade');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'renegade';
  INSERT INTO versions (name, model_id) SELECT 'Sport 1.8 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport 1.8 4x2');
  INSERT INTO versions (name, model_id) SELECT 'Longitude 1.3T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'longitude 1.3t');
  INSERT INTO versions (name, model_id) SELECT 'Limited 1.3T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 1.3t');
  INSERT INTO versions (name, model_id) SELECT 'Trailhawk 1.3T 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trailhawk 1.3t 4x4');
  INSERT INTO versions (name, model_id) SELECT '4xe PHEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '4xe phev');

  -- Compass
  INSERT INTO models (name, brand_id) SELECT 'Compass', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'compass');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'compass';
  INSERT INTO versions (name, model_id) SELECT 'Sport 1.3T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport 1.3t');
  INSERT INTO versions (name, model_id) SELECT 'Longitude 1.3T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'longitude 1.3t');
  INSERT INTO versions (name, model_id) SELECT 'Limited 1.3T 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited 1.3t 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Trailhawk 2.0 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trailhawk 2.0 td 4x4');
  INSERT INTO versions (name, model_id) SELECT 'S 1.3T 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's 1.3t 4x4');
  INSERT INTO versions (name, model_id) SELECT '4xe PHEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '4xe phev');

  -- Wrangler
  INSERT INTO models (name, brand_id) SELECT 'Wrangler', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wrangler');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wrangler';
  INSERT INTO versions (name, model_id) SELECT 'Sport', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport');
  INSERT INTO versions (name, model_id) SELECT 'Sahara', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sahara');
  INSERT INTO versions (name, model_id) SELECT 'Rubicon', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rubicon');
  INSERT INTO versions (name, model_id) SELECT 'Rubicon 392', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rubicon 392');
  INSERT INTO versions (name, model_id) SELECT 'Unlimited Sport', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'unlimited sport');
  INSERT INTO versions (name, model_id) SELECT 'Unlimited Sahara', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'unlimited sahara');
  INSERT INTO versions (name, model_id) SELECT 'Unlimited Rubicon', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'unlimited rubicon');
  INSERT INTO versions (name, model_id) SELECT '4xe Sahara', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '4xe sahara');
  INSERT INTO versions (name, model_id) SELECT '4xe Rubicon', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '4xe rubicon');

  -- Grand Cherokee
  INSERT INTO models (name, brand_id) SELECT 'Grand Cherokee', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand cherokee');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand cherokee';
  INSERT INTO versions (name, model_id) SELECT 'Laredo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'laredo');
  INSERT INTO versions (name, model_id) SELECT 'Limited', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited');
  INSERT INTO versions (name, model_id) SELECT 'Overland', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'overland');
  INSERT INTO versions (name, model_id) SELECT 'Summit', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'summit');
  INSERT INTO versions (name, model_id) SELECT 'Summit Reserve', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'summit reserve');
  INSERT INTO versions (name, model_id) SELECT 'Trailhawk', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trailhawk');
  INSERT INTO versions (name, model_id) SELECT 'SRT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'srt');
  INSERT INTO versions (name, model_id) SELECT 'Trackhawk', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trackhawk');
  INSERT INTO versions (name, model_id) SELECT '4xe', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '4xe');
  INSERT INTO versions (name, model_id) SELECT 'L Overland', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'l overland');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Cherokee', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cherokee');
  INSERT INTO models (name, brand_id) SELECT 'Gladiator', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gladiator');
  INSERT INTO models (name, brand_id) SELECT 'Wagoneer', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'wagoneer');
  INSERT INTO models (name, brand_id) SELECT 'Grand Wagoneer', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand wagoneer');
  INSERT INTO models (name, brand_id) SELECT 'Avenger', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'avenger');
  INSERT INTO models (name, brand_id) SELECT 'Commander', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'commander');
END $$;

-- === RAM ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'RAM'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'ram');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'ram';

  -- 1500
  INSERT INTO models (name, brand_id) SELECT '1500', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1500');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1500';
  INSERT INTO versions (name, model_id) SELECT 'Tradesman', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tradesman');
  INSERT INTO versions (name, model_id) SELECT 'Big Horn', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'big horn');
  INSERT INTO versions (name, model_id) SELECT 'Laramie', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'laramie');
  INSERT INTO versions (name, model_id) SELECT 'Rebel', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rebel');
  INSERT INTO versions (name, model_id) SELECT 'Limited', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited');
  INSERT INTO versions (name, model_id) SELECT 'TRX', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trx');
  INSERT INTO versions (name, model_id) SELECT 'Limited Longhorn', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'limited longhorn');

  -- 2500
  INSERT INTO models (name, brand_id) SELECT '2500', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2500');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '2500';
  INSERT INTO versions (name, model_id) SELECT 'Tradesman', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'tradesman');
  INSERT INTO versions (name, model_id) SELECT 'Laramie', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'laramie');
  INSERT INTO versions (name, model_id) SELECT 'Power Wagon', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'power wagon');

  -- Rampage
  INSERT INTO models (name, brand_id) SELECT 'Rampage', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rampage');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rampage';
  INSERT INTO versions (name, model_id) SELECT 'Big Horn', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'big horn');
  INSERT INTO versions (name, model_id) SELECT 'Laramie', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'laramie');
  INSERT INTO versions (name, model_id) SELECT 'Rebel', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rebel');
  INSERT INTO versions (name, model_id) SELECT 'R/T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r/t');

  -- Other
  INSERT INTO models (name, brand_id) SELECT '700', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '700');
  INSERT INTO models (name, brand_id) SELECT '1200', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '1200');
  INSERT INTO models (name, brand_id) SELECT 'ProMaster', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'promaster');
END $$;

-- === Fiat ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Fiat'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'fiat');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'fiat';

  -- Mobi
  INSERT INTO models (name, brand_id) SELECT 'Mobi', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mobi');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mobi';
  INSERT INTO versions (name, model_id) SELECT 'Easy 1.0', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'easy 1.0');
  INSERT INTO versions (name, model_id) SELECT 'Like 1.0', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'like 1.0');
  INSERT INTO versions (name, model_id) SELECT 'Trekking 1.0', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trekking 1.0');

  -- Argo
  INSERT INTO models (name, brand_id) SELECT 'Argo', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'argo');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'argo';
  INSERT INTO versions (name, model_id) SELECT 'Drive 1.3', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'drive 1.3');
  INSERT INTO versions (name, model_id) SELECT 'Trekking 1.3', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'trekking 1.3');
  INSERT INTO versions (name, model_id) SELECT 'HGT 1.8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hgt 1.8');

  -- Cronos
  INSERT INTO models (name, brand_id) SELECT 'Cronos', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cronos');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cronos';
  INSERT INTO versions (name, model_id) SELECT 'Drive 1.3', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'drive 1.3');
  INSERT INTO versions (name, model_id) SELECT 'Precision 1.8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'precision 1.8');

  -- Toro
  INSERT INTO models (name, brand_id) SELECT 'Toro', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'toro');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'toro';
  INSERT INTO versions (name, model_id) SELECT 'Freedom 1.8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'freedom 1.8');
  INSERT INTO versions (name, model_id) SELECT 'Volcano 2.0 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'volcano 2.0 td 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Ranch 2.0 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ranch 2.0 td 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Ultra 2.2 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ultra 2.2 td 4x4');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Strada', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'strada');
  INSERT INTO models (name, brand_id) SELECT 'Fiorino', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fiorino');
  INSERT INTO models (name, brand_id) SELECT 'Ducato', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ducato');
  INSERT INTO models (name, brand_id) SELECT 'Pulse', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'pulse');
  INSERT INTO models (name, brand_id) SELECT 'Fastback', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fastback');
  INSERT INTO models (name, brand_id) SELECT '500', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '500');
  INSERT INTO models (name, brand_id) SELECT '500X', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '500x');
  INSERT INTO models (name, brand_id) SELECT '500e', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '500e');
  INSERT INTO models (name, brand_id) SELECT 'Panda', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'panda');
  INSERT INTO models (name, brand_id) SELECT 'Tipo', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tipo');
  INSERT INTO models (name, brand_id) SELECT 'Scudo', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'scudo');
  INSERT INTO models (name, brand_id) SELECT 'Titano', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'titano');
END $$;

-- === BMW ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'BMW'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'bmw');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'bmw';

  -- Serie 1
  INSERT INTO models (name, brand_id) SELECT 'Serie 1', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 1');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 1';
  INSERT INTO versions (name, model_id) SELECT '118i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '118i');
  INSERT INTO versions (name, model_id) SELECT '120i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '120i');
  INSERT INTO versions (name, model_id) SELECT '128ti', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '128ti');
  INSERT INTO versions (name, model_id) SELECT 'M135i xDrive', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm135i xdrive');

  -- Serie 2
  INSERT INTO models (name, brand_id) SELECT 'Serie 2', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 2');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 2';
  INSERT INTO versions (name, model_id) SELECT '220i Coupe', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '220i coupe');
  INSERT INTO versions (name, model_id) SELECT '220i Gran Coupe', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '220i gran coupe');
  INSERT INTO versions (name, model_id) SELECT 'M235i xDrive', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm235i xdrive');
  INSERT INTO versions (name, model_id) SELECT 'M240i xDrive', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm240i xdrive');
  INSERT INTO versions (name, model_id) SELECT 'Active Tourer 218i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'active tourer 218i');

  -- Serie 3
  INSERT INTO models (name, brand_id) SELECT 'Serie 3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 3';
  INSERT INTO versions (name, model_id) SELECT '318i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '318i');
  INSERT INTO versions (name, model_id) SELECT '320i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '320i');
  INSERT INTO versions (name, model_id) SELECT '330i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '330i');
  INSERT INTO versions (name, model_id) SELECT '330e', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '330e');
  INSERT INTO versions (name, model_id) SELECT 'M340i xDrive', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm340i xdrive');

  -- M3
  INSERT INTO models (name, brand_id) SELECT 'M3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm3';
  INSERT INTO versions (name, model_id) SELECT 'Competition', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'competition');
  INSERT INTO versions (name, model_id) SELECT 'Competition xDrive', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'competition xdrive');
  INSERT INTO versions (name, model_id) SELECT 'CS', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cs');

  -- Serie 5
  INSERT INTO models (name, brand_id) SELECT 'Serie 5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 5';
  INSERT INTO versions (name, model_id) SELECT '520i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '520i');
  INSERT INTO versions (name, model_id) SELECT '530i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '530i');
  INSERT INTO versions (name, model_id) SELECT '530e', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '530e');
  INSERT INTO versions (name, model_id) SELECT '540i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '540i');
  INSERT INTO versions (name, model_id) SELECT 'M550i xDrive', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm550i xdrive');

  -- M5
  INSERT INTO models (name, brand_id) SELECT 'M5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm5';
  INSERT INTO versions (name, model_id) SELECT 'Competition', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'competition');
  INSERT INTO versions (name, model_id) SELECT 'CS', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cs');

  -- X1
  INSERT INTO models (name, brand_id) SELECT 'X1', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x1');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x1';
  INSERT INTO versions (name, model_id) SELECT 'sDrive 18i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive 18i');
  INSERT INTO versions (name, model_id) SELECT 'sDrive 20i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sdrive 20i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive 25e', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive 25e');
  INSERT INTO versions (name, model_id) SELECT 'M35i xDrive', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm35i xdrive');

  -- X3
  INSERT INTO models (name, brand_id) SELECT 'X3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x3';
  INSERT INTO versions (name, model_id) SELECT 'xDrive 20i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive 20i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive 30i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive 30i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive 30e', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive 30e');
  INSERT INTO versions (name, model_id) SELECT 'M40i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm40i');
  INSERT INTO versions (name, model_id) SELECT 'M Competition', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm competition');

  -- X5
  INSERT INTO models (name, brand_id) SELECT 'X5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x5';
  INSERT INTO versions (name, model_id) SELECT 'xDrive 40i', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive 40i');
  INSERT INTO versions (name, model_id) SELECT 'xDrive 50e', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive 50e');
  INSERT INTO versions (name, model_id) SELECT 'xDrive 45e', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'xdrive 45e');
  INSERT INTO versions (name, model_id) SELECT 'M60i xDrive', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm60i xdrive');
  INSERT INTO versions (name, model_id) SELECT 'M Competition', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'm competition');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Serie 4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 4');
  INSERT INTO models (name, brand_id) SELECT 'Serie 6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 6');
  INSERT INTO models (name, brand_id) SELECT 'Serie 7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 7');
  INSERT INTO models (name, brand_id) SELECT 'Serie 8', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'serie 8');
  INSERT INTO models (name, brand_id) SELECT 'M2', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm2');
  INSERT INTO models (name, brand_id) SELECT 'M4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm4');
  INSERT INTO models (name, brand_id) SELECT 'M8', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm8');
  INSERT INTO models (name, brand_id) SELECT 'X2', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x2');
  INSERT INTO models (name, brand_id) SELECT 'X4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x4');
  INSERT INTO models (name, brand_id) SELECT 'X6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x6');
  INSERT INTO models (name, brand_id) SELECT 'X7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x7');
  INSERT INTO models (name, brand_id) SELECT 'XM', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xm');
  INSERT INTO models (name, brand_id) SELECT 'Z4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'z4');
  INSERT INTO models (name, brand_id) SELECT 'i3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i3');
  INSERT INTO models (name, brand_id) SELECT 'i4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i4');
  INSERT INTO models (name, brand_id) SELECT 'i5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i5');
  INSERT INTO models (name, brand_id) SELECT 'i7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'i7');
  INSERT INTO models (name, brand_id) SELECT 'iX', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ix');
  INSERT INTO models (name, brand_id) SELECT 'iX1', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ix1');
  INSERT INTO models (name, brand_id) SELECT 'iX3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ix3');
END $$;

-- === Audi ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Audi'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'audi');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'audi';

  -- A1
  INSERT INTO models (name, brand_id) SELECT 'A1', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a1');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a1';
  INSERT INTO versions (name, model_id) SELECT 'Sportback 30 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback 30 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Sportback 35 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback 35 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Sportback S line', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback s line');

  -- A3
  INSERT INTO models (name, brand_id) SELECT 'A3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a3';
  INSERT INTO versions (name, model_id) SELECT 'Sportback 30 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback 30 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Sportback 35 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback 35 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Sportback 40 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback 40 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Sedan 35 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sedan 35 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Sedan 40 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sedan 40 tfsi');

  -- S3
  INSERT INTO models (name, brand_id) SELECT 'S3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's3';
  INSERT INTO versions (name, model_id) SELECT 'Sportback 2.0 TFSI quattro', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback 2.0 tfsi quattro');
  INSERT INTO versions (name, model_id) SELECT 'Sedan 2.0 TFSI quattro', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sedan 2.0 tfsi quattro');

  -- RS3
  INSERT INTO models (name, brand_id) SELECT 'RS3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs3';
  INSERT INTO versions (name, model_id) SELECT 'Sportback 2.5 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback 2.5 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'Sedan 2.5 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sedan 2.5 tfsi');

  -- A4
  INSERT INTO models (name, brand_id) SELECT 'A4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a4');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a4';
  INSERT INTO versions (name, model_id) SELECT '30 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '30 tfsi');
  INSERT INTO versions (name, model_id) SELECT '35 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '35 tfsi');
  INSERT INTO versions (name, model_id) SELECT '40 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '40 tfsi');
  INSERT INTO versions (name, model_id) SELECT '45 TFSI quattro', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '45 tfsi quattro');
  INSERT INTO versions (name, model_id) SELECT 'Allroad 45 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'allroad 45 tfsi');

  -- Q3
  INSERT INTO models (name, brand_id) SELECT 'Q3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q3');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q3';
  INSERT INTO versions (name, model_id) SELECT '35 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '35 tfsi');
  INSERT INTO versions (name, model_id) SELECT '40 TFSI quattro', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '40 tfsi quattro');
  INSERT INTO versions (name, model_id) SELECT 'Sportback 40 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback 40 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'RS Q3', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs q3');

  -- Q5
  INSERT INTO models (name, brand_id) SELECT 'Q5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q5';
  INSERT INTO versions (name, model_id) SELECT '40 TDI quattro', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '40 tdi quattro');
  INSERT INTO versions (name, model_id) SELECT '45 TFSI quattro', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '45 tfsi quattro');
  INSERT INTO versions (name, model_id) SELECT '55 TFSI e quattro', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '55 tfsi e quattro');
  INSERT INTO versions (name, model_id) SELECT 'Sportback 45 TFSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportback 45 tfsi');
  INSERT INTO versions (name, model_id) SELECT 'SQ5', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sq5');

  -- Q7
  INSERT INTO models (name, brand_id) SELECT 'Q7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q7');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q7';
  INSERT INTO versions (name, model_id) SELECT '45 TDI quattro', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '45 tdi quattro');
  INSERT INTO versions (name, model_id) SELECT '55 TFSI quattro', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '55 tfsi quattro');
  INSERT INTO versions (name, model_id) SELECT 'SQ7', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sq7');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'A5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a5');
  INSERT INTO models (name, brand_id) SELECT 'A6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a6');
  INSERT INTO models (name, brand_id) SELECT 'A7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a7');
  INSERT INTO models (name, brand_id) SELECT 'A8', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'a8');
  INSERT INTO models (name, brand_id) SELECT 'S4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's4');
  INSERT INTO models (name, brand_id) SELECT 'S5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's5');
  INSERT INTO models (name, brand_id) SELECT 'S6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's6');
  INSERT INTO models (name, brand_id) SELECT 'S7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's7');
  INSERT INTO models (name, brand_id) SELECT 'RS4', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs4');
  INSERT INTO models (name, brand_id) SELECT 'RS5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs5');
  INSERT INTO models (name, brand_id) SELECT 'RS6', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs6');
  INSERT INTO models (name, brand_id) SELECT 'RS7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rs7');
  INSERT INTO models (name, brand_id) SELECT 'TT', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tt');
  INSERT INTO models (name, brand_id) SELECT 'R8', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'r8');
  INSERT INTO models (name, brand_id) SELECT 'Q2', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q2');
  INSERT INTO models (name, brand_id) SELECT 'Q4 e-tron', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q4 e-tron');
  INSERT INTO models (name, brand_id) SELECT 'Q6 e-tron', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q6 e-tron');
  INSERT INTO models (name, brand_id) SELECT 'Q8', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q8');
  INSERT INTO models (name, brand_id) SELECT 'Q8 e-tron', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'q8 e-tron');
  INSERT INTO models (name, brand_id) SELECT 'e-tron GT', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e-tron gt');
END $$;

-- === Mercedes-Benz ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Mercedes-Benz'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'mercedes-benz');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mercedes-benz';

  -- Clase A
  INSERT INTO models (name, brand_id) SELECT 'Clase A', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase a');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase a';
  INSERT INTO versions (name, model_id) SELECT 'A 180', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 180');
  INSERT INTO versions (name, model_id) SELECT 'A 200', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 200');
  INSERT INTO versions (name, model_id) SELECT 'A 250', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 250');
  INSERT INTO versions (name, model_id) SELECT 'A 35 AMG 4MATIC', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 35 amg 4matic');
  INSERT INTO versions (name, model_id) SELECT 'A 45 AMG S 4MATIC+', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'a 45 amg s 4matic+');

  -- Clase C
  INSERT INTO models (name, brand_id) SELECT 'Clase C', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase c');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase c';
  INSERT INTO versions (name, model_id) SELECT 'C 180', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 180');
  INSERT INTO versions (name, model_id) SELECT 'C 200', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 200');
  INSERT INTO versions (name, model_id) SELECT 'C 300', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 300');
  INSERT INTO versions (name, model_id) SELECT 'C 300e', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 300e');
  INSERT INTO versions (name, model_id) SELECT 'C 43 AMG 4MATIC', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 43 amg 4matic');
  INSERT INTO versions (name, model_id) SELECT 'C 63 AMG S E Performance', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'c 63 amg s e performance');

  -- Clase E
  INSERT INTO models (name, brand_id) SELECT 'Clase E', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase e');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase e';
  INSERT INTO versions (name, model_id) SELECT 'E 200', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 200');
  INSERT INTO versions (name, model_id) SELECT 'E 300', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 300');
  INSERT INTO versions (name, model_id) SELECT 'E 400e 4MATIC', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 400e 4matic');
  INSERT INTO versions (name, model_id) SELECT 'E 53 AMG 4MATIC+', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 53 amg 4matic+');
  INSERT INTO versions (name, model_id) SELECT 'E 63 AMG S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e 63 amg s');

  -- GLA
  INSERT INTO models (name, brand_id) SELECT 'GLA', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gla');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gla';
  INSERT INTO versions (name, model_id) SELECT 'GLA 200', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gla 200');
  INSERT INTO versions (name, model_id) SELECT 'GLA 250 4MATIC', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gla 250 4matic');
  INSERT INTO versions (name, model_id) SELECT 'GLA 35 AMG', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gla 35 amg');
  INSERT INTO versions (name, model_id) SELECT 'GLA 45 AMG S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gla 45 amg s');

  -- GLC
  INSERT INTO models (name, brand_id) SELECT 'GLC', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glc');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glc';
  INSERT INTO versions (name, model_id) SELECT 'GLC 200', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 200');
  INSERT INTO versions (name, model_id) SELECT 'GLC 300 4MATIC', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 300 4matic');
  INSERT INTO versions (name, model_id) SELECT 'GLC 300e 4MATIC', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 300e 4matic');
  INSERT INTO versions (name, model_id) SELECT 'GLC 43 AMG', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 43 amg');
  INSERT INTO versions (name, model_id) SELECT 'GLC 63 AMG S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc 63 amg s');
  INSERT INTO versions (name, model_id) SELECT 'GLC Coupe', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'glc coupe');

  -- GLE
  INSERT INTO models (name, brand_id) SELECT 'GLE', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gle');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gle';
  INSERT INTO versions (name, model_id) SELECT 'GLE 300d 4MATIC', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 300d 4matic');
  INSERT INTO versions (name, model_id) SELECT 'GLE 450 4MATIC', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 450 4matic');
  INSERT INTO versions (name, model_id) SELECT 'GLE 53 AMG', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 53 amg');
  INSERT INTO versions (name, model_id) SELECT 'GLE 63 AMG S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle 63 amg s');
  INSERT INTO versions (name, model_id) SELECT 'GLE Coupe', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gle coupe');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Clase B', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase b');
  INSERT INTO models (name, brand_id) SELECT 'Clase S', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clase s');
  INSERT INTO models (name, brand_id) SELECT 'CLA', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cla');
  INSERT INTO models (name, brand_id) SELECT 'CLS', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cls');
  INSERT INTO models (name, brand_id) SELECT 'GLB', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glb');
  INSERT INTO models (name, brand_id) SELECT 'GLS', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gls');
  INSERT INTO models (name, brand_id) SELECT 'G-Class', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'g-class');
  INSERT INTO models (name, brand_id) SELECT 'Maybach S-Class', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'maybach s-class');
  INSERT INTO models (name, brand_id) SELECT 'Maybach GLS', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'maybach gls');
  INSERT INTO models (name, brand_id) SELECT 'AMG GT', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'amg gt');
  INSERT INTO models (name, brand_id) SELECT 'SL', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sl');
  INSERT INTO models (name, brand_id) SELECT 'EQA', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eqa');
  INSERT INTO models (name, brand_id) SELECT 'EQB', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eqb');
  INSERT INTO models (name, brand_id) SELECT 'EQE', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eqe');
  INSERT INTO models (name, brand_id) SELECT 'EQE SUV', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eqe suv');
  INSERT INTO models (name, brand_id) SELECT 'EQS', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eqs');
  INSERT INTO models (name, brand_id) SELECT 'EQS SUV', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'eqs suv');
  INSERT INTO models (name, brand_id) SELECT 'Sprinter', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sprinter');
  INSERT INTO models (name, brand_id) SELECT 'Vito', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vito');
  INSERT INTO models (name, brand_id) SELECT 'V-Class', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v-class');
  INSERT INTO models (name, brand_id) SELECT 'X-Class', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x-class');
END $$;

-- === Volvo ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Volvo'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'volvo');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'volvo';

  -- XC40
  INSERT INTO models (name, brand_id) SELECT 'XC40', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xc40');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xc40';
  INSERT INTO versions (name, model_id) SELECT 'T3 Momentum', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't3 momentum');
  INSERT INTO versions (name, model_id) SELECT 'T4 Inscription', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't4 inscription');
  INSERT INTO versions (name, model_id) SELECT 'T5 R-Design AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't5 r-design awd');
  INSERT INTO versions (name, model_id) SELECT 'Recharge Plus', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'recharge plus');
  INSERT INTO versions (name, model_id) SELECT 'Recharge Ultimate', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'recharge ultimate');

  -- XC60
  INSERT INTO models (name, brand_id) SELECT 'XC60', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xc60');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xc60';
  INSERT INTO versions (name, model_id) SELECT 'B5 Momentum', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'b5 momentum');
  INSERT INTO versions (name, model_id) SELECT 'B5 Inscription AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'b5 inscription awd');
  INSERT INTO versions (name, model_id) SELECT 'T6 Recharge AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't6 recharge awd');
  INSERT INTO versions (name, model_id) SELECT 'T8 Recharge Polestar', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't8 recharge polestar');
  INSERT INTO versions (name, model_id) SELECT 'Recharge Ultimate', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'recharge ultimate');

  -- XC90
  INSERT INTO models (name, brand_id) SELECT 'XC90', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xc90');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'xc90';
  INSERT INTO versions (name, model_id) SELECT 'B5 Momentum', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'b5 momentum');
  INSERT INTO versions (name, model_id) SELECT 'B6 Inscription', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'b6 inscription');
  INSERT INTO versions (name, model_id) SELECT 'T8 Recharge Inscription', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 't8 recharge inscription');
  INSERT INTO versions (name, model_id) SELECT 'Recharge Ultimate', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'recharge ultimate');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'S60', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's60');
  INSERT INTO models (name, brand_id) SELECT 'S90', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's90');
  INSERT INTO models (name, brand_id) SELECT 'V60', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v60');
  INSERT INTO models (name, brand_id) SELECT 'V90', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v90');
  INSERT INTO models (name, brand_id) SELECT 'C40 Recharge', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c40 recharge');
  INSERT INTO models (name, brand_id) SELECT 'EX30', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ex30');
  INSERT INTO models (name, brand_id) SELECT 'EX90', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ex90');
END $$;

-- === Porsche ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Porsche'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'porsche');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'porsche';

  -- 911
  INSERT INTO models (name, brand_id) SELECT '911', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '911');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '911';
  INSERT INTO versions (name, model_id) SELECT 'Carrera', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera');
  INSERT INTO versions (name, model_id) SELECT 'Carrera S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera s');
  INSERT INTO versions (name, model_id) SELECT 'Carrera 4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera 4');
  INSERT INTO versions (name, model_id) SELECT 'Carrera 4S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera 4s');
  INSERT INTO versions (name, model_id) SELECT 'Carrera GTS', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera gts');
  INSERT INTO versions (name, model_id) SELECT 'Carrera 4 GTS', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'carrera 4 gts');
  INSERT INTO versions (name, model_id) SELECT 'Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo');
  INSERT INTO versions (name, model_id) SELECT 'Turbo S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo s');
  INSERT INTO versions (name, model_id) SELECT 'GT3', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt3');
  INSERT INTO versions (name, model_id) SELECT 'GT3 RS', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt3 rs');
  INSERT INTO versions (name, model_id) SELECT 'GT2 RS', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gt2 rs');
  INSERT INTO versions (name, model_id) SELECT 'Dakar', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dakar');
  INSERT INTO versions (name, model_id) SELECT 'S/T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's/t');

  -- Cayenne
  INSERT INTO models (name, brand_id) SELECT 'Cayenne', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cayenne');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cayenne';
  INSERT INTO versions (name, model_id) SELECT 'Base V6', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'base v6');
  INSERT INTO versions (name, model_id) SELECT 'E-Hybrid', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-hybrid');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'S E-Hybrid', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's e-hybrid');
  INSERT INTO versions (name, model_id) SELECT 'GTS', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gts');
  INSERT INTO versions (name, model_id) SELECT 'Turbo GT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo gt');
  INSERT INTO versions (name, model_id) SELECT 'Turbo E-Hybrid', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo e-hybrid');
  INSERT INTO versions (name, model_id) SELECT 'Coupe', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'coupe');

  -- Macan
  INSERT INTO models (name, brand_id) SELECT 'Macan', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'macan');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'macan';
  INSERT INTO versions (name, model_id) SELECT 'Base', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'base');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'GTS', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gts');
  INSERT INTO versions (name, model_id) SELECT 'Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo');
  INSERT INTO versions (name, model_id) SELECT 'Electric', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'electric');
  INSERT INTO versions (name, model_id) SELECT '4 Electric', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '4 electric');
  INSERT INTO versions (name, model_id) SELECT 'Turbo Electric', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo electric');

  -- Taycan
  INSERT INTO models (name, brand_id) SELECT 'Taycan', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'taycan');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'taycan';
  INSERT INTO versions (name, model_id) SELECT 'Base', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'base');
  INSERT INTO versions (name, model_id) SELECT '4S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '4s');
  INSERT INTO versions (name, model_id) SELECT 'GTS', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'gts');
  INSERT INTO versions (name, model_id) SELECT 'Turbo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo');
  INSERT INTO versions (name, model_id) SELECT 'Turbo S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo s');
  INSERT INTO versions (name, model_id) SELECT 'Turbo GT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'turbo gt');
  INSERT INTO versions (name, model_id) SELECT 'Cross Turismo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cross turismo');
  INSERT INTO versions (name, model_id) SELECT 'Sport Turismo', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport turismo');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Panamera', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'panamera');
  INSERT INTO models (name, brand_id) SELECT '718 Boxster', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '718 boxster');
  INSERT INTO models (name, brand_id) SELECT '718 Cayman', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '718 cayman');
END $$;

-- === Lexus ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Lexus'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'lexus');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'lexus';

  -- NX
  INSERT INTO models (name, brand_id) SELECT 'NX', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nx');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nx';
  INSERT INTO versions (name, model_id) SELECT '250', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '250');
  INSERT INTO versions (name, model_id) SELECT '350 F Sport', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '350 f sport');
  INSERT INTO versions (name, model_id) SELECT '350h', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '350h');
  INSERT INTO versions (name, model_id) SELECT '450h+ PHEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '450h+ phev');

  -- RX
  INSERT INTO models (name, brand_id) SELECT 'RX', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rx');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rx';
  INSERT INTO versions (name, model_id) SELECT '350', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '350');
  INSERT INTO versions (name, model_id) SELECT '350h', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '350h');
  INSERT INTO versions (name, model_id) SELECT '450h+ PHEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '450h+ phev');
  INSERT INTO versions (name, model_id) SELECT '500h F Sport', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '500h f sport');

  -- UX
  INSERT INTO models (name, brand_id) SELECT 'UX', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ux');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ux';
  INSERT INTO versions (name, model_id) SELECT '250h', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '250h');
  INSERT INTO versions (name, model_id) SELECT '300h F Sport', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '300h f sport');
  INSERT INTO versions (name, model_id) SELECT '300e Electric', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '300e electric');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'IS', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'is');
  INSERT INTO models (name, brand_id) SELECT 'ES', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'es');
  INSERT INTO models (name, brand_id) SELECT 'LS', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ls');
  INSERT INTO models (name, brand_id) SELECT 'LC', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lc');
  INSERT INTO models (name, brand_id) SELECT 'RC', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rc');
  INSERT INTO models (name, brand_id) SELECT 'LX', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lx');
  INSERT INTO models (name, brand_id) SELECT 'GX', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gx');
  INSERT INTO models (name, brand_id) SELECT 'TX', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tx');
  INSERT INTO models (name, brand_id) SELECT 'LM', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'lm');
  INSERT INTO models (name, brand_id) SELECT 'RZ', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rz');
END $$;

-- === Land Rover ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Land Rover'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'land rover');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'land rover';

  -- Defender
  INSERT INTO models (name, brand_id) SELECT 'Defender', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'defender');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'defender';
  INSERT INTO versions (name, model_id) SELECT '90 S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '90 s');
  INSERT INTO versions (name, model_id) SELECT '90 SE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '90 se');
  INSERT INTO versions (name, model_id) SELECT '90 HSE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '90 hse');
  INSERT INTO versions (name, model_id) SELECT '90 X', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '90 x');
  INSERT INTO versions (name, model_id) SELECT '110 S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '110 s');
  INSERT INTO versions (name, model_id) SELECT '110 SE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '110 se');
  INSERT INTO versions (name, model_id) SELECT '110 HSE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '110 hse');
  INSERT INTO versions (name, model_id) SELECT '110 X', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '110 x');
  INSERT INTO versions (name, model_id) SELECT '130 S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '130 s');
  INSERT INTO versions (name, model_id) SELECT '130 HSE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = '130 hse');
  INSERT INTO versions (name, model_id) SELECT 'V8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v8');
  INSERT INTO versions (name, model_id) SELECT 'V8 Carpathian', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v8 carpathian');
  INSERT INTO versions (name, model_id) SELECT 'Octa', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'octa');

  -- Discovery
  INSERT INTO models (name, brand_id) SELECT 'Discovery', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'discovery');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'discovery';
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'HSE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hse');
  INSERT INTO versions (name, model_id) SELECT 'Dynamic HSE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dynamic hse');
  INSERT INTO versions (name, model_id) SELECT 'Metropolitan Edition', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'metropolitan edition');

  -- Discovery Sport
  INSERT INTO models (name, brand_id) SELECT 'Discovery Sport', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'discovery sport');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'discovery sport';
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic SE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic se');
  INSERT INTO versions (name, model_id) SELECT 'R-Dynamic HSE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r-dynamic hse');

  -- Range Rover
  INSERT INTO models (name, brand_id) SELECT 'Range Rover', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'range rover');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'range rover';
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'HSE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'hse');
  INSERT INTO versions (name, model_id) SELECT 'Autobiography', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'autobiography');
  INSERT INTO versions (name, model_id) SELECT 'First Edition', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'first edition');
  INSERT INTO versions (name, model_id) SELECT 'SV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sv');
  INSERT INTO versions (name, model_id) SELECT 'P400e PHEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p400e phev');
  INSERT INTO versions (name, model_id) SELECT 'P530 V8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p530 v8');

  -- Range Rover Sport
  INSERT INTO models (name, brand_id) SELECT 'Range Rover Sport', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'range rover sport');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'range rover sport';
  INSERT INTO versions (name, model_id) SELECT 'SE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se');
  INSERT INTO versions (name, model_id) SELECT 'Dynamic SE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dynamic se');
  INSERT INTO versions (name, model_id) SELECT 'Dynamic HSE', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'dynamic hse');
  INSERT INTO versions (name, model_id) SELECT 'Autobiography', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'autobiography');
  INSERT INTO versions (name, model_id) SELECT 'P510e PHEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'p510e phev');
  INSERT INTO versions (name, model_id) SELECT 'SV Edition One', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sv edition one');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Range Rover Evoque', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'range rover evoque');
  INSERT INTO models (name, brand_id) SELECT 'Range Rover Velar', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'range rover velar');
END $$;

-- === MINI ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'MINI'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'mini');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'mini';

  -- Cooper
  INSERT INTO models (name, brand_id) SELECT 'Cooper', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cooper');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'cooper';
  INSERT INTO versions (name, model_id) SELECT 'Classic 3 Door', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'classic 3 door');
  INSERT INTO versions (name, model_id) SELECT 'Classic 5 Door', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'classic 5 door');
  INSERT INTO versions (name, model_id) SELECT 'S', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 's');
  INSERT INTO versions (name, model_id) SELECT 'SE Electric', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se electric');
  INSERT INTO versions (name, model_id) SELECT 'JCW', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'jcw');

  -- Countryman
  INSERT INTO models (name, brand_id) SELECT 'Countryman', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'countryman');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'countryman';
  INSERT INTO versions (name, model_id) SELECT 'Cooper', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cooper');
  INSERT INTO versions (name, model_id) SELECT 'Cooper S ALL4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'cooper s all4');
  INSERT INTO versions (name, model_id) SELECT 'JCW ALL4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'jcw all4');
  INSERT INTO versions (name, model_id) SELECT 'SE Electric', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se electric');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Clubman', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'clubman');
  INSERT INTO models (name, brand_id) SELECT 'Convertible', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'convertible');
  INSERT INTO models (name, brand_id) SELECT 'Aceman', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aceman');
  INSERT INTO models (name, brand_id) SELECT 'Paceman', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'paceman');
END $$;

-- === Isuzu ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Isuzu'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'isuzu');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'isuzu';

  -- D-Max
  INSERT INTO models (name, brand_id) SELECT 'D-Max', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd-max');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'd-max';
  INSERT INTO versions (name, model_id) SELECT 'Chassis Cab 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'chassis cab 4x2');
  INSERT INTO versions (name, model_id) SELECT 'Single Cab 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'single cab 4x2');
  INSERT INTO versions (name, model_id) SELECT 'Space Cab 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'space cab 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Double Cab LS 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'double cab ls 4x2');
  INSERT INTO versions (name, model_id) SELECT 'Double Cab LS 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'double cab ls 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Double Cab LSE 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'double cab lse 4x4');
  INSERT INTO versions (name, model_id) SELECT 'V-Cross 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'v-cross 4x4');
  INSERT INTO versions (name, model_id) SELECT 'X-Terrain 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'x-terrain 4x4');

  -- MU-X
  INSERT INTO models (name, brand_id) SELECT 'MU-X', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mu-x');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'mu-x';
  INSERT INTO versions (name, model_id) SELECT 'LS 1.9 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 1.9 4x2');
  INSERT INTO versions (name, model_id) SELECT 'LS 3.0 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ls 3.0 4x4');
  INSERT INTO versions (name, model_id) SELECT 'LSE 3.0 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'lse 3.0 4x4');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'NPR', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'npr');
  INSERT INTO models (name, brand_id) SELECT 'NQR', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nqr');
  INSERT INTO models (name, brand_id) SELECT 'NLR', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'nlr');
  INSERT INTO models (name, brand_id) SELECT 'FRR', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'frr');
  INSERT INTO models (name, brand_id) SELECT 'FVR', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fvr');
  INSERT INTO models (name, brand_id) SELECT 'FVZ', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fvz');
  INSERT INTO models (name, brand_id) SELECT 'GXR', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gxr');
END $$;

-- === Foton ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Foton'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'foton');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'foton';

  -- Tunland
  INSERT INTO models (name, brand_id) SELECT 'Tunland', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tunland');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tunland';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 2.8 TD 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 2.8 td 4x2');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 2.8 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 2.8 td 4x4');

  -- Tunland V7 / V9
  INSERT INTO models (name, brand_id) SELECT 'Tunland V7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tunland v7');
  INSERT INTO models (name, brand_id) SELECT 'Tunland V9', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tunland v9');
  INSERT INTO models (name, brand_id) SELECT 'Sauvana', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'sauvana');
  INSERT INTO models (name, brand_id) SELECT 'View', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'view');
  INSERT INTO models (name, brand_id) SELECT 'Aumark', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'aumark');
  INSERT INTO models (name, brand_id) SELECT 'Auman', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'auman');
  INSERT INTO models (name, brand_id) SELECT 'Ollin', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'ollin');
  INSERT INTO models (name, brand_id) SELECT 'Forland', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'forland');
END $$;

-- === SsangYong / KGM ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'SsangYong'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'ssangyong');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'ssangyong';

  -- Tivoli
  INSERT INTO models (name, brand_id) SELECT 'Tivoli', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tivoli');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tivoli';
  INSERT INTO versions (name, model_id) SELECT 'G16 Comfort', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g16 comfort');
  INSERT INTO versions (name, model_id) SELECT 'G16 Luxury', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g16 luxury');
  INSERT INTO versions (name, model_id) SELECT 'G15T Luxury', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g15t luxury');

  -- Korando
  INSERT INTO models (name, brand_id) SELECT 'Korando', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'korando');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'korando';
  INSERT INTO versions (name, model_id) SELECT 'G20 Comfort', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g20 comfort');
  INSERT INTO versions (name, model_id) SELECT 'G20 Luxury 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'g20 luxury 4wd');
  INSERT INTO versions (name, model_id) SELECT 'D22T Luxury', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'd22t luxury');
  INSERT INTO versions (name, model_id) SELECT 'e-Motion Electric', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-motion electric');

  -- Rexton
  INSERT INTO models (name, brand_id) SELECT 'Rexton', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rexton');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rexton';
  INSERT INTO versions (name, model_id) SELECT 'e-XDi220 Comfort', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-xdi220 comfort');
  INSERT INTO versions (name, model_id) SELECT 'e-XDi220 Luxury 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'e-xdi220 luxury 4wd');
  INSERT INTO versions (name, model_id) SELECT 'Ultimate 4WD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ultimate 4wd');

  -- Musso
  INSERT INTO models (name, brand_id) SELECT 'Musso', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'musso');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'musso';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 2.2 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 2.2 td 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 2.2 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 2.2 td 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Grand 2.2 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'grand 2.2 td 4x4');

  -- Other
  INSERT INTO models (name, brand_id) SELECT 'Torres', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'torres');
  INSERT INTO models (name, brand_id) SELECT 'Torres EVX', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'torres evx');
  INSERT INTO models (name, brand_id) SELECT 'Actyon', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'actyon');
END $$;

-- === DFSK ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'DFSK'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'dfsk');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'dfsk';

  INSERT INTO models (name, brand_id) SELECT 'Glory 500', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glory 500');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glory 500';
  INSERT INTO versions (name, model_id) SELECT 'Comfortline 1.5', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfortline 1.5');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5 CVT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5 cvt');

  INSERT INTO models (name, brand_id) SELECT 'Glory 580', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glory 580');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glory 580';
  INSERT INTO versions (name, model_id) SELECT 'Comfortline 1.8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfortline 1.8');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t');

  INSERT INTO models (name, brand_id) SELECT 'Glory 600', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glory 600');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'glory 600';
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t');

  INSERT INTO models (name, brand_id) SELECT 'K01', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'k01');
  INSERT INTO models (name, brand_id) SELECT 'K01S', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'k01s');
  INSERT INTO models (name, brand_id) SELECT 'K02', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'k02');
  INSERT INTO models (name, brand_id) SELECT 'K05', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'k05');
  INSERT INTO models (name, brand_id) SELECT 'C35', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c35');
END $$;

-- === Geely ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Geely'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'geely');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'geely';

  INSERT INTO models (name, brand_id) SELECT 'Coolray', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'coolray');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'coolray';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T DCT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t dct');
  INSERT INTO versions (name, model_id) SELECT 'Sport 1.5T DCT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sport 1.5t dct');

  INSERT INTO models (name, brand_id) SELECT 'Azkarra', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'azkarra');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'azkarra';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5T MHEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5t mhev');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T MHEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t mhev');

  INSERT INTO models (name, brand_id) SELECT 'Tugella', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tugella');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'tugella';
  INSERT INTO versions (name, model_id) SELECT 'Luxury 2.0T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 2.0t');
  INSERT INTO versions (name, model_id) SELECT 'Flagship 2.0T AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'flagship 2.0t awd');

  INSERT INTO models (name, brand_id) SELECT 'Emgrand', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'emgrand');
  INSERT INTO models (name, brand_id) SELECT 'GX3 Pro', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gx3 pro');
  INSERT INTO models (name, brand_id) SELECT 'Monjaro', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'monjaro');
  INSERT INTO models (name, brand_id) SELECT 'Starray', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'starray');
  INSERT INTO models (name, brand_id) SELECT 'Geometry C', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'geometry c');
  INSERT INTO models (name, brand_id) SELECT 'Geometry E', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'geometry e');
END $$;

-- === Zeekr ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Zeekr'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'zeekr');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'zeekr';

  INSERT INTO models (name, brand_id) SELECT 'X', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x';
  INSERT INTO versions (name, model_id) SELECT 'Core RWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'core rwd');
  INSERT INTO versions (name, model_id) SELECT 'Privilege AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'privilege awd');
  INSERT INTO versions (name, model_id) SELECT 'Flagship AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'flagship awd');

  INSERT INTO models (name, brand_id) SELECT '001', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '001');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '001';
  INSERT INTO versions (name, model_id) SELECT 'Long Range RWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'long range rwd');
  INSERT INTO versions (name, model_id) SELECT 'Privilege AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'privilege awd');
  INSERT INTO versions (name, model_id) SELECT 'Performance AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'performance awd');

  INSERT INTO models (name, brand_id) SELECT '007', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '007');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '007';
  INSERT INTO versions (name, model_id) SELECT 'RWD Standard', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rwd standard');
  INSERT INTO versions (name, model_id) SELECT 'Performance AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'performance awd');

  INSERT INTO models (name, brand_id) SELECT '009', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '009');
END $$;

-- === Leapmotor ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Leapmotor'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'leapmotor');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'leapmotor';

  INSERT INTO models (name, brand_id) SELECT 'T03', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't03');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't03';
  INSERT INTO versions (name, model_id) SELECT 'Comfort EV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort ev');
  INSERT INTO versions (name, model_id) SELECT 'Luxury EV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury ev');

  INSERT INTO models (name, brand_id) SELECT 'C10', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c10');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c10';
  INSERT INTO versions (name, model_id) SELECT 'Style EV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'style ev');
  INSERT INTO versions (name, model_id) SELECT 'Design EV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'design ev');
  INSERT INTO versions (name, model_id) SELECT 'REEV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'reev');

  INSERT INTO models (name, brand_id) SELECT 'C11', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c11');
  INSERT INTO models (name, brand_id) SELECT 'C16', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c16');
END $$;

-- === Neta ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Neta'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'neta');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'neta';

  INSERT INTO models (name, brand_id) SELECT 'V', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'v';
  INSERT INTO versions (name, model_id) SELECT 'Comfort EV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort ev');
  INSERT INTO versions (name, model_id) SELECT 'Luxury EV', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury ev');

  INSERT INTO models (name, brand_id) SELECT 'U', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'u');
  INSERT INTO models (name, brand_id) SELECT 'X', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x');
  INSERT INTO models (name, brand_id) SELECT 'GT', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'gt');
  INSERT INTO models (name, brand_id) SELECT 'S', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's');
END $$;

-- === Jetour ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Jetour'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'jetour');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'jetour';

  INSERT INTO models (name, brand_id) SELECT 'X70', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x70');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x70';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T DCT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t dct');

  INSERT INTO models (name, brand_id) SELECT 'X70 Plus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x70 plus');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x70 plus';
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T DCT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t dct');
  INSERT INTO versions (name, model_id) SELECT 'Flagship 1.6T DCT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'flagship 1.6t dct');

  INSERT INTO models (name, brand_id) SELECT 'X90', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x90');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x90';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.6T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.6t');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.6T DCT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.6t dct');

  INSERT INTO models (name, brand_id) SELECT 'X90 Plus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'x90 plus');
  INSERT INTO models (name, brand_id) SELECT 'Dashing', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'dashing');
  INSERT INTO models (name, brand_id) SELECT 'T2', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 't2');
END $$;

-- === Skoda ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Skoda'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'skoda');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'skoda';

  INSERT INTO models (name, brand_id) SELECT 'Fabia', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fabia');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'fabia';
  INSERT INTO versions (name, model_id) SELECT 'Ambition 1.0 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ambition 1.0 tsi');
  INSERT INTO versions (name, model_id) SELECT 'Style 1.0 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'style 1.0 tsi');
  INSERT INTO versions (name, model_id) SELECT 'Monte Carlo 1.5 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'monte carlo 1.5 tsi');

  INSERT INTO models (name, brand_id) SELECT 'Scala', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'scala');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'scala';
  INSERT INTO versions (name, model_id) SELECT 'Ambition 1.0 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ambition 1.0 tsi');
  INSERT INTO versions (name, model_id) SELECT 'Style 1.5 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'style 1.5 tsi');

  INSERT INTO models (name, brand_id) SELECT 'Octavia', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'octavia');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'octavia';
  INSERT INTO versions (name, model_id) SELECT 'Ambition 1.4 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ambition 1.4 tsi');
  INSERT INTO versions (name, model_id) SELECT 'Style 1.5 TSI DSG', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'style 1.5 tsi dsg');
  INSERT INTO versions (name, model_id) SELECT 'RS 2.0 TSI DSG', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'rs 2.0 tsi dsg');

  INSERT INTO models (name, brand_id) SELECT 'Kamiq', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kamiq');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kamiq';
  INSERT INTO versions (name, model_id) SELECT 'Ambition 1.0 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ambition 1.0 tsi');
  INSERT INTO versions (name, model_id) SELECT 'Style 1.5 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'style 1.5 tsi');

  INSERT INTO models (name, brand_id) SELECT 'Karoq', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'karoq');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'karoq';
  INSERT INTO versions (name, model_id) SELECT 'Ambition 1.4 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ambition 1.4 tsi');
  INSERT INTO versions (name, model_id) SELECT 'Style 1.5 TSI DSG', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'style 1.5 tsi dsg');

  INSERT INTO models (name, brand_id) SELECT 'Kodiaq', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kodiaq');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'kodiaq';
  INSERT INTO versions (name, model_id) SELECT 'Ambition 1.4 TSI', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ambition 1.4 tsi');
  INSERT INTO versions (name, model_id) SELECT 'Style 2.0 TSI DSG 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'style 2.0 tsi dsg 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Sportline 2.0 TSI 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sportline 2.0 tsi 4x4');

  INSERT INTO models (name, brand_id) SELECT 'Superb', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'superb');
  INSERT INTO models (name, brand_id) SELECT 'Rapid', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'rapid');
  INSERT INTO models (name, brand_id) SELECT 'Enyaq', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'enyaq');
END $$;

-- === Omoda ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Omoda'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'omoda');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'omoda';

  INSERT INTO models (name, brand_id) SELECT 'C5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c5');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c5';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.5T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.5t');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.5T DCT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.5t dct');
  INSERT INTO versions (name, model_id) SELECT 'Flagship 1.5T DCT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'flagship 1.5t dct');

  INSERT INTO models (name, brand_id) SELECT 'C7', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c7');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c7';
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.6T DCT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.6t dct');
  INSERT INTO versions (name, model_id) SELECT 'Flagship 1.6T DCT', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'flagship 1.6t dct');

  INSERT INTO models (name, brand_id) SELECT 'C9', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'c9');
  INSERT INTO models (name, brand_id) SELECT 'E5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'e5');
END $$;

-- === Dodge ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Dodge'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'dodge');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'dodge';

  INSERT INTO models (name, brand_id) SELECT 'Journey', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'journey');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'journey';
  INSERT INTO versions (name, model_id) SELECT 'SE 2.4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'se 2.4');
  INSERT INTO versions (name, model_id) SELECT 'SXT 2.4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sxt 2.4');
  INSERT INTO versions (name, model_id) SELECT 'R/T 3.6 V6 AWD', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r/t 3.6 v6 awd');

  INSERT INTO models (name, brand_id) SELECT 'Challenger', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'challenger');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'challenger';
  INSERT INTO versions (name, model_id) SELECT 'SXT 3.6 V6', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sxt 3.6 v6');
  INSERT INTO versions (name, model_id) SELECT 'R/T 5.7 HEMI V8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r/t 5.7 hemi v8');
  INSERT INTO versions (name, model_id) SELECT 'SRT Hellcat 6.2 V8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'srt hellcat 6.2 v8');

  INSERT INTO models (name, brand_id) SELECT 'Charger', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'charger');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'charger';
  INSERT INTO versions (name, model_id) SELECT 'SXT 3.6 V6', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'sxt 3.6 v6');
  INSERT INTO versions (name, model_id) SELECT 'R/T 5.7 HEMI V8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'r/t 5.7 hemi v8');
  INSERT INTO versions (name, model_id) SELECT 'SRT Hellcat 6.2 V8', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'srt hellcat 6.2 v8');

  INSERT INTO models (name, brand_id) SELECT 'Durango', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'durango');
  INSERT INTO models (name, brand_id) SELECT 'Vision', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vision');
END $$;

-- === JMC ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'JMC'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'jmc');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'jmc';

  INSERT INTO models (name, brand_id) SELECT 'Vigus', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vigus');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vigus';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 2.4 TD 4x2', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 2.4 td 4x2');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 2.4 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 2.4 td 4x4');

  INSERT INTO models (name, brand_id) SELECT 'Vigus Pro', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vigus pro');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'vigus pro';
  INSERT INTO versions (name, model_id) SELECT 'Luxury 2.0 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 2.0 td 4x4');
  INSERT INTO versions (name, model_id) SELECT 'Ultimate 2.0 TD 4x4', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'ultimate 2.0 td 4x4');

  INSERT INTO models (name, brand_id) SELECT 'Grand Avenue', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'grand avenue');
  INSERT INTO models (name, brand_id) SELECT 'Carrying', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'carrying');
  INSERT INTO models (name, brand_id) SELECT 'N601', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'n601');
  INSERT INTO models (name, brand_id) SELECT 'N800', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'n800');
END $$;

-- === Haima ===
DO $$
DECLARE
  v_brand_id TEXT;
  v_model_id TEXT;
BEGIN
  INSERT INTO brands (id, name) SELECT gen_random_uuid(), 'Haima'
    WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = 'haima');
  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = 'haima';

  INSERT INTO models (name, brand_id) SELECT '7X', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '7x');
  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '7x';
  INSERT INTO versions (name, model_id) SELECT 'Comfort 1.6T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'comfort 1.6t');
  INSERT INTO versions (name, model_id) SELECT 'Luxury 1.6T', v_model_id::int WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id::int AND LOWER(name) = 'luxury 1.6t');

  INSERT INTO models (name, brand_id) SELECT '8S', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '8s');
  INSERT INTO models (name, brand_id) SELECT 'S5', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 's5');
  INSERT INTO models (name, brand_id) SELECT 'M3', v_brand_id WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = 'm3');
END $$;
