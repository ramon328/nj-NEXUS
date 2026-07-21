import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { getOrCreateReservation } from '@/services/reservation';
import { getReservationAdditionals } from '@/services/reservation';

export const useReservationLoader = (
  vehicleId: number,
  clientId: number | undefined,
  state: {
    setIsLoading: (loading: boolean) => void;
    setReservation: (reservation: any) => void;
    setPayments: (payments: any[]) => void;
    setAdditionals?: (additionals: any[]) => void;
    setIsNew: (isNew: boolean) => void;
  }
) => {
  const {
    setIsLoading,
    setReservation,
    setPayments,
    setAdditionals,
    setIsNew,
  } = state;

  const loadReservation = async () => {
    if (!vehicleId || !clientId) {
      console.log('Missing vehicleId or clientId:', { vehicleId, clientId });
      setIsLoading(false);
      return;
    }

    console.log(
      'Loading reservation for vehicle:',
      vehicleId,
      'client:',
      clientId
    );
    setIsLoading(true);
    try {
      const result = await getOrCreateReservation(vehicleId, clientId);
      console.log('Reservation loaded:', result);
      setReservation(result.reservation);
      setPayments(result.payments);
      setIsNew(result.isNew);

      // Load additionals if we have a reservation
      if (!result.isNew && setAdditionals) {
        try {
          const additionals = await getReservationAdditionals(vehicleId);
          console.log('Additionals loaded:', additionals);
          setAdditionals(additionals);
        } catch (error) {
          console.error('Error loading additionals:', error);
          setAdditionals([]);
        }
      } else if (setAdditionals) {
        setAdditionals([]);
      }
    } catch (error) {
      console.error('Error loading reservation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información de la reserva',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vehicleId && clientId) {
      loadReservation();
    } else {
      // If no vehicleId or clientId, still set loading to false to avoid infinite loading
      setIsLoading(false);
    }
  }, [vehicleId, clientId]);

  return { loadReservation };
};
