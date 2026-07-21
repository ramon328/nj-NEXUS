// System pages — always available, cannot be deleted
export const SYSTEM_PAGES = [
  { slug: 'home', label: 'Inicio', route: '/', icon: 'Home' },
  { slug: 'financing', label: 'Financiamiento', route: '/financing', icon: 'CreditCard' },
  { slug: 'consignments', label: 'Consignaciones', route: '/consignments', icon: 'Car' },
  { slug: 'buy-direct', label: 'Compra Directa', route: '/buy-direct', icon: 'ShoppingCart' },
  { slug: 'we-search-for-you', label: 'Buscamos por Ti', route: '/we-search-for-you', icon: 'Search' },
  { slug: 'contact', label: 'Contacto', route: '/contact', icon: 'Mail' },
  { slug: 'about', label: 'Nosotros', route: '/about', icon: 'Building2' },
] as const;

// Keep BUILDER_PAGES as alias for backward compatibility
export const BUILDER_PAGES = SYSTEM_PAGES;

export type SystemPageSlug = typeof SYSTEM_PAGES[number]['slug'];
export type PageSlug = string; // System pages + custom pages

// Reserved slugs that cannot be used for custom pages
export const RESERVED_SLUGS = new Set([
  ...SYSTEM_PAGES.map(p => p.slug),
  'vehicles', 'api', 'embed', 'builder', '_next',
]);

export interface CustomPage {
  id: string;
  client_id: string;
  slug: string;
  title: string;
  icon: string;
  is_published: boolean;
  seo_title?: string;
  seo_description?: string;
  sort_order: number;
}
