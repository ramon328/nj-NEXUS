import {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  SubscriptionStatusResponse,
} from '@/types/subscription';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = 'https://miuiujntdjrjhhcysiba.supabase.co';

// Helper to get auth headers
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || ''}`,
  };
};

export const subscriptionService = {
  /**
   * Create a new subscription with Mercado Pago
   */
  async createSubscription(
    data: CreateSubscriptionRequest
  ): Promise<CreateSubscriptionResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/mp-create-subscription`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error creating subscription');
    }

    return response.json();
  },

  /**
   * Cancel an active subscription
   */
  async cancelSubscription(
    clientId: number,
    reason?: string,
    otherReason?: string
  ): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/mp-cancel-subscription`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          client_id: clientId,
          cancellation_reason: reason,
          cancellation_details: otherReason,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error cancelling subscription');
    }
  },

  /**
   * Get subscription status for a client
   */
  async getSubscriptionStatus(
    clientId: number
  ): Promise<SubscriptionStatusResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/mp-get-subscription-status?client_id=${clientId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error fetching subscription status');
    }

    return response.json();
  },
};
