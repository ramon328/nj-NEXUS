import { supabase } from '@/integrations/supabase/client';

export interface ConsignmentBankingInfo {
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  accountHolderName?: string;
  accountHolderRut?: string;
}

export interface ConsignmentMethodInfo {
  metodo?: 'precio_garantizado' | 'comision';
  porcentaje?: number;
  montoFijo?: number;
}

/**
 * Creates a consignment record
 */
export const createConsignment = async (
  vehicleId: number,
  customerId: number | null | undefined,
  agreedPrice: number,
  documentId: number | undefined,
  notes?: string,
  suggestedPrice?: number,
  bankingInfo?: ConsignmentBankingInfo,
  saleType?: string,
  dealershipId?: number,
  financiera?: string,
  acquisitionDate?: string,
  consignmentSellerId?: number,
  methodInfo?: ConsignmentMethodInfo
): Promise<boolean> => {
  try {
    const insertData: any = {
      vehicle_id: vehicleId,
      customer_id: customerId || null,
      agreed_price: agreedPrice,
      document_id: documentId,
    };

    // Add notes only if the field exists in the table
    if (notes) {
      insertData.notes = notes;
    }

    // Add suggested price if provided
    if (suggestedPrice !== undefined && suggestedPrice > 0) {
      insertData.suggested_price = suggestedPrice;
    }

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

    if (saleType) {
      insertData.sale_type = saleType;
    }
    if (dealershipId) {
      insertData.dealership_id = dealershipId;
    }
    if (financiera) {
      insertData.financiera = financiera;
    }
    if (acquisitionDate) {
      insertData.consignment_date = acquisitionDate;
    }
    if (consignmentSellerId) {
      insertData.consignment_seller_id = consignmentSellerId;
    }

    // Método de consignación + parámetros (Fase 1 PRD)
    if (methodInfo?.metodo) {
      insertData.metodo_consignacion = methodInfo.metodo;
    }
    if (methodInfo?.porcentaje !== undefined && methodInfo.porcentaje > 0) {
      insertData.porcentaje_comision_consignacion = methodInfo.porcentaje;
    }
    if (methodInfo?.montoFijo !== undefined && methodInfo.montoFijo > 0) {
      insertData.monto_fijo_comision_consignacion = methodInfo.montoFijo;
    }

    const { error } = await supabase
      .from('vehicles_consignments')
      .insert(insertData);

    if (error) {
      // Fail loud: el caller necesita saber que el vínculo cliente↔vehículo
      // no quedó persistido para poder rollbackear el vehicle y evitar huérfanos.
      console.error('Error creating consignment:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in createConsignment:', error);
    throw error;
  }
};
