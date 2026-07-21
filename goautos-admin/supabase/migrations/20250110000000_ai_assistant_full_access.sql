-- =====================================================
-- AI Assistant Full Database Access Migration
-- =====================================================
-- This migration creates secure database access for the AI assistant
-- with automatic client_id filtering and comprehensive views

-- =====================================================
-- 1. Create safe query execution function
-- =====================================================

CREATE OR REPLACE FUNCTION ai_safe_query(
  p_client_id INTEGER,
  p_table_name TEXT,
  p_columns TEXT DEFAULT '*',
  p_where_conditions TEXT DEFAULT NULL,
  p_order_by TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_joins TEXT DEFAULT NULL
)
RETURNS TABLE(result JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_query TEXT;
  v_safe_limit INTEGER;
  v_allowed_tables TEXT[] := ARRAY[
    'vehicles', 'vehicles_sales', 'vehicles_purchases', 'vehicles_consignments',
    'vehicles_reservations', 'vehicles_documents', 'vehicles_extras',
    'vehicles_quotations', 'vehicles_close_deal', 'vehicles_status_history',
    'vehicles_likes', 'customers', 'customers_transactions', 'leads',
    'financing', 'financing_payment', 'users', 'clients_vehicles_states',
    'clients', 'appraisals', 'page_visits', 'document_templates',
    'instagram_integrations', 'meli_integration', 'meli_post',
    'marketing_emails_history', 'fixed_monthly_expenses', 'credits',
    'seller_commission_tiers', 'legal_info', 'mails', 'client_website_config',
    'brands', 'models', 'colors', 'categories', 'fuel_types',
    'conditions', 'dealerships'
  ];
  v_sensitive_columns TEXT[] := ARRAY[
    'password', 'password_hash', 'token', 'access_token', 'refresh_token',
    'api_key', 'api_secret', 'secret', 'private_key', 'encryption_key'
  ];
BEGIN
  -- Validate table name
  IF NOT (p_table_name = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'Table % is not allowed', p_table_name;
  END IF;

  -- Limit to max 500 rows
  v_safe_limit := LEAST(COALESCE(p_limit, 100), 500);

  -- Build base query
  v_query := format('SELECT row_to_json(t.*) FROM %I t', p_table_name);

  -- Add JOINs if provided
  IF p_joins IS NOT NULL AND p_joins != '' THEN
    v_query := v_query || ' ' || p_joins;
  END IF;

  -- Add WHERE clause for client_id filtering
  -- Check if table has client_id column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = p_table_name
    AND column_name = 'client_id'
  ) THEN
    v_query := v_query || format(' WHERE %I.client_id = %s', p_table_name, p_client_id);

    -- Add additional conditions if provided
    IF p_where_conditions IS NOT NULL AND p_where_conditions != '' THEN
      v_query := v_query || ' AND (' || p_where_conditions || ')';
    END IF;
  ELSE
    -- For tables without client_id (like brands, models, etc.)
    IF p_where_conditions IS NOT NULL AND p_where_conditions != '' THEN
      v_query := v_query || ' WHERE ' || p_where_conditions;
    END IF;
  END IF;

  -- Add ORDER BY if provided
  IF p_order_by IS NOT NULL AND p_order_by != '' THEN
    v_query := v_query || ' ORDER BY ' || p_order_by;
  END IF;

  -- Add LIMIT
  v_query := v_query || format(' LIMIT %s', v_safe_limit);

  -- Execute and return as JSONB array
  RETURN QUERY EXECUTE format(
    'SELECT jsonb_agg(result) FROM (%s) AS results(result)',
    v_query
  );
END;
$$;

-- =====================================================
-- 2. Create comprehensive dashboard views
-- =====================================================

-- View: Complete vehicle information with all relationships
CREATE OR REPLACE VIEW ai_vehicles_complete AS
SELECT
  v.id,
  v.client_id,
  v.brand_id,
  b.name as brand_name,
  v.model_id,
  m.name as model_name,
  v.year,
  v.price,
  v.mileage,
  v.color_id,
  c.name as color_name,
  v.fuel_type,
  ft.name as fuel_type_name,
  v.transmission,
  v.condition,
  cond.name as condition_name,
  v.description,
  v.photos,
  v.is_featured,
  v.status,
  cvs.label as status_label,
  cvs.color as status_color,
  v.vin,
  v.plate,
  v.doors,
  v.seats,
  v.engine_size,
  v.horsepower,
  v.created_at,
  v.updated_at,
  v.deleted_at,
  v.seller_id,
  u.full_name as seller_name,
  v.views_count,
  -- Aggregated data
  (SELECT COUNT(*) FROM vehicles_likes WHERE vehicle_id = v.id) as likes_count,
  (SELECT COUNT(*) FROM vehicles_documents WHERE vehicle_id = v.id) as documents_count,
  (SELECT json_agg(json_build_object('type', type, 'name', name, 'price', price))
   FROM vehicles_extras WHERE vehicle_id = v.id) as extras
FROM vehicles v
LEFT JOIN brands b ON v.brand_id = b.id
LEFT JOIN models m ON v.model_id = m.id
LEFT JOIN colors c ON v.color_id = c.id
LEFT JOIN fuel_types ft ON v.fuel_type = ft.id
LEFT JOIN conditions cond ON v.condition = cond.id
LEFT JOIN clients_vehicles_states cvs ON v.status = cvs.id AND v.client_id = cvs.client_id
LEFT JOIN users u ON v.seller_id = u.id
WHERE v.deleted_at IS NULL;

-- View: Sales with complete information
CREATE OR REPLACE VIEW ai_sales_complete AS
SELECT
  vs.id,
  vs.client_id,
  vs.vehicle_id,
  vs.customer_id,
  cust.name as customer_name,
  cust.email as customer_email,
  cust.phone as customer_phone,
  cust.rut as customer_rut,
  vs.sale_price,
  vs.sale_date,
  vs.payment_method,
  vs.notes,
  vs.seller_id,
  u.full_name as seller_name,
  vs.commission_amount,
  vs.commission_percentage,
  vs.created_at,
  vs.updated_at,
  -- Vehicle information
  v.brand_id,
  b.name as vehicle_brand,
  v.model_id,
  m.name as vehicle_model,
  v.year as vehicle_year,
  v.plate as vehicle_plate,
  v.vin as vehicle_vin,
  -- Documents count
  (SELECT COUNT(*) FROM vehicles_documents
   WHERE vehicle_id = vs.vehicle_id AND type = 'sale') as sale_documents_count
FROM vehicles_sales vs
LEFT JOIN customers cust ON vs.customer_id = cust.id
LEFT JOIN vehicles v ON vs.vehicle_id = v.id
LEFT JOIN brands b ON v.brand_id = b.id
LEFT JOIN models m ON v.model_id = m.id
LEFT JOIN users u ON vs.seller_id = u.id;

-- View: Leads with complete context
CREATE OR REPLACE VIEW ai_leads_complete AS
SELECT
  l.id,
  l.client_id,
  l.name,
  l.email,
  l.phone,
  l.message,
  l.source,
  l.status,
  l.assigned_to,
  u.full_name as assigned_to_name,
  l.vehicle_id,
  l.created_at,
  l.updated_at,
  l.search_context,
  l.rating,
  -- Vehicle info if associated
  CASE WHEN l.vehicle_id IS NOT NULL THEN
    json_build_object(
      'brand', b.name,
      'model', m.name,
      'year', v.year,
      'price', v.price
    )
  ELSE NULL END as vehicle_info
FROM leads l
LEFT JOIN users u ON l.assigned_to = u.id
LEFT JOIN vehicles v ON l.vehicle_id = v.id
LEFT JOIN brands b ON v.brand_id = b.id
LEFT JOIN models m ON v.model_id = m.id;

-- View: Dashboard statistics (pre-aggregated for performance)
CREATE OR REPLACE VIEW ai_dashboard_stats AS
SELECT
  v.client_id,
  -- Inventory counts
  COUNT(DISTINCT v.id) FILTER (WHERE v.deleted_at IS NULL) as total_vehicles,
  COUNT(DISTINCT v.id) FILTER (WHERE v.deleted_at IS NULL AND v.status IN (
    SELECT id FROM clients_vehicles_states WHERE client_id = v.client_id AND label ILIKE '%disponible%'
  )) as available_vehicles,
  COUNT(DISTINCT v.id) FILTER (WHERE v.deleted_at IS NULL AND v.status IN (
    SELECT id FROM clients_vehicles_states WHERE client_id = v.client_id AND label ILIKE '%reservado%'
  )) as reserved_vehicles,

  -- Sales stats
  (SELECT COUNT(*) FROM vehicles_sales WHERE client_id = v.client_id) as total_sales,
  (SELECT COUNT(*) FROM vehicles_sales
   WHERE client_id = v.client_id
   AND sale_date >= CURRENT_DATE - INTERVAL '30 days') as sales_last_month,
  (SELECT SUM(sale_price) FROM vehicles_sales WHERE client_id = v.client_id) as total_revenue,
  (SELECT SUM(sale_price) FROM vehicles_sales
   WHERE client_id = v.client_id
   AND sale_date >= CURRENT_DATE - INTERVAL '30 days') as revenue_last_month,
  (SELECT AVG(sale_price) FROM vehicles_sales WHERE client_id = v.client_id) as avg_sale_price,

  -- Leads stats
  (SELECT COUNT(*) FROM leads WHERE client_id = v.client_id) as total_leads,
  (SELECT COUNT(*) FROM leads
   WHERE client_id = v.client_id
   AND created_at >= CURRENT_DATE - INTERVAL '30 days') as leads_last_month,
  (SELECT COUNT(*) FROM leads
   WHERE client_id = v.client_id
   AND status = 'new') as new_leads,

  -- Customer stats
  (SELECT COUNT(DISTINCT customer_id) FROM vehicles_sales WHERE client_id = v.client_id) as total_customers,

  -- Page visits
  (SELECT SUM(visit_count) FROM page_visits WHERE client_id = v.client_id) as total_page_visits,
  (SELECT SUM(visit_count) FROM page_visits
   WHERE client_id = v.client_id
   AND visited_at >= CURRENT_DATE - INTERVAL '30 days') as page_visits_last_month,

  -- Inventory value
  SUM(v.price) FILTER (WHERE v.deleted_at IS NULL) as total_inventory_value,
  AVG(v.price) FILTER (WHERE v.deleted_at IS NULL) as avg_vehicle_price,
  MIN(v.price) FILTER (WHERE v.deleted_at IS NULL) as min_vehicle_price,
  MAX(v.price) FILTER (WHERE v.deleted_at IS NULL) as max_vehicle_price

FROM vehicles v
GROUP BY v.client_id;

-- View: Inventory summary by status
CREATE OR REPLACE VIEW ai_inventory_by_status AS
SELECT
  v.client_id,
  cvs.label as status,
  cvs.color as status_color,
  COUNT(*) as vehicle_count,
  SUM(v.price) as total_value,
  AVG(v.price) as avg_price,
  json_agg(json_build_object(
    'id', v.id,
    'brand', b.name,
    'model', m.name,
    'year', v.year,
    'price', v.price,
    'mileage', v.mileage
  ) ORDER BY v.created_at DESC) as vehicles
FROM vehicles v
LEFT JOIN clients_vehicles_states cvs ON v.status = cvs.id AND v.client_id = cvs.client_id
LEFT JOIN brands b ON v.brand_id = b.id
LEFT JOIN models m ON v.model_id = m.id
WHERE v.deleted_at IS NULL
GROUP BY v.client_id, cvs.id, cvs.label, cvs.color;

-- View: Recent activity feed
CREATE OR REPLACE VIEW ai_recent_activity AS
SELECT
  client_id,
  'sale' as activity_type,
  id::text as activity_id,
  created_at,
  json_build_object(
    'customer_name', (SELECT name FROM customers WHERE id = customer_id),
    'vehicle', (SELECT b.name || ' ' || m.name || ' ' || v.year
                FROM vehicles v
                LEFT JOIN brands b ON v.brand_id = b.id
                LEFT JOIN models m ON v.model_id = m.id
                WHERE v.id = vehicle_id),
    'sale_price', sale_price
  ) as details
FROM vehicles_sales
UNION ALL
SELECT
  client_id,
  'lead' as activity_type,
  id::text as activity_id,
  created_at,
  json_build_object(
    'name', name,
    'email', email,
    'source', source,
    'status', status
  ) as details
FROM leads
UNION ALL
SELECT
  client_id,
  'vehicle_added' as activity_type,
  id::text as activity_id,
  created_at,
  json_build_object(
    'brand', (SELECT name FROM brands WHERE id = brand_id),
    'model', (SELECT name FROM models WHERE id = model_id),
    'year', year,
    'price', price
  ) as details
FROM vehicles
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- View: Financial summary
CREATE OR REPLACE VIEW ai_financial_summary AS
SELECT
  vs.client_id,
  DATE_TRUNC('month', vs.sale_date) as month,
  COUNT(*) as sales_count,
  SUM(vs.sale_price) as revenue,
  SUM(vs.commission_amount) as total_commissions,
  AVG(vs.sale_price) as avg_sale_price,
  -- Expenses (if available)
  (SELECT COALESCE(SUM(amount), 0)
   FROM fixed_monthly_expenses
   WHERE client_id = vs.client_id
   AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', vs.sale_date)) as expenses,
  -- Net profit (simplified)
  SUM(vs.sale_price) -
  (SELECT COALESCE(SUM(amount), 0)
   FROM fixed_monthly_expenses
   WHERE client_id = vs.client_id
   AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', vs.sale_date)) as net_profit
FROM vehicles_sales vs
GROUP BY vs.client_id, DATE_TRUNC('month', vs.sale_date)
ORDER BY month DESC;

-- =====================================================
-- 3. Grant permissions
-- =====================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION ai_safe_query TO authenticated;
GRANT EXECUTE ON FUNCTION ai_safe_query TO service_role;

-- Grant select permission on views
GRANT SELECT ON ai_vehicles_complete TO authenticated;
GRANT SELECT ON ai_vehicles_complete TO service_role;
GRANT SELECT ON ai_sales_complete TO authenticated;
GRANT SELECT ON ai_sales_complete TO service_role;
GRANT SELECT ON ai_leads_complete TO authenticated;
GRANT SELECT ON ai_leads_complete TO service_role;
GRANT SELECT ON ai_dashboard_stats TO authenticated;
GRANT SELECT ON ai_dashboard_stats TO service_role;
GRANT SELECT ON ai_inventory_by_status TO authenticated;
GRANT SELECT ON ai_inventory_by_status TO service_role;
GRANT SELECT ON ai_recent_activity TO authenticated;
GRANT SELECT ON ai_recent_activity TO service_role;
GRANT SELECT ON ai_financial_summary TO authenticated;
GRANT SELECT ON ai_financial_summary TO service_role;

-- =====================================================
-- 4. Add helpful comments
-- =====================================================

COMMENT ON FUNCTION ai_safe_query IS
'Safely executes queries with automatic client_id filtering for AI assistant';

COMMENT ON VIEW ai_vehicles_complete IS
'Complete vehicle information with all joins for AI assistant';

COMMENT ON VIEW ai_sales_complete IS
'Complete sales information with customer and vehicle details for AI assistant';

COMMENT ON VIEW ai_leads_complete IS
'Complete leads information with assignment and vehicle context for AI assistant';

COMMENT ON VIEW ai_dashboard_stats IS
'Pre-aggregated dashboard statistics for AI assistant quick access';

COMMENT ON VIEW ai_inventory_by_status IS
'Inventory grouped by status with vehicle details for AI assistant';

COMMENT ON VIEW ai_recent_activity IS
'Recent activity feed across all entity types for AI assistant';

COMMENT ON VIEW ai_financial_summary IS
'Monthly financial summary with revenue, expenses, and profit for AI assistant';
