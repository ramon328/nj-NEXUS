-- Agrega photo_signature a chileautos_listing.
-- Guarda la "firma" del set de fotos (main + gallery, URLs base) que se envió por última
-- vez a ChileAutos. En un update automático (p.ej. editar el precio) la edge function
-- compara la firma actual contra esta: si no cambió, OMITE Media en el PATCH para que el
-- merge-patch conserve la galería y NO se re-dispare el reproceso async de ChileAutos que
-- bota las fotos. Nullable: las publicaciones existentes quedan en NULL y se setean en su
-- próximo sync (con NULL el default seguro es NO reenviar fotos = preservar la galería).
ALTER TABLE chileautos_listing
  ADD COLUMN IF NOT EXISTS photo_signature text;

COMMENT ON COLUMN chileautos_listing.photo_signature IS
  'Firma (URLs base de main+gallery, unidas por |) del set de fotos enviado por última vez a ChileAutos. Se usa para omitir Media en updates cuando la galería no cambió y así no botar las fotos.';
