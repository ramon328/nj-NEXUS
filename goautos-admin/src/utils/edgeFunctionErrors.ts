/**
 * Maps raw Supabase Edge Function errors to user-friendly messages.
 *
 * Usage:
 *   catch (err) {
 *     toast.error(friendlyError(err, 'send-email'));
 *   }
 */

const EDGE_FUNCTION_MESSAGES: Record<string, string> = {
  // AI
  'ai-chat': 'No se pudo conectar con el asistente de IA. Intenta de nuevo.',
  'generate-seo': 'No se pudo generar el SEO con IA. Intenta de nuevo.',
  'generate-embeddings-batch': 'Error al procesar datos para búsqueda inteligente.',

  // Email
  'send-email': 'No se pudo enviar el correo electrónico. Verifica tu conexión.',

  // Users
  'create_user': 'No se pudo crear el usuario. Verifica los datos e intenta de nuevo.',
  'delete_user': 'No se pudo eliminar el usuario. Intenta de nuevo.',
  'change_password': 'No se pudo cambiar la contraseña. Intenta de nuevo.',

  // Vehicles
  'car_appraiser': 'No se pudo tasar el vehículo. Verifica la patente e intenta de nuevo.',
  'check-vehicle-fines': 'No se pudieron consultar las multas del vehículo.',
  'calculate_commission': 'No se pudo calcular la comisión.',
  'categorize-vehicles': 'Error al categorizar los vehículos importados.',

  // Integrations
  'chileautos-sync': 'Error de conexión con ChileAutos. Intenta de nuevo.',
  'chileautos-auth': 'Error de autenticación con ChileAutos. Verifica tus credenciales.',
  'instagram-post': 'No se pudo publicar en Instagram. Intenta de nuevo.',
  'instagram-messages': 'No se pudieron cargar los mensajes de Instagram.',
  'publish-mercadolibre-vehicle': 'No se pudo publicar en MercadoLibre. Intenta de nuevo.',
  'mercadolibre-sync': 'Error de conexión con MercadoLibre.',
  'mercadolibre-listings': 'No se pudieron cargar las publicaciones de MercadoLibre.',
  'facebook-marketplace': 'Error de conexión con Facebook Marketplace.',

  // Notifications
  'send-push-notification': 'No se pudo enviar la notificación push.',
  'trigger-whatsapp-notification': 'No se pudo enviar el mensaje de WhatsApp.',

  // Marketing
  'sync-sales-to-marketing': 'Error al sincronizar ventas para marketing.',

  // Onboarding
  'send-slack-message': 'No se pudo enviar la notificación de bienvenida.',
};

const GENERIC_EDGE_ERROR = 'Edge Function returned a non-2xx status code';

/**
 * Returns a user-friendly error message.
 *
 * @param error  The caught error (any type)
 * @param fnName Optional edge function name for contextual messages
 */
export function friendlyError(error: unknown, fnName?: string): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);

  // If it's the generic Supabase edge function error, replace it
  if (raw.includes(GENERIC_EDGE_ERROR) || raw.includes('non-2xx')) {
    if (fnName && EDGE_FUNCTION_MESSAGES[fnName]) {
      return EDGE_FUNCTION_MESSAGES[fnName];
    }
    return 'El servicio no está disponible en este momento. Intenta de nuevo más tarde.';
  }

  // If the raw message is already descriptive (not a generic code), return it
  return raw;
}
