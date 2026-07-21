
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useCustomerData = (customerId: number | null) => {
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!customerId) {
        console.log("No customer_id provided");
        return;
      }
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();
        
        if (error) {
          console.error("Error fetching customer:", error);
          return;
        }
        
        console.log("Fetched customer:", data);
        setCustomer(data);
      } catch (error) {
        console.error("Exception fetching customer:", error);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  return { customer, loading };
};
