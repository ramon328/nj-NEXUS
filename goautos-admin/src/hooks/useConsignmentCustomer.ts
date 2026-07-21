import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useConsignmentCustomer(vehicleId?: number) {
  const [customer, setCustomer] = useState<any>(null);
  const [consignmentSeller, setConsignmentSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConsignmentCustomer() {
      setLoading(true);
      if (!vehicleId) {
        setCustomer(null);
        setConsignmentSeller(null);
        setLoading(false);
        return;
      }

      // 1. Buscar el registro de consignación
      const { data: consignment, error: consignmentError } = await supabase
        .from('vehicles_consignments')
        .select('customer_id, consignment_seller_id')
        .eq('vehicle_id', vehicleId)
        .single();

      if (consignmentError || !consignment) {
        setCustomer(null);
        setConsignmentSeller(null);
        setLoading(false);
        return;
      }

      // 2. Buscar el cliente
      if (consignment.customer_id) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', consignment.customer_id)
          .single();
        setCustomer(customerData || null);
      } else {
        setCustomer(null);
      }

      // 3. Buscar el vendedor que captó la consigna
      if (consignment.consignment_seller_id) {
        const { data: sellerData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .eq('id', consignment.consignment_seller_id)
          .single();
        setConsignmentSeller(sellerData || null);
      } else {
        setConsignmentSeller(null);
      }

      setLoading(false);
    }

    fetchConsignmentCustomer();
  }, [vehicleId]);

  return { customer, consignmentSeller, loading };
}
