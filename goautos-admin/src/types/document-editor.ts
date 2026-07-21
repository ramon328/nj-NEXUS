import { PDFLayoutConfig } from './document-template';

export type DocumentType = 'sale' | 'purchase' | 'consignment' | 'reservation' | 'quotation' | 'close_deal';

export type SectionType = 'header' | 'grid' | 'financial' | 'text' | 'signatures';

export interface GridField {
  key: string;
  label: string;
  value: string | number;
  type?: 'text' | 'currency' | 'percentage';
  fullWidth?: boolean;
}

export interface FinancialRow {
  key: string;
  label: string;
  value: number;
  style?: 'normal' | 'highlight' | 'subtotal' | 'total' | 'deduction';
}

export interface SignatureSlot {
  name: string;
  nameKey?: string;
  role: string;
  id?: string;
  idKey?: string;
}

export interface CustomRow {
  id: string;
  sectionId: string;
  label: string;
  value: string;
  type?: 'text' | 'currency';
}

export interface CustomSection {
  id: string;
  title: string;
  afterSectionId: string;
  fields: Array<{ id: string; label: string; value: string; type?: 'text' | 'currency' }>;
}

export interface DocumentSection {
  id: string;
  title: string;
  type: SectionType;
  visible: boolean;
  visibilityKey?: keyof PDFLayoutConfig;
  allowCustomRows?: boolean;

  // Header section
  companyName?: string;
  companyRut?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
  documentTitle?: string;
  documentNumber?: string;
  documentDate?: string;
  headerExtra?: GridField[];

  // Grid section
  fields?: GridField[];

  // Financial section
  rows?: FinancialRow[];
  paymentInfo?: string;

  // Text section
  textValue?: string;
  textKey?: string;
  textFontSize?: number;

  // Signatures section
  signatures?: SignatureSlot[];
}

export interface DocumentEditorSchema {
  documentType: DocumentType;
  sections: DocumentSection[];
}

// Helpers for reading/writing custom content from contentOverrides
export function getCustomRows(overrides: Record<string, string | number>, sectionId: string): CustomRow[] {
  const raw = overrides[`_customRows_${sectionId}`];
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// Montos escritos a mano pueden traer separadores de miles o "$" ("1.500.000");
// Number() los convierte en NaN y el || 0 los imprimiría como $0 en el documento.
export function parseAmount(value: string | number | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const digits = String(value ?? '').replace(/[^0-9-]/g, '');
  return Number(digits) || 0;
}

export function setCustomRows(overrides: Record<string, string | number>, sectionId: string, rows: CustomRow[]): Record<string, string | number> {
  return { ...overrides, [`_customRows_${sectionId}`]: JSON.stringify(rows) };
}

export function getCustomSections(overrides: Record<string, string | number>): CustomSection[] {
  const raw = overrides['_customSections'];
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function setCustomSections(overrides: Record<string, string | number>, sections: CustomSection[]): Record<string, string | number> {
  return { ...overrides, '_customSections': JSON.stringify(sections) };
}
