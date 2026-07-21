// Instagram app credentials
export const INSTAGRAM_APP_ID = Deno.env.get('INSTAGRAM_APP_ID') || '';
export const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET') || '';

// Mercadolibre app credentials
export const MERCADOLIBRE_CONFIG = {
  CLIENT_ID: Deno.env.get('MERCADOLIBRE_CLIENT_ID') || '',
  CLIENT_SECRET: Deno.env.get('MERCADOLIBRE_CLIENT_SECRET') || '',
  SITE_ID: Deno.env.get('MERCADOLIBRE_SITE_ID') || 'MLC', // MLC para Chile
};
