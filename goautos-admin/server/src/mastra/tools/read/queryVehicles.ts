import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const queryVehiclesTool = createTool({
  id: 'query_vehicles',
  description:
    'Buscar vehículos en la base de datos. IMPORTANTE: Siempre usar exclude_sold=true a menos que el usuario pida explícitamente ver vehículos vendidos. Para inventario, stock, autos publicados, o cualquier consulta de vehículos disponibles, SIEMPRE exclude_sold=true.',
  inputSchema: z.object({
    id: z.number().optional().describe('ID exacto del vehículo'),
    brand: z.string().optional().describe('Nombre de la marca'),
    model: z.string().optional().describe('Nombre del modelo'),
    year: z.number().optional().describe('Año exacto'),
    year_min: z.number().optional().describe('Año mínimo'),
    year_max: z.number().optional().describe('Año máximo'),
    status: z.string().optional().describe('Nombre del estado del vehículo para filtrar (ej: "Publicado", "Preparación", "Revisión Mecánica", "Listo para la foto"). Para buscar autos publicados, usar status="Publicado". NO usar is_published.'),
    exclude_sold: z.boolean().default(true).describe('Excluir vendidos, reservados y archivados. Default true. Solo poner false si el usuario pide explícitamente ver vendidos.'),
    price_min: z.number().optional().describe('Precio mínimo'),
    price_max: z.number().optional().describe('Precio máximo'),
    license_plate: z.string().optional().describe('Patente'),
    is_consigned: z.boolean().optional().describe('Es consignado'),
    seller_id: z.string().optional().describe('ID del vendedor'),
    include_details: z
      .boolean()
      .optional()
      .describe('Incluir compras, extras, documentos, consignaciones'),
    limit: z.number().default(50).describe('Límite de resultados'),
    order_by: z
      .enum(['created_at', 'price', 'year', 'updated_at'])
      .default('created_at')
      .describe('Campo para ordenar'),
    order_direction: z
      .enum(['asc', 'desc'])
      .default('desc')
      .describe('Dirección del orden'),
  }),
  execute: async (params: any) => {
    const input = params.context || {};
    const clientId = params.runtimeContext.get("clientId");
    const excludeSold = input.exclude_sold !== false; // Default TRUE unless explicitly false

    let query = supabaseAdmin
      .from('vehicles')
      .select(
        `*, category:category_id(name), status:status_id(name, color, order),
        brand:brand_id(name), model:model_id(name), color:color_id(name),
        condition:condition_id(name), fuel_type:fuel_type_id(name),
        seller:seller_id(id, first_name, last_name)`
      )
      .eq('client_id', clientId)
      .eq('show_in_stock', true);

    if (input.id) query = query.eq('id', input.id);
    if (input.year) query = query.eq('year', input.year);
    if (input.year_min) query = query.gte('year', input.year_min);
    if (input.year_max) query = query.lte('year', input.year_max);
    if (input.price_min) query = query.gte('price', input.price_min);
    if (input.price_max) query = query.lte('price', input.price_max);
    if (input.license_plate)
      query = query.ilike('license_plate', `%${input.license_plate}%`);
    if (input.is_consigned !== undefined)
      query = query.eq('is_consigned', input.is_consigned);
    if (input.seller_id) query = query.eq('seller_id', input.seller_id);

    const orderBy = input.order_by || 'created_at';
    const ascending = input.order_direction === 'asc';
    query = query.order(orderBy, { ascending });

    // Always fetch enough to cover post-filtering
    query = query.limit(500);

    const { data, error } = await query;

    if (error) return JSON.stringify({ error: error.message });

    let vehicles = data || [];

    // Post-filter by brand, model, status (joined tables)
    if (input.brand) {
      vehicles = vehicles.filter(
        (v: any) =>
          v.brand?.name?.toLowerCase().includes(input.brand!.toLowerCase())
      );
    }
    if (input.model) {
      vehicles = vehicles.filter(
        (v: any) =>
          v.model?.name?.toLowerCase().includes(input.model!.toLowerCase())
      );
    }
    if (input.status) {
      vehicles = vehicles.filter(
        (v: any) =>
          v.status?.name?.toLowerCase().includes(input.status!.toLowerCase())
      );
    }

    if (excludeSold) {
      const excluded = ['vendido', 'sold', 'reservado', 'reserved', 'archivado', 'archived'];
      vehicles = vehicles.filter((v: any) => {
        const statusName = (v.status?.name || '').toLowerCase();
        return statusName && !excluded.some(s => statusName.includes(s));
      });
    }

    // Apply final limit
    const limit = Math.min(input.limit || 50, 100);
    vehicles = vehicles.slice(0, limit);

    // Calculate days_in_stock
    vehicles = vehicles.map((v: any) => ({
      ...v,
      days_in_stock: Math.floor(
        (Date.now() - new Date(v.created_at).getTime()) / 86400000
      ),
    }));

    // If include_details, fetch related data
    if (input.include_details && vehicles.length > 0) {
      const vehicleIds = vehicles.map((v: any) => v.id);

      const [purchases, extras, documents, consignments] = await Promise.all([
        supabaseAdmin
          .from('vehicles_purchases')
          .select('*')
          .in('vehicle_id', vehicleIds),
        supabaseAdmin
          .from('vehicles_extras')
          .select('*')
          .in('vehicle_id', vehicleIds),
        supabaseAdmin
          .from('vehicles_documents')
          .select('*')
          .in('vehicle_id', vehicleIds),
        supabaseAdmin
          .from('vehicles_consignments')
          .select('*')
          .in('vehicle_id', vehicleIds),
      ]);

      vehicles = vehicles.map((v: any) => ({
        ...v,
        purchases: (purchases.data || []).filter(
          (p: any) => p.vehicle_id === v.id
        ),
        extras: (extras.data || []).filter((e: any) => e.vehicle_id === v.id),
        documents: (documents.data || []).filter(
          (d: any) => d.vehicle_id === v.id
        ),
        consignments: (consignments.data || []).filter(
          (c: any) => c.vehicle_id === v.id
        ),
      }));
    }

    return JSON.stringify({ count: vehicles.length, vehicles });
  },
});
