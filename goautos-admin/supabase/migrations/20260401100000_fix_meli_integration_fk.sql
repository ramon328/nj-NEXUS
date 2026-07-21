-- Fix: meli_integration.user_id should reference clients, not users
-- The column stores client_id values, not user_id values
ALTER TABLE meli_integration DROP CONSTRAINT meli_integration_user_id_fkey;
ALTER TABLE meli_integration ADD CONSTRAINT meli_integration_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES clients(id);
