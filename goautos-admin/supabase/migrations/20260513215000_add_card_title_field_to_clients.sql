-- Adds a per-client setting that controls how vehicle card titles are rendered
-- on the public site, including the fixed /vehicles page (which is not
-- builder-editable).
--
-- Allowed values:
--   - NULL or 'model'  -> show model as title, brand+year as subtitle (default)
--   - 'brand'          -> show brand as title, model+year as subtitle
--   - 'brand_model'    -> show "brand model" as title, year as subtitle
--
-- Requested by client movek (id 297).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS card_title_field text
  CHECK (card_title_field IN ('model', 'brand', 'brand_model'));

COMMENT ON COLUMN public.clients.card_title_field IS
  'Controls vehicle card title rendering on the public site. NULL or model = show model (default), brand = show brand, brand_model = show brand + model together.';
