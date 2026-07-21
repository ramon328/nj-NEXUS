
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useStatusCheck = () => {
  const checkSpecialStatusRequirements = async (
    vehicleId: number, 
    targetStatusId: number, 
    statusName: string
  ) => {
    if (statusName === 'Reservado') {
      const { data: reservationData, error: reservationError } = await supabase
        .from('vehicles_reservations')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .maybeSingle();
        
      if (reservationError) {
        console.error('Error checking reservation:', reservationError);
      }
      
      return reservationData ? true : false;
    } 
    else if (statusName === 'Vendido') {
      const { data: saleData, error: saleError } = await supabase
        .from('vehicles_sales')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .maybeSingle();
        
      if (saleError) {
        console.error('Error checking sale:', saleError);
      }
      
      return saleData ? true : false;
    }
    
    return true;
  };

  return { checkSpecialStatusRequirements };
};
