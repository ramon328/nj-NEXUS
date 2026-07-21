import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Tipos de notificaciones de Mercado Libre
interface MercadoLibreNotification {
  resource: string; // Recurso afectado (ej: "/orders/123456789")
  user_id: number; // ID del usuario asociado a la notificación
  topic: string; // Tipo de notificación (ej: "orders_v2", "questions", "items")
  application_id: number; // ID de la aplicación que genera la notificación
  attempts?: number; // Número de intentos de entrega
  sent?: string; // Fecha y hora de envío
  received?: string; // Fecha y hora de recepción
}

serve(async (req: Request) => {
  // Manejar preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar que la solicitud sea POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Obtener y validar la notificación
    const notification: MercadoLibreNotification = await req.json();

    if (!notification.resource || !notification.topic) {
      console.error('Invalid notification format:', notification);
      return new Response(
        JSON.stringify({ error: 'Invalid notification format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Registrar la notificación en Supabase para su procesamiento
    const notificationData = {
      resource: notification.resource,
      user_id: notification.user_id,
      topic: notification.topic,
      application_id: notification.application_id,
      attempts: notification.attempts || 1,
      sent: notification.sent || new Date().toISOString(),
      received: new Date().toISOString(),
      status: 'pending',
      raw_data: notification,
    };

    // Guardar la notificación en la base de datos
    const { error: insertError } = await supabase
      .from('mercadolibre_notifications')
      .insert(notificationData);

    if (insertError) {
      console.error('Error storing notification:', insertError);
      // No devolvemos error a Mercado Libre para evitar reintentos innecesarios
    }

    // Procesar la notificación según su tipo
    await processNotification(notification);

    // Responder a Mercado Libre con éxito (HTTP 200)
    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Notification received and processed',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing Mercado Libre notification:', error);

    // Respondemos con éxito aunque haya error para evitar reintentos
    // pero registramos el error internamente
    return new Response(
      JSON.stringify({ status: 'success', message: 'Notification received' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Procesa la notificación según su tipo (topic)
 */
async function processNotification(notification: MercadoLibreNotification) {
  try {
    // Determinar qué tipo de notificación es y procesarla adecuadamente
    switch (notification.topic) {
      case 'questions':
        await processQuestionNotification(notification);
        break;

      case 'orders_v2':
        await processOrderNotification(notification);
        break;

      case 'items':
        await processItemNotification(notification);
        break;

      default:
        console.log(
          'Notification topic not specifically handled:',
          notification.topic
        );
        // No procesamos otros tipos de notificaciones por ahora
        break;
    }
  } catch (error) {
    console.error('Error processing notification:', error);
    // Anotamos el error pero continuamos (no re-lanzamos la excepción)
  }
}

/**
 * Procesa notificaciones de preguntas
 */
async function processQuestionNotification(
  notification: MercadoLibreNotification
) {
  // Extraer ID de la pregunta del recurso
  const questionId = notification.resource.split('/').pop();
  console.log('Processing question notification:', questionId);

  // Aquí implementaríamos la lógica para:
  // 1. Obtener los detalles de la pregunta de la API de Mercado Libre
  // 2. Notificar al usuario de la nueva pregunta (por ejemplo, por email)
  // 3. Actualizar el estado de la notificación a 'processed'
}

/**
 * Procesa notificaciones de órdenes
 */
async function processOrderNotification(
  notification: MercadoLibreNotification
) {
  // Extraer ID de la orden del recurso
  const orderId = notification.resource.split('/').pop();
  console.log('Processing order notification:', orderId);

  // Aquí implementaríamos la lógica para:
  // 1. Obtener los detalles de la orden de la API de Mercado Libre
  // 2. Actualizar el inventario o estado del vehículo en nuestra base de datos
  // 3. Notificar al vendedor de la nueva venta
  // 4. Actualizar el estado de la notificación a 'processed'
}

/**
 * Procesa notificaciones de ítems (publicaciones)
 */
async function processItemNotification(notification: MercadoLibreNotification) {
  // Extraer ID del ítem del recurso
  const itemId = notification.resource.split('/').pop();
  console.log('Processing item notification:', itemId);

  // Aquí implementaríamos la lógica para:
  // 1. Obtener los detalles actualizados del ítem de la API de Mercado Libre
  // 2. Actualizar el estado de la publicación en nuestra base de datos
  // 3. Notificar al vendedor de cambios importantes en la publicación
  // 4. Actualizar el estado de la notificación a 'processed'
}
