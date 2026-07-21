
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useFinancingFormData = () => {
  const { clientId } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVehicles = async () => {
    if (!clientId) {
      console.log('[useFinancingFormData] No clientId, skipping vehicle fetch');
      return;
    }

    console.log('[useFinancingFormData] Fetching vehicles for clientId:', clientId);

    const { data, error } = await supabase
      .from('vehicles')
      .select('id, brand_id, model_id, year, license_plate')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[useFinancingFormData] Error fetching vehicles:', error);
    } else {
      console.log('[useFinancingFormData] Vehicles fetched:', data?.length || 0, 'vehicles');
      setVehicles(data || []);
    }
  };

  const fetchCustomers = async () => {
    if (!clientId) {
      console.log('[useFinancingFormData] No clientId, skipping customer fetch');
      return;
    }

    console.log('[useFinancingFormData] Fetching customers for clientId:', clientId);

    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, rut')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false});

    if (error) {
      console.error('[useFinancingFormData] Error fetching customers:', error);
    } else {
      console.log('[useFinancingFormData] Customers fetched:', data?.length || 0, 'customers');
      setCustomers(data || []);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchVehicles();
      fetchCustomers();
    }
  }, [clientId]);

  return {
    vehicles,
    customers,
    isLoading,
    setIsLoading
  };
};
