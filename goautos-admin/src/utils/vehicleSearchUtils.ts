import { Vehicle } from '@/types/vehicle';

/**
 * Multi-token vehicle search — "EL MEJOR BUSCADOR DEL MUNDO"
 *
 * Splits the search input into individual words (tokens) and checks that
 * ALL tokens match at least one vehicle field (AND logic between words).
 * Each token can match in a different field.
 *
 * Searches across: patente, ID, año, km, precio (formateado), transmisión,
 * marca, modelo, categoría, color, condición, combustible, estado,
 * etiqueta, descripción, extras, vendedor, días en stock,
 * consignado/propio, publicado/no publicado, motor, chasis, dueños, llaves.
 *
 * Features:
 * - Accent-insensitive: "automático" matches "automatico"
 * - Smart keywords: "consignado", "propio", "publicado"
 * - Days in stock: "45 dias" matches vehicles with 45 days in stock
 * - Formatted price: "12.990" matches price 12990000
 *
 * Example: "toyota 2024 rojo consignado" →
 *   "toyota" matches brand AND "2024" matches year AND
 *   "rojo" matches color AND "consignado" matches consignment status
 */
export function filterVehiclesBySearch(
  vehicles: Vehicle[],
  searchTerm: string | undefined
): Vehicle[] {
  if (!searchTerm || !searchTerm.trim()) return vehicles;

  const tokens = normalize(searchTerm)
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return vehicles;

  return vehicles.filter((vehicle) => {
    const fields = buildSearchableFields(vehicle);
    return tokens.every((token) =>
      fields.some((field) => field.includes(token))
    );
  });
}

/** Strip accents and lowercase */
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildSearchableFields(vehicle: Vehicle): string[] {
  const daysInStock = vehicle.created_at
    ? Math.floor(
        (Date.now() - new Date(vehicle.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const fields: string[] = [
    // Core identifiers
    vehicle.license_plate || '',
    vehicle.id?.toString() || '',

    // Specs
    vehicle.year?.toString() || '',
    vehicle.mileage?.toString() || '',
    vehicle.transmission || '',
    vehicle.owners?.toString() || '',
    vehicle.keys?.toString() || '',
    vehicle.engine_number || '',
    vehicle.chassis_number || '',

    // Price — raw and formatted (Chilean: dots as thousands separator)
    vehicle.price?.toString() || '',
    vehicle.price ? formatPrice(vehicle.price) : '',
    vehicle.purchase_price?.toString() || '',
    vehicle.purchase_price ? formatPrice(vehicle.purchase_price) : '',

    // Relations
    vehicle.brand?.name || '',
    vehicle.model?.name || '',
    vehicle.version_name || '',
    vehicle.category?.name || '',
    vehicle.color?.name || '',
    vehicle.condition?.name || '',
    vehicle.fuel_type?.name || '',
    vehicle.status?.name || '',

    // Text fields
    vehicle.label || '',
    vehicle.description || '',
    vehicle.extras || '',

    // Seller full name
    vehicle.seller
      ? `${vehicle.seller.first_name || ''} ${vehicle.seller.last_name || ''}`
      : '',

    // Days in stock — searchable as "X dias" and just the number
    ...(daysInStock !== null
      ? [
          `${daysInStock}`,
          `${daysInStock} dias`,
          `${daysInStock} dias en stock`,
          `${daysInStock}d`,
        ]
      : []),

    // Boolean keywords — consignment
    vehicle.is_consigned === true ? 'consignado consignacion' : '',
    vehicle.is_consigned === false ? 'propio no consignado' : '',

    // Boolean keywords — published
    vehicle.is_published === true ? 'publicado' : '',
    vehicle.is_published === false ? 'no publicado sin publicar' : '',

    // Boolean keywords — lien
    vehicle.has_lien === true ? 'con prenda prenda' : '',
    vehicle.has_lien === false ? 'sin prenda' : '',

    // Boolean keywords — billable
    vehicle.is_billable === true ? 'facturable con factura' : '',
    vehicle.is_billable === false ? 'no facturable sin factura' : '',
  ];

  return fields.map((f) => normalize(f));
}

/** Format number with dots as thousands separator (Chilean format) */
function formatPrice(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
