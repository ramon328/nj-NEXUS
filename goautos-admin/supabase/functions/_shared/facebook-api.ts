/**
 * Facebook Graph API helper functions for Marketplace integration
 */

const FB_GRAPH_API_VERSION = 'v18.0';
const FB_GRAPH_API_BASE = `https://graph.facebook.com/${FB_GRAPH_API_VERSION}`;

export interface FbTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  error?: FbErrorResponse;
}

export interface FbUserResponse {
  id: string;
  name: string;
  email?: string;
  error?: FbErrorResponse;
}

export interface FbBusinessResponse {
  data: Array<{
    id: string;
    name: string;
    created_time?: string;
  }>;
  error?: FbErrorResponse;
}

export interface FbPageResponse {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    category?: string;
    category_list?: Array<{ id: string; name: string }>;
  }>;
  paging?: any;
  error?: FbErrorResponse;
}

export interface FbMarketplaceListingResponse {
  id?: string;
  success?: boolean;
  error?: FbErrorResponse;
}

export interface FbCatalogResponse {
  data: Array<{
    id: string;
    name: string;
    vertical: string;
  }>;
  error?: FbErrorResponse;
}

export interface FbProductResponse {
  id?: string;
  success?: boolean;
  error?: FbErrorResponse;
}

export interface FbBatchResponse {
  handles?: Array<{
    retailer_id?: string;
    vehicle_id?: string;
    id: string;
    status: 'success' | 'error';
    errors?: string[];
  }>;
  validation_status?: Array<{
    retailer_id?: string;
    vehicle_id?: string;
    errors?: Array<{ message: string }>;
  }>;
  num_received?: number;
  num_invalid?: number;
  error?: FbErrorResponse;
}

export interface FbErrorResponse {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri: string
): Promise<FbTokenResponse> {
  console.log('Exchanging code for access token');

  const url = `${FB_GRAPH_API_BASE}/oauth/access_token?` +
    `client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code=${code}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error exchanging code:', data.error);
    throw new Error(data.error?.message || 'Failed to exchange code for token');
  }

  return data;
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string
): Promise<FbTokenResponse> {
  console.log('Exchanging for long-lived token');

  const url = `${FB_GRAPH_API_BASE}/oauth/access_token?` +
    `grant_type=fb_exchange_token` +
    `&client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&fb_exchange_token=${shortLivedToken}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error exchanging for long-lived token:', data.error);
    throw new Error(data.error?.message || 'Failed to exchange for long-lived token');
  }

  return data;
}

/**
 * Get user info from access token
 */
export async function getUserInfo(accessToken: string): Promise<FbUserResponse> {
  console.log('Getting user info');

  const url = `${FB_GRAPH_API_BASE}/me?fields=id,name,email&access_token=${accessToken}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error getting user info:', data.error);
    throw new Error(data.error?.message || 'Failed to get user info');
  }

  return data;
}

/**
 * Get business accounts associated with user
 */
export async function getBusinessAccounts(accessToken: string): Promise<FbBusinessResponse> {
  console.log('Getting business accounts');

  const url = `${FB_GRAPH_API_BASE}/me/businesses?fields=id,name,created_time&access_token=${accessToken}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error getting business accounts:', data.error);
    throw new Error(data.error?.message || 'Failed to get business accounts');
  }

  return data;
}

/**
 * Get Facebook Pages associated with user
 * Returns pages with their access tokens for managing posts
 */
export async function getUserPages(accessToken: string): Promise<FbPageResponse> {
  console.log('Getting user pages');

  const url = `${FB_GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,category,category_list&access_token=${accessToken}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error getting user pages:', data.error);
    throw new Error(data.error?.message || 'Failed to get user pages');
  }

  return data;
}

/**
 * Create a Marketplace listing on a Facebook Page
 * This posts directly to Facebook Marketplace as a visible listing
 */
export async function createMarketplaceListing(
  pageId: string,
  listingData: {
    listing_type: 'VEHICLES';
    description: string;
    price: number;
    currency: string;
    photos: string[];
    availability: 'IN_STOCK' | 'OUT_OF_STOCK';
    condition: 'NEW' | 'USED_LIKE_NEW' | 'USED_GOOD' | 'USED_FAIR';
    // Vehicle specific fields
    make?: string;
    model?: string;
    year?: number;
    mileage?: { value: number; unit: 'KM' | 'MI' };
    body_style?: string;
    drivetrain?: string;
    fuel_type?: string;
    transmission?: string;
    exterior_color?: string;
    interior_color?: string;
    vin?: string;
  },
  pageAccessToken: string
): Promise<FbMarketplaceListingResponse> {
  console.log('Creating Marketplace listing on page:', pageId);

  const url = `${FB_GRAPH_API_BASE}/${pageId}/commerce_listings`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...listingData,
      access_token: pageAccessToken,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error creating Marketplace listing:', data.error);
    throw new Error(data.error?.message || 'Failed to create Marketplace listing');
  }

  return data;
}

/**
 * Update a Marketplace listing
 */
export async function updateMarketplaceListing(
  listingId: string,
  updateData: Record<string, any>,
  pageAccessToken: string
): Promise<FbMarketplaceListingResponse> {
  console.log('Updating Marketplace listing:', listingId);

  const url = `${FB_GRAPH_API_BASE}/${listingId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...updateData,
      access_token: pageAccessToken,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error updating Marketplace listing:', data.error);
    throw new Error(data.error?.message || 'Failed to update Marketplace listing');
  }

  return data;
}

/**
 * Delete a Marketplace listing
 */
export async function deleteMarketplaceListing(
  listingId: string,
  pageAccessToken: string
): Promise<{ success: boolean }> {
  console.log('Deleting Marketplace listing:', listingId);

  const url = `${FB_GRAPH_API_BASE}/${listingId}?access_token=${pageAccessToken}`;

  const response = await fetch(url, {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error deleting Marketplace listing:', data.error);
    throw new Error(data.error?.message || 'Failed to delete Marketplace listing');
  }

  return { success: data.success || true };
}

/**
 * Get Marketplace listings from a page
 */
export async function getPageMarketplaceListings(
  pageId: string,
  pageAccessToken: string,
  limit: number = 50
): Promise<{ data: Array<Record<string, any>>; paging?: any }> {
  console.log('Getting Marketplace listings for page:', pageId);

  const fields = 'id,description,price,currency,availability,condition,photos';
  const url = `${FB_GRAPH_API_BASE}/${pageId}/commerce_listings?fields=${fields}&limit=${limit}&access_token=${pageAccessToken}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error getting Marketplace listings:', data.error);
    throw new Error(data.error?.message || 'Failed to get Marketplace listings');
  }

  return data;
}

/**
 * Get catalogs for a business
 */
export async function getBusinessCatalogs(
  businessId: string,
  accessToken: string
): Promise<FbCatalogResponse> {
  console.log('Getting catalogs for business:', businessId);

  const url = `${FB_GRAPH_API_BASE}/${businessId}/owned_product_catalogs?` +
    `fields=id,name,vertical&access_token=${accessToken}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error getting catalogs:', data.error);
    throw new Error(data.error?.message || 'Failed to get catalogs');
  }

  return data;
}

/**
 * Create a new product catalog (commerce/ecommerce type)
 */
export async function createVehicleCatalog(
  businessId: string,
  catalogName: string,
  accessToken: string
): Promise<{ id: string; name: string }> {
  console.log('Creating commerce catalog:', catalogName);

  const url = `${FB_GRAPH_API_BASE}/${businessId}/owned_product_catalogs`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: catalogName,
      vertical: 'commerce', // Use commerce for generic products
      access_token: accessToken,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error creating catalog:', data.error);
    throw new Error(data.error?.message || 'Failed to create catalog');
  }

  return { id: data.id, name: catalogName };
}

/**
 * Add a product (vehicle) to catalog
 */
export async function addProductToCatalog(
  catalogId: string,
  productData: Record<string, any>,
  accessToken: string
): Promise<FbProductResponse> {
  console.log('Adding product to catalog:', catalogId);

  const url = `${FB_GRAPH_API_BASE}/${catalogId}/products`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...productData,
      access_token: accessToken,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error adding product:', data.error);
    throw new Error(data.error?.message || 'Failed to add product to catalog');
  }

  return data;
}

/**
 * Batch add products to catalog
 * Uses simple product format that works with batch API
 */
export async function batchAddProducts(
  catalogId: string,
  products: Array<Record<string, any>>,
  accessToken: string
): Promise<FbBatchResponse> {
  console.log('Batch adding products to catalog:', catalogId, 'count:', products.length);

  const url = `${FB_GRAPH_API_BASE}/${catalogId}/batch`;

  const requests = products.map(product => {
    const { retailer_id, ...productData } = product;
    return {
      method: 'CREATE',
      retailer_id: retailer_id,
      data: productData,
    };
  });

  console.log('Batch request payload (first item):', JSON.stringify(requests[0], null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: JSON.stringify(requests),
      access_token: accessToken,
    }),
  });

  const data = await response.json();

  console.log('Facebook batch response:', JSON.stringify(data, null, 2));

  if (!response.ok || data.error) {
    console.error('Error batch adding products:', data.error);
    throw new Error(data.error?.message || 'Failed to batch add products');
  }

  return data;
}

/**
 * Update a product in catalog
 */
export async function updateProduct(
  catalogId: string,
  retailerId: string,
  updateData: Record<string, any>,
  accessToken: string
): Promise<FbProductResponse> {
  console.log('Updating product:', retailerId);

  const url = `${FB_GRAPH_API_BASE}/${catalogId}/products`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      retailer_id: retailerId,
      ...updateData,
      access_token: accessToken,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error updating product:', data.error);
    throw new Error(data.error?.message || 'Failed to update product');
  }

  return data;
}

/**
 * Delete a product from catalog by product ID
 */
export async function deleteProduct(
  productId: string,
  accessToken: string
): Promise<{ success: boolean }> {
  console.log('Deleting product by ID:', productId);

  const url = `${FB_GRAPH_API_BASE}/${productId}?access_token=${accessToken}`;

  const response = await fetch(url, {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error deleting product:', data.error);
    throw new Error(data.error?.message || 'Failed to delete product');
  }

  return { success: data.success || true };
}

/**
 * Delete a product from catalog by retailer_id using batch API
 */
export async function deleteProductByRetailerId(
  catalogId: string,
  retailerId: string,
  accessToken: string
): Promise<{ success: boolean }> {
  console.log('Deleting product by retailer_id:', retailerId, 'from catalog:', catalogId);

  const url = `${FB_GRAPH_API_BASE}/${catalogId}/batch`;

  const requests = [{
    method: 'DELETE',
    retailer_id: retailerId,
  }];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: JSON.stringify(requests),
      access_token: accessToken,
    }),
  });

  const data = await response.json();

  console.log('Delete batch response:', data);

  if (!response.ok || data.error) {
    console.error('Error deleting product:', data.error);
    throw new Error(data.error?.message || 'Failed to delete product');
  }

  return { success: true };
}

/**
 * Get product details
 */
export async function getProduct(
  productId: string,
  accessToken: string
): Promise<Record<string, any>> {
  console.log('Getting product:', productId);

  const fields = 'id,retailer_id,name,price,availability,condition,image_url';
  const url = `${FB_GRAPH_API_BASE}/${productId}?fields=${fields}&access_token=${accessToken}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error getting product:', data.error);
    throw new Error(data.error?.message || 'Failed to get product');
  }

  return data;
}

/**
 * Get catalog info including vertical type
 */
export async function getCatalogInfo(
  catalogId: string,
  accessToken: string
): Promise<Record<string, any>> {
  console.log('Getting catalog info:', catalogId);

  const url = `${FB_GRAPH_API_BASE}/${catalogId}?fields=id,name,vertical,product_count&access_token=${accessToken}`;

  const response = await fetch(url);
  const data = await response.json();

  console.log('Catalog info:', JSON.stringify(data, null, 2));

  if (!response.ok || data.error) {
    console.error('Error getting catalog info:', data.error);
  }

  return data;
}

/**
 * Get all products in a catalog
 */
export async function getCatalogProducts(
  catalogId: string,
  accessToken: string,
  limit: number = 50
): Promise<{ data: Array<Record<string, any>>; paging?: any }> {
  console.log('Getting catalog products:', catalogId);

  const fields = 'id,retailer_id,name,price,availability,condition,image_url';
  const url = `${FB_GRAPH_API_BASE}/${catalogId}/products?fields=${fields}&limit=${limit}&access_token=${accessToken}`;

  const response = await fetch(url);
  const data = await response.json();

  console.log('Catalog products response:', JSON.stringify(data, null, 2));

  if (!response.ok || data.error) {
    console.error('Error getting catalog products:', data.error);
    throw new Error(data.error?.message || 'Failed to get catalog products');
  }

  return data;
}

/**
 * Refresh long-lived token (must be done before expiry)
 */
export async function refreshLongLivedToken(
  currentToken: string,
  appId: string,
  appSecret: string
): Promise<FbTokenResponse> {
  console.log('Refreshing long-lived token');

  // For long-lived tokens, we use the same exchange endpoint
  return exchangeForLongLivedToken(currentToken, appId, appSecret);
}

/**
 * Validate token and get debug info
 */
export async function debugToken(
  token: string,
  appId: string,
  appSecret: string
): Promise<{
  data: {
    app_id: string;
    type: string;
    application: string;
    expires_at: number;
    is_valid: boolean;
    user_id: string;
    scopes: string[];
  };
}> {
  const url = `${FB_GRAPH_API_BASE}/debug_token?` +
    `input_token=${token}` +
    `&access_token=${appId}|${appSecret}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    console.error('Error debugging token:', data.error);
    throw new Error(data.error?.message || 'Failed to debug token');
  }

  return data;
}

/**
 * Handle Facebook API errors
 */
export function handleFbError(error: FbErrorResponse): {
  message: string;
  isTokenExpired: boolean;
  isRateLimit: boolean;
  isPermissionDenied: boolean;
} {
  const code = error.code;

  return {
    message: error.message,
    isTokenExpired: code === 190,
    isRateLimit: code === 4,
    isPermissionDenied: code === 200,
  };
}
