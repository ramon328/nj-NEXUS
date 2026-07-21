import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";
const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")
});
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
// Helper: Calculate days between dates
const toDays = (ms)=>Math.floor(ms / (1000 * 60 * 60 * 24));

// =================================================================
// TOOL DEFINITIONS FOR OPENAI FUNCTION CALLING
// =================================================================
const toolDefinitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "query_vehicles",
      description: "Buscar vehículos en la base de datos con filtros específicos. Usar para preguntas sobre vehículos específicos, búsquedas por patente, marca, modelo, precio, estado, etc.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "ID exacto del vehículo" },
          brand: { type: "string", description: "Nombre de la marca (ej: Toyota, Hyundai)" },
          model: { type: "string", description: "Nombre del modelo (ej: Corolla, Tucson)" },
          year: { type: "number", description: "Año del vehículo" },
          year_min: { type: "number", description: "Año mínimo" },
          year_max: { type: "number", description: "Año máximo" },
          status: { type: "string", description: "Estado del vehículo (nombre del estado configurado por la automotora)" },
          price_min: { type: "number", description: "Precio mínimo" },
          price_max: { type: "number", description: "Precio máximo" },
          license_plate: { type: "string", description: "Patente/placa del vehículo" },
          is_consigned: { type: "boolean", description: "Si es vehículo en consignación" },
          is_published: { type: "boolean", description: "Si está publicado en la web" },
          seller_id: { type: "string", description: "ID del vendedor asignado" },
          include_details: { type: "boolean", description: "Incluir detalles extendidos: compras, extras, documentos, consignaciones" },
          limit: { type: "number", description: "Máximo de resultados (default 10, max 50)" },
          order_by: { type: "string", enum: ["created_at", "price", "year", "updated_at"], description: "Campo para ordenar" },
          order_direction: { type: "string", enum: ["asc", "desc"], description: "Dirección del orden" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_leads",
      description: "Buscar leads/prospectos en la base de datos. Usar para preguntas sobre leads específicos, último lead, leads por estado, tipo o cliente.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "ID exacto del lead" },
          status: { type: "string", enum: ["pending", "assigned", "completed", "cancelled"], description: "Estado del lead" },
          type: { type: "string", enum: ["buy-direct", "buy-consignment", "search-request", "sell-vehicle", "sell-financing", "sell-transfer", "contact-general"], description: "Tipo de lead" },
          category: { type: "string", enum: ["buy", "sell"], description: "Categoría general: 'buy' (compra) o 'sell' (venta)" },
          customer_name: { type: "string", description: "Nombre del cliente asociado al lead (búsqueda parcial)" },
          date_from: { type: "string", description: "Fecha desde (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Fecha hasta (YYYY-MM-DD)" },
          limit: { type: "number", description: "Máximo de resultados (default 10, max 50)" },
          order_by: { type: "string", enum: ["created_at", "updated_at"], description: "Campo para ordenar" },
          order_direction: { type: "string", enum: ["asc", "desc"], description: "Dirección del orden" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_customers",
      description: "Buscar clientes en la base de datos. Usar para preguntas sobre clientes específicos, búsquedas por nombre, email, teléfono o RUT.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "ID exacto del cliente" },
          name: { type: "string", description: "Nombre del cliente (búsqueda parcial en first_name y last_name)" },
          email: { type: "string", description: "Email del cliente (búsqueda parcial)" },
          phone: { type: "string", description: "Teléfono del cliente (búsqueda parcial)" },
          rut: { type: "string", description: "RUT del cliente (búsqueda parcial)" },
          limit: { type: "number", description: "Máximo de resultados (default 10, max 50)" },
          order_by: { type: "string", enum: ["created_at", "first_name", "last_name"], description: "Campo para ordenar" },
          order_direction: { type: "string", enum: ["asc", "desc"], description: "Dirección del orden" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_sales",
      description: "Buscar ventas en la base de datos. Usar para preguntas sobre ventas específicas, últimas ventas, ventas por vendedor, fecha o estado.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "ID exacto de la venta" },
          seller_id: { type: "string", description: "ID del vendedor" },
          status: { type: "string", enum: ["pending", "approved"], description: "Estado de la venta" },
          customer_name: { type: "string", description: "Nombre del cliente comprador (búsqueda parcial)" },
          date_from: { type: "string", description: "Fecha desde (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Fecha hasta (YYYY-MM-DD)" },
          payment_method: { type: "string", description: "Método de pago (cash, transfer, financing)" },
          limit: { type: "number", description: "Máximo de resultados (default 10, max 50)" },
          order_by: { type: "string", enum: ["sale_date", "sale_price", "created_at"], description: "Campo para ordenar" },
          order_direction: { type: "string", enum: ["asc", "desc"], description: "Dirección del orden" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_financing",
      description: "Buscar financiamientos en la base de datos. Usar para preguntas sobre financiamientos activos, cuotas, pagos pendientes.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "ID exacto del financiamiento" },
          customer_id: { type: "number", description: "ID del cliente" },
          vehicle_id: { type: "number", description: "ID del vehículo" },
          include_payments: { type: "boolean", description: "Incluir detalle de cuotas/pagos" },
          limit: { type: "number", description: "Máximo de resultados (default 10, max 50)" },
          order_by: { type: "string", enum: ["created_at", "start_date"], description: "Campo para ordenar" },
          order_direction: { type: "string", enum: ["asc", "desc"], description: "Dirección del orden" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_team",
      description: "Buscar información del equipo de trabajo: usuarios, roles, permisos y comisiones. Usar para preguntas sobre vendedores, admins, roles, permisos configurados, tiers de comisiones y splits de comisión.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID exacto del usuario (UUID)" },
          name: { type: "string", description: "Nombre del usuario (búsqueda parcial)" },
          email: { type: "string", description: "Email del usuario (búsqueda parcial)" },
          role: { type: "string", description: "Rol del usuario: admin, seller, superadmin" },
          include_permissions: { type: "boolean", description: "Incluir permisos detallados de cada rol" },
          include_commissions: { type: "boolean", description: "Incluir tiers de comisiones y splits de comisión" },
          limit: { type: "number", description: "Máximo de resultados (default 10, max 50)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_documents",
      description: "Buscar documentos, cotizaciones, reservas y cierres de negocio. Usar para preguntas sobre cotizaciones pendientes, documentos generados, reservas activas, plantillas de documentos configuradas.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["documents", "quotations", "reservations", "close_deals", "templates"], description: "Tipo de documento a buscar" },
          id: { type: "number", description: "ID exacto del documento" },
          vehicle_id: { type: "number", description: "ID del vehículo asociado" },
          customer_id: { type: "number", description: "ID del cliente asociado" },
          status: { type: "string", description: "Estado del documento (ej: pending, approved, cancelled)" },
          date_from: { type: "string", description: "Fecha desde (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Fecha hasta (YYYY-MM-DD)" },
          limit: { type: "number", description: "Máximo de resultados (default 10, max 50)" },
          order_by: { type: "string", enum: ["created_at", "updated_at"], description: "Campo para ordenar" },
          order_direction: { type: "string", enum: ["asc", "desc"], description: "Dirección del orden" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_appointments",
      description: "Buscar agendamientos y citas. Usar para preguntas sobre citas de hoy, mañana, esta semana, próximos test drives, agendamientos por estado.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "ID exacto de la cita" },
          date_from: { type: "string", description: "Fecha desde (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Fecha hasta (YYYY-MM-DD)" },
          status: { type: "string", description: "Estado de la cita (ej: pending, confirmed, completed, cancelled)" },
          vehicle_id: { type: "number", description: "ID del vehículo asociado" },
          customer_name: { type: "string", description: "Nombre del cliente (búsqueda parcial)" },
          limit: { type: "number", description: "Máximo de resultados (default 10, max 50)" },
          order_by: { type: "string", enum: ["created_at", "appointment_date", "date"], description: "Campo para ordenar" },
          order_direction: { type: "string", enum: ["asc", "desc"], description: "Dirección del orden" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_marketing",
      description: "Buscar información de integraciones de marketing: Instagram, MercadoLibre, Facebook Marketplace, ChileAutos, emails. Usar para preguntas sobre conexiones activas, publicaciones, autos publicados en plataformas, historial de emails.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["instagram", "mercadolibre", "facebook", "chileautos", "emails"], description: "Plataforma de marketing a consultar" },
          vehicle_id: { type: "number", description: "ID del vehículo para ver sus publicaciones" },
          status: { type: "string", description: "Estado de la publicación (ej: active, paused, error)" },
          date_from: { type: "string", description: "Fecha desde (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Fecha hasta (YYYY-MM-DD)" },
          limit: { type: "number", description: "Máximo de resultados (default 10, max 50)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_expenses",
      description: "Buscar gastos fijos mensuales, gastos de vehículos (extras tipo expense) y categorías de transacciones. Usar para preguntas sobre gastos fijos, gastos por vehículo, categorías de gastos configuradas.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["fixed", "vehicle_extras", "categories"], description: "Tipo de gasto: fixed=gastos fijos mensuales, vehicle_extras=gastos asociados a vehículos, categories=categorías de transacciones" },
          vehicle_id: { type: "number", description: "ID del vehículo (solo para vehicle_extras)" },
          is_active: { type: "boolean", description: "Filtrar solo gastos activos (default true para fixed)" },
          category: { type: "string", description: "Categoría del gasto (búsqueda parcial)" },
          date_from: { type: "string", description: "Fecha desde (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Fecha hasta (YYYY-MM-DD)" },
          limit: { type: "number", description: "Máximo de resultados (default 10, max 50)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_config",
      description: "Buscar configuraciones del sistema: info legal, sucursales, estados de vehículos, checklist, config del sitio web, marcas, modelos, colores, condiciones, tipos de combustible, categorías, tiers de comisiones. Usar para preguntas sobre configuración de la automotora.",
      parameters: {
        type: "object",
        properties: {
          entity: { type: "string", enum: ["legal_info", "dealerships", "states", "checklist", "website", "brands", "models", "colors", "conditions", "fuel_types", "categories", "commission_tiers"], description: "Entidad de configuración a consultar" },
          limit: { type: "number", description: "Máximo de resultados (default 50, max 50)" }
        },
        required: ["entity"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Crear una tarea en el sistema. Usar cuando el usuario pida crear, agregar o registrar una tarea, recordatorio o pendiente. Ejemplos: 'crea una tarea para llamar a Juan mañana', 'agrégame un recordatorio para revisar el inventario el viernes'.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título de la tarea (corto y descriptivo)" },
          description: { type: "string", description: "Descripción detallada opcional" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Prioridad de la tarea (default: medium)" },
          due_date: { type: "string", description: "Fecha límite en formato ISO 8601 (ej: 2026-04-17T10:00:00). Calcular fecha relativa si el usuario dice 'mañana', 'el viernes', etc." },
          category: { type: "string", description: "Categoría de la tarea (ej: llamada, seguimiento, administrativo, marketing, etc.)" },
          vehicle_id: { type: "number", description: "ID del vehículo relacionado (opcional)" },
          assigned_to_user_id: { type: "number", description: "ID del usuario al que se asigna (opcional)" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "appraise_vehicle",
      description: "Tasar un vehículo buscando publicaciones reales en el mercado chileno (Chileautos, Yapo, Kavak, etc.) y calculando el rango de precio de mercado. Usar cuando el usuario pregunta por el valor de mercado, precio de un auto, cuánto vale un vehículo, tasación, o comparación de precios.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Descripción del vehículo a tasar. Incluir marca, modelo, año y kilometraje si se conocen. Ej: 'Toyota Corolla 2020 80000km', 'Nissan Versa automático 2022'" }
        },
        required: ["query"]
      }
    }
  }
];

// =================================================================
// TOOL HANDLERS - Execute Supabase queries per tool
// =================================================================
async function handleToolCall(toolName: string, args: any, clientId: number): Promise<string> {
  const limit = Math.min(args.limit || 10, 50);
  const orderDir = args.order_direction === "asc" ? { ascending: true } : { ascending: false };

  try {
    switch (toolName) {
      case "query_vehicles": {
        let query = supabase.from("vehicles").select(`
          *,
          category:category_id(name),
          status:status_id(name, color, order),
          brand:brand_id(name),
          model:model_id(name),
          color:color_id(name),
          condition:condition_id(name),
          fuel_type:fuel_type_id(name),
          seller:seller_id(id, first_name, last_name)
        `).eq("client_id", clientId);

        if (args.id) query = query.eq("id", args.id);
        if (args.year) query = query.eq("year", args.year);
        if (args.year_min) query = query.gte("year", args.year_min);
        if (args.year_max) query = query.lte("year", args.year_max);
        if (args.price_min) query = query.gte("price", args.price_min);
        if (args.price_max) query = query.lte("price", args.price_max);
        if (args.license_plate) query = query.ilike("license_plate", `%${args.license_plate}%`);
        if (args.is_consigned !== undefined) query = query.eq("is_consigned", args.is_consigned);
        if (args.is_published !== undefined) query = query.eq("is_published", args.is_published);
        if (args.seller_id) query = query.eq("seller_id", args.seller_id);

        const orderField = args.order_by || "created_at";
        query = query.order(orderField, orderDir).limit(limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        // Post-filter by brand/model/status name (these are in joined tables)
        let results = data || [];
        if (args.brand) {
          const brandLower = args.brand.toLowerCase();
          results = results.filter((v: any) => v.brand?.name?.toLowerCase().includes(brandLower));
        }
        if (args.model) {
          const modelLower = args.model.toLowerCase();
          results = results.filter((v: any) => v.model?.name?.toLowerCase().includes(modelLower));
        }
        if (args.status) {
          const statusLower = args.status.toLowerCase();
          results = results.filter((v: any) => v.status?.name?.toLowerCase().includes(statusLower));
        }

        // If include_details, fetch extra data for the found vehicles
        if (args.include_details && results.length > 0) {
          const vehicleIds = results.map((v: any) => v.id);
          const [purchases, extras, documents, consignments] = await Promise.all([
            supabase.from("vehicles_purchases").select("*").in("vehicle_id", vehicleIds),
            supabase.from("vehicles_extras").select("*").in("vehicle_id", vehicleIds),
            supabase.from("vehicles_documents").select("*").in("vehicle_id", vehicleIds).eq("client_id", clientId),
            supabase.from("vehicles_consignments").select("*").in("vehicle_id", vehicleIds)
          ]);
          results = results.map((v: any) => ({
            ...v,
            _purchases: (purchases.data || []).filter((p: any) => p.vehicle_id === v.id),
            _extras: (extras.data || []).filter((e: any) => e.vehicle_id === v.id),
            _documents: (documents.data || []).filter((d: any) => d.vehicle_id === v.id),
            _consignments: (consignments.data || []).filter((c: any) => c.vehicle_id === v.id)
          }));
        }

        // Calculate days in stock
        const now = new Date();
        results = results.map((v: any) => ({
          ...v,
          days_in_stock: v.created_at ? toDays(now.getTime() - new Date(v.created_at).getTime()) : 0
        }));

        return JSON.stringify({ count: results.length, vehicles: results });
      }

      case "query_leads": {
        let query = supabase.from("leads").select(`
          *,
          customer:customer_id(id, first_name, last_name, email, phone, rut),
          vehicle:vehicle_id(id, year, price, license_plate, brand:brand_id(name), model:model_id(name)),
          search_brand:brand_id(name),
          search_model:model_id(name)
        `).eq("client_id", clientId);

        if (args.id) query = query.eq("id", args.id);
        if (args.status) query = query.eq("status", args.status);
        if (args.type) query = query.eq("type", args.type);
        if (args.category === "buy") query = query.in("type", ["buy-direct", "buy-consignment", "search-request"]);
        if (args.category === "sell") query = query.in("type", ["sell-vehicle", "sell-financing", "sell-transfer", "contact-general"]);
        if (args.date_from) query = query.gte("created_at", args.date_from);
        if (args.date_to) query = query.lte("created_at", args.date_to + "T23:59:59");

        const orderField = args.order_by || "created_at";
        query = query.order(orderField, orderDir).limit(limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        let results = data || [];

        // Post-filter by customer name
        if (args.customer_name) {
          const nameLower = args.customer_name.toLowerCase();
          results = results.filter((l: any) => {
            const fullName = `${l.customer?.first_name || ""} ${l.customer?.last_name || ""}`.toLowerCase();
            return fullName.includes(nameLower);
          });
        }

        return JSON.stringify({ count: results.length, leads: results });
      }

      case "query_customers": {
        let query = supabase.from("customers").select("*").eq("client_id", clientId);

        if (args.id) query = query.eq("id", args.id);
        if (args.name) {
          query = query.or(`first_name.ilike.%${args.name}%,last_name.ilike.%${args.name}%`);
        }
        if (args.email) query = query.ilike("email", `%${args.email}%`);
        if (args.phone) query = query.ilike("phone", `%${args.phone}%`);
        if (args.rut) query = query.ilike("rut", `%${args.rut}%`);

        const orderField = args.order_by || "created_at";
        query = query.order(orderField, orderDir).limit(limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        return JSON.stringify({ count: (data || []).length, customers: data || [] });
      }

      case "query_sales": {
        let query = supabase.from("vehicles_sales").select(`
          id,
          sale_price,
          commission_amount,
          commission_percentage,
          sale_date,
          status,
          payment_method,
          has_trade_in,
          trade_in_value,
          customer:customer_id(id, first_name, last_name, email, phone, rut),
          vehicle:vehicle_id(id, year, price, license_plate, is_consigned, brand:brand_id(name), model:model_id(name)),
          seller:seller_id(id, first_name, last_name, email),
          vehicles!inner!vehicles_sales_vehicle_id_fkey(client_id)
        `).eq("vehicles.client_id", clientId);

        if (args.id) query = query.eq("id", args.id);
        if (args.seller_id) query = query.eq("seller_id", args.seller_id);
        if (args.status) query = query.eq("status", args.status);
        if (args.payment_method) query = query.eq("payment_method", args.payment_method);
        if (args.date_from) query = query.gte("sale_date", args.date_from);
        if (args.date_to) query = query.lte("sale_date", args.date_to + "T23:59:59");

        const orderField = args.order_by || "sale_date";
        query = query.order(orderField, orderDir).limit(limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        let results = data || [];

        // Post-filter by customer name
        if (args.customer_name) {
          const nameLower = args.customer_name.toLowerCase();
          results = results.filter((s: any) => {
            const fullName = `${s.customer?.first_name || ""} ${s.customer?.last_name || ""}`.toLowerCase();
            return fullName.includes(nameLower);
          });
        }

        // Remove the inner join helper field
        results = results.map((s: any) => {
          const { vehicles, ...rest } = s;
          return rest;
        });

        return JSON.stringify({ count: results.length, sales: results });
      }

      case "query_financing": {
        const selectFields = args.include_payments
          ? `*, customer:customer_id(id, first_name, last_name, rut, email, phone), vehicle:vehicle_id(id, year, price, license_plate, brand:brand_id(name), model:model_id(name)), payments:financing_payment(*)`
          : `*, customer:customer_id(id, first_name, last_name, rut, email, phone), vehicle:vehicle_id(id, year, price, license_plate, brand:brand_id(name), model:model_id(name))`;

        let query = supabase.from("financing").select(selectFields).eq("client_id", clientId);

        if (args.id) query = query.eq("id", args.id);
        if (args.customer_id) query = query.eq("customer_id", args.customer_id);
        if (args.vehicle_id) query = query.eq("vehicle_id", args.vehicle_id);

        const orderField = args.order_by || "created_at";
        query = query.order(orderField, orderDir).limit(limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        return JSON.stringify({ count: (data || []).length, financing: data || [] });
      }

      case "query_team": {
        // Fetch users
        let usersQuery = supabase.from("users").select("id, first_name, last_name, full_name, email, role, rol, phone, created_at").eq("client_id", clientId);

        if (args.id) usersQuery = usersQuery.eq("id", args.id);
        if (args.role) usersQuery = usersQuery.or(`role.eq.${args.role},rol.eq.${args.role}`);
        if (args.name) usersQuery = usersQuery.or(`first_name.ilike.%${args.name}%,last_name.ilike.%${args.name}%,full_name.ilike.%${args.name}%`);
        if (args.email) usersQuery = usersQuery.ilike("email", `%${args.email}%`);

        usersQuery = usersQuery.limit(limit);

        const { data: usersData, error: usersError } = await usersQuery;
        if (usersError) return JSON.stringify({ error: usersError.message });

        let result: any = { count: (usersData || []).length, users: usersData || [] };

        // Include permissions if requested
        if (args.include_permissions) {
          const { data: roles } = await supabase.from("roles").select("id, name, client_id").eq("client_id", clientId);
          const roleIds = (roles || []).map((r: any) => r.id);
          let permissionsData: any[] = [];
          if (roleIds.length > 0) {
            const { data: rolePerms } = await supabase.from("role_permissions").select("role_id, permission_id, permissions(name, description)").in("role_id", roleIds);
            permissionsData = rolePerms || [];
          }
          result.roles = roles || [];
          result.role_permissions = permissionsData;
        }

        // Include commissions if requested
        if (args.include_commissions) {
          const { data: tiers } = await supabase.from("seller_commission_tiers").select("*").eq("client_id", clientId).order("min_sales", { ascending: true });
          const { data: splits } = await supabase.from("sale_commission_splits").select("*, user:user_id(id, first_name, last_name, full_name, email)").eq("client_id", clientId);
          result.commission_tiers = tiers || [];
          result.commission_splits = splits || [];
        }

        return JSON.stringify(result);
      }

      case "query_documents": {
        const docType = args.type || "documents";
        const orderField = args.order_by || "created_at";

        switch (docType) {
          case "quotations": {
            let query = supabase.from("vehicles_quotations").select(`
              *,
              vehicle:vehicle_id(id, year, license_plate, brand:brand_id(name), model:model_id(name)),
              customer:customer_id(id, first_name, last_name, email, phone)
            `).eq("client_id", clientId);

            if (args.id) query = query.eq("id", args.id);
            if (args.vehicle_id) query = query.eq("vehicle_id", args.vehicle_id);
            if (args.customer_id) query = query.eq("customer_id", args.customer_id);
            if (args.status) query = query.eq("status", args.status);
            if (args.date_from) query = query.gte("quotation_date", args.date_from);
            if (args.date_to) query = query.lte("quotation_date", args.date_to + "T23:59:59");

            query = query.order(orderField === "created_at" ? "quotation_date" : orderField, orderDir).limit(limit);

            const { data, error } = await query;
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, quotations: data || [] });
          }

          case "reservations": {
            let query = supabase.from("vehicles_reservations").select(`
              *,
              vehicle:vehicle_id(id, year, license_plate, brand:brand_id(name), model:model_id(name)),
              customer:customer_id(id, first_name, last_name, email, phone)
            `).eq("client_id", clientId);

            if (args.id) query = query.eq("id", args.id);
            if (args.vehicle_id) query = query.eq("vehicle_id", args.vehicle_id);
            if (args.customer_id) query = query.eq("customer_id", args.customer_id);
            if (args.status) query = query.eq("status", args.status);
            if (args.date_from) query = query.gte("reservation_date", args.date_from);
            if (args.date_to) query = query.lte("reservation_date", args.date_to + "T23:59:59");

            query = query.order(orderField === "created_at" ? "reservation_date" : orderField, orderDir).limit(limit);

            const { data, error } = await query;
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, reservations: data || [] });
          }

          case "close_deals": {
            let query = supabase.from("vehicles_close_deal").select(`
              *,
              vehicle:vehicle_id(id, year, license_plate, brand:brand_id(name), model:model_id(name)),
              customer:customer_id(id, first_name, last_name, email, phone)
            `).eq("client_id", clientId);

            if (args.id) query = query.eq("id", args.id);
            if (args.vehicle_id) query = query.eq("vehicle_id", args.vehicle_id);
            if (args.customer_id) query = query.eq("customer_id", args.customer_id);
            if (args.status) query = query.eq("status", args.status);
            if (args.date_from) query = query.gte("created_at", args.date_from);
            if (args.date_to) query = query.lte("created_at", args.date_to + "T23:59:59");

            query = query.order(orderField, orderDir).limit(limit);

            const { data, error } = await query;
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, close_deals: data || [] });
          }

          case "templates": {
            const { data, error } = await supabase.from("document_templates").select("*").eq("client_id", clientId).limit(limit);
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, templates: data || [] });
          }

          default: {
            // documents
            let query = supabase.from("vehicles_documents").select(`
              *,
              vehicle:vehicle_id(id, year, license_plate, brand:brand_id(name), model:model_id(name))
            `).eq("client_id", clientId);

            if (args.id) query = query.eq("id", args.id);
            if (args.vehicle_id) query = query.eq("vehicle_id", args.vehicle_id);
            if (args.status) query = query.eq("status", args.status);
            if (args.date_from) query = query.gte("created_at", args.date_from);
            if (args.date_to) query = query.lte("created_at", args.date_to + "T23:59:59");

            query = query.order(orderField, orderDir).limit(limit);

            const { data, error } = await query;
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, documents: data || [] });
          }
        }
      }

      case "query_appointments": {
        let query = supabase.from("appointments_public").select("*").eq("client_id", clientId);

        if (args.id) query = query.eq("id", args.id);
        if (args.status) query = query.eq("status", args.status);
        if (args.vehicle_id) query = query.eq("vehicle_id", args.vehicle_id);
        if (args.date_from) query = query.gte("appointment_date", args.date_from);
        if (args.date_to) query = query.lte("appointment_date", args.date_to + "T23:59:59");

        const orderField = args.order_by || "appointment_date";
        query = query.order(orderField, orderDir).limit(limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        let results = data || [];

        // Post-filter by customer name if provided
        if (args.customer_name) {
          const nameLower = args.customer_name.toLowerCase();
          results = results.filter((a: any) => {
            const name = (a.customer_name || a.name || "").toLowerCase();
            return name.includes(nameLower);
          });
        }

        return JSON.stringify({ count: results.length, appointments: results });
      }

      case "query_marketing": {
        const platform = args.platform || "all";

        switch (platform) {
          case "instagram": {
            const { data: integration } = await supabase.from("instagram_integrations").select("*").eq("client_id", clientId).maybeSingle();
            return JSON.stringify({
              connected: !!integration,
              integration: integration || null
            });
          }

          case "mercadolibre": {
            const { data: integration } = await supabase.from("meli_integration").select("*").eq("user_id", clientId).maybeSingle();
            let posts: any[] = [];
            if (integration) {
              let postsQuery = supabase.from("meli_post").select(`
                *,
                vehicle:vehicle_id(id, year, license_plate, brand:brand_id(name), model:model_id(name))
              `).eq("client_id", clientId);

              if (args.vehicle_id) postsQuery = postsQuery.eq("vehicle_id", args.vehicle_id);
              if (args.status) postsQuery = postsQuery.eq("status", args.status);

              postsQuery = postsQuery.limit(limit);
              const { data: postsData } = await postsQuery;
              posts = postsData || [];
            }
            return JSON.stringify({
              connected: !!integration,
              integration: integration ? { id: integration.id, user_id: integration.user_id, nickname: integration.nickname } : null,
              posts_count: posts.length,
              posts
            });
          }

          case "facebook": {
            const { data: integration } = await supabase.from("fb_marketplace_integration").select("*").eq("client_id", clientId).maybeSingle();
            let posts: any[] = [];
            if (integration) {
              let postsQuery = supabase.from("fb_marketplace_post").select(`
                *,
                vehicle:vehicle_id(id, year, license_plate, brand:brand_id(name), model:model_id(name))
              `).eq("client_id", clientId);

              if (args.vehicle_id) postsQuery = postsQuery.eq("vehicle_id", args.vehicle_id);
              if (args.status) postsQuery = postsQuery.eq("status", args.status);

              postsQuery = postsQuery.limit(limit);
              const { data: postsData } = await postsQuery;
              posts = postsData || [];
            }
            return JSON.stringify({
              connected: !!integration,
              integration: integration ? { id: integration.id, page_name: integration.page_name } : null,
              posts_count: posts.length,
              posts
            });
          }

          case "chileautos": {
            const { data: integration } = await supabase.from("chileautos_integration").select("*").eq("client_id", clientId).maybeSingle();
            let listings: any[] = [];
            if (integration) {
              let listingsQuery = supabase.from("chileautos_listing").select(`
                *,
                vehicle:vehicle_id(id, year, license_plate, brand:brand_id(name), model:model_id(name))
              `).eq("client_id", clientId);

              if (args.vehicle_id) listingsQuery = listingsQuery.eq("vehicle_id", args.vehicle_id);
              if (args.status) listingsQuery = listingsQuery.eq("status", args.status);

              listingsQuery = listingsQuery.limit(limit);
              const { data: listingsData } = await listingsQuery;
              listings = listingsData || [];
            }
            return JSON.stringify({
              connected: !!integration,
              integration: integration ? { id: integration.id, dealer_id: integration.dealer_id } : null,
              listings_count: listings.length,
              listings
            });
          }

          case "emails": {
            let query = supabase.from("marketing_emails_history").select("*").eq("client_id", clientId);

            if (args.date_from) query = query.gte("created_at", args.date_from);
            if (args.date_to) query = query.lte("created_at", args.date_to + "T23:59:59");

            query = query.order("created_at", { ascending: false }).limit(limit);

            const { data, error } = await query;
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, emails: data || [] });
          }

          default: {
            // Query all platforms status
            const [ig, meli, fb, ca] = await Promise.all([
              supabase.from("instagram_integrations").select("id").eq("client_id", clientId).maybeSingle(),
              supabase.from("meli_integration").select("id").eq("user_id", clientId).maybeSingle(),
              supabase.from("fb_marketplace_integration").select("id").eq("client_id", clientId).maybeSingle(),
              supabase.from("chileautos_integration").select("id").eq("client_id", clientId).maybeSingle()
            ]);
            return JSON.stringify({
              platforms: {
                instagram: { connected: !!ig.data },
                mercadolibre: { connected: !!meli.data },
                facebook_marketplace: { connected: !!fb.data },
                chileautos: { connected: !!ca.data }
              }
            });
          }
        }
      }

      case "query_expenses": {
        const expenseType = args.type || "fixed";

        switch (expenseType) {
          case "fixed": {
            let query = supabase.from("fixed_monthly_expenses").select("*").eq("client_id", clientId);

            if (args.is_active !== undefined) query = query.eq("is_active", args.is_active);
            else query = query.eq("is_active", true); // Default to active only

            if (args.category) query = query.ilike("category", `%${args.category}%`);

            query = query.order("created_at", { ascending: false }).limit(limit);

            const { data, error } = await query;
            if (error) return JSON.stringify({ error: error.message });

            const total = (data || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
            return JSON.stringify({ count: (data || []).length, total_monthly: total, expenses: data || [] });
          }

          case "vehicle_extras": {
            let query = supabase.from("vehicles_extras").select(`
              *,
              vehicle:vehicle_id(id, year, license_plate, brand:brand_id(name), model:model_id(name)),
              vehicles!inner!vehicles_extras_vehicle_id_fkey(client_id)
            `).eq("vehicles.client_id", clientId).eq("type", "expense");

            if (args.vehicle_id) query = query.eq("vehicle_id", args.vehicle_id);
            if (args.date_from) query = query.gte("created_at", args.date_from);
            if (args.date_to) query = query.lte("created_at", args.date_to + "T23:59:59");

            query = query.order("created_at", { ascending: false }).limit(limit);

            const { data, error } = await query;
            if (error) return JSON.stringify({ error: error.message });

            let results = (data || []).map((e: any) => {
              const { vehicles, ...rest } = e;
              return rest;
            });

            if (args.category) {
              const catLower = args.category.toLowerCase();
              results = results.filter((e: any) => (e.description || "").toLowerCase().includes(catLower));
            }

            const total = results.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
            return JSON.stringify({ count: results.length, total, expenses: results });
          }

          case "categories": {
            const { data, error } = await supabase.from("transaction_categories").select("*").eq("client_id", clientId).order("name", { ascending: true }).limit(limit);
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, categories: data || [] });
          }

          default:
            return JSON.stringify({ error: `Unknown expense type: ${expenseType}. Use 'fixed', 'vehicle_extras', or 'categories'.` });
        }
      }

      case "query_config": {
        const entity = args.entity;

        switch (entity) {
          case "legal_info": {
            const { data, error } = await supabase.from("legal_info").select("*, dealership:dealership_id(id, name)").eq("client_id", clientId).order("dealership_id", { ascending: true, nullsFirst: true });
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, legal_info: data || [] });
          }

          case "dealerships": {
            const { data, error } = await supabase.from("dealerships").select("*").eq("client_id", clientId).limit(limit);
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, dealerships: data || [] });
          }

          case "states": {
            const { data, error } = await supabase.from("clients_vehicles_states").select("*").eq("client_id", clientId).order("order", { ascending: true });
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, states: data || [] });
          }

          case "checklist": {
            const { data, error } = await supabase.from("client_checklist_items").select("*").eq("client_id", clientId).order("order", { ascending: true });
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, checklist_items: data || [] });
          }

          case "website": {
            const { data, error } = await supabase.from("client_website_config").select("*").eq("client_id", clientId).maybeSingle();
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ website_config: data || null });
          }

          case "brands": {
            const { data, error } = await supabase.from("brands").select("*").eq("client_id", clientId).order("name", { ascending: true }).limit(limit);
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, brands: data || [] });
          }

          case "models": {
            const { data, error } = await supabase.from("models").select("*, brand:brand_id(name)").eq("client_id", clientId).order("name", { ascending: true }).limit(limit);
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, models: data || [] });
          }

          case "colors": {
            const { data, error } = await supabase.from("colors").select("*").eq("client_id", clientId).order("name", { ascending: true }).limit(limit);
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, colors: data || [] });
          }

          case "conditions": {
            const { data, error } = await supabase.from("conditions").select("*").eq("client_id", clientId).order("name", { ascending: true }).limit(limit);
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, conditions: data || [] });
          }

          case "fuel_types": {
            const { data, error } = await supabase.from("fuel_types").select("*").eq("client_id", clientId).order("name", { ascending: true }).limit(limit);
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, fuel_types: data || [] });
          }

          case "categories": {
            const { data, error } = await supabase.from("categories").select("*").eq("client_id", clientId).order("name", { ascending: true }).limit(limit);
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, categories: data || [] });
          }

          case "commission_tiers": {
            const { data, error } = await supabase.from("seller_commission_tiers").select("*").eq("client_id", clientId).order("min_sales", { ascending: true });
            if (error) return JSON.stringify({ error: error.message });
            return JSON.stringify({ count: (data || []).length, commission_tiers: data || [] });
          }

          default:
            return JSON.stringify({ error: `Unknown config entity: ${entity}` });
        }
      }

      case "create_task": {
        const { title, description, priority, due_date, category, vehicle_id, assigned_to_user_id } = args;
        if (!title) return JSON.stringify({ error: "title is required" });

        const taskData: any = {
          client_id: clientId,
          title,
          status: "pending",
          priority: priority || "medium",
          source_type: "ai",
          category: category || "general",
        };

        if (description) taskData.description = description;
        if (due_date) taskData.due_date = due_date;
        if (vehicle_id) taskData.vehicle_id = vehicle_id;
        if (assigned_to_user_id) taskData.assigned_to_user_id = assigned_to_user_id;

        const { data, error } = await supabase.from("tasks").insert(taskData).select().single();

        if (error) return JSON.stringify({ error: error.message });

        return JSON.stringify({
          success: true,
          task_id: data.id,
          title: data.title,
          priority: data.priority,
          due_date: data.due_date,
          category: data.category,
          status: data.status,
        });
      }

      case "appraise_vehicle": {
        const { query } = args;
        if (!query) return JSON.stringify({ error: "query is required" });

        const appraiserUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/car_appraiser`;
        const appraiserRes = await fetch(appraiserUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ query, client_id: clientId }),
        });

        if (!appraiserRes.ok) {
          return JSON.stringify({ error: `car_appraiser returned ${appraiserRes.status}` });
        }

        const result = await appraiserRes.json();

        if (result.error) {
          return JSON.stringify({ error: result.error });
        }

        // Return a compact summary for GPT to use in its response
        return JSON.stringify({
          vehicle: result.vehicle_details,
          price_analysis: result.price_analysis,
          estimated_range: result.estimated_range,
          confidence: result.confidence,
          sources_count: (result.sources || []).length,
          sources: (result.sources || []).slice(0, 5).map((s: any) => ({
            source: s.source,
            vehicle: s.vehicle,
            year: s.year,
            mileage: s.mileage,
            price: s.price,
            url: s.url,
          })),
          appraisal_summary: result.appraisal,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    console.error(`Error in tool ${toolName}:`, err.message);
    return JSON.stringify({ error: err.message });
  }
}

serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const clientIdRaw = body.clientId ?? body.context?.clientId;
    const language = body.language === "en" ? "en" : "es";
    if (!clientIdRaw) {
      return new Response(JSON.stringify({
        error: "clientId required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Ensure clientId is a number for proper query filtering
    const clientId = typeof clientIdRaw === "string" ? parseInt(clientIdRaw, 10) : clientIdRaw;
    console.log("🚀🚀🚀 AI Chat ULTRA - Client:", clientId, "(type:", typeof clientId, ") Messages:", messages.length, "Language:", language);
    // =================================================================
    // FETCH ALL TENANT DATA (COMPLETE)
    // =================================================================
    console.log("📡📡📡 Starting ULTRA data fetch for client:", clientId);
    const [// Core data
    allVehicles, vehiclesSalesRaw, vehiclesPurchases, vehiclesExtras, vehiclesDocuments, vehiclesQuotations, vehiclesReservations, // Customers & Leads
    customers, leads, // Financing
    financing, financingPayments, // Config & Admin
    users, clientInfo, clientStates, legalInfo, fixedMonthlyExpenses, // Analytics
    pageVisits] = await Promise.all([
      // Vehicles - Query CORRECTA (funciona en ULTIMATE)
      supabase.from("vehicles").select(`
          *,
          category:category_id(name),
          status:status_id(name, color, order),
          brand:brand_id(name),
          model:model_id(name),
          color:color_id(name),
          condition:condition_id(name),
          fuel_type:fuel_type_id(name),
          seller:seller_id(id, first_name, last_name)
        `).eq("client_id", clientId).order("created_at", {
        ascending: false
      }),
      // Sales
      supabase.from("vehicles_sales").select(`
          id,
          sale_price,
          commission_amount,
          commission_percentage,
          sale_date,
          status,
          payment_method,
          customer_id,
          seller_id,
          vehicle_id,
          has_trade_in,
          trade_in_value,
          vehicles!inner!vehicles_sales_vehicle_id_fkey(client_id)
        `).eq("vehicles.client_id", clientId).order("sale_date", {
        ascending: false
      }),
      // Purchases
      supabase.from("vehicles_purchases").select(`
          id,
          purchase_price,
          purchase_date,
          vehicle_id,
          vehicles!inner!vehicles_purchases_vehicle_id_fkey(
            client_id,
            status:status_id(name),
            is_consigned
          )
        `).eq("vehicles.client_id", clientId).order("purchase_date", {
        ascending: false
      }),
      // Extras
      supabase.from("vehicles_extras").select(`
          id,
          amount,
          created_at,
          type,
          description,
          vehicle_id,
          vehicles!inner!vehicles_extras_vehicle_id_fkey(client_id)
        `).eq("vehicles.client_id", clientId).eq("type", "expense"),
      // Documents, Quotations, Reservations
      supabase.from("vehicles_documents").select("*").eq("client_id", clientId).order("created_at", {
        ascending: false
      }),
      supabase.from("vehicles_quotations").select("*").eq("client_id", clientId).order("quotation_date", {
        ascending: false
      }),
      supabase.from("vehicles_reservations").select("*").eq("client_id", clientId).order("reservation_date", {
        ascending: false
      }),
      // Customers & Leads
      supabase.from("customers").select("*").eq("client_id", clientId).order("created_at", {
        ascending: false
      }),
      supabase.from("leads").select("*").eq("client_id", clientId).not("customer_id", "is", null).order("created_at", {
        ascending: false
      }),
      // Financing
      supabase.from("financing").select("*").eq("client_id", clientId),
      supabase.from("financing_payment").select("*"),
      // Config & Admin
      supabase.from("users").select("id,first_name,last_name,full_name,email,role,rol,phone").eq("client_id", clientId),
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase.from("clients_vehicles_states").select("*").eq("client_id", clientId).order("order", {
        ascending: true
      }),
      supabase.from("legal_info").select("*").eq("client_id", clientId).is("dealership_id", null).maybeSingle(),
      supabase.from("fixed_monthly_expenses").select("*").eq("client_id", clientId).eq("is_active", true),
      // Analytics
      supabase.from("page_visits").select("created_at, visitor_id, pathname").eq("client_id", clientId)
    ]);
    console.log("📊📊📊 RAW DATA FETCHED (ULTRA MODE):");
    console.log("  - All Vehicles:", allVehicles.data?.length || 0, allVehicles.error ? `❌ ERROR: ${allVehicles.error.message}` : "✅");
    console.log("  - Sales Records:", vehiclesSalesRaw.data?.length || 0, vehiclesSalesRaw.error ? "❌" : "✅");
    console.log("  - Purchases:", vehiclesPurchases.data?.length || 0, vehiclesPurchases.error ? "❌" : "✅");
    console.log("  - Extras:", vehiclesExtras.data?.length || 0, vehiclesExtras.error ? "❌" : "✅");
    console.log("  - Documents:", vehiclesDocuments.data?.length || 0, vehiclesDocuments.error ? "❌" : "✅");
    console.log("  - Quotations:", vehiclesQuotations.data?.length || 0, vehiclesQuotations.error ? "❌" : "✅");
    console.log("  - Reservations:", vehiclesReservations.data?.length || 0, vehiclesReservations.error ? "❌" : "✅");
    console.log("  - Customers:", customers.data?.length || 0, customers.error ? "❌" : "✅");
    console.log("  - Leads:", leads.data?.length || 0, leads.error ? "❌" : "✅");
    console.log("  - Financing:", financing.data?.length || 0, financing.error ? "❌" : "✅");
    console.log("  - Financing Payments:", financingPayments.data?.length || 0, financingPayments.error ? "❌" : "✅");
    console.log("  - Users:", users.data?.length || 0, users.error ? "❌" : "✅");
    console.log("  - Client States:", clientStates.data?.length || 0, clientStates.error ? "❌" : "✅");
    console.log("  - Page Visits:", pageVisits.data?.length || 0, pageVisits.error ? "❌" : "✅");
    if (allVehicles.error) {
      console.error("❌❌❌ CRITICAL ERROR fetching vehicles:", JSON.stringify(allVehicles.error, null, 2));
    }
    if (vehiclesSalesRaw.error) {
      console.error("❌ ERROR fetching sales:", vehiclesSalesRaw.error);
    }
    if (clientStates.error) {
      console.error("❌ ERROR fetching client states:", clientStates.error);
    }
    if (pageVisits.error) {
      console.error("❌ ERROR fetching page visits:", pageVisits.error);
    }
    // =================================================================
    // PROCESS DATA CORRECTLY (alineado con index-ultimate)
    // =================================================================
    // 1. Get special status IDs (sold, reserved, archived)
    const soldStatusIds = (clientStates.data || []).filter((s)=>{
      const name = s.name?.toLowerCase() || "";
      return name.includes("vendido") || name.includes("sold");
    }).map((s)=>s.id);
    console.log("🔍 Sold status IDs:", soldStatusIds);

    const reservedStatusIds = (clientStates.data || []).filter((s)=>{
      const name = s.name?.toLowerCase() || "";
      return name.includes("reservado") || name.includes("reserved");
    }).map((s)=>s.id);
    console.log("🔍 Reserved status IDs:", reservedStatusIds);

    const archivedStatusIds = (clientStates.data || []).filter((s)=>{
      const name = s.name?.toLowerCase() || "";
      return name.includes("archivado") || name.includes("archived");
    }).map((s)=>s.id);
    console.log("🔍 Archived status IDs:", archivedStatusIds);

    // 2. Get sold vehicle IDs from sales table
    const soldVehicleIdsFromSales = new Set((vehiclesSalesRaw.data || []).map((s)=>s.vehicle_id));
    console.log("🔍 Sold vehicle IDs from sales table:", soldVehicleIdsFromSales.size);
    // 3. Separate vehicles by category (sold, reserved, archived, active)
    const activeVehicles: any[] = [];
    const soldVehicles: any[] = [];
    const reservedVehicles: any[] = [];
    const archivedVehicles: any[] = [];
    (allVehicles.data || []).forEach((v: any)=>{
      const hasSoldStatus = soldStatusIds.includes(v.status_id);
      const hasSaleRecord = soldVehicleIdsFromSales.has(v.id);
      const hasReservedStatus = reservedStatusIds.includes(v.status_id);
      const hasArchivedStatus = archivedStatusIds.includes(v.status_id);

      if (hasSoldStatus || hasSaleRecord) {
        soldVehicles.push(v);
      } else if (hasReservedStatus) {
        reservedVehicles.push(v);
      } else if (hasArchivedStatus) {
        archivedVehicles.push(v);
      } else {
        activeVehicles.push(v);
      }
    });
    console.log("✅ Active vehicles:", activeVehicles.length);
    console.log("✅ Sold vehicles:", soldVehicles.length);
    console.log("✅ Reserved vehicles:", reservedVehicles.length);
    console.log("✅ Archived vehicles:", archivedVehicles.length);
    // 4. Calculate days in stock for active vehicles
    const now = new Date();
    const vehiclesWithDaysInStock = activeVehicles.map((v)=>{
      const daysInStock = v.created_at ? toDays(now.getTime() - new Date(v.created_at).getTime()) : 0;
      return {
        ...v,
        daysInStock
      };
    });
    // 5. Oldest vehicles (como index-ultimate: no excluimos estados extra)
    const oldestVehicles = [
      ...vehiclesWithDaysInStock
    ].sort((a, b)=>b.daysInStock - a.daysInStock).slice(0, 10);
    console.log("✅ Oldest vehicles:", oldestVehicles.length);
    // 6. Most visited vehicles (page_visits) – compatible con ULTIMATE + contador total
    console.log("🔍🔍🔍 Calculating most visited from page_visits...");
    const vehicleVisitCounts = {};
    let validVisitCount = 0;
    (pageVisits.data || []).filter((v)=>v.pathname && v.pathname.startsWith("/vehicles/")).forEach((v)=>{
      const match = v.pathname.match(/\/vehicles\/(\d+)/);
      if (match) {
        const vehicleId = parseInt(match[1], 10);
        if (!isNaN(vehicleId)) {
          vehicleVisitCounts[vehicleId] = (vehicleVisitCounts[vehicleId] || 0) + 1;
          validVisitCount++;
        }
      }
    });
    console.log("  → Valid visit records:", validVisitCount);
    console.log("  → Unique vehicles with visits:", Object.keys(vehicleVisitCounts).length);
    const topVisitedVehicleIds = Object.entries(vehicleVisitCounts).sort(([, a], [, b])=>b - a).slice(0, 10).map(([id, visits])=>({
        vehicleId: parseInt(id),
        visits
      }));
    const mostViewedVehicles = topVisitedVehicleIds.map(({ vehicleId, visits })=>{
      const vehicle = vehiclesWithDaysInStock.find((v)=>v.id === vehicleId);
      if (!vehicle) return null;
      return {
        ...vehicle,
        visitCount: visits
      };
    }).filter((v)=>v !== null);
    console.log("✅ Top viewed vehicles:", mostViewedVehicles.length);
    // 7. Brand distribution (igual que index-ultimate)
    const brandCounts = {};
    (allVehicles.data || []).forEach((v)=>{
      const brandName = v.brand?.name || "Sin marca";
      brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;
    });
    const brandDistribution = Object.entries(brandCounts).map(([name, value])=>({
        name,
        value
      })).sort((a, b)=>b.value - a.value);
    let brandDistributionFinal;
    if (brandDistribution.length > 5) {
      const topBrands = brandDistribution.slice(0, 5);
      const otherBrands = brandDistribution.slice(5);
      const otherCount = otherBrands.reduce((sum, item)=>sum + item.value, 0);
      brandDistributionFinal = [
        ...topBrands,
        {
          name: "Otros",
          value: otherCount
        }
      ];
    } else {
      brandDistributionFinal = brandDistribution;
    }
    console.log("✅ Brand distribution:", brandDistributionFinal.length, "brands");
    // 8. Seller performance (igual que index-ultimate pero manteniendo filtros de ULTRA)
    const sellers = (users.data || []).filter((u)=>u.rol === "seller" || u.role === "seller");
    const sellerPerformance = sellers.map((seller)=>{
      const sellerSales = (vehiclesSalesRaw.data || []).filter((s)=>s.seller_id === seller.id && s.status === "approved");
      const totalSales = sellerSales.reduce((sum, s)=>sum + (Number(s.sale_price) || 0), 0);
      const totalCommissions = sellerSales.reduce((sum, s)=>sum + (Number(s.commission_amount) || 0), 0);
      const vehiclesSold = sellerSales.length;
      const assignedVehicles = activeVehicles.filter((v)=>v.seller_id === seller.id).length;
      return {
        id: seller.id,
        name: seller.full_name || `${seller.first_name || ""} ${seller.last_name || ""}`.trim() || `Vendedor ${seller.id}`,
        email: seller.email,
        sales: totalSales,
        commissions: totalCommissions,
        vehiclesSold,
        assignedVehicles
      };
    }).sort((a, b)=>b.vehiclesSold - a.vehiclesSold);
    console.log("✅ Seller performance:", sellerPerformance.length, "sellers");
    // 9. Métricas financieras (alineado con dashboard: purchases + consignments + extras + commissions)
    const totalSalesAmount = (vehiclesSalesRaw.data || []).reduce((sum, s)=>sum + (Number(s.sale_price) || 0), 0);
    const totalCommissions = (vehiclesSalesRaw.data || []).reduce((sum, s)=>sum + (Number(s.commission_amount) || 0), 0);
    // Compras de vehículos vendidos y no consignados
    const soldPurchases = (vehiclesPurchases.data || []).filter((purchase)=>{
      const statusName = purchase.vehicles?.status?.name?.toLowerCase() || "";
      const isSold = statusName.includes("vendido") || statusName.includes("sold");
      const isConsigned = purchase.vehicles?.is_consigned === true;
      return isSold && !isConsigned;
    });
    const totalPurchases = soldPurchases.reduce((sum, p)=>sum + (Number(p.purchase_price) || 0), 0);
    // Consignaciones de vehículos vendidos (agreed_price)
    const vehiclesConsignments = await supabase
      .from("vehicles_consignments")
      .select(`id, agreed_price, vehicle_id, vehicles!inner(client_id, status:status_id(name), is_consigned)`)
      .eq("vehicles.client_id", clientId)
      .eq("vehicles.is_consigned", true);
    const soldConsignments = (vehiclesConsignments.data || []).filter((c)=>{
      const statusName = c.vehicles?.status?.name?.toLowerCase() || "";
      return statusName.includes("vendido") || statusName.includes("sold");
    });
    const totalConsignments = soldConsignments.reduce((sum, c)=>sum + (Number(c.agreed_price) || 0), 0);
    const totalExtras = (vehiclesExtras.data || []).reduce((sum, e)=>sum + (Number(e.amount) || 0), 0);
    const totalFixedExpenses = (fixedMonthlyExpenses.data || []).filter((expense)=>expense.is_active).reduce((sum, expense)=>sum + (Number(expense.amount) || 0), 0);
    // Gastos totales = mismo cálculo que el dashboard
    const totalExpenses = totalPurchases + totalConsignments + totalExtras + totalCommissions;
    const totalRevenue = totalSalesAmount - totalExpenses;
    // Valor del inventario con prioridad: purchase_price > agreed_price > price (igual que dashboard)
    const activeVehicleIds = activeVehicles.map((v: any) => v.id);
    const inventoryValuationMap: Record<number, number> = {};
    // Fallback: precio de lista
    activeVehicles.forEach((v: any) => {
      const price = Number(v.price) || 0;
      if (price > 0) inventoryValuationMap[v.id] = price;
    });
    if (activeVehicleIds.length > 0) {
      // Override con precio de consignación
      const allConsignments = (vehiclesConsignments.data || []).filter((c: any) => activeVehicleIds.includes(c.vehicle_id));
      allConsignments.forEach((c: any) => {
        const price = Number(c.agreed_price) || 0;
        if (price > 0) inventoryValuationMap[c.vehicle_id] = price;
      });
      // Override con precio de compra (máxima prioridad)
      const activePurchases = (vehiclesPurchases.data || []).filter((p: any) => activeVehicleIds.includes(p.vehicle_id));
      activePurchases.forEach((p: any) => {
        const price = Number(p.purchase_price) || 0;
        if (price > 0) inventoryValuationMap[p.vehicle_id] = price;
      });
    }
    const totalInventoryValue = Object.values(inventoryValuationMap).reduce((sum, v) => sum + v, 0);
    const avgVehiclePrice = activeVehicles.length > 0 ? totalInventoryValue / activeVehicles.length : 0;
    const avgDaysInStock = vehiclesWithDaysInStock.length > 0 ? vehiclesWithDaysInStock.reduce((sum, v)=>sum + v.daysInStock, 0) / vehiclesWithDaysInStock.length : 0;
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthlySales = (vehiclesSalesRaw.data || []).filter((sale)=>{
      if (!sale.sale_date) return false;
      const saleDate = new Date(sale.sale_date);
      return saleDate >= firstDayOfMonth;
    });
    const monthlyRevenue = monthlySales.reduce((sum, s)=>sum + (Number(s.sale_price) || 0), 0);
    console.log("📈 CALCULATED METRICS:");
    console.log("  - Total Sales Amount:", totalSalesAmount);
    console.log("  - Total Purchases (sold, non-consigned):", totalPurchases, "(from", soldPurchases.length, "purchases)");
    console.log("  - Total Extras (expenses):", totalExtras, "(from", vehiclesExtras.data?.length || 0, "extras)");
    console.log("  - Total Commissions:", totalCommissions);
    console.log("  - Total Fixed Expenses:", totalFixedExpenses);
    console.log("  - TOTAL EXPENSES:", totalExpenses);
    console.log("  - Total Revenue:", totalRevenue);
    console.log("  - Total Inventory Value:", totalInventoryValue);
    console.log("  - Avg Days in Stock:", avgDaysInStock);
    console.log("  - Active Vehicles:", activeVehicles.length);
    console.log("  - Sold Vehicles:", soldVehicles.length);
    // =================================================================
    // BUILD COMPREHENSIVE CONTEXT
    // =================================================================
    let context = "";
    // Header with client info
    if (clientInfo.data) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   INFORMACIÓN DE LA AUTOMOTORA\n`;
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `Nombre: ${clientInfo.data.name || "N/A"}\n`;
      context += `Moneda: ${clientInfo.data.currency || "CLP"}\n`;
      if (legalInfo.data) {
        context += `Razón Social: ${legalInfo.data.company_name || "N/A"}\n`;
        context += `RUT: ${legalInfo.data.rut || "N/A"}\n`;
        if (legalInfo.data.legal_representative) context += `Representante Legal: ${legalInfo.data.legal_representative}\n`;
        if (legalInfo.data.legal_address) context += `Dirección Legal: ${legalInfo.data.legal_address}\n`;
        if (legalInfo.data.dealership_id) context += `Sucursal ID: ${legalInfo.data.dealership_id}\n`;
        context += `(Para info legal completa de todas las sucursales, usa query_config con entity="legal_info")\n`;
      } else {
        context += `Info legal: No configurada aún.\n`;
      }
      context += `\n`;
    }
    // Executive Summary - KPIs
    context += `═══════════════════════════════════════════════════════════════\n`;
    context += `   RESUMEN EJECUTIVO - MÉTRICAS CLAVE (KPIs)\n`;
    context += `═══════════════════════════════════════════════════════════════\n\n`;
    context += `📊 INVENTARIO:\n`;
    context += `  • Vehículos activos en stock: ${activeVehicles.length}\n`;
    context += `  • Vehículos reservados: ${reservedVehicles.length}\n`;
    context += `  • Vehículos vendidos (histórico): ${soldVehicles.length}\n`;
    context += `  • Vehículos archivados: ${archivedVehicles.length}\n`;
    context += `  • Valor total inventario: $${totalInventoryValue.toLocaleString("es-CL")}\n`;
    context += `  • Precio promedio por vehículo: $${Math.round(avgVehiclePrice).toLocaleString("es-CL")}\n`;
    context += `  • Días promedio en stock: ${Math.round(avgDaysInStock)} días\n`;
    context += `  • Vehículo más antiguo: ${oldestVehicles[0]?.daysInStock || 0} días\n`;
    // IMPORTANTE: Desglose de vehículos por estado usando status.name
    const byStatusSummary = activeVehicles.reduce((acc, v)=>{
      const statusLabel = v.status?.name || "Sin estado";
      if (!acc[statusLabel]) acc[statusLabel] = 0;
      acc[statusLabel]++;
      return acc;
    }, {});
    if (Object.keys(byStatusSummary).length > 0) {
      context += `  • Vehículos por estado:\n`;
      Object.entries(byStatusSummary).forEach(([status, count])=>{
        context += `    - ${status}: ${count}\n`;
      });
    }
    context += `\n`;
    context += `💰 VENTAS Y FINANZAS:\n`;
    context += `  • Total ventas realizadas: ${vehiclesSalesRaw.data?.length || 0}\n`;
    context += `  • Ingresos por ventas (histórico): $${totalSalesAmount.toLocaleString("es-CL")}\n`;
    context += `  • Gastos totales: $${totalExpenses.toLocaleString("es-CL")}\n`;
    context += `    Desglose: Compras vendidos $${totalPurchases.toLocaleString("es-CL")} + Consignaciones $${totalConsignments.toLocaleString("es-CL")} + Extras $${totalExtras.toLocaleString("es-CL")} + Comisiones $${totalCommissions.toLocaleString("es-CL")}\n`;
    context += `  • Margen bruto: $${(totalSalesAmount - totalExpenses).toLocaleString("es-CL")}\n`;
    context += `  • Revenue neto: $${totalRevenue.toLocaleString("es-CL")}\n`;
    context += `  • Ingresos mes actual: $${monthlyRevenue.toLocaleString("es-CL")}\n`;
    context += `  • Gastos fijos mensuales (adicional): $${totalFixedExpenses.toLocaleString("es-CL")}\n`;
    context += `  • Comisiones pagadas: $${totalCommissions.toLocaleString("es-CL")}\n\n`;
    context += `👥 CLIENTES Y LEADS:\n`;
    context += `  • Total clientes: ${customers.data?.length || 0}\n`;
    // Separar leads por tipo (compra/venta) como la página de leads
    const buyTypes = ["buy-direct", "buy-consignment", "search-request"];
    const sellTypes = ["sell-vehicle", "sell-financing", "sell-transfer", "contact-general"];
    const allLeads = leads.data || [];
    const buyLeads = allLeads.filter((l) => buyTypes.includes(l.type));
    const sellLeads = allLeads.filter((l) => sellTypes.includes(l.type));
    context += `  • Total leads: ${allLeads.length} (${buyLeads.length} de compra + ${sellLeads.length} de venta)\n`;
    const closingRate = allLeads.length > 0 ? (soldVehicles.length / allLeads.length * 100).toFixed(1) : "0.0";
    context += `  • Tasa de conversión (closing rate): ${closingRate}%\n`;
    if (buyLeads.length > 0) {
      const buyByStatus = buyLeads.reduce((acc, l) => { acc[l.status || "sin_estado"] = (acc[l.status || "sin_estado"] || 0) + 1; return acc; }, {});
      context += `  • Leads de COMPRA (${buyLeads.length}):\n`;
      Object.entries(buyByStatus).forEach(([status, count]) => { context += `    - ${status}: ${count}\n`; });
    }
    if (sellLeads.length > 0) {
      const sellByStatus = sellLeads.reduce((acc, l) => { acc[l.status || "sin_estado"] = (acc[l.status || "sin_estado"] || 0) + 1; return acc; }, {});
      context += `  • Leads de VENTA (${sellLeads.length}):\n`;
      Object.entries(sellByStatus).forEach(([status, count]) => { context += `    - ${status}: ${count}\n`; });
    }
    context += `\n`;
    // TOP 10: Most Viewed Vehicles
    if (mostViewedVehicles.length > 0) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   👁️  TOP 10 VEHÍCULOS MÁS VISITADOS EN LA WEB\n`;
      context += `   (Calculado desde ${validVisitCount} visitas web reales)\n`;
      context += `═══════════════════════════════════════════════════════════════\n\n`;
      mostViewedVehicles.forEach((v, idx)=>{
        context += `${idx + 1}. ${v.brand?.name || "N/A"} ${v.model?.name || "N/A"} ${v.year}\n`;
        context += `   👁️  Visitas web: ${v.visitCount} | 💵 Precio: $${(v.price || 0).toLocaleString("es-CL")}\n`;
        context += `   📅 ${v.daysInStock} días en stock | Estado: ${v.status?.name || "N/A"} | ID: ${v.id}\n\n`;
      });
    } else if (pageVisits.data && pageVisits.data.length > 0) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   ⚠️  VEHÍCULOS MÁS VISITADOS\n`;
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `Se registraron ${pageVisits.data.length} visitas, pero ninguna corresponde a vehículos activos en inventario.\n\n`;
    }
    // TOP 10: Oldest Vehicles
    if (oldestVehicles.length > 0) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   TOP 10 VEHÍCULOS CON MÁS DÍAS EN STOCK (ANTIGUOS)\n`;
      context += `═══════════════════════════════════════════════════════════════\n\n`;
      oldestVehicles.forEach((v, idx)=>{
        context += `${idx + 1}. ${v.brand?.name || "N/A"} ${v.model?.name || "N/A"} ${v.year}\n`;
        context += `   ⏰ ${v.daysInStock} DÍAS EN STOCK | 💵 $${(v.price || 0).toLocaleString("es-CL")}\n`;
        context += `   Estado: ${v.status?.name || "N/A"} | ID: ${v.id}\n\n`;
      });
    }
    // Brand distribution
    if (brandDistributionFinal.length > 0) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   🚗 DISTRIBUCIÓN DE INVENTARIO POR MARCA\n`;
      context += `═══════════════════════════════════════════════════════════════\n\n`;
      brandDistributionFinal.forEach((brand)=>{
        const percentage = (brand.value / (allVehicles.data?.length || 1) * 100).toFixed(1);
        context += `🚗 ${brand.name}: ${brand.value} vehículos (${percentage}%)\n`;
      });
      context += `\n`;
    }
    // Seller performance
    if (sellerPerformance.length > 0) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   👥 PERFORMANCE DE VENDEDORES\n`;
      context += `═══════════════════════════════════════════════════════════════\n\n`;
      sellerPerformance.forEach((seller, idx)=>{
        context += `${idx + 1}. ${seller.name}\n`;
        context += `   💰 Ventas: $${seller.sales.toLocaleString("es-CL")} (${seller.vehiclesSold} vehículos vendidos)\n`;
        context += `   💵 Comisiones: $${seller.commissions.toLocaleString("es-CL")}\n`;
        context += `   📋 Vehículos asignados: ${seller.assignedVehicles}\n`;
        context += `   📧 ${seller.email}\n\n`;
      });
    }
    // Active Vehicles Inventory (detallado, agrupado por estado usando status.name)
    if (activeVehicles.length > 0) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   INVENTARIO ACTIVO (${activeVehicles.length} vehículos)\n`;
      context += `═══════════════════════════════════════════════════════════════\n\n`;
      const byStatus = activeVehicles.reduce((acc, v)=>{
        const statusLabel = v.status?.name || "Sin estado";
        if (!acc[statusLabel]) acc[statusLabel] = [];
        acc[statusLabel].push(v);
        return acc;
      }, {});
      Object.entries(byStatus).forEach(([status, vehicles])=>{
        context += `\n▶ ${status.toUpperCase()} (${vehicles.length} vehículos):\n\n`;
        vehicles.slice(0, 5).forEach((v)=>{
          const vehicleData = vehiclesWithDaysInStock.find((vd)=>vd.id === v.id);
          context += `  🚗 ${v.brand?.name || "N/A"} ${v.model?.name || "N/A"} ${v.year}`;
          context += ` | 💵 $${(v.price || 0).toLocaleString("es-CL")}`;
          context += ` | 📅 ${vehicleData?.daysInStock || 0} días`;
          context += ` | ID: ${v.id}\n`;
        });
        if (vehicles.length > 5) {
          context += `  ... y ${vehicles.length - 5} vehículos más en este estado\n\n`;
        } else {
          context += `\n`;
        }
      });
    }
    // Reserved Vehicles Summary
    if (reservedVehicles.length > 0) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   VEHÍCULOS RESERVADOS (${reservedVehicles.length} total)\n`;
      context += `═══════════════════════════════════════════════════════════════\n`;
      reservedVehicles.slice(0, 10).forEach((v: any)=>{
        context += `  🚗 ${v.brand?.name || "N/A"} ${v.model?.name || "N/A"} ${v.year}`;
        context += ` | 💵 $${(v.price || 0).toLocaleString("es-CL")}`;
        context += ` | ID: ${v.id}\n`;
      });
      context += `\n`;
    }
    // Sold Vehicles Summary
    if (soldVehicles.length > 0) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   VEHÍCULOS VENDIDOS (${soldVehicles.length} total)\n`;
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `Ver detalles completos en sección "DETALLE DE VENTAS" más abajo.\n\n`;
    }
    // Archived Vehicles Summary
    if (archivedVehicles.length > 0) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   VEHÍCULOS ARCHIVADOS (${archivedVehicles.length} total)\n`;
      context += `═══════════════════════════════════════════════════════════════\n`;
      archivedVehicles.slice(0, 10).forEach((v: any)=>{
        context += `  🚗 ${v.brand?.name || "N/A"} ${v.model?.name || "N/A"} ${v.year}`;
        context += ` | 💵 $${(v.price || 0).toLocaleString("es-CL")}`;
        context += ` | ID: ${v.id}\n`;
      });
      context += `\n`;
    }
    // Sales Details (últimas 10)
    if (vehiclesSalesRaw.data && vehiclesSalesRaw.data.length > 0) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   DETALLE DE VENTAS (${vehiclesSalesRaw.data.length} ventas totales, mostrando últimas 10)\n`;
      context += `═══════════════════════════════════════════════════════════════\n\n`;
      vehiclesSalesRaw.data.slice(0, 10).forEach((s)=>{
        const customer = customers.data?.find((c)=>c.id === s.customer_id);
        const seller = users.data?.find((u)=>u.id === s.seller_id);
        const vehicle = allVehicles.data?.find((v)=>v.id === s.vehicle_id);
        context += `💰 ${s.sale_date || "N/A"} | ${vehicle?.brand?.name || "N/A"} ${vehicle?.model?.name || "N/A"} ${vehicle?.year || ""}`;
        context += ` | $${(s.sale_price || 0).toLocaleString("es-CL")}`;
        context += ` | ${seller?.full_name || "N/A"}\n`;
      });
      if (vehiclesSalesRaw.data.length > 10) {
        context += `\n... y ${vehiclesSalesRaw.data.length - 10} ventas más\n`;
      }
      context += `\n`;
    }
    // Financing summary
    if (financing.data && financing.data.length > 0) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   FINANCIAMIENTOS ACTIVOS: ${financing.data.length}\n`;
      context += `═══════════════════════════════════════════════════════════════\n\n`;
    }
    // Leads summary
    if (leads.data && leads.data.length > 0) {
      context += `═══════════════════════════════════════════════════════════════\n`;
      context += `   LEADS/PROSPECTOS: ${leads.data.length} (Ver desglose en sección KPI)\n`;
      context += `═══════════════════════════════════════════════════════════════\n\n`;
    }
    // Final note
    context += `═══════════════════════════════════════════════════════════════\n`;
    context += `NOTA: Tienes herramientas de consulta para buscar datos específicos en tiempo real.\n`;
    context += `Para preguntas generales (KPIs, resúmenes, totales), usa el contexto anterior.\n`;
    context += `Para preguntas específicas (último lead, vehículo X, cliente Y), usa las herramientas de consulta.\n`;
    context += `═══════════════════════════════════════════════════════════════\n\n`;

    // =================================================================
    // USER GUIDE — HOW TO USE GOAUTO (for teaching users)
    // Full content from docs/user-guide/*.md
    // =================================================================
    context += `═══════════════════════════════════════════════════════════════\n`;
    context += `   GUÍA DE USO COMPLETA DE GOAUTO — PARA ENSEÑAR AL USUARIO\n`;
    context += `═══════════════════════════════════════════════════════════════\n\n`;

    context += `# GoAuto — Guía General

## ¿Qué es GoAuto?

GoAuto es una plataforma completa de gestión para automotoras. Permite administrar todo el negocio desde un solo lugar: inventario de vehículos, ventas, clientes, financiamiento, marketing, equipo de trabajo y sitio web.

## Módulos Principales

| Módulo | Para qué sirve |
|--------|----------------|
| **Dashboard** | Ver métricas del negocio en tiempo real |
| **Vehículos** | Gestionar el inventario completo |
| **Ventas** | Registrar y aprobar ventas |
| **Clientes** | Base de datos de clientes |
| **Leads** | Gestionar oportunidades de negocio |
| **Financiamiento** | Administrar ventas a plazo |
| **Tareas** | Organizar el trabajo del equipo |
| **Calendario** | Agendar citas y eventos |
| **Documentos** | Generar y gestionar documentación |
| **Marketing** | Campañas y recomendaciones inteligentes |
| **Builder** | Diseñar el sitio web de la automotora |
| **Integraciones** | ChileAutos, Instagram, Facebook, MercadoLibre |
| **Configuración** | Personalizar el sistema |

## Roles de Usuario

- **Administrador** — Acceso completo al sistema
- **Vendedor** — Puede registrar ventas (requieren aprobación), ver vehículos y clientes
- **Roles personalizados** — El admin puede crear roles con permisos específicos

## Navegación

La barra lateral izquierda muestra todos los módulos disponibles según tus permisos. Los badges rojos indican items pendientes (leads nuevos, tareas, etc.).

---

# Vehículos — Guía de Usuario

## Acceso
Menú lateral → **Vehículos**

## Vista del Inventario

Al entrar ves tu inventario completo. Puedes cambiar entre tres vistas:

- **Tabla** — Vista clásica con todas las columnas. Puedes configurar qué columnas ver con el botón de engranaje.
- **Tablero** — Vista tipo Kanban organizada por estados (Publicado, En Preparación, Vendido, etc.). Puedes arrastrar vehículos entre estados.
- **Cards (móvil)** — Vista optimizada para celular.

### Filtros
Usa los filtros para buscar por marca, modelo, año, precio, estado, etc. Los filtros se mantienen mientras navegas.

### Cards de Estado
En la parte superior ves un resumen rápido: cuántos vehículos tienes en cada estado.

## Agregar un Vehículo

1. Click en **"+ Agregar"**
2. Completa los pasos:
   - **Info básica** — Marca, modelo, año, patente, color, combustible, transmisión
   - **Fotos** — Sube las fotos del vehículo (se comprimen automáticamente)
   - **Adquisición** — Costo, tipo (compra directa o consignación), datos bancarios
   - **Ventas** — Precio de venta
   - **Resumen** — Revisa todo y confirma

### Autocompletar por Patente
Si ingresas la patente chilena, el sistema puede autocompletar marca, modelo, año, combustible y más datos automáticamente.

## Detalle del Vehículo

Al hacer click en un vehículo ves:

- **Resumen** — Foto principal, precio, costo, margen, días publicado
- **Timeline** — Historial de todo lo que ha pasado con el vehículo
- **Detalles** — Especificaciones técnicas completas
- **Documentos** — Documentos asociados (compra, venta, consignación, etc.)
- **Checklist** — Lista de verificación de preparación

### Acciones desde el detalle
- Vender el vehículo
- Reservar
- Generar cotización
- Publicar en ChileAutos
- Editar información
- Cambiar estado

## Importar / Exportar

- **Importar** — Sube un archivo Excel para agregar múltiples vehículos a la vez
- **Exportar** — Descarga tu inventario actual como Excel

---

# Ventas — Guía de Usuario

## Acceso
Menú lateral → **Ventas**

## ¿Cómo funciona una venta?

### Registrar una venta

1. Ve al **detalle de un vehículo**
2. Click en **"Vender"**
3. Completa los pasos:
   - **Cliente** — Selecciona un cliente existente o crea uno nuevo
   - **Info de venta** — Precio de venta, método de pago (efectivo, crédito, transferencia), vendedor asignado
   - **Parte de pago** — Si el cliente entrega un vehículo como parte de pago (opcional)
   - **Pagos** — Desglose de pagos (abonos, cuotas)
   - **Resumen** — Revisa y confirma

### Aprobación de ventas

- Si un **administrador** registra la venta → se aprueba automáticamente y el vehículo se marca como vendido
- Si un **vendedor** registra la venta → queda como **pendiente** hasta que un admin la revise

### Revisar ventas pendientes

1. En la página de **Ventas**, la pestaña por defecto muestra las ventas **pendientes**
2. Click en **"Revisar"** en la venta que quieras
3. Puedes:
   - **Aprobar** — La venta se confirma y el vehículo pasa a "Vendido"
   - **Rechazar** — La venta se cancela y el vehículo vuelve a estar disponible
   - Ajustar la **comisión** del vendedor antes de aprobar

### Estados de una venta

| Estado | Significado |
|--------|------------|
| Pendiente (amarillo) | Esperando aprobación del admin |
| Aprobada (verde) | Venta confirmada, vehículo vendido |
| Rechazada (rojo) | Venta cancelada |

### Comisiones

- Las comisiones se calculan automáticamente según la configuración del vendedor
- Se pueden calcular sobre el **precio total** o sobre el **margen** (precio - costo)
- Se puede dividir la comisión entre varios vendedores

## Integración con ChileAutos

Si tienes ChileAutos configurado con "sincronizar al vender", al aprobar una venta el vehículo se marca automáticamente como vendido en ChileAutos.

---

# Leads — Guía de Usuario

## Acceso
Menú lateral → **Leads**

## ¿Qué es un lead?

Un lead es una oportunidad de negocio. Puede ser alguien que:
- Quiere **comprar** un vehículo
- Quiere **vender** o **consignar** su vehículo
- Busca **financiamiento**
- Solicita una **transferencia**
- Hace un **contacto** general

## Vistas

### Kanban
Vista de tablero con columnas por estado. Arrastra los leads entre columnas para cambiar su estado.

### Tabla
Vista lista con todos los datos visibles y filtros avanzados.

## Gestionar un Lead

1. Click en un lead para ver su detalle
2. En el panel lateral puedes:
   - Ver toda la información del lead
   - Cambiar su estado
   - Asignar a un vendedor
   - Agregar notas
   - Contactar al cliente

## Filtros

Filtra por:
- Tipo de lead (compra, venta, financiamiento, etc.)
- Estado
- Fecha
- Vendedor asignado

## Notificaciones

Los nuevos leads pueden notificarte por:
- Badge en el menú lateral
- Notificación push
- WhatsApp (si configurado)

## Cards de Estado

En la parte superior ves métricas de conversión: cuántos leads tienes en cada etapa y tasas de conversión.

---

# Financiamiento — Guía de Usuario

## Acceso
Menú lateral → **Financiamiento**

## ¿Para qué sirve?

El módulo de financiamiento te permite gestionar ventas a plazo directamente desde la plataforma. Puedes crear planes de pago, registrar cuotas y hacer seguimiento del progreso.

## Crear un Financiamiento

1. En la página de Financiamiento, click en **"Nuevo financiamiento"**
2. Selecciona el **vehículo** y el **cliente**
3. Define:
   - **Pie** — Monto inicial que paga el cliente
   - **Cuota mensual** — Valor de cada cuota
   - **Cantidad de cuotas** — Total de pagos
   - **Tasa de interés** — Porcentaje aplicado
4. El sistema genera automáticamente el calendario de pagos

## Lista de Financiamientos

Ves todos los financiamientos con:
- Nombre del cliente
- Vehículo asociado
- Pie y cuota mensual
- Estado (al día, atrasado, completado)
- Próximo pago
- Barra de progreso

## Detalle del Financiamiento

Al hacer click en uno ves:
- **Info del cliente y vehículo**
- **Calendario de pagos** — Todas las cuotas con fecha y estado
- **Registrar pago** — Marca cuotas como pagadas
- **Progreso** — Cuántas cuotas se han pagado vs. total

---

# Clientes — Guía de Usuario

## Acceso
Menú lateral → **Clientes**

## ¿Qué puedes hacer?

### Ver clientes
La tabla muestra todos tus clientes con nombre, RUT, email, teléfono y fecha de registro. Usa la barra de búsqueda para encontrar rápidamente.

### Agregar un cliente
Click en **"+ Nuevo cliente"** y completa nombre, apellido, RUT, email, teléfono y fecha de nacimiento.

### Editar un cliente
Click en un cliente de la tabla para editar su información.

### Importar desde Excel
Si ya tienes una base de clientes, puedes importarla masivamente:
1. Click en **"Importar"**
2. Sube tu archivo Excel
3. Mapea las columnas
4. Confirma la importación

## ¿Dónde se usan los clientes?

Los clientes se seleccionan al:
- Registrar una **venta**
- Crear un **financiamiento**
- Registrar un **lead**
- Hacer una **reserva**
- Generar **documentos** (cotización, compraventa, etc.)

---

# Tareas y Calendario — Guía de Usuario

## Tareas

### Acceso
Menú lateral → **Tareas**

### Vista Kanban
Las tareas se organizan en un tablero con tres columnas:
- **Pendiente** — Tareas por hacer
- **En progreso** — Tareas en las que se está trabajando
- **Completada** — Tareas terminadas

Arrastra las tareas entre columnas para cambiar su estado.

### Crear una tarea
1. Click en **"+ Nueva tarea"**
2. Define:
   - Título y descripción
   - Prioridad
   - Asignado a (quién la hará)
   - Fecha límite

### Tipos de tareas
- **Manuales** — Las creas tú mismo
- **De checklist** — Se generan automáticamente desde el checklist de preparación de un vehículo

## Calendario

### Acceso
Menú lateral → **Calendario**

### ¿Qué muestra?
El calendario unifica:
- **Eventos** que tú creas
- **Tareas** con fecha límite
- **Agendamientos** de clientes
- **Vencimientos** de documentos de vehículos

### Crear un evento
Click en una fecha o en **"+ Nuevo evento"** y completa título, fecha, hora y descripción.

## Agendamientos

### Acceso
Menú lateral → **Agendamientos**

### ¿Para qué sirve?
Para gestionar citas con clientes (test drives, visitas, entrega de vehículos). Puedes ver las citas en formato calendario o tabla.

## Solicitudes de Vehículos

### Acceso
Menú lateral → **Solicitudes**

### ¿Para qué sirve?
Cuando un cliente busca un vehículo específico que no tienes en stock, puedes crear una solicitud. Se gestionan con un tablero Kanban similar al de tareas.

---

# Integraciones — Guía de Usuario

## ChileAutos

### Acceso
Menú lateral → **ChileAutos**

### Configuración inicial
1. Ingresa tu **Seller Identifier** de ChileAutos
2. Conecta con tu cuenta OAuth
3. Configura la sincronización automática:
   - **Al publicar** — Se publica en ChileAutos cuando cambias un vehículo a "Publicado"
   - **Al editar** — Se actualiza en ChileAutos cuando editas el vehículo
   - **Al vender** — Se marca como vendido en ChileAutos cuando apruebas una venta

### Publicar vehículos
- Publica vehículos individuales desde el detalle del vehículo
- O usa la sincronización masiva desde la página de ChileAutos

### Productos premium
Puedes agregar productos premium a tus publicaciones (topspot, showcase, certificado).

## Instagram

### Acceso
Menú lateral → **Instagram**

### Funcionalidades
- Publica fotos de vehículos directamente
- Gestiona mensajes directos de Instagram
- Recibe notificaciones de nuevos mensajes

## Facebook Marketplace

### Acceso
Menú lateral → **Facebook Marketplace**

### Funcionalidades
- Selecciona vehículos para publicar
- Ve el estado de tus publicaciones

## Mercado Libre

### Acceso
Menú lateral → **Mercado Libre**

### Funcionalidades
- Integración con tu cuenta de vendedor
- Métricas de reputación

## WhatsApp

### Configuración
Configuración → **Mensajería** → WhatsApp

### Notificaciones automáticas
Configura para recibir WhatsApp cuando:
- Llega un nuevo lead
- Recibes un mensaje de Instagram
- Un cliente solicita financiamiento
- Un cliente agenda un test drive

---

# Website Builder — Guía de Usuario

## Acceso
Menú lateral → **Builder**

## ¿Qué es?

El builder te permite diseñar el sitio web de tu automotora sin necesidad de programar. Es un editor visual donde arrastras secciones y las personalizas.

## Empezar

### Elegir un template
Al entrar por primera vez, elige un template base:
- **Clásico** — Diseño tradicional, limpio y profesional
- **Moderno** — Estilo contemporáneo con animaciones
- **Premium** — Diseño oscuro ultra premium estilo Porsche/Mercedes
- **Minimalista** — Simple y directo

### Personalizar

1. **Arrastra secciones** desde el panel izquierdo al área de edición
2. **Edita textos** haciendo click directamente sobre ellos
3. **Configura cada sección** desde el panel de settings al seleccionarla
4. **Cambia colores** desde el panel de tema
5. **Preview** en desktop, tablet y móvil con el selector de dispositivo

## Secciones Disponibles

### Hero (Portada)
Más de 13 estilos de portada: con imagen de fondo, con buscador, con cards, minimalista, etc.

### Vehículos
Muestra tu inventario con diferentes layouts: grilla, carrusel, lista, con filtros.

### Contenido
- Por qué elegirnos
- Preguntas frecuentes
- Equipo de trabajo
- Testimonios

### Galería
Galería de fotos. La **Galería Premium** autocarga fotos reales de tus vehículos.

### Contacto
- Llamada a la acción con botón
- Mapa de ubicación

### Marketing
- Contador de estadísticas
- Banner promocional

## Guardar

Los cambios se guardan automáticamente. Tu sitio web se actualiza en tiempo real.

---

# Dashboard — Guía de Usuario

## Acceso
Es la página principal al entrar al sistema.

## ¿Qué muestra?

El dashboard tiene varias pestañas según tus permisos:

### Comercial
Métricas de tu negocio:
- **Ventas totales** — Cuánto has vendido en el periodo
- **Gastos** — Tus gastos del periodo
- **Margen bruto** — Tu ganancia (ventas - costos)
- **Valor del inventario** — Cuánto vale tu stock actual
- **Rendimiento** — Indicadores de eficiencia
- **Alertas** — El sistema detecta situaciones que requieren atención
- **Resumen comercial** — Métricas promedio por vehículo vendido

### Inventario
- Cuántos vehículos tienes por estado
- Gráficos de rotación
- Vehículos que llevan mucho tiempo sin venderse
- Recomendaciones de stock

### Web
- Visitas a tu sitio web
- Páginas más vistas
- Tendencias de tráfico

### Vendedores
- Ranking de vendedores por ventas
- Comisiones acumuladas
- Performance individual

## Periodo de Tiempo

Puedes cambiar el periodo para ver datos de:
- Hoy
- Esta semana
- Este mes
- Personalizado

## Alertas

El sistema analiza automáticamente tu negocio y te avisa sobre:
- Vehículos que llevan mucho tiempo publicados
- Documentos próximos a vencer
- Métricas que bajan respecto al periodo anterior

---

# Configuración — Guía de Usuario

## Acceso
Menú lateral → **Configuración**

## Secciones

### General
- Nombre de la automotora
- Logo y favicon
- Colores del tema (primario, secundario)
- Moneda (CLP o USD)
- Idioma (español, inglés, portugués)

### Sucursales
- Gestiona múltiples sucursales
- Dirección, teléfono, email por sucursal
- Ubicación en mapa

### Info Legal
- Razón social, RUT de la empresa
- Representante legal
- Dirección legal

### Vehículos
- **Estados personalizados** — Crea y ordena los estados de tus vehículos (Publicado, En Preparación, Reservado, Vendido, etc.)
- **Campos obligatorios de documentación** — Elige qué documentos son obligatorios al agregar un vehículo (revisión técnica, permiso de circulación, etc.)
- **Configuración de página** — Personaliza la vista de vehículos

### Checklist
- Configura items del checklist de preparación de vehículos
- Los items se convierten en tareas automáticas

### Notificaciones
- **Push** — Activa/desactiva notificaciones push
- **WhatsApp** — Configura número y triggers para notificaciones WhatsApp

## Equipo

### Acceso
Menú lateral → **Equipo**

### Pestañas

#### Administradores
Gestiona usuarios con rol admin.

#### Vendedores
Gestiona vendedores con:
- Comisiones configurables por tramos
- Base de cálculo (precio total o margen)

#### Roles
Crea roles personalizados con permisos específicos. Cada permiso controla acceso a un módulo o funcionalidad.

---

# Documentos — Guía de Usuario

## Acceso
Menú lateral → **Documentos**

## Tipos de Documentos

| Tipo | Cuándo se genera |
|------|-----------------|
| **Compraventa** | Al registrar una venta |
| **Compra** | Al registrar la compra de un vehículo |
| **Consignación** | Al recibir un vehículo en consignación |
| **Reserva** | Al reservar un vehículo |
| **Cotización** | Al cotizar un vehículo para un cliente |
| **Cierre de negocio** | Al cerrar formalmente un trato |

## Templates Personalizables

Cada tipo de documento tiene una plantilla que puedes personalizar:

1. Ve a **Documentos → Templates**
2. Selecciona el tipo de documento
3. Edita el contenido usando **variables dinámicas**:
   - {cliente_nombre} — Nombre del cliente
   - {vehiculo_marca} — Marca del vehículo
   - {vehiculo_modelo} — Modelo
   - {precio_venta} — Precio de venta
   - Y muchas más...

## Numeración Automática

Los documentos se numeran automáticamente de forma secuencial. El formato es configurable.

## Generar un Documento

Desde el **detalle de un vehículo**:
1. Ve a la pestaña **Documentos**
2. Click en **"Generar documento"**
3. Selecciona el tipo
4. Selecciona el cliente
5. Revisa y confirma

---

# Marketing y Alertas — Guía de Usuario

## Marketing

### Acceso
Menú lateral → **Marketing**

### ¿Qué hace?
El módulo de marketing te ayuda a identificar clientes potenciales para tus vehículos. El sistema analiza el historial de compras y preferencias de tus clientes para recomendar a quién contactar para cada vehículo.

### Funcionalidades
- **Recomendaciones automáticas** — El sistema sugiere clientes que podrían estar interesados en un vehículo específico
- **Segmentación** — Filtra clientes por preferencias, historial, ubicación
- **Campañas** — Organiza contactos por campaña

## Alertas

### Acceso
Menú lateral → **Alertas**

### ¿Qué son?
Son alertas automáticas que el sistema genera analizando tu negocio. Te avisan sobre situaciones que necesitan atención:

- **Vencimientos** — Documentos de vehículos próximos a vencer (revisión técnica, permisos, etc.)
- **Stock estancado** — Vehículos que llevan mucho tiempo sin venderse
- **Tendencias negativas** — Métricas que están bajando
- **Oportunidades** — Situaciones donde podrías mejorar

### KPIs
La página muestra tarjetas con indicadores clave y panel de sugerencias de IA.

## Tasador

### Acceso
Menú lateral → **Tasador**

### ¿Qué hace?
Herramienta de valorización de vehículos asistida por IA. Ingresa los datos del vehículo y obtén un rango de precio estimado basado en datos del mercado.

## Asistente IA (GAIA)

### Acceso
Menú lateral → **Asistente**

### ¿Qué hace?
Chat con inteligencia artificial que puede responder preguntas sobre tu negocio, ayudarte a entender métricas, y asistirte con tareas del día a día. Guarda historial de conversaciones.

`;

    context += `═══════════════════════════════════════════════════════════════\n\n`;

    // =================================================================
    // SYSTEM PROMPT (updated with tool instructions)
    // =================================================================
    const toolInstructions = language === "en"
      ? `

REAL-TIME QUERY TOOLS:
You have access to database query tools to fetch specific, real-time data:
- query_vehicles: Search vehicles by ID, brand, model, year, price, license plate, status, etc.
- query_leads: Search leads by ID, status, type, customer name, date range
- query_customers: Search customers by ID, name, email, phone, RUT
- query_sales: Search sales by ID, seller, status, date range, customer name
- query_financing: Search financing by ID, customer, vehicle, with payment details
- query_team: Search team members, roles, permissions, commissions. Use for "who are my sellers", "team permissions", "commission tiers"
- query_documents: Search quotations, reservations, close deals, document templates. Use for "pending quotations", "active reservations", "configured templates"
- query_appointments: Search appointments/bookings. Use for "tomorrow's appointments", "this week's schedule", "upcoming test drives"
- query_marketing: Check marketing integrations (Instagram, MercadoLibre, Facebook, ChileAutos) and email history. Use for "is Instagram connected?", "how many cars on MercadoLibre?", "email history"
- query_expenses: Search fixed monthly expenses, vehicle expenses, transaction categories. Use for "monthly fixed expenses", "vehicle X expenses", "expense categories"
- query_config: Search system configuration: legal info, dealerships, vehicle states, checklist, website config, brands, models, colors, conditions, fuel types, categories, commission tiers. Use for "company legal info", "configured brands", "vehicle states"
- appraise_vehicle: Appraise a vehicle by searching real listings in the Chilean market (Chileautos, Yapo, Kavak, etc.) and calculating a market price range. Use when asked about a vehicle's market value, price estimate, appraisal, or price comparison. Provide brand, model, year and mileage in the query.
- create_task: Create a task in the system. Use when the user asks to create, add or register a task, reminder or to-do. Calculate relative dates (tomorrow, Friday, next week) into ISO 8601 format based on today's date.

WHEN TO USE TOOLS vs STATIC CONTEXT:
- Use STATIC CONTEXT (above) for: KPIs, totals, summaries, counts, percentages, general overviews
- Use QUERY TOOLS for: specific records (last lead, vehicle with plate X, customer named Y), detailed information about specific entities, filtered searches, team info, documents, appointments, marketing, expenses, configuration
- IMPORTANT: If asked about legal info, team, documents, appointments, marketing, expenses or configuration and you don't have enough data in the static context, USE THE CORRESPONDING TOOL. Never say "I don't have access" without first trying to use the tool.

TOOL USAGE RULES:
- Always present results in a structured, readable format (markdown tables, lists)
- When showing vehicle details, include: brand, model, year, price, status, license plate, days in stock
- When showing customer details, include: name, email, phone, RUT
- When showing lead details, include: type, status, customer info, creation date
- When showing sale details, include: vehicle, customer, price, date, seller, payment method
- When showing team details, include: name, email, role, phone
- When showing document details, include: type, status, vehicle info, customer, date
- When showing appointment details, include: date, time, status, customer, vehicle
- When showing marketing details, include: platform, connection status, active posts count
- When showing expense details, include: description, amount, category, active status
- When showing config details, include: all relevant fields for the entity
- If a query returns no results, inform the user clearly`
      : `

HERRAMIENTAS DE CONSULTA EN TIEMPO REAL:
Tienes acceso a herramientas de consulta para obtener datos específicos en tiempo real:
- query_vehicles: Buscar vehículos por ID, marca, modelo, año, precio, patente, estado, etc.
- query_leads: Buscar leads por ID, estado, tipo, nombre de cliente, rango de fechas
- query_customers: Buscar clientes por ID, nombre, email, teléfono, RUT
- query_sales: Buscar ventas por ID, vendedor, estado, rango de fechas, nombre de cliente
- query_financing: Buscar financiamientos por ID, cliente, vehículo, con detalle de cuotas
- query_team: Buscar miembros del equipo, roles, permisos, comisiones. Usar para "quiénes son mis vendedores", "permisos del equipo", "tiers de comisiones"
- query_documents: Buscar cotizaciones, reservas, cierres de negocio, plantillas de documentos. Usar para "cotizaciones pendientes", "reservas activas", "plantillas configuradas"
- query_appointments: Buscar agendamientos/citas. Usar para "citas de mañana", "agenda de esta semana", "próximos test drives"
- query_marketing: Consultar integraciones de marketing (Instagram, MercadoLibre, Facebook, ChileAutos) e historial de emails. Usar para "está conectado Instagram?", "cuántos autos en MercadoLibre?", "historial de emails"
- query_expenses: Buscar gastos fijos mensuales, gastos por vehículo, categorías de transacciones. Usar para "gastos fijos mensuales", "gastos del vehículo X", "categorías de gastos"
- query_config: Buscar configuración del sistema: info legal, sucursales, estados de vehículos, checklist, config web, marcas, modelos, colores, condiciones, tipos de combustible, categorías, tiers de comisiones. Usar para "info legal", "marcas configuradas", "estados de vehículos"
- appraise_vehicle: Tasar un vehículo buscando publicaciones reales en el mercado chileno (Chileautos, Yapo, Kavak, etc.) y calculando un rango de precio de mercado. Usar cuando pregunten por el valor de mercado de un auto, cuánto vale, tasación, rango de precios. Incluir marca, modelo, año y kilometraje en el query.
- create_task: Crear una tarea en el sistema. Usar cuando el usuario pida crear, agregar o registrar una tarea, recordatorio o pendiente. Calcular fechas relativas (mañana, el viernes, la próxima semana) en formato ISO 8601 según la fecha actual.

CUÁNDO USAR HERRAMIENTAS vs CONTEXTO ESTÁTICO:
- Usa el CONTEXTO ESTÁTICO (arriba) para: KPIs, totales, resúmenes, conteos, porcentajes, visiones generales
- Usa las HERRAMIENTAS DE CONSULTA para: registros específicos (último lead, vehículo con patente X, cliente llamado Y), información detallada de entidades específicas, búsquedas filtradas, equipo, documentos, citas, marketing, gastos, configuración
- IMPORTANTE: Si te preguntan por info legal, equipo, documentos, citas, marketing, gastos o configuración y NO tienes datos suficientes en el contexto estático, USA LA HERRAMIENTA CORRESPONDIENTE. Nunca digas "no tengo acceso" sin antes intentar usar la herramienta.

REGLAS DE USO DE HERRAMIENTAS:
- Presenta siempre los resultados de forma estructurada y legible (tablas markdown, listas)
- Al mostrar detalles de vehículos, incluye: marca, modelo, año, precio, estado, patente, días en stock
- Al mostrar detalles de clientes, incluye: nombre, email, teléfono, RUT
- Al mostrar detalles de leads, incluye: tipo, estado, info del cliente, fecha de creación
- Al mostrar detalles de ventas, incluye: vehículo, cliente, precio, fecha, vendedor, método de pago
- Al mostrar detalles del equipo, incluye: nombre, email, rol, teléfono
- Al mostrar detalles de documentos, incluye: tipo, estado, info del vehículo, cliente, fecha
- Al mostrar detalles de citas, incluye: fecha, hora, estado, cliente, vehículo
- Al mostrar detalles de marketing, incluye: plataforma, estado de conexión, publicaciones activas
- Al mostrar detalles de gastos, incluye: descripción, monto, categoría, estado activo
- Al mostrar detalles de configuración, incluye: todos los campos relevantes de la entidad
- Si una consulta no retorna resultados, informa al usuario claramente`;

    const systemPrompt = language === "en" ? `You are the AI Assistant for GoAutos Admin - a comprehensive automotive dealership management system.

CRITICAL CONTEXT RULES:
- You are ONLY an assistant for GoAutos Admin software
- ONLY answer questions about THIS dealership's data (client_id: ${clientId})
- DO NOT answer questions outside the scope of this dealership management system
- DO NOT provide general advice unrelated to the data provided
- If asked about topics outside this context, politely redirect to the dealership data

YOUR CAPABILITIES:
- Complete access to ALL dealership data for client_id: ${clientId}
- Answer questions about vehicles, sales, customers, leads, financing, inventory, documents
- Answer questions about team members, roles, permissions, and commissions
- Answer questions about quotations, reservations, close deals, and document templates
- Answer questions about appointments and scheduling
- Answer questions about marketing integrations (Instagram, MercadoLibre, Facebook, ChileAutos) and emails
- Answer questions about fixed expenses, vehicle expenses, and expense categories
- Answer questions about system configuration: legal info, dealerships, vehicle states, checklist, website config, brands, models, colors, conditions, fuel types, categories
- Provide data analysis, statistics, and business insights
- Calculate metrics on demand
- Generate recommendations based on actual data
- Create tables and visual representations in markdown format
- Query the database in real-time for specific records
- TEACH users how to use GoAuto features step by step (use the USER GUIDE section in context)

TEACHING MODE:
When users ask "how do I...", "where can I...", "how does X work", or similar questions about using GoAuto, use the USER GUIDE section in context to provide clear, step-by-step instructions. Be visual: use emojis for navigation steps, numbered lists, and bold key buttons/menu items. Make it feel like a friendly tutorial.

IMPORTANT DATA NOTES:
- "Active vehicles" = vehicles available for sale (not sold, reserved, or archived)
- "Reserved vehicles" = vehicles with "reservado"/"reserved" status
- "Sold vehicles" = vehicles with "vendido"/"sold" status OR present in vehicles_sales table
- "Archived vehicles" = vehicles with "archivado"/"archived" status
- Days in stock = calculated from vehicle created_at date to today (only for active vehicles)
- All prices in Chilean pesos (CLP)
- Total expenses = purchases of sold vehicles (not consigned) + expense-type extras + commissions + fixed monthly expenses

CRITICAL INFORMATION AVAILABLE IN CONTEXT:
The context contains the following sections (in order):

1. EXECUTIVE SUMMARY - KEY METRICS (KPIs)
2. TOP 10 MOST VISITED VEHICLES
3. TOP 10 OLDEST VEHICLES (DAYS IN STOCK)
4. ACTIVE INVENTORY (grouped by status)
5. RESERVED VEHICLES (if any)
6. SOLD VEHICLES (summary)
7. ARCHIVED VEHICLES (if any)
8. SALES DETAILS (last 10)
9. USER GUIDE — HOW TO USE GOAUTO (step-by-step instructions for every feature)

When answering questions about inventory or vehicles, ALWAYS use the KPI "Vehículos por estado" counts for summary questions, and the "INVENTARIO ACTIVO" section for detailed lists.
When answering "how to" questions about using GoAuto, use section 9 (User Guide).

Be professional, concise, and data-driven.${toolInstructions}` : `Eres el Asistente de IA para GoAutos Admin - un sistema completo de gestión de automotoras.

REGLAS CRÍTICAS DE CONTEXTO:
- Eres SOLO un asistente para el software GoAutos Admin
- SOLO responde preguntas sobre los datos de ESTA automotora (client_id: ${clientId})
- NO respondas preguntas fuera del alcance de este sistema de gestión
- NO proporciones consejos generales no relacionados con los datos proporcionados
- Si te preguntan sobre temas fuera de este contexto, redirige cortésmente a los datos de la automotora

TUS CAPACIDADES:
- Acceso completo a TODOS los datos de la automotora para client_id: ${clientId}
- Responder preguntas sobre vehículos, ventas, clientes, leads, financiamiento, inventario, documentos
- Responder preguntas sobre el equipo: miembros, roles, permisos y comisiones
- Responder preguntas sobre cotizaciones, reservas, cierres de negocio y plantillas de documentos
- Responder preguntas sobre agendamientos y citas
- Responder preguntas sobre integraciones de marketing (Instagram, MercadoLibre, Facebook, ChileAutos) y emails
- Responder preguntas sobre gastos fijos, gastos por vehículo y categorías de gastos
- Responder preguntas sobre configuración del sistema: info legal, sucursales, estados de vehículos, checklist, config web, marcas, modelos, colores, condiciones, combustibles, categorías
- Proporcionar análisis de datos, estadísticas e insights de negocio
- Calcular métricas bajo demanda
- Generar recomendaciones basadas en datos reales
- Crear tablas y representaciones visuales en formato markdown
- Consultar la base de datos en tiempo real para registros específicos
- ENSEÑAR a los usuarios cómo usar las funcionalidades de GoAuto paso a paso (usa la sección GUÍA DE USO en el contexto)

MODO ENSEÑANZA:
Cuando los usuarios pregunten "¿cómo hago...?", "¿dónde puedo...?", "¿cómo funciona X?", o preguntas similares sobre cómo usar GoAuto, usa la sección GUÍA DE USO del contexto para dar instrucciones claras paso a paso. Sé visual: usa emojis para pasos de navegación, listas numeradas y **negritas** en botones/menús clave. Que se sienta como un tutorial amigable y profesional.

NOTAS IMPORTANTES SOBRE LOS DATOS:
- "Vehículos activos" = vehículos disponibles para la venta (no vendidos, reservados ni archivados)
- "Vehículos reservados" = vehículos con estado "reservado"/"reserved"
- "Vehículos vendidos" = vehículos con estado "vendido"/"sold" O presentes en tabla vehicles_sales
- "Vehículos archivados" = vehículos con estado "archivado"/"archived"
- Días en stock = calculado desde created_at del vehículo hasta hoy (solo para vehículos activos)
- Todos los precios en pesos chilenos (CLP)
- Gastos totales = compras de vehículos vendidos (no consignados) + extras tipo expense + comisiones + gastos fijos mensuales

El contexto incluye:
1. RESUMEN EJECUTIVO (KPIs) con "Vehículos por estado"
2. TOP 10 VEHÍCULOS MÁS VISITADOS
3. TOP 10 VEHÍCULOS CON MÁS DÍAS EN STOCK
4. INVENTARIO ACTIVO agrupado por estado
5. VEHÍCULOS RESERVADOS (si hay)
6. RESUMEN DE VEHÍCULOS VENDIDOS
7. VEHÍCULOS ARCHIVADOS (si hay)
8. DETALLE DE VENTAS (últimas 10)
9. GUÍA DE USO DE GOAUTO — instrucciones paso a paso de cada funcionalidad

Cuando te pregunten por inventario (ej: "vehículos disponibles", "vehículos en revisión mecánica"):
- Usa SIEMPRE el bloque "Vehículos por estado" para los totales
- Usa la sección "INVENTARIO ACTIVO" para listar ejemplos concretos de vehículos
Cuando te pregunten "¿cómo hago...?" o "¿dónde puedo...?", usa la sección 9 (Guía de Uso).

Sé directo, profesional y basado en datos.${toolInstructions}`;
    // =================================================================
    // CALL OPENAI WITH TOOL CALLING LOOP
    // =================================================================
    console.log("🤖 Calling OpenAI with tools | Context length:", context.length, "chars");

    const conversationMessages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "system", content: context },
      ...messages.map((m)=>({ role: m.role, content: m.content }))
    ];

    const MAX_TOOL_ITERATIONS = 3;
    let finalContent = "";

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      console.log(`🔄 OpenAI call iteration ${iteration + 1}/${MAX_TOOL_ITERATIONS}`);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 4000,
        tools: toolDefinitions,
        tool_choice: "auto",
        messages: conversationMessages
      });

      const responseMessage = response.choices[0]?.message;

      if (!responseMessage) {
        finalContent = language === "en"
          ? "I couldn't process your request. Please try again."
          : "No pude procesar tu solicitud. Por favor intenta de nuevo.";
        break;
      }

      // If no tool calls, we have the final response
      if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
        finalContent = responseMessage.content || (language === "en"
          ? "I couldn't process your request. Please try again."
          : "No pude procesar tu solicitud. Por favor intenta de nuevo.");
        console.log("✅ Final response (no tool calls) at iteration", iteration + 1);
        break;
      }

      // Process tool calls
      console.log(`🔧 Processing ${responseMessage.tool_calls.length} tool call(s)...`);

      // Add the assistant's message with tool_calls to conversation
      conversationMessages.push(responseMessage);

      // Execute each tool call and add results
      for (const toolCall of responseMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          toolArgs = {};
        }

        console.log(`  🔧 Tool: ${toolName} | Args:`, JSON.stringify(toolArgs));

        const toolResult = await handleToolCall(toolName, toolArgs, clientId);

        console.log(`  ✅ Tool ${toolName} result length: ${toolResult.length} chars`);

        conversationMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult
        });
      }

      // If this is the last allowed iteration, force a response without tools
      if (iteration === MAX_TOOL_ITERATIONS - 1) {
        console.log("⚠️ Max tool iterations reached, forcing final response");
        const finalResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 4000,
          messages: conversationMessages
        });
        finalContent = finalResponse.choices[0]?.message?.content || (language === "en"
          ? "I couldn't process your request. Please try again."
          : "No pude procesar tu solicitud. Por favor intenta de nuevo.");
      }
    }

    console.log("✅ Response generated successfully");
    return new Response(JSON.stringify({
      response: finalContent
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error("❌ ERROR:", e.message);
    console.error("Stack:", e.stack);
    return new Response(JSON.stringify({
      error: e.message,
      details: e.stack
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
