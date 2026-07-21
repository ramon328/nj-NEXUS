import { Hono } from 'hono';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { mastra } from '../mastra/index';
import type { AuthUser } from '../lib/auth';
import { parseGaiaResponse, type GaiaBlock, type VehiclePreview, type CustomerPreview } from '../types/gaia-response';

const chat = new Hono();

function extractVehiclePreview(v: any): VehiclePreview {
  return {
    id: v.id,
    brand: v.brand?.name || v.brand || '',
    model: v.model?.name || v.model || '',
    year: v.year || 0,
    price: v.price || 0,
    status: v.status?.name || v.status || '',
    statusColor: v.status?.color || '#94a3b8',
    main_image: v.main_image || undefined,
    license_plate: v.license_plate || undefined,
    mileage: v.mileage || undefined,
    days_in_stock: v.days_in_stock || 0,
    fuel_type: v.fuel_type?.name || v.fuel_type || undefined,
    transmission: v.transmission || undefined,
    condition: v.condition?.name || v.condition || undefined,
  };
}

function extractBlocksFromResult(result: any): GaiaBlock[] {
  const blocks: GaiaBlock[] = [];

  const allToolResults: any[] = [];
  if (result.steps) {
    for (const step of result.steps) {
      if (step.toolResults) allToolResults.push(...step.toolResults);
    }
  }
  if (result.toolResults) allToolResults.push(...result.toolResults);

  for (const tr of allToolResults) {
    try {
      const parsed = typeof tr.result === 'string' ? JSON.parse(tr.result) : tr.result;

      switch (tr.toolName) {
        case 'query_vehicles': {
          if (parsed.vehicles?.length > 0 && parsed.vehicles.length <= 30) {
            const valid = parsed.vehicles.filter((v: any) =>
              v.price >= 100000 && v.year >= 1950 && v.year <= 2027
            );
            if (valid.length > 0) {
              blocks.push({ type: 'vehicle_cards', vehicles: valid.map(extractVehiclePreview) });
            }
          }
          break;
        }

        case 'update_vehicle_price': {
          if (parsed.success) {
            blocks.push({
              type: 'sale_summary',
              vehicle: parsed.message || 'Precio actualizado',
              customer: '',
              price: parsed.new_price,
              details: {
                'Precio anterior': `$${(parsed.old_price || 0).toLocaleString('es-CL')}`,
                'Precio nuevo': `$${(parsed.new_price || 0).toLocaleString('es-CL')}`,
              },
            });
          }
          break;
        }

        case 'update_vehicle_status': {
          if (parsed.success) {
            blocks.push({
              type: 'confirmation',
              action: 'update_vehicle_status',
              summary: parsed.message || 'Estado actualizado',
              details: {
                'Estado anterior': parsed.old_status || '',
                'Estado nuevo': parsed.new_status || '',
              },
            });
          }
          break;
        }

        case 'create_task': {
          if (parsed.success) {
            blocks.push({
              type: 'quick_actions',
              actions: [
                { label: 'Ver mis tareas', message: 'Muéstrame mis tareas pendientes' },
                { label: 'Crear otra tarea', message: 'Quiero crear otra tarea' },
              ],
            });
          }
          break;
        }

        case 'create_customer': {
          if (parsed.success) {
            blocks.push({
              type: 'quick_actions',
              actions: [
                { label: 'Crear cotización', message: `Crea una cotización para ${parsed.name}` },
                { label: 'Crear reserva', message: `Crea una reserva para ${parsed.name}` },
              ],
            });
          }
          break;
        }

        case 'create_quotation': {
          if (parsed.success) {
            blocks.push({
              type: 'sale_summary',
              vehicle: `Cotización #${parsed.quotation_id}`,
              customer: parsed.customer_name || '',
              price: parsed.estimated_price || 0,
              details: {
                'Validez': `${parsed.validity_days || 30} días`,
              },
            });
          }
          break;
        }

        case 'create_reservation': {
          if (parsed.success) {
            blocks.push({
              type: 'sale_summary',
              vehicle: `Reserva #${parsed.reservation_id}`,
              customer: parsed.customer_name || '',
              price: parsed.reservation_agreed_price || 0,
              details: {
                'Vence': parsed.expiration || '',
                'Estado': 'Reservado',
              },
            });
          }
          break;
        }

        case 'update_lead_status': {
          if (parsed.success) {
            blocks.push({
              type: 'quick_actions',
              actions: [
                { label: 'Ver leads pendientes', message: 'Muéstrame los leads pendientes' },
              ],
            });
          }
          break;
        }

        case 'query_customers': {
          if (parsed.customers?.length > 0 && parsed.customers.length <= 10) {
            blocks.push({
              type: 'customer_selector',
              prompt: 'Clientes encontrados',
              customers: parsed.customers.map((c: any) => ({
                id: c.id,
                first_name: c.first_name || '',
                last_name: c.last_name || '',
                email: c.email,
                phone: c.phone,
                rut: c.rut,
              })),
            });
          }
          break;
        }

        case 'appraise_vehicle': {
          if (parsed.estimated_range) {
            blocks.push({
              type: 'quick_actions',
              actions: [
                { label: 'Ajustar precio', message: `Ponle el precio promedio de mercado` },
                { label: 'Ver fuentes', message: 'Muéstrame las fuentes de la tasación' },
              ],
            });
          }
          break;
        }
      }
    } catch {}
  }

  return blocks;
}

chat.post('/api/chat', async (c) => {
  const authUser = (c as any).get('authUser') as AuthUser;
  const body = await c.req.json();
  const { messages, language = 'es', clientId: requestedClientId } = body;

  if (!messages || !Array.isArray(messages)) {
    return c.json({ error: 'messages array is required' }, 400);
  }

  // Cliente efectivo:
  //  - usuario normal → SIEMPRE su propio client_id (ignora cualquier override del
  //    body; un usuario no puede consultar otro tenant = anti-fuga entre clientes).
  //  - superadmin → puede operar sobre el cliente que tiene seleccionado en el front
  //    (impersonation/tenant override), que llega en requestedClientId.
  const isSuperadmin = authUser.role === 'superadmin';
  const effectiveClientId =
    isSuperadmin && Number(requestedClientId) > 0
      ? Number(requestedClientId)
      : authUser.clientId;

  // Sin cliente en contexto (típico: superadmin sin automotora seleccionada).
  // Antes esto hacía .eq('client_id', null) → error de BD que GAIA mostraba como
  // "error técnico al consultar la base de datos". Ahora: mensaje claro y accionable.
  if (!effectiveClientId || Number(effectiveClientId) <= 0) {
    return c.json({
      response:
        'GAIA responde en el contexto de una automotora. Como superadmin, primero seleccioná un cliente en el selector y volvé a preguntar.',
    });
  }

  const agent = mastra.getAgent('gaia');

  const runtimeContext = new RuntimeContext();
  runtimeContext.set('clientId', effectiveClientId);
  runtimeContext.set('userId', authUser.userId);
  runtimeContext.set('authId', authUser.authId);
  runtimeContext.set('role', authUser.role);
  runtimeContext.set('language', language);

  const formattedMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  try {
    const result = await agent.generate(formattedMessages, {
      runtimeContext,
    });

    const { text, blocks: textBlocks } = parseGaiaResponse(result.text);
    const toolBlocks = extractBlocksFromResult(result);
    const allBlocks = [...toolBlocks, ...textBlocks];

    console.log(`[GAIA] Response: ${text.length} chars, ${allBlocks.length} blocks, tools used: ${result.steps?.flatMap((s: any) => s.toolCalls?.map((t: any) => t.toolName) || []).join(', ') || 'none'}`);

    return c.json({
      response: text,
      ...(allBlocks.length > 0 && { blocks: allBlocks }),
    });
  } catch (err) {
    // Sin esto, un fallo del modelo (ej. modelo retirado → 404) reventaba como un
    // 500 opaco sin pista en logs. Logueamos el error real y devolvemos algo accionable.
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GAIA] agent.generate falló:', msg, err);
    return c.json({ error: 'GAIA no pudo procesar el mensaje', detail: msg }, 500);
  }
});

export default chat;
