
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Model {
  id: number;
  name: string | null;
  brand_id: string | null;
}

export const useModels = (brandId: string | null) => {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchTimestamp, setFetchTimestamp] = useState(Date.now());
  
  const fetchModels = useCallback(async () => {
    if (!brandId) {
      setModels([]);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Fetching models for brand ID:', brandId, 'at timestamp:', fetchTimestamp);
      
      const { data, error } = await supabase
        .from('models')
        .select('id, name, brand_id')
        .eq('brand_id', brandId)
        .order('name');
      
      if (error) {
        console.error('Error fetching models:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los modelos',
          variant: 'destructive',
        });
        return;
      }
      
      console.log('Models fetched:', data?.length, 'models');
      setModels(data || []);
    } catch (error) {
      console.error('Error in fetchModels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [brandId, fetchTimestamp]);
  
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);
  
  const refetchModels = useCallback(async () => {
    console.log("Forcing model refetch by updating timestamp");
    setFetchTimestamp(Date.now());
    await fetchModels();
    console.log("Models refetched successfully");
  }, [fetchModels]);
  
  return { models, isLoading, refetchModels };
};
