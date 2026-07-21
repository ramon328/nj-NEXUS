-- =============================================
-- Sistema de Roles y Permisos Personalizables
-- =============================================

-- 1. Tabla de permisos disponibles en el sistema
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de roles personalizados por cliente
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, name)
);

-- 3. Tabla de relacion roles-permisos
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- 4. Agregar columna role_id a users (mantener rol por backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id);
  END IF;
END $$;

-- 5. Insertar permisos predefinidos
INSERT INTO permissions (code, name, description, category) VALUES
  -- General
  ('dashboard.view', 'Ver Dashboard (Básico)', 'Acceso al panel principal con vista limitada', 'general'),
  ('dashboard.view_full', 'Ver Dashboard Completo', 'Acceso al panel principal con todas las métricas y estadísticas', 'general'),
  ('documents.view', 'Ver Documentos', 'Acceso a la seccion de documentos', 'general'),
  ('documents.create', 'Crear Documentos', 'Crear nuevos documentos', 'general'),
  ('documents.delete', 'Eliminar Documentos', 'Eliminar documentos existentes', 'general'),
  ('updates.view', 'Ver Novedades', 'Acceso a la seccion de novedades', 'general'),

  -- Inventario
  ('vehicles.view', 'Ver Vehiculos', 'Acceso a la lista de vehiculos', 'inventory'),
  ('vehicles.create', 'Crear Vehiculos', 'Agregar nuevos vehiculos al inventario', 'inventory'),
  ('vehicles.edit', 'Editar Vehiculos', 'Modificar vehiculos existentes', 'inventory'),
  ('vehicles.delete', 'Eliminar Vehiculos', 'Eliminar vehiculos del inventario', 'inventory'),
  ('appraiser.view', 'Ver Tasador', 'Acceso a la herramienta de tasacion', 'inventory'),

  -- Marketing
  ('marketing.view', 'Ver Marketing IA', 'Acceso al marketing con IA', 'marketing'),
  ('instagram.view', 'Ver Instagram', 'Acceso a integracion de Instagram', 'marketing'),
  ('mercadolibre.view', 'Ver Mercado Libre', 'Acceso a integracion de Mercado Libre', 'marketing'),
  ('facebook.view', 'Ver Facebook Marketplace', 'Acceso a Facebook Marketplace', 'marketing'),

  -- Comercial
  ('leads.view', 'Ver Leads', 'Acceso a la lista de leads', 'commercial'),
  ('leads.manage', 'Gestionar Leads', 'Crear, editar y asignar leads', 'commercial'),
  ('clients.view', 'Ver Clientes', 'Acceso a la lista de clientes', 'commercial'),
  ('clients.create', 'Crear Clientes', 'Registrar nuevos clientes', 'commercial'),
  ('clients.edit', 'Editar Clientes', 'Modificar datos de clientes', 'commercial'),
  ('sales.view', 'Ver Ventas', 'Acceso al listado de ventas', 'commercial'),
  ('sales.create', 'Crear Ventas', 'Registrar nuevas ventas', 'commercial'),
  ('sales.edit', 'Editar Ventas', 'Modificar ventas existentes', 'commercial'),
  ('financing.view', 'Ver Financiamiento', 'Acceso a solicitudes de financiamiento', 'commercial'),
  ('scheduling.view', 'Ver Agendamientos', 'Acceso a calendario de citas', 'commercial'),

  -- Administracion
  ('configuration.view', 'Ver Configuracion', 'Acceso a configuracion general', 'administration'),
  ('configuration.edit', 'Editar Configuracion', 'Modificar configuracion', 'administration'),
  ('team.view', 'Ver Equipo', 'Acceso a gestion de equipo', 'administration'),
  ('team.manage', 'Gestionar Equipo', 'Crear, editar y eliminar usuarios', 'administration'),
  ('roles.manage', 'Gestionar Roles', 'Crear, editar y eliminar roles', 'administration'),
  ('builder.view', 'Ver Builder', 'Acceso al constructor de sitio web', 'administration')
ON CONFLICT (code) DO NOTHING;

-- 6. Crear roles por defecto para cada cliente existente
INSERT INTO roles (client_id, name, description, is_system_role)
SELECT id, 'Administrador', 'Acceso completo a todas las funcionalidades', true
FROM clients
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE roles.client_id = clients.id AND roles.name = 'Administrador'
);

INSERT INTO roles (client_id, name, description, is_system_role)
SELECT id, 'Vendedor', 'Acceso limitado para vendedores', true
FROM clients
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE roles.client_id = clients.id AND roles.name = 'Vendedor'
);

-- 7. Asignar todos los permisos al rol Administrador
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrador'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 8. Asignar permisos limitados al rol Vendedor
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.view',
  'documents.view',
  'vehicles.view',
  'appraiser.view',
  'marketing.view',
  'leads.view',
  'clients.view'
)
WHERE r.name = 'Vendedor'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 9. Migrar usuarios existentes: asignar role_id basado en 'rol' string
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.client_id = r.client_id
  AND u.role_id IS NULL
  AND (
    (u.rol = 'admin' AND r.name = 'Administrador')
    OR (u.rol IN ('seller', 'vendedor') AND r.name = 'Vendedor')
  );

-- 10. Habilitar RLS en las nuevas tablas
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- 11. Politicas RLS para permissions (lectura publica, los permisos son globales)
CREATE POLICY "Anyone can view permissions"
ON permissions FOR SELECT
USING (true);

-- 12. Politicas RLS para roles
CREATE POLICY "Users can view roles in their client"
ON roles FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Users with team.manage can insert roles"
ON roles FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT u.client_id FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.auth_id = auth.uid() AND p.code = 'roles.manage'
  )
);

CREATE POLICY "Users with team.manage can update roles"
ON roles FOR UPDATE
USING (
  client_id IN (
    SELECT u.client_id FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.auth_id = auth.uid() AND p.code = 'roles.manage'
  )
);

CREATE POLICY "Users with team.manage can delete non-system roles"
ON roles FOR DELETE
USING (
  is_system_role = false
  AND client_id IN (
    SELECT u.client_id FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.auth_id = auth.uid() AND p.code = 'roles.manage'
  )
);

-- 13. Politicas RLS para role_permissions
CREATE POLICY "Users can view role_permissions in their client"
ON role_permissions FOR SELECT
USING (
  role_id IN (
    SELECT r.id FROM roles r
    WHERE r.client_id IN (
      SELECT client_id FROM users WHERE auth_id = auth.uid()
    )
  )
);

CREATE POLICY "Users with roles.manage can modify role_permissions"
ON role_permissions FOR ALL
USING (
  role_id IN (
    SELECT r.id FROM roles r
    WHERE r.client_id IN (
      SELECT u.client_id FROM users u
      JOIN roles ur ON u.role_id = ur.id
      JOIN role_permissions rp ON rp.role_id = ur.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.auth_id = auth.uid() AND p.code = 'roles.manage'
    )
  )
);

-- 14. Crear indice para mejorar performance de consultas de permisos
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_client_id ON roles(client_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- 15. Funcion para obtener permisos de un usuario
CREATE OR REPLACE FUNCTION get_user_permissions(user_auth_id UUID)
RETURNS TABLE(permission_code VARCHAR(50)) AS $$
BEGIN
  RETURN QUERY
  SELECT p.code
  FROM users u
  JOIN roles r ON u.role_id = r.id
  JOIN role_permissions rp ON rp.role_id = r.id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE u.auth_id = user_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
