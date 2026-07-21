-- =============================================
-- Toggle por cliente: "ventas exentas de IVA".
--
-- En Chile la venta de autos USADOS está exenta de IVA. El cálculo de la
-- comisión/neto del vendedor (sellerCalculation / useSellerDashboard) aplica
-- IVA 19/119 sobre el margen por defecto, lo que reduce indebidamente la
-- comisión/utilidad para automotoras que venden usados (reportado por Beichek).
--
-- Cuando este flag está en true, el IVA se trata como 0 en esos cálculos.
-- Default false → comportamiento previo (19%) para no cambiar a nadie.
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'ventas_exentas_iva'
  ) THEN
    ALTER TABLE clients ADD COLUMN ventas_exentas_iva BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN clients.ventas_exentas_iva IS
      'Cuando es true, las ventas del cliente se tratan como exentas de IVA (ej. autos usados): IVA=0 en el cálculo de comisión/neto del vendedor.';
  END IF;
END $$;
