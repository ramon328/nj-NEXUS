
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Brand {
  id: string;
  name: string | null;
}

export const useBrands = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBrands = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching brands:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las marcas',
          variant: 'destructive',
        });
        return;
      }

      setBrands(data || []);
    } catch (error) {
      console.error('Error in fetchBrands:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  return { brands, isLoading, refetch: fetchBrands };
};
