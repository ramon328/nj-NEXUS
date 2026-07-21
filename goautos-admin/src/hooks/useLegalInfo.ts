import { useQuery } from '@tanstack/react-query';
import { getLegalInfoForDealership, getLegalInfoForVehicle, getAllLegalInfoForClient } from '@/services/legalInfoService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get legal_info for a specific dealership with fallback to client-level
 *
 * @param dealershipId - Optional dealership ID
 * @returns Query result with legal_info
 */
export function useLegalInfo(dealershipId?: number | null) {
  const { clientId } = useAuth();

  return useQuery({
    queryKey: ['legal_info', clientId, dealershipId],
    queryFn: () => {
      if (!clientId) return null;
      return getLegalInfoForDealership(clientId, dealershipId);
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get legal_info for a vehicle based on its dealership
 *
 * @param vehicleId - The vehicle ID
 * @returns Query result with legal_info
 */
export function useLegalInfoForVehicle(vehicleId?: number) {
  const { clientId } = useAuth();

  return useQuery({
    queryKey: ['legal_info_for_vehicle', vehicleId, clientId],
    queryFn: () => {
      if (!vehicleId || !clientId) return null;
      return getLegalInfoForVehicle(vehicleId, clientId);
    },
    enabled: !!vehicleId && !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get all legal_info entries for a client
 *
 * @returns Query result with array of legal_info
 */
export function useAllLegalInfo() {
  const { clientId } = useAuth();

  return useQuery({
    queryKey: ['all_legal_info', clientId],
    queryFn: () => {
      if (!clientId) return [];
      return getAllLegalInfoForClient(clientId);
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
