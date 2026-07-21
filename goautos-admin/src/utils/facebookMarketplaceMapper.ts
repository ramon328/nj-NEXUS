import { Vehicle } from '@/types/vehicle';
import { FbProductData } from '@/types/facebookMarketplace';

/**
 * Maps body style/category to Facebook's body_style enum
 */
export function mapBodyStyle(category: string | undefined | null): string {
  if (!category) return 'OTHER';

  const bodyStyleMap: Record<string, string> = {
    'Sedan': 'SEDAN',
    'Sedán': 'SEDAN',
    'SUV': 'SUV',
    'Camioneta': 'TRUCK',
    'Pickup': 'TRUCK',
    'Pick-up': 'TRUCK',
    'Hatchback': 'HATCHBACK',
    'Coupe': 'COUPE',
    'Coupé': 'COUPE',
    'Convertible': 'CONVERTIBLE',
    'Cabriolet': 'CONVERTIBLE',
    'Van': 'VAN',
    'Minivan': 'MINIVAN',
    'Wagon': 'STATION_WAGON',
    'Station Wagon': 'STATION_WAGON',
    'Crossover': 'CROSSOVER',
    'Deportivo': 'COUPE',
  };

  // Try exact match first
  if (bodyStyleMap[category]) {
    return bodyStyleMap[category];
  }

  // Try case-insensitive match
  const lowerCategory = category.toLowerCase();
  for (const [key, value] of Object.entries(bodyStyleMap)) {
    if (key.toLowerCase() === lowerCategory) {
      return value;
    }
  }

  return 'OTHER';
}

/**
 * Maps fuel type to Facebook's fuel_type enum
 */
export function mapFuelType(fuelType: string | undefined | null): string {
  if (!fuelType) return 'GASOLINE';

  const fuelMap: Record<string, string> = {
    'Bencina': 'GASOLINE',
    'Gasolina': 'GASOLINE',
    'Nafta': 'GASOLINE',
    'Diesel': 'DIESEL',
    'Diésel': 'DIESEL',
    'Petróleo': 'DIESEL',
    'Eléctrico': 'ELECTRIC',
    'Electrico': 'ELECTRIC',
    'Híbrido': 'HYBRID',
    'Hibrido': 'HYBRID',
    'GNC': 'FLEX',
    'GLP': 'FLEX',
    'Gas': 'FLEX',
    'Flex': 'FLEX',
  };

  // Try exact match first
  if (fuelMap[fuelType]) {
    return fuelMap[fuelType];
  }

  // Try case-insensitive match
  const lowerFuel = fuelType.toLowerCase();
  for (const [key, value] of Object.entries(fuelMap)) {
    if (key.toLowerCase() === lowerFuel) {
      return value;
    }
  }

  return 'GASOLINE';
}

/**
 * Maps transmission to Facebook's transmission enum
 */
export function mapTransmission(transmission: string | undefined | null): string {
  if (!transmission) return 'AUTOMATIC';

  const transMap: Record<string, string> = {
    'Automática': 'AUTOMATIC',
    'Automatica': 'AUTOMATIC',
    'Automático': 'AUTOMATIC',
    'Automatico': 'AUTOMATIC',
    'Auto': 'AUTOMATIC',
    'Manual': 'MANUAL',
    'Mecánica': 'MANUAL',
    'Mecanica': 'MANUAL',
    'CVT': 'AUTOMATIC',
    'Semiautomática': 'AUTOMATIC',
    'Semiautomatica': 'AUTOMATIC',
    'Secuencial': 'AUTOMATIC',
    'Tiptronic': 'AUTOMATIC',
    'DSG': 'AUTOMATIC',
    'PDK': 'AUTOMATIC',
  };

  // Try exact match first
  if (transMap[transmission]) {
    return transMap[transmission];
  }

  // Try case-insensitive match
  const lowerTrans = transmission.toLowerCase();
  for (const [key, value] of Object.entries(transMap)) {
    if (key.toLowerCase() === lowerTrans) {
      return value;
    }
  }

  // Check for keywords
  if (lowerTrans.includes('manual') || lowerTrans.includes('mecanic')) {
    return 'MANUAL';
  }

  return 'AUTOMATIC';
}

/**
 * Maps condition to Facebook's condition enum
 */
export function mapCondition(condition: string | undefined | null): 'new' | 'used' | 'refurbished' {
  if (!condition) return 'used';

  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('nuevo') || lowerCondition.includes('new') || lowerCondition === '0km') {
    return 'new';
  }

  if (lowerCondition.includes('certificado') || lowerCondition.includes('certified')) {
    return 'refurbished';
  }

  return 'used';
}

/**
 * Builds a default description for a vehicle
 */
export function buildDefaultDescription(vehicle: Vehicle): string {
  const parts: string[] = [];

  const brandName = vehicle.brand?.name || vehicle.brand_name || '';
  const modelName = vehicle.model?.name || vehicle.model_name || '';

  if (brandName && modelName && vehicle.year) {
    parts.push(`${brandName} ${modelName} ${vehicle.year}`);
  }

  if (vehicle.mileage) {
    parts.push(`${vehicle.mileage.toLocaleString('es-CL')} km`);
  }

  if (vehicle.transmission) {
    parts.push(`Transmisión ${vehicle.transmission}`);
  }

  if (vehicle.fuel_type?.name) {
    parts.push(`Combustible: ${vehicle.fuel_type.name}`);
  }

  if (vehicle.color?.name) {
    parts.push(`Color: ${vehicle.color.name}`);
  }

  if (vehicle.description) {
    parts.push(vehicle.description);
  }

  return parts.join('\n');
}

/**
 * Configuration for vehicle mapping
 */
export interface FbMappingConfig {
  landingUrlTemplate: string;
  defaultCity: string;
  defaultRegion: string;
  defaultPostalCode: string;
}

const DEFAULT_CONFIG: FbMappingConfig = {
  landingUrlTemplate: 'https://portal.goauto.cl/vehiculos/{id}',
  defaultCity: 'Santiago',
  defaultRegion: 'RM',
  defaultPostalCode: '7500000',
};

/**
 * Maps a Vehicle object to Facebook Catalog Product format
 */
export function mapVehicleToFacebookFormat(
  vehicle: Vehicle,
  config: Partial<FbMappingConfig> = {}
): FbProductData {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const brandName = vehicle.brand?.name || vehicle.brand_name || 'Desconocido';
  const modelName = vehicle.model?.name || vehicle.model_name || 'Desconocido';
  const categoryName = vehicle.category?.name;
  const conditionName = vehicle.condition?.name;
  const fuelTypeName = vehicle.fuel_type?.name;
  const colorName = vehicle.color?.name;

  // Build retailer_id - prefer VIN if available
  const retailerId = vehicle.chassis_number || `goautos-${vehicle.id}`;

  // Build title
  const title = `${vehicle.year || ''} ${brandName} ${modelName}`.trim();

  // Build description
  const description = vehicle.description || buildDefaultDescription(vehicle);

  // Build landing URL
  const url = finalConfig.landingUrlTemplate.replace('{id}', String(vehicle.id || ''));

  // Prepare gallery images (max 10, first 9 as additional)
  const additionalImages = (vehicle.gallery || [])
    .filter((img): img is string => !!img)
    .slice(0, 9);

  const productData: FbProductData = {
    retailer_id: retailerId,
    availability: 'in stock',
    condition: mapCondition(conditionName),
    description: description.substring(0, 5000), // Facebook limit

    // Images
    image_url: vehicle.main_image || '',
    additional_image_urls: additionalImages.length > 0 ? additionalImages.join(',') : undefined,

    // Pricing
    price: `${vehicle.price || 0} CLP`,
    sale_price: vehicle.discount_percentage
      ? `${Math.round((vehicle.price || 0) * (1 - vehicle.discount_percentage / 100))} CLP`
      : undefined,

    // Vehicle-specific fields
    make: brandName,
    model: modelName,
    year: vehicle.year || new Date().getFullYear(),
    mileage: {
      value: vehicle.mileage || 0,
      unit: 'KM',
    },
    vin: vehicle.chassis_number || undefined,
    body_style: mapBodyStyle(categoryName),
    drivetrain: 'FWD', // Default - not available in our data
    exterior_color: colorName || undefined,
    fuel_type: mapFuelType(fuelTypeName),
    transmission: mapTransmission(vehicle.transmission),
    state_of_vehicle: mapCondition(conditionName) === 'new' ? 'NEW' : 'USED',

    // Listing info
    title,
    url,

    // Location - would be populated from dealership data if available
    address: {
      addr1: '',
      city: finalConfig.defaultCity,
      region: finalConfig.defaultRegion,
      postal_code: finalConfig.defaultPostalCode,
      country: 'CL',
    },
  };

  return productData;
}

/**
 * Formats price for display
 */
export function formatPrice(price: number | null | undefined): string {
  if (!price) return '$0';
  return `$${price.toLocaleString('es-CL')}`;
}

/**
 * Formats mileage for display
 */
export function formatMileage(mileage: number | null | undefined): string {
  if (!mileage) return '0 km';
  return `${mileage.toLocaleString('es-CL')} km`;
}

/**
 * Gets status badge color for FB Marketplace post status
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    paused: 'bg-gray-100 text-gray-800',
    deleted: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-orange-100 text-orange-800',
    out_of_stock: 'bg-gray-100 text-gray-800',
  };

  return statusColors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Gets human-readable status label
 */
export function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    active: 'Activo',
    pending: 'Pendiente',
    paused: 'Pausado',
    deleted: 'Eliminado',
    rejected: 'Rechazado',
    expired: 'Expirado',
    out_of_stock: 'Sin stock',
  };

  return statusLabels[status] || status;
}
