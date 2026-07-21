import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateFilter } from './useSellerPerformance';

export interface StateRecord {
  vehicleId: number;
  vehicleName: string;
  licensePlate: string;
  enteredAt: string;
  exitedAt: string | null;
  daysInState: number;
  changedBy: string;
  isCurrentlyInState: boolean;
}

export interface StateMetrics {
  totalCompleted: number;
  averageDays: number;
  currentlyInState: number;
  records: StateRecord[];
}

// Mantener compatibilidad con nombres anteriores
export type PreparationRecord = StateRecord;
export type PreparationMetrics = StateMetrics;

const DEFAULT_METRICS: StateMetrics = {
  totalCompleted: 0,
  averageDays: 0,
  currentlyInState: 0,
  records: [],
};

export const usePreparationMetrics = (
  clientId: number | undefined,
  dateFilter: DateFilter,
  selectedStateId?: number // Ahora acepta ID directamente
) => {
  const { data: metrics = DEFAULT_METRICS, isLoading: loading } = useQuery({
    queryKey: [
      'preparationMetrics',
      clientId,
      dateFilter.startDate?.getTime(),
      dateFilter.endDate?.getTime(),
      selectedStateId,
    ],
    queryFn: async (): Promise<StateMetrics> => {
      let stateId = selectedStateId;

      // Si no se proporciona ID, buscar estado "Preparación" por defecto
      if (!stateId) {
        const { data: statesData, error: statesError } = await supabase
          .from('clients_vehicles_states')
          .select('id, name')
          .eq('client_id', clientId!)
          .ilike('name', '%Preparación%');

        if (statesError) {
          console.error('Error fetching states:', statesError);
          return DEFAULT_METRICS;
        }

        if (!statesData || statesData.length === 0) {
          console.log('No preparation state found for client', clientId);
          return DEFAULT_METRICS;
        }

        stateId = statesData[0].id;
      }

      const targetStateId = stateId;

      // Obtener historial de cambios donde new_status_id = targetStateId
      let historyQuery = supabase
        .from('vehicles_status_history')
        .select(`
            id,
            vehicle_id,
            old_status_id,
            new_status_id,
            changed_at,
            changed_by,
            user:changed_by(id, first_name, last_name),
            vehicle:vehicle_id(
              id,
              license_plate,
              status_id,
              brand:brand_id(name),
              model:model_id(name)
            )
          `)
        .eq('new_status_id', targetStateId)
        .order('changed_at', { ascending: true });

      // Aplicar filtros de fecha
      if (dateFilter.startDate) {
        historyQuery = historyQuery.gte('changed_at', dateFilter.startDate.toISOString());
      }
      if (dateFilter.endDate) {
        historyQuery = historyQuery.lte('changed_at', dateFilter.endDate.toISOString());
      }

      const { data: entryHistory, error: entryError } = await historyQuery;

      if (entryError) {
        console.error('Error fetching entry history:', entryError);
        return DEFAULT_METRICS;
      }

      // Para cada entrada, buscar cuándo salió del estado
      const records: StateRecord[] = [];
      const vehicleIds = [...new Set(entryHistory?.map(h => h.vehicle_id) || [])];

      // Obtener todos los cambios de estado para estos vehículos
      const { data: allHistory, error: allHistoryError } = await supabase
        .from('vehicles_status_history')
        .select('id, vehicle_id, old_status_id, new_status_id, changed_at')
        .in('vehicle_id', vehicleIds)
        .order('changed_at', { ascending: true });

      if (allHistoryError) {
        console.error('Error fetching all history:', allHistoryError);
      }

      // Procesar cada entrada al estado
      for (const entry of entryHistory || []) {
        const vehicleHistory = allHistory?.filter(h => h.vehicle_id === entry.vehicle_id) || [];

        // Buscar el siguiente cambio de estado después de entrar
        const exitRecord = vehicleHistory.find(h =>
          h.old_status_id === targetStateId &&
          new Date(h.changed_at) > new Date(entry.changed_at)
        );

        const enteredAt = new Date(entry.changed_at);
        const exitedAt = exitRecord ? new Date(exitRecord.changed_at) : null;
        const now = new Date();

        // Calcular días en el estado
        const endDate = exitedAt || now;
        const daysInState = Math.max(1, Math.round(
          (endDate.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24)
        ));

        // Verificar si actualmente está en el estado
        const isCurrentlyInState = (entry.vehicle as any)?.status_id === Number(targetStateId);

        const user = entry.user as any;
        const vehicle = entry.vehicle as any;

        records.push({
          vehicleId: entry.vehicle_id,
          vehicleName: `${vehicle?.brand?.name || ''} ${vehicle?.model?.name || ''}`.trim() || 'Sin nombre',
          licensePlate: vehicle?.license_plate || 'Sin patente',
          enteredAt: entry.changed_at,
          exitedAt: exitRecord?.changed_at || null,
          daysInState,
          changedBy: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Desconocido',
          isCurrentlyInState,
        });
      }

      // Calcular métricas
      const completedRecords = records.filter(r => !r.isCurrentlyInState);
      const totalCompleted = completedRecords.length;
      const currentlyInState = records.filter(r => r.isCurrentlyInState).length;
      const averageDays = completedRecords.length > 0
        ? Math.round(completedRecords.reduce((sum, r) => sum + r.daysInState, 0) / completedRecords.length)
        : 0;

      return {
        totalCompleted,
        averageDays,
        currentlyInState,
        records: records.sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime()),
      };
    },
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  });

  return { metrics, loading };
};
