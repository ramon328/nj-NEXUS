
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface PotentialCustomer {
  id: number;
  name: string;
  email: string;
  lastPurchase: string;
  similarityScore: number;
  price: number;
}

export const useVehiclePotentialCustomers = (
  brandId?: string | number, 
  modelId?: string | number, 
  price?: string | number
) => {
  const [customers, setCustomers] = useState<PotentialCustomer[]>([]);
  const [priceRange, setPriceRange] = useState(45); // Increased default range to 45%
  const { clientId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<{
    brand?: string;
    model?: string;
    price?: number;
  }>({});
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);

  const searchPotentialCustomers = async (criteria?: { brand: boolean; model: boolean; price: boolean }) => {
    if (!clientId || (!brandId && !modelId && !price)) {
      console.log('Marketing: Missing required search parameters', { 
        brandId, 
        modelId, 
        clientId,
        price 
      });
      return;
    }
    
    // Set default criteria if none provided
    const searchCriteria = criteria || { brand: false, model: false, price: true };
    
    setLoading(true);
    try {
      const brandIdStr = typeof brandId === 'number' ? brandId.toString() : brandId;
      const modelIdNum = typeof modelId === 'string' ? parseInt(modelId, 10) : modelId;
      const priceNum = typeof price === 'string' ? parseFloat(price) : price;

      const { data: brandData } = await supabase
        .from('brands')
        .select('name')
        .eq('id', brandIdStr)
        .single();
        
      const { data: modelData } = await supabase
        .from('models')
        .select('name')
        .eq('id', modelIdNum)
        .single();

      if (!brandData?.name || !modelData?.name) {
        console.log('Marketing: Could not find brand or model', { 
          brandData, 
          modelData 
        });
        setLoading(false);
        return;
      }

      setSearchParams({
        brand: brandData.name,
        model: modelData.name,
        price: priceNum
      });

      let query = supabase
        .from('customers_transactions')
        .select(`
          customer_id,
          brand,
          model,
          price
        `)
        .eq('client_id', clientId);
      
      if (priceNum && searchCriteria.price) {
        const minPrice = priceNum * (1 - priceRange/100);
        const maxPrice = priceNum * (1 + priceRange/100);
        query = query
          .gte('price', minPrice)
          .lte('price', maxPrice);
      }

      const { data: similarCustomers, error } = await query;

      console.log('Marketing: Similar Transactions Query Result', {
        similarCustomers,
        error,
        params: {
          brand: brandData.name,
          model: modelData.name,
          price: priceNum,
          priceRange,
          clientId
        }
      });

      if (error) {
        console.error('Marketing: Error fetching similar customers:', error);
        toast({
          title: "Error",
          description: "No se pudieron encontrar clientes similares",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const transactionsWithScores = (similarCustomers || []).map(transaction => {
        let score = 0;
        let criteriaCount = 0;

        if (searchCriteria.brand) {
          score += calculateStringSimilarity(
            (transaction.brand || '').toLowerCase(), 
            brandData?.name.toLowerCase() || ''
          );
          criteriaCount++;
        }
        
        if (searchCriteria.model) {
          score += calculateStringSimilarity(
            (transaction.model || '').toLowerCase(), 
            modelData?.name.toLowerCase() || ''
          );
          criteriaCount++;
        }
        
        if (searchCriteria.price && priceNum && transaction.price) {
          const priceDiff = Math.abs(transaction.price - priceNum) / priceNum;
          const priceScore = Math.max(0, 1 - priceDiff);
          score += priceScore;
          criteriaCount++;
        }
        
        const finalScore = criteriaCount > 0 ? score / criteriaCount : 0;
        
        return {
          ...transaction,
          similarity_score: finalScore
        };
      });
      
      const filteredTransactions = transactionsWithScores
        .filter(t => t.similarity_score >= 0.3)
        .sort((a, b) => b.similarity_score - a.similarity_score);

      console.log('Marketing: Calculated similarity scores', {
        scores: filteredTransactions.map(t => ({
          customer_id: t.customer_id,
          brand: t.brand,
          model: t.model,
          score: t.similarity_score
        }))
      });

      // Process customers with unique customer_id
      const customerMap = new Map();
      
      await Promise.all(
        filteredTransactions.map(async (transaction) => {
          // Skip if we already processed this customer
          if (customerMap.has(transaction.customer_id)) return;
          
          const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('id', transaction.customer_id)
            .single();
            
          if (customer) {
            customerMap.set(transaction.customer_id, {
              id: customer.id,
              name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
              email: customer.email || '',
              lastPurchase: `${transaction.brand} ${transaction.model}`,
              similarityScore: transaction.similarity_score,
              price: transaction.price
            });
          }
        })
      );

      const uniqueCustomers = Array.from(customerMap.values()) as PotentialCustomer[];
      
      console.log('Marketing: Final Processed Customers', {
        uniqueCustomers,
        totalProcessed: uniqueCustomers.length,
        similarityScores: uniqueCustomers.map(c => ({
          name: c.name,
          score: c.similarityScore,
          lastPurchase: c.lastPurchase
        }))
      });

      setCustomers(uniqueCustomers);
      // Clear previously selected customers when search results change
      setSelectedCustomers([]);
      
      if (uniqueCustomers.length === 0) {
        toast({
          title: "Información",
          description: "No se encontraron clientes potenciales con los criterios actuales",
        });
      } else {
        toast({
          title: "Éxito",
          description: `Se encontraron ${uniqueCustomers.length} clientes potenciales`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Marketing: Unexpected Error:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al buscar clientes potenciales",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStringSimilarity = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;
    
    const words1 = str1.split(/\s+/).filter(Boolean);
    const words2 = str2.split(/\s+/).filter(Boolean);
    
    let matches = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matches++;
      }
    }
    
    const totalWords = Math.max(words1.length, words2.length);
    return totalWords > 0 ? matches / totalWords : 0;
  };

  const handleCustomerSelection = useCallback((customerId: number) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  }, []);

  const selectAllCustomers = useCallback(() => {
    const allCustomerIds = customers.map(customer => customer.id);
    setSelectedCustomers(allCustomerIds);
  }, [customers]);

  useEffect(() => {
    // Initial search with default criteria (only price)
    searchPotentialCustomers({ brand: false, model: false, price: true });
  }, [brandId, modelId, price, clientId, priceRange]);

  return {
    customers,
    loading,
    priceRange,
    setPriceRange,
    searchParams,
    searchPotentialCustomers,
    selectedCustomers,
    handleCustomerSelection,
    selectAllCustomers
  };
};
