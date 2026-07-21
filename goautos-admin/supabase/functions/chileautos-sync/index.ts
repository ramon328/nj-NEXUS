import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ChileAutos API endpoints
const CA_AUTH_URL = Deno.env.get('CHILEAUTOS_AUTH_URL') || 'https://id.csnglobal.net/connect/token';
const CA_API_BASE_URL = Deno.env.get('CHILEAUTOS_API_BASE_URL') || 'https://inventory.api.carsales.com';

type SyncOperation = 'create' | 'update' | 'delete' | 'mark_sold' | 'bulk_sync' | 'get_specs' | 'auto_publish' | 'verify' | 'republish_all' | 'delete_orphan';

interface SyncRequest {
  operation: SyncOperation;
  vehicleId?: number;
  vehicleIds?: number[];
  clientId: number;
  overrides?: {
    make?: string;
    model?: string;
    title?: string;
    description?: string;
    badge?: string;
    price?: number;
  };
  // Si viene true, el update NO reenvía las fotos a ChileAutos (preserva la galería
  // sin importar la firma). Reenviar Media gatilla un reprocesamiento asíncrono que
  // puede botar la galería; el frontend lo usa al editar solo campos de texto/precio.
  skipPhotos?: boolean;
}

interface SyncResult {
  success: boolean;
  operation: SyncOperation;
  vehicleId: number;
  chileautosIdentifier?: string;
  ca_listing_url?: string;
  error?: string;
  debug?: any;
  // bulk_sync: marca un aviso que se saltó a propósito (p.ej. vendido/reservado) en vez
  // de re-publicarlo. No cuenta como fallo; `message` explica el motivo para la UI.
  skipped?: boolean;
  message?: string;
}

interface BulkSyncResult {
  total: number;
  successful: number;
  failed: number;
  skipped?: number;
  results: SyncResult[];
}

interface ChileautosIntegration {
  id: number;
  client_id: number;
  ca_client_id: string | null;
  ca_client_secret: string | null;
  seller_identifier: string;
  access_token: string | null;
  token_expires_at: string | null;
  sync_on_publish: boolean;
  sync_on_update: boolean;
  sync_on_sold: boolean;
  whatsapp_number: string | null;
  default_products: string[];
  status: string;
}

interface Vehicle {
  id: number;
  brand: { name: string } | null;
  model: { name: string } | null;
  year: number | null;
  price: number | null;
  mileage: number | null;
  license_plate: string | null;
  condition: { name: string } | null;
  fuel_type: { name: string } | null;
  transmission: string | null;
  color: { name: string } | null;
  category: { name: string } | null;
  description: string | null;
  main_image: string | null;
  gallery: string[] | null;
  version_name: string | null;
  discount_percentage: number | null;
}

/**
 * Obtiene un token de acceso de ChileAutos.
 * Uses shared credentials from env vars and caches token in chileautos_system_config.
 */
async function getToken(): Promise<string> {
  // Check shared token cache first
  const { data: systemConfig } = await supabase
    .from('chileautos_system_config')
    .select('*')
    .eq('id', 1)
    .single();

  if (systemConfig?.access_token && systemConfig?.token_expires_at) {
    const expiresAt = new Date(systemConfig.token_expires_at);
    const now = new Date();
    if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
      return systemConfig.access_token;
    }
  }

  // Get shared credentials from env vars
  const caClientId = Deno.env.get('CHILEAUTOS_CLIENT_ID');
  const caClientSecret = Deno.env.get('CHILEAUTOS_CLIENT_SECRET');

  if (!caClientId || !caClientSecret) {
    throw new Error('CHILEAUTOS_CLIENT_ID o CHILEAUTOS_CLIENT_SECRET no configurados');
  }

  // Get new token
  const formData = new URLSearchParams();
  formData.append('client_id', caClientId);
  formData.append('client_secret', caClientSecret);
  formData.append('grant_type', 'client_credentials');

  const response = await fetch(CA_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error(`Error de autenticación: ${response.status}`);
  }

  const tokenData = await response.json();
  const expiryDate = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

  // Update shared token cache
  await supabase
    .from('chileautos_system_config')
    .update({
      access_token: tokenData.access_token,
      token_expires_at: expiryDate.toISOString(),
      last_refreshed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  return tokenData.access_token;
}

/**
 * Normaliza texto removiendo tildes/acentos para comparaciones seguras
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Valida y formatea la patente al formato requerido por ChileAutos
 * Formatos válidos en Chile:
 * - Antiguo: XX0000 (2 letras + 4 números) - hasta 2007
 * - Nuevo: XXXX00 (4 letras + 2 números) - desde 2007
 *
 * Retorna null si no hay patente válida (mejor no enviar que enviar inválida)
 */
function formatLicensePlate(licensePlate: string | null): string | null {
  if (!licensePlate || licensePlate.trim() === '') {
    return null;
  }

  // Remove any special characters, spaces, dashes and convert to uppercase
  const cleaned = licensePlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // Check if valid Chilean format
  const isOldFormat = /^[A-Z]{2}[0-9]{4}$/.test(cleaned); // XX0000
  const isNewFormat = /^[A-Z]{4}[0-9]{2}$/.test(cleaned); // XXXX00

  if (isOldFormat || isNewFormat) {
    return cleaned;
  }

  // Try to form a valid plate from the characters we have
  const letters = cleaned.replace(/[^A-Z]/g, '');
  const numbers = cleaned.replace(/[^0-9]/g, '');

  // New format: XXXX00 (need exactly 4 letters and 2 numbers)
  if (letters.length >= 4 && numbers.length >= 2) {
    const result = letters.slice(0, 4) + numbers.slice(0, 2);
    if (/^[A-Z]{4}[0-9]{2}$/.test(result)) {
      return result;
    }
  }

  // Old format: XX0000 (need exactly 2 letters and 4 numbers)
  if (letters.length >= 2 && numbers.length >= 4) {
    const result = letters.slice(0, 2) + numbers.slice(0, 4);
    if (/^[A-Z]{2}[0-9]{4}$/.test(result)) {
      return result;
    }
  }

  // Can't form a valid plate - return null (don't send Registration at all)
  console.log(`[formatLicensePlate] Could not form valid plate from "${licensePlate}" -> null`);
  return null;
}

/**
 * Mapea tipo de combustible de GoAutos a ChileAutos
 * DB values come from fuel_type table: "Bencina", "Diesel", "Híbrido", "Eléctrico", etc.
 */
function mapFuelType(fuelType: string | null): string {
  const normalized = removeAccents(fuelType?.toLowerCase().trim() || '');
  const mapping: Record<string, string> = {
    'bencina': 'Bencina',
    'gasolina': 'Bencina',
    'nafta': 'Bencina',
    'diesel': 'Diesel',
    'petrolero': 'Diesel',
    'hibrido': 'Híbrido',
    'hybrid': 'Híbrido',
    'hibrido enchufable': 'Híbrido',
    'electrico': 'Eléctrico',
    'electric': 'Eléctrico',
    'gas': 'Gas',
    'glp': 'Gas',
    'gnc': 'Gas',
  };
  return mapping[normalized] || 'Bencina';
}

/**
 * Mapea tipo de transmisión de GoAutos a ChileAutos
 * DB values: "Manual", "Automática", "automatic", "manual"
 */
function mapTransmission(transmission: string | null): string {
  const normalized = removeAccents(transmission?.toLowerCase().trim() || '');
  const mapping: Record<string, string> = {
    'manual': 'Manual',
    'mecanica': 'Manual',
    'mecanico': 'Manual',
    'automatica': 'Automática',
    'automatico': 'Automática',
    'automatic': 'Automática',
    'auto': 'Automática',
    'aut': 'Automática',
    'cvt': 'Automática',
    'tiptronic': 'Automática',
    'secuencial': 'Automática',
  };
  return mapping[normalized] || 'Manual';
}

/**
 * Mapea tipo de carrocería de GoAutos a ChileAutos
 */
function mapBodyType(category: string | null | undefined): string {
  const normalized = removeAccents(category?.toLowerCase().trim() || '');
  const mapping: Record<string, string> = {
    'sedan': 'Sedán',
    'hatchback': 'Hatchback',
    'suv': 'SUV',
    'pickup': 'Pick-Up',
    'pick-up': 'Pick-Up',
    'pick up': 'Pick-Up',
    'camioneta': 'Pick-Up',
    'coupe': 'Coupé',
    'convertible': 'Convertible',
    'cabriolet': 'Convertible',
    'van': 'Van',
    'station wagon': 'Station Wagon',
    'station_wagon': 'Station Wagon',
    'citycar': 'Citycar',
    'city car': 'Citycar',
    'deportivo': 'Deportivas',
    'deportiva': 'Deportivas',
    'deportivas': 'Deportivas',
    'sport': 'Deportivas',
    'minivan': 'Van',
    'todo terreno': 'Todo Terreno',
    'todoterreno': 'Todo Terreno',
    'crossover': 'SUV',
    'furgon': 'Furgón',
    'doble cabina': 'Doble Cabina',
    'cabina simple': 'Cabina Simple',
    'ute': 'Ute',
  };
  return mapping[normalized] || 'SUV';
}

/**
 * Mapea colores de GoAutos a valores válidos de ChileAutos (en español)
 */
function mapColor(color: string | null): string {
  // ChileAutos accepts colors in Spanish
  const mapping: Record<string, string> = {
    'blanco': 'Blanco',
    'white': 'Blanco',
    'negro': 'Negro',
    'black': 'Negro',
    'gris': 'Gris',
    'grey': 'Gris',
    'gray': 'Gris',
    'plata': 'Plata',
    'plateado': 'Plata',
    'silver': 'Plata',
    'rojo': 'Rojo',
    'red': 'Rojo',
    'azul': 'Azul',
    'blue': 'Azul',
    'verde': 'Verde',
    'green': 'Verde',
    'amarillo': 'Amarillo',
    'yellow': 'Amarillo',
    'naranja': 'Naranja',
    'orange': 'Naranja',
    'cafe': 'Café',
    'marron': 'Café',
    'brown': 'Café',
    'beige': 'Beige',
    'dorado': 'Dorado',
    'oro': 'Dorado',
    'gold': 'Dorado',
    'burdeo': 'Burdeo',
    'borgona': 'Burdeo',
    'burgundy': 'Burdeo',
    'morado': 'Morado',
    'violeta': 'Morado',
    'purple': 'Morado',
    'celeste': 'Celeste',
    'turquesa': 'Turquesa',
    'champagne': 'Beige',
    'perla': 'Blanco',
    'blanco perla': 'Blanco',
    'grafito': 'Gris',
    'plomo': 'Gris',
    'crema': 'Beige',
  };
  const normalized = removeAccents(color?.toLowerCase().trim() || '');
  return mapping[normalized] || 'Gris';
}

/**
 * Mapea colores de español a inglés para Colours.Generic (requerido por ChileAutos)
 */
function mapColorGeneric(color: string | null): string {
  const mapping: Record<string, string> = {
    'blanco': 'White',
    'white': 'White',
    'negro': 'Black',
    'black': 'Black',
    'gris': 'Grey',
    'grey': 'Grey',
    'gray': 'Grey',
    'plata': 'Silver',
    'plateado': 'Silver',
    'silver': 'Silver',
    'rojo': 'Red',
    'red': 'Red',
    'azul': 'Blue',
    'blue': 'Blue',
    'verde': 'Green',
    'green': 'Green',
    'amarillo': 'Yellow',
    'yellow': 'Yellow',
    'naranja': 'Orange',
    'orange': 'Orange',
    'cafe': 'Brown',
    'marron': 'Brown',
    'brown': 'Brown',
    'beige': 'Beige',
    'dorado': 'Gold',
    'oro': 'Gold',
    'gold': 'Gold',
    'burdeo': 'Burgundy',
    'borgona': 'Burgundy',
    'burgundy': 'Burgundy',
    'morado': 'Purple',
    'violeta': 'Purple',
    'purple': 'Purple',
    'celeste': 'Blue',
    'turquesa': 'Blue',
    'champagne': 'Beige',
    'perla': 'White',
    'blanco perla': 'White',
    'grafito': 'Grey',
    'plomo': 'Grey',
    'crema': 'Beige',
  };
  const normalized = removeAccents(color?.toLowerCase().trim() || '');
  return mapping[normalized] || 'Grey';
}

/**
 * Mapea categoría de vehículo al TipoCategoria de ChileAutos
 */
function mapCategory(category: string | null | undefined): string {
  const normalized = removeAccents(category?.toLowerCase().trim() || '');
  const mapping: Record<string, string> = {
    'sedan': 'Sedán',
    'hatchback': 'Hatchback',
    'suv': 'SUV',
    'pickup': 'Camioneta',
    'pick-up': 'Camioneta',
    'pick up': 'Camioneta',
    'camioneta': 'Camioneta',
    'coupe': 'Coupé',
    'convertible': 'Convertible',
    'cabriolet': 'Convertible',
    'van': 'Van',
    'station wagon': 'Station Wagon',
    'station_wagon': 'Station Wagon',
    'citycar': 'Citycar',
    'city car': 'Citycar',
    'deportivo': 'Deportivas',
    'deportiva': 'Deportivas',
    'deportivas': 'Deportivas',
    'minivan': 'Van',
    'todo terreno': 'Todo Terreno',
    'todoterreno': 'Todo Terreno',
    'crossover': 'SUV',
    'furgon': 'Furgón',
    'doble cabina': 'Doble Cabina',
    'cabina simple': 'Cabina Simple',
  };
  return mapping[normalized] || 'SUV';
}

/**
 * Normaliza el nombre de marca - solo mapeo básico, sin API del catálogo
 */
function normalizeMakeName(make: string | null, model: string | null): string {
  if (!make) return 'Desconocido';

  const rawMake = make.trim();
  const rawModel = model?.toLowerCase().trim() || '';

  // Special handling for Land Rover / Range Rover
  const rangeRoverModels = ['evoque', 'sport', 'velar', 'vogue', 'autobiography'];
  const isLandRover = rawMake.toLowerCase().includes('land rover') ||
                      rawMake.toLowerCase().includes('landrover') ||
                      rawMake.toLowerCase().includes('range rover');

  if (isLandRover) {
    if (rangeRoverModels.some(m => rawModel.includes(m))) {
      return 'Range Rover';
    }
    if (rawModel.includes('discovery') || rawModel.includes('defender') || rawModel.includes('freelander')) {
      return 'Land Rover';
    }
    return 'Range Rover';
  }

  // Mapeo de nombres comunes
  const mapping: Record<string, string> = {
    'mercedes benz': 'Mercedes-Benz',
    'mercedes': 'Mercedes-Benz',
    'mercedes-benz': 'Mercedes-Benz',
    'bmw': 'BMW',
    'vw': 'Volkswagen',
    'volkswagen': 'Volkswagen',
    'chevy': 'Chevrolet',
    'chevrolet': 'Chevrolet',
    'alfa romeo': 'Alfa Romeo',
    'aston martin': 'Aston Martin',
    'land rover': 'Land Rover',
    'mini': 'MINI',
    'gmc': 'GMC',
    'mg': 'MG',
    'jac': 'JAC',
    'byd': 'BYD',
    'gac': 'GAC',
    'dfsk': 'DFSK',
    'geely': 'Geely',
    'changan': 'Changan',
    'chery': 'Chery',
    'great wall': 'Great Wall',
    'haval': 'Haval',
    'jetour': 'Jetour',
    'maxus': 'Maxus',
    'foton': 'Foton',
    'faw': 'FAW',
    'zotye': 'Zotye',
    'brilliance': 'Brilliance',
    'dongfeng': 'Dongfeng',
    'lifan': 'Lifan',
    'mahindra': 'Mahindra',
    'citroen': 'Citroën',
    'citroën': 'Citroën',
    'peugeot': 'Peugeot',
    'renault': 'Renault',
    'ds': 'DS',
    'fiat': 'Fiat',
    'jeep': 'Jeep',
    'ram': 'RAM',
    'ssangyong': 'SsangYong',
    'subaru': 'Subaru',
    'gwm': 'GWM',
    'baic': 'BAIC',
    'jmc': 'JMC',
    'zna': 'ZNA',
    'saic': 'SAIC',
    'gap': 'GAP',
    'seat': 'SEAT',
    'cupra': 'Cupra',
    'volvo': 'Volvo',
    'audi': 'Audi',
    'toyota': 'Toyota',
    'honda': 'Honda',
    'nissan': 'Nissan',
    'mazda': 'Mazda',
    'suzuki': 'Suzuki',
    'hyundai': 'Hyundai',
    'kia': 'Kia',
    'mitsubishi': 'Mitsubishi',
    'ford': 'Ford',
    'dodge': 'Dodge',
    'porsche': 'Porsche',
    'lexus': 'Lexus',
    'infiniti': 'Infiniti',
    'acura': 'Acura',
    'jaguar': 'Jaguar',
    'maserati': 'Maserati',
    'ferrari': 'Ferrari',
    'lamborghini': 'Lamborghini',
    'bentley': 'Bentley',
    'rolls royce': 'Rolls-Royce',
    'rolls-royce': 'Rolls-Royce',
    'lincoln': 'Lincoln',
    'cadillac': 'Cadillac',
    'chrysler': 'Chrysler',
    'isuzu': 'Isuzu',
    'tata': 'Tata',
    'opel': 'Opel',
    'skoda': 'Skoda',
  };

  const normalizedKey = rawMake.toLowerCase().trim();
  if (mapping[normalizedKey]) {
    return mapping[normalizedKey];
  }

  // Capitalizar primera letra de cada palabra
  return rawMake.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Normaliza el nombre del modelo - solo limpieza básica
 */
function normalizeModelName(model: string | null): string {
  if (!model) return 'Desconocido';
  // Solo trim y capitalizar apropiadamente
  return model.trim();
}

/**
 * Genera un UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Elimina acentos/diacríticos de un string para comparación
 */
function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Intenta hacer match automático de marca/modelo contra el catálogo de ChileAutos
 * Retorna los valores del catálogo si hay match, o null si no
 */
async function autoMatchMakeModel(
  vehicleMake: string,
  vehicleModel: string,
  token: string
): Promise<{ make: string; model: string } | null> {
  try {
    // 1. Fetch makes from catalog
    const makesResponse = await fetch(`${CA_API_BASE_URL}/v1/specifications/cl/car/makes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!makesResponse.ok) {
      console.error('[autoMatch] Error fetching makes:', makesResponse.status);
      return null;
    }

    const makesData = await makesResponse.json();
    const makes: string[] = makesData?.results || makesData || [];

    // 2. Find match for make: exact case-insensitive, then accent-stripped
    const makeNormalized = vehicleMake.toLowerCase().trim();
    const makeStripped = stripAccents(makeNormalized);

    let matchedMake = makes.find(
      (m: string) => m && m.toLowerCase() === makeNormalized
    );
    if (!matchedMake) {
      // Try matching without accents (e.g. "CITROEN" vs "Citroën")
      matchedMake = makes.find(
        (m: string) => m && stripAccents(m.toLowerCase()) === makeStripped
      );
      if (matchedMake) {
        console.log(`[autoMatch] Make matched (accent-stripped): "${vehicleMake}" -> "${matchedMake}"`);
      }
    } else {
      console.log(`[autoMatch] Make matched: "${vehicleMake}" -> "${matchedMake}"`);
    }

    if (!matchedMake) {
      console.log(`[autoMatch] No match found for make "${vehicleMake}"`);
      return null;
    }

    // 3. Fetch models for the matched make
    const modelsResponse = await fetch(
      `${CA_API_BASE_URL}/v1/specifications/cl/car/makes/${encodeURIComponent(matchedMake)}/models`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!modelsResponse.ok) {
      console.error('[autoMatch] Error fetching models:', modelsResponse.status);
      return null;
    }

    const modelsData = await modelsResponse.json();
    const models: string[] = modelsData?.results || modelsData || [];

    const modelNormalized = vehicleModel.toLowerCase().trim();
    const modelStripped = stripAccents(modelNormalized);

    // 4a. Exact case-insensitive match
    let matchedModel = models.find(
      (m: string) => m && m.toLowerCase() === modelNormalized
    );

    // 4b. Accent-stripped match
    if (!matchedModel) {
      matchedModel = models.find(
        (m: string) => m && stripAccents(m.toLowerCase()) === modelStripped
      );
    }

    // 4b-2. Space-insensitive match (e.g. "RSQ3" matches "RS Q3", "C300" matches "C 300")
    if (!matchedModel) {
      const modelNoSpace = modelStripped.replace(/\s+/g, '');
      matchedModel = models.find(
        (m: string) => m && stripAccents(m.toLowerCase()).replace(/\s+/g, '') === modelNoSpace
      );
      if (matchedModel) {
        console.log(`[autoMatch] Model matched (space-insensitive): "${vehicleModel}" -> "${matchedModel}"`);
      }
    }

    // 4c. Partial match - vehicle model starts with catalog model or vice versa
    // e.g. "118 M SPORT" matches "118i", "C3" matches "C3 Aircross"
    if (!matchedModel) {
      // First try: catalog model is contained in the vehicle model (e.g. catalog "118i" in "118i M Sport")
      matchedModel = models.find(
        (m: string) => m && modelNormalized.startsWith(m.toLowerCase())
      );
    }

    // 4d. Extract base model number and try matching
    // e.g. "118 M SPORT" -> try matching "118" against catalog entries starting with "118"
    if (!matchedModel) {
      const baseModel = vehicleModel.trim().split(/\s+/)[0]?.toLowerCase();
      if (baseModel && baseModel.length >= 2) {
        matchedModel = models.find(
          (m: string) => m && m.toLowerCase().startsWith(baseModel)
        );
        if (matchedModel) {
          console.log(`[autoMatch] Model matched (base "${baseModel}"): "${vehicleModel}" -> "${matchedModel}"`);
        }
      }
    }

    // 4e. Try if vehicle model contains a catalog model name.
    // Pick the LONGEST match to prefer specific over generic (e.g. "RS Q3" over "Q3").
    // Compare without spaces so "RSQ3" can find "RS Q3" here as a last resort.
    if (!matchedModel) {
      const modelNoSpace = modelNormalized.replace(/\s+/g, '');
      const candidates = models.filter((m: string) => {
        if (!m || m.length < 2) return false;
        const mNoSpace = m.toLowerCase().replace(/\s+/g, '');
        return modelNoSpace.includes(mNoSpace);
      });
      if (candidates.length > 0) {
        matchedModel = candidates.reduce((a, b) => (a.length >= b.length ? a : b));
      }
    }

    if (!matchedModel) {
      console.log(`[autoMatch] No match found for model "${vehicleModel}" in make "${matchedMake}". Available: ${JSON.stringify(models.slice(0, 20))}`);
      return null;
    }

    console.log(`[autoMatch] Model matched: "${vehicleModel}" -> "${matchedModel}"`);

    return { make: matchedMake, model: matchedModel };
  } catch (err) {
    console.error('[autoMatch] Error:', err);
    return null;
  }
}

/**
 * Valida el BodyStyle contra el catálogo de ChileAutos
 * Retorna el valor válido más cercano, o el default si no hay match
 */
async function validateBodyType(bodyType: string, token: string): Promise<string> {
  try {
    const response = await fetch(`${CA_API_BASE_URL}/v1/specifications/cl/car/body_types`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[validateBodyType] Error fetching body types:', response.status);
      return bodyType;
    }

    const data = await response.json();
    const validTypes: string[] = data?.results || data || [];
    console.log(`[validateBodyType] Valid body types from API:`, JSON.stringify(validTypes));

    // Exact match (case-insensitive)
    const exactMatch = validTypes.find(
      (t: string) => t && t.toLowerCase() === bodyType.toLowerCase()
    );
    if (exactMatch) {
      console.log(`[validateBodyType] Exact match: "${bodyType}" -> "${exactMatch}"`);
      return exactMatch;
    }

    // Partial match (contains)
    const partialMatch = validTypes.find(
      (t: string) => t && (
        t.toLowerCase().includes(bodyType.toLowerCase()) ||
        bodyType.toLowerCase().includes(t.toLowerCase())
      )
    );
    if (partialMatch) {
      console.log(`[validateBodyType] Partial match: "${bodyType}" -> "${partialMatch}"`);
      return partialMatch;
    }

    console.log(`[validateBodyType] No match for "${bodyType}", using as-is`);
    return bodyType;
  } catch (err) {
    console.error('[validateBodyType] Error:', err);
    return bodyType;
  }
}

/**
 * Firma estable del set de fotos (main + gallery).
 * Usa las URLs BASE (sin querystring/cache-bust) para que sea comparable entre syncs.
 * Sirve para detectar si las fotos cambiaron y así, en un update, decidir si reenviarlas:
 * si la firma no cambió, omitimos Media en el PATCH (merge-patch conserva la galería) y
 * evitamos el reproceso async de ChileAutos que bota las fotos al editar (p.ej. el precio).
 */
function computePhotoSignature(vehicle: Vehicle): string {
  const base = (url: string) => (url || '').split('?')[0];
  const urls: string[] = [];
  if (vehicle.main_image) urls.push(base(vehicle.main_image));
  if (vehicle.gallery && vehicle.gallery.length > 0) {
    vehicle.gallery.forEach((u) => {
      if (u && u !== vehicle.main_image) urls.push(base(u));
    });
  }
  return urls.join('|');
}

/** Extrae el identifier de un item de active_items, tolerando variaciones de nombre/casing. */
function extractActiveItemId(it: any): string | null {
  const id = it?.Identifier ?? it?.identifier ?? it?.id ?? it?.Id;
  return id ? String(id) : null;
}

/**
 * Trae TODOS los avisos activos del seller desde ChileAutos paginando active_items.
 * ChileAutos NO soporta GET de un vehículo puntual (devuelve 405); la única lectura
 * confiable es active_items (la lista de avisos vivos), y por defecto trae solo 20,
 * así que paginamos con ?page=&limit=100 hasta agotar. Es read-only: no muta nada.
 */
async function fetchAllActiveItems(
  token: string,
  sellerIdentifier: string,
): Promise<{ items: any[]; lastStatus: number; pages: number }> {
  const all: any[] = [];
  const PAGE_LIMIT = 100;
  const MAX_PAGES = 25; // tope de seguridad (~2500 avisos) por si la paginación nunca cierra
  let lastStatus = 0;
  let page = 1;

  while (page <= MAX_PAGES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let pageItems: any[] = [];
    try {
      const resp = await fetch(
        `${CA_API_BASE_URL}/v1/vehicles/active_items?page=${page}&limit=${PAGE_LIMIT}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-seller-identifier': sellerIdentifier,
          },
          signal: controller.signal,
        },
      );
      lastStatus = resp.status;
      const text = await resp.text();
      if (!resp.ok) break;
      const parsed = text ? JSON.parse(text) : null;
      pageItems = Array.isArray(parsed)
        ? parsed
        : (parsed?.items ?? parsed?.value ?? parsed?.data ?? parsed?.results ?? []);
    } catch (_e) {
      break;
    } finally {
      clearTimeout(timeout);
    }

    if (!Array.isArray(pageItems) || pageItems.length === 0) break;
    all.push(...pageItems);
    if (pageItems.length < PAGE_LIMIT) break; // última página
    page++;
  }

  return { items: all, lastStatus, pages: page };
}

/**
 * Construye el payload para ChileAutos API según la documentación oficial
 * Usa el catálogo de ChileAutos para validar y normalizar marca/modelo
 */
function buildVehiclePayload(
  vehicle: Vehicle,
  integration: ChileautosIntegration,
  identifier: string,
  overrides?: { make?: string; model?: string; title?: string; description?: string; badge?: string; price?: number },
  options?: { isUpdate?: boolean; includePhotos?: boolean }
): { payload: any; error?: string } {
  // Use overrides if provided, otherwise normalize from vehicle data
  const rawMake = vehicle.brand?.name || 'Desconocido';
  const rawModel = vehicle.model?.name || 'Desconocido';

  console.log(`[buildVehiclePayload] Raw: make="${rawMake}", model="${rawModel}"`);
  console.log(`[buildVehiclePayload] Overrides received:`, JSON.stringify(overrides));

  // ChileAutos rechaza publicaciones sin combustible o transmisión con un error críptico
  // ("invalid gear type valor: undefined"). Validamos antes para devolver un mensaje útil.
  const missing: string[] = [];
  if (!vehicle.fuel_type?.name) missing.push('combustible');
  if (!vehicle.transmission) missing.push('transmisión');
  if (missing.length > 0) {
    return {
      payload: null,
      error: `Faltan datos obligatorios del vehículo para ChileAutos: ${missing.join(' y ')}. Edita el vehículo, completa esos campos y reintenta.`,
    };
  }

  // If overrides provided, use them directly (already validated against catalog)
  const make = overrides?.make || normalizeMakeName(rawMake, rawModel);
  const model = overrides?.model || normalizeModelName(rawModel);

  console.log(`[buildVehiclePayload] Final: make="${make}", model="${model}"`);

  const year = vehicle.year || new Date().getFullYear();

  // TÍTULO en ChileAutos (verificado contra avisos reales + doc oficial):
  //  - Title (COMPLETO, lo que se ve AL ABRIR la publicación): Año + Marca + Modelo con
  //    versión. Usamos vehicle.model?.name (modelo crudo de GoAuto, que para varios clientes
  //    ya trae el trim) y, si hay version_name aparte y NO está ya contenido en el modelo,
  //    lo agregamos. ChileAutos muestra este título completo al abrir y deriva solo el
  //    corto + subtítulo para el buscador (a partir del Title + el Badge).
  //  - ShortTitle (CORTO, buscador): Año + Marca + Modelo base del catálogo.
  //  - La Versión también va en el Badge (atributo) para el filtro/subtítulo.
  //  Antes (#868) el Title iba CORTO sin versión -> al abrir la publicación no salía la
  //  versión. Esto lo corrige. NO afecta el nombre del auto en GoAuto.
  const fullModel = vehicle.model?.name || model;
  // La versión puede venir del vehículo (version_name) O de lo que el dealer escribió
  // en el campo "Versión/Badge" del modal (overrides.badge). Si no está ya contenida en
  // el modelo, la agregamos al título para que ChileAutos muestre "Año Marca Modelo
  // Versión" al abrir la publicación. ADITIVO a #879: no cambia el formato ni el caso
  // version_name; solo suma el badge como segunda fuente de la versión.
  const effectiveVersion = vehicle.version_name || overrides?.badge || '';
  const versionExtra =
    effectiveVersion &&
    !fullModel.toLowerCase().includes(effectiveVersion.toLowerCase())
      ? ` ${effectiveVersion}`
      : '';
  const autoTitle = `${year} ${make} ${fullModel}${versionExtra}`.trim();
  const title = overrides?.title || autoTitle;
  const shortTitle = `${year} ${make} ${model}`.trim();

  // Format license plate - only include if valid
  // Chilean formats: XX0000 (old) or XXXX00 (new)
  const licensePlate = formatLicensePlate(vehicle.license_plate);
  console.log(`[buildVehiclePayload] License plate: "${vehicle.license_plate}" -> "${licensePlate || 'OMITTED'}"`);

  // Get body type from category
  const bodyType = mapBodyType(vehicle.category?.name);

  // Build attributes array - using FeatureGroup as validated in certification tests
  const attributes: any[] = [];

  // BodyStyle
  attributes.push({
    Name: 'BodyStyle',
    FeatureGroup: 'Detalles',
    DisplayName: 'Carrocería',
    Value: bodyType,
    DisplayOnDetailsPage: true,
    IsKeyAttribute: true,
    IsDeleted: false,
  });

  // Color
  const colorName = vehicle.color?.name;
  if (colorName) {
    attributes.push({
      Name: 'Color',
      FeatureGroup: 'Detalles',
      DisplayName: 'Color',
      Value: mapColor(colorName),
      DisplayOnDetailsPage: true,
      IsKeyAttribute: false,
      IsDeleted: false,
    });
  }

  // Fuel Type
  const fuelTypeName = vehicle.fuel_type?.name;
  if (fuelTypeName) {
    attributes.push({
      Name: 'FuelType',
      FeatureGroup: 'Detalles',
      DisplayName: 'Combustible',
      Value: mapFuelType(fuelTypeName),
      DisplayOnDetailsPage: true,
      IsKeyAttribute: false,
      IsDeleted: false,
    });
  }

  // Gear Type (Transmission)
  if (vehicle.transmission) {
    attributes.push({
      Name: 'GearType',
      FeatureGroup: 'Detalles',
      DisplayName: 'Transmisión',
      Value: mapTransmission(vehicle.transmission),
      DisplayOnDetailsPage: true,
      IsKeyAttribute: false,
      IsDeleted: false,
    });
  }

  // Badge (Distintivo/Versión) - required by Álvaro for filter functionality
  // Prioridad: override explícito > version_name de DB > model original (con trim) > model matched
  // `model` aquí ya es el matched (post autoMatchMakeModel), que a veces pierde el trim
  // (e.g. "SILVERADO 5.3 AUTO LT TRAIL BOSS DC 4WD R" → "Silverado"). Por eso preferimos
  // version_name o vehicle.model.name original para conservar la versión en el título público.
  const rawModelForBadge = vehicle.model?.name || '';
  const badgeValue =
    overrides?.badge ||
    vehicle.version_name ||
    (rawModelForBadge && rawModelForBadge.toLowerCase() !== model.toLowerCase()
      ? rawModelForBadge
      : model);
  attributes.push({
    Name: 'Badge',
    FeatureGroup: 'Detalles',
    DisplayName: 'Versión',
    Value: badgeValue,
    DisplayOnDetailsPage: true,
    IsKeyAttribute: false,
    IsDeleted: false,
  });

  // TipoVehiculo
  attributes.push({
    Name: 'TipoVehiculo',
    FeatureGroup: 'Detalles',
    DisplayName: 'Tipo Vehículo',
    Value: 'Autos, Camionetas y 4x4',
    DisplayOnDetailsPage: true,
    IsKeyAttribute: false,
    IsDeleted: false,
  });

  // TipoCategoria
  const categoryName = vehicle.category?.name;
  attributes.push({
    Name: 'TipoCategoria',
    FeatureGroup: 'Detalles',
    DisplayName: 'Tipo Categoría',
    Value: mapCategory(categoryName),
    DisplayOnDetailsPage: true,
    IsKeyAttribute: false,
    IsDeleted: false,
  });


  // Build the full payload according to ChileAutos documentation
  const payload: any = {
    PublishingDestinations: [{ Name: 'ChileAutos' }],
    Seller: {
      Identifier: integration.seller_identifier,
    },
    Specification: {
      RecordType: 'Autos, camionetas y 4x4',
      Make: make,
      Model: model,
      ReleaseDate: {
        Year: year,
      },
      Title: title,
      ShortTitle: shortTitle,
      Attributes: attributes,
    },
    Identifier: identifier,
    Type: 'Car',
    ListingType: vehicle.condition?.name?.toLowerCase() === 'nuevo' ? 'Nuevo' : 'Usado',
    SaleStatus: 'In Stock',
    Description: overrides?.description || vehicle.description || '',
  };

  // On update, never send an empty Description: merge-patch would overwrite (blank)
  // whatever description the listing already has on ChileAutos. On create we keep ''.
  if (options?.isUpdate && !payload.Description) {
    delete payload.Description;
  }

  // Only add Registration if we have a valid license plate
  if (licensePlate) {
    payload.Registration = {
      Number: licensePlate,
    };
  }

  // Add colors - Generic must be in English, Name/Localised in Spanish
  if (vehicle.color?.name) {
    const localizedColor = mapColor(vehicle.color.name);
    const genericColor = mapColorGeneric(vehicle.color.name);
    payload.Colours = [
      {
        Location: 'Exterior',
        Generic: genericColor,
        Name: localizedColor,
      },
    ];
  }

  // Add odometer readings
  if (vehicle.mileage) {
    payload.OdometerReadings = [
      {
        Value: vehicle.mileage,
        UnitOfMeasure: 'KM',
      },
    ];
  }

  // Add price.
  // ChileAutos muestra precio tachado (oferta) mandando DOS entradas en PriceList:
  // Type 'WAS' (precio anterior, tachado) + Type 'Sale' (precio con descuento).
  // REGLA DE CHILEAUTOS: la rebaja debe ser de AL MENOS 10% o rechaza la publicación (400).
  // GoAuto guarda el % en discount_percentage y el precio normal en `price` (igual que la
  // vitrina del sitio: salePrice = round(price * (1 - %/100))).
  // Sin descuento >= 10% (o si el precio con descuento cae bajo el mínimo de $100.000),
  // mandamos un solo precio como siempre — sin tocar el comportamiento de los autos sin oferta.
  const finalPrice = overrides?.price || vehicle.price;
  // SIN precio no se puede publicar: si no hay precio (null/0), antes el aviso se publicaba
  // sin precio (los dos guards de abajo se saltaban por cortocircuito) o ChileAutos devolvía
  // un 400 críptico. Cortamos acá con un mensaje claro. Un vehículo publicable siempre tiene
  // precio; los autos sin precio no llegan a publicarse, así que esto no bloquea ningún
  // flujo legítimo, solo evita avisos rotos sin precio.
  if (!finalPrice || finalPrice <= 0) {
    return {
      payload: null,
      error: 'El vehículo no tiene precio. Asígnale un precio y reintenta antes de publicar en ChileAutos.',
    };
  }
  // ChileAutos exige precio mínimo de $100.000 CLP. Si es menor, devolvemos un error claro
  // (en vez de dejar que ChileAutos responda un 400 críptico que nadie entiende).
  if (finalPrice < 100000) {
    return {
      payload: null,
      error: `El precio del vehículo (${finalPrice}) es menor al mínimo de $100.000 que exige ChileAutos. Ajústalo y reintenta.`,
    };
  }
  {
    const discountPct = vehicle.discount_percentage || 0;
    const salePrice = Math.round(finalPrice * (1 - discountPct / 100));
    if (discountPct >= 10 && salePrice >= 100000) {
      // Orden EXACTO de la doc oficial: 'Sale' (precio actual con descuento) PRIMERO,
      // 'WAS' (precio anterior, tachado) SEGUNDO. ChileAutos toma la 1ª entrada como el
      // precio principal; si se invierte, muestra el WAS como precio y lo tacha con su
      // mismo valor (bug observado en el F-150 2026-06-11).
      payload.PriceList = [
        { Type: 'Sale', Currency: 'CLP', Amount: salePrice },
        { Type: 'WAS', Currency: 'CLP', Amount: finalPrice },
      ];
      console.log(`[buildVehiclePayload] Precio con oferta: Sale=${salePrice} WAS=${finalPrice} (${discountPct}%)`);
    } else {
      // Sin oferta válida para precio tachado (descuento < 10%, o el precio con descuento
      // caería bajo el mínimo de $100.000 de CA). Igual queremos que el NÚMERO que ve el
      // comprador coincida con la vitrina de GoAuto: si hay descuento (aunque sea <10%) y el
      // precio rebajado respeta el mínimo, mandamos ESE precio efectivo como precio único
      // (sin tachado, porque CA solo permite WAS/Sale con >= 10%). Sin descuento (0%), se
      // manda el precio normal de siempre — comportamiento intacto para autos sin oferta.
      const effectivePrice =
        discountPct > 0 && salePrice >= 100000 ? salePrice : finalPrice;
      payload.PriceList = [
        { Currency: 'CLP', Amount: effectivePrice },
      ];
      if (effectivePrice !== finalPrice) {
        console.log(
          `[buildVehiclePayload] Descuento ${discountPct}% (<10%): precio efectivo ${effectivePrice} a CA (sin tachado, para que coincida con la vitrina)`,
        );
      }
    }
  }

  // Add photos — per ChileAutos docs, Order must be a string.
  // KEY: on an update we only (re)send Media when the gallery actually changed
  // (options.includePhotos). When it didn't change we OMIT Media entirely, so the
  // merge-patch leaves the existing ChileAutos gallery untouched. This is the fix for
  // the photo-drop: a plain price edit no longer re-triggers ChileAutos' async photo
  // reprocessing (which silently dropped galleries to the main photo). On create, and
  // on a deliberate full re-sync (bulk_sync forces includePhotos), we always send them.
  // When we DO send, cache-bust each URL so ChileAutos re-fetches the full set cleanly
  // (its pipeline can dedupe by URL and skip unchanged images otherwise).
  const includePhotos = options?.includePhotos !== false;
  if (includePhotos) {
    const photoCacheBust = `cb=${Date.now()}`;
    const addCacheBust = (url: string) =>
      url.includes('?') ? `${url}&${photoCacheBust}` : `${url}?${photoCacheBust}`;
    const photos: { Url: string; Order: string }[] = [];
    if (vehicle.main_image) {
      photos.push({ Url: addCacheBust(vehicle.main_image), Order: '1' });
    }
    if (vehicle.gallery && vehicle.gallery.length > 0) {
      vehicle.gallery.forEach((imgUrl) => {
        if (imgUrl && imgUrl !== vehicle.main_image) {
          photos.push({ Url: addCacheBust(imgUrl), Order: String(photos.length + 1) });
        }
      });
    }
    if (photos.length > 0) {
      payload.Media = { Photos: photos };
    }
    console.log(`[buildVehiclePayload] Photos count: ${photos.length}, first URL:`, photos[0]?.Url?.substring(0, 80));
  } else {
    console.log('[buildVehiclePayload] Media omitido (fotos sin cambios en update) — galería conservada');
  }

  // Add WhatsApp if configured
  if (integration.whatsapp_number) {
    payload.ExtendedProperties = [
      { Name: 'WhatsApp', Value: integration.whatsapp_number },
    ];
  }

  // Add products (Tags) - only Name is required per ChileAutos docs
  if (integration.default_products && integration.default_products.length > 0) {
    payload.Tags = integration.default_products.map(product => ({
      Name: product,
    }));
  }

  return { payload };
}

/**
 * Crea un vehículo en ChileAutos
 */
async function createVehicle(
  vehicle: Vehicle,
  integration: ChileautosIntegration,
  token: string,
  overrides?: { make?: string; model?: string; title?: string; description?: string; badge?: string; price?: number }
): Promise<SyncResult> {
  const identifier = generateUUID();
  const { payload, error: payloadError } = buildVehiclePayload(vehicle, integration, identifier, overrides);

  // Check for validation errors
  if (payloadError || !payload) {
    return {
      success: false,
      operation: 'create',
      vehicleId: vehicle.id,
      error: payloadError || 'Error al construir payload',
    };
  }

  // Validate BodyStyle against ChileAutos catalog
  const bodyStyleAttr = payload.Specification?.Attributes?.find((a: any) => a.Name === 'BodyStyle');
  if (bodyStyleAttr) {
    const validatedBodyType = await validateBodyType(bodyStyleAttr.Value, token);
    if (validatedBodyType !== bodyStyleAttr.Value) {
      console.log(`[createVehicle] BodyStyle corrected: "${bodyStyleAttr.Value}" -> "${validatedBodyType}"`);
      bodyStyleAttr.Value = validatedBodyType;
    }
  }

  // Only include Tags if explicitly configured by the tenant — product management is their responsibility
  if (!payload.Tags || payload.Tags.length === 0) {
    delete payload.Tags;
    console.log(`[createVehicle] No Tags configured, publishing without product tags`);
  }

  console.log(`[createVehicle] vehicle=${vehicle.id}, identifier=${identifier}, tags=${JSON.stringify(payload.Tags)}`);
  console.log(`[createVehicle] FULL_PAYLOAD vehicle=${vehicle.id} identifier=${identifier} payload=${JSON.stringify(payload)}`);

  // Use AbortController to prevent edge function timeout on slow ChileAutos responses
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

  let response: Response;
  try {
    response = await fetch(`${CA_API_BASE_URL}/v1/vehicles/${identifier}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-seller-identifier': integration.seller_identifier,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);
    const isTimeout = fetchErr.name === 'AbortError';
    console.error(`[createVehicle] Fetch ${isTimeout ? 'TIMEOUT' : 'ERROR'}:`, fetchErr.message);
    return {
      success: false,
      operation: 'create',
      vehicleId: vehicle.id,
      error: isTimeout
        ? 'ChileAutos no respondió a tiempo (timeout 25s). Intenta de nuevo.'
        : `Error de conexión con ChileAutos: ${fetchErr.message}`,
    };
  }
  clearTimeout(timeoutId);

  console.log(`[createVehicle] ChileAutos responded: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[createVehicle] Error ${response.status}:`, errorText);
    console.error(`[createVehicle] Payload sent (make=${payload.Specification?.Make}, model=${payload.Specification?.Model})`);
    // Extract meaningful error message from HTML or JSON response
    let friendlyError = `Error ${response.status} de ChileAutos`;
    if (response.status === 500) {
      friendlyError = 'Error interno de ChileAutos (500). Puede ser un problema temporal de su servidor. Intenta de nuevo en unos minutos.';
    } else {
      try {
        const parsed = JSON.parse(errorText);
        // Handle validation errors array from ChileAutos
        if (parsed.errors && Array.isArray(parsed.errors)) {
          const details = parsed.errors.map((e: any) =>
            `${e.propertyName}: ${e.errorMessage} (valor: "${e.attemptedValue}")`
          ).join('; ');
          friendlyError = `Datos inválidos: ${details}`;
        } else {
          friendlyError = parsed.message || parsed.error || parsed.title || friendlyError;
        }
      } catch {
        // If not JSON, use status-based message
        if (response.status === 400) friendlyError = 'Datos inválidos para ChileAutos. Verifica marca, modelo y otros campos.';
        if (response.status === 401 || response.status === 403) friendlyError = 'Error de autenticación con ChileAutos. Intenta reconectar.';
      }
    }
    return {
      success: false,
      operation: 'create',
      vehicleId: vehicle.id,
      error: friendlyError,
      debug: {
        status: response.status,
        payload: payload,
        response: errorText,
      },
    };
  }

  // URL pública del aviso en ChileAutos. /details/{identifier} resuelve al aviso real
  // (confirmado 2026-06-11). El ?q= (búsqueda por patente) no era un link estable al aviso.
  const ca_listing_url = `https://www.chileautos.cl/details/${identifier}`;

  // Create local listing record
  const title = `${vehicle.brand?.name || ''} ${vehicle.model?.name || ''} ${vehicle.year || ''}`.trim();

  const { error: insertError } = await supabase.from('chileautos_listing').insert({
    client_id: integration.client_id,
    integration_id: integration.id,
    vehicle_id: vehicle.id,
    chileautos_identifier: identifier,
    title,
    price: vehicle.price,
    currency: 'CLP',
    status: 'published',
    sale_status: 'In Stock',
    active_products: integration.default_products || [],
    ca_listing_url,
    photo_signature: computePhotoSignature(vehicle),
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    // No pudimos registrar el aviso en el cache local. Dos casos:
    //  - 23505 = violación de UNIQUE(vehicle_id): otra invocación concurrente (doble click, o
    //    sync_on_publish + publicar manual a la vez) ya registró el aviso (su fila local sigue
    //    intacta). El aviso que ACABAMOS de crear es un duplicado.
    //  - cualquier otro error de DB: el aviso quedó creado en CA pero sin fila local.
    // En AMBOS casos el aviso recién creado quedaría "zombie" (vivo en ChileAutos, sin fila
    // local que lo gestione → genera leads sin vínculo y no se puede marcar vendido). Por eso
    // lo BORRAMOS de ChileAutos: nunca dejamos un aviso a medias. Así, si el usuario reintenta,
    // no se acumulan duplicados. (El UNIQUE(vehicle_id) ya existe en la DB, así que el 23505
    // es un camino real, no teórico.)
    const isDuplicate = (insertError as any).code === '23505';
    console.warn(
      `[createVehicle] insert local falló (vehículo ${vehicle.id}, ${isDuplicate ? 'UNIQUE duplicado' : insertError.message}); limpiando aviso ${identifier} de ChileAutos para no dejar huérfano`,
    );
    try {
      await fetch(`${CA_API_BASE_URL}/v1/vehicles/${identifier}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-seller-identifier': integration.seller_identifier,
        },
      });
    } catch (e) {
      console.error(`[createVehicle] No se pudo limpiar el aviso ${identifier} de ChileAutos:`, e);
    }
    return {
      success: false,
      operation: 'create',
      vehicleId: vehicle.id,
      error: isDuplicate
        ? 'El vehículo ya está publicado en ChileAutos (se evitó una publicación duplicada).'
        : `No se pudo registrar la publicación en GoAuto (${insertError.message}). No quedó ningún aviso a medias; puedes reintentar.`,
    };
  }

  return {
    success: true,
    operation: 'create',
    vehicleId: vehicle.id,
    chileautosIdentifier: identifier,
    ca_listing_url,
  };
}

/**
 * Actualiza un vehículo en ChileAutos
 */
async function updateVehicle(
  vehicle: Vehicle,
  integration: ChileautosIntegration,
  listing: any,
  token: string,
  overrides?: { make?: string; model?: string; title?: string; description?: string; badge?: string; price?: number },
  opts?: { forcePhotos?: boolean; skipPhotos?: boolean }
): Promise<SyncResult> {
  // Decidir si (re)enviamos las fotos en este update:
  //  - forcePhotos (bulk_sync / re-sync manual / recuperación) => SIEMPRE se mandan.
  //  - auto-update normal (p.ej. editar el precio) => solo si la galería cambió de verdad
  //    vs la última firma que sincronizamos. Si no cambió, se omiten y la galería queda intacta.
  //  - listing sin firma (publicaciones viejas, photo_signature NULL) => NO se reenvían
  //    (default seguro: preservar la galería existente; la firma se setea en este sync).
  const currentPhotoSignature = computePhotoSignature(vehicle);
  const includePhotos =
    // skipPhotos manda sobre todo: si el caller pide NO tocar las fotos, jamás se envía
    // Media (ni siquiera si la firma difiere). Evita el reprocesamiento que bota la galería.
    opts?.skipPhotos === true
      ? false
      : opts?.forcePhotos === true ||
        (listing.photo_signature != null && listing.photo_signature !== currentPhotoSignature);

  // En un update REGENERAMOS el título con el formato canónico (#879: Año Marca Modelo
  // Versión). Antes (#869) se preservaba listing.title, pero eso re-aplicaba títulos viejos
  // (año al FINAL, pre-#879) en cada edición — p.ej. editar la descripción dejaba el título
  // como "Marca Modelo Versión Año". Si el dealer escribe un "Título personalizado" en el
  // modal Editar, ese overrides.title sigue ganando dentro de buildVehiclePayload.
  const { payload, error: payloadError } = buildVehiclePayload(
    vehicle,
    integration,
    listing.chileautos_identifier,
    overrides,
    { isUpdate: true, includePhotos }
  );

  if (payloadError || !payload) {
    return {
      success: false,
      operation: 'update',
      vehicleId: vehicle.id,
      error: payloadError || 'Error al construir payload',
    };
  }

  // Validate BodyStyle against ChileAutos catalog
  const bodyStyleAttr = payload.Specification?.Attributes?.find((a: any) => a.Name === 'BodyStyle');
  if (bodyStyleAttr) {
    const validatedBodyType = await validateBodyType(bodyStyleAttr.Value, token);
    if (validatedBodyType !== bodyStyleAttr.Value) {
      console.log(`[updateVehicle] BodyStyle corrected: "${bodyStyleAttr.Value}" -> "${validatedBodyType}"`);
      bodyStyleAttr.Value = validatedBodyType;
    }
  }

  console.log(`Updating vehicle ${vehicle.id} in ChileAutos`);
  console.log(`[updateVehicle] FULL_PAYLOAD vehicle=${vehicle.id} identifier=${listing.chileautos_identifier} payload=${JSON.stringify(payload)}`);

  const updateController = new AbortController();
  const updateTimeoutId = setTimeout(() => updateController.abort(), 25000);

  let response: Response;
  try {
    response = await fetch(
      `${CA_API_BASE_URL}/v1/vehicles/${listing.chileautos_identifier}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/merge-patch+json',
          'x-seller-identifier': integration.seller_identifier,
        },
        body: JSON.stringify(payload),
        signal: updateController.signal,
      }
    );
  } catch (fetchErr: any) {
    clearTimeout(updateTimeoutId);
    const isTimeout = fetchErr.name === 'AbortError';
    console.error(`[updateVehicle] Fetch ${isTimeout ? 'TIMEOUT' : 'ERROR'}:`, fetchErr.message);
    return {
      success: false,
      operation: 'update',
      vehicleId: vehicle.id,
      error: isTimeout
        ? 'ChileAutos no respondió a tiempo (timeout 25s). Intenta de nuevo.'
        : `Error de conexión con ChileAutos: ${fetchErr.message}`,
    };
  }
  clearTimeout(updateTimeoutId);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ChileAutos update error:', errorText);

    await supabase
      .from('chileautos_listing')
      .update({
        status: 'error',
        sync_error: `Error ${response.status}: ${errorText}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listing.id);

    return {
      success: false,
      operation: 'update',
      vehicleId: vehicle.id,
      error: `Error ${response.status}: ${errorText}`,
    };
  }

  // Update local listing — reflejar en el cache local lo que efectivamente se publicó:
  // si vino override de título/precio (flujo "Editar publicación"), usarlo; si no, conservar
  // el título existente del listing (no regenerar) y el precio del vehículo. Así el admin
  // (drawer/lista) muestra el valor editado y no queda desfasado hasta el próximo full sync.
  // Guardar en el cache local el título que REALMENTE se envió (el regenerado año-adelante),
  // así la lista/drawer del admin y los próximos updates parten del formato correcto y se
  // "auto-curan" los títulos viejos guardados.
  const title =
    overrides?.title ||
    payload?.Specification?.Title ||
    listing?.title ||
    `${vehicle.brand?.name || ''} ${vehicle.model?.name || ''} ${vehicle.year || ''}`.trim();

  // Preservar vendido/reservado: por defecto un update deja el aviso 'published', pero si el
  // listing ya estaba marcado como vendido/reservado NO lo volvemos a publicar (cinturón
  // extra al filtro de bulk_sync: evita revivir un aviso vendido aunque updateVehicle se
  // llame desde otra vía).
  const nextStatus =
    listing.status === 'sold' || listing.status === 'reserved'
      ? listing.status
      : 'published';

  await supabase
    .from('chileautos_listing')
    .update({
      title,
      price: overrides?.price ?? vehicle.price,
      status: nextStatus,
      sync_error: null,
      // Solo actualizar la firma si REALMENTE se enviaron las fotos. Si se omitieron
      // (skipPhotos, o galería sin cambios), conservar la firma anterior: si guardáramos
      // la firma nueva sin haber mandado las fotos, un sync futuro creería que la galería
      // ya está sincronizada y NUNCA volvería a subir las fotos nuevas (desync permanente).
      photo_signature: includePhotos ? currentPhotoSignature : (listing.photo_signature ?? null),
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', listing.id);

  return {
    success: true,
    operation: 'update',
    vehicleId: vehicle.id,
    chileautosIdentifier: listing.chileautos_identifier,
  };
}

/**
 * Elimina un vehículo de ChileAutos
 */
async function deleteVehicle(
  vehicleId: number,
  integration: ChileautosIntegration,
  listing: any,
  token: string
): Promise<SyncResult> {
  console.log(`Deleting vehicle ${vehicleId} from ChileAutos`);

  // DELETE es idempotente (borrar dos veces da lo mismo; 404 = ya no estaba = OK).
  // Timeout 25s por intento + 1 reintento ante timeout/5xx (mismo patrón que mark_sold).
  let response: Response | null = null;
  let lastError = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      response = await fetch(
        `${CA_API_BASE_URL}/v1/vehicles/${listing.chileautos_identifier}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-seller-identifier': integration.seller_identifier,
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
    } catch (err: any) {
      clearTimeout(timeoutId);
      response = null;
      lastError = err.name === 'AbortError'
        ? 'ChileAutos no respondió a tiempo (timeout 25s)'
        : err.message;
    }
    // Éxito (2xx), 404 (ya no estaba) o error de cliente (4xx) => no reintentar
    if (response && (response.ok || response.status < 500)) break;
    // 5xx o timeout => esperar un poco y reintentar (solo una vez)
    if (attempt === 1) await new Promise((r) => setTimeout(r, 1500));
  }

  if (!response || (!response.ok && response.status !== 404)) {
    const errorText = response ? await response.text() : lastError;
    console.error('ChileAutos delete error:', errorText);
    return {
      success: false,
      operation: 'delete',
      vehicleId,
      error: response ? `Error ${response.status}: ${errorText}` : lastError,
    };
  }

  // Delete local listing
  await supabase.from('chileautos_listing').delete().eq('id', listing.id);

  return {
    success: true,
    operation: 'delete',
    vehicleId,
  };
}

/**
 * Marca un vehículo como vendido en ChileAutos
 */
async function markVehicleSold(
  vehicleId: number,
  integration: ChileautosIntegration,
  listing: any,
  token: string
): Promise<SyncResult> {
  console.log(`Marking vehicle ${vehicleId} as sold in ChileAutos`);

  const payload = {
    SaleStatus: 'Sold',
  };

  // Marcar 'Sold' es idempotente, así que reintentamos UNA vez ante un fallo transitorio
  // (timeout o error 5xx del servidor de ChileAutos). Cada intento con timeout de 25s para
  // no colgar la función. Un 4xx (error de datos/auth) NO se reintenta.
  let response: Response | null = null;
  let lastError = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      response = await fetch(
        `${CA_API_BASE_URL}/v1/vehicles/${listing.chileautos_identifier}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/merge-patch+json',
            'x-seller-identifier': integration.seller_identifier,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
    } catch (err: any) {
      clearTimeout(timeoutId);
      response = null;
      lastError = err.name === 'AbortError'
        ? 'ChileAutos no respondió a tiempo (timeout 25s)'
        : err.message;
    }
    // Éxito o error de cliente (4xx) => no reintentar
    if (response && (response.ok || response.status < 500)) break;
    // 5xx o timeout => esperar un poco y reintentar (solo una vez)
    if (attempt === 1) await new Promise((r) => setTimeout(r, 1500));
  }

  if (!response || !response.ok) {
    const errorText = response ? await response.text() : lastError;
    console.error('ChileAutos mark sold error:', errorText);
    // Persistir el error para que NO sea silencioso: así el aviso queda marcado y se puede
    // detectar/reintentar después (antes se perdía y el auto vendido seguía 'In Stock').
    await supabase
      .from('chileautos_listing')
      .update({
        sync_error: `mark_sold falló: ${errorText}`.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq('id', listing.id);
    return {
      success: false,
      operation: 'mark_sold',
      vehicleId,
      error: response ? `Error ${response.status}: ${errorText}` : lastError,
    };
  }

  // Update local listing
  await supabase
    .from('chileautos_listing')
    .update({
      status: 'sold',
      sale_status: 'Sold',
      sync_error: null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', listing.id);

  return {
    success: true,
    operation: 'mark_sold',
    vehicleId,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SyncRequest = await req.json();
    const { operation, vehicleId, vehicleIds, clientId } = body;

    if (!clientId) {
      return new Response(
        JSON.stringify({ success: false, error: 'clientId es requerido' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`ChileAutos sync: operation=${operation}, clientId=${clientId}`);

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('chileautos_integration')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (integration) {
      console.log(`[ChileAutos] Integration found: id=${integration.id}, seller_identifier="${integration.seller_identifier}", client_id=${integration.client_id}`);
    }

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se encontró integración de ChileAutos',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate seller_identifier is configured
    if (!integration.seller_identifier) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'seller_identifier no configurado en la integración. Configurar en la tabla chileautos_integration.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get token (shared across all tenants)
    const token = await getToken();

    // Handle get_specs - query ChileAutos catalog
    if (operation === 'get_specs') {
      const specType = (body as any).specType || 'makes'; // makes, models, colours, body_types
      const makeName = (body as any).makeName; // for getting models of a specific make

      let specUrl = `${CA_API_BASE_URL}/v1/specifications/cl/car/${specType}`;
      if (specType === 'models' && makeName) {
        specUrl = `${CA_API_BASE_URL}/v1/specifications/cl/car/makes/${encodeURIComponent(makeName)}/models`;
      }

      console.log(`Fetching specs from: ${specUrl}`);

      const response = await fetch(specUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(
          JSON.stringify({ success: false, error: `Error fetching specs: ${response.status} - ${errorText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const specs = await response.json();
      return new Response(
        JSON.stringify({ success: true, data: specs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle verify - check what vehicles exist for this seller in ChileAutos
    if (operation === 'verify') {
      // Check available products for this seller
      let productsData: any = null;
      try {
        const productsUrl = `${CA_API_BASE_URL}/v1/customers/${integration.seller_identifier}/products`;
        const productsResponse = await fetch(productsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-seller-identifier': integration.seller_identifier,
          },
        });
        const productsText = await productsResponse.text();
        productsData = productsText ? (() => { try { return JSON.parse(productsText); } catch { return productsText; } })() : null;
      } catch (e: any) {
        productsData = { error: e.message };
      }

      // Verificar UN aviso puntual por su identifier.
      // ChileAutos NO soporta GET /v1/vehicles/{id} (devuelve 405), así que en vez de
      // preguntar por el auto, traemos la lista de activos paginada y buscamos el
      // identifier ahí. Si está → la publicación está viva; si no → no encontrada.
      const testIdentifier = (body as any).chileautosIdentifier;

      if (testIdentifier) {
        const { items, lastStatus } = await fetchAllActiveItems(token, integration.seller_identifier);
        // Si no pudimos leer la lista de activos (401/403/5xx/timeout → lastStatus≠200),
        // NO concluir "no encontrada": sería un falso negativo por un error de lectura.
        if (lastStatus !== 200) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `No se pudo leer la lista de avisos activos de ChileAutos (status ${lastStatus || 'sin respuesta'}). Reintenta en unos minutos; no se concluyó nada sobre este aviso.`,
              last_page_status: lastStatus,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const target = String(testIdentifier).toLowerCase();
        const match = items.find((it: any) => {
          const id = extractActiveItemId(it);
          if (id && id.toLowerCase() === target) return true;
          // red de seguridad: si el identifier viniera anidado o con otro nombre,
          // igual lo cazamos buscándolo en el item serializado.
          try { return JSON.stringify(it).toLowerCase().includes(target); } catch { return false; }
        }) || null;

        return new Response(
          JSON.stringify({
            success: true,
            status: 200,
            exists: !!match,
            found: !!match,
            scanned_active: items.length,
            last_page_status: lastStatus,
            seller_identifier: integration.seller_identifier,
            data: match,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Sin identifier puntual: traer TODOS los activos paginados y reconciliar contra lo local.
      const { items: activeItems, lastStatus: activeStatus } = await fetchAllActiveItems(
        token,
        integration.seller_identifier,
      );
      // GUARD CRÍTICO: si la lectura de activos falló (401/403/5xx/timeout → status≠200),
      // la lista viene vacía/parcial. Calcular "invisibles" sobre eso reportaría TODA la
      // flota como caída (falso positivo) y podría llevar a re-publicar todo (botando
      // galerías). Abortamos con un error claro en vez de devolver una reconciliación falsa.
      if (activeStatus !== 200) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `No se pudo leer la lista de avisos activos de ChileAutos (status ${activeStatus || 'sin respuesta'}). No se calculó la reconciliación para no reportar falsos "invisibles". Reintenta en unos minutos.`,
            active_status: activeStatus,
            scanned_active: activeItems.length,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const activeIds = new Set(
        activeItems.map(extractActiveItemId).filter(Boolean).map((s) => (s as string).toLowerCase()),
      );

      // Also get local listings for comparison
      const { data: localListings } = await supabase
        .from('chileautos_listing')
        .select('id, vehicle_id, chileautos_identifier, status, title, ca_listing_url, last_synced_at')
        .eq('client_id', clientId);

      const published = (localListings || []).filter(
        (l: any) => l.status === 'published' && l.chileautos_identifier,
      );
      const localPublishedIds = new Set(
        published.map((l: any) => String(l.chileautos_identifier).toLowerCase()),
      );

      // INVISIBLES: publicados localmente pero que NO aparecen activos en ChileAutos
      // (deberían estar vivos y no están → publicación caída o nunca indexada).
      const invisibles = published.filter(
        (l: any) => !activeIds.has(String(l.chileautos_identifier).toLowerCase()),
      );
      // ZOMBIES: activos en ChileAutos pero sin registro local publicado
      // (avisos huérfanos que siguen vivos generando leads → candidatos a borrar).
      const zombies = activeItems.filter((it: any) => {
        const id = extractActiveItemId(it);
        return id && !localPublishedIds.has(id.toLowerCase());
      });

      return new Response(
        JSON.stringify({
          success: true,
          seller_identifier: integration.seller_identifier,
          integration_config: {
            default_products: integration.default_products,
            sync_on_publish: integration.sync_on_publish,
            sync_on_update: integration.sync_on_update,
            sync_on_sold: integration.sync_on_sold,
            status: integration.status,
          },
          active_count: activeItems.length,
          active_status: activeStatus,
          active_items: activeItems,
          available_products: productsData,
          local_listings: localListings || [],
          local_count: localListings?.length || 0,
          published_count: published.length,
          reconciliation: {
            invisibles_count: invisibles.length,
            zombies_count: zombies.length,
            invisibles: invisibles.map((l: any) => ({
              vehicle_id: l.vehicle_id,
              identifier: l.chileautos_identifier,
              title: l.title,
            })),
            zombies: zombies.map((it: any) => ({
              identifier: extractActiveItemId(it),
              item: it,
            })),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle delete_orphan - borra un aviso "zombie" directo por su identifier.
    // A diferencia de 'delete' (que necesita una fila local en chileautos_listing),
    // esto sirve para los huérfanos que detecta la reconciliación: avisos que siguen
    // vivos en ChileAutos pero que GoAuto ya no tiene registrados (duplicados de una
    // publicación vieja, autos borrados antes del fix, etc.). El token va server-side.
    if (operation === 'delete_orphan') {
      const orphanId = (body as any).chileautosIdentifier;
      if (!orphanId) {
        return new Response(
          JSON.stringify({ success: false, error: 'chileautosIdentifier es requerido para delete_orphan' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // DELETE idempotente (404 = ya no estaba = OK) con timeout 25s + 1 reintento,
      // mismo patrón que deleteVehicle.
      let response: Response | null = null;
      let lastError = '';
      for (let attempt = 1; attempt <= 2; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        try {
          response = await fetch(`${CA_API_BASE_URL}/v1/vehicles/${orphanId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-seller-identifier': integration.seller_identifier,
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (err: any) {
          clearTimeout(timeoutId);
          response = null;
          lastError = err.name === 'AbortError'
            ? 'ChileAutos no respondió a tiempo (timeout 25s)'
            : err.message;
        }
        if (response && (response.ok || response.status < 500)) break;
        if (attempt === 1) await new Promise((r) => setTimeout(r, 1500));
      }

      if (!response || (!response.ok && response.status !== 404)) {
        const errorText = response ? await response.text() : lastError;
        console.error('[delete_orphan] error:', errorText);
        return new Response(
          JSON.stringify({
            success: false,
            operation: 'delete_orphan',
            identifier: orphanId,
            error: response ? `Error ${response.status}: ${errorText}` : lastError,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Por si quedara una fila local apuntando a ese identifier, la limpiamos.
      await supabase
        .from('chileautos_listing')
        .delete()
        .eq('client_id', clientId)
        .eq('chileautos_identifier', orphanId);

      console.log(`[delete_orphan] borrado ${orphanId} (status ${response?.status}) para client ${clientId}`);
      return new Response(
        JSON.stringify({
          success: true,
          operation: 'delete_orphan',
          identifier: orphanId,
          status: response?.status ?? null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle republish_all - delete and re-create all published vehicles with correct data
    if (operation === 'republish_all') {
      console.log(`[REPUBLISH_ALL] Starting for client ${clientId}...`);

      // Get all existing local listings
      const { data: listings } = await supabase
        .from('chileautos_listing')
        .select('*')
        .eq('client_id', clientId);

      if (!listings || listings.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No hay publicaciones para re-publicar', results: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results: any[] = [];

      for (const listing of listings) {
        try {
          // 1. Delete from ChileAutos API
          console.log(`[REPUBLISH] Deleting ${listing.chileautos_identifier} (vehicle ${listing.vehicle_id})...`);
          const deleteResponse = await fetch(
            `${CA_API_BASE_URL}/v1/vehicles/${listing.chileautos_identifier}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'x-seller-identifier': integration.seller_identifier,
              },
            }
          );
          console.log(`[REPUBLISH] Delete status: ${deleteResponse.status}`);

          // 2. Delete local listing record
          await supabase.from('chileautos_listing').delete().eq('id', listing.id);

          // 3. Get fresh vehicle data
          const { data: vehicle } = await supabase
            .from('vehicles')
            .select(`
              id,
              vehicle_type,
              brand:brands (name),
              model:models (name),
              year,
              price,
              mileage,
              license_plate,
              condition:conditions (name),
              fuel_type:fuel_types (name),
              transmission,
              color:colors (name),
              category:categories (name),
              description,
              main_image,
              gallery,
              version_name,
              discount_percentage
            `)
            .eq('id', listing.vehicle_id)
            .single();

          if (!vehicle) {
            results.push({
              vehicleId: listing.vehicle_id,
              success: false,
              error: 'Vehículo no encontrado en DB',
            });
            continue;
          }

          // 4. Auto-match make/model
          const make = (vehicle as any).brand?.name || '';
          const model = (vehicle as any).model?.name || '';
          const matched = await autoMatchMakeModel(make, model, token);
          if (matched) {
            console.log(`[REPUBLISH] Auto-matched: "${make}" -> "${matched.make}", "${model}" -> "${matched.model}"`);
          }

          // 5. Re-create with all fixes (header, auto-match, body style, transmission)
          const createResult = await createVehicle(
            vehicle as Vehicle,
            integration as ChileautosIntegration,
            token,
            matched || undefined
          );

          results.push(createResult);
          console.log(`[REPUBLISH] Vehicle ${listing.vehicle_id}: ${createResult.success ? 'OK' : createResult.error}`);
        } catch (err: any) {
          results.push({
            vehicleId: listing.vehicle_id,
            success: false,
            error: err.message,
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle auto_publish - tries to auto-match make/model, publishes if match found
    if (operation === 'auto_publish') {
      const idsToPublish = vehicleIds || (vehicleId ? [vehicleId] : []);

      if (idsToPublish.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No se especificaron vehículos' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch all vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select(`
          id,
          brand:brands (name),
          model:models (name),
          year,
          price,
          mileage,
          license_plate,
          condition:conditions (name),
          fuel_type:fuel_types (name),
          transmission,
          color:colors (name),
          category:categories (name),
          description,
          main_image,
          gallery,
          version_name,
          discount_percentage
        `)
        .in('id', idsToPublish);

      if (vehiclesError || !vehicles) {
        return new Response(
          JSON.stringify({ success: false, error: 'Error al obtener vehículos' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results: any[] = [];
      const needsManualSelection: any[] = [];

      for (const vehicle of vehicles) {
        // Skip non-car/truck vehicles
        const autoVType = (vehicle as any).vehicle_type;
        if (autoVType && autoVType !== 'car' && autoVType !== 'truck') {
          results.push({
            success: false,
            vehicleId: vehicle.id,
            error: `Tipo "${autoVType}" no soportado en ChileAutos`,
          });
          continue;
        }

        // Check if already published
        const { data: existingListing } = await supabase
          .from('chileautos_listing')
          .select('id')
          .eq('vehicle_id', vehicle.id)
          .maybeSingle();

        if (existingListing) {
          results.push({
            success: false,
            vehicleId: vehicle.id,
            error: 'Ya está publicado en ChileAutos',
          });
          continue;
        }

        const vehicleMake = vehicle.brand?.name || '';
        const vehicleModel = vehicle.model?.name || '';

        // Try to auto-match
        const matched = await autoMatchMakeModel(vehicleMake, vehicleModel, token);

        if (matched) {
          // Auto-match successful - publish with catalog values
          const result = await createVehicle(
            vehicle as Vehicle,
            integration as ChileautosIntegration,
            token,
            { make: matched.make, model: matched.model }
          );
          results.push(result);
        } else {
          // No match - needs manual selection
          needsManualSelection.push({
            vehicleId: vehicle.id,
            brand_name: vehicleMake,
            model_name: vehicleModel,
            year: vehicle.year,
            price: vehicle.price,
            mileage: vehicle.mileage,
            main_image: vehicle.main_image,
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          results,
          needsManualSelection,
          summary: {
            total: idsToPublish.length,
            published: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            needsManualSelection: needsManualSelection.length,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle bulk sync
    if (operation === 'bulk_sync') {
      const idsToSync = vehicleIds || [];
      const results: SyncResult[] = [];

      // Get all vehicles to sync (status_id is not filtered - we sync all available vehicles)
      let query = supabase
        .from('vehicles')
        .select(`
          id,
          brand:brands (name),
          model:models (name),
          year,
          price,
          mileage,
          license_plate,
          condition:conditions (name),
          fuel_type:fuel_types (name),
          transmission,
          color:colors (name),
          category:categories (name),
          description,
          main_image,
          gallery,
          version_name,
          discount_percentage
        `)
        .eq('client_id', clientId);

      if (idsToSync.length > 0) {
        query = query.in('id', idsToSync);
      }

      const { data: vehicles } = await query;

      for (const vehicle of (vehicles || [])) {
        // Check if already listed
        const { data: existingListing } = await supabase
          .from('chileautos_listing')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .maybeSingle();

        // Auto-match make/model against ChileAutos catalog
        const bulkMake = (vehicle as any).brand?.name || '';
        const bulkModel = (vehicle as any).model?.name || '';
        const bulkMatched = await autoMatchMakeModel(bulkMake, bulkModel, token);

        let result: SyncResult;
        if (existingListing) {
          // NO revivir vendidos/reservados: "Sincronizar todo" recorre TODOS los avisos del
          // cliente, incluidos los ya marcados como vendidos/reservados. Como updateVehicle
          // re-PATCHea el aviso y fuerza status 'published' al final, sincronizarlos los
          // revive en ChileAutos (auto vendido vuelve a aparecer a la venta). Los saltamos:
          // solo refrescamos los que están realmente publicados/en error.
          if (existingListing.status === 'sold' || existingListing.status === 'reserved') {
            result = {
              success: true,
              operation: 'update',
              vehicleId: vehicle.id,
              chileautosIdentifier: existingListing.chileautos_identifier,
              skipped: true,
              message: `Saltado: el aviso está ${existingListing.status === 'sold' ? 'vendido' : 'reservado'} (no se re-publica para no revivirlo).`,
            };
          } else {
            // bulk_sync es la acción manual de "Sincronizar todo" y nuestra herramienta de
            // recuperación de fotos: forzamos el reenvío completo de la galería.
            result = await updateVehicle(
              vehicle as Vehicle,
              integration as ChileautosIntegration,
              existingListing,
              token,
              bulkMatched || undefined,
              { forcePhotos: true }
            );
          }
        } else {
          result = await createVehicle(
            vehicle as Vehicle,
            integration as ChileautosIntegration,
            token,
            bulkMatched || undefined
          );
        }
        results.push(result);
      }

      const bulkResult: BulkSyncResult = {
        total: results.length,
        successful: results.filter(r => r.success && !r.skipped).length,
        failed: results.filter(r => !r.success).length,
        skipped: results.filter(r => r.skipped).length,
        results,
      };

      // Update last sync timestamp
      await supabase
        .from('chileautos_integration')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', integration.id);

      return new Response(JSON.stringify(bulkResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single vehicle operations
    if (!vehicleId) {
      return new Response(
        JSON.stringify({ success: false, error: 'vehicleId es requerido' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get existing listing if any
    const { data: existingListing } = await supabase
      .from('chileautos_listing')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .maybeSingle();

    let result: SyncResult;

    switch (operation) {
      case 'create': {
        // If listing already exists, clean it up and re-create
        // This handles cases where a previous attempt partially succeeded
        if (existingListing) {
          console.log(`[create] Existing listing found for vehicle ${vehicleId}, cleaning up for re-publish`);
          // Try to delete from ChileAutos first
          try {
            await fetch(
              `${CA_API_BASE_URL}/v1/vehicles/${existingListing.chileautos_identifier}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  'x-seller-identifier': (integration as ChileautosIntegration).seller_identifier,
                },
              }
            );
          } catch (e) {
            console.log(`[create] Could not delete old listing from ChileAutos (may not exist):`, e);
          }
          // Delete local record
          await supabase
            .from('chileautos_listing')
            .delete()
            .eq('id', existingListing.id);
          console.log(`[create] Old listing cleaned up, proceeding with fresh create`);
        }

        // Get vehicle data

        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select(`
            id,
            vehicle_type,
            brand:brands (name),
            model:models (name),
            year,
            price,
            mileage,
            license_plate,
            condition:conditions (name),
            fuel_type:fuel_types (name),
            transmission,
            color:colors (name),
            category:categories (name),
            description,
            main_image,
            gallery,
            version_name,
            discount_percentage
          `)
          .eq('id', vehicleId)
          .single();

        if (vehicleError || !vehicle) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Vehículo no encontrado: ${vehicleError?.message || 'no data'}`,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Guard: only car/truck types can be published to ChileAutos
        const vType = (vehicle as any).vehicle_type;
        if (vType && vType !== 'car' && vType !== 'truck') {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Los vehículos de tipo "${vType}" no se pueden publicar en ChileAutos. Solo autos y camiones son soportados.`,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Auto-match make/model against ChileAutos catalog if no overrides
        let overrides = body.overrides;
        if (!overrides) {
          const vehicleMake = (vehicle as any).brand?.name || '';
          const vehicleModel = (vehicle as any).model?.name || '';
          const matched = await autoMatchMakeModel(vehicleMake, vehicleModel, token);
          if (matched) overrides = matched;
        }

        result = await createVehicle(
          vehicle as Vehicle,
          integration as ChileautosIntegration,
          token,
          overrides
        );
        break;
      }

      case 'update': {
        if (!existingListing) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'El vehículo no está publicado en ChileAutos',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Get vehicle data
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select(`
            id,
            brand:brands (name),
            model:models (name),
            year,
            price,
            mileage,
            license_plate,
            condition:conditions (name),
            fuel_type:fuel_types (name),
            transmission,
            color:colors (name),
            category:categories (name),
            description,
            main_image,
            gallery,
            version_name,
            discount_percentage
          `)
          .eq('id', vehicleId)
          .single();

        if (!vehicle) {
          return new Response(
            JSON.stringify({ success: false, error: 'Vehículo no encontrado' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Guard: only car/truck types can be synced to ChileAutos
        const updateVType = (vehicle as any).vehicle_type;
        if (updateVType && updateVType !== 'car' && updateVType !== 'truck') {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Los vehículos de tipo "${updateVType}" no se pueden sincronizar con ChileAutos.`,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Auto-match make/model against ChileAutos catalog
        const updateMake = (vehicle as any).brand?.name || '';
        const updateModel = (vehicle as any).model?.name || '';
        const updateMatched = await autoMatchMakeModel(updateMake, updateModel, token);

        // Mergeamos los overrides explícitos del request (title/badge/description/price)
        // sobre el make/model auto-matcheado. Antes el update IGNORABA body.overrides y
        // solo pasaba el auto-match, así que editar título/precio desde el front no surtía
        // efecto en ChileAutos. El sync_on_update normal NO manda body.overrides => acá
        // updateOverrides queda igual al auto-match (mismo comportamiento que hoy).
        // Nota: en un update, updateVehicle REGENERA el título con el formato canónico
        // (#879: Año Marca Modelo Versión). Si viene body.overrides.title (modal "Editar"),
        // ese gana; si no, se usa el autoTitle regenerado (ya no se preserva listing.title).
        const updateOverrides =
          updateMatched || body.overrides
            ? { ...(updateMatched || {}), ...(body.overrides || {}) }
            : undefined;

        result = await updateVehicle(
          vehicle as Vehicle,
          integration as ChileautosIntegration,
          existingListing,
          token,
          updateOverrides,
          { skipPhotos: body.skipPhotos === true }
        );
        break;
      }

      case 'delete': {
        if (!existingListing) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'El vehículo no está publicado en ChileAutos',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        result = await deleteVehicle(
          vehicleId,
          integration as ChileautosIntegration,
          existingListing,
          token
        );
        break;
      }

      case 'mark_sold': {
        if (!existingListing) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'El vehículo no está publicado en ChileAutos',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        result = await markVehicleSold(
          vehicleId,
          integration as ChileautosIntegration,
          existingListing,
          token
        );
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Operación no válida' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled error in ChileAutos sync:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error interno del servidor',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
