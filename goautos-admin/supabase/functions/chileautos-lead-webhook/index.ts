import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { reportError } from '../_shared/error-reporter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, access_token, Authorization',
};

/**
 * ChileAutos Lead Webhook
 *
 * Receives leads from ChileAutos in real-time when a prospect inquires about a vehicle.
 * Supports 3 lead types: Formulario (web form), WhatsApp, and CallConnect.
 *
 * Flow:
 * 1. ChileAutos POSTs lead data to this endpoint
 * 2. We find the client by seller_identifier
 * 3. We find or create a customer record
 * 4. We match the vehicle by chileautos_identifier (if provided)
 * 5. We create a lead record
 * 6. Notifications are triggered automatically by DB triggers
 */

interface ChileAutosLeadPayload {
  Identifier: string;
  Seller: {
    Identifier: string;
    Name?: string;
    Email?: string;
  };
  Source: string;
  Type: string;
  Status: string;
  Environment?: {
    Source?: string;
    IpAddress?: string;
  };
  Prospect: {
    Identifier: string;
    Name: string;
    Email: string;
    PhoneNumbers?: { Type: string; Number: string }[];
    Identification?: { Type: string; Value: string }[];
  };
  CreatedUtc: string;
  Labels?: { Type: string; Value: string }[];
  Item?: {
    Type?: string;
    Identifier?: string;
    ListingType?: string;
    SaleStatus?: string;
    Registration?: { Number?: string };
    Specification?: {
      Make?: string;
      Model?: string;
      Title?: string;
      ReleaseDate?: { Year?: number };
    };
    Media?: {
      Photos?: { Url: string }[];
      Links?: { Type: string; Url: string }[];
    };
    PriceList?: { Currency: string; Amount: number }[];
  };
}

function extractLeadSource(payload: ChileAutosLeadPayload): string {
  const envSource = payload.Environment?.Source?.toLowerCase() || '';
  const prospectName = payload.Prospect?.Name?.toLowerCase() || '';

  if (prospectName.includes('whatsapp')) return 'chileautos-whatsapp';
  if (prospectName.includes('carsalesconnect')) return 'chileautos-callconnect';
  return 'chileautos';
}

function extractPhone(prospect: ChileAutosLeadPayload['Prospect']): string | null {
  if (!prospect.PhoneNumbers || prospect.PhoneNumbers.length === 0) return null;
  // Prefer Mobile, then Home, then any
  const mobile = prospect.PhoneNumbers.find(p => p.Type === 'Mobile');
  const home = prospect.PhoneNumbers.find(p => p.Type === 'Home');
  return (mobile || home || prospect.PhoneNumbers[0])?.Number || null;
}

function extractName(prospect: ChileAutosLeadPayload['Prospect']): { first: string; last: string } {
  const ids = prospect.Identification || [];
  const firstName = ids.find(i => i.Type === 'Name')?.Value || '';
  const lastName = ids.find(i => i.Type === 'LastName')?.Value || '';

  // For WhatsApp/CallConnect leads, use generic names
  if (firstName === 'WhatsApp' || firstName === 'CARSALESCONNECT') {
    return { first: firstName, last: lastName };
  }

  // For form leads, use Identification if available, fall back to Name field
  if (firstName && lastName) return { first: firstName, last: lastName };

  // Parse from full name
  const parts = (prospect.Name || '').trim().split(/\s+/);
  return {
    first: parts[0] || 'Sin nombre',
    last: parts.slice(1).join(' ') || '',
  };
}

function isPlaceholderEmail(email: string): boolean {
  return !email || email === 'noemail@mail.com' || email === '';
}

function extractChileautosUrl(item?: ChileAutosLeadPayload['Item']): string | null {
  if (!item?.Media?.Links) return null;
  const detailsLink = item.Media.Links.find(l => l.Type === 'Details');
  return detailsLink?.Url || null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: ChileAutosLeadPayload = await req.json();

    console.log(`[ChileAutos Lead] Received lead ${payload.Identifier} from seller ${payload.Seller?.Identifier}`);

    // Validate required fields
    if (!payload.Seller?.Identifier) {
      console.error('[ChileAutos Lead] Missing Seller.Identifier');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Seller.Identifier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.Prospect) {
      console.error('[ChileAutos Lead] Missing Prospect data');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Prospect' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Find the client by seller_identifier
    const { data: integration, error: integrationError } = await supabase
      .from('chileautos_integration')
      .select('id, client_id, seller_identifier')
      .eq('seller_identifier', payload.Seller.Identifier)
      .eq('status', 'active')
      .maybeSingle();

    if (integrationError || !integration) {
      console.error('[ChileAutos Lead] Integration not found for seller:', payload.Seller.Identifier, integrationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Integration not found for this seller' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = integration.client_id;
    console.log(`[ChileAutos Lead] Found client ${clientId} for seller ${payload.Seller.Identifier}`);

    // IDEMPOTENCIA: ChileAutos reintrega el webhook (reintenta) si no recibe un 200 a tiempo.
    // Sin esto, cada reintento crea OTRO lead (y posiblemente otro cliente) + dispara otra
    // notificación. Si ya procesamos este Identifier, respondemos 200 sin crear nada.
    // (chileautos_leads.chileautos_lead_identifier tiene UNIQUE, así que es ≤1 fila.)
    if (payload.Identifier) {
      const { data: alreadyProcessed } = await supabase
        .from('chileautos_leads')
        .select('id, lead_id')
        .eq('chileautos_lead_identifier', payload.Identifier)
        .maybeSingle();
      if (alreadyProcessed) {
        console.log(`[ChileAutos Lead] Lead ${payload.Identifier} ya procesado (idempotente), no se crea de nuevo`);
        return new Response(
          JSON.stringify({ success: true, idempotent: true, lead_id: alreadyProcessed.lead_id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Extract prospect data
    const { first: firstName, last: lastName } = extractName(payload.Prospect);
    const phone = extractPhone(payload.Prospect);
    const email = isPlaceholderEmail(payload.Prospect.Email) ? null : payload.Prospect.Email;
    const leadSource = extractLeadSource(payload);

    // 3. Find or create customer
    let customerId: number | null = null;

    // Try to find existing customer by email or phone
    // OJO: usamos order+limit(1) en vez de un maybeSingle() pelado. Ya existen clientes con
    // email/teléfono repetido (data histórica); maybeSingle() ERRORA con >1 fila y el código
    // tomaba eso como "no encontrado" → creaba OTRO cliente y agravaba el duplicado en cada
    // lead. Con limit(1) tomamos el cliente más antiguo y reutilizamos en vez de duplicar.
    if (email) {
      const { data: existingByEmail } = await supabase
        .from('customers')
        .select('id')
        .eq('client_id', clientId)
        .eq('email', email)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (existingByEmail) customerId = existingByEmail.id;
    }

    if (!customerId && phone) {
      const { data: existingByPhone } = await supabase
        .from('customers')
        .select('id')
        .eq('client_id', clientId)
        .eq('phone', phone)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (existingByPhone) customerId = existingByPhone.id;
    }

    // Create customer if not found
    if (!customerId) {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          client_id: clientId,
          first_name: firstName,
          last_name: lastName || null,
          email: email || null,
          phone: phone || null,
        })
        .select('id')
        .single();

      if (customerError) {
        console.error('[ChileAutos Lead] Error creating customer:', customerError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create customer' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      customerId = newCustomer.id;
      console.log(`[ChileAutos Lead] Created customer ${customerId}`);
    } else {
      console.log(`[ChileAutos Lead] Found existing customer ${customerId}`);
    }

    // 4. Match vehicle by ChileAutos identifier (if Item is present)
    let vehicleId: number | null = null;
    let vehicleTitle: string | null = null;

    if (payload.Item?.Identifier) {
      const { data: listing } = await supabase
        .from('chileautos_listing')
        .select('vehicle_id, title')
        .eq('client_id', clientId)
        .eq('chileautos_identifier', payload.Item.Identifier)
        .maybeSingle();

      if (listing) {
        vehicleId = listing.vehicle_id;
        vehicleTitle = listing.title;
        console.log(`[ChileAutos Lead] Matched vehicle ${vehicleId} (${vehicleTitle})`);
      }
    }

    // Build description from item details
    const itemSpec = payload.Item?.Specification;
    const itemPrice = payload.Item?.PriceList?.[0];
    const chileautosUrl = extractChileautosUrl(payload.Item);

    const descriptionParts: string[] = [];
    descriptionParts.push(`Fuente: ${leadSource === 'chileautos-whatsapp' ? 'WhatsApp' : leadSource === 'chileautos-callconnect' ? 'Llamada' : 'Formulario web'}`);
    if (itemSpec?.Title) descriptionParts.push(`Vehículo: ${itemSpec.Title}`);
    if (itemPrice) descriptionParts.push(`Precio: $${itemPrice.Amount?.toLocaleString('es-CL')} ${itemPrice.Currency}`);
    if (payload.Item?.Registration?.Number) descriptionParts.push(`Patente: ${payload.Item.Registration.Number}`);
    if (chileautosUrl) descriptionParts.push(`Link: ${chileautosUrl}`);
    if (phone) descriptionParts.push(`Teléfono: ${phone}`);
    if (email) descriptionParts.push(`Email: ${email}`);

    // 5. Create lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        client_id: clientId,
        customer_id: customerId,
        vehicle_id: vehicleId,
        type: 'sell-vehicle',
        status: 'pending',
        notes: descriptionParts.join('\n'),
        search_params: {
          chileautos_lead_id: payload.Identifier,
          chileautos_source: leadSource,
          chileautos_prospect_id: payload.Prospect.Identifier,
          chileautos_item_identifier: payload.Item?.Identifier || null,
          chileautos_url: chileautosUrl,
          chileautos_created_at: payload.CreatedUtc,
          environment_source: payload.Environment?.Source || null,
          environment_ip: payload.Environment?.IpAddress || null,
          labels: payload.Labels?.map(l => l.Value) || [],
        },
      })
      .select('id')
      .single();

    if (leadError) {
      console.error('[ChileAutos Lead] Error creating lead:', leadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create lead' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ChileAutos Lead] Created lead ${lead.id} for client ${clientId} (source: ${leadSource}, vehicle: ${vehicleId || 'general'})`);

    // 6. Store raw payload in chileautos_leads table for audit/analytics
    const { error: auditError } = await supabase
      .from('chileautos_leads')
      .insert({
        client_id: clientId,
        integration_id: integration.id,
        lead_id: lead.id,
        chileautos_lead_identifier: payload.Identifier,
        prospect_identifier: payload.Prospect.Identifier,
        prospect_name: payload.Prospect.Name,
        prospect_email: email,
        prospect_phone: phone,
        source_type: leadSource,
        vehicle_identifier: payload.Item?.Identifier || null,
        vehicle_title: itemSpec?.Title || vehicleTitle || null,
        chileautos_url: chileautosUrl,
        raw_payload: payload,
        created_at: new Date().toISOString(),
      });

    if (auditError) {
      console.error('[ChileAutos Lead] Error storing raw lead:', auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead.id,
        customer_id: customerId,
        vehicle_id: vehicleId,
        source: leadSource,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[ChileAutos Lead] Unexpected error:', err);
    await reportError({
      functionName: 'chileautos-lead-webhook',
      error: err,
      severity: 'critical',
    });
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
