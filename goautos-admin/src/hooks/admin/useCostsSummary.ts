import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateFilter } from './useSellerPerformance';

export type CostCategory = {
  categoryId: number | null;
  categoryNameEs: string;
  categoryNameEn: string;
  totalCost: number;
  items: CostItem[];
};

export type CostItem = {
  id: number;
  vehicleId: number | null;
  vehicleInfo: string; // Ej: "BMW 320i 2020"
  title: string;
  description: string;
  amount: number;
  type: 'expense' | 'acquisition' | 'commission';
  categoryId: number | null;
  categoryNameEs: string;
  categoryNameEn: string;
  createdAt: string;
};

export const useCostsSummary = (clientId: number, dateFilter?: DateFilter) => {
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [categorizedCosts, setCategorizedCosts] = useState<CostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (!clientId) {
      setCosts([]);
      setCategorizedCosts([]);
      setLoading(false);
      return;
    }

    const fetchCosts = async () => {
      try {
        setLoading(true);

        // División de sedes (Slice 4): la venta/costo pertenece a la sede del AUTO.
        // Se filtra por la sede del vehículo embebido (mismo criterio que el resto
        // del dashboard). `null`/vacío = sin filtro (retrocompatible).
        const dealershipIds = dateFilter?.dealershipIds;
        const sedeOr =
          dealershipIds && dealershipIds.length > 0
            ? `dealership_id.in.(${dealershipIds.join(',')}),dealership_id.is.null`
            : null;

        // 1. Obtener todos los expenses de vehicles_extras
        let expensesQuery = supabase
          .from('vehicles_extras')
          .select(
            `
            id,
            vehicle_id,
            title,
            description,
            amount,
            type,
            category_id,
            created_at,
            vehicles!inner(
              id,
              client_id,
              year,
              brand_id,
              model_id,
              is_consigned,
              brands:brand_id(name),
              models:model_id(name)
            ),
            transaction_categories(
              id,
              label_es,
              label_en
            )
          `
          )
          .eq('vehicles.client_id', clientId)
          .eq('type', 'expense')
          .order('created_at', { ascending: false });

        if (dateFilter?.startDate) {
          expensesQuery = expensesQuery.gte('created_at', dateFilter.startDate.toISOString());
        }
        if (dateFilter?.endDate) {
          expensesQuery = expensesQuery.lte('created_at', dateFilter.endDate.toISOString());
        }
        // Filtrar por consignación
        if (dateFilter?.consignmentFilter === 'consigned') {
          expensesQuery = expensesQuery.eq('vehicles.is_consigned', true);
        } else if (dateFilter?.consignmentFilter === 'not_consigned') {
          expensesQuery = expensesQuery.eq('vehicles.is_consigned', false);
        }
        if (sedeOr) expensesQuery = expensesQuery.or(sedeOr, { referencedTable: 'vehicles' });

        const { data: expensesData, error: expensesError } = await expensesQuery;

        if (expensesError) throw expensesError;

        // 2. Obtener ventas (para comisiones y fechas)
        let salesQuery = supabase
          .from('vehicles_sales')
          .select(
            `
            id,
            vehicle_id,
            sale_date,
            sale_price,
            commission_amount,
            veh:vehicles!inner!vehicles_sales_vehicle_id_fkey(
              id,
              client_id,
              year,
              brand_id,
              model_id,
              is_consigned,
              brands:brand_id(name),
              models:model_id(name)
            )
          `
          )
          .eq('veh.client_id', clientId);

        if (dateFilter?.startDate) {
          salesQuery = salesQuery.gte('sale_date', dateFilter.startDate.toISOString());
        }
        if (dateFilter?.endDate) {
          salesQuery = salesQuery.lte('sale_date', dateFilter.endDate.toISOString());
        }
        // Filtrar por consignación
        if (dateFilter?.consignmentFilter === 'consigned') {
          salesQuery = salesQuery.eq('veh.is_consigned', true);
        } else if (dateFilter?.consignmentFilter === 'not_consigned') {
          salesQuery = salesQuery.eq('veh.is_consigned', false);
        }
        // `vehicles_sales` tiene DOS FKs a `vehicles`: el embed va aliaseado (`veh`)
        // para poder filtrar la sede por `referencedTable` sin ambigüedad (PGRST201).
        if (sedeOr) salesQuery = salesQuery.or(sedeOr, { referencedTable: 'veh' });

        const { data: salesData, error: salesError } = await salesQuery;

        if (salesError) throw salesError;

        // 3. Obtener compras de vehículos vendidos
        let purchasesQuery = supabase
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
              is_consigned,
              year,
              brand_id,
              model_id,
              brands:brand_id(name),
              models:model_id(name)
            )
          `
          )
          .eq('vehicles.client_id', clientId);
        if (sedeOr) purchasesQuery = purchasesQuery.or(sedeOr, { referencedTable: 'vehicles' });

        const { data: purchasesData, error: purchasesError } = await purchasesQuery;

        if (purchasesError) throw purchasesError;

        // Filtrar vehículos vendidos según filtro de consignación
        const soldPurchases = (purchasesData || []).filter((purchase: any) => {
          const statusName = purchase.vehicles?.status?.name?.toLowerCase() || '';
          const isSold = statusName.includes('vendido') || statusName.includes('sold');
          if (!isSold) return false;

          const isConsigned = purchase.vehicles?.is_consigned === true;
          const consignmentFilter = dateFilter?.consignmentFilter || 'all';

          if (consignmentFilter === 'consigned') {
            return isConsigned;
          } else if (consignmentFilter === 'not_consigned') {
            return !isConsigned;
          }
          // 'all' - incluir todos los vendidos
          return true;
        });

        // Mapear fecha de venta a compras
        const purchasesMap = new Map();
        soldPurchases.forEach((purchase: any) => {
          const sale = (salesData || []).find((s: any) => s.vehicle_id === purchase.vehicle_id);
          purchasesMap.set(purchase.vehicle_id, {
            ...purchase,
            sale_date: sale?.sale_date || purchase.purchase_date,
          });
        });

        // 4. Formatear expenses (gastos de vehicles_extras)
        const formattedExpenses: CostItem[] = (expensesData || []).map((expense: any) => {
          const vehicle = expense.vehicles;
          const brand = vehicle?.brands?.name || 'N/A';
          const model = vehicle?.models?.name || 'N/A';

          return {
            id: expense.id,
            vehicleId: expense.vehicle_id,
            vehicleInfo: vehicle ? `${brand} ${model} ${vehicle.year}` : 'N/A',
            title: expense.title,
            description: expense.description || '',
            amount: expense.amount || 0,
            type: 'expense' as const,
            categoryId: expense.category_id,
            categoryNameEs: expense.transaction_categories?.label_es || 'Sin categoría',
            categoryNameEn: expense.transaction_categories?.label_en || 'Uncategorized',
            createdAt: expense.created_at,
          };
        });

        // 6. Formatear compras de vehículos (solo NO consignados vendidos)
        // Los vehículos consignados no fueron comprados por la automotora,
        // por lo que su precio NO debe aparecer como gasto/adquisición.
        const formattedAcquisitions: CostItem[] = Array.from(purchasesMap.values())
          .filter((purchase: any) => {
            // Excluir vehículos consignados - no son una compra real
            if (purchase.vehicles?.is_consigned === true) return false;

            // Aplicar filtros de fecha usando sale_date
            let include = true;
            if (dateFilter?.startDate) {
              const saleDate = new Date(purchase.sale_date);
              include = include && saleDate >= dateFilter.startDate;
            }
            if (dateFilter?.endDate) {
              const saleDate = new Date(purchase.sale_date);
              include = include && saleDate <= dateFilter.endDate;
            }
            return include;
          })
          .map((purchase: any) => {
            const vehicle = purchase.vehicles;
            const brand = vehicle?.brands?.name || 'N/A';
            const model = vehicle?.models?.name || 'N/A';

            return {
              id: purchase.id * 1000000, // ID único
              vehicleId: purchase.vehicle_id,
              vehicleInfo: vehicle ? `${brand} ${model} ${vehicle.year}` : 'N/A',
              title: 'Compra de vehículo',
              description: `Precio de compra del vehículo`,
              amount: purchase.purchase_price || 0,
              type: 'acquisition' as const,
              categoryId: null,
              categoryNameEs: 'Compra de vehículos',
              categoryNameEn: 'Vehicle purchases',
              createdAt: purchase.sale_date,
            };
          });

        // 7. Formatear comisiones
        const formattedCommissions: CostItem[] = (salesData || [])
          .filter((sale: any) => sale.commission_amount > 0)
          .map((sale: any) => {
            const vehicle = sale.veh;
            const brand = vehicle?.brands?.name || 'N/A';
            const model = vehicle?.models?.name || 'N/A';

            return {
              id: sale.id * 2000000, // ID único
              vehicleId: sale.vehicle_id,
              vehicleInfo: vehicle ? `${brand} ${model} ${vehicle.year}` : 'N/A',
              title: 'Comisión de venta',
              description: `Comisión pagada por la venta del vehículo`,
              amount: sale.commission_amount || 0,
              type: 'commission' as const,
              categoryId: null,
              categoryNameEs: 'Comisiones',
              categoryNameEn: 'Commissions',
              createdAt: sale.sale_date,
            };
          });

        // 8. Combinar y ordenar todos los costos
        const allCosts = [
          ...formattedExpenses,
          ...formattedAcquisitions,
          ...formattedCommissions,
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setCosts(allCosts);

        // 7. Agrupar por categoría
        const categoriesMap = new Map<string, CostCategory>();

        allCosts.forEach((cost) => {
          // Determinar la clave de categoría
          let key: string;
          let categoryNameEs: string;
          let categoryNameEn: string;
          let categoryId: number | null;

          if (cost.type === 'acquisition' || cost.type === 'commission') {
            // Compras y comisiones mantienen su categoría especial
            key = cost.type;
            categoryNameEs = cost.categoryNameEs;
            categoryNameEn = cost.categoryNameEn;
            categoryId = null;
          } else if (cost.categoryId) {
            // Gastos con categoría
            key = cost.categoryId.toString();
            categoryNameEs = cost.categoryNameEs;
            categoryNameEn = cost.categoryNameEn;
            categoryId = cost.categoryId;
          } else {
            // Gastos sin categoría -> "Otros"
            key = 'uncategorized';
            categoryNameEs = 'Otros';
            categoryNameEn = 'Other';
            categoryId = null;
          }

          if (!categoriesMap.has(key)) {
            categoriesMap.set(key, {
              categoryId: categoryId,
              categoryNameEs: categoryNameEs,
              categoryNameEn: categoryNameEn,
              totalCost: 0,
              items: [],
            });
          }

          const category = categoriesMap.get(key)!;
          category.totalCost += cost.amount;
          category.items.push(cost);
        });

        setCategorizedCosts(Array.from(categoriesMap.values()));
        setError(null);
      } catch (err) {
        console.error('Error fetching costs summary:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setCosts([]);
        setCategorizedCosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCosts();
  }, [clientId, dateFilter, refetchTrigger]);

  return {
    costs,
    categorizedCosts,
    loading,
    error,
    refetch,
  };
};
