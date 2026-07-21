
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Category {
  id: number;
  name: string | null;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .order('name');
        
        if (error) {
          console.error('Error fetching categories:', error);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar las categorías',
            variant: 'destructive',
          });
          return;
        }
        
        setCategories(data || []);
      } catch (error) {
        console.error('Error in fetchCategories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  return { categories, isLoading };
};
