-- La ficha técnica se guarda como documento (vehicles_documents con type='spec_sheet'),
-- pero el CHECK de `type` del schema base no incluía 'spec_sheet' → el INSERT daba 400
-- ("no se hacen las fichas"). Quitamos cualquier CHECK sobre `type` que lo bloquee
-- (la app valida los tipos en código). Seguro: solo elimina una restricción, no toca datos.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'vehicles_documents'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE vehicles_documents DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
