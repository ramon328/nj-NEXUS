import { supabase } from '@/integrations/supabase/client';
import { TradeInVehicle } from './vehicleSaleService';

/**
 * Creates a new vehicle record for a trade-in
 */
const createTradeInVehicleRecord = async (
  tradeInVehicle: TradeInVehicle,
  clientId: number,
  statusId: number | undefined
): Promise<number | null> => {
  try {
    // Find brand ID for the trade-in vehicle if only name is provided
    let brandId = tradeInVehicle.brand_id || null;

    if (!brandId && tradeInVehicle.brand) {
      const { data: brandData } = await supabase
        .from('brands')
        .select('id')
        .ilike('name', tradeInVehicle.brand)
        .maybeSingle();

      brandId = brandData?.id || null;
    }

    // If model_id is provided as string, ensure it's a number for proper insertion
    let modelId = null;
    if (tradeInVehicle.model_id) {
      modelId =
        typeof tradeInVehicle.model_id === 'string'
          ? parseInt(tradeInVehicle.model_id, 10)
          : tradeInVehicle.model_id;

      // If parsing failed and resulted in NaN, set to null
      if (isNaN(modelId)) modelId = null;
    }

    // Create a new vehicle record for the trade-in
    const { data: newVehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert({
        license_plate: tradeInVehicle.license_plate,
        brand_id: brandId,
        model_id: modelId,
        year: tradeInVehicle.year,
        client_id: clientId,
        status_id: statusId,
        purchase_price: tradeInVehicle.trade_in_value,
        // No auto-generar precio de publicación: antes se ponía toma × 1.2 (markup 20%)
        // sin que nadie lo llenara, y aparecía un precio "default" que no debía existir
        // (reportado por Sebastián/Mallorca). Queda en 0 hasta que el usuario lo defina.
        price: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (vehicleError) {
      console.error('Error creating trade-in vehicle:', vehicleError);
      return null;
    }

    return newVehicle.id;
  } catch (error) {
    console.error('Exception creating trade-in vehicle record:', error);
    return null;
  }
};

/**
 * Creates a purchase document for the trade-in vehicle
 */
const createTradeInDocument = async (
  newVehicleId: number,
  clientId: number,
  customerId: number | null,
  originalVehicleId: number,
  saleDocumentId: number
): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('vehicles_documents')
      .insert({
        vehicle_id: newVehicleId,
        type: 'purchase',
        notes: `Vehículo recibido como parte de pago en la venta del vehículo ID: ${originalVehicleId}. Documento de venta ID: ${saleDocumentId}`,
        client_id: clientId,
        customer_id: customerId,
        status: 'completed',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating trade-in document:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Exception creating trade-in document:', error);
    return null;
  }
};

/**
 * Creates a purchase record for the trade-in vehicle
 */
const createTradeInPurchaseRecord = async (
  newVehicleId: number,
  customerId: number | null,
  tradeInValue: number,
  originalVehicleId: number
): Promise<boolean> => {
  try {
    const { error } = await supabase.from('vehicles_purchases').insert({
      vehicle_id: newVehicleId,
      customer_id: customerId,
      purchase_price: tradeInValue,
      purchase_date: new Date().toISOString(),
      payment_method: 'trade-in',
      notes: `Vehículo recibido como parte de pago en la venta del vehículo ID: ${originalVehicleId}`,
      status: 'completed',
    });

    if (error) {
      console.error('Error creating trade-in purchase record:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception creating trade-in purchase record:', error);
    return false;
  }
};

/**
 * Gets the default vehicle status ID for a client
 */
const getDefaultVehicleStatusId = async (
  clientId: number
): Promise<number | undefined> => {
  try {
    const { data, error } = await supabase
      .from('clients_vehicles_states')
      .select('id')
      .eq('client_id', clientId)
      .order('order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching first vehicle status:', error);
      return undefined;
    }

    return data?.id;
  } catch (error) {
    console.error('Exception getting default vehicle status:', error);
    return undefined;
  }
};

/**
 * Main function to create a trade-in vehicle with all related records
 */
export const createTradeInVehicle = async (
  tradeInVehicle: TradeInVehicle,
  clientId: number,
  customerId: number | null,
  originalVehicleId: number,
  saleDocumentId: number
): Promise<{ success: boolean; vehicleId: number | null }> => {
  try {
    // 1. Get default vehicle status
    const statusId = await getDefaultVehicleStatusId(clientId);

    // 2. Create the trade-in vehicle record
    const newVehicleId = await createTradeInVehicleRecord(
      tradeInVehicle,
      clientId,
      statusId
    );

    if (!newVehicleId) {
      return { success: false, vehicleId: null };
    }

    // 3. Create purchase document for the trade-in
    await createTradeInDocument(
      newVehicleId,
      clientId,
      customerId,
      originalVehicleId,
      saleDocumentId
    );

    // 4. Create purchase record for the trade-in (registra el COSTO del auto recibido).
    // Si falla, el auto queda SIN costo en el resumen/margen → lo logueamos fuerte
    // para no descubrirlo recién en contabilidad.
    const purchaseOk = await createTradeInPurchaseRecord(
      newVehicleId,
      customerId,
      tradeInVehicle.trade_in_value,
      originalVehicleId
    );
    if (!purchaseOk) {
      console.error(
        `[trade-in] ⚠️ No se registró el costo (vehicles_purchases) del auto recibido ${newVehicleId} ` +
          `(valor ${tradeInVehicle.trade_in_value}). Quedó sin precio de compra; corregir manualmente.`
      );
    }

    return { success: true, vehicleId: newVehicleId };
  } catch (error) {
    console.error('Error in createTradeInVehicle:', error);
    return { success: false, vehicleId: null };
  }
};
