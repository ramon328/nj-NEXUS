
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface FuelType {
  id: number;
  name: string | null;
}

export const useFuelTypes = () => {
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchFuelTypes = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('fuel_types')
          .select('id, name')
          .order('name');
        
        if (error) {
          console.error('Error fetching fuel types:', error);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar los tipos de combustible',
            variant: 'destructive',
          });
          return;
        }
        
        setFuelTypes(data || []);
      } catch (error) {
        console.error('Error in fetchFuelTypes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFuelTypes();
  }, []);
  
  return { fuelTypes, isLoading };
};
