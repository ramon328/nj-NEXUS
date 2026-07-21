
import { supabase } from '@/integrations/supabase/client';
import { calculateStringSimilarity } from './similarityUtils';
import type { ProcessTransactionsParams, CustomerTransaction, PotentialCustomer } from '../types';

export const processTransactions = async ({
  clientId,
  priceNum,
  priceRange,
  searchCriteria,
  brandName,
  modelName
}: ProcessTransactionsParams): Promise<PotentialCustomer[]> => {
  let query = supabase
    .from('customers_transactions')
    .select(`
      customer_id,
      brand,
      model,
      price
    `);
    
  // Ensure clientId is properly typed before using in query
  if (typeof clientId === 'string') {
    query = query.eq('client_id', parseInt(clientId, 10));
  } else {
    query = query.eq('client_id', clientId);
  }
  
  if (priceNum && searchCriteria.price) {
    const minPrice = priceNum * (1 - priceRange/100);
    const maxPrice = priceNum * (1 + priceRange/100);
    query = query
      .gte('price', minPrice)
      .lte('price', maxPrice);
  }

  const { data: similarCustomers, error } = await query;

  if (error) {
    console.error('Marketing: Error fetching similar customers:', error);
    throw error;
  }

  const transactionsWithScores = (similarCustomers || []).map(transaction => {
    let score = 0;
    let criteriaCount = 0;

    if (searchCriteria.brand) {
      score += calculateStringSimilarity(
        (transaction.brand || '').toLowerCase(), 
        brandName.toLowerCase()
      );
      criteriaCount++;
    }
    
    if (searchCriteria.model) {
      score += calculateStringSimilarity(
        (transaction.model || '').toLowerCase(), 
        modelName.toLowerCase()
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

  // Process customers with unique customer_id
  const customerMap = new Map<number, PotentialCustomer>();
  
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

  return Array.from(customerMap.values());
};
