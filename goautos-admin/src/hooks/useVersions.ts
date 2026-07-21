import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Version {
  id: number;
  name: string | null;
  model_id: number | null;
}

export const useVersions = (modelId: number | null) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchTimestamp, setFetchTimestamp] = useState(Date.now());

  const fetchVersions = useCallback(async () => {
    if (!modelId) {
      setVersions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await (supabase as any)
        .from('versions')
        .select('id, name, model_id')
        .eq('model_id', modelId)
        .order('name');

      if (error) {
        console.error('Error fetching versions:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las versiones',
          variant: 'destructive',
        });
        return;
      }

      setVersions(data || []);
    } catch (error) {
      console.error('Error in fetchVersions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [modelId, fetchTimestamp]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const refetchVersions = useCallback(async () => {
    setFetchTimestamp(Date.now());
    await fetchVersions();
  }, [fetchVersions]);

  return { versions, isLoading, refetchVersions };
};
