import { supabase } from '@/integrations/supabase/client';

type NotificationType =
  | 'new_lead'
  | 'new_contact'
  | 'instagram_message'
  | 'vehicle_inquiry'
  | 'financing_request'
  | 'test_drive_request';

interface NotificationData {
  name?: string;
  phone?: string;
  email?: string;
  rut?: string;
  message?: string;
  vehicle?: string;
  vehicleTitle?: string;
  source?: string;
  senderName?: string;
  senderUsername?: string;
  amount?: number;
  downPayment?: number;
  preferredDate?: string;
  preferredTime?: string;
  clientName?: string;
  referenceType?: string;
  referenceId?: string;
  [key: string]: any;
}

/**
 * Trigger a WhatsApp notification for the given client
 * The notification will be sent to the client's configured WhatsApp number
 */
export async function triggerWhatsAppNotification(
  clientId: number,
  type: NotificationType,
  data: NotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: result, error } = await supabase.functions.invoke(
      'trigger-whatsapp-notification',
      {
        body: {
          type,
          clientId,
          data,
        },
      }
    );

    if (error) {
      console.error('Error triggering WhatsApp notification:', error);
      return { success: false, error: error.message };
    }

    return result || { success: true };
  } catch (error: any) {
    console.error('Error triggering WhatsApp notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Hook for triggering WhatsApp notifications
 */
export function useWhatsAppNotification() {
  const notify = async (
    clientId: number,
    type: NotificationType,
    data: NotificationData
  ) => {
    return triggerWhatsAppNotification(clientId, type, data);
  };

  return { notify };
}
