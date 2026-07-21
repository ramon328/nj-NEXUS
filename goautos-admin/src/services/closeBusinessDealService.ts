import { supabase } from '@/integrations/supabase/client';
import type { SellerCommissionSplit } from '@/stores/closeBusinessDealStore';

export interface CloseBusinessDealData {
  vehicleId: number;
  customerId: number;
  clientId: number;
  finalSalePrice: number;
  discount: number;
  dealershipCommission: number;
  dealershipCommissionPercentage: number;
  paymentMethod: string;
  notes: string;
  /** Splits del drawer de comisión vendedor — se persisten en sale_commission_splits */
  sellerCommissions?: SellerCommissionSplit[];
}

export interface UpdateCloseBusinessDealData {
  documentId: number;
  customerId: number;
  finalSalePrice: number;
  discount: number;
  dealershipCommission: number;
  dealershipCommissionPercentage: number;
  paymentMethod: string;
  notes: string;
  sellerCommissions?: SellerCommissionSplit[];
  vehicleId?: number;
}

/**
 * Sincroniza sale_commission_splits para una venta dada.
 * - Borra todos los splits existentes de la venta
 * - Inserta los nuevos (filtrando los que tienen userId y value > 0)
 * - Calcula el monto $ de cada split según baseType para guardarlo
 */
async function syncSellerCommissionSplits(
  vehicleId: number,
  splits: SellerCommissionSplit[],
  finalSalePrice: number,
  grossMargin: number
): Promise<void> {
  // Encontrar la venta del vehículo (la más reciente)
  const { data: sale } = await supabase
    .from('vehicles_sales')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sale) {
    console.warn('[seller_commission_splits] No sale found for vehicle, skipping');
    return;
  }
  const saleId = (sale as any).id;

  // Borrar splits viejos para reemplazarlos
  const { error: deleteError } = await supabase
    .from('sale_commission_splits')
    .delete()
    .eq('sale_id', saleId);
  if (deleteError) {
    console.error('[seller_commission_splits] delete error:', deleteError);
  }

  // Filtrar splits válidos (vendedor + valor > 0)
  const validSplits = splits.filter(
    (s) => s.userId && (Number(s.value) || 0) > 0
  );
  if (validSplits.length === 0) return;

  // Calcular monto $ de cada split
  const rows = validSplits.map((s) => {
    const value = Number(s.value) || 0;
    let amount = 0;
    let percentage: number | null = null;
    let split_type: 'percentage' | 'amount';

    switch (s.baseType) {
      case 'monto_fijo':
        amount = value;
        split_type = 'amount';
        break;
      case 'porcentaje_venta':
        amount = (finalSalePrice * value) / 100;
        percentage = value;
        split_type = 'percentage';
        break;
      case 'porcentaje_margen':
        amount = Math.max(0, grossMargin) * (value / 100);
        percentage = value;
        split_type = 'percentage';
        break;
    }

    return {
      sale_id: saleId,
      user_id: s.userId,
      split_type,
      percentage,
      amount: Math.round(amount),
      base_type: s.baseType,
      vendedor_nombre_snapshot: s.vendedorNombreSnapshot || null,
      notes: s.notes || null,
    };
  });

  const { error: insertError } = await supabase
    .from('sale_commission_splits')
    .insert(rows);
  if (insertError) {
    console.error('[seller_commission_splits] insert error:', insertError);
  }
}

export const createCloseBusinessDeal = async (
  data: CloseBusinessDealData
): Promise<{ success: boolean; documentId?: number; error?: string }> => {
  try {
    // PASO 1: Crear el documento en vehicles_documents (incluyendo observaciones)
    const documentPayload = {
      vehicle_id: data.vehicleId,
      customer_id: data.customerId,
      client_id: data.clientId,
      type: 'close_deal',
      status: 'pending',
      notes: data.notes || '',
    };

    const { data: documentData, error: documentError } = await supabase
      .from('vehicles_documents')
      .insert(documentPayload)
      .select('id')
      .single();

    if (documentError) {
      console.error('❌ Error creating document:', documentError);
      return {
        success: false,
        error: `Error al crear el documento base: ${documentError.message}`,
      };
    }

    const documentId = documentData.id;

    // PASO 2: Obtener o crear el template de document_templates
    // Primero intentar obtener el template existente
    const { data: existingTemplate, error: templateFetchError } = await supabase
      .from('document_templates')
      .select('terms_and_conditions')
      .eq('client_id', data.clientId)
      .eq('template_type', 'close_deal')
      .single();

    // Si no existe, usar términos por defecto
    const defaultTerms = `Por el presente instrumento, el cliente acepta la liquidación de venta del vehículo en las condiciones establecidas, sin ningún tipo de reparo posterior.`;

    const documentTemplatePayload = {
      client_id: data.clientId,
      template_type: 'close_deal',
      terms_and_conditions:
        existingTemplate?.terms_and_conditions || defaultTerms,
    };

    const { error: templateError } = await supabase
      .from('document_templates')
      .upsert(documentTemplatePayload, {
        onConflict: 'client_id,template_type',
      });

    if (templateError) {
      console.error('❌ Error upserting document template:', templateError);
      // Si falla, eliminar el documento creado
      await supabase.from('vehicles_documents').delete().eq('id', documentId);
      return {
        success: false,
        error: `Error al crear/actualizar la plantilla de documento: ${templateError.message}`,
      };
    }

    // PASO 3: Crear el registro en vehicles_close_deal con los datos específicos
    const closeDealPayload = {
      document_id: documentId,
      finalSalePrice: Math.round(data.finalSalePrice),
      discount: Math.round(data.discount || 0),
      dealershipCommission: Math.round(data.dealershipCommission),
      dealershipCommissionPercentage: Math.round(data.dealershipCommissionPercentage),
      paymentMethod: data.paymentMethod,
    };

    const { error: closeDealError } = await supabase
      .from('vehicles_close_deal')
      .insert(closeDealPayload);

    if (closeDealError) {
      console.error('❌ Error creating close deal:', closeDealError);
      // Si falla, eliminar el documento creado
      await supabase.from('vehicles_documents').delete().eq('id', documentId);
      return {
        success: false,
        error: `Error al crear el registro de cierre de negocio: ${closeDealError.message}`,
      };
    }

    // PASO 4: Sincronizar comisiones de vendedor (sale_commission_splits)
    if (data.sellerCommissions && data.sellerCommissions.length > 0) {
      const grossMargin = Math.max(0, data.dealershipCommission);
      await syncSellerCommissionSplits(
        data.vehicleId,
        data.sellerCommissions,
        data.finalSalePrice,
        grossMargin
      );
    }

    return { success: true, documentId };
  } catch (error) {
    console.error('❌ Unexpected error in createCloseBusinessDeal:', error);
    return {
      success: false,
      error: `Error inesperado al crear el cierre de negocio: ${
        error instanceof Error ? error.message : 'Error desconocido'
      }`,
    };
  }
};

/**
 * Actualizar un cierre de negocio existente
 * 1. Actualiza el registro en vehicles_documents
 * 2. Actualiza el registro en vehicles_close_deal
 */
export const updateCloseBusinessDeal = async (
  data: UpdateCloseBusinessDealData
): Promise<{ success: boolean; error?: string }> => {
  try {
    // PASO 1: Obtener el vehicle_id del documento
    const { data: documentData, error: documentError } = await supabase
      .from('vehicles_documents')
      .select('vehicle_id')
      .eq('id', data.documentId)
      .eq('type', 'close_deal')
      .single();

    if (documentError) {
      console.error('❌ Error fetching document:', documentError);
      return {
        success: false,
        error: `Error al obtener el documento: ${documentError.message}`,
      };
    }

    // PASO 2: Actualizar el documento en vehicles_documents (incluyendo observaciones)
    const documentUpdatePayload = {
      customer_id: data.customerId,
      notes: data.notes || '',
    };

    const { error: documentUpdateError } = await supabase
      .from('vehicles_documents')
      .update(documentUpdatePayload)
      .eq('id', data.documentId)
      .eq('type', 'close_deal');

    if (documentUpdateError) {
      console.error('❌ Error updating document:', documentUpdateError);
      return {
        success: false,
        error: `Error al actualizar el documento: ${documentUpdateError.message}`,
      };
    }

    // PASO 4: Actualizar el registro en vehicles_close_deal
    const closeDealUpdatePayload = {
      finalSalePrice: Math.round(data.finalSalePrice),
      discount: Math.round(data.discount || 0),
      dealershipCommission: Math.round(data.dealershipCommission),
      dealershipCommissionPercentage: Math.round(data.dealershipCommissionPercentage),
      paymentMethod: data.paymentMethod,
    };

    const { error: closeDealError } = await supabase
      .from('vehicles_close_deal')
      .update(closeDealUpdatePayload)
      .eq('document_id', data.documentId);

    if (closeDealError) {
      console.error('❌ Error updating close deal:', closeDealError);
      return {
        success: false,
        error: `Error al actualizar el registro de cierre de negocio: ${closeDealError.message}`,
      };
    }

    // Sincronizar comisiones de vendedor si se pasaron
    const vehicleIdForSplits = data.vehicleId ?? (documentData as any)?.vehicle_id;
    if (
      data.sellerCommissions &&
      data.sellerCommissions.length > 0 &&
      vehicleIdForSplits
    ) {
      const grossMargin = Math.max(0, data.dealershipCommission);
      await syncSellerCommissionSplits(
        vehicleIdForSplits,
        data.sellerCommissions,
        data.finalSalePrice,
        grossMargin
      );
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error in updateCloseBusinessDeal:', error);
    return {
      success: false,
      error: `Error inesperado al actualizar el cierre de negocio: ${
        error instanceof Error ? error.message : 'Error desconocido'
      }`,
    };
  }
};
