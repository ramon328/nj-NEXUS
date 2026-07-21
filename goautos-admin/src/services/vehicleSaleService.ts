import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { createTradeInVehicle } from './tradeInVehicleService';
import posthog from '@/utils/posthog';
import {
  createSaleAdditional,
  createSaleAdditionalByVehicleId,
  getSaleAdditionals,
  updateSaleAdditional,
  deleteSaleAdditional,
} from './sale/saleAdditionalService';
import {
  CommissionSplitInput,
  CommissionSplit,
  calculateSplitAmounts,
} from '@/types/sales';
import {
  markSoldInChileautos,
  getChileautosIntegration,
  getChileautosListingByVehicle,
} from './chileautosService';

// Types
export interface TradeInVehicle {
  license_plate: string;
  brand?: string;
  brand_id?: string;
  model?: string;
  model_id?: string | number;
  year: number;
  trade_in_value: number;
}

// Interface for payment breakdown
export interface PaymentItem {
  id: string;
  title: string;
  amount: number;
  /** Vencimiento de la cuota/letra a plazo (YYYY-MM-DD). Solo pendientes. */
  dueDate?: string;
  /** false = cuota/letra a plazo (pendiente); true/undefined = pago recibido. */
  paid?: boolean;
}

export interface SaleAdditional {
  id?: number;
  title: string;
  price: number;
  description?: string;
  /** Toggle del wizard: 'income' (cliente paga) | 'expense' (automotora absorbe). */
  kind?: 'income' | 'expense';
  /** assumed_by ORIGINAL de la BD, para preservarlo al sincronizar (ej. 'consignor'). */
  assumedBy?: 'dealership' | 'customer' | 'consignor';
}

interface SaleData {
  vehicleId: number;
  customerId: number | null;
  salePrice: number;
  commissionPercentage?: number | null;
  paymentMethod?: string;
  financiera?: string;
  /** Comisión que paga la financiera a la automotora (uso interno, suma a la utilidad). */
  financingCommission?: number;
  notes?: string;
  clientId: number;
  sellerId?: number | null;
  tradeInVehicle?: TradeInVehicle;  // legacy single
  tradeInVehicles?: TradeInVehicle[]; // new: multiple
  payments?: PaymentItem[];
  additionals?: SaleAdditional[];
  document_id?: number;
  transferValue?: number;
  /** ¿El CRT se le cobra al cliente? Persiste en vehicles_sales.transfer_value_charged. */
  transferValueCharged?: boolean;
  commissionSplits?: CommissionSplitInput[];
  registeredByAdmin?: boolean;
  // Fecha de la venta en formato YYYY-MM-DD. Si no viene, se usa hoy.
  // Permite registrar ventas retroactivas (backfill desde Excel histórico).
  saleDate?: string;
}

// Convierte un YYYY-MM-DD del input a un timestamp ISO conservando el
// día tal cual lo eligió la usuaria (mediodía local para evitar saltos
// de día por zona horaria al pasarlo a UTC).
const buildSaleDateISO = (saleDate?: string): string => {
  if (!saleDate) return new Date().toISOString();
  const parsed = new Date(`${saleDate}T12:00:00`);
  if (isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
};

/**
 * Checks if an active reservation exists for a vehicle
 * Returns the reservation data if found
 */
const checkActiveReservation = async (
  vehicleId: number
): Promise<{ exists: boolean; reservationId?: number; customerId?: number }> => {
  try {
    const { data, error } = await supabase
      .from('vehicles_reservations')
      .select('id, customer_id')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error checking active reservation:', error);
      return { exists: false };
    }

    if (data) {
      return {
        exists: true,
        reservationId: data.id,
        customerId: data.customer_id,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Exception checking active reservation:', error);
    return { exists: false };
  }
};

/**
 * Completes a reservation when a sale is registered
 * This marks the reservation as fulfilled
 */
const completeReservationOnSale = async (
  reservationId: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('vehicles_reservations')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId);

    if (error) {
      console.error('Error completing reservation:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception completing reservation:', error);
    return false;
  }
};

/**
 * Checks if a sale already exists for a vehicle
 */
const checkExistingSale = async (
  vehicleId: number
): Promise<{ exists: boolean; saleId?: number; documentId?: number }> => {
  try {
    const { data, error } = await supabase
      .from('vehicles_sales')
      .select('id, document_id')
      .eq('vehicle_id', vehicleId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Sale] Error checking existing sale:', error);
      return { exists: false };
    }

    if (!data) {
      return { exists: false };
    }

    return {
      exists: true,
      saleId: data.id,
      documentId: data.document_id,
    };
  } catch (error) {
    console.error('[Sale] Exception checking existing sale:', error);
    return { exists: false };
  }
};

/**
 * Creates or updates a sale document record for a vehicle
 * If a sale document already exists, it updates it instead of creating a new one
 */
const createSaleDocument = async (
  vehicleId: number,
  customerId: number | null,
  clientId: number,
  notes?: string,
  saleDate?: string
): Promise<number | null> => {
  try {
    const documentDateISO = buildSaleDateISO(saleDate);

    // First, check if a sale document already exists for this vehicle
    const { data: existingDoc, error: checkError } = await supabase
      .from('vehicles_documents')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .eq('type', 'sale')
      .eq('client_id', clientId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing sale document:', checkError);
      // Continue to create a new document if check fails
    }

    // If document exists, update it
    if (existingDoc) {
      console.log(
        `[Sale] Updating existing sale document ${existingDoc.id} for vehicle ${vehicleId}`
      );

      const { error: updateError } = await supabase
        .from('vehicles_documents')
        .update({
          customer_id: customerId,
          status: 'completed',
          notes: notes || null,
          updated_at: new Date().toISOString(),
          document_date: documentDateISO,
        })
        .eq('id', existingDoc.id);

      if (updateError) {
        console.error('[Sale] Error updating sale document:', updateError.message, updateError.code);
        return null;
      }

      return existingDoc.id;
    }

    // If no existing document, create a new one
    console.log(`Creating new sale document for vehicle ${vehicleId}`);

    const insertObj: any = {
      vehicle_id: vehicleId,
      type: 'sale',
      client_id: clientId,
      customer_id: customerId,
      status: 'completed',
      notes: notes || null,
      document_date: documentDateISO,
    };

    const { data, error } = await supabase
      .from('vehicles_documents')
      .insert(insertObj)
      .select('id')
      .single();

    if (error) {
      console.error('[Sale] DB error creating sale document:', error.message, error.code, error.details, error.hint);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Exception creating sale document:', error);
    return null;
  }
};

/**
 * Calculates commission for a sale if a seller is involved
 */
const calculateCommission = async (
  sellerId: number | null,
  salePrice: number
): Promise<{ amount: number; percentage: number }> => {
  if (!sellerId) {
    return { amount: 0, percentage: 0 };
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      'calculate_commission',
      {
        body: { sellerId, saleAmount: salePrice },
      }
    );

    if (error) {
      console.error('Error calculating commission:', error);
      return { amount: 0, percentage: 0 };
    }

    if (data?.error) {
      console.error('Commission edge function error:', data.error);
      return { amount: 0, percentage: 0 };
    }

    return {
      amount: data?.commission || 0,
      percentage: data?.percentage || 0,
    };
  } catch (err) {
    console.error('Exception calculating commission:', err);
    return { amount: 0, percentage: 0 };
  }
};

/**
 * Creates a sales record in the database
 */
const createSaleRecord = async (
  vehicleId: number,
  customerId: number | null,
  documentId: number,
  salePrice: number,
  paymentMethod: string,
  sellerId: number | null,
  commissionAmount: number,
  commissionPercentage: number,
  tradeInData: {
    hasTradeIn: boolean;
    tradeInVehicleId: number | null;
    tradeInValue: number;
  },
  payments?: PaymentItem[],
  financiera?: string,
  registeredByAdmin?: boolean,
  saleDate?: string,
  financingCommission?: number,
  transferValue?: number,
  transferValueCharged?: boolean
): Promise<number | null> => {
  try {
    // Prepare payment data for storage by removing unnecessary id field
    const paymentData =
      payments?.map(({ title, amount, dueDate, paid }) => ({ title, amount, dueDate, paid })) || null;

    const insertPayload = {
      vehicle_id: vehicleId,
      customer_id: customerId,
      document_id: documentId,
      sale_price: salePrice,
      sale_date: buildSaleDateISO(saleDate),
      payment_method: paymentMethod || 'cash',
      seller_id: sellerId || null,
      status: registeredByAdmin ? 'approved' : 'pending',
      commission_amount: commissionAmount,
      commission_percentage: commissionPercentage,
      commission_status: sellerId ? 'pending' : null,
      // Trade-in data
      has_trade_in: tradeInData.hasTradeIn,
      trade_in_vehicle_id: tradeInData.tradeInVehicleId || null,
      trade_in_value: tradeInData.tradeInValue,
      // Payment breakdown data
      payment_breakdown: paymentData ? JSON.stringify(paymentData) : null,
      // Financiera (when payment is credit)
      financiera: financiera || null,
      // Comisión financiera (uso interno, suma a la utilidad del auto)
      financing_commission: financingCommission || null,
      // Valor de transferencia (CRT): se persiste también en la venta para cerrar
      // la asimetría con la tabla vehicles, y el flag de si se le cobra al cliente.
      transfer_value: transferValue ?? 0,
      transfer_value_charged: transferValueCharged ?? true,
    };

    console.log('[Sale] Insert payload:', JSON.stringify(insertPayload, null, 2));

    // Retry up to 2 times for transient DB errors
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { data, error } = await supabase
        .from('vehicles_sales')
        .insert(insertPayload)
        .select('id')
        .single();

      if (!error) {
        return data.id;
      }

      console.error(`[Sale] DB error creating sale record (attempt ${attempt}/2):`, error.message, error.code, error.details, error.hint);

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return null;
  } catch (error) {
    console.error('[Sale] Exception creating sale record:', error);
    return null;
  }
};

/**
 * Updates the vehicle status after sale
 */
const updateVehicleStatus = async (
  vehicleId: number,
  clientId: number
): Promise<boolean> => {
  try {
    console.log(
      `Attempting to update vehicle ${vehicleId} status to 'sold' for client ${clientId}`
    );

    // First, get the "Vendido" status ID for this client
    let soldStatusId: number | null = null;

    // Strategy 1: Search by name containing "vendido"
    const { data: soldStatuses, error: statusError } = await supabase
      .from('clients_vehicles_states')
      .select('id, name')
      .eq('client_id', clientId)
      .ilike('name', '%vendido%')
      .limit(1);

    if (!statusError && soldStatuses && soldStatuses.length > 0) {
      soldStatusId = soldStatuses[0].id;
      console.log(
        `Found "Vendido" status: ${soldStatuses[0].name} (ID: ${soldStatuses[0].id})`
      );
    } else {
      console.warn('[Sale] No status matching "vendido" found, trying fallbacks...');

      // Strategy 2: Search by common sold-related names
      const { data: fallbackStatuses, error: fallbackError } = await supabase
        .from('clients_vehicles_states')
        .select('id, name')
        .eq('client_id', clientId)
        .or('name.ilike.%sold%,name.ilike.%venta%,name.ilike.%vendido%')
        .limit(1);

      if (!fallbackError && fallbackStatuses && fallbackStatuses.length > 0) {
        soldStatusId = fallbackStatuses[0].id;
        console.log(
          `[Sale] Using fallback status: ${fallbackStatuses[0].name} (ID: ${fallbackStatuses[0].id})`
        );
      } else {
        // Strategy 3: Use the state with the highest order (usually "Vendido" is the last state)
        const { data: lastState, error: lastStateError } = await supabase
          .from('clients_vehicles_states')
          .select('id, name')
          .eq('client_id', clientId)
          .order('order', { ascending: false })
          .limit(1);

        if (!lastStateError && lastState && lastState.length > 0) {
          soldStatusId = lastState[0].id;
          console.log(
            `[Sale] Using last-order fallback status: ${lastState[0].name} (ID: ${lastState[0].id})`
          );
        } else {
          console.error('[Sale] No vehicle states found at all for client:', clientId);
          return false;
        }
      }
    }

    if (!soldStatusId) {
      console.error('Could not determine sold status ID');
      return false;
    }

    // Check if the vehicle exists and belongs to the client
    const { data: vehicleCheck, error: checkError } = await supabase
      .from('vehicles')
      .select('id, status_id, client_id')
      .eq('id', vehicleId)
      .eq('client_id', clientId)
      .single();

    if (checkError) {
      console.error('Error checking vehicle existence:', checkError);
      return false;
    }

    if (!vehicleCheck) {
      console.error(`Vehicle ${vehicleId} not found for client ${clientId}`);
      return false;
    }

    console.log(`Vehicle found - Current status_id: ${vehicleCheck.status_id}`);

    const { data, error } = await supabase
      .from('vehicles')
      .update({
        status_id: soldStatusId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehicleId)
      .eq('client_id', clientId)
      .select('id, status_id');

    if (error) {
      console.error('Error updating vehicle status:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.error('No rows were updated when changing vehicle status');
      return false;
    }

    console.log(
      `Successfully updated vehicle ${vehicleId} to status_id: ${data[0].status_id}`
    );
    return true;
  } catch (error) {
    console.error('Exception updating vehicle status:', error);
    return false;
  }
};

/**
 * Creates sale additionals in the database
 */
const createSaleAdditionals = async (
  additionals: SaleAdditional[],
  vehicleId: number,
  saleDate: Date = new Date()
): Promise<boolean> => {
  try {
    if (!additionals || additionals.length === 0) {
      return true; // No additionals to create
    }

    // Create each additional
    const promises = additionals.map((additional) =>
      createSaleAdditionalByVehicleId(
        vehicleId,
        additional.price,
        saleDate,
        additional.title,
        additional.description || null,
        (additional as any).kind === 'expense' ? 'expense' : 'income',
        // Pass-through: se persiste en la creación para que la línea nazca fuera del margen.
        !!(additional as any).isPassthrough
      )
    );

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error creating sale additionals:', error);
    return false;
  }
};

/**
 * Synchronizes sale additionals during an update (create, update, delete as needed)
 */
const syncSaleAdditionals = async (
  newAdditionals: SaleAdditional[],
  vehicleId: number,
  saleDate: Date = new Date()
): Promise<boolean> => {
  try {
    // Get existing additionals for this vehicle
    const existingAdditionals = await getSaleAdditionals(vehicleId);

    // Create a map of existing additionals by ID for easy lookup
    const existingMap = new Map(
      existingAdditionals.map((add) => [add.id, add])
    );

    // Track which existing additionals are still present in the new list
    const preservedIds = new Set<number>();

    // Process new additionals
    for (const newAdd of newAdditionals) {
      const kind: 'income' | 'expense' =
        (newAdd as any).kind === 'expense' ? 'expense' : 'income';
      // Preservación del assumed_by original: el toggle del wizard es binario
      // (income/expense) y no puede representar 'consignor'. Si la fila trae su
      // assumed_by original y el usuario NO cambió el tipo (el kind sigue siendo el
      // que ese assumed_by representa), reescribimos el valor original tal cual —
      // así editar una venta no aplasta un 'consignor' seteado en el cierre.
      const originalAssumedBy = (newAdd as any).assumedBy as
        | 'dealership'
        | 'customer'
        | 'consignor'
        | undefined;
      const kindFromOriginal: 'income' | 'expense' =
        originalAssumedBy === 'dealership' ? 'expense' : 'income';
      const assumedByOverride =
        originalAssumedBy && kind === kindFromOriginal
          ? originalAssumedBy
          : undefined;
      // Pass-through: se escribe SIEMPRE en el update (no solo cuando el usuario lo
      // toca) para que editar la venta preserve el flag cargado desde el cierre o una
      // edición previa — de lo contrario el update lo dejaría en su default (false).
      const isPassthrough = !!(newAdd as any).isPassthrough;
      if (newAdd.id && existingMap.has(newAdd.id)) {
        // Update existing additional
        await updateSaleAdditional(
          newAdd.id,
          newAdd.price,
          saleDate,
          newAdd.title,
          newAdd.description || null,
          kind,
          assumedByOverride,
          isPassthrough
        );
        preservedIds.add(newAdd.id);
      } else {
        // Create new additional
        await createSaleAdditionalByVehicleId(
          vehicleId,
          newAdd.price,
          saleDate,
          newAdd.title,
          newAdd.description || null,
          kind,
          isPassthrough
        );
      }
    }

    // Delete additionals that are no longer in the new list
    for (const existingAdd of existingAdditionals) {
      if (!preservedIds.has(existingAdd.id)) {
        await deleteSaleAdditional(existingAdd.id);
      }
    }

    return true;
  } catch (error) {
    console.error('Error syncing sale additionals:', error);
    return false;
  }
};

/**
 * Creates commission splits for a sale
 */
const createCommissionSplits = async (
  saleId: number,
  splits: CommissionSplitInput[],
  totalCommission: number
): Promise<boolean> => {
  try {
    if (!splits || splits.length === 0) {
      return true; // No splits to create
    }

    // Calculate amounts for each split
    const calculatedSplits = calculateSplitAmounts(splits, totalCommission);

    // Filter out splits without a user
    const validSplits = calculatedSplits.filter((split) => split.user_id);

    if (validSplits.length === 0) {
      return true;
    }

    // Insert all splits
    const { error } = await supabase
      .from('sale_commission_splits')
      .insert(
        validSplits.map((split) => ({
          sale_id: saleId,
          user_id: split.user_id,
          split_type: split.split_type,
          percentage: split.percentage,
          amount: split.amount,
          notes: split.notes,
        }))
      );

    if (error) {
      console.error('Error creating commission splits:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception creating commission splits:', error);
    return false;
  }
};

/**
 * Gets commission splits for a sale
 */
export const getCommissionSplits = async (
  saleId: number
): Promise<CommissionSplit[]> => {
  try {
    const { data, error } = await supabase
      .from('sale_commission_splits')
      .select(`
        id,
        sale_id,
        user_id,
        split_type,
        percentage,
        amount,
        notes,
        created_at,
        updated_at
      `)
      .eq('sale_id', saleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching commission splits:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching commission splits:', error);
    return [];
  }
};

/**
 * Gets commission splits with user details for display
 */
export const getCommissionSplitsWithUsers = async (saleId: number) => {
  try {
    const { data, error } = await supabase
      .from('sale_commission_splits')
      .select(`
        id,
        sale_id,
        user_id,
        split_type,
        percentage,
        amount,
        notes,
        created_at,
        updated_at,
        user:users!user_id(id, first_name, last_name, email, rol)
      `)
      .eq('sale_id', saleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching commission splits with users:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching commission splits with users:', error);
    return [];
  }
};

/**
 * Syncs commission splits for an existing sale (delete old, create new)
 */
export const syncCommissionSplits = async (
  saleId: number,
  splits: CommissionSplitInput[],
  totalCommission: number
): Promise<boolean> => {
  try {
    // Delete existing splits
    const { error: deleteError } = await supabase
      .from('sale_commission_splits')
      .delete()
      .eq('sale_id', saleId);

    if (deleteError) {
      console.error('Error deleting existing commission splits:', deleteError);
      return false;
    }

    // Create new splits
    if (splits && splits.length > 0) {
      return await createCommissionSplits(saleId, splits, totalCommission);
    }

    return true;
  } catch (error) {
    console.error('Exception syncing commission splits:', error);
    return false;
  }
};

/**
 * Main function to register a vehicle sale
 */
export const registerVehicleSale = async (
  saleData: SaleData
): Promise<boolean | { success: true; saleId: number }> => {
  const {
    vehicleId,
    customerId,
    salePrice,
    paymentMethod,
    financiera,
    financingCommission,
    notes,
    clientId,
    sellerId,
    tradeInVehicle,
    tradeInVehicles,
    payments,
    additionals,
    commissionSplits,
    transferValue,
    transferValueCharged,
  } = saleData;

  try {
    console.log('[Sale] Starting sale registration for vehicle:', vehicleId, 'customer:', customerId, 'client:', clientId);

    // Validate required fields. customerId is optional: a sale without a customer
    // is allowed (e.g. internal stock movement, vehicle owned by the dealership).
    if (!vehicleId || !clientId) {
      console.error('[Sale] Missing required fields - vehicleId:', vehicleId, 'clientId:', clientId);
      toast({
        title: 'Error',
        description: 'Faltan datos requeridos para registrar la venta.',
        variant: 'destructive',
      });
      return false;
    }

    if (!salePrice || salePrice <= 0) {
      console.error('[Sale] Invalid sale price:', salePrice);
      toast({
        title: 'Error',
        description: 'El precio de venta debe ser mayor a 0.',
        variant: 'destructive',
      });
      return false;
    }

    // 0. Check if a sale already exists for this vehicle
    const existingSaleCheck = await checkExistingSale(vehicleId);

    if (existingSaleCheck.exists) {
      console.error(
        `[Sale] Sale already exists for vehicle ${vehicleId}. Sale ID: ${existingSaleCheck.saleId}`
      );
      toast({
        title: 'Error',
        description:
          'Este vehículo ya tiene una venta registrada. Por favor, edita la venta existente en lugar de crear una nueva.',
        variant: 'destructive',
      });
      return false;
    }

    // 0.5 Check for active reservation and complete it automatically
    const activeReservation = await checkActiveReservation(vehicleId);
    if (activeReservation.exists && activeReservation.reservationId) {
      console.log(
        `[Sale] Active reservation found for vehicle ${vehicleId}. Completing reservation ${activeReservation.reservationId}`
      );
      const reservationCompleted = await completeReservationOnSale(activeReservation.reservationId);
      if (reservationCompleted) {
        toast({
          title: 'Reserva completada',
          description: 'La reserva activa fue marcada como completada automáticamente.',
        });
      }
    }

    // 1. Create sale document
    console.log('[Sale] Step 1: Creating sale document...');
    const documentId = await createSaleDocument(
      vehicleId,
      customerId,
      clientId,
      notes,
      saleData.saleDate
    );

    if (!documentId) {
      console.error('[Sale] FAILED at Step 1: Could not create sale document');
      toast({
        title: 'Error',
        description: 'No se pudo crear el documento de venta. Intenta nuevamente.',
        variant: 'destructive',
      });
      return false;
    }
    console.log('[Sale] Step 1 OK: Document created with ID:', documentId);

    // 2. Handle trade-in vehicles if provided
    const allTradeIns = tradeInVehicles && tradeInVehicles.length > 0
      ? tradeInVehicles
      : tradeInVehicle ? [tradeInVehicle] : [];

    const tradeInResults: Array<{ vehicleId: number; vehicle: TradeInVehicle }> = [];
    let tradeInData = {
      hasTradeIn: false,
      tradeInVehicleId: null as number | null,
      tradeInValue: 0,
    };

    if (allTradeIns.length > 0) {
      console.log(`[Sale] Step 2: Processing ${allTradeIns.length} trade-in vehicle(s)...`);
      for (const tv of allTradeIns) {
        const tradeInResult = await createTradeInVehicle(
          tv,
          clientId,
          customerId,
          vehicleId,
          documentId
        );
        if (tradeInResult.success && tradeInResult.vehicleId) {
          tradeInResults.push({ vehicleId: tradeInResult.vehicleId, vehicle: tv });
          console.log('[Sale] Trade-in vehicle created with ID:', tradeInResult.vehicleId);
        } else {
          console.error('[Sale] WARNING: Error processing trade-in vehicle, continuing...');
        }
      }

      if (tradeInResults.length > 0) {
        const totalTradeInValue = tradeInResults.reduce((sum, r) => sum + r.vehicle.trade_in_value, 0);
        tradeInData = {
          hasTradeIn: true,
          tradeInVehicleId: tradeInResults[0].vehicleId, // legacy: first vehicle
          tradeInValue: totalTradeInValue,
        };
        console.log(`[Sale] Step 2 OK: ${tradeInResults.length} trade-in(s) processed, total value: ${totalTradeInValue}`);
      }
    }

    // 2.5 Check if client requires admin approval for sales
    let requireApproval = false;
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('require_sale_approval')
        .eq('id', clientId)
        .single();
      requireApproval = clientData?.require_sale_approval === true;
    } catch (err) {
      console.warn('[Sale] Could not fetch require_sale_approval, defaulting to false');
    }
    // Sale is auto-approved if client doesn't require approval, OR if registered by admin
    const isAutoApproved = !requireApproval || saleData.registeredByAdmin;
    console.log(`[Sale] require_sale_approval: ${requireApproval}, registeredByAdmin: ${saleData.registeredByAdmin}, isAutoApproved: ${isAutoApproved}`);

    // 3. Resolve commission. If the seller (or the form) provided a manual
    // percentage we honor it; otherwise we fall back to the commission tiers.
    let commissionAmount: number;
    let commissionPercentage: number;
    if (saleData.commissionPercentage != null && sellerId) {
      commissionPercentage = Number(saleData.commissionPercentage) || 0;
      commissionAmount = (salePrice * commissionPercentage) / 100;
      console.log('[Sale] Step 3 OK (manual): Commission:', commissionAmount, 'Percentage:', commissionPercentage);
    } else {
      console.log('[Sale] Step 3: Calculating commission for seller:', sellerId);
      const calc = await calculateCommission(sellerId, salePrice);
      commissionAmount = calc.amount;
      commissionPercentage = calc.percentage;
      console.log('[Sale] Step 3 OK (tier): Commission:', commissionAmount, 'Percentage:', commissionPercentage);
    }

    // 4. Create sales record
    console.log('[Sale] Step 4: Creating sale record...');
    const saleId = await createSaleRecord(
      vehicleId,
      customerId,
      documentId,
      salePrice,
      paymentMethod || 'cash',
      sellerId,
      commissionAmount,
      commissionPercentage,
      tradeInData,
      payments,
      financiera,
      isAutoApproved,
      saleData.saleDate,
      financingCommission,
      transferValue,
      transferValueCharged
    );

    if (!saleId) {
      console.error('[Sale] FAILED at Step 4: Could not create sale record in database');
      toast({
        title: 'Error',
        description: 'No se pudo crear el registro de venta en la base de datos. Intenta nuevamente.',
        variant: 'destructive',
      });
      return false;
    }
    console.log('[Sale] Step 4 OK: Sale record created with ID:', saleId);

    // 4b. Insert trade-in rows into junction table
    if (tradeInResults.length > 0) {
      console.log('[Sale] Step 4b: Inserting trade-in junction rows...');
      const junctionRows = tradeInResults.map((r) => ({
        vehicle_sale_id: saleId,
        trade_in_vehicle_id: r.vehicleId,
        license_plate: r.vehicle.license_plate,
        brand_name: r.vehicle.brand || '',
        model_name: r.vehicle.model || '',
        year: r.vehicle.year,
        trade_in_value: r.vehicle.trade_in_value,
      }));
      // Insert one-by-one to avoid batch RLS timeout issues with 3+ rows
      let junctionInserted = 0;
      for (const row of junctionRows) {
        const { error: junctionError } = await supabase
          .from('vehicles_sales_trade_ins')
          .insert(row);
        if (junctionError) {
          console.error('[Sale] Failed to insert trade-in junction row:', junctionError, row);
        } else {
          junctionInserted++;
        }
      }
      console.log(`[Sale] Step 4b: ${junctionInserted}/${junctionRows.length} junction row(s) inserted`);
    }

    // 5. Create sale additionals if provided
    if (additionals && additionals.length > 0) {
      const additionalsResult = await createSaleAdditionals(
        additionals,
        vehicleId,
        new Date(buildSaleDateISO(saleData.saleDate))
      );

      if (!additionalsResult) {
        console.error(
          'Error creating sale additionals, but continuing with sale'
        );
        // Don't fail the entire sale if additionals fail
      }
    }

    // 5.5 Create commission splits if provided
    if (commissionSplits && commissionSplits.length > 0) {
      const splitsResult = await createCommissionSplits(
        saleId,
        commissionSplits,
        commissionAmount
      );

      if (!splitsResult) {
        console.error(
          'Error creating commission splits, but continuing with sale'
        );
        // Don't fail the entire sale if splits fail
      }
    }

    // 6. Vehicle status update: mark as sold if the sale is auto-approved.
    // When require_sale_approval is off (default), all sales are auto-approved.
    // When require_sale_approval is on, only admin sales are auto-approved.
    if (isAutoApproved) {
      await updateVehicleStatus(vehicleId, clientId);
    }

    // 6.5 ChileAutos: mark as sold if sync_on_sold is enabled (fire-and-forget)
    try {
      const caIntegration = await getChileautosIntegration(clientId);
      if (caIntegration?.sync_on_sold && caIntegration.status === 'active') {
        const listing = await getChileautosListingByVehicle(vehicleId);
        if (listing && listing.status === 'published') {
          markSoldInChileautos(vehicleId, clientId).then((result) => {
            if (!result.success) {
              console.warn('[ChileAutos] Failed to mark as sold:', result.error);
            } else {
              console.log('[ChileAutos] Vehicle marked as sold successfully');
            }
          });
        }
      }
    } catch (caError) {
      console.warn('[ChileAutos] Error checking sync_on_sold:', caError);
    }

    // 7. Update transfer_value in vehicles table to keep it in sync
    if (saleData.transferValue !== undefined) {
      const { error: vehicleUpdateError } = await supabase
        .from('vehicles')
        .update({ transfer_value: saleData.transferValue })
        .eq('id', vehicleId);

      if (vehicleUpdateError) {
        console.error(
          'Error updating vehicle transfer_value:',
          vehicleUpdateError
        );
        // Don't return false here as the sale was created successfully
        // This is just a sync issue
      }
    }

    // Show success message
    toast({
      title: 'Éxito',
      description: tradeInVehicle
        ? 'Venta registrada con vehículo en parte de pago. El vehículo ha sido añadido al inventario.'
        : sellerId
        ? 'Venta registrada y en espera de aprobación'
        : 'Vehículo vendido correctamente',
    });

    posthog.capture({
      distinctId: String(clientId),
      event: 'vehicle_sale_registered',
      properties: {
        sale_id: saleId,
        vehicle_id: vehicleId,
        client_id: clientId,
        sale_price: salePrice,
        payment_method: paymentMethod,
        has_trade_in: !!tradeInVehicle,
        registered_by_admin: !!saleData.registeredByAdmin,
      },
    });

    // Return success with saleId for additionals flow
    return { success: true, saleId };
  } catch (error) {
    posthog.captureException(error);
    console.error('[Sale] Unhandled error in registerVehicleSale:', error);
    toast({
      title: 'Error',
      description: 'No pudimos registrar la venta. Verifica los datos e intenta de nuevo.',
      variant: 'destructive',
    });
    return false;
  }
};

/**
 * Updates an existing vehicle sale record
 */
export const updateVehicleSale = async (
  saleData: SaleData & { id: number; commissionAmount?: number }
): Promise<boolean> => {
  const {
    id,
    vehicleId,
    customerId,
    salePrice,
    paymentMethod,
    financiera,
    financingCommission,
    notes,
    clientId,
    sellerId,
    tradeInVehicle,
    payments,
    additionals,
    document_id,
    commissionSplits,
    commissionAmount,
    transferValueCharged,
  } = saleData as SaleData & { id: number; commissionAmount?: number };

  try {
    // First, get the current sale data to compare trade-in status
    const { data: currentSale, error: currentSaleError } = await supabase
      .from('vehicles_sales')
      .select('has_trade_in, trade_in_vehicle_id, trade_in_value')
      .eq('id', id)
      .single();

    if (currentSaleError) {
      console.error('Error fetching current sale data:', currentSaleError);
      return false;
    }

    // Handle trade-in vehicles (multiple)
    const allTradeIns = saleData.tradeInVehicles && saleData.tradeInVehicles.length > 0
      ? saleData.tradeInVehicles
      : tradeInVehicle ? [tradeInVehicle] : [];

    let tradeInData = {
      hasTradeIn: false,
      tradeInVehicleId: null as number | null,
      tradeInValue: 0,
    };

    // Delete existing junction rows — we'll re-insert below
    await supabase
      .from('vehicles_sales_trade_ins')
      .delete()
      .eq('vehicle_sale_id', id);

    if (allTradeIns.length > 0) {
      console.log(`[Sale Update] Processing ${allTradeIns.length} trade-in vehicle(s)...`);
      const tradeInResults: Array<{ vehicleId: number; vehicle: TradeInVehicle }> = [];

      for (const tv of allTradeIns) {
        // For new vehicles (no existing inventory record), create them
        if (!currentSale.has_trade_in || allTradeIns.length !== 1) {
          const result = await createTradeInVehicle(tv, clientId, customerId, vehicleId, document_id || 0);
          if (result.success && result.vehicleId) {
            tradeInResults.push({ vehicleId: result.vehicleId, vehicle: tv });
          }
        } else {
          // Keep existing for single trade-in update
          tradeInResults.push({ vehicleId: currentSale.trade_in_vehicle_id, vehicle: tv });
        }
      }

      if (tradeInResults.length > 0) {
        const totalValue = tradeInResults.reduce((s, r) => s + r.vehicle.trade_in_value, 0);
        tradeInData = {
          hasTradeIn: true,
          tradeInVehicleId: tradeInResults[0].vehicleId,
          tradeInValue: totalValue,
        };

        // Insert junction rows one-by-one to avoid batch RLS timeout
        for (const r of tradeInResults) {
          const { error: jErr } = await supabase.from('vehicles_sales_trade_ins').insert({
            vehicle_sale_id: id,
            trade_in_vehicle_id: r.vehicleId,
            license_plate: r.vehicle.license_plate,
            brand_name: r.vehicle.brand || '',
            model_name: r.vehicle.model || '',
            year: r.vehicle.year,
            trade_in_value: r.vehicle.trade_in_value,
          });
          if (jErr) console.error('[Sale Update] Failed junction row insert:', jErr);
        }
      }
    }

    // Prepare the payment data for storage
    const paymentData =
      payments?.map(({ title, amount, dueDate, paid }) => ({ title, amount, dueDate, paid })) || null;

    // Resolve commission updates: persist the manual percentage if provided,
    // but leave commission_amount alone. The approval flow recomputes amount
    // using commission_base_type (total/margin) and acquisition cost, and we
    // don't want to overwrite a margin-based decision with a total-based one.
    const commissionUpdate: { commission_percentage?: number } = {};
    if (saleData.commissionPercentage != null && sellerId) {
      commissionUpdate.commission_percentage = Number(saleData.commissionPercentage) || 0;
    }

    // Build optional sale_date update only when explicitly provided so old
    // flows that never edited the date don't accidentally wipe it.
    const saleDateUpdate: { sale_date?: string } = {};
    if (saleData.saleDate) {
      saleDateUpdate.sale_date = buildSaleDateISO(saleData.saleDate);
    }

    // Igual que la fecha: solo tocar transfer_value cuando el llamador lo manda.
    // Antes era `transfer_value: saleData.transferValue ?? 0`, lo que ponía la
    // transferencia en 0 en cada edición de venta donde no se enviaba el campo.
    const transferValueUpdate: { transfer_value?: number } = {};
    if (saleData.transferValue !== undefined) {
      transferValueUpdate.transfer_value = saleData.transferValue;
    }

    // Flag de cobro del CRT: igual, solo tocar cuando el llamador lo manda.
    const transferChargedUpdate: { transfer_value_charged?: boolean } = {};
    if (transferValueCharged !== undefined) {
      transferChargedUpdate.transfer_value_charged = transferValueCharged;
    }

    // Update the sale record
    const { error } = await supabase
      .from('vehicles_sales')
      .update({
        customer_id: customerId,
        sale_price: salePrice,
        payment_method: paymentMethod || 'cash',
        financiera: financiera || null,
        financing_commission: financingCommission ?? null,
        seller_id: sellerId,
        // Update trade-in related fields
        has_trade_in: tradeInData.hasTradeIn,
        trade_in_vehicle_id: tradeInData.tradeInVehicleId,
        trade_in_value: tradeInData.tradeInValue,
        // Payment breakdown data
        payment_breakdown: paymentData ? JSON.stringify(paymentData) : null,
        ...transferValueUpdate,
        ...transferChargedUpdate,
        ...commissionUpdate,
        ...saleDateUpdate,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating sale record:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la venta',
        variant: 'destructive',
      });
      return false;
    }

    // Update transfer_value in vehicles table to keep it in sync
    if (saleData.transferValue !== undefined) {
      const { error: vehicleUpdateError } = await supabase
        .from('vehicles')
        .update({ transfer_value: saleData.transferValue })
        .eq('id', vehicleId);

      if (vehicleUpdateError) {
        console.error(
          'Error updating vehicle transfer_value:',
          vehicleUpdateError
        );
        // Don't return false here as the sale was updated successfully
        // This is just a sync issue
      }
    }

    // Sync sale additionals if provided
    if (additionals !== undefined) {
      const additionalsResult = await syncSaleAdditionals(
        additionals,
        vehicleId,
        new Date(buildSaleDateISO(saleData.saleDate))
      );

      if (!additionalsResult) {
        console.error(
          'Error syncing sale additionals, but continuing with update'
        );
        // Don't fail the entire update if additionals sync fails
      }
    }

    // Sync commission splits if provided
    if (commissionSplits !== undefined && commissionAmount !== undefined) {
      const splitsResult = await syncCommissionSplits(
        id,
        commissionSplits,
        commissionAmount
      );

      if (!splitsResult) {
        console.error(
          'Error syncing commission splits, but continuing with update'
        );
        // Don't fail the entire update if splits sync fails
      }
    }

    // Update the document notes if provided
    if (document_id) {
      const docUpdate: { notes: string | null; customer_id: number | null; document_date?: string } = {
        notes: notes || null,
        customer_id: customerId,
      };
      // Sync document_date with sale_date so the document list card shows
      // the same fecha as the PDF and the reports.
      if (saleData.saleDate) {
        docUpdate.document_date = buildSaleDateISO(saleData.saleDate);
      }

      const { error: docError } = await supabase
        .from('vehicles_documents')
        .update(docUpdate)
        .eq('id', document_id);

      if (docError) {
        console.error('Error updating document:', docError);
      }
    }

    // Show success message with context
    let successMessage = 'Venta actualizada correctamente';
    if (tradeInVehicle && !currentSale.has_trade_in) {
      successMessage += '. Vehículo en parte de pago agregado al inventario';
    } else if (!tradeInVehicle && currentSale.has_trade_in) {
      successMessage += '. Vehículo en parte de pago removido';
    }

    toast({
      title: 'Éxito',
      description: successMessage,
    });

    posthog.capture({
      distinctId: String(clientId),
      event: 'vehicle_sale_updated',
      properties: {
        sale_id: id,
        vehicle_id: vehicleId,
        client_id: clientId,
        sale_price: salePrice,
        payment_method: paymentMethod,
      },
    });

    return true;
  } catch (error) {
    posthog.captureException(error);
    console.error('Error in updateVehicleSale:', error);
    toast({
      title: 'Error',
      description: 'Ocurrió un error al actualizar la venta',
      variant: 'destructive',
    });
    return false;
  }
};
