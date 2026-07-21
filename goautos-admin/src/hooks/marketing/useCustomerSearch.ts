import { useState, useEffect } from 'react';
import { calculateStringSimilarity } from './utils/similarityUtils';
import { processTransactions } from './utils/transactionUtils';
import { fetchCustomersData } from './utils/customerUtils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { PotentialCustomer } from './types';
import { supabase } from '@/integrations/supabase/client';

export const useCustomerSearch = (
  brandId?: string | number,
  modelId?: string | number,
  price?: string | number
) => {
  const [customers, setCustomers] = useState<PotentialCustomer[]>([]);
  const [priceRange, setPriceRange] = useState(45);
  const { clientId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hasCustomerTransactions, setHasCustomerTransactions] = useState<
    boolean | null
  >(null);
  const [searchParams, setSearchParams] = useState<{
    brand?: string;
    model?: string;
    price?: number;
  }>({});
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);

  // Check if customers_transactions table has data for this client
  useEffect(() => {
    const checkCustomerTransactions = async () => {
      if (!clientId) return;

      setLoading(true);
      try {
        const { count, error } = await supabase
          .from('customers_transactions')
          .select('*', { count: 'exact', head: true })
          .eq(
            'client_id',
            typeof clientId === 'string' ? parseInt(clientId, 10) : clientId
          );

        setHasCustomerTransactions(count !== null && count > 0);

        if (error) {
          console.error('Error checking customers_transactions:', error);
          setHasCustomerTransactions(false);
        }
      } catch (error) {
        console.error(
          'Unexpected error checking customers_transactions:',
          error
        );
        setHasCustomerTransactions(false);
      } finally {
        setLoading(false);
      }
    };

    checkCustomerTransactions();
  }, [clientId]);

  const searchPotentialCustomers = async (criteria?: {
    brand: boolean;
    model: boolean;
    price: boolean;
  }) => {
    if (!clientId || (!brandId && !modelId && !price)) {
      console.log('Marketing: Missing required search parameters', {
        brandId,
        modelId,
        clientId,
        price,
      });
      return;
    }

    // Set default criteria if none provided
    const searchCriteria = criteria || {
      brand: false,
      model: false,
      price: true,
    };

    setLoading(true);
    try {
      const { brandName, modelName, priceNum } = await fetchCustomersData(
        brandId,
        modelId,
        price
      );

      setSearchParams({
        brand: brandName,
        model: modelName,
        price: priceNum,
      });

      const uniqueCustomers = await processTransactions({
        clientId,
        priceNum,
        priceRange,
        searchCriteria,
        brandName,
        modelName,
      });

      console.log('Marketing: Final Processed Customers', {
        uniqueCustomers,
        totalProcessed: uniqueCustomers.length,
      });

      setCustomers(uniqueCustomers);
      // Auto-select all customers when search results change
      setSelectedCustomers(uniqueCustomers.map((c) => c.id));

      if (uniqueCustomers.length === 0) {
        toast({
          title: 'Información',
          description:
            'No se encontraron clientes potenciales con los criterios actuales',
        });
      } else {
        toast({
          title: 'Éxito',
          description: `Se encontraron ${uniqueCustomers.length} clientes potenciales`,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Marketing: Unexpected Error:', error);
      toast({
        title: 'Error',
        description:
          'Ocurrió un error inesperado al buscar clientes potenciales',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelection = (customerId: number) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllCustomers = () => {
    const allCustomerIds = customers.map((customer) => customer.id);
    setSelectedCustomers(allCustomerIds);
  };

  return {
    customers,
    loading,
    priceRange,
    setPriceRange,
    searchParams,
    searchPotentialCustomers,
    selectedCustomers,
    handleCustomerSelection,
    selectAllCustomers,
    hasCustomerTransactions,
  };
};
