import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CustomerTransactionRow } from '@/utils/excelExport';

export const useCustomerTransactions = (clientId: number | undefined) => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<CustomerTransactionRow[]>([]);

  const fetchAllTransactions = useCallback(async () => {
    if (!clientId) {
      console.log('[useCustomerTransactions] No clientId, returning empty');
      return [];
    }

    setLoading(true);
    try {
      const allTransactions: CustomerTransactionRow[] = [];

      // 1. Fetch all SALES with customer info
      const { data: salesData, error: salesError } = await supabase
        .from('vehicles_sales')
        .select(`
          id,
          sale_date,
          sale_price,
          commission_amount,
          customer_id,
          vehicle_id,
          status,
          customers:customer_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            rut
          ),
          vehicles:vehicle_id (
            id,
            license_plate,
            year,
            is_consigned,
            client_id,
            brands:brand_id (name),
            models:model_id (name)
          )
        `)
        .eq('status', 'approved');

      console.log('[useCustomerTransactions] Sales raw data:', salesData?.length || 0);
      if (salesError) {
        console.error('[useCustomerTransactions] Error fetching sales:', salesError);
      }

      // Filter by client_id in JavaScript (Supabase nested filtering can be unreliable)
      const clientSales = (salesData || []).filter(
        (s: any) => s.vehicles?.client_id === clientId
      );
      console.log('[useCustomerTransactions] Sales after filter:', clientSales.length);

      // Get vehicle IDs for extras query
      const saleVehicleIds = clientSales.map((s: any) => s.vehicle_id);

      // Fetch extras for all sale vehicles
      const extrasMap = new Map<number, number>();
      if (saleVehicleIds.length > 0) {
        const { data: extrasData } = await supabase
          .from('vehicles_extras')
          .select('vehicle_id, amount, type')
          .in('vehicle_id', saleVehicleIds);

        (extrasData || []).forEach((extra: any) => {
          const current = extrasMap.get(extra.vehicle_id) || 0;
          const amount = Number(extra.amount) || 0;
          if (extra.type === 'expense') {
            extrasMap.set(extra.vehicle_id, current + amount);
          }
        });
      }

      // Fetch acquisition prices for sale vehicles
      const acquisitionMap = new Map<number, number>();

      // Get purchase prices
      const nonConsignedIds = clientSales
        .filter((s: any) => !s.vehicles?.is_consigned)
        .map((s: any) => s.vehicle_id);

      if (nonConsignedIds.length > 0) {
        const { data: purchasesData } = await supabase
          .from('vehicles_purchases')
          .select('vehicle_id, purchase_price')
          .in('vehicle_id', nonConsignedIds);

        (purchasesData || []).forEach((p: any) => {
          if (!acquisitionMap.has(p.vehicle_id)) {
            acquisitionMap.set(p.vehicle_id, Number(p.purchase_price) || 0);
          }
        });
      }

      // Get consignment prices
      const consignedIds = clientSales
        .filter((s: any) => s.vehicles?.is_consigned)
        .map((s: any) => s.vehicle_id);

      if (consignedIds.length > 0) {
        const { data: consignmentsData } = await supabase
          .from('vehicles_consignments')
          .select('vehicle_id, agreed_price')
          .in('vehicle_id', consignedIds);

        (consignmentsData || []).forEach((c: any) => {
          if (!acquisitionMap.has(c.vehicle_id)) {
            acquisitionMap.set(c.vehicle_id, Number(c.agreed_price) || 0);
          }
        });
      }

      // Map sales to transactions
      clientSales.forEach((sale: any) => {
        const customer = sale.customers;
        const vehicle = sale.vehicles;
        const salePrice = Number(sale.sale_price) || 0;
        const commission = Number(sale.commission_amount) || 0;
        const acquisitionPrice = acquisitionMap.get(sale.vehicle_id) || 0;
        const extras = extrasMap.get(sale.vehicle_id) || 0;
        const netProfit = salePrice - acquisitionPrice - extras - commission;

        allTransactions.push({
          transactionId: sale.id,
          transactionType: 'sale',
          transactionDate: sale.sale_date,
          vehicleId: sale.vehicle_id,
          vehiclePatent: vehicle?.license_plate || '',
          vehicleBrand: vehicle?.brands?.name || '',
          vehicleModel: vehicle?.models?.name || '',
          vehicleYear: vehicle?.year || 0,
          personId: customer?.id || 0,
          personName: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : '',
          personEmail: customer?.email || '',
          personPhone: customer?.phone || '',
          personRut: customer?.rut || '',
          acquisitionPrice,
          additionalExpenses: extras,
          salePrice,
          commission,
          netProfit,
        });
      });

      // 2. Fetch all PURCHASES
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('vehicles_purchases')
        .select(`
          id,
          purchase_date,
          purchase_price,
          vehicle_id,
          customer_id,
          vehicles:vehicle_id (
            id,
            license_plate,
            year,
            client_id,
            brands:brand_id (name),
            models:model_id (name)
          )
        `);

      console.log('[useCustomerTransactions] Purchases raw data:', purchasesData?.length || 0);
      if (purchasesError) {
        console.error('[useCustomerTransactions] Error fetching purchases:', purchasesError);
      }

      // Filter by client_id in JavaScript
      const clientPurchases = (purchasesData || []).filter(
        (p: any) => p.vehicles?.client_id === clientId
      );
      console.log('[useCustomerTransactions] Purchases after filter:', clientPurchases.length);

      // Fetch extras for purchase vehicles
      const purchaseVehicleIds = clientPurchases.map((p: any) => p.vehicle_id);
      const purchaseExtrasMap = new Map<number, number>();

      if (purchaseVehicleIds.length > 0) {
        const { data: purchaseExtrasData } = await supabase
          .from('vehicles_extras')
          .select('vehicle_id, amount, type')
          .in('vehicle_id', purchaseVehicleIds);

        (purchaseExtrasData || []).forEach((extra: any) => {
          const current = purchaseExtrasMap.get(extra.vehicle_id) || 0;
          const amount = Number(extra.amount) || 0;
          if (extra.type === 'expense') {
            purchaseExtrasMap.set(extra.vehicle_id, current + amount);
          }
        });
      }

      // Fetch customer data for purchases
      const purchaseCustomerIds = clientPurchases
        .map((p: any) => p.customer_id)
        .filter((id: any) => id != null);

      const purchaseCustomersMap = new Map<number, any>();
      if (purchaseCustomerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email, phone, rut')
          .in('id', purchaseCustomerIds);

        (customersData || []).forEach((c: any) => {
          purchaseCustomersMap.set(c.id, c);
        });
      }

      // Map purchases to transactions
      clientPurchases.forEach((purchase: any) => {
        const customer = purchaseCustomersMap.get(purchase.customer_id);
        const vehicle = purchase.vehicles;

        allTransactions.push({
          transactionId: purchase.id,
          transactionType: 'purchase',
          transactionDate: purchase.purchase_date,
          vehicleId: purchase.vehicle_id,
          vehiclePatent: vehicle?.license_plate || '',
          vehicleBrand: vehicle?.brands?.name || '',
          vehicleModel: vehicle?.models?.name || '',
          vehicleYear: vehicle?.year || 0,
          personId: customer?.id || 0,
          personName: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : '',
          personEmail: customer?.email || '',
          personPhone: customer?.phone || '',
          personRut: customer?.rut || '',
          acquisitionPrice: Number(purchase.purchase_price) || 0,
          additionalExpenses: purchaseExtrasMap.get(purchase.vehicle_id) || 0,
          salePrice: null,
          commission: 0,
          netProfit: null,
        });
      });

      // 3. Fetch all CONSIGNMENTS
      const { data: consignmentsData, error: consignmentsError } = await supabase
        .from('vehicles_consignments')
        .select(`
          id,
          created_at,
          agreed_price,
          vehicle_id,
          customer_id,
          vehicles:vehicle_id (
            id,
            license_plate,
            year,
            client_id,
            brands:brand_id (name),
            models:model_id (name)
          )
        `);

      console.log('[useCustomerTransactions] Consignments raw data:', consignmentsData?.length || 0);
      if (consignmentsError) {
        console.error('[useCustomerTransactions] Error fetching consignments:', consignmentsError);
      }

      // Filter by client_id in JavaScript
      const clientConsignments = (consignmentsData || []).filter(
        (c: any) => c.vehicles?.client_id === clientId
      );
      console.log('[useCustomerTransactions] Consignments after filter:', clientConsignments.length);

      // Fetch extras for consignment vehicles
      const consignmentVehicleIds = clientConsignments.map((c: any) => c.vehicle_id);
      const consignmentExtrasMap = new Map<number, number>();

      if (consignmentVehicleIds.length > 0) {
        const { data: consignmentExtrasData } = await supabase
          .from('vehicles_extras')
          .select('vehicle_id, amount, type')
          .in('vehicle_id', consignmentVehicleIds);

        (consignmentExtrasData || []).forEach((extra: any) => {
          const current = consignmentExtrasMap.get(extra.vehicle_id) || 0;
          const amount = Number(extra.amount) || 0;
          if (extra.type === 'expense') {
            consignmentExtrasMap.set(extra.vehicle_id, current + amount);
          }
        });
      }

      // Fetch customer data for consignments
      const consignmentCustomerIds = clientConsignments
        .map((c: any) => c.customer_id)
        .filter((id: any) => id != null);

      const consignmentCustomersMap = new Map<number, any>();
      if (consignmentCustomerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email, phone, rut')
          .in('id', consignmentCustomerIds);

        (customersData || []).forEach((c: any) => {
          consignmentCustomersMap.set(c.id, c);
        });
      }

      // Map consignments to transactions
      clientConsignments.forEach((consignment: any) => {
        const customer = consignmentCustomersMap.get(consignment.customer_id);
        const vehicle = consignment.vehicles;

        allTransactions.push({
          transactionId: consignment.id,
          transactionType: 'consignment',
          transactionDate: consignment.created_at,
          vehicleId: consignment.vehicle_id,
          vehiclePatent: vehicle?.license_plate || '',
          vehicleBrand: vehicle?.brands?.name || '',
          vehicleModel: vehicle?.models?.name || '',
          vehicleYear: vehicle?.year || 0,
          personId: customer?.id || 0,
          personName: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : '',
          personEmail: customer?.email || '',
          personPhone: customer?.phone || '',
          personRut: customer?.rut || '',
          acquisitionPrice: Number(consignment.agreed_price) || 0,
          additionalExpenses: consignmentExtrasMap.get(consignment.vehicle_id) || 0,
          salePrice: null,
          commission: 0,
          netProfit: null,
        });
      });

      // Sort by date descending
      allTransactions.sort((a, b) => {
        const dateA = new Date(a.transactionDate || 0).getTime();
        const dateB = new Date(b.transactionDate || 0).getTime();
        return dateB - dateA;
      });

      console.log('[useCustomerTransactions] Final breakdown:', {
        total: allTransactions.length,
        sales: allTransactions.filter(t => t.transactionType === 'sale').length,
        purchases: allTransactions.filter(t => t.transactionType === 'purchase').length,
        consignments: allTransactions.filter(t => t.transactionType === 'consignment').length,
      });

      setTransactions(allTransactions);
      return allTransactions;
    } catch (error) {
      console.error('[useCustomerTransactions] Error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  return {
    transactions,
    loading,
    fetchAllTransactions,
  };
};
