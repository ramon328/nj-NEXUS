import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SaleDocumentData {
  saleData: any;
  vehicleData: any;
  customerData: any;
  extraTransactions: any[];
  saleAdditionals: any[];
  saleIncomes: any[];
  allAdditionals: any[];
  reservationPayments: any[];
  loading: boolean;
  documentData?: any;
  tradeInVehicle?: any;
  tradeInVehicles?: any[];
}

export const useSaleDocumentData = (documentId: number, isOpen: boolean) => {
  const [loading, setLoading] = useState(true);
  const [saleData, setSaleData] = useState<any>(null);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [extraTransactions, setExtraTransactions] = useState<any[]>([]);
  const [saleAdditionals, setSaleAdditionals] = useState<any[]>([]);
  const [saleIncomes, setSaleIncomes] = useState<any[]>([]);
  const [allAdditionals, setAllAdditionals] = useState<any[]>([]);
  const [reservationPayments, setReservationPayments] = useState<any[]>([]);
  const [documentData, setDocumentData] = useState<any>(null);
  const [tradeInVehicle, setTradeInVehicle] = useState<any>(null);
  const [tradeInVehicles, setTradeInVehicles] = useState<any[]>([]);
  const { client, clientId } = useAuth();

  useEffect(() => {
    const fetchSaleDocumentData = async () => {
      if (!documentId || !isOpen) return;

      setLoading(true);
      try {
        // 1. Fetch document and related sale record
        const { data: document, error: documentError } = await supabase
          .from('vehicles_documents')
          .select('*, vehicles_sales(*)')
          .eq('id', documentId)
          .eq('type', 'sale')
          .single();

        if (documentError) {
          console.error('Error fetching document:', documentError);
          return;
        }

        if (!document) {
          console.error('Document not found');
          return;
        }

        setDocumentData(document);

        // Fetch template terms & conditions based on client id
        if (client?.id) {
          try {
            const { data: templateData } = await supabase
              .from('document_templates')
              .select('*')
              .eq('client_id', client.id)
              .eq('template_type', 'sale')
              .single();

            if (templateData) {
              // Add terms to document data safely
              (document as any).terms_and_conditions =
                templateData.terms_and_conditions;
            }
          } catch (templateError) {
            console.error('Error fetching template data:', templateError);
          }
        }

        let saleRecord = null;

        // If there's a related sale record in the document, use it
        // PostgREST may return an object (1:1) or array (1:many) depending on FK constraints
        const linkedSales = document.vehicles_sales;
        if (linkedSales && Array.isArray(linkedSales) && linkedSales.length > 0) {
          saleRecord = linkedSales[0];
        } else if (linkedSales && !Array.isArray(linkedSales) && typeof linkedSales === 'object' && (linkedSales as any).id) {
          saleRecord = linkedSales;
        } else {
          // Fallback: search by vehicle_id. If the document has a customer_id, filter by it
          // to avoid picking up a different sale for the same vehicle.
          let saleQuery = supabase
            .from('vehicles_sales')
            .select('*')
            .eq('vehicle_id', document.vehicle_id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (document.customer_id) {
            saleQuery = supabase
              .from('vehicles_sales')
              .select('*')
              .eq('vehicle_id', document.vehicle_id)
              .eq('customer_id', document.customer_id)
              .order('created_at', { ascending: false })
              .limit(1);
          }

          const { data: saleData, error: saleError } = await saleQuery.maybeSingle();

          if (saleError) {
            console.error('Error fetching sale record:', saleError);
          } else if (saleData) {
            saleRecord = saleData;
          }
        }

        // Track trade-in transaction to merge with extras later
        let tradeInTransactionItem: any = null;

        // Set the sale data if we found a record
        if (saleRecord) {
          // Copy terms and conditions from document to sale record safely
          if ((document as any).terms_and_conditions) {
            (saleRecord as any).terms_and_conditions = (
              document as any
            ).terms_and_conditions;
          }
          setSaleData(saleRecord);

          // Fetch trade-in vehicles: try junction table first, then legacy
          if (saleRecord.has_trade_in && saleRecord.trade_in_value > 0) {
            const { data: junctionRows, error: junctionError } = await supabase
              .from('vehicles_sales_trade_ins')
              .select('*')
              .eq('vehicle_sale_id', saleRecord.id);

            if (junctionError) {
              console.error('[SaleDocData] Error fetching trade-in junction rows:', junctionError);
            }

            if (junctionRows && junctionRows.length > 0) {
              // New format: multiple trade-ins
              const vehicles = junctionRows.map((row: any) => ({
                brand: row.brand_name || '',
                model: row.model_name || '',
                version: '',
                year: row.year,
                license_plate: row.license_plate || '',
                color: '',
                value: row.trade_in_value || 0,
              }));
              setTradeInVehicles(vehicles);
              setTradeInVehicle(vehicles[0]); // backwards compat for SaleNote

              const totalValue = vehicles.reduce((s: number, v: any) => s + (v.value || 0), 0);
              tradeInTransactionItem = {
                id: `trade-in-multi-${saleRecord.id}`,
                description: `Vehículos en parte de pago (${vehicles.length})`,
                amount: totalValue,
                type: 'income',
              };
            } else if (saleRecord.trade_in_vehicle_id) {
              // Legacy fallback: single trade-in
              const { data: tradeInVehicleData } = await supabase
                .from('vehicles')
                .select('*, brand:brand_id(*), model:model_id(*), color:color_id(*)')
                .eq('id', saleRecord.trade_in_vehicle_id)
                .eq('client_id', clientId)
                .maybeSingle();

              if (tradeInVehicleData) {
                const brandName = tradeInVehicleData.brand?.name || '';
                const modelName = tradeInVehicleData.model?.name || '';
                const colorName = tradeInVehicleData.color?.name || '';

                const tv = {
                  brand: brandName,
                  model: modelName,
                  version: tradeInVehicleData.version || '',
                  year: tradeInVehicleData.year,
                  license_plate: tradeInVehicleData.license_plate,
                  color: colorName,
                  value: saleRecord.trade_in_value,
                };
                setTradeInVehicle(tv);
                setTradeInVehicles([tv]);

                tradeInTransactionItem = {
                  id: `trade-in-${saleRecord.trade_in_vehicle_id}`,
                  description: `Vehículo en parte de pago: ${brandName} ${modelName} ${tradeInVehicleData.year || ''} (${tradeInVehicleData.license_plate || ''})`,
                  amount: saleRecord.trade_in_value,
                  type: 'income',
                };
              }
            } else {
              const tv = {
                brand: 'Vehículo',
                model: 'en parte de pago',
                version: '',
                year: null,
                license_plate: '',
                color: '',
                value: saleRecord.trade_in_value,
              };
              setTradeInVehicle(tv);
              setTradeInVehicles([tv]);

              tradeInTransactionItem = {
                id: `trade-in-${saleRecord.id}`,
                description: `Vehículo en parte de pago`,
                amount: saleRecord.trade_in_value,
                type: 'income',
              };
            }
          }
        }

        // 2. Fetch vehicle data
        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select(
            '*, brand:brand_id(*), model:model_id(*), color:color_id(*), category:category_id(*)'
          )
          .eq('id', document.vehicle_id)
          .eq('client_id', clientId)
          .single();

        if (vehicleError) {
          console.error('Error fetching vehicle:', vehicleError);
          return;
        }

        setVehicleData(vehicle);

        // 3. Fetch customer data
        // Try to get customer from both the document and sale record
        const customerId = document.customer_id || saleRecord?.customer_id;

        if (customerId) {
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .maybeSingle();

          if (customerError) {
            console.error('Error fetching customer:', customerError);
            // Don't return — document can still render without customer data
          }

          setCustomerData(customer);
        }

        // 4. Fetch all extras and separate sale additionals from other transactions
        const { data: extras, error: extrasError } = await supabase
          .from('vehicles_extras')
          .select('*')
          .eq('vehicle_id', document.vehicle_id);

        if (extrasError) {
          console.error('Error fetching extras:', extrasError);
          return;
        }

        if (extras && extras.length > 0) {
          // Separate sale additionals from other transactions.
          // Solo se incluyen en la nota de venta los extras pagados por el cliente final
          // (assumed_by='customer'). Los descontados al consignador no aparecen porque
          // el comprador no los paga.
          const saleAdditionalsData = extras.filter(
            (extra) =>
              extra.type === 'sale_additional' &&
              (extra.assumed_by ?? 'dealership') === 'customer'
          );
          const saleIncomesData = extras.filter(
            (extra) =>
              extra.type === 'sale_income' &&
              (extra.assumed_by ?? 'customer') === 'customer'
          );
          const reservationAdditionalsData = extras.filter(
            (extra) => extra.type === 'reservation_additional'
          );
          const reservationPaymentsData = extras.filter(
            (extra) => extra.type === 'reservation_payment'
          );
          const otherTransactions = extras.filter(
            (extra) =>
              extra.type !== 'sale_additional' &&
              extra.type !== 'sale_income' &&
              extra.type !== 'reservation_additional' &&
              extra.type !== 'reservation_payment'
          );

          // Consolidate all additionals (reservation + sale) for the financial summary
          const allAdditionalsData = [
            ...reservationAdditionalsData,
            ...saleAdditionalsData,
          ];

          // Set sale additionals (for the dedicated additionals section)
          setSaleAdditionals(saleAdditionalsData);

          // Set sale incomes (accessories, insurance, packages)
          setSaleIncomes(saleIncomesData);

          // Set reservation payments
          setReservationPayments(reservationPaymentsData);

          // Merge trade-in transaction with other extras (avoid overwrite)
          const allExtras = tradeInTransactionItem
            ? [...otherTransactions, tradeInTransactionItem]
            : otherTransactions;
          setExtraTransactions(allExtras);

          // Set all additionals
          setAllAdditionals(allAdditionalsData);
        } else {
          // No extras found - clear all extras state and keep trade-in if exists
          setSaleAdditionals([]);
          setSaleIncomes([]);
          setReservationPayments([]);
          setAllAdditionals([]);
          setExtraTransactions(tradeInTransactionItem ? [tradeInTransactionItem] : []);
        }
      } catch (error) {
        console.error('Error in fetchSaleDocumentData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSaleDocumentData();
  }, [documentId, isOpen, client, clientId]);

  return {
    loading,
    saleData,
    vehicleData,
    customerData,
    extraTransactions,
    saleAdditionals,
    saleIncomes,
    allAdditionals,
    documentData,
    tradeInVehicle,
    tradeInVehicles,
    reservationPayments,
  };
};
