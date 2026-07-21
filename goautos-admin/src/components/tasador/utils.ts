import { Car, Globe, ShoppingCart, Store, Compass, LucideIcon } from 'lucide-react';
import type { TasadorSource, SourceColor, SourceGroup } from '@/types/tasador';

// ============================================================
// Price formatting
// ============================================================

export const formatPrice = (price: string | number): string => {
  if (!price || price === '0' || price === 0) return '-';
  const numericValue =
    typeof price === 'number'
      ? price
      : parseInt(String(price).replace(/\./g, '').replace(/,/g, ''), 10);
  if (isNaN(numericValue)) return '-';
  return '$' + numericValue.toLocaleString('es-CL');
};

// ============================================================
// Source colors
// ============================================================

const NEUTRAL: SourceColor = {
  bg: 'bg-slate-50',
  text: 'text-slate-700',
  border: 'border-slate-200',
  icon: 'text-slate-500',
  badge: 'bg-slate-100 text-slate-600',
};

export const SOURCE_COLORS: Record<string, SourceColor> = {
  chileautos: NEUTRAL,
  yapo: NEUTRAL,
  mercadolibre: NEUTRAL,
  kavak: NEUTRAL,
  autocosmos: NEUTRAL,
};

const DEFAULT_COLOR: SourceColor = {
  bg: 'bg-gray-50',
  text: 'text-gray-700',
  border: 'border-gray-200',
  icon: 'text-gray-600',
  badge: 'bg-gray-100 text-gray-700',
};

export const getSourceColor = (name: string): SourceColor => {
  const key = name.toLowerCase().replace(/\s+/g, '');
  // Try exact match first, then partial
  if (SOURCE_COLORS[key]) return SOURCE_COLORS[key];
  for (const [k, v] of Object.entries(SOURCE_COLORS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return DEFAULT_COLOR;
};

// ============================================================
// Source icons
// ============================================================

export const getSourceIcon = (name: string): LucideIcon => {
  const lower = name.toLowerCase();
  if (lower.includes('chileautos')) return Car;
  if (lower.includes('yapo')) return ShoppingCart;
  if (lower.includes('mercadolibre')) return Store;
  if (lower.includes('kavak')) return Car;
  if (lower.includes('autocosmos')) return Compass;
  return Globe;
};

// ============================================================
// Grouping helpers
// ============================================================

export const groupBySource = (sources: TasadorSource[]): SourceGroup[] => {
  const map = new Map<string, TasadorSource[]>();

  for (const s of sources) {
    const key = s.source;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }

  return Array.from(map.entries()).map(([name, listings]) => ({
    name,
    listings: listings.sort((a, b) => a.price - b.price),
    color: getSourceColor(name),
  }));
};

export const groupByVehicle = (
  sources: TasadorSource[],
  comparisonVehicles: { brand: string; model: string; year: number | null }[],
): Map<string, TasadorSource[]> => {
  const vehicleMap = new Map<string, TasadorSource[]>();

  // Initialise buckets
  for (const v of comparisonVehicles) {
    const key = `${v.brand} ${v.model}`.toLowerCase();
    vehicleMap.set(key, []);
  }

  for (const s of sources) {
    const vehicleLower = s.vehicle.toLowerCase();
    let matched = false;

    for (const v of comparisonVehicles) {
      const key = `${v.brand} ${v.model}`.toLowerCase();
      if (vehicleLower.includes(v.brand.toLowerCase()) && vehicleLower.includes(v.model.toLowerCase())) {
        vehicleMap.get(key)!.push(s);
        matched = true;
        break;
      }
    }

    // Fallback: put in first bucket if no match (shouldn't happen often)
    if (!matched && comparisonVehicles.length > 0) {
      const firstKey = `${comparisonVehicles[0].brand} ${comparisonVehicles[0].model}`.toLowerCase();
      vehicleMap.get(firstKey)!.push(s);
    }
  }

  return vehicleMap;
};

// ============================================================
// Markdown helpers
// ============================================================

/** Extract conclusion + market context from the markdown appraisal, skipping listings */
export const extractConclusionFromMarkdown = (
  appraisal: string,
): { conclusion: string[]; marketContext: string | null } => {
  const result: { conclusion: string[]; marketContext: string | null } = {
    conclusion: [],
    marketContext: null,
  };

  // Extract conclusion
  const conclusionMatch = appraisal.match(
    /(?:CONCLUSI[OÓ]N|##\s*Conclusi[oó]n)[:\s]*([\s\S]*?)(?=CONTEXTO DEL MERCADO|##\s*Contexto|$)/i,
  );
  if (conclusionMatch) {
    result.conclusion = conclusionMatch[1]
      .split('\n')
      .map((line) =>
        line
          .replace(/^[-•*]\s*/, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .trim(),
      )
      .filter((line) => line.length > 0);
  }

  // Extract market context
  const contextMatch = appraisal.match(
    /(?:CONTEXTO DEL MERCADO|##\s*Contexto)[:\s]*([\s\S]*?)$/i,
  );
  if (contextMatch) {
    result.marketContext = contextMatch[1]
      .trim()
      .replace(/^\*+\s*/, '')
      .replace(/\*+\s*$/, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .trim();
  }

  return result;
};
