export interface MeliUser {
  id: number;
  nickname: string;
  registration_date: string;
  first_name: string;
  last_name: string;
  gender: string;
  country_id: string;
  email: string;
  identification: Identification;
  address: Address;
  phone: Phone;
  alternative_phone: Phone;
  user_type: string;
  tags: string[];
  logo: string | null;
  points: number;
  site_id: string;
  permalink: string;
  seller_experience: string;
  bill_data: BillData;
  seller_reputation: SellerReputation;
  buyer_reputation: BuyerReputation;
  status: Status;
  secure_email: string;
  company: Company;
  credit: Credit;
  context: Context;
  thumbnail: Thumbnail;
  registration_identifiers: [];
}

export interface Identification {
  number: string;
  type: string;
}

export interface Address {
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
}

export interface Phone {
  area_code: string | null;
  extension: string;
  number: string;
  verified?: boolean;
}

export interface BillData {
  accept_credit_note: boolean | null;
}

export interface SellerReputation {
  level_id: string | null;
  power_seller_status: string | null;
  transactions: SellerTransactions;
  metrics: SellerMetrics;
}

export interface SellerTransactions {
  canceled: number;
  completed: number;
  period: string;
  ratings: Ratings;
  total: number;
}

export interface Ratings {
  negative: number;
  neutral: number;
  positive: number;
}

export interface SellerMetrics {
  sales: MetricDetail;
  claims: MetricDetail;
  delayed_handling_time: MetricDetail;
  cancellations: MetricDetail;
}

export interface MetricDetail {
  period: string;
  rate?: number;
  value?: number;
  completed?: number;
}

export interface BuyerReputation {
  canceled_transactions: number;
  tags: string[];
  transactions: BuyerTransactions;
}

export interface BuyerTransactions {
  canceled: BuyerCanceled;
  completed: number | null;
  not_yet_rated: BuyerRating;
  period: string;
  total: number | null;
  unrated: BuyerRating;
}

export interface BuyerCanceled {
  paid: number | null;
  total: number | null;
}

export interface BuyerRating {
  paid: number | null;
  total: number | null;
  units?: number | null;
}

export interface Status {
  billing: Billing;
  buy: ActionStatus;
  confirmed_email: boolean;
  shopping_cart: ShoppingCart;
  immediate_payment: boolean;
  list: ActionStatus;
  mercadoenvios: string;
  mercadopago_account_type: string;
  mercadopago_tc_accepted: boolean;
  required_action: string | null;
  sell: ActionStatus;
  site_status: string;
  user_type: string | null;
}

export interface Billing {
  allow: boolean;
  codes: [];
}

export interface ActionStatus {
  allow: boolean;
  codes: [];
  immediate_payment: ImmediatePayment;
}

export interface ImmediatePayment {
  reasons: [];
  required: boolean;
}

export interface ShoppingCart {
  buy: string;
  sell: string;
}

export interface Company {
  brand_name: string;
  city_tax_id: string;
  corporate_name: string;
  identification: string;
  state_tax_id: string;
  cust_type_id: string;
  soft_descriptor: string | null;
}

export interface Credit {
  consumed: number;
  credit_level_id: string;
  rank: string;
}

export interface Context {
  device: string;
  flow: string;
  ip_address: string;
  source: string;
}

export interface Thumbnail {
  picture_id: string;
  picture_url: string;
}
