-- =============================================
-- 1. Agregar categorías de automóviles faltantes
-- 2. Agregar campo traction (tracción) a vehicles
-- =============================================

-- Categorías de automóviles solicitadas
INSERT INTO categories (name) SELECT n FROM unnest(ARRAY[
  'City Car',
  'Sedán',
  'Hatchback',
  'SUV',
  'Furgón',
  'Van',
  'Minivan',
  'Camioneta',
  'Station Wagon',
  'Crossover',
  'Coupé',
  'Moto'
]) AS n WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER(n));

-- Campo de tracción en vehículos
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS traction TEXT;

COMMENT ON COLUMN vehicles.traction IS 'Tipo de tracción: 4x2, 4x4, AWD';

-- Marca náutica: Sea Ray + modelo Select 210
DO $$
DECLARE v_brand_id TEXT;
BEGIN
  SELECT id INTO v_brand_id FROM brands WHERE LOWER(name) = 'sea ray';
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (id, name) VALUES (gen_random_uuid()::text, 'Sea Ray') RETURNING id INTO v_brand_id;
  END IF;
  INSERT INTO models (name, brand_id) SELECT n, v_brand_id FROM unnest(ARRAY[
    'Select 210', 'SPX 190', 'SPX 210', 'SPX 230',
    'SLX 250', 'SLX 260', 'SLX 280', 'SLX 310', 'SLX 350', 'SLX 400',
    'SDX 250', 'SDX 270', 'SDX 290',
    'Sundancer 320', 'Sundancer 350', 'Sundancer 370', 'Sundancer 400',
    'Fly 400', 'Fly 520',
    'Sport Boat 190 SPX', 'Sport Boat 210 SPX',
    'Bowrider 190', 'Bowrider 210', 'Bowrider 250'
  ]) AS n WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = LOWER(n));
END $$;
