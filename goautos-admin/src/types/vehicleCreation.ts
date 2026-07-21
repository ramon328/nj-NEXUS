import { Vehicle } from './vehicle';

export type VehicleDocumentType = 'purchase' | 'consignment' | 'other';

export interface VehicleDocument {
  type: VehicleDocumentType;
  notes?: string;
  status: 'pending' | 'completed';
}

export interface VehicleMedia {
  mainImage?: File | string | null;
  gallery?: (File | string)[] | null;
  extraDocuments?:
    | (File | string | { file: File | string; title?: string; description?: string; type?: string })[]
    | File
    | string
    | null;
}

export interface VehicleAcquisition {
  isConsigned: boolean;
  isOnlineConsignment?: boolean;
  acquisitionDate?: string;
  purchasePrice?: number;
  // Régimen de IVA fijado en la entrada (R2): true=exento, false=afecto, null=hereda cliente.
  // Define el IVA de la VENTA (débito fiscal). Se hereda a la salida.
  ivaExento?: boolean | null;
  // IVA de la COMPRA (independiente del régimen de venta): true = la compra tiene
  // factura afecta con IVA recuperable → el costo entra NETO. Se guarda en
  // vehicles_purchases.genera_credito_fiscal. Solo autos propios.
  purchaseGeneraCreditoFiscal?: boolean | null;
  purchaseCustomerId?: number;
  consignmentCustomerId?: number;
  consignmentAgreedPrice?: number;
  consignmentSuggestedPrice?: number;
  documentType: VehicleDocumentType;
  documentNotes?: string;
  // Banking information for purchase payments
  purchaseBankName?: string;
  purchaseAccountType?: string;
  purchaseAccountNumber?: string;
  purchaseAccountHolderName?: string;
  purchaseAccountHolderRut?: string;
  // Banking information for consignment payments
  consignmentBankName?: string;
  consignmentAccountType?: string;
  consignmentAccountNumber?: string;
  consignmentAccountHolderName?: string;
  consignmentAccountHolderRut?: string;
  // New consignment fields
  consignmentSaleType?: string;
  consignmentDealershipId?: number;
  consignmentFinanciera?: string;
  consignmentSellerId?: number | null;
  // Método de consignación + parámetros (Fase 1 PRD)
  consignmentMetodo?: 'precio_garantizado' | 'comision';
  consignmentComisionPercentage?: number;
  consignmentComisionFixed?: number;
}

export interface VehicleSales {
  sellerId?: number | null;
  dealershipId?: number | null;
  minPrice?: number | null;
  commission?: number | null;
  price?: number | null;
  discountPercentage?: number | null;
  statusId?: number | null;
}

export interface VehicleCreationData {
  basicInfo: Partial<Vehicle>;
  media: VehicleMedia;
  acquisition: VehicleAcquisition;
  documents: VehicleDocument[];
  sales: VehicleSales;
}

export interface VehicleFormData {
  brand_id?: string | number;
  model_id?: string | number;
  price?: number;
  emailCampaignEnabled?: boolean;
  selectedCustomers?: number[];
  brand?: {
    name: string;
    [key: string]: any;
  };
  model?: {
    name: string;
    [key: string]: any;
  };
  [key: string]: any;
}
