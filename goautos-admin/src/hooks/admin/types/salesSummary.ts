export interface SaleSummaryRow {
  saleId: number;                    // vehicles_sales.id
  vehicleId: number;                 // vehicles_sales.vehicle_id
  customerName: string;              // customers.first_name + last_name
  customerEmail: string;             // customers.email
  customerPhone: string;             // customers.phone
  customerId: number;                // Para abrir modal
  sellerName: string;                // users.first_name + last_name
  saleDate: string;                  // vehicles_sales.sale_date
  vehiclePatent: string;             // vehicles.license_plate
  vehicleBrand: string;              // brands.name
  vehicleModel: string;              // models.name
  vehicleVersion: string;            // models.name (incluye versión)
  vehicleYear: number;               // vehicles.year
  acquisitionType: string;           // "Comprado" o "Consignado"
  acquisitionPrice: number | null;   // costo de adquisición canónico (compra / pago al consignante)
  extrasCost: number;                // Gastos adicionales netos (vehicles_extras)
  salePrice: number;                 // vehicles_sales.sale_price
  commission: number;                // owned: comisión vendedor; consignado: ganancia de la automotora
  /** Utilidad BRUTA canónica (antes de comisión vendedor; incluye financiera). */
  grossProfit: number;
  profit: number | null;             // utilidad NETA c/comisión (== aporte al total del dashboard)
  vehicleMainImage: string | null;   // vehicles.main_image
}
