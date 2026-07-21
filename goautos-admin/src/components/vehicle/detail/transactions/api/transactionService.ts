import { supabase } from '@/integrations/supabase/client';
import { VehicleTransaction } from '../types';

// Control de llamadas simultáneas
const pendingRequests: Record<number, Promise<VehicleTransaction[]>> = {};

export async function fetchVehicleTransactions(
  vehicleId: number
): Promise<VehicleTransaction[]> {
  if (!vehicleId) {
    console.error('Vehicle ID is required for fetching transactions');
    return [];
  }

  // Si ya hay una petición en curso para este vehículo, devuelve esa promesa
  if (pendingRequests[vehicleId]) {
    return pendingRequests[vehicleId];
  }

  // Crea una nueva petición
  const request = _doFetchTransactions(vehicleId);
  pendingRequests[vehicleId] = request;

  try {
    // Espera el resultado
    const result = await request;
    return result;
  } finally {
    // Limpia la petición pendiente después de completada
    delete pendingRequests[vehicleId];
  }
}

// Función privada que realiza la consulta real
async function _doFetchTransactions(
  vehicleId: number
): Promise<VehicleTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('vehicles_extras')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching vehicle transactions:', error);
      return [];
    }

    // Process data to ensure docs_urls is always an array
    const processedData = data.map((item) => ({
      ...item,
      docs_urls: Array.isArray(item.docs_urls)
        ? item.docs_urls
        : typeof item.docs_urls === 'string' && item.docs_urls.startsWith('[')
        ? JSON.parse(item.docs_urls)
        : item.docs_urls
        ? [item.docs_urls]
        : [],
    }));

    return processedData;
  } catch (error) {
    console.error('Error in fetchVehicleTransactions:', error);
    return [];
  }
}

export async function addVehicleTransaction(
  vehicleId: number,
  values: Partial<VehicleTransaction>,
  docUrls: string[]
): Promise<boolean> {
  try {
    // Regla 3 (IVA por línea): genera_credito_fiscal va DIRECTO en el insert (la migración
    // 20260618000000 ya está aplicada). Solo aplica a gastos; en ingresos queda null.
    const { error } = await supabase.from('vehicles_extras').insert({
      vehicle_id: vehicleId,
      title: values.title,
      description: values.description,
      amount: values.amount,
      type: values.type,
      category_id: values.category_id ?? null,
      docs_urls: docUrls.length > 1 ? JSON.stringify(docUrls) : (docUrls[0] ?? null),
      assumed_by: values.assumed_by ?? 'dealership', // Quién asume el gasto
      genera_credito_fiscal:
        values.type === 'expense' || values.type === 'income'
          ? !!(values as any).genera_credito_fiscal
          : null,
      // Pass-through: dinero solo traspasado → informativo, fuera del margen.
      is_passthrough: !!(values as any).is_passthrough,
    });

    if (error) {
      console.error('Error adding vehicle transaction:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addVehicleTransaction:', error);
    return false;
  }
}
