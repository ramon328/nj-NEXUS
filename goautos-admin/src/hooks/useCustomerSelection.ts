import { useState, useEffect, useMemo } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UseCustomerSelectionOptions {
  excludeConsignmentOnly?: boolean;
}

export const useCustomerSelection = (options?: UseCustomerSelectionOptions) => {
  const { clientId } = useAuth();
  const { customers, loading: customersLoading, refetchCustomers } = useCustomers(clientId);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [consignmentOnlyIds, setConsignmentOnlyIds] = useState<Set<number>>(new Set());
  const [loadingConsignmentFilter, setLoadingConsignmentFilter] = useState(false);

  // Fetch consignment-only customer IDs to exclude from sale selector
  useEffect(() => {
    if (!options?.excludeConsignmentOnly || !clientId || customers.length === 0) {
      setConsignmentOnlyIds(new Set());
      return;
    }

    const fetchConsignmentOnlyIds = async () => {
      try {
        setLoadingConsignmentFilter(true);
        const customerIds = customers.map((c) => c.id);

        // Get customers linked to consignments
        const { data: consignmentCustomers } = await supabase
          .from('vehicles_consignments')
          .select('customer_id')
          .in('customer_id', customerIds);

        const consignmentIds = new Set(
          consignmentCustomers?.map((c) => c.customer_id).filter(Boolean) || []
        );

        if (consignmentIds.size === 0) {
          setConsignmentOnlyIds(new Set());
          return;
        }

        // Get customers who have also been buyers
        const { data: saleCustomers } = await supabase
          .from('vehicles_sales')
          .select('customer_id')
          .in('customer_id', Array.from(consignmentIds));

        const buyerIds = new Set(
          saleCustomers?.map((c) => c.customer_id).filter(Boolean) || []
        );

        // Consignment-only = in consignments but NOT in sales
        const onlyConsignment = new Set<number>();
        consignmentIds.forEach((id) => {
          if (!buyerIds.has(id)) {
            onlyConsignment.add(id);
          }
        });

        setConsignmentOnlyIds(onlyConsignment);
      } catch (error) {
        console.error('Error fetching consignment-only customers:', error);
        setConsignmentOnlyIds(new Set());
      } finally {
        setLoadingConsignmentFilter(false);
      }
    };

    fetchConsignmentOnlyIds();
  }, [options?.excludeConsignmentOnly, clientId, customers]);

  const loading = customersLoading || loadingConsignmentFilter;

  // Apply consignment filter then search filter
  const availableCustomers = useMemo(() => {
    if (!options?.excludeConsignmentOnly || consignmentOnlyIds.size === 0) {
      return customers;
    }
    return customers.filter((c) => !consignmentOnlyIds.has(c.id));
  }, [customers, consignmentOnlyIds, options?.excludeConsignmentOnly]);

  const filteredCustomers = useMemo(() => {
    if (searchTerm.length === 0) return availableCustomers;
    return availableCustomers.filter((customer) => {
      const fullName = `${customer.first_name || ''} ${
        customer.last_name || ''
      }`.toLowerCase();
      const email = (customer.email || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
  }, [availableCustomers, searchTerm]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const resetSelection = () => {
    setSelectedCustomerId(null);
    setSearchTerm('');
    setShowNewCustomerForm(false);
  };

  return {
    customers: availableCustomers,
    loading,
    filteredCustomers,
    selectedCustomerId,
    setSelectedCustomerId,
    searchTerm,
    setSearchTerm,
    selectedCustomer,
    showNewCustomerForm,
    setShowNewCustomerForm,
    resetSelection,
    refetchCustomers,
  };
};
