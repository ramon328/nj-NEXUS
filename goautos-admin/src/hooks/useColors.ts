
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Color {
  id: number;
  name: string | null;
}

// La tabla `colors` tiene casing mezclado ("ROJO MICA", "Rojo Perlado", "rosado"...).
// Normalizamos a Title Case para que el dropdown se vea consistente.
const toTitleCase = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const useColors = () => {
  const [colors, setColors] = useState<Color[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchColors = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('colors')
          .select('id, name')
          .order('name');
        
        if (error) {
          console.error('Error fetching colors:', error);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar los colores',
            variant: 'destructive',
          });
          return;
        }
        
        const normalized = (data || []).map((c) => ({
          ...c,
          name: c.name ? toTitleCase(c.name) : c.name,
        }));
        setColors(normalized);
      } catch (error) {
        console.error('Error in fetchColors:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchColors();
  }, []);
  
  return { colors, isLoading };
};
