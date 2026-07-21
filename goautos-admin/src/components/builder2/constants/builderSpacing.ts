/**
 * Consistent spacing scale for builder sections.
 * Used for padding, margins, and gaps across all builder components.
 */
export const SECTION_PADDING = {
  none: '0px',
  xs: '20px',
  sm: '40px',
  md: '60px',
  lg: '80px',
  xl: '100px',
  '2xl': '120px',
} as const;

export const SECTION_PADDING_OPTIONS = [
  { value: '0', label: 'Ninguno' },
  { value: '20', label: 'Extra pequeño (20px)' },
  { value: '40', label: 'Pequeño (40px)' },
  { value: '60', label: 'Mediano (60px)' },
  { value: '80', label: 'Grande (80px)' },
  { value: '100', label: 'Extra grande (100px)' },
  { value: '120', label: '2X grande (120px)' },
];

export const MAX_WIDTH = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  full: '100%',
} as const;

export const MAX_WIDTH_OPTIONS = [
  { value: '640px', label: 'Pequeño (640px)' },
  { value: '768px', label: 'Mediano (768px)' },
  { value: '1024px', label: 'Grande (1024px)' },
  { value: '1280px', label: 'Extra grande (1280px)' },
  { value: '1536px', label: '2X grande (1536px)' },
  { value: '100%', label: 'Completo' },
];
