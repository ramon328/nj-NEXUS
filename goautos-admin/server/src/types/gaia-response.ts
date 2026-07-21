export interface VehiclePreview {
  id: number;
  brand: string;
  model: string;
  year: number;
  price: number;
  status: string;
  statusColor: string;
  main_image?: string;
  license_plate?: string;
  mileage?: number;
  days_in_stock: number;
  fuel_type?: string;
  transmission?: string;
  condition?: string;
}

export interface CustomerPreview {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  rut?: string;
}

export interface PendingAction {
  id: string;
  tool: string;
  summary: string;
  params: Record<string, any>;
}

export type GaiaBlock =
  | { type: 'vehicle_cards'; vehicles: VehiclePreview[] }
  | { type: 'vehicle_selector'; vehicles: VehiclePreview[]; prompt: string }
  | { type: 'customer_selector'; customers: CustomerPreview[]; prompt: string }
  | { type: 'confirmation'; action: string; summary: string; details: Record<string, any> }
  | { type: 'quick_actions'; actions: { label: string; message: string }[] }
  | { type: 'image_gallery'; images: string[]; vehicleName?: string }
  | { type: 'sale_summary'; vehicle: string; customer: string; price: number; details: Record<string, any> };

export interface GaiaResponse {
  response: string;
  blocks?: GaiaBlock[];
  pending_action?: PendingAction;
}

export function parseGaiaResponse(rawText: string): { text: string; blocks: GaiaBlock[] } {
  const blockPattern = /```gaia-blocks\s*\n([\s\S]*?)\n```/;
  const match = rawText.match(blockPattern);

  if (!match) {
    return { text: rawText.trim(), blocks: [] };
  }

  const text = rawText.replace(blockPattern, '').trim();
  try {
    const parsed = JSON.parse(match[1]);
    const blocks: GaiaBlock[] = Array.isArray(parsed) ? parsed : [parsed];
    return { text, blocks };
  } catch {
    return { text: rawText.trim(), blocks: [] };
  }
}
