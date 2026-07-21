-- SEO: horarios de atención por sucursal, para emitir openingHoursSpecification
-- en el schema AutoDealer del sitio público.
--
-- Forma esperada (JSONB), claves de día en inglés (alineadas con el builder
-- de datos estructurados del website):
--   {
--     "monday":    { "open": "09:00", "close": "18:00" },
--     "tuesday":   { "open": "09:00", "close": "18:00" },
--     "saturday":  { "open": "10:00", "close": "14:00" },
--     "sunday":    { "closed": true }
--   }
-- Días ausentes o { "closed": true } no se emiten (se asumen cerrados).
--
-- Nota: las redes sociales (sameAs) viven en clients.seo.social_links (JSONB),
-- por lo que no requieren migración.

ALTER TABLE dealerships
  ADD COLUMN IF NOT EXISTS opening_hours jsonb;
