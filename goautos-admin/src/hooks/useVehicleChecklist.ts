import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  VehicleChecklistItem,
  ChecklistSummary,
} from '@/types/vehicleChecklist';
import {
  getVehicleChecklist,
  toggleVehicleChecklistItem,
  updateVehicleChecklistItem,
  getVehicleChecklistSummary,
  initializeVehicleChecklist,
} from '@/services/vehicleChecklistService';
import { toast } from '@/hooks/use-toast';

interface UseVehicleChecklistOptions {
  vehicleId: number;
  autoInitialize?: boolean;
}

interface UseVehicleChecklistReturn {
  checklist: VehicleChecklistItem[];
  summary: ChecklistSummary;
  isLoading: boolean;
  isInitializing: boolean;
  error: Error | null;
  toggleItem: (itemId: number) => Promise<void>;
  updateItemNotes: (itemId: number, notes: string) => Promise<void>;
  refetch: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useVehicleChecklist = ({
  vehicleId,
  autoInitialize = false,
}: UseVehicleChecklistOptions): UseVehicleChecklistReturn => {
  const { user, clientId } = useAuth();
  const [checklist, setChecklist] = useState<VehicleChecklistItem[]>([]);
  const [summary, setSummary] = useState<ChecklistSummary>({
    total: 0,
    completed: 0,
    pending: 0,
    percentComplete: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs para evitar bucles infinitos
  const hasTriedAutoInit = useRef(false);
  const isMounted = useRef(true);

  const fetchChecklist = useCallback(async () => {
    if (!vehicleId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [checklistData, summaryData] = await Promise.all([
        getVehicleChecklist(vehicleId),
        getVehicleChecklistSummary(vehicleId),
      ]);

      if (isMounted.current) {
        setChecklist(checklistData);
        setSummary(summaryData);
      }
    } catch (err) {
      console.error('Error fetching vehicle checklist:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Error al cargar checklist'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [vehicleId]);

  const initialize = useCallback(async () => {
    if (!vehicleId || !clientId) {
      console.warn('Cannot initialize checklist: missing vehicleId or clientId');
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      await initializeVehicleChecklist(vehicleId, clientId);
      // Esperar un poco para que la BD procese
      await new Promise(resolve => setTimeout(resolve, 100));
      await fetchChecklist();

      toast({
        title: 'Checklist inicializado',
        description: 'Se creó el checklist para este vehículo',
      });
    } catch (err) {
      console.error('Error initializing vehicle checklist:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Error al inicializar checklist'));
        toast({
          title: 'Error',
          description: 'No se pudo inicializar el checklist',
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setIsInitializing(false);
      }
    }
  }, [vehicleId, clientId, fetchChecklist]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    isMounted.current = true;
    hasTriedAutoInit.current = false;

    if (vehicleId) {
      fetchChecklist();
    }

    return () => {
      isMounted.current = false;
    };
  }, [vehicleId, fetchChecklist]);

  // Auto-inicializar SOLO UNA VEZ si está habilitado y no hay items
  useEffect(() => {
    if (
      autoInitialize &&
      !isLoading &&
      !isInitializing &&
      checklist.length === 0 &&
      clientId &&
      vehicleId &&
      !hasTriedAutoInit.current &&
      !error
    ) {
      hasTriedAutoInit.current = true;
      initialize();
    }
  }, [autoInitialize, isLoading, isInitializing, checklist.length, clientId, vehicleId, error, initialize]);

  const toggleItem = useCallback(
    async (itemId: number) => {
      const item = checklist.find((i) => i.id === itemId);
      if (!item) return;

      const newIsCompleted = !item.is_completed;

      // Optimistic update
      setChecklist((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                is_completed: newIsCompleted,
                completed_at: newIsCompleted ? new Date().toISOString() : null,
                completed_by: newIsCompleted ? user?.id : null,
              }
            : i
        )
      );

      // Update summary optimistically
      setSummary((prev) => {
        const newCompleted = newIsCompleted
          ? prev.completed + 1
          : prev.completed - 1;
        const newPending = prev.total - newCompleted;
        const percentComplete =
          prev.total > 0 ? Math.round((newCompleted / prev.total) * 100) : 0;
        return {
          ...prev,
          completed: newCompleted,
          pending: newPending,
          percentComplete,
        };
      });

      try {
        await toggleVehicleChecklistItem(itemId, newIsCompleted, user?.id);
      } catch (err) {
        console.error('Error toggling checklist item:', err);
        // Revert on error
        await fetchChecklist();
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el item del checklist',
          variant: 'destructive',
        });
      }
    },
    [checklist, user?.id, fetchChecklist]
  );

  const updateItemNotes = useCallback(
    async (itemId: number, notes: string) => {
      try {
        await updateVehicleChecklistItem(itemId, { notes }, user?.id);

        setChecklist((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, notes } : i))
        );
      } catch (err) {
        console.error('Error updating checklist item notes:', err);
        toast({
          title: 'Error',
          description: 'No se pudo actualizar las notas',
          variant: 'destructive',
        });
      }
    },
    [user?.id]
  );

  return {
    checklist,
    summary,
    isLoading,
    isInitializing,
    error,
    toggleItem,
    updateItemNotes,
    refetch: fetchChecklist,
    initialize,
  };
};

export default useVehicleChecklist;
