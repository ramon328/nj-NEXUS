export const META_CONFIG = {
  APP_ID: '1614651055953967',
  APP_SECRET: 'b1d5eec9048de66c59d76e2dd93e5393',
} as const;

// Explicitly export Instagram app credentials for edge function
export const INSTAGRAM_APP_ID = '1353273672429524';
export const INSTAGRAM_APP_SECRET = '058142ccf19458690aca0de9ab9a063d';

// Mercadolibre app credentials
export const MERCADOLIBRE_APP_ID = '8320956027534200';
export const MERCADOLIBRE_CLIENT_SECRET = 'EDL8Mcgvy5qyD8slMHmkqagGJPluH2vH';

// Facebook Marketplace app credentials (uses same Meta App)
export const FB_MARKETPLACE_APP_ID = META_CONFIG.APP_ID;
export const FB_MARKETPLACE_APP_SECRET = META_CONFIG.APP_SECRET;
