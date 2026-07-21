import * as XLSX from 'xlsx';
import { Vehicle } from '@/types/vehicle';
import { Lead } from '@/types/leads';
import { formatDate } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getCustomerDisplayName } from '@/utils/customerName';
import { getLeadOrigin } from '@/components/leads/leadOrigin';
import {
  getMultipleVehicleChecklistSummaries,
  formatChecklistSummaryForExcel,
} from '@/services/vehicleChecklistService';
import { type AssumedBy } from '@/utils/vehicleNetProfit';
import { lineCostBasis } from '@/utils/fiscalCredit';
import { getVehicleRegimen } from '@/utils/vehicleRegimen';
import {
  normalizeSoldVehicle,
  type RawSoldVehicleBundle,
} from '@/utils/soldVehicleFinancials';

interface ExcelExportOptions {
  vehicles: Vehicle[];
  selectedColumns: Array<{
    field: string;
    label: string;
    format?: string;
  }>;
  exportMode?: 'all' | 'selected';
  filename?: string;
  userRole?: string;
  /** When true, admin-only columns (purchase_price, net_profit, etc.) are included */
  isAdminOrSuperadmin?: boolean;
}

// Calcula utilidad neta vía el helper unificado.
// Resultado idéntico a useVehicleFinancialData y useTotalNetProfit.
const calculateNetProfit = async (vehicle: Vehicle): Promise<number | null> => {
  try {
    const vehicleId = vehicle.id;
    if (!vehicleId) return null;

    const statusName = vehicle.status?.name?.toLowerCase() || '';
    const isSoldByStatus =
      statusName.includes('vendido') || statusName.includes('sold');
    if (!isSoldByStatus) return null;

    const isConsigned = vehicle.is_consigned || false;

    const [salesResult, acquisitionResult, extrasResult, closeDealResult] =
      await Promise.all([
        supabase
          .from('vehicles_sales')
          .select(
            'id, sale_price, financing_commission, commission_amount, transfer_value, transfer_value_charged'
          )
          .eq('vehicle_id', vehicleId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        isConsigned
          ? supabase
              .from('vehicles_consignments')
              .select('*')
              .eq('vehicle_id', vehicleId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : supabase
              .from('vehicles_purchases')
              .select('purchase_price, genera_credito_fiscal')
              .eq('vehicle_id', vehicleId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),

        supabase
          .from('vehicles_extras')
          .select('type, amount, assumed_by, genera_credito_fiscal, is_passthrough')
          .eq('vehicle_id', vehicleId),

        isConsigned
          ? supabase
              .from('vehicles_documents')
              .select('vehicles_close_deal!inner(dealershipCommission, discount)')
              .eq('vehicle_id', vehicleId)
              .eq('type', 'close_deal')
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as const),
      ]);

    const saleData = salesResult.data as any;
    if (!saleData) return null;
    const acquisitionData = acquisitionResult.data as any;
    const extrasData = extrasResult.data || [];
    // Embed uno-a-muchos → PostgREST lo devuelve como array; normalizar a la 1ª fila
    // (si se lee como objeto, dealershipCommission queda undefined y el margen del
    // consignado con cierre de negocio sale mal en el Excel).
    const rawCloseDeal = (closeDealResult as any)?.data?.vehicles_close_deal;
    const closeDeal = Array.isArray(rawCloseDeal) ? rawCloseDeal[0] : rawCloseDeal;

    // Comisión del vendedor canónica: Σ splits, fallback legacy commission_amount.
    const { data: splitsRaw } = await supabase
      .from('sale_commission_splits')
      .select('amount')
      .eq('sale_id', saleData.id);
    const splitsTotal =
      splitsRaw && splitsRaw.length > 0
        ? splitsRaw.reduce((s, r: any) => s + (Number(r.amount) || 0), 0)
        : null;

    const bundle: RawSoldVehicleBundle = {
      saleId: saleData.id,
      vehicleId,
      saleDate: null,
      sellerId: null,
      isConsigned,
      salePrice: saleData.sale_price,
      commissionAmount: saleData.commission_amount,
      financingCommission: saleData.financing_commission,
      purchasePrice: !isConsigned ? acquisitionData?.purchase_price ?? null : null,
      // IVA de compra (auto propio): si la compra genera crédito fiscal, el costo entra neto.
      purchaseGeneraCreditoFiscal: !isConsigned
        ? acquisitionData?.genera_credito_fiscal ?? null
        : null,
      consignment: isConsigned
        ? {
            agreedPrice: acquisitionData?.agreed_price ?? null,
            agreedPriceFinal: acquisitionData?.agreed_price_final ?? null,
            method: acquisitionData?.metodo_consignacion ?? undefined,
            commissionPercentage:
              acquisitionData?.porcentaje_comision_consignacion ?? null,
            commissionFixed: acquisitionData?.monto_fijo_comision_consignacion ?? null,
          }
        : null,
      closeDeal: closeDeal
        ? {
            dealershipCommission: closeDeal.dealershipCommission ?? null,
            discount: closeDeal.discount ?? null,
          }
        : null,
      extras: extrasData.map((e: any) => ({
        amount: Number(e.amount || 0),
        type: e.type,
        assumedBy: (e.assumed_by ?? 'dealership') as AssumedBy,
        // Regla 3: IVA por línea. Sin esto el Excel trataba TODO gasto como total
        // (no neto) y la utilidad exportada divergía del detalle/dashboard.
        generaCreditoFiscal: e.genera_credito_fiscal ?? null,
        // Pass-through: fuera del margen (informativo). Igual que detalle/dashboard.
        isPassthrough: e.is_passthrough ?? null,
      })),
      splitsTotal,
      // Regla 4: transferencia de salida (pass-through salvo que la automotora la
      // absorba en auto propio → castiga margen). Antes el Excel la ignoraba.
      transferValue: saleData.transfer_value ?? null,
      transferValueCharged: saleData.transfer_value_charged ?? null,
    };

    // Columna "Utilidad Neta" = utilidad BRUTA canónica (igual que el detalle).
    return normalizeSoldVehicle(bundle).grossProfit;
  } catch (error) {
    return null;
  }
};

// Función para calcular los gastos totales de un vehículo
// (precio de compra/consignación + extras tipo expense + valor transferencia)
const calculateTotalExpenses = async (vehicle: Vehicle): Promise<number | null> => {
  try {
    const vehicleId = vehicle.id;
    if (!vehicleId) return null;

    const isConsigned = vehicle.is_consigned || false;

    // Obtener precio base de adquisición
    let acquisitionData: { purchase_price?: number; agreed_price?: number; genera_credito_fiscal?: boolean | null } | null = null;
    if (isConsigned) {
      const { data } = await supabase
        .from('vehicles_consignments')
        .select('agreed_price')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      acquisitionData = data;
    } else {
      const { data } = await supabase
        .from('vehicles_purchases')
        .select('purchase_price, genera_credito_fiscal')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      acquisitionData = data;
    }

    // Para consignados, el agreed_price solo cuenta si hubo venta
    // (consistente con calculateNetProfit)
    let baseExpense = 0;
    if (!isConsigned) {
      // Regla 3: la compra con factura afecta entra por su NETO (el IVA es crédito
      // recuperable, no costo), igual que los gastos. Antes sumaba el BRUTO y
      // "Gastos Totales" no cuadraba con la Utilidad Neta ni con los gastos.
      baseExpense = lineCostBasis(
        acquisitionData?.purchase_price || 0,
        acquisitionData?.genera_credito_fiscal ?? null
      );
    } else {
      const statusName = vehicle.status?.name?.toLowerCase() || '';
      const isSold = statusName.includes('vendido') || statusName.includes('sold');
      if (isSold) {
        baseExpense = acquisitionData?.agreed_price || 0;
      }
    }

    // Sumar gastos asumidos por la automotora: type='expense' + adicionales de
    // venta (sale_additional/sale_income) con assumed_by='dealership'. Antes sólo
    // contaba 'expense' y sub-reportaba los gastos de cierre cargados como adicionales.
    const { data: extrasData } = await supabase
      .from('vehicles_extras')
      .select('amount, type, assumed_by, genera_credito_fiscal, is_passthrough')
      .eq('vehicle_id', vehicleId);

    const additionalExpenses = (extrasData || [])
      .filter((extra) => {
        // Pass-through: dinero solo traspasado → NO es gasto real (fuera del margen).
        if ((extra as any).is_passthrough === true) return false;
        const ab = (extra as any).assumed_by ?? 'dealership';
        // Alineado con partitionExtras (fuente única del margen): sólo son GASTO de la
        // automotora 'expense' y 'sale_additional' con assumed_by='dealership'.
        // 'sale_income' es SIEMPRE ingreso (no gasto) → contarlo acá lo doble-contaba
        // (ingreso en la utilidad + gasto en gastos totales). 'income' tampoco es gasto.
        if (extra.type === 'expense') return ab === 'dealership';
        if (extra.type === 'sale_additional') return ab === 'dealership';
        return false;
      })
      // Regla 3: cada línea entra por su NETO si genera crédito fiscal (igual que el
      // helper de margen). Antes sumaba el total → "Gastos Totales" divergía del resumen.
      .reduce(
        (sum, extra) =>
          sum +
          lineCostBasis(
            Number(extra.amount || 0),
            (extra as any).genera_credito_fiscal ?? null
          ),
        0
      );

    return baseExpense + additionalExpenses;
  } catch (error) {
    return null;
  }
};

export const exportVehiclesToExcel = async ({
  vehicles,
  selectedColumns,
  exportMode = 'all',
  filename = 'vehiculos-en-stock',
  userRole,
  isAdminOrSuperadmin,
}: ExcelExportOptions) => {
  // Columnas que solo pueden exportar los administradores
  const adminOnlyColumns = [
    'min_price',
    'purchase_price',
    'transfer_value',
    'net_profit',
    'total_expenses',
  ];

  // Función para filtrar columnas según permisos
  const filterColumnsByRole = (
    columns: Array<{ field: string; label: string; format?: string }>
  ) => {
    // Use the new flag if provided, fall back to legacy role check
    const hasAdminAccess = isAdminOrSuperadmin !== undefined
      ? isAdminOrSuperadmin
      : userRole !== 'seller';
    if (!hasAdminAccess) {
      return columns.filter(
        (column) => !adminOnlyColumns.includes(column.field)
      );
    }
    return columns;
  };

  // Todas las columnas disponibles por defecto
  const allAvailableColumns = [
    { field: 'vehicle', label: 'Vehículo', format: 'text' },
    { field: 'year', label: 'Año', format: 'number' },
    { field: 'mileage', label: 'Kilometraje', format: 'number' },
    { field: 'status', label: 'Estado', format: 'text' },
    { field: 'category', label: 'Categoría', format: 'text' },
    { field: 'brand', label: 'Marca', format: 'text' },
    { field: 'model', label: 'Modelo', format: 'text' },
    { field: 'color', label: 'Color', format: 'text' },
    { field: 'condition', label: 'Condición', format: 'text' },
    { field: 'fuel_type', label: 'Combustible', format: 'text' },
    {
      field: 'min_price',
      label: 'Precio Mínimo de Venta',
      format: 'price',
    },
    {
      field: 'price',
      label: 'Precio Publicado',
      format: 'price',
    },
    {
      field: 'sale_price',
      label: 'Precio de Venta',
      format: 'price',
    },
    {
      field: 'purchase_price',
      label: 'Precio Compra/Consignación',
      format: 'price',
    },
    {
      field: 'transfer_value',
      label: 'Valor Transferencia',
      format: 'price',
    },
    { field: 'net_profit', label: 'Utilidad Neta', format: 'price' },
    { field: 'total_expenses', label: 'Gastos Totales', format: 'price' },
    { field: 'seller', label: 'Vendedor', format: 'text' },
    {
      field: 'is_consigned',
      label: 'En Consignación',
      format: 'boolean',
    },
    { field: 'created_at', label: 'Fecha Creación', format: 'date' },
    {
      field: 'updated_at',
      label: 'Última Actualización',
      format: 'date',
    },
    { field: 'vin', label: 'VIN', format: 'text' },
    { field: 'license_plate', label: 'Placa', format: 'text' },
    { field: 'engine_number', label: 'Número Motor', format: 'text' },
    { field: 'description', label: 'Descripción', format: 'text' },
    { field: 'tech_inspection_expiry', label: 'Venc. Revisión Técnica', format: 'date' },
    { field: 'circulation_permit_expiry', label: 'Venc. Permiso de Circulación', format: 'date' },
    { field: 'emissions_expiry', label: 'Venc. SOAP', format: 'date' },
    { field: 'permit_municipality', label: 'Municipalidad', format: 'text' },
    { field: 'checklist_status', label: 'Checklist', format: 'text' },
    { field: 'checklist_pending', label: 'Items Pendientes', format: 'text' },
  ];

  // Exportar todas las columnas o solo las seleccionadas según el modo
  const columnsToExport = exportMode === 'selected' && selectedColumns.length > 0
    ? filterColumnsByRole(selectedColumns)
    : filterColumnsByRole(allAvailableColumns);
  // Función para obtener el valor de una celda
  const getCellValue = async (
    vehicle: Vehicle,
    field: string,
    format?: string
  ): Promise<unknown> => {
    let value: unknown;

    // Casos especiales para campos que necesitan consultas adicionales
    if (field === 'sale_price') {
      // Para sale_price, verificar si está vendido y obtener sale_price
      const statusName = vehicle.status?.name?.toLowerCase() || '';
      const isSoldByStatus =
        statusName.includes('vendido') || statusName.includes('sold');

      if (isSoldByStatus && vehicle.id) {
        try {
          const { data: saleData } = await supabase
            .from('vehicles_sales')
            .select('sale_price')
            .eq('vehicle_id', vehicle.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (saleData) {
            value = saleData.sale_price;
          }
        } catch (error) {
          console.error('Error fetching sale price for Excel:', error);
        }
      }
      // Si no está vendido, no mostrar nada (vacío)
      if (!isSoldByStatus) {
        return '';
      }
    } else if (field === 'purchase_price') {
      // Para purchase_price, obtener desde vehicles_purchases o vehicles_consignments
      if (vehicle.id) {
        try {
          if (vehicle.is_consigned) {
            // Si es consignado, obtener agreed_price de vehicles_consignments
            const { data: consignmentData } = await supabase
              .from('vehicles_consignments')
              .select('agreed_price')
              .eq('vehicle_id', vehicle.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (consignmentData) {
              value = consignmentData.agreed_price;
            }
          } else {
            // Si no es consignado, obtener purchase_price de vehicles_purchases
            const { data: purchaseData } = await supabase
              .from('vehicles_purchases')
              .select('purchase_price')
              .eq('vehicle_id', vehicle.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (purchaseData) {
              value = purchaseData.purchase_price;
            }
          }
        } catch (error) {
          console.error(
            'Error fetching purchase/consignment price for Excel:',
            error
          );
        }
      }
    } else {
      // Manejar propiedades anidadas
      if (field.includes('.')) {
        const parts = field.split('.');
        value = parts.reduce((obj, part) => obj?.[part], vehicle);
      } else {
        value = vehicle[field as keyof Vehicle];
      }
    }

    // Aplicar formato según el tipo
    switch (format) {
      case 'price':
        return value && value !== 0 ? Math.round(Number(value)) : '';

      case 'number':
        return value ? Number(value) : '';

      case 'boolean':
        return value === true ? 'Sí' : value === false ? 'No' : '';

      case 'date':
        return value ? formatDate(String(value)) : '';

      case 'badge':
      case 'text':
      default:
        // Manejar objetos con propiedad name
        if (value && typeof value === 'object' && 'name' in value) {
          return (value as { name: string }).name;
        }
        return String(value || '');
    }
  };

  // Función para calcular días en stock
  const calculateDaysInStock = (vehicle: Vehicle): number => {
    if (!vehicle.created_at) return 0;
    const creationDate = new Date(vehicle.created_at);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate.getTime() - creationDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Obtener resúmenes de checklist para todos los vehículos
  const vehicleIds = vehicles.map((v) => v.id).filter((id): id is number => id !== undefined);
  let checklistSummaries = new Map();
  try {
    checklistSummaries = await getMultipleVehicleChecklistSummaries(vehicleIds);
  } catch (error) {
    console.error('Error fetching checklist summaries for Excel:', error);
  }

  // Preparar los datos para Excel
  const excelData = await Promise.all(
    vehicles.map(async (vehicle) => {
      const row: Record<string, unknown> = {};

      // Agregar cada columna seleccionada
      for (const column of columnsToExport) {
        let value: unknown;

        if (column.field === 'vehicle') {
          // Para la columna vehículo, combinar marca, modelo y año
          const brandName = vehicle.brand?.name || '';
          const modelName = vehicle.model?.name || '';
          const year = vehicle.year || '';
          value = [brandName, modelName, year].filter(Boolean).join(' ');
        } else if (
          column.field === 'created_at' &&
          column.format === 'number'
        ) {
          // Para días en stock
          value = calculateDaysInStock(vehicle);
        } else if (column.field === 'seller') {
          // Para vendedor
          if (vehicle.seller_id && vehicle.seller) {
            value = `${vehicle.seller.first_name} ${vehicle.seller.last_name}`;
          } else if (vehicle.seller_id) {
            value = `ID: ${vehicle.seller_id}`;
          } else {
            value = 'No Asignado';
          }
        } else if (column.field === 'net_profit') {
          // Para utilidad neta, calcular el valor real
          const netProfit = await calculateNetProfit(vehicle);
          if (netProfit !== null) {
            // Redondear a números enteros para consistencia con la plataforma web
            value = Math.round(netProfit);
          } else {
            // Verificar si el vehículo está vendido
            const statusName = vehicle.status?.name?.toLowerCase() || '';
            const isSoldByStatus =
              statusName.includes('vendido') || statusName.includes('sold');
            if (isSoldByStatus) {
              value = 'Error en cálculo';
            } else {
              value = 'No vendido';
            }
          }
        } else if (column.field === 'total_expenses') {
          // Gastos totales: compra/consignación + extras + transferencia
          const total = await calculateTotalExpenses(vehicle);
          value = total !== null ? Math.round(total) : '';
        } else if (column.field === 'checklist_status') {
          // Para el estado del checklist
          const summary = vehicle.id ? checklistSummaries.get(vehicle.id) : null;
          if (summary) {
            value = formatChecklistSummaryForExcel(summary);
          } else {
            value = 'Sin checklist';
          }
        } else if (column.field === 'checklist_pending') {
          // Detalle de items pendientes del checklist
          const summary = vehicle.id ? checklistSummaries.get(vehicle.id) : null;
          if (!summary || summary.total === 0) {
            value = '';
          } else if (summary.pending === 0) {
            value = '✓ Completo';
          } else {
            value = (summary.pendingItemLabels ?? []).join(', ');
          }
        } else {
          value = await getCellValue(vehicle, column.field, column.format);
        }

        row[column.label] = value;
      }

      return row;
    })
  );

  // Crear el libro de trabajo
  const workbook = XLSX.utils.book_new();

  // Crear la hoja de trabajo
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Configurar el ancho de las columnas
  const columnWidths = columnsToExport.map(() => ({ wch: 20 }));
  worksheet['!cols'] = columnWidths;

  // Agregar la hoja al libro
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Vehículos en Stock');

  // Generar el nombre del archivo con fecha
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const finalFilename = `${filename}_${dateStr}.xlsx`;

  // Descargar el archivo
  XLSX.writeFile(workbook, finalFilename);
};

// ==========================================
// EXPORTACIÓN DE RESUMEN DE VENTAS
// ==========================================

export interface SaleSummaryRow {
  saleId: number;
  vehicleId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerId: number;
  sellerName: string;
  saleDate: string;
  vehiclePatent: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleVersion: string;
  vehicleYear: number;
  acquisitionType: string;
  acquisitionPrice: number | null;
  extrasCost: number;
  salePrice: number;
  commission: number;
  profit: number | null;
}

interface SalesExportOptions {
  sales: SaleSummaryRow[];
  filename?: string;
  language?: 'es' | 'en';
}

export const exportSalesSummaryToExcel = ({
  sales,
  filename = 'resumen-ventas',
  language = 'es',
}: SalesExportOptions) => {
  const labels = {
    es: {
      saleId: 'ID Venta',
      vehicleId: 'ID Vehículo',
      vehiclePatent: 'Patente',
      vehicle: 'Vehículo',
      vehicleYear: 'Año',
      saleDate: 'Fecha Venta',
      customerName: 'Cliente',
      customerEmail: 'Email',
      customerPhone: 'Teléfono',
      sellerName: 'Vendedor',
      acquisitionType: 'Tipo Adquisición',
      acquisitionPrice: 'Precio Adquisición',
      extrasCost: 'Gastos Adicionales',
      salePrice: 'Precio Venta',
      commission: 'Comisión',
      profit: 'Ganancia Neta',
    },
    en: {
      saleId: 'Sale ID',
      vehicleId: 'Vehicle ID',
      vehiclePatent: 'License Plate',
      vehicle: 'Vehicle',
      vehicleYear: 'Year',
      saleDate: 'Sale Date',
      customerName: 'Customer',
      customerEmail: 'Email',
      customerPhone: 'Phone',
      sellerName: 'Seller',
      acquisitionType: 'Acquisition Type',
      acquisitionPrice: 'Acquisition Price',
      extrasCost: 'Additional Expenses',
      salePrice: 'Sale Price',
      commission: 'Commission',
      profit: 'Net Profit',
    },
  };

  const l = labels[language];

  // Preparar datos para Excel
  const excelData = sales.map((sale) => ({
    [l.saleId]: sale.saleId,
    [l.vehicleId]: sale.vehicleId,
    [l.vehiclePatent]: sale.vehiclePatent || '',
    [l.vehicle]: `${sale.vehicleBrand} ${sale.vehicleModel}`,
    [l.vehicleYear]: sale.vehicleYear,
    [l.saleDate]: sale.saleDate ? formatDate(sale.saleDate) : '',
    [l.customerName]: sale.customerName || '',
    [l.customerEmail]: sale.customerEmail || '',
    [l.customerPhone]: sale.customerPhone || '',
    [l.sellerName]: sale.sellerName || '',
    [l.acquisitionType]: sale.acquisitionType || '',
    [l.acquisitionPrice]: sale.acquisitionPrice ?? '',
    [l.extrasCost]: sale.extrasCost || 0,
    [l.salePrice]: sale.salePrice || 0,
    [l.commission]: sale.commission || 0,
    [l.profit]: sale.profit ?? '',
  }));

  // Agregar fila de totales
  const totals = {
    [l.saleId]: '',
    [l.vehicleId]: '',
    [l.vehiclePatent]: '',
    [l.vehicle]: 'TOTALES',
    [l.vehicleYear]: '',
    [l.saleDate]: '',
    [l.customerName]: '',
    [l.customerEmail]: '',
    [l.customerPhone]: '',
    [l.sellerName]: '',
    [l.acquisitionType]: '',
    [l.acquisitionPrice]: sales.reduce((sum, s) => sum + (s.acquisitionPrice || 0), 0),
    [l.extrasCost]: sales.reduce((sum, s) => sum + (s.extrasCost || 0), 0),
    [l.salePrice]: sales.reduce((sum, s) => sum + (s.salePrice || 0), 0),
    [l.commission]: sales.reduce((sum, s) => sum + (s.commission || 0), 0),
    [l.profit]: sales.reduce((sum, s) => sum + (s.profit || 0), 0),
  };

  excelData.push(totals);

  // Crear libro de trabajo
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 10 }, // ID Venta
    { wch: 10 }, // ID Vehículo
    { wch: 12 }, // Patente
    { wch: 25 }, // Vehículo
    { wch: 8 },  // Año
    { wch: 12 }, // Fecha
    { wch: 25 }, // Cliente
    { wch: 25 }, // Email
    { wch: 15 }, // Teléfono
    { wch: 20 }, // Vendedor
    { wch: 15 }, // Tipo Adquisición
    { wch: 15 }, // Precio Adquisición
    { wch: 15 }, // Gastos
    { wch: 15 }, // Precio Venta
    { wch: 12 }, // Comisión
    { wch: 15 }, // Ganancia
  ];

  const sheetName = language === 'es' ? 'Resumen Ventas' : 'Sales Summary';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generar nombre del archivo con fecha
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const finalFilename = `${filename}_${dateStr}.xlsx`;

  // Descargar archivo
  XLSX.writeFile(workbook, finalFilename);
};

// ==========================================
// EXPORTACIÓN DE RESUMEN DE COSTOS
// ==========================================

export interface CostItem {
  id: number;
  vehicleId: number | null;
  vehicleInfo: string;
  title: string;
  description: string;
  amount: number;
  type: 'expense' | 'acquisition' | 'commission';
  categoryId: number | null;
  categoryNameEs: string;
  categoryNameEn: string;
  createdAt: string;
}

interface CostsExportOptions {
  costs: CostItem[];
  filename?: string;
  language?: 'es' | 'en';
}

export const exportCostsSummaryToExcel = ({
  costs,
  filename = 'resumen-costos',
  language = 'es',
}: CostsExportOptions) => {
  const labels = {
    es: {
      id: 'ID',
      vehicleId: 'ID Vehículo',
      vehicleInfo: 'Vehículo',
      title: 'Título',
      description: 'Descripción',
      amount: 'Monto',
      type: 'Tipo',
      category: 'Categoría',
      date: 'Fecha',
      typeLabels: {
        expense: 'Gasto',
        acquisition: 'Compra',
        commission: 'Comisión',
      },
    },
    en: {
      id: 'ID',
      vehicleId: 'Vehicle ID',
      vehicleInfo: 'Vehicle',
      title: 'Title',
      description: 'Description',
      amount: 'Amount',
      type: 'Type',
      category: 'Category',
      date: 'Date',
      typeLabels: {
        expense: 'Expense',
        acquisition: 'Purchase',
        commission: 'Commission',
      },
    },
  };

  const l = labels[language];

  // Preparar datos para Excel
  const excelData = costs.map((cost) => ({
    [l.id]: cost.id,
    [l.vehicleId]: cost.vehicleId ?? '',
    [l.vehicleInfo]: cost.vehicleInfo || '',
    [l.title]: cost.title || '',
    [l.description]: cost.description || '',
    [l.amount]: cost.amount || 0,
    [l.type]: l.typeLabels[cost.type] || cost.type,
    [l.category]: language === 'es' ? cost.categoryNameEs : cost.categoryNameEn,
    [l.date]: cost.createdAt ? formatDate(cost.createdAt) : '',
  }));

  // Agregar fila de totales
  const totals = {
    [l.id]: '',
    [l.vehicleId]: '',
    [l.vehicleInfo]: '',
    [l.title]: 'TOTAL',
    [l.description]: '',
    [l.amount]: costs.reduce((sum, c) => sum + (c.amount || 0), 0),
    [l.type]: '',
    [l.category]: '',
    [l.date]: '',
  };

  excelData.push(totals);

  // Crear libro de trabajo
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 10 }, // ID
    { wch: 12 }, // ID Vehículo
    { wch: 25 }, // Vehículo
    { wch: 25 }, // Título
    { wch: 40 }, // Descripción
    { wch: 15 }, // Monto
    { wch: 12 }, // Tipo
    { wch: 20 }, // Categoría
    { wch: 12 }, // Fecha
  ];

  const sheetName = language === 'es' ? 'Resumen Costos' : 'Costs Summary';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generar nombre del archivo con fecha
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const finalFilename = `${filename}_${dateStr}.xlsx`;

  // Descargar archivo
  XLSX.writeFile(workbook, finalFilename);
};

// ==========================================
// EXPORTACIÓN DE TRANSACCIONES POR CLIENTE/PROVEEDOR
// ==========================================

export interface CustomerTransactionRow {
  transactionId: number;
  transactionType: 'sale' | 'purchase' | 'consignment';
  transactionDate: string;
  // Vehicle info
  vehicleId: number;
  vehiclePatent: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number;
  // Customer/Provider info
  personId: number;
  personName: string;
  personEmail: string;
  personPhone: string;
  personRut: string;
  // Financial info
  acquisitionPrice: number | null;
  additionalExpenses: number;
  salePrice: number | null;
  commission: number;
  netProfit: number | null;
}

interface CustomerTransactionsExportOptions {
  transactions: CustomerTransactionRow[];
  filename?: string;
  language?: 'es' | 'en';
}

export const exportCustomerTransactionsToExcel = ({
  transactions,
  filename = 'transacciones-clientes',
  language = 'es',
}: CustomerTransactionsExportOptions) => {
  const labels = {
    es: {
      transactionId: 'ID Operación',
      transactionType: 'Tipo de Operación',
      transactionDate: 'Fecha',
      vehiclePatent: 'Patente',
      vehicle: 'Vehículo',
      vehicleYear: 'Año',
      personName: 'Cliente/Proveedor',
      personEmail: 'Email',
      personPhone: 'Teléfono',
      personRut: 'RUT',
      acquisitionPrice: 'Precio Adquisición',
      additionalExpenses: 'Gastos Adicionales',
      salePrice: 'Precio Venta',
      commission: 'Comisión',
      netProfit: 'Ganancia Neta',
      typeLabels: {
        sale: 'Venta',
        purchase: 'Compra',
        consignment: 'Consignación',
      },
    },
    en: {
      transactionId: 'Transaction ID',
      transactionType: 'Transaction Type',
      transactionDate: 'Date',
      vehiclePatent: 'License Plate',
      vehicle: 'Vehicle',
      vehicleYear: 'Year',
      personName: 'Customer/Supplier',
      personEmail: 'Email',
      personPhone: 'Phone',
      personRut: 'Tax ID',
      acquisitionPrice: 'Acquisition Price',
      additionalExpenses: 'Additional Expenses',
      salePrice: 'Sale Price',
      commission: 'Commission',
      netProfit: 'Net Profit',
      typeLabels: {
        sale: 'Sale',
        purchase: 'Purchase',
        consignment: 'Consignment',
      },
    },
  };

  const l = labels[language];

  // Preparar datos para Excel
  const excelData = transactions.map((tx) => ({
    [l.transactionId]: tx.transactionId,
    [l.transactionType]: l.typeLabels[tx.transactionType] || tx.transactionType,
    [l.transactionDate]: tx.transactionDate ? formatDate(tx.transactionDate) : '',
    [l.vehiclePatent]: tx.vehiclePatent || '',
    [l.vehicle]: `${tx.vehicleBrand} ${tx.vehicleModel}`.trim(),
    [l.vehicleYear]: tx.vehicleYear || '',
    [l.personName]: tx.personName || '',
    [l.personEmail]: tx.personEmail || '',
    [l.personPhone]: tx.personPhone || '',
    [l.personRut]: tx.personRut || '',
    [l.acquisitionPrice]: tx.acquisitionPrice ?? '',
    [l.additionalExpenses]: tx.additionalExpenses || 0,
    [l.salePrice]: tx.salePrice ?? '',
    [l.commission]: tx.commission || 0,
    [l.netProfit]: tx.netProfit ?? '',
  }));

  // Agregar fila de totales
  const salesOnly = transactions.filter(t => t.transactionType === 'sale');
  const totals = {
    [l.transactionId]: '',
    [l.transactionType]: '',
    [l.transactionDate]: '',
    [l.vehiclePatent]: '',
    [l.vehicle]: `TOTALES (${transactions.length} registros)`,
    [l.vehicleYear]: '',
    [l.personName]: '',
    [l.personEmail]: '',
    [l.personPhone]: '',
    [l.personRut]: '',
    [l.acquisitionPrice]: transactions.reduce((sum, t) => sum + (t.acquisitionPrice || 0), 0),
    [l.additionalExpenses]: transactions.reduce((sum, t) => sum + (t.additionalExpenses || 0), 0),
    [l.salePrice]: salesOnly.reduce((sum, t) => sum + (t.salePrice || 0), 0),
    [l.commission]: salesOnly.reduce((sum, t) => sum + (t.commission || 0), 0),
    [l.netProfit]: salesOnly.reduce((sum, t) => sum + (t.netProfit || 0), 0),
  };

  excelData.push(totals);

  // Crear libro de trabajo
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 12 }, // ID Operación
    { wch: 15 }, // Tipo
    { wch: 12 }, // Fecha
    { wch: 12 }, // Patente
    { wch: 25 }, // Vehículo
    { wch: 8 },  // Año
    { wch: 25 }, // Cliente/Proveedor
    { wch: 25 }, // Email
    { wch: 15 }, // Teléfono
    { wch: 12 }, // RUT
    { wch: 15 }, // Precio Adquisición
    { wch: 15 }, // Gastos
    { wch: 15 }, // Precio Venta
    { wch: 12 }, // Comisión
    { wch: 15 }, // Ganancia
  ];

  const sheetName = language === 'es' ? 'Transacciones' : 'Transactions';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generar nombre del archivo con fecha
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const finalFilename = `${filename}_${dateStr}.xlsx`;

  // Descargar archivo
  XLSX.writeFile(workbook, finalFilename);
};

// ==========================================
// EXPORTACIÓN DE LEADS
// ==========================================
// Espeja el export de Contactos de ChileAutos (Nombre, RUT, Tipo, Estado, Email,
// Contacto, Marca, Modelo, Año, Precio, Patente, Fecha) y AGREGA "Vendedor
// Asignado". Opera siempre sobre el array ya filtrado por el hook (respeta la
// visibilidad por vendedor: la tabla `leads` no tiene RLS). Para leads de
// ChileAutos los datos del vehículo no quedan en campos estructurados sino en
// `chileautos_leads.raw_payload`, así que los enriquecemos con una sola consulta.

const LEAD_TYPE_LABELS: Record<'es' | 'en', Record<string, string>> = {
  es: {
    'buy-direct': 'Compra Directa',
    'buy-consignment': 'Consignación',
    'search-request': 'Buscar tu Auto',
    'sell-vehicle': 'Venta Vehículo',
    'sell-financing': 'Financiamiento',
    'sell-transfer': 'Transferencia',
    'contact-general': 'Contacto General',
  },
  en: {
    'buy-direct': 'Direct Purchase',
    'buy-consignment': 'Consignment',
    'search-request': 'Car Search',
    'sell-vehicle': 'Vehicle Sale',
    'sell-financing': 'Financing',
    'sell-transfer': 'Transfer',
    'contact-general': 'General Contact',
  },
};

const LEAD_STATUS_LABELS: Record<'es' | 'en', Record<string, string>> = {
  es: { pending: 'Pendiente', assigned: 'Asignado', completed: 'Completado', cancelled: 'Cancelado' },
  en: { pending: 'Pending', assigned: 'Assigned', completed: 'Completed', cancelled: 'Cancelled' },
};

/** Datos del vehículo del lead, con fallbacks por origen (estructurado → search_params → ChileAutos). */
function getLeadVehicleInfo(
  lead: Lead,
  caPayload?: any
): { brand: string; model: string; year: number | ''; price: number | ''; plate: string } {
  const v: any = lead.vehicle;
  const sp = (lead.search_params ?? {}) as Record<string, unknown>;

  let brand = v?.brand?.name || v?.brand_name || (lead.search_brand as any)?.name || '';
  let model = v?.model?.name || v?.model_name || (lead.search_model as any)?.name || '';
  let year: number | '' = typeof v?.year === 'number' ? v.year : '';
  let price: number | '' = typeof v?.price === 'number' ? v.price : '';
  let plate = v?.license_plate || '';

  if (!brand && typeof sp.brand === 'string') brand = sp.brand;
  if (!model && typeof sp.model === 'string') model = sp.model;
  if (year === '' && typeof sp.year === 'number') year = sp.year as number;
  if (price === '' && typeof sp.price === 'number') price = sp.price as number;

  // Enriquecimiento ChileAutos (raw_payload): Item.Specification + Registration + PriceList.
  if (caPayload) {
    const spec = caPayload?.Item?.Specification;
    if (!brand) brand = spec?.Make || '';
    if (!model) model = spec?.Model || '';
    if (year === '' && typeof spec?.ReleaseDate?.Year === 'number') year = spec.ReleaseDate.Year;
    const amount = caPayload?.Item?.PriceList?.[0]?.Amount;
    if (price === '' && typeof amount === 'number') price = amount;
    if (!plate) plate = caPayload?.Item?.Registration?.Number || '';
  }

  return { brand, model, year, price, plate };
}

interface LeadsExportOptions {
  leads: Lead[];
  /** Cliente actual: para enriquecer leads de ChileAutos con su raw_payload. */
  clientId?: number;
  filename?: string;
  language?: 'es' | 'en';
}

export const exportLeadsToExcel = async ({
  leads,
  clientId,
  filename = 'leads',
  language = 'es',
}: LeadsExportOptions) => {
  const l =
    language === 'en'
      ? {
          customerName: 'Customer Name', rut: 'Tax ID', type: 'Lead Type', status: 'Status',
          email: 'Email', phone: 'Contact Number', origin: 'Origin', brand: 'Make', model: 'Model',
          year: 'Year', price: 'Price', plate: 'License Plate', assignee: 'Assigned Seller',
          receivedAt: 'Lead Received Date', unassigned: 'Unassigned', sheet: 'Leads',
          originChileautos: 'ChileAutos', originOther: 'Others',
        }
      : {
          customerName: 'Nombre Cliente', rut: 'RUT', type: 'Tipo de Lead', status: 'Estado',
          email: 'Dirección Email', phone: 'Número de Contacto', origin: 'Origen', brand: 'Marca',
          model: 'Modelo', year: 'Año', price: 'Precio', plate: 'Patente', assignee: 'Vendedor Asignado',
          receivedAt: 'Fecha recepción lead', unassigned: 'Sin asignar', sheet: 'Leads',
          originChileautos: 'ChileAutos', originOther: 'Otros',
        };

  // Enriquecimiento ChileAutos: una sola consulta por todos los leads CA exportados.
  const caPayloadByLeadId = new Map<number, any>();
  const caLeadIds = leads
    .filter((lead) => getLeadOrigin(lead).isChileautos)
    .map((lead) => Number(lead.id))
    .filter((id) => Number.isFinite(id));

  if (caLeadIds.length > 0) {
    try {
      let q = supabase
        .from('chileautos_leads')
        .select('lead_id, raw_payload')
        .in('lead_id', caLeadIds);
      if (clientId) q = q.eq('client_id', clientId);
      const { data } = await q;
      (data || []).forEach((row: any) => {
        if (row.lead_id != null) caPayloadByLeadId.set(Number(row.lead_id), row.raw_payload);
      });
    } catch (err) {
      console.error('Error enriqueciendo leads de ChileAutos para export:', err);
    }
  }

  const labels = LEAD_TYPE_LABELS[language];
  const statuses = LEAD_STATUS_LABELS[language];

  const excelData = leads.map((lead) => {
    const veh = getLeadVehicleInfo(lead, caPayloadByLeadId.get(Number(lead.id)));
    const assignee = lead.assigned_user
      ? `${lead.assigned_user.first_name || ''} ${lead.assigned_user.last_name || ''}`.trim()
      : '';
    const origin = getLeadOrigin(lead);
    return {
      [l.customerName]: getCustomerDisplayName(lead.customer) || '',
      [l.rut]: lead.customer?.rut || '',
      [l.type]: labels[lead.type] || lead.type,
      [l.status]: statuses[lead.status] || lead.status,
      [l.email]: lead.customer?.email || '',
      [l.phone]: lead.customer?.phone || '',
      [l.origin]: origin.isChileautos ? l.originChileautos : l.originOther,
      [l.brand]: veh.brand,
      [l.model]: veh.model,
      [l.year]: veh.year,
      [l.price]: veh.price,
      [l.plate]: veh.plate,
      [l.assignee]: assignee || l.unassigned,
      [l.receivedAt]: lead.created_at ? formatDate(lead.created_at) : '',
    };
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  worksheet['!cols'] = [
    { wch: 25 }, // Nombre Cliente
    { wch: 14 }, // RUT
    { wch: 16 }, // Tipo
    { wch: 12 }, // Estado
    { wch: 26 }, // Email
    { wch: 16 }, // Contacto
    { wch: 12 }, // Origen
    { wch: 16 }, // Marca
    { wch: 18 }, // Modelo
    { wch: 8 },  // Año
    { wch: 14 }, // Precio
    { wch: 12 }, // Patente
    { wch: 22 }, // Vendedor
    { wch: 16 }, // Fecha
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, l.sheet);

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
};

// ==========================================
// PLANTILLA DE IMPORTACIÓN DE VEHÍCULOS
// ==========================================

export const downloadVehicleImportTemplate = () => {
  const headers = [
    'Marca',
    'Modelo',
    'Año',
    'Precio',
    'Kilometraje',
    'Patente',
    'Color',
    'Combustible',
    'Transmisión',
    'Tracción',
    'Condición',
    'Categoría',
    'Descripción',
    'N° Motor',
    'N° Chasis',
    'Dueños',
    'Llaves',
  ];

  const exampleRow: Record<string, string | number> = {
    'Marca': 'Toyota',
    'Modelo': 'Corolla',
    'Año': 2022,
    'Precio': 15000000,
    'Kilometraje': 35000,
    'Patente': 'ABCD12',
    'Color': 'Blanco',
    'Combustible': 'Bencina',
    'Transmisión': 'Automática',
    'Tracción': '4x2',
    'Condición': 'Usado',
    'Categoría': 'Sedán',
    'Descripción': 'Vehículo en excelente estado',
    'N° Motor': 'ABC123456',
    'N° Chasis': 'XYZ789012',
    'Dueños': 1,
    'Llaves': 2,
  };

  const instructionsData = [
    { 'Columna': 'Marca', 'Requerido': 'Sí', 'Descripción': 'Nombre de la marca del vehículo (ej: Toyota, Hyundai, Chevrolet)' },
    { 'Columna': 'Modelo', 'Requerido': 'Sí', 'Descripción': 'Nombre del modelo del vehículo (ej: Corolla, Tucson, Spark)' },
    { 'Columna': 'Año', 'Requerido': 'Sí', 'Descripción': 'Año del vehículo (número, ej: 2022)' },
    { 'Columna': 'Precio', 'Requerido': 'Sí', 'Descripción': 'Precio publicado del vehículo (número sin puntos ni comas, ej: 15000000)' },
    { 'Columna': 'Kilometraje', 'Requerido': 'No', 'Descripción': 'Kilometraje del vehículo (número, ej: 35000)' },
    { 'Columna': 'Patente', 'Requerido': 'No', 'Descripción': 'Placa/patente del vehículo (ej: ABCD12)' },
    { 'Columna': 'Color', 'Requerido': 'No', 'Descripción': 'Color del vehículo. Debe coincidir con un color existente en el sistema' },
    { 'Columna': 'Combustible', 'Requerido': 'No', 'Descripción': 'Tipo de combustible (ej: Bencina, Diésel, Eléctrico, Híbrido)' },
    { 'Columna': 'Transmisión', 'Requerido': 'No', 'Descripción': 'Tipo de transmisión (ej: Automática, Manual)' },
    { 'Columna': 'Tracción', 'Requerido': 'No', 'Descripción': 'Tipo de tracción (ej: 4x2, 4x4, AWD)' },
    { 'Columna': 'Condición', 'Requerido': 'No', 'Descripción': 'Condición del vehículo (ej: Nuevo, Usado)' },
    { 'Columna': 'Categoría', 'Requerido': 'No', 'Descripción': 'Categoría del vehículo (ej: Sedán, SUV, Camioneta, Hatchback)' },
    { 'Columna': 'Descripción', 'Requerido': 'No', 'Descripción': 'Descripción libre del vehículo' },
    { 'Columna': 'N° Motor', 'Requerido': 'No', 'Descripción': 'Número de motor del vehículo' },
    { 'Columna': 'N° Chasis', 'Requerido': 'No', 'Descripción': 'Número de chasis/VIN del vehículo' },
    { 'Columna': 'Dueños', 'Requerido': 'No', 'Descripción': 'Número de dueños anteriores (número, ej: 1)' },
    { 'Columna': 'Llaves', 'Requerido': 'No', 'Descripción': 'Número de llaves disponibles (número, ej: 2)' },
  ];

  const workbook = XLSX.utils.book_new();

  // Hoja 1: Plantilla con ejemplo
  const templateData = [exampleRow];
  const templateSheet = XLSX.utils.json_to_sheet(templateData, { header: headers });
  templateSheet['!cols'] = headers.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(workbook, templateSheet, 'Vehículos');

  // Hoja 2: Instrucciones
  const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
  instructionsSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

  XLSX.writeFile(workbook, 'plantilla_importacion_vehiculos.xlsx');
};

// ──────────────────────────────────────────────────────────────────────────
// Export "con TODO" — detalle LÍNEA POR LÍNEA (libro mayor por vehículo).
// Cada gasto / ingreso / pago / cuota / comisión / compra / venta / consignación
// es UNA fila, etiquetada con el vehículo, para auditar peso por peso.
// ──────────────────────────────────────────────────────────────────────────

export interface FullDetailExportOptions {
  // Lista de vehículos del cliente (con joins brand/model/status).
  vehicles: any[];
  filename?: string;
  // Dato financiero sensible: solo admins/superadmin.
  isAdminOrSuperadmin?: boolean;
}

export const exportVehiclesFullDetailToExcel = async ({
  vehicles,
  filename = 'detalle-completo-por-linea',
  isAdminOrSuperadmin = false,
}: FullDetailExportOptions) => {
  if (!isAdminOrSuperadmin) return; // el detalle financiero es admin-only
  const vehicleIds = vehicles.map((v) => v.id).filter(Boolean) as number[];
  if (vehicleIds.length === 0) return;

  const vinfo = new Map<number, any>();
  vehicles.forEach((v) => vinfo.set(v.id, v));

  // Fetch en lotes para no pasarnos con el .in() en tenants grandes.
  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };
  const inBatches = async (
    ids: (number | string)[],
    fetcher: (batch: (number | string)[]) => Promise<any[]>
  ): Promise<any[]> => {
    const acc: any[] = [];
    for (const batch of chunk(ids, 200)) acc.push(...(await fetcher(batch)));
    return acc;
  };

  const [extras, purchases, consignments, sales] = await Promise.all([
    inBatches(vehicleIds, async (b) => (await supabase.from('vehicles_extras').select('*').in('vehicle_id', b)).data || []),
    inBatches(vehicleIds, async (b) => (await supabase.from('vehicles_purchases').select('*').in('vehicle_id', b)).data || []),
    inBatches(vehicleIds, async (b) => (await supabase.from('vehicles_consignments').select('*').in('vehicle_id', b)).data || []),
    inBatches(vehicleIds, async (b) => (await supabase.from('vehicles_sales').select('*').in('vehicle_id', b)).data || []),
  ]);

  const saleIds = sales.map((s: any) => s.id).filter(Boolean);
  const splits = saleIds.length
    ? await inBatches(saleIds, async (b) => (await supabase.from('sale_commission_splits').select('*').in('sale_id', b)).data || [])
    : [];

  const closeDealDocs = await inBatches(vehicleIds, async (b) =>
    (await supabase.from('vehicles_documents').select('id, vehicle_id').in('vehicle_id', b).eq('type', 'close_deal')).data || []
  );
  const docToVehicle = new Map<number, number>();
  closeDealDocs.forEach((d: any) => docToVehicle.set(d.id, d.vehicle_id));
  const docIds = closeDealDocs.map((d: any) => d.id);
  const closeDeals = docIds.length
    ? await inBatches(docIds, async (b) => (await supabase.from('vehicles_close_deal').select('*').in('document_id', b)).data || [])
    : [];

  const fmtD = (d?: string) => (d ? new Date(d).toLocaleDateString('es-CL') : '');
  const lado = (ab?: string) =>
    ab === 'customer' ? 'Cliente' : ab === 'consignor' ? 'Consignador' : 'Automotora';
  const base = (vid: number) => {
    const v = vinfo.get(vid) || {};
    return {
      'Patente': v.license_plate || '',
      'Marca': v.brand?.name || '',
      'Modelo': v.model?.name || '',
      'Año': v.year || '',
      'Estado': v.status?.name || '',
      'Consignado': v.is_consigned ? 'Sí' : 'No',
    };
  };
  const row = (
    vid: number,
    tipo: string,
    concepto: string,
    monto: number,
    ladoStr: string,
    fecha: string,
    notas = ''
  ) => ({ ...base(vid), 'Tipo': tipo, 'Concepto': concepto, 'Monto': monto, 'Lado': ladoStr, 'Fecha': fecha, 'Notas': notas });

  const rows: any[] = [];

  purchases.forEach((p: any) =>
    rows.push(row(p.vehicle_id, 'Compra', 'Precio de compra', Number(p.purchase_price) || 0, 'Automotora', fmtD(p.purchase_date || p.created_at), p.genera_credito_fiscal ? 'Con crédito fiscal' : ''))
  );

  consignments.forEach((c: any) =>
    rows.push(row(c.vehicle_id, 'Consignación', 'Precio acordado (consignador)', Number(c.agreed_price_final ?? c.agreed_price) || 0, 'Consignador', fmtD(c.created_at), c.metodo_consignacion || ''))
  );

  const saleToVehicle = new Map<number, number>();
  sales.forEach((s: any) => {
    saleToVehicle.set(s.id, s.vehicle_id);
    rows.push(row(s.vehicle_id, 'Venta', 'Precio de venta', Number(s.sale_price) || 0, 'Cliente', fmtD(s.sale_date || s.created_at), s.payment_method || ''));
    if (Number(s.transfer_value) > 0)
      rows.push(row(s.vehicle_id, 'Transferencia', 'Valor transferencia', Number(s.transfer_value), 'Cliente', fmtD(s.sale_date || s.created_at), s.transfer_value_charged === false ? 'No cobrada' : ''));
    if (Number(s.financing_commission) > 0)
      rows.push(row(s.vehicle_id, 'Comisión financiera', s.financiera || 'Financiera', Number(s.financing_commission), 'Automotora', fmtD(s.sale_date || s.created_at)));
    let pb: any = s.payment_breakdown;
    try { if (typeof pb === 'string') pb = JSON.parse(pb); } catch { pb = null; }
    if (Array.isArray(pb))
      pb.forEach((p: any) => {
        const pending = p.paid === false;
        rows.push(row(s.vehicle_id, pending ? 'Cuota/Letra a plazo' : 'Pago', p.title || 'Pago', Number(p.amount) || 0, 'Cliente', p.dueDate ? fmtD(p.dueDate) : fmtD(s.sale_date), pending ? 'Pendiente' : 'Pagado'));
      });
  });

  const tipoExtra: Record<string, string> = {
    expense: 'Gasto', income: 'Ingreso', sale_additional: 'Adicional venta',
    sale_income: 'Ingreso venta', reservation_payment: 'Pago reserva', reservation_additional: 'Adicional reserva',
  };
  extras.forEach((e: any) =>
    rows.push(row(
      e.vehicle_id,
      tipoExtra[e.type] || e.type,
      e.title || e.description || '',
      Number(e.amount) || 0,
      lado(e.assumed_by),
      fmtD(e.created_at),
      // Pass-through: dinero solo traspasado, NO afecta el margen (se marca en Notas
      // para que el detalle línea-por-línea deje claro que no suma a la utilidad).
      [
        e.is_passthrough ? 'Pass-through (no afecta margen)' : '',
        e.genera_credito_fiscal ? 'Con crédito fiscal' : '',
      ].filter(Boolean).join(' · ')
    ))
  );

  closeDeals.forEach((cd: any) => {
    const vid = docToVehicle.get(cd.document_id);
    if (vid) rows.push(row(vid, 'Comisión automotora (cierre)', 'Comisión cierre de negocio', Number(cd.dealershipCommission) || 0, 'Automotora', ''));
  });

  splits.forEach((sp: any) => {
    const vid = saleToVehicle.get(sp.sale_id);
    if (vid) rows.push(row(vid, 'Comisión vendedor', sp.vendedor_nombre_snapshot || 'Vendedor', Number(sp.amount) || 0, 'Automotora', fmtD(sp.created_at), sp.base_type || ''));
  });

  // Cada auto junto (por patente) y, dentro, ordenado por tipo.
  rows.sort(
    (a, b) =>
      String(a['Patente']).localeCompare(String(b['Patente'])) ||
      String(a['Tipo']).localeCompare(String(b['Tipo']))
  );

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 6 }, { wch: 14 }, { wch: 10 },
    { wch: 24 }, { wch: 32 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Detalle por línea');
  XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ══════════════════════════════════════════════════════════════════════════
// RESUMEN AUTOMOTORA — formato exacto pedido por Mallorca (contador Joaquín).
// Libro con 2 hojas: "Transacciones" (una fila por compra/venta, con los gastos
// del auto por categoría en la fila de la COMPRA) y "Dashboard" (filtro de
// período + resumen financiero + IVA + gastos por categoría).
//
// ⚠️ RÉGIMEN DE IVA — GENERAL (no el régimen de margen del sistema):
//   El excel de Joaco define el IVA en régimen GENERAL:
//     · IVA Débito  = IVA de las VENTAS afectas.
//     · IVA Crédito = IVA de las COMPRAS afectas + IVA de los GASTOS afectos.
//     · IVA Neto a Pagar = Débito − Crédito.
//   Esto NO es el régimen de margen de autos usados que usa el resto del sistema
//   (ivaBreakdown.ts / soldVehicleFinancials.ts, donde el débito se calcula sobre
//   el margen). Se implementa el régimen general A PROPÓSITO porque es lo que el
//   formato del contador define. Pendiente de confirmación formal de Mallorca,
//   pero es lo que el excel de referencia establece. Las fórmulas de IVA viven en
//   las celdas del excel (idénticas a la referencia), no se precalculan acá.
// ══════════════════════════════════════════════════════════════════════════

export interface ResumenAutomotoraExportOptions {
  clientId: number;
  /** Período por defecto del filtro del Dashboard (opcional; editable en Excel). */
  startDate?: Date | null;
  endDate?: Date | null;
  filename?: string;
  /** Dato financiero sensible (precios de compra/margen): solo admins/superadmin. */
  isAdminOrSuperadmin?: boolean;
  /** Régimen exento por defecto del cliente (cuando el auto no define `iva_exento`). */
  clientExempt?: boolean;
}

/**
 * Buckets de gasto del excel de Joaco. Las categorías reales del sistema
 * (`transaction_categories`, dinámicas por tenant) se mapean a estos 7 buckets por
 * palabra clave sobre el label/slug de la categoría (y el de su categoría padre).
 * Sin match → "Otros". Ver `bucketForCategory`.
 */
type GastoBucket =
  | 'mantenimiento'
  | 'documentacion'
  | 'dyp'
  | 'repuestos'
  | 'transferencia'
  | 'seguros'
  | 'otros';

const normalizeCat = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Mapea una categoría de gasto del sistema al bucket del excel. Se evalúa contra el
 * texto combinado (label_es + label_en + value + label del padre) por palabras clave.
 * El orden importa: se chequea lo más específico primero.
 */
const bucketForCategory = (combined: string): GastoBucket => {
  const t = normalizeCat(combined);
  const has = (...kw: string[]) => kw.some((k) => t.includes(k));

  // DyP = desabolladura y pintura (bodywork & paint).
  if (has('dyp', 'desaboll', 'desabolla', 'pintura', 'pint', 'latoner', 'carrocer', 'bodywork', 'paint'))
    return 'dyp';
  if (has('transfer')) return 'transferencia';
  if (has('seguro', 'soap', 'insurance')) return 'seguros';
  if (has('document', 'papel', 'tramite', 'gestor', 'permiso', 'revision', 'notar', 'multa', 'inscrip'))
    return 'documentacion';
  if (has('repuesto', 'part', 'accesor', 'neumatic', 'llanta', 'bater', 'insumo', 'pieza'))
    return 'repuestos';
  if (has('manten', 'maintenance', 'mecanic', 'motor', 'servicio', 'aceite', 'afinam', 'freno', 'lubric', 'repar', 'repair'))
    return 'mantenimiento';
  return 'otros';
};

/** Agregado de un bucket de gasto: monto total (bruto) y porción afecta (con crédito). */
export interface BucketAgg {
  total: number;
  afecta: number;
}

/** Una fila del libro de transacciones (Compra o Venta). */
export interface ResumenAutomotoraRow {
  fecha: Date | null;
  tipo: 'Compra' | 'Venta';
  subtipo: 'Normal' | 'Consignación';
  nombre: string;
  rut: string;
  correo: string;
  telefono: string;
  // Vehículo
  patente: string;
  marca: string;
  modelo: string;
  version: string;
  anio: number | '';
  km: number | '';
  color: string;
  combustible: string;
  vin: string;
  motor: string;
  vtoPermiso: Date | null;
  vtoSoap: Date | null;
  vtoRev: Date | null;
  // Monto
  monto: number;
  documento: 'Afecta' | 'Sin factura' | 'Exenta';
  // Gastos por bucket (solo en filas de Compra)
  buckets: Record<GastoBucket, BucketAgg> | null;
}

export const exportResumenAutomotora = async ({
  clientId,
  startDate,
  endDate,
  filename = 'Resumen_Automotora',
  isAdminOrSuperadmin = true,
  clientExempt = false,
}: ResumenAutomotoraExportOptions) => {
  // Reporte financiero (precios de compra / márgenes): admin-only.
  if (!isAdminOrSuperadmin) return;
  if (!clientId) return;

  // ── Fetch ────────────────────────────────────────────────────────────────
  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };
  const inBatches = async <R,>(
    ids: (number | string)[],
    fetcher: (batch: (number | string)[]) => Promise<R[]>
  ): Promise<R[]> => {
    const acc: R[] = [];
    for (const batch of chunk(ids, 200)) acc.push(...(await fetcher(batch)));
    return acc;
  };

  // Vehículos del tenant con todos los campos de la ficha.
  const { data: vehData, error: vehErr } = await supabase
    .from('vehicles')
    .select(
      `
      id, license_plate, year, mileage, engine_number, chassis_number,
      is_consigned, iva_exento, created_at, version_id,
      tech_inspection_expiry, circulation_permit_expiry, emissions_expiry,
      brand:brand_id(name), model:model_id(name),
      color:color_id(name), fuel_type:fuel_type_id(name)
    `
    )
    .eq('client_id', clientId);
  if (vehErr) {
    console.error('[ResumenAutomotora] Error cargando vehículos:', vehErr);
    return;
  }
  const vehicles = vehData || [];
  const vehicleIds = vehicles.map((v: any) => v.id).filter(Boolean) as number[];
  if (vehicleIds.length === 0) return;
  const vById = new Map<number, any>();
  vehicles.forEach((v: any) => vById.set(v.id, v));

  // Versiones (nombre) — se resuelven aparte para no depender del embed del FK.
  const versionIds = Array.from(
    new Set(vehicles.map((v: any) => v.version_id).filter((x: any) => x != null))
  ) as number[];
  const versionName = new Map<number, string>();
  if (versionIds.length > 0) {
    const versions = await inBatches<any>(versionIds, async (b) =>
      (await supabase.from('versions').select('id, name').in('id', b)).data || []
    );
    versions.forEach((r: any) => versionName.set(r.id, r.name || ''));
  }

  // Nota: los datos de contraparte (customers) se resuelven en una consulta aparte por
  // `customer_id` en vez de con embed PostgREST — el embed de `customers` sobre
  // vehicles_purchases/consignments no es fiable (mismo criterio que useCustomerTransactions).
  const [purchases, consignments, sales, extras, categories] = await Promise.all([
    inBatches<any>(vehicleIds, async (b) =>
      (
        await supabase
          .from('vehicles_purchases')
          .select('id, vehicle_id, purchase_date, purchase_price, genera_credito_fiscal, customer_id')
          .in('vehicle_id', b)
      ).data || []
    ),
    inBatches<any>(vehicleIds, async (b) =>
      (
        await supabase
          .from('vehicles_consignments')
          .select('id, vehicle_id, created_at, consignment_date, agreed_price, agreed_price_final, customer_id')
          .in('vehicle_id', b)
      ).data || []
    ),
    inBatches<any>(vehicleIds, async (b) =>
      (
        await supabase
          .from('vehicles_sales')
          .select('id, vehicle_id, sale_date, sale_price, status, customer_id')
          .in('vehicle_id', b)
          .eq('status', 'approved')
      ).data || []
    ),
    inBatches<any>(vehicleIds, async (b) =>
      (
        await supabase
          .from('vehicles_extras')
          .select('vehicle_id, amount, type, assumed_by, genera_credito_fiscal, is_passthrough, category_id')
          .in('vehicle_id', b)
      ).data || []
    ),
    // Todas las categorías (para resolver el padre al mapear buckets).
    (async () =>
      (await supabase.from('transaction_categories').select('id, value, label_es, label_en, parent_id')).data || [])(),
  ]);

  // Contrapartes: una sola consulta a `customers` por todos los customer_id involucrados.
  const customerById = new Map<number, any>();
  const allCustomerIds = Array.from(
    new Set(
      [...(purchases as any[]), ...(consignments as any[]), ...(sales as any[])]
        .map((r: any) => r.customer_id)
        .filter((id: any) => id != null)
    )
  ) as number[];
  if (allCustomerIds.length > 0) {
    const customers = await inBatches<any>(allCustomerIds, async (b) =>
      (await supabase.from('customers').select('id, first_name, last_name, email, phone, rut').in('id', b)).data || []
    );
    customers.forEach((c: any) => customerById.set(c.id, c));
  }

  // Índice categoría → texto combinado (incluye el label del padre) para el bucketing.
  const catById = new Map<number, any>();
  (categories as any[]).forEach((c) => catById.set(c.id, c));
  const catCombinedText = (categoryId: number | null): string => {
    if (categoryId == null) return '';
    const c = catById.get(categoryId);
    if (!c) return '';
    const parent = c.parent_id != null ? catById.get(c.parent_id) : null;
    return [c.label_es, c.label_en, c.value, parent?.label_es, parent?.label_en, parent?.value]
      .filter(Boolean)
      .join(' ');
  };

  // Primer registro por vehículo (compra/consignación); las ventas se listan todas.
  const firstBy = <T,>(rows: T[], key: (r: T) => number): Map<number, T> => {
    const m = new Map<number, T>();
    rows.forEach((r) => {
      const k = key(r);
      if (!m.has(k)) m.set(k, r);
    });
    return m;
  };
  const purchaseByVehicle = firstBy(purchases as any[], (r: any) => r.vehicle_id);
  const consignByVehicle = firstBy(consignments as any[], (r: any) => r.vehicle_id);

  // Gastos por vehículo, agregados por bucket. Solo GASTOS reales de la automotora:
  // type='expense', asumidos por la automotora (assumed_by='dealership'/null) y NO
  // pass-through (dinero solo traspasado). Mismo criterio que el margen del sistema.
  const emptyBuckets = (): Record<GastoBucket, BucketAgg> => ({
    mantenimiento: { total: 0, afecta: 0 },
    documentacion: { total: 0, afecta: 0 },
    dyp: { total: 0, afecta: 0 },
    repuestos: { total: 0, afecta: 0 },
    transferencia: { total: 0, afecta: 0 },
    seguros: { total: 0, afecta: 0 },
    otros: { total: 0, afecta: 0 },
  });
  const gastosByVehicle = new Map<number, Record<GastoBucket, BucketAgg>>();
  (extras as any[]).forEach((e) => {
    if (e.type !== 'expense') return;
    const ab = e.assumed_by ?? 'dealership';
    if (ab !== 'dealership') return;
    if (e.is_passthrough === true) return;
    const amount = Number(e.amount || 0);
    if (!amount) return;
    const bucket = bucketForCategory(catCombinedText(e.category_id ?? null));
    let agg = gastosByVehicle.get(e.vehicle_id);
    if (!agg) {
      agg = emptyBuckets();
      gastosByVehicle.set(e.vehicle_id, agg);
    }
    agg[bucket].total += amount;
    if (e.genera_credito_fiscal === true) agg[bucket].afecta += amount;
  });

  const personName = (c: any): string =>
    c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '';

  // ── Construir filas ────────────────────────────────────────────────────────
  const vehicleBase = (v: any) => ({
    patente: v?.license_plate || '',
    marca: v?.brand?.name || '',
    modelo: v?.model?.name || '',
    version: (v?.version_id != null ? versionName.get(v.version_id) : '') || '',
    anio: (v?.year ?? '') as number | '',
    km: (v?.mileage ?? '') as number | '',
    color: v?.color?.name || '',
    combustible: v?.fuel_type?.name || '',
    vin: v?.chassis_number || '',
    motor: v?.engine_number || '',
    vtoPermiso: v?.circulation_permit_expiry ? new Date(v.circulation_permit_expiry) : null,
    vtoSoap: v?.emissions_expiry ? new Date(v.emissions_expiry) : null,
    vtoRev: v?.tech_inspection_expiry ? new Date(v.tech_inspection_expiry) : null,
  });

  const rows: ResumenAutomotoraRow[] = [];

  for (const v of vehicles) {
    const vid = v.id as number;
    const base = vehicleBase(v);
    const regimen = getVehicleRegimen({ is_consigned: v.is_consigned, iva_exento: v.iva_exento }, clientExempt);
    const buckets = gastosByVehicle.get(vid) || null;

    // — Fila de COMPRA / ADQUISICIÓN (donde viven los gastos del auto) —
    const consign = v.is_consigned ? consignByVehicle.get(vid) : undefined;
    const purchase = !v.is_consigned ? purchaseByVehicle.get(vid) : undefined;

    if (consign) {
      // Consignación: la automotora no compra; el costo es el precio acordado que se
      // paga al consignador. Sin factura de compra → sin crédito. Subtipo="Normal" en
      // la adquisición (la consignación se marca en la VENTA, como el excel de Joaco).
      const c: any = consign;
      const cCust = c.customer_id != null ? customerById.get(c.customer_id) : null;
      rows.push({
        fecha: c.consignment_date ? new Date(c.consignment_date) : c.created_at ? new Date(c.created_at) : v.created_at ? new Date(v.created_at) : null,
        tipo: 'Compra',
        subtipo: 'Normal',
        nombre: personName(cCust) || 'Cliente Consignación',
        rut: cCust?.rut || '',
        correo: cCust?.email || '',
        telefono: cCust?.phone || '',
        ...base,
        monto: Number(c.agreed_price_final ?? c.agreed_price ?? 0),
        documento: 'Sin factura',
        buckets,
      });
    } else if (purchase) {
      const p: any = purchase;
      const pCust = p.customer_id != null ? customerById.get(p.customer_id) : null;
      const documento: ResumenAutomotoraRow['documento'] =
        regimen === 'exento' ? 'Exenta' : p.genera_credito_fiscal === true ? 'Afecta' : 'Sin factura';
      rows.push({
        fecha: p.purchase_date ? new Date(p.purchase_date) : v.created_at ? new Date(v.created_at) : null,
        tipo: 'Compra',
        subtipo: 'Normal',
        nombre: personName(pCust),
        rut: pCust?.rut || '',
        correo: pCust?.email || '',
        telefono: pCust?.phone || '',
        ...base,
        monto: Number(p.purchase_price || 0),
        documento,
        buckets,
      });
    } else if (buckets) {
      // Sin registro de adquisición pero con gastos → fila de Compra "vacía" (monto 0)
      // para no perder los gastos (el Dashboard suma gastos solo en filas de Compra).
      rows.push({
        fecha: v.created_at ? new Date(v.created_at) : null,
        tipo: 'Compra',
        subtipo: 'Normal',
        nombre: '',
        rut: '',
        correo: '',
        telefono: '',
        ...base,
        monto: 0,
        documento: 'Sin factura',
        buckets,
      });
    }

    // — Filas de VENTA (una por venta aprobada) —
    const vehicleSales = (sales as any[]).filter((s) => s.vehicle_id === vid);
    for (const s of vehicleSales) {
      // Régimen general: la venta afecta lleva IVA débito; exenta/consignación no.
      const documento: ResumenAutomotoraRow['documento'] = regimen === 'afecto' ? 'Afecta' : 'Exenta';
      const sCust = s.customer_id != null ? customerById.get(s.customer_id) : null;
      rows.push({
        fecha: s.sale_date ? new Date(s.sale_date) : null,
        tipo: 'Venta',
        subtipo: v.is_consigned ? 'Consignación' : 'Normal',
        nombre: personName(sCust),
        rut: sCust?.rut || '',
        correo: sCust?.email || '',
        telefono: sCust?.phone || '',
        ...base,
        monto: Number(s.sale_price || 0),
        documento,
        buckets: null,
      });
    }
  }

  // Orden: por patente y, dentro, Compra antes que Venta (como el excel de referencia).
  rows.sort(
    (a, b) =>
      String(a.patente).localeCompare(String(b.patente)) ||
      (a.tipo === b.tipo ? 0 : a.tipo === 'Compra' ? -1 : 1) ||
      (a.fecha?.getTime() || 0) - (b.fecha?.getTime() || 0)
  );

  const workbook = buildResumenAutomotoraWorkbook(rows, { startDate, endDate });
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
};

/**
 * Arma el libro (2 hojas) a partir de las filas ya construidas. PURO (sin Supabase):
 * reutilizable y testeable con data mock. Reproduce EXACTO la estructura, columnas y
 * fórmulas del excel de referencia de Joaco (régimen general de IVA).
 */
export const buildResumenAutomotoraWorkbook = (
  rows: ResumenAutomotoraRow[],
  opts?: { startDate?: Date | null; endDate?: Date | null }
): XLSX.WorkBook => {
  const startDate = opts?.startDate ?? null;
  const endDate = opts?.endDate ?? null;

  // ── Escribir hoja "Transacciones" ──────────────────────────────────────────
  const MONEY = '"$"#,##0;("$"#,##0);"-"';
  const DATEFMT = 'dd/mm/yyyy';
  const PCT = '0.0%';

  // Serial de Excel (sistema 1900) desde una fecha local, sin corrimiento por TZ.
  const dateToSerial = (d: Date): number =>
    Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000) + 25569;

  const enc = (r: number, c: number) => XLSX.utils.encode_cell({ r, c }); // 0-indexed
  const wsT: XLSX.WorkSheet = {};
  const put = (r: number, c: number, cell: XLSX.CellObject) => {
    wsT[enc(r, c)] = cell;
  };
  const txt = (v: string): XLSX.CellObject => ({ t: 's', v: String(v ?? '') });
  const num = (v: number, z?: string): XLSX.CellObject => ({ t: 'n', v: Number(v) || 0, ...(z ? { z } : {}) });
  const dcell = (d: Date | null): XLSX.CellObject | null =>
    d && !Number.isNaN(d.getTime()) ? { t: 'n', v: dateToSerial(d), z: DATEFMT } : null;
  const fnum = (f: string, z?: string): XLSX.CellObject => ({ t: 'n', f, ...(z ? { z } : {}) });

  // Row 0 (Excel 1): título.
  put(0, 0, txt('LIBRO DE TRANSACCIONES — AUTOMOTORA'));

  // Row 1 (Excel 2): cabeceras de grupo.
  put(1, 0, txt('TRANSACCIÓN'));
  put(1, 3, txt('CONTRAPARTE'));
  put(1, 7, txt('DATOS DEL VEHÍCULO'));
  put(1, 17, txt('DOCUMENTACIÓN (vto)'));
  put(1, 20, txt('MONTO TRANSACCIÓN'));
  put(1, 24, txt('GASTOS POR CATEGORÍA'));
  put(1, 38, txt('RESULTADO'));

  // Row 2 (Excel 3): cabeceras de columna.
  const headers = [
    'Fecha', 'Tipo', 'Subtipo', 'Nombre / Razón Social', 'RUT / ID', 'Correo', 'Teléfono',
    'Patente (clave)', 'Marca', 'Modelo', 'Versión', 'Año', 'Kilometraje', 'Color', 'Combustible', 'N° VIN', 'N° Motor',
    'Permiso Circ.', 'SOAP', 'Rev. Técnica',
    'Monto ($)', 'Documento', 'Neto ($)', 'IVA ($)',
    'Mantenim. ($)', 'Mant. Doc', 'Documentac. ($)', 'Doc. Doc', 'DyP ($)', 'DyP Doc', 'Repuestos ($)', 'Rep. Doc',
    'Transfer. ($)', 'Transf. Doc', 'Seguros ($)', 'Seg. Doc', 'Otros ($)', 'Otros Doc',
    'Gastos Neto ($)', 'IVA Créd. Gastos ($)', 'IVA Crédito Total ($)', 'IVA Débito ($)', 'Margen Neto ($)',
  ];
  headers.forEach((h, c) => put(2, c, txt(h)));

  // Buckets → columnas (monto, doc). Índices 0-based dentro de la fila.
  const bucketCols: { bucket: GastoBucket; amt: number; doc: number }[] = [
    { bucket: 'mantenimiento', amt: 24, doc: 25 },
    { bucket: 'documentacion', amt: 26, doc: 27 },
    { bucket: 'dyp', amt: 28, doc: 29 },
    { bucket: 'repuestos', amt: 30, doc: 31 },
    { bucket: 'transferencia', amt: 32, doc: 33 },
    { bucket: 'seguros', amt: 34, doc: 35 },
    { bucket: 'otros', amt: 36, doc: 37 },
  ];

  const DATA_START = 4; // Excel row de la primera fila de datos (1-based).
  rows.forEach((row, i) => {
    const r = 3 + i; // índice 0-based de la fila en la hoja (Excel row = r+1).
    const R = r + 1; // Excel row 1-based (para fórmulas).

    const d = dcell(row.fecha);
    if (d) put(r, 0, d);
    put(r, 1, txt(row.tipo));
    put(r, 2, txt(row.subtipo));
    put(r, 3, txt(row.nombre));
    put(r, 4, txt(row.rut));
    put(r, 5, txt(row.correo));
    put(r, 6, txt(row.telefono));
    put(r, 7, txt(row.patente));
    put(r, 8, txt(row.marca));
    put(r, 9, txt(row.modelo));
    put(r, 10, txt(row.version));
    if (row.anio !== '') put(r, 11, num(Number(row.anio)));
    if (row.km !== '') put(r, 12, num(Number(row.km)));
    put(r, 13, txt(row.color));
    put(r, 14, txt(row.combustible));
    put(r, 15, txt(row.vin));
    put(r, 16, txt(row.motor));
    const dp = dcell(row.vtoPermiso);
    if (dp) put(r, 17, dp);
    const ds = dcell(row.vtoSoap);
    if (ds) put(r, 18, ds);
    const dr = dcell(row.vtoRev);
    if (dr) put(r, 19, dr);

    // Monto + Documento + Neto/IVA (fórmulas, régimen general).
    put(r, 20, num(row.monto, MONEY));
    put(r, 21, txt(row.documento));
    put(r, 22, fnum(`IF($V${R}="Afecta",$U${R}/1.19,$U${R})`, MONEY));
    put(r, 23, fnum(`$U${R}-$W${R}`, MONEY));

    // Gastos por categoría (bruto) + su tipo de documento por bucket.
    for (const bc of bucketCols) {
      const agg = row.buckets ? row.buckets[bc.bucket] : null;
      if (agg && agg.total > 0) {
        put(r, bc.amt, num(agg.total, MONEY));
        // Un bucket puede mezclar líneas afectas y sin factura; se marca "Afecta" si la
        // mayoría del monto genera crédito fiscal (aproximación documentada: la celda de
        // documento del excel es única por bucket). En la práctica cada categoría suele
        // ser homogénea (repuestos con factura / trámites sin factura).
        const doc = agg.afecta > 0 && agg.afecta >= agg.total - agg.afecta ? 'Afecta' : 'Sin factura';
        put(r, bc.doc, txt(doc));
      }
      // Si el bucket es 0 se deja en blanco (igual que la referencia).
    }

    // RESULTADO — fórmulas idénticas a la referencia (régimen general).
    put(
      r,
      38,
      fnum(
        `IF($Z${R}="Afecta",$Y${R}/1.19,$Y${R})+IF($AB${R}="Afecta",$AA${R}/1.19,$AA${R})+IF($AD${R}="Afecta",$AC${R}/1.19,$AC${R})+IF($AF${R}="Afecta",$AE${R}/1.19,$AE${R})+IF($AH${R}="Afecta",$AG${R}/1.19,$AG${R})+IF($AJ${R}="Afecta",$AI${R}/1.19,$AI${R})+IF($AL${R}="Afecta",$AK${R}/1.19,$AK${R})`,
        MONEY
      )
    );
    put(r, 39, fnum(`($Y${R}+$AA${R}+$AC${R}+$AE${R}+$AG${R}+$AI${R}+$AK${R})-$AM${R}`, MONEY));
    put(r, 40, fnum(`IF($B${R}="Compra",$X${R}+$AN${R},0)`, MONEY));
    put(r, 41, fnum(`IF($B${R}="Venta",$X${R},0)`, MONEY));
    put(r, 42, fnum(`IF($B${R}="Venta",$W${R},-($W${R}+$AM${R}))`, MONEY));
  });

  // Fila TOTALES.
  const totalRow = 3 + rows.length; // 0-based
  const TR = totalRow + 1; // Excel 1-based
  const lastData = 3 + rows.length; // Excel row de la última fila de datos (= DATA_START-1+N)
  put(totalRow, 0, txt('TOTALES'));
  const sumCols = [20, 22, 23, 24, 26, 28, 30, 32, 34, 36, 38, 39, 40, 41, 42];
  for (const c of sumCols) {
    const col = XLSX.utils.encode_col(c);
    put(totalRow, c, fnum(`SUM(${col}${DATA_START}:${col}${lastData})`, MONEY));
  }

  // Merges (cabeceras de grupo + título + fila TOTALES).
  wsT['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 42 } }, // título
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // TRANSACCIÓN
    { s: { r: 1, c: 3 }, e: { r: 1, c: 6 } }, // CONTRAPARTE
    { s: { r: 1, c: 7 }, e: { r: 1, c: 16 } }, // DATOS DEL VEHÍCULO
    { s: { r: 1, c: 17 }, e: { r: 1, c: 19 } }, // DOCUMENTACIÓN
    { s: { r: 1, c: 20 }, e: { r: 1, c: 23 } }, // MONTO
    { s: { r: 1, c: 24 }, e: { r: 1, c: 37 } }, // GASTOS POR CATEGORÍA
    { s: { r: 1, c: 38 }, e: { r: 1, c: 42 } }, // RESULTADO
    { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 19 } }, // TOTALES
  ];

  // Anchos de columna.
  wsT['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 13 }, { wch: 25 }, { wch: 14 }, { wch: 24 }, { wch: 15 }, // A-G
    { wch: 13 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 7 }, { wch: 12 }, { wch: 15 }, { wch: 13 }, { wch: 20 }, { wch: 14 }, // H-Q
    { wch: 13 }, { wch: 12 }, { wch: 13 }, // R-T
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, // U-X
    { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 13 }, { wch: 10 }, // Y-AF
    { wch: 13 }, { wch: 11 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, // AG-AL
    { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 15 }, // AM-AQ
  ];
  wsT['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRow, c: 42 } });

  // ── Escribir hoja "Dashboard" ──────────────────────────────────────────────
  const wsD: XLSX.WorkSheet = {};
  const putD = (r: number, c: number, cell: XLSX.CellObject) => {
    wsD[enc(r, c)] = cell;
  };
  const defFrom = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
  const defTo = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), 11, 31);
  const quickSel = startDate || endDate ? 'Personalizado' : 'Todo';

  putD(0, 0, txt('DASHBOARD — RESUMEN AUTOMOTORA'));
  wsD['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

  putD(2, 0, txt('FILTRO DE PERIODO'));
  putD(3, 0, txt('Selección rápida:'));
  putD(3, 1, txt(quickSel));
  putD(3, 2, txt('← Escribe: Todo · Mes actual · Mes anterior · Año actual · Últimos 3 meses · Personalizado (y edita las fechas)'));
  putD(4, 0, txt('Desde:'));
  putD(
    4,
    1,
    fnum(
      'IF($B$4="Todo",DATE(2000,1,1),IF($B$4="Mes actual",EOMONTH(TODAY(),-1)+1,IF($B$4="Mes anterior",EOMONTH(TODAY(),-2)+1,IF($B$4="Año actual",DATE(YEAR(TODAY()),1,1),IF($B$4="Últimos 3 meses",EOMONTH(TODAY(),-3)+1,$E$5)))))',
      DATEFMT
    )
  );
  putD(4, 3, txt('Personalizado Desde:'));
  putD(4, 4, { t: 'n', v: dateToSerial(defFrom), z: DATEFMT });
  putD(5, 0, txt('Hasta:'));
  putD(
    5,
    1,
    fnum(
      'IF($B$4="Todo",DATE(2100,12,31),IF($B$4="Mes actual",EOMONTH(TODAY(),0),IF($B$4="Mes anterior",EOMONTH(TODAY(),-1),IF($B$4="Año actual",DATE(YEAR(TODAY()),12,31),IF($B$4="Últimos 3 meses",TODAY(),$E$6)))))',
      DATEFMT
    )
  );
  putD(5, 3, txt('Personalizado Hasta:'));
  putD(5, 4, { t: 'n', v: dateToSerial(defTo), z: DATEFMT });

  putD(7, 0, txt('RESUMEN FINANCIERO (periodo seleccionado)'));
  putD(7, 3, txt('TRANSACCIONES'));

  // Rango de datos de la hoja Transacciones (referencias de columna completa como la
  // referencia; la fila TOTALES no matchea los criterios de Tipo/fecha → excluida).
  const T = 'Transacciones';
  const period = `${T}!$A:$A,">="&$B$5,${T}!$A:$A,"<="&$B$6`;

  putD(9, 0, txt('Total Compras (neto)'));
  putD(9, 1, fnum(`SUMIFS(${T}!$W:$W,${T}!$B:$B,"Compra",${period})`, MONEY));
  putD(9, 3, txt('N° Compras'));
  putD(9, 4, fnum(`COUNTIFS(${T}!$B:$B,"Compra",${period})`));

  putD(10, 0, txt('Total Ventas (neto)'));
  putD(10, 1, fnum(`SUMIFS(${T}!$W:$W,${T}!$B:$B,"Venta",${period})`, MONEY));
  putD(10, 3, txt('N° Ventas'));
  putD(10, 4, fnum(`COUNTIFS(${T}!$B:$B,"Venta",${period})`));

  putD(11, 0, txt('Total Gastos (neto)'));
  putD(11, 1, fnum(`SUMIFS(${T}!$AM:$AM,${T}!$B:$B,"Compra",${period})`, MONEY));
  putD(11, 3, txt('N° Consignaciones'));
  putD(11, 4, fnum(`COUNTIFS(${T}!$C:$C,"Consignación",${period})`));

  putD(12, 0, txt('Margen Neto Total'));
  putD(12, 1, fnum('B11-B10-B12', MONEY));
  putD(12, 3, txt('Autos en Stock'));
  putD(12, 4, fnum('E10-E11'));

  putD(14, 0, txt('IVA (solo facturas afectas)'));
  putD(15, 0, txt('IVA Crédito (compras + gastos)'));
  putD(15, 1, fnum(`SUMIFS(${T}!$AO:$AO,${period})`, MONEY));
  putD(16, 0, txt('IVA Débito (ventas)'));
  putD(16, 1, fnum(`SUMIFS(${T}!$AP:$AP,${period})`, MONEY));
  putD(17, 0, txt('IVA Neto a Pagar (Débito − Crédito)'));
  putD(17, 1, fnum('B17-B16', MONEY));

  putD(19, 0, txt('GASTOS POR CATEGORÍA (periodo seleccionado)'));
  putD(20, 0, txt('Categoría'));
  putD(20, 1, txt('Monto Bruto ($)'));
  putD(20, 2, txt('% del Total'));
  const gastoRows: { label: string; col: string }[] = [
    { label: 'Mantenimiento', col: 'Y' },
    { label: 'Documentación', col: 'AA' },
    { label: 'DyP', col: 'AC' },
    { label: 'Repuestos', col: 'AE' },
    { label: 'Transferencia', col: 'AG' },
    { label: 'Seguros', col: 'AI' },
    { label: 'Otros Gastos', col: 'AK' },
  ];
  gastoRows.forEach((g, i) => {
    const r = 21 + i; // 0-based (Excel row 22..28)
    const R = r + 1;
    putD(r, 0, txt(g.label));
    putD(r, 1, fnum(`SUMIFS(${T}!$${g.col}:$${g.col},${T}!$B:$B,"Compra",${period})`, MONEY));
    putD(r, 2, fnum(`IF($B$29=0,0,B${R}/$B$29)`, PCT));
  });
  putD(28, 0, txt('TOTAL GASTOS'));
  putD(28, 1, fnum('SUM(B22:B28)', MONEY));
  putD(28, 2, fnum('SUM(C22:C28)', PCT));

  wsD['!cols'] = [
    { wch: 33 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 15 }, { wch: 22 }, { wch: 12 }, { wch: 12 },
  ];
  wsD['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 28, c: 7 } });

  // ── Libro ─────────────────────────────────────────────────────────────────
  const workbook = XLSX.utils.book_new();
  // Forzar recálculo de fórmulas al abrir (no se cachean valores calculados).
  (workbook as any).Workbook = { CalcPr: { fullCalcOnLoad: true } };
  XLSX.utils.book_append_sheet(workbook, wsT, 'Transacciones');
  XLSX.utils.book_append_sheet(workbook, wsD, 'Dashboard');
  return workbook;
};

export default exportVehiclesToExcel;
