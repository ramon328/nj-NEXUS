import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// GoAuto's Kapso credentials (used to send notifications to all tenants)
const GOAUTO_KAPSO_API_KEY = Deno.env.get('GOAUTO_KAPSO_API_KEY') || '';
const GOAUTO_PHONE_NUMBER_ID = Deno.env.get('GOAUTO_PHONE_NUMBER_ID') || '';

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
  | 'test_drive_request';

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

// Send WhatsApp message via Kapso API
// Docs: https://docs.kapso.ai/api/meta/whatsapp/messages/send-a-message
async function sendKapsoMessage(
  recipientPhone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Normalize phone number (remove + and spaces)
    const normalizedPhone = recipientPhone.replace(/[\s+]/g, '');

    console.log('📱 Sending WhatsApp notification to:', normalizedPhone);

    // Kapso API endpoint
    const apiUrl = `https://api.kapso.ai/meta/whatsapp/v24.0/${GOAUTO_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': GOAUTO_KAPSO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'text',
        text: { body: message },
      }),
    });

    const responseText = await response.text();
    console.log('📱 Response status:', response.status);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { success: false, error: `Invalid response: ${responseText.substring(0, 200)}` };
    }

    if (!response.ok) {
      console.error('Kapso API error:', data);
      return { success: false, error: data.error?.message || JSON.stringify(data) };
    }

    console.log('✅ Message sent successfully:', data.messages?.[0]?.id);

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error('Error calling Kapso API:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify GoAuto credentials are configured
    if (!GOAUTO_KAPSO_API_KEY || !GOAUTO_PHONE_NUMBER_ID) {
      console.error('GoAuto Kapso credentials not configured');
      return new Response(
        JSON.stringify({ error: 'WhatsApp notifications not configured', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get pending notifications from queue (max 10 at a time)
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('whatsapp_notification_queue')
      .select(`
        id,
        client_id,
        notification_type,
        notification_data,
        attempts,
        clients!inner(
          notification_whatsapp,
          whatsapp_notifications_enabled,
          name
        )
      `)
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching pending notifications:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('No pending notifications to process');
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📬 Processing ${pendingNotifications.length} pending notifications`);

    let processed = 0;
    let failed = 0;

    for (const notification of pendingNotifications) {
      const client = notification.clients as any;

      // Skip if notifications are disabled or no phone configured
      if (!client?.whatsapp_notifications_enabled || !client?.notification_whatsapp) {
        await supabase
          .from('whatsapp_notification_queue')
          .update({
            status: 'failed',
            error_message: 'Notifications disabled or no phone configured',
            processed_at: new Date().toISOString(),
          })
          .eq('id', notification.id);
        failed++;
        continue;
      }

      // Mark as processing
      await supabase
        .from('whatsapp_notification_queue')
        .update({
          status: 'processing',
          attempts: notification.attempts + 1,
        })
        .eq('id', notification.id);

      try {
        // Format the message
        const message = formatNotificationMessage(
          notification.notification_type as NotificationType,
          notification.notification_data
        );

        // Send the message
        const result = await sendKapsoMessage(client.notification_whatsapp, message);

        if (result.success) {
          // Log success
          await supabase.from('whatsapp_notification_log').insert({
            client_id: notification.client_id,
            notification_type: notification.notification_type,
            recipient_phone: client.notification_whatsapp,
            message_content: message,
            reference_type: notification.notification_data.referenceType || notification.notification_type,
            reference_id: notification.notification_data.referenceId,
            status: 'sent',
            external_message_id: result.messageId,
            sent_at: new Date().toISOString(),
          });

          // Mark as sent
          await supabase
            .from('whatsapp_notification_queue')
            .update({
              status: 'sent',
              processed_at: new Date().toISOString(),
            })
            .eq('id', notification.id);

          processed++;
        } else {
          // Log failure
          await supabase.from('whatsapp_notification_log').insert({
            client_id: notification.client_id,
            notification_type: notification.notification_type,
            recipient_phone: client.notification_whatsapp,
            message_content: message,
            reference_type: notification.notification_data.referenceType || notification.notification_type,
            reference_id: notification.notification_data.referenceId,
            status: 'failed',
            error_message: result.error,
          });

          // Mark as failed if max attempts reached
          if (notification.attempts + 1 >= 3) {
            await supabase
              .from('whatsapp_notification_queue')
              .update({
                status: 'failed',
                error_message: result.error,
                processed_at: new Date().toISOString(),
              })
              .eq('id', notification.id);
          } else {
            // Reset to pending for retry
            await supabase
              .from('whatsapp_notification_queue')
              .update({
                status: 'pending',
                error_message: result.error,
              })
              .eq('id', notification.id);
          }

          failed++;
        }
      } catch (error: any) {
        console.error('Error processing notification:', notification.id, error);

        await supabase
          .from('whatsapp_notification_queue')
          .update({
            status: notification.attempts + 1 >= 3 ? 'failed' : 'pending',
            error_message: error.message,
          })
          .eq('id', notification.id);

        failed++;
      }
    }

    console.log(`✅ Processed: ${processed}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: pendingNotifications.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-notification-queue:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
