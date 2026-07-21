import { supabase } from '@/integrations/supabase/client';

export interface PurchaseBankingInfo {
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  accountHolderName?: string;
  accountHolderRut?: string;
}

/**
 * Creates a purchase record
 */
export const createPurchase = async (
  vehicleId: number,
  purchasePrice: number,
  customerId?: number,
  notes?: string,
  bankingInfo?: PurchaseBankingInfo,
  documentId?: number,
  acquisitionDate?: string,
  generaCreditoFiscal?: boolean | null
): Promise<boolean> => {
  try {
    const insertData: any = {
      vehicle_id: vehicleId,
      purchase_price: purchasePrice,
      purchase_date: acquisitionDate || new Date().toISOString(),
      status: 'completed',
      customer_id: customerId || null,
      notes: notes || null,
      document_id: documentId || null,
      // IVA de compra (independiente del régimen de venta): si la compra tiene factura
      // afecta, el costo entra neto al margen. null = sin crédito (bruto, legacy).
      genera_credito_fiscal: generaCreditoFiscal ?? null,
    };

    // Add banking information if provided
    if (bankingInfo) {
      if (bankingInfo.bankName) {
        insertData.bank_name = bankingInfo.bankName;
      }
      if (bankingInfo.accountType) {
        insertData.account_type = bankingInfo.accountType;
      }
      if (bankingInfo.accountNumber) {
        insertData.account_number = bankingInfo.accountNumber;
      }
      if (bankingInfo.accountHolderName) {
        insertData.account_holder_name = bankingInfo.accountHolderName;
      }
      if (bankingInfo.accountHolderRut) {
        insertData.account_holder_rut = bankingInfo.accountHolderRut;
      }
    }

    const { error } = await supabase.from('vehicles_purchases').insert(insertData);

    if (error) {
      // Fail loud: caller debe rollbackear el vehicle para no dejar huérfano
      // el vínculo customer↔vehicle.
      console.error('Error creating purchase:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in createPurchase:', error);
    throw error;
  }
};
