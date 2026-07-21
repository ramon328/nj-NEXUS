-- Backfill: Insert default vehicle states for any client that has NONE
INSERT INTO clients_vehicles_states (client_id, name, description, color, "order", is_disabled, show_in_web)
SELECT
  c.id,
  v.name,
  v.description,
  v.color,
  v.ord,
  v.is_disabled,
  v.show_in_web
FROM clients c
CROSS JOIN (
  VALUES
    ('Revisión Mecánica',  'Vehículo en proceso de diagnóstico y evaluación técnica para garantizar su correcto funcionamiento.',                   '#9ca3af', 1, false, false),
    ('Preparación',        'Vehículo en fase de acondicionamiento estético, incluyendo limpieza detallada y pulido para optimizar su presentación.','#ef4444', 2, false, false),
    ('Listo para la foto', 'Vehículo completamente preparado para la sesión fotográfica profesional y captura de contenido multimedia.',             '#f59e0b', 3, false, false),
    ('Publicado',          'Vehículo verificado y disponible para venta, con presencia activa en plataformas digitales y catálogo web.',             '#3b82f6', 4, true,  true),
    ('Reservado',          'Vehículo apartado temporalmente para un cliente interesado, pendiente de formalizar la compra.',                        '#8b5cf6', 5, true,  true),
    ('Vendido',            'Vehículo adquirido por un cliente, proceso de compra finalizado y en trámites de transferencia de propiedad.',          '#10b981', 6, true,  true)
) AS v(name, description, color, ord, is_disabled, show_in_web)
WHERE NOT EXISTS (
  SELECT 1 FROM clients_vehicles_states cvs WHERE cvs.client_id = c.id
);

-- Backfill: Set a default name for any dealership that has NULL or empty name
UPDATE dealerships
SET name = CONCAT('Sucursal #', id)
WHERE name IS NULL OR name = '';
