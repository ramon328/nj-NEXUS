-- ============================================================================
-- Add brands and models for trucks, machinery, and nautical vehicles
-- These are added to the global brands/models tables (shared with cars)
-- Idempotent: safe to run multiple times
-- ============================================================================

-- ============================================================================
-- TRUCK BRANDS & MODELS
-- ============================================================================

-- Freightliner
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'freightliner';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Freightliner') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Cascadia', 'M2 106', 'M2 112', '108SD', '114SD', '122SD', 'Coronado', 'Business Class M2'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Kenworth
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'kenworth';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Kenworth') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'T680', 'T880', 'W900', 'W990', 'T270', 'T370', 'T440', 'T470', 'C500', 'K270'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Peterbilt
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'peterbilt';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Peterbilt') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    '579', '389', '567', '520', '536', '537', '548', '367'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Volvo Trucks (Volvo already exists, just add truck models)
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'volvo';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Volvo') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'FH', 'FH16', 'FM', 'FMX', 'FE', 'FL', 'VNL', 'VNR', 'VHD', 'NL12'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Mercedes-Benz Trucks (already exists, add truck models)
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'mercedes-benz';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Mercedes-Benz') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Actros', 'Arocs', 'Atego', 'Econic', 'Unimog', 'Axor', 'Zetros', 'Accelo', 'Atron'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Scania
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'scania';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Scania') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'R500', 'R450', 'R410', 'R540', 'S500', 'S730', 'G410', 'G450', 'P360', 'P410', 'XT'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- MAN
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'man';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'MAN') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'TGX', 'TGS', 'TGM', 'TGL', 'TGA'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- International
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'international';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'International') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'LT', 'RH', 'HV', 'MV', 'HX', 'LoneStar', 'ProStar', 'DuraStar', '4300', '4400', '7400', '7600', '9900'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- DAF
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'daf';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'DAF') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'XF', 'XG', 'XG+', 'CF', 'LF'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Iveco
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'iveco';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Iveco') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'S-Way', 'X-Way', 'T-Way', 'Eurocargo', 'Daily', 'Trakker', 'Stralis', 'Hi-Way'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Hino
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'hino';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Hino') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    '500', '700', '300', 'Dutro', 'Ranger', 'Profia', 'L Series', 'XL Series'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Isuzu
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'isuzu';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Isuzu') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'NNR', 'NLR', 'NMR', 'NPR', 'NQR', 'FRR', 'FSR', 'FTR', 'FVR', 'FVZ', 'GXD', 'ELF', 'Forward', 'Giga'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- FUSO (Mitsubishi Fuso)
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'fuso';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'FUSO') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Canter', 'Fighter', 'Super Great', 'eCanter', 'FA', 'FI', 'FJ', 'FO'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Mack
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'mack';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Mack') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Anthem', 'Pinnacle', 'Granite', 'LR', 'MD', 'TerraPro'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Foton
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'foton';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Foton') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Auman', 'Aumark', 'Ollin', 'Rowor', 'EST', 'BJ', 'Tunland'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- JAC
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'jac';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'JAC') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'N56', 'N75', 'N80', 'N120', 'N350', 'X200', 'HFC', 'Shuailing'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Dongfeng
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'dongfeng';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Dongfeng') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'KR', 'Captain', 'T5', 'KL', 'D9', 'Kinland', 'Duolika'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- ============================================================================
-- MACHINERY BRANDS & MODELS
-- ============================================================================

-- Caterpillar
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'caterpillar';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Caterpillar') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    '320 Excavadora', '330 Excavadora', '336 Excavadora', '349 Excavadora',
    'D6 Bulldozer', 'D7 Bulldozer', 'D8 Bulldozer', 'D9 Bulldozer', 'D10 Bulldozer',
    '950 Cargador Frontal', '966 Cargador Frontal', '972 Cargador Frontal', '980 Cargador Frontal',
    '140 Motoniveladora', '160 Motoniveladora', '12M Motoniveladora',
    '730 Camión Articulado', '740 Camión Articulado', '745 Camión Articulado',
    '420 Retroexcavadora', '430 Retroexcavadora', '440 Retroexcavadora',
    '226D Minicargador', '236D Minicargador', '242D Minicargador', '262D Minicargador',
    'CS56 Rodillo Compactador', 'CS64 Rodillo Compactador',
    '305 Mini Excavadora', '308 Mini Excavadora', '310 Mini Excavadora',
    'TH408 Manipulador Telescópico', 'TH514 Manipulador Telescópico'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Komatsu
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'komatsu';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Komatsu') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'PC200 Excavadora', 'PC210 Excavadora', 'PC300 Excavadora', 'PC350 Excavadora', 'PC490 Excavadora',
    'D61 Bulldozer', 'D65 Bulldozer', 'D85 Bulldozer', 'D155 Bulldozer',
    'WA320 Cargador Frontal', 'WA380 Cargador Frontal', 'WA470 Cargador Frontal', 'WA500 Cargador Frontal',
    'GD555 Motoniveladora', 'GD655 Motoniveladora',
    'HM300 Camión Articulado', 'HM400 Camión Articulado',
    'WB93 Retroexcavadora', 'WB97 Retroexcavadora',
    'SK820 Minicargador', 'SK1026 Minicargador',
    'PC55 Mini Excavadora', 'PC78 Mini Excavadora'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- John Deere
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'john deere';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'John Deere') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    '350G Excavadora', '210G Excavadora', '470G Excavadora',
    '850L Bulldozer', '700L Bulldozer',
    '644L Cargador Frontal', '744L Cargador Frontal', '844L Cargador Frontal',
    '672G Motoniveladora', '772G Motoniveladora', '872G Motoniveladora',
    '460E Camión Articulado', '410L Retroexcavadora',
    '320G Minicargador', '330G Minicargador', '332G Minicargador',
    '5075E Tractor', '5090E Tractor', '6110M Tractor', '6130M Tractor', '6155M Tractor',
    '6175M Tractor', '6195M Tractor', '7230R Tractor', '8R 370 Tractor',
    '35G Mini Excavadora', '50G Mini Excavadora', '60G Mini Excavadora',
    'S770 Cosechadora', 'S780 Cosechadora', 'S790 Cosechadora'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Volvo Construction (add construction models to existing Volvo)
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'volvo';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Volvo') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'EC200 Excavadora', 'EC250 Excavadora', 'EC300 Excavadora', 'EC350 Excavadora', 'EC480 Excavadora',
    'L60H Cargador Frontal', 'L90H Cargador Frontal', 'L110H Cargador Frontal', 'L150H Cargador Frontal',
    'A30G Camión Articulado', 'A40G Camión Articulado', 'A45G Camión Articulado',
    'MC85 Minicargador', 'MC115 Minicargador',
    'ECR88 Mini Excavadora', 'EC55 Mini Excavadora'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Bobcat
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'bobcat';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Bobcat') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'S570 Minicargador', 'S590 Minicargador', 'S630 Minicargador', 'S650 Minicargador',
    'S740 Minicargador', 'S770 Minicargador', 'S850 Minicargador',
    'T450 Minicargador Oruga', 'T550 Minicargador Oruga', 'T650 Minicargador Oruga', 'T770 Minicargador Oruga',
    'E20 Mini Excavadora', 'E26 Mini Excavadora', 'E32 Mini Excavadora', 'E35 Mini Excavadora',
    'E42 Mini Excavadora', 'E50 Mini Excavadora', 'E60 Mini Excavadora', 'E85 Mini Excavadora',
    'TL30.70 Manipulador Telescópico', 'TL38.70 Manipulador Telescópico',
    'B730 Retroexcavadora'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Case (Construction)
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'case';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Case') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'CX210D Excavadora', 'CX250D Excavadora', 'CX300D Excavadora', 'CX350D Excavadora', 'CX490D Excavadora',
    '1650M Bulldozer', '2050M Bulldozer',
    '521G Cargador Frontal', '621G Cargador Frontal', '721G Cargador Frontal', '821G Cargador Frontal', '921G Cargador Frontal',
    '865B Motoniveladora', '885B Motoniveladora',
    '580SN Retroexcavadora', '590SN Retroexcavadora',
    'SV185 Minicargador', 'SV280 Minicargador', 'SV340 Minicargador', 'SR270 Minicargador',
    'CX17C Mini Excavadora', 'CX26C Mini Excavadora', 'CX37C Mini Excavadora', 'CX57C Mini Excavadora',
    'Farmall 90A Tractor', 'Farmall 110A Tractor', 'Puma 150 Tractor', 'Puma 185 Tractor',
    'Magnum 250 Tractor', 'Magnum 310 Tractor', 'Magnum 380 Tractor',
    'Axial-Flow 7250 Cosechadora', 'Axial-Flow 8250 Cosechadora'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- New Holland
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'new holland';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'New Holland') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'E215C Excavadora', 'E305C Excavadora',
    'W130D Cargador Frontal', 'W170D Cargador Frontal', 'W190D Cargador Frontal',
    'B95C Retroexcavadora', 'B110C Retroexcavadora',
    'L220 Minicargador', 'L230 Minicargador', 'L320 Minicargador',
    'E30C Mini Excavadora', 'E37C Mini Excavadora', 'E57C Mini Excavadora',
    'T4.75 Tractor', 'T5.120 Tractor', 'T6.180 Tractor', 'T7.260 Tractor',
    'T8.435 Tractor', 'T9.645 Tractor',
    'CR8.90 Cosechadora', 'CR9.90 Cosechadora', 'CR10.90 Cosechadora'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- JCB
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'jcb';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'JCB') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'JS220 Excavadora', 'JS300 Excavadora', 'JS370 Excavadora',
    '427 Cargador Frontal', '437 Cargador Frontal', '457 Cargador Frontal',
    '3CX Retroexcavadora', '4CX Retroexcavadora', '5CX Retroexcavadora',
    '155 Minicargador', '175 Minicargador', '215 Minicargador',
    '16C Mini Excavadora', '19C Mini Excavadora', '48Z Mini Excavadora', '55Z Mini Excavadora', '85Z Mini Excavadora',
    '540-140 Manipulador Telescópico', '540-170 Manipulador Telescópico', '540-200 Manipulador Telescópico',
    'Fastrac 4220 Tractor'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Hitachi
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'hitachi';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Hitachi') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'ZX200 Excavadora', 'ZX210 Excavadora', 'ZX300 Excavadora', 'ZX350 Excavadora', 'ZX490 Excavadora',
    'ZW180 Cargador Frontal', 'ZW220 Cargador Frontal', 'ZW310 Cargador Frontal',
    'ZX26U Mini Excavadora', 'ZX33U Mini Excavadora', 'ZX55U Mini Excavadora', 'ZX75US Mini Excavadora'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Liebherr
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'liebherr';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Liebherr') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'R920 Excavadora', 'R924 Excavadora', 'R930 Excavadora', 'R936 Excavadora', 'R946 Excavadora',
    'L538 Cargador Frontal', 'L550 Cargador Frontal', 'L566 Cargador Frontal', 'L580 Cargador Frontal',
    'PR726 Bulldozer', 'PR736 Bulldozer', 'PR756 Bulldozer',
    'A914 Excavadora de Ruedas', 'A918 Excavadora de Ruedas',
    'LTM 1100 Grúa', 'LTM 1200 Grúa', 'LTM 1300 Grúa',
    'TA230 Camión Articulado'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Doosan
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'doosan';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Doosan') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'DX225 Excavadora', 'DX255 Excavadora', 'DX300 Excavadora', 'DX340 Excavadora', 'DX490 Excavadora',
    'DL250 Cargador Frontal', 'DL300 Cargador Frontal', 'DL420 Cargador Frontal',
    'DX17Z Mini Excavadora', 'DX27Z Mini Excavadora', 'DX35Z Mini Excavadora', 'DX63 Mini Excavadora', 'DX85R Mini Excavadora'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- SANY
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'sany';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'SANY') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'SY215C Excavadora', 'SY235C Excavadora', 'SY265C Excavadora', 'SY365H Excavadora', 'SY500H Excavadora',
    'SW405 Cargador Frontal', 'SW955 Cargador Frontal',
    'SY16C Mini Excavadora', 'SY26U Mini Excavadora', 'SY35U Mini Excavadora', 'SY50U Mini Excavadora',
    'STC250 Grúa', 'STC500 Grúa', 'STC750 Grúa',
    'STG170 Motoniveladora', 'STG210 Motoniveladora'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- XCMG
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'xcmg';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'XCMG') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'XE215 Excavadora', 'XE270 Excavadora', 'XE370 Excavadora', 'XE490 Excavadora',
    'LW500 Cargador Frontal', 'LW600 Cargador Frontal', 'LW800 Cargador Frontal',
    'GR215 Motoniveladora', 'GR180 Motoniveladora',
    'XE35U Mini Excavadora', 'XE55U Mini Excavadora',
    'QY25 Grúa', 'QY50 Grúa', 'QY70 Grúa'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Kubota
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'kubota';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Kubota') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'KX040 Mini Excavadora', 'KX057 Mini Excavadora', 'KX080 Mini Excavadora',
    'U27 Mini Excavadora', 'U35 Mini Excavadora', 'U48 Mini Excavadora', 'U55 Mini Excavadora',
    'SVL65 Minicargador Oruga', 'SVL75 Minicargador Oruga', 'SVL97 Minicargador Oruga',
    'SSV65 Minicargador', 'SSV75 Minicargador',
    'M5-111 Tractor', 'M6-111 Tractor', 'M7-172 Tractor',
    'L3560 Tractor Compacto', 'L4060 Tractor Compacto', 'L6060 Tractor Compacto',
    'BX2380 Tractor Sub-compacto'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Takeuchi
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'takeuchi';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Takeuchi') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'TB216 Mini Excavadora', 'TB225 Mini Excavadora', 'TB230 Mini Excavadora', 'TB235 Mini Excavadora',
    'TB240 Mini Excavadora', 'TB250 Mini Excavadora', 'TB260 Mini Excavadora', 'TB290 Mini Excavadora',
    'TL6R Minicargador Oruga', 'TL8R Minicargador Oruga', 'TL10V2 Minicargador Oruga', 'TL12R2 Minicargador Oruga',
    'TS60V Minicargador'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Manitou
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'manitou';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Manitou') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'MT625 Manipulador Telescópico', 'MT732 Manipulador Telescópico', 'MT932 Manipulador Telescópico',
    'MT1135 Manipulador Telescópico', 'MT1440 Manipulador Telescópico',
    'MRT2150 Manipulador Telescópico Giratorio', 'MRT2550 Manipulador Telescópico Giratorio',
    'MLT625 Manipulador Agrícola', 'MLT737 Manipulador Agrícola', 'MLT840 Manipulador Agrícola'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- ============================================================================
-- NAUTICAL BRANDS & MODELS
-- ============================================================================

-- Yamaha (Marine)
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'yamaha';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Yamaha') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'FX Cruiser SVHO Moto de Agua', 'FX HO Moto de Agua', 'FX SVHO Moto de Agua',
    'VX Cruiser HO Moto de Agua', 'VX Deluxe Moto de Agua', 'VX Limited HO Moto de Agua',
    'GP1800R SVHO Moto de Agua', 'SuperJet Moto de Agua', 'EXR Moto de Agua',
    '190 FSH Lancha', '195S Lancha', '210 FSH Lancha', '212S Lancha', '222S Lancha', '252S Lancha',
    'F25 Motor Fuera de Borda', 'F40 Motor Fuera de Borda', 'F60 Motor Fuera de Borda',
    'F90 Motor Fuera de Borda', 'F115 Motor Fuera de Borda', 'F150 Motor Fuera de Borda',
    'F200 Motor Fuera de Borda', 'F250 Motor Fuera de Borda', 'F300 Motor Fuera de Borda',
    'F350 Motor Fuera de Borda', 'F425 Motor Fuera de Borda'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Sea-Doo (BRP)
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'sea-doo';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Sea-Doo') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'GTX Limited 300 Moto de Agua', 'GTX 170 Moto de Agua', 'GTX 230 Moto de Agua',
    'RXT-X 300 Moto de Agua', 'RXP-X 300 Moto de Agua',
    'GTI SE 130 Moto de Agua', 'GTI SE 170 Moto de Agua',
    'Wake Pro 230 Moto de Agua', 'Fish Pro Scout 130 Moto de Agua', 'Fish Pro Sport 170 Moto de Agua',
    'Spark 2up Moto de Agua', 'Spark 3up Moto de Agua', 'Spark Trixx Moto de Agua',
    'Switch Sport 18 Pontón', 'Switch Cruise 21 Pontón'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Kawasaki (Jet Ski)
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'kawasaki';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Kawasaki') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Ultra 310LX Moto de Agua', 'Ultra 310X Moto de Agua', 'Ultra 310R Moto de Agua',
    'STX 160X Moto de Agua', 'STX 160LX Moto de Agua', 'STX 160 Moto de Agua',
    'SX-R Moto de Agua'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Mercury Marine
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'mercury';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Mercury') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Verado 250 Motor Fuera de Borda', 'Verado 300 Motor Fuera de Borda', 'Verado 350 Motor Fuera de Borda', 'Verado 400 Motor Fuera de Borda',
    'Pro XS 115 Motor Fuera de Borda', 'Pro XS 150 Motor Fuera de Borda', 'Pro XS 175 Motor Fuera de Borda', 'Pro XS 200 Motor Fuera de Borda',
    'FourStroke 40 Motor Fuera de Borda', 'FourStroke 60 Motor Fuera de Borda', 'FourStroke 75 Motor Fuera de Borda',
    'FourStroke 100 Motor Fuera de Borda', 'FourStroke 115 Motor Fuera de Borda', 'FourStroke 150 Motor Fuera de Borda',
    'SeaPro 40 Motor Fuera de Borda', 'SeaPro 60 Motor Fuera de Borda', 'SeaPro 150 Motor Fuera de Borda',
    'V6 200 Motor Fuera de Borda', 'V8 250 Motor Fuera de Borda', 'V8 300 Motor Fuera de Borda',
    'V12 600 Verado Motor Fuera de Borda'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Suzuki Marine
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'suzuki';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Suzuki') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'DF25A Motor Fuera de Borda', 'DF40A Motor Fuera de Borda', 'DF60A Motor Fuera de Borda',
    'DF90A Motor Fuera de Borda', 'DF115B Motor Fuera de Borda', 'DF140B Motor Fuera de Borda',
    'DF150A Motor Fuera de Borda', 'DF175A Motor Fuera de Borda', 'DF200A Motor Fuera de Borda',
    'DF250A Motor Fuera de Borda', 'DF300B Motor Fuera de Borda', 'DF350A Motor Fuera de Borda'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Honda Marine
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'honda';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Honda') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'BF25 Motor Fuera de Borda', 'BF40 Motor Fuera de Borda', 'BF50 Motor Fuera de Borda',
    'BF60 Motor Fuera de Borda', 'BF75 Motor Fuera de Borda', 'BF90 Motor Fuera de Borda',
    'BF100 Motor Fuera de Borda', 'BF115 Motor Fuera de Borda', 'BF135 Motor Fuera de Borda',
    'BF150 Motor Fuera de Borda', 'BF200 Motor Fuera de Borda', 'BF225 Motor Fuera de Borda', 'BF250 Motor Fuera de Borda'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Bayliner
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'bayliner';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Bayliner') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'VR4 Lancha', 'VR5 Lancha', 'VR6 Lancha',
    'Element E16 Lancha', 'Element E18 Lancha', 'Element E21 Lancha',
    'Trophy T22CX Lancha Pesca', 'Trophy T24CX Lancha Pesca',
    'DX2000 Lancha', 'DX2050 Lancha', 'DX2250 Lancha'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Boston Whaler
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'boston whaler';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Boston Whaler') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    '130 Super Sport Lancha', '150 Montauk Lancha', '170 Montauk Lancha',
    '190 Montauk Lancha', '210 Montauk Lancha', '230 Outrage Lancha',
    '250 Outrage Lancha', '280 Outrage Lancha', '330 Outrage Lancha',
    '350 Outrage Lancha', '380 Outrage Lancha', '420 Outrage Lancha'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Quicksilver
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'quicksilver';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Quicksilver') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Activ 455 Open Lancha', 'Activ 505 Open Lancha', 'Activ 555 Open Lancha',
    'Activ 605 Open Lancha', 'Activ 675 Open Lancha',
    'Activ 505 Cabin Lancha', 'Activ 555 Cabin Lancha', 'Activ 605 Cruiser Lancha',
    'Activ 755 Cruiser Lancha', 'Activ 875 Sundeck Lancha'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Princecraft
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'princecraft';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Princecraft') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Ventura 190 Lancha', 'Ventura 222 Lancha', 'Ventura 224 Lancha',
    'Hudson DL 170 Lancha Pesca', 'Holiday DL 160 Lancha Pesca',
    'Vectra 21 Pontón', 'Vectra 23 Pontón', 'Sportfisher 23 Pontón'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Zodiac
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'zodiac';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Zodiac') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Cadet 270 Bote Inflable', 'Cadet 310 Bote Inflable', 'Cadet 360 Bote Inflable',
    'Medline 580 Semirrígido', 'Medline 660 Semirrígido', 'Medline 740 Semirrígido',
    'Pro 550 Semirrígido', 'Pro 650 Semirrígido',
    'N-ZO 680 Semirrígido', 'N-ZO 760 Semirrígido'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Evinrude
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'evinrude';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Evinrude') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'E-TEC 25 Motor Fuera de Borda', 'E-TEC 40 Motor Fuera de Borda', 'E-TEC 60 Motor Fuera de Borda',
    'E-TEC 75 Motor Fuera de Borda', 'E-TEC 90 Motor Fuera de Borda', 'E-TEC 115 Motor Fuera de Borda',
    'E-TEC 150 Motor Fuera de Borda', 'E-TEC G2 200 Motor Fuera de Borda', 'E-TEC G2 250 Motor Fuera de Borda',
    'E-TEC G2 300 Motor Fuera de Borda'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Tohatsu
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'tohatsu';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Tohatsu') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'MFS 20 Motor Fuera de Borda', 'MFS 25 Motor Fuera de Borda', 'MFS 30 Motor Fuera de Borda',
    'MFS 50 Motor Fuera de Borda', 'MFS 60 Motor Fuera de Borda', 'MFS 75 Motor Fuera de Borda',
    'MFS 90 Motor Fuera de Borda', 'MFS 100 Motor Fuera de Borda', 'MFS 115 Motor Fuera de Borda',
    'BFT 200 Motor Fuera de Borda', 'BFT 250 Motor Fuera de Borda'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Jeanneau
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'jeanneau';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Jeanneau') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Cap Camarat 5.5 Lancha', 'Cap Camarat 6.5 Lancha', 'Cap Camarat 7.5 Lancha', 'Cap Camarat 9.0 Lancha',
    'Merry Fisher 605 Lancha Pesca', 'Merry Fisher 695 Lancha Pesca', 'Merry Fisher 795 Lancha Pesca', 'Merry Fisher 895 Lancha Pesca',
    'Sun Odyssey 319 Velero', 'Sun Odyssey 349 Velero', 'Sun Odyssey 380 Velero', 'Sun Odyssey 410 Velero', 'Sun Odyssey 440 Velero',
    'NC 37 Crucero', 'NC 33 Crucero'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Beneteau
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'beneteau';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Beneteau') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Flyer 5.5 Lancha', 'Flyer 6.6 Lancha', 'Flyer 7.7 Lancha', 'Flyer 8.8 Lancha', 'Flyer 9 Lancha',
    'Barracuda 6 Lancha Pesca', 'Barracuda 7 Lancha Pesca', 'Barracuda 8 Lancha Pesca',
    'Antares 6 Lancha', 'Antares 7 Lancha', 'Antares 8 Lancha', 'Antares 9 Lancha', 'Antares 11 Lancha',
    'Oceanis 30.1 Velero', 'Oceanis 34.1 Velero', 'Oceanis 38.1 Velero', 'Oceanis 40.1 Velero', 'Oceanis 46.1 Velero',
    'Gran Turismo 32 Crucero', 'Gran Turismo 36 Crucero', 'Gran Turismo 41 Crucero'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Robalo
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'robalo';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Robalo') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'R160 Lancha', 'R180 Lancha', 'R200 Lancha', 'R222 Lancha', 'R230 Lancha',
    'R242 Lancha', 'R250 Lancha', 'R272 Lancha', 'R302 Lancha', 'R360 Lancha',
    'Cayman 206 Lancha', 'Cayman 226 Lancha', 'Cayman 246 Lancha'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- Wellcraft
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'wellcraft';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Wellcraft') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Fisherman 182 Lancha Pesca', 'Fisherman 202 Lancha Pesca', 'Fisherman 222 Lancha Pesca',
    'Fisherman 242 Lancha Pesca', 'Fisherman 262 Lancha Pesca', 'Fisherman 302 Lancha Pesca',
    'Fisherman 352 Lancha Pesca', 'Fisherman 402 Lancha Pesca'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;

-- ============================================================================
-- CATEGORIES FOR ALL VEHICLE TYPES
-- ============================================================================

-- Truck categories
INSERT INTO categories (name) SELECT n FROM unnest(ARRAY[
  'Camión Rígido',
  'Tractocamión',
  'Camión Tolva',
  'Camión Pluma',
  'Camión Cisterna',
  'Camión Frigorífico',
  'Camión Plataforma',
  'Camión Portacontenedores',
  'Bus',
  'Minibús'
]) AS n WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER(n));

-- Machinery categories
INSERT INTO categories (name) SELECT n FROM unnest(ARRAY[
  'Excavadora',
  'Retroexcavadora',
  'Cargador Frontal',
  'Bulldozer',
  'Motoniveladora',
  'Rodillo Compactador',
  'Minicargador',
  'Mini Excavadora',
  'Grúa',
  'Manipulador Telescópico',
  'Tractor Agrícola',
  'Cosechadora',
  'Camión Articulado',
  'Generador',
  'Compresor',
  'Montacargas',
  'Plataforma Elevadora'
]) AS n WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER(n));

-- Nautical categories
INSERT INTO categories (name) SELECT n FROM unnest(ARRAY[
  'Lancha',
  'Moto de Agua',
  'Velero',
  'Yate',
  'Bote Inflable',
  'Semirrígido',
  'Pontón',
  'Crucero',
  'Catamarán',
  'Kayak',
  'Motor Fuera de Borda',
  'Lancha de Pesca'
]) AS n WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER(n));
