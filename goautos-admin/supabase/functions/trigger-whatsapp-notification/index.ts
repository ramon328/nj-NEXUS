import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type NotificationType =
  | 'new_lead'
  | 'new_contact'
  | 'instagram_message'
  | 'vehicle_inquiry'
  | 'financing_request'
  | 'test_drive_request'
  | 'test';

interface TriggerRequest {
  type: NotificationType;
  clientId: number;
  data: Record<string, any>;
}

// Format notification message based on type
function formatNotificationMessage(type: NotificationType, data: Record<string, any>): string {
  const timestamp = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  switch (type) {
    case 'new_lead':
      return [
        '🚗 *Nuevo Lead*',
        '',
        `👤 *Nombre:* ${data.name || 'Sin nombre'}`,
        data.phone ? `📱 *Telefono:* ${data.phone}` : '',
        data.email ? `📧 *Email:* ${data.email}` : '',
        data.vehicle ? `🚙 *Vehiculo de interes:* ${data.vehicle}` : '',
        data.source ? `📍 *Origen:* ${data.source}` : '',
        data.message ? `💬 *Mensaje:* ${data.message}` : '',
        '',
        `⏰ ${timestamp}`,
      ].filter(Boolean).join('\n');

    case 'new_contact':
      return [
        '👥 *Nuevo Contacto*',
        '',
        `👤 *Nombre:* ${data.name || 'Sin nombre'}`,
        data.phone ? `📱 *Telefono:* ${data.phone}` : '',
        data.email ? `📧 *Email:* ${data.email}` : '',
        data.rut ? `🪪 *RUT:* ${data.rut}` : '',
        '',
        `⏰ ${timestamp}`,
      ].filter(Boolean).join('\n');

    case 'instagram_message':
      return [
        '📸 *Mensaje de Instagram*',
        '',
        `👤 *De:* ${data.senderName || data.senderUsername || 'Usuario'}`,
        `💬 *Mensaje:* ${data.message || '(sin texto)'}`,
        '',
        `⏰ ${timestamp}`,
      ].filter(Boolean).join('\n');

    case 'vehicle_inquiry':
      return [
        '🚙 *Consulta de Vehiculo*',
        '',
        `👤 *Cliente:* ${data.clientName || 'Sin nombre'}`,
        data.phone ? `📱 *Telefono:* ${data.phone}` : '',
        `🚗 *Vehiculo:* ${data.vehicleTitle || data.vehicle || 'No especificado'}`,
        data.message ? `💬 *Consulta:* ${data.message}` : '',
        '',
        `⏰ ${timestamp}`,
      ].filter(Boolean).join('\n');

    case 'financing_request':
      return [
        '💰 *Solicitud de Financiamiento*',
        '',
        `👤 *Cliente:* ${data.name || 'Sin nombre'}`,
        data.phone ? `📱 *Telefono:* ${data.phone}` : '',
        data.email ? `📧 *Email:* ${data.email}` : '',
        data.rut ? `🪪 *RUT:* ${data.rut}` : '',
        data.vehicle ? `🚗 *Vehiculo:* ${data.vehicle}` : '',
        data.amount ? `💵 *Monto:* $${data.amount.toLocaleString('es-CL')}` : '',
        data.downPayment ? `💳 *Pie:* $${data.downPayment.toLocaleString('es-CL')}` : '',
        '',
        `⏰ ${timestamp}`,
      ].filter(Boolean).join('\n');

    case 'test_drive_request':
      return [
        '🏎️ *Solicitud de Test Drive*',
        '',
        `👤 *Cliente:* ${data.name || 'Sin nombre'}`,
        data.phone ? `📱 *Telefono:* ${data.phone}` : '',
        data.vehicle ? `🚗 *Vehiculo:* ${data.vehicle}` : '',
        data.preferredDate ? `📅 *Fecha preferida:* ${data.preferredDate}` : '',
        data.preferredTime ? `⏰ *Hora preferida:* ${data.preferredTime}` : '',
        '',
        `⏰ ${timestamp}`,
      ].filter(Boolean).join('\n');

    case 'test':
      return [
        '🚗 *GoAuto - Prueba de Notificacion*',
        '',
        data.message || 'Tus notificaciones de WhatsApp estan configuradas correctamente.',
        '',
        `⏰ ${timestamp}`,
      ].filter(Boolean).join('\n');

    default:
      return [
        '🔔 *Notificacion*',
        '',
        JSON.stringify(data, null, 2),
        '',
        `⏰ ${timestamp}`,
      ].join('\n');
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: TriggerRequest = await req.json();
    const { type, clientId, data } = body;

    if (!type || !clientId) {
      return new Response(
        JSON.stringify({ error: 'type and clientId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔔 Trigger notification: ${type} for client ${clientId}`);

    // Get client notification settings
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('notification_whatsapp, whatsapp_notifications_enabled, whatsapp_notification_settings, name')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client not found:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if notifications are enabled
    if (!client.notification_whatsapp || !client.whatsapp_notifications_enabled) {
      console.log('Notifications not configured or disabled for client:', clientId);
      return new Response(
        JSON.stringify({ success: false, reason: 'Notifications not enabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this specific notification type is enabled (skip for test)
    const settings = client.whatsapp_notification_settings || {};
    if (type !== 'test' && settings[type] === false) {
      console.log(`Notification type ${type} disabled for client:`, clientId);
      return new Response(
        JSON.stringify({ success: false, reason: `${type} notifications disabled` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format the message
    const message = formatNotificationMessage(type, data);

    // Call the send function
    const sendResult = await supabase.functions.invoke('send-whatsapp-notification', {
      body: {
        clientId,
        recipientPhone: client.notification_whatsapp,
        notificationType: type,
        message,
        referenceType: data.referenceType || type,
        referenceId: data.referenceId || data.id,
      },
    });

    if (sendResult.error) {
      console.error('Error sending notification:', sendResult.error);
      return new Response(
        JSON.stringify({ success: false, error: sendResult.error.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Notification triggered successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: sendResult.data,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in trigger-whatsapp-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
