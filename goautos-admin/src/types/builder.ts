export type InitialFoldVariant =
  | 'centered-hero'
  | 'split-image'
  | 'background-image'
  | 'gradient-background'
  | 'video-background'
  | 'minimal';

export type NavbarVariant =
  | 'simple'
  | 'centered'
  | 'logo-center'
  | 'transparent'
  | 'with-search'
  | 'dropdown-menu';

export type MailingListVariant =
  | 'simple'
  | 'with-image'
  | 'card'
  | 'full-width'
  | 'floating';

export type FooterVariant =
  | 'simple'
  | 'multi-column'
  | 'centered'
  | 'with-newsletter'
  | 'minimal';

export type ContentVariant =
  | 'grid'
  | 'cards'
  | 'timeline'
  | 'feature-list'
  | 'tabs';

export type BenefitsVariant =
  | 'icons'
  | 'numbers'
  | 'cards'
  | 'alternating'
  | 'image-text';

export type AboutUsVariant =
  | 'simple'
  | 'with-team'
  | 'timeline'
  | 'values'
  | 'image-text';

// Responsive device types
export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export const DEVICE_CONFIG = {
  desktop: { width: '100%', height: '100%', label: 'PC' },
  tablet: { width: '768px', height: '1024px', label: 'iPad' },
  mobile: { width: '375px', height: '812px', label: 'iPhone' },
};
