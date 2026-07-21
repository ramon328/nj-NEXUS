
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Condition {
  id: number;
  name: string | null;
}

export const useConditions = () => {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchConditions = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('conditions')
          .select('id, name')
          .order('name');
        
        if (error) {
          console.error('Error fetching conditions:', error);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar las condiciones',
            variant: 'destructive',
          });
          return;
        }
        
        setConditions(data || []);
      } catch (error) {
        console.error('Error in fetchConditions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConditions();
  }, []);
  
  return { conditions, isLoading };
};
