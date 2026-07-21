export type TemplateType =
  | 'sale'
  | 'purchase'
  | 'consignment'
  | 'reservation'
  | 'quotation'
  | 'close_deal'
  | 'spec_sheet';

export interface ExtraPageFile {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'word';
  uploadedAt: string;
}

export interface ExtraPageConfig {
  enabled: boolean;
  files?: ExtraPageFile[];
}

export type PDFPageSize = 'A4' | 'LETTER' | 'A5';

export interface PDFLayoutConfig {
  // Page setup
  pageSize: PDFPageSize;
  pageMarginH: number;          // left & right margin (default: 30)
  pageMarginV: number;          // top & bottom margin (default: 20)

  // Spacing
  sectionSpacing: number;       // marginBottom between sections (default: 10)
  signaturesMarginTop: number;  // marginTop of signatures block (default: 18)

  // Typography
  termsFontSize: number;        // font size for terms text (default: 7.5)
  notesFontSize: number;        // font size for notes text (default: 8)

  // Section visibility (common)
  showNotes: boolean;           // default: true
  showTerms: boolean;           // default: true
  showClientData?: boolean;     // Datos del cliente/comprador/propietario (default: true)
  showVehicleDetails?: boolean; // Datos del vehículo (default: true)
  showFinancialDetails?: boolean; // Tabla financiera principal (default: true)
  showSignatures?: boolean;     // Bloque de firmas (default: true)

  // Section visibility (specific per document type)
  showCommission?: boolean;     // Comisión automotora — close_deal (default: true)
  showPayments?: boolean;       // Desglose de pagos — sale (default: true)
  showTransferValue?: boolean;  // Valor de transferencia — sale, quotation (default: true)
  showFinancing?: boolean;      // Opciones de financiamiento — quotation (default: true)

  // Content overrides (null = use original document data)
  notesOverride: string | null;
  termsOverride: string | null;

  // Inline content overrides for any document field (key = field name, value = override)
  contentOverrides?: Record<string, string | number>;
}

export const DEFAULT_PDF_LAYOUT: PDFLayoutConfig = {
  pageSize: 'A4',
  pageMarginH: 30,
  pageMarginV: 20,
  sectionSpacing: 10,
  signaturesMarginTop: 18,
  termsFontSize: 7.5,
  notesFontSize: 8,
  showNotes: true,
  showTerms: true,
  notesOverride: null,
  termsOverride: null,
};

export interface DocumentTemplate {
  id?: number;
  client_id: number;
  template_type: TemplateType;
  terms_and_conditions: string;
  extra_page_config?: ExtraPageConfig; // NEW: separate column for extra page config
  extra_page_enabled?: boolean; // DEPRECATED: old field
  extra_page_content?: string; // DEPRECATED: old field
  layout_config?: Partial<PDFLayoutConfig>;
  created_at?: string;
  updated_at?: string;
}
