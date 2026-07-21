-- Allow 'ai' as a valid source_type for tasks created by GAIA
ALTER TABLE tasks DROP CONSTRAINT tasks_source_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_source_type_check CHECK (source_type = ANY (ARRAY['checklist'::text, 'manual'::text, 'ai'::text]));
