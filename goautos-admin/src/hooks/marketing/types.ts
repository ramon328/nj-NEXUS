
export interface PotentialCustomer {
  id: number;
  name: string;
  email: string;
  lastPurchase: string;
  similarityScore: number;
  price: number;
}

export interface CustomerTransaction {
  customer_id: number;
  brand?: string;
  model?: string;
  price?: number;
  similarity_score?: number;
}

export interface SearchCriteria {
  brand: boolean;
  model: boolean;
  price: boolean;
}

export interface ProcessTransactionsParams {
  clientId: string | number;
  priceNum: number;
  priceRange: number;
  searchCriteria: SearchCriteria;
  brandName: string;
  modelName: string;
}
