// ============================================================
// Tasador — Shared Types
// ============================================================

/** A single vehicle listing from a search source */
export interface TasadorSource {
  source: string;
  vehicle: string;
  year: number | null;
  version: string | null;
  mileage: number | null;
  price: number;
  url: string;
}

/** Search execution stats returned by the backend */
export interface SearchStats {
  totalGroups: number;
  successful: number;
  failed: number;
  sourcesBeforeDedup: number;
  sourcesAfterDedup: number;
  distinctSites: number;
  /** Per-scraper result counts (new in scraping rewrite) */
  scrapers?: {
    mercadolibre: number;
    chileautos: number;
    yapo: number;
  };
  /** Error messages from failed scrapers */
  errors?: string[];
  /** True when backend rejected the query before searching (e.g. plate or unidentified vehicle) */
  rejected?: boolean;
  /** Reason for rejection: 'license_plate' | 'license_plate_unknown' | 'unidentified_vehicle' */
  reason?: string;
}

/** Info de la patente resuelta vía GetAPI antes de la tasación */
export interface ResolvedFromPlate {
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
}

/** Vehicle details extracted by the backend */
export interface VehicleDetails {
  brand: string;
  model: string;
  year: number | null;
  yearRange: { min: number; max: number } | null;
  version: string | null;
  transmission: 'automatic' | 'manual' | null;
  fuel: string | null;
  mileage: number | null;
  condition: string | null;
  isComparison: boolean;
  comparisonVehicles: {
    brand: string;
    model: string;
    year: number | null;
  }[] | null;
  additionalContext: string | null;
}

/** Price analysis computed by the backend */
export interface PriceAnalysis {
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
  sampleSize: number;
}

/** Full API response from car_appraiser edge function */
export interface AppraisalResponse {
  appraisal: string;
  vehicle_details: VehicleDetails;
  original_query: string;
  contains_links: boolean;
  sources: TasadorSource[];
  price_analysis: PriceAnalysis | null;
  estimated_range: { low: number; high: number } | null;
  confidence: 'high' | 'medium' | 'low';
  search_stats: SearchStats;
  saved: boolean;
  /** Si la query era patente y GetAPI la resolvió, datos del vehículo identificado */
  resolved_from_plate?: ResolvedFromPlate | null;
}

// ============================================================
// UI-derived types
// ============================================================

/** Color scheme for a source */
export interface SourceColor {
  bg: string;
  text: string;
  border: string;
  icon: string;
  badge: string;
}

/** Grouped listings by source for UI rendering */
export interface SourceGroup {
  name: string;
  listings: TasadorSource[];
  color: SourceColor;
}
