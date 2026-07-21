export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';

export interface Subscription {
  id: string;
  client_id: number;
  preapproval_id: string;
  status: SubscriptionStatus;
  plan_type: string;
  amount: number;
  currency: string;
  next_payment_date?: string;
  card_last_four?: string;
  trial_ends_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  payment_id: string;
  amount: number;
  status: string;
  paid_at?: string;
  failure_reason?: string;
  created_at: string;
}

export interface SubscriptionStatusResponse {
  has_active_subscription: boolean;
  status: SubscriptionStatus | null;
  trial_ends_at: string | null;
  next_payment_date: string | null;
  card_last_four?: string;
  amount?: number;
  currency?: string;
}

export interface CreateSubscriptionRequest {
  card_number: string;
  cardholder: string;
  expiration_month: string;
  expiration_year: string;
  security_code: string;
  payer_email: string;
  client_id: number;
  transaction_amount: number;
  is_payment_update?: boolean; // True if updating payment method for existing subscription (no trial)
}

export interface CreateSubscriptionResponse {
  success: boolean;
  subscription_id: string;
  trial_ends_at: string;
  preapproval_id: string;
}
