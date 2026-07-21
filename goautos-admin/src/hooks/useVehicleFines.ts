import { useState, useEffect, useCallback } from 'react';
import { checkVehicleFines, getVehicleFines } from '@/services/vehicleFinesService';
import type { VehicleFinesData, CheckFinesResponse } from '@/types/vehicleFines';

interface UseVehicleFinesOptions {
  vehicleId?: number;
  licensePlate?: string;
  autoFetch?: boolean;
}

export const useVehicleFines = ({
  vehicleId,
  licensePlate,
  autoFetch = true,
}: UseVehicleFinesOptions) => {
  const [storedData, setStoredData] = useState<VehicleFinesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<CheckFinesResponse | null>(null);

  // Fetch stored data on mount
  useEffect(() => {
    if (vehicleId && autoFetch) {
      setIsLoading(true);
      getVehicleFines(vehicleId)
        .then(setStoredData)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [vehicleId, autoFetch]);

  // Manual check trigger
  const checkFines = useCallback(
    async (patent?: string, vId?: number) => {
      const plateToCheck = patent || licensePlate;
      if (!plateToCheck) return null;

      setIsChecking(true);
      try {
        const result = await checkVehicleFines(
          plateToCheck,
          vId || vehicleId
        );
        setLastCheckResult(result);

        // Si guardó en BD, refrescar stored data
        if ((vId || vehicleId) && result.success) {
          const fresh = await getVehicleFines((vId || vehicleId)!);
          setStoredData(fresh);
        }

        return result;
      } catch (error) {
        console.error('Error checking fines:', error);
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [licensePlate, vehicleId]
  );

  return {
    storedData,
    isLoading,
    isChecking,
    lastCheckResult,
    checkFines,
  };
};
