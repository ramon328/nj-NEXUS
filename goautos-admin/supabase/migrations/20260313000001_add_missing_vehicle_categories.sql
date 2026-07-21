-- Agregar categorías de vehículos faltantes
INSERT INTO categories (name) SELECT n FROM unnest(ARRAY[
  'Automóvil',
  'Camión',
  'Bus',
  'Micro bus',
  'Cabezal',
  'Convertible',
  'Deportivo',
  'Limusina',
  'Buggy',
  'Motorhome',
  'Ambulancia',
  'Cuatriciclo',
  'Triciclo',
  'Kart',
  'Bote',
  'Lancha',
  'Yate',
  'Jet Ski',
  'Maquinaria',
  'Otro'
]) AS n WHERE NOT EXISTS (SELECT 1 FROM categories WHERE LOWER(name) = LOWER(n));
