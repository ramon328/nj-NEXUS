-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS find_similar_customers;
DROP FUNCTION IF EXISTS find_similar_buyers;
DROP FUNCTION IF EXISTS find_similar_sellers;

-- Create unified function to find similar customers (buyers and sellers)
CREATE OR REPLACE FUNCTION find_similar_customers(
  query_embedding vector(1536),
  p_client_id integer,
  p_similarity_threshold float DEFAULT 0.6,
  p_max_results integer DEFAULT 50,
  p_include_buyers boolean DEFAULT true,
  p_include_sellers boolean DEFAULT false
) RETURNS TABLE (
  customer_id bigint,
  brand text,
  model text,
  year integer,
  price numeric,
  category text,
  similarity double precision,
  transaction_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    -- Buyers
    SELECT
      ct.buyer_id as customer_id,
      ct.brand,
      ct.model,
      ct.year,
      ct.price,
      ct.category,
      1 - (ct.vehicle_embedding <=> query_embedding) as similarity,
      'compra'::text as transaction_type
    FROM customers_transactions ct
    WHERE
      p_include_buyers = true
      AND ct.client_id = p_client_id
      AND ct.buyer_id IS NOT NULL
      AND ct.vehicle_embedding IS NOT NULL
      AND (1 - (ct.vehicle_embedding <=> query_embedding)) >= p_similarity_threshold
    
    UNION ALL
    
    -- Sellers
    SELECT
      ct.seller_id as customer_id,
      ct.brand,
      ct.model,
      ct.year,
      ct.price,
      ct.category,
      1 - (ct.vehicle_embedding <=> query_embedding) as similarity,
      'venta'::text as transaction_type
    FROM customers_transactions ct
    WHERE
      p_include_sellers = true
      AND ct.client_id = p_client_id
      AND ct.seller_id IS NOT NULL
      AND ct.vehicle_embedding IS NOT NULL
      AND (1 - (ct.vehicle_embedding <=> query_embedding)) >= p_similarity_threshold
  ) combined
  ORDER BY similarity DESC
  LIMIT p_max_results;
END;
$$ LANGUAGE plpgsql; 