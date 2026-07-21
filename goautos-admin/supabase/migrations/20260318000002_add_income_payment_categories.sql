-- =============================================
-- Agregar categorías de ingreso para métodos de pago
-- Solicitado por Romina: opciones de categoría al añadir ingreso
-- =============================================

INSERT INTO transaction_categories (value, label_es, label_en, type, sort_order, is_active, level)
VALUES
  ('efectivo', 'Efectivo', 'Cash', 'income', 10, true, 0),
  ('tarjeta_credito', 'Tarjeta de crédito', 'Credit Card', 'income', 20, true, 0),
  ('tarjeta_debito', 'Tarjeta de débito', 'Debit Card', 'income', 30, true, 0),
  ('deposito_bancario', 'Depósito bancario', 'Bank Deposit', 'income', 40, true, 0),
  ('transferencia_bancaria', 'Transferencia bancaria', 'Bank Transfer', 'income', 50, true, 0),
  ('financiamiento_autofin', 'Financiamiento Autofin', 'Autofin Financing', 'income', 60, true, 0),
  ('financiamiento_global', 'Financiamiento Global', 'Global Financing', 'income', 70, true, 0)
ON CONFLICT DO NOTHING;
