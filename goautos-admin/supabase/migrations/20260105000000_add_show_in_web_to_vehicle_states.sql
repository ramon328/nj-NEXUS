-- Add show_in_web column to clients_vehicles_states table
-- This allows configuring which vehicle states should display vehicles on the public website

-- IMPORTANT: Using DEFAULT NULL instead of DEFAULT FALSE for safety
-- This ensures that if the UPDATE below fails for any reason,
-- the fallback logic in the frontend will still work (NULL = use name-based filtering)
ALTER TABLE clients_vehicles_states
ADD COLUMN IF NOT EXISTS show_in_web BOOLEAN DEFAULT NULL;

-- Set show_in_web = true for existing states with names 'Publicado', 'Reservado', 'Vendido'
-- This maintains backward compatibility with the current behavior
UPDATE clients_vehicles_states
SET show_in_web = TRUE
WHERE name IN ('Publicado', 'Reservado', 'Vendido');

-- Set show_in_web = false for other existing states (those NOT in the web)
UPDATE clients_vehicles_states
SET show_in_web = FALSE
WHERE name NOT IN ('Publicado', 'Reservado', 'Vendido')
  AND show_in_web IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN clients_vehicles_states.show_in_web IS 'Indicates if vehicles in this state should be visible on the public website. NULL = use fallback (name-based filtering)';
