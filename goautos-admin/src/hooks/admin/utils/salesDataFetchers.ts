import { supabase } from '@/integrations/supabase/client';

export type ConsignmentFilter = 'all' | 'consigned' | 'not_consigned';

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
  consignmentFilter?: ConsignmentFilter;
  sellerIds?: string[];
  /**
   * División de sedes (Slice 4): sedes visibles del usuario. Se filtran las
   * ventas por la sede del VEHÍCULO (decisión 4: la venta pertenece a la sede
   * del auto). `null`/`undefined` = sin filtro (retrocompatible). Un vehículo se
   * cuenta si su `dealership_id` está en estas sedes O es NULL (visible a todas).
   */
  dealershipIds?: number[] | null;
}

export const fetchSalesData = async (
  clientId: number,
  dateFilter?: DateRangeFilter
) => {
  let query = supabase
    .from('vehicles_sales')
    .select(
      `
      id,
      sale_price,
      commission_amount,
      sale_date,
      vehicles!inner!vehicles_sales_vehicle_id_fkey(client_id, is_consigned)
    `
    )
    .eq('vehicles.client_id', clientId);

  if (dateFilter?.startDate) {
    query = query.gte('sale_date', dateFilter.startDate.toISOString());
  }
  if (dateFilter?.endDate) {
    query = query.lte('sale_date', dateFilter.endDate.toISOString());
  }

  // Filtrar por consignación
  if (dateFilter?.consignmentFilter === 'consigned') {
    query = query.eq('vehicles.is_consigned', true);
  } else if (dateFilter?.consignmentFilter === 'not_consigned') {
    query = query.eq('vehicles.is_consigned', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const fetchPurchasesData = async (
  clientId: number,
  dateFilter?: DateRangeFilter
) => {
  // IMPORTANTE: Solo traer compras de vehículos que YA fueron vendidos
  // Los vehículos no vendidos NO son gastos, son inventario
  // El gasto se registra en la fecha de VENTA, no en la fecha de compra
  // El filtro de consignación se aplica según el parámetro

  const query = supabase
    .from('vehicles_purchases')
    .select(
      `
      id,
      purchase_price,
      purchase_date,
      vehicle_id,
      vehicles!inner!vehicles_purchases_vehicle_id_fkey(
        client_id,
        status:status_id(name),
        is_consigned
      )
    `
    )
    .eq('vehicles.client_id', clientId);

  const { data: purchasesData, error } = await query;
  if (error) throw error;

  // Filtrar vehículos vendidos según el filtro de consignación
  // NOTA: Los vehículos consignados se contabilizan aparte en fetchConsignmentsData
  // con su agreed_price, por lo que aquí solo incluimos compras propias (no consignadas)
  // para evitar doble conteo en gastos.
  const soldPurchases = purchasesData?.filter((purchase: any) => {
    const statusName = purchase.vehicles?.status?.name?.toLowerCase() || '';
    const isSold = statusName.includes('vendido') || statusName.includes('sold');
    const isConsigned = purchase.vehicles?.is_consigned === true;

    // Primero verificar si está vendido
    if (!isSold) return false;

    // Aplicar filtro de consignación
    const consignmentFilter = dateFilter?.consignmentFilter || 'all';
    if (consignmentFilter === 'consigned') {
      // Cuando se pide solo consignados, no devolver compras
      // (las consignaciones se manejan en fetchConsignmentsData)
      return false;
    } else if (consignmentFilter === 'not_consigned') {
      return !isConsigned;
    }
    // 'all' - excluir consignados para evitar doble conteo con fetchConsignmentsData
    return !isConsigned;
  }) || [];

  // Obtener la fecha de venta de cada vehículo vendido
  const vehicleIds = soldPurchases.map((p: any) => p.vehicle_id);

  if (vehicleIds.length === 0) return [];

  const { data: salesData, error: salesError } = await supabase
    .from('vehicles_sales')
    .select('vehicle_id, sale_date')
    .in('vehicle_id', vehicleIds)
    .order('sale_date', { ascending: false });

  if (salesError) throw salesError;

  // Mapear la fecha de venta a cada compra
  const purchasesWithSaleDate = soldPurchases.map((purchase: any) => {
    const sale = salesData?.find((s: any) => s.vehicle_id === purchase.vehicle_id);
    return {
      ...purchase,
      sale_date: sale?.sale_date || purchase.purchase_date, // Fallback a purchase_date si no hay sale_date
    };
  });

  // Filtrar por rango de fechas usando sale_date (fecha de venta)
  let filteredPurchases = purchasesWithSaleDate;

  if (dateFilter?.startDate) {
    filteredPurchases = filteredPurchases.filter((purchase: any) => {
      const saleDate = new Date(purchase.sale_date);
      return saleDate >= dateFilter.startDate!;
    });
  }

  if (dateFilter?.endDate) {
    filteredPurchases = filteredPurchases.filter((purchase: any) => {
      const saleDate = new Date(purchase.sale_date);
      return saleDate <= dateFilter.endDate!;
    });
  }

  return filteredPurchases;
};

export const fetchConsignmentsData = async (
  clientId: number,
  dateFilter?: DateRangeFilter
) => {
  // Obtener agreed_price de vehículos consignados que YA fueron vendidos
  // El gasto se registra en la fecha de VENTA
  const query = supabase
    .from('vehicles_consignments')
    .select(
      `
      id,
      agreed_price,
      vehicle_id,
      vehicles!inner(
        client_id,
        status:status_id(name),
        is_consigned
      )
    `
    )
    .eq('vehicles.client_id', clientId)
    .eq('vehicles.is_consigned', true);

  const { data: consignmentsData, error } = await query;
  if (error) throw error;

  // Filtrar solo vehículos vendidos
  const soldConsignments = consignmentsData?.filter((consignment: any) => {
    const statusName = consignment.vehicles?.status?.name?.toLowerCase() || '';
    return statusName.includes('vendido') || statusName.includes('sold');
  }) || [];

  // Filtrar por consignación (si el filtro es 'not_consigned', no devolver nada)
  const consignmentFilter = dateFilter?.consignmentFilter || 'all';
  if (consignmentFilter === 'not_consigned') return [];

  // Obtener la fecha de venta y precio de cada vehículo
  const vehicleIds = soldConsignments.map((c: any) => c.vehicle_id);
  if (vehicleIds.length === 0) return [];

  const { data: salesData, error: salesError } = await supabase
    .from('vehicles_sales')
    .select('vehicle_id, sale_date, sale_price')
    .in('vehicle_id', vehicleIds)
    .order('sale_date', { ascending: false });

  if (salesError) throw salesError;

  // Obtener dealershipCommission de vehicles_close_deal para cada vehículo consignado
  // Paso 1: Obtener los documentos de tipo close_deal
  const { data: closeDealDocs, error: closeDocsError } = await supabase
    .from('vehicles_documents')
    .select('id, vehicle_id')
    .in('vehicle_id', vehicleIds)
    .eq('type', 'close_deal');

  if (closeDocsError) {
    console.error('Error fetching close deal docs for consignments:', closeDocsError);
  }

  // Paso 2: Obtener los datos de cierre por document_id
  const closeDealMap = new Map<number, number>();
  if (closeDealDocs && closeDealDocs.length > 0) {
    const docIds = closeDealDocs.map((d: any) => d.id);
    const docVehicleMap = new Map(closeDealDocs.map((d: any) => [d.id, d.vehicle_id]));

    const { data: closeDealsData, error: closeDealsError } = await supabase
      .from('vehicles_close_deal')
      .select('document_id, dealershipCommission')
      .in('document_id', docIds);

    if (closeDealsError) {
      console.error('Error fetching close deals for consignments:', closeDealsError);
    } else if (closeDealsData) {
      closeDealsData.forEach((deal: any) => {
        const vid = docVehicleMap.get(deal.document_id);
        const commission = Number(deal.dealershipCommission) || 0;
        if (vid && commission > 0) {
          closeDealMap.set(vid, commission);
        }
      });
    }
  }

  // Mapear la fecha de venta, sale_price y dealershipCommission a cada consignación
  const consignmentsWithSaleDate = soldConsignments.map((consignment: any) => {
    const sale = salesData?.find((s: any) => s.vehicle_id === consignment.vehicle_id);
    const dealershipCommission = closeDealMap.get(consignment.vehicle_id) || 0;
    return {
      ...consignment,
      sale_date: sale?.sale_date || null,
      sale_price: Number(sale?.sale_price) || 0,
      dealership_commission: dealershipCommission,
    };
  });

  // Filtrar por rango de fechas usando sale_date
  let filtered = consignmentsWithSaleDate;

  if (dateFilter?.startDate) {
    filtered = filtered.filter((c: any) => {
      if (!c.sale_date) return false;
      return new Date(c.sale_date) >= dateFilter.startDate!;
    });
  }

  if (dateFilter?.endDate) {
    filtered = filtered.filter((c: any) => {
      if (!c.sale_date) return false;
      return new Date(c.sale_date) <= dateFilter.endDate!;
    });
  }

  return filtered;
};

export const fetchExtrasData = async (
  clientId: number,
  dateFilter?: DateRangeFilter
) => {
  let query = supabase
    .from('vehicles_extras')
    .select(
      `
      id,
      amount,
      created_at,
      type,
      vehicle_id,
      assumed_by,
      is_passthrough,
      vehicles!inner!vehicles_extras_vehicle_id_fkey(client_id, is_consigned)
    `
    )
    .eq('vehicles.client_id', clientId)
    // Incluir los adicionales del cierre de venta (sale_additional/sale_income),
    // no solo 'expense'. El gráfico ya filtra por assumed_by='dealership' y suma
    // el monto como gasto, así que los costos de cierre asumidos por la automotora
    // dejan de escaparse del margen. (Bug Mallorca 2026-06-01.)
    .in('type', ['expense', 'sale_additional', 'sale_income']);

  if (dateFilter?.startDate) {
    query = query.gte('created_at', dateFilter.startDate.toISOString());
  }
  if (dateFilter?.endDate) {
    query = query.lte('created_at', dateFilter.endDate.toISOString());
  }

  // Filtrar por consignación
  if (dateFilter?.consignmentFilter === 'consigned') {
    query = query.eq('vehicles.is_consigned', true);
  } else if (dateFilter?.consignmentFilter === 'not_consigned') {
    query = query.eq('vehicles.is_consigned', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};
