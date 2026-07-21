import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface BatchResult {
  success: boolean;
  processed: number;
  batches: number;
  client_id: number;
}

export const useEmbeddingsBatch = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { clientId } = useAuth();

  const generateEmbeddings = async (batchSize: number = 50) => {
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'No se pudo identificar el cliente',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      console.log('Starting batch embedding generation...');

      const { data, error } = await supabase.functions.invoke(
        'generate-embeddings-batch',
        {
          body: {
            client_id: clientId,
            batch_size: batchSize,
          },
        }
      );

      if (error) {
        console.error('Error in batch embedding generation:', error);
        throw error;
      }

      const result = data as BatchResult;

      toast({
        title: '¡Embeddings generados!',
        description: `Se procesaron ${result.processed} transacciones en ${result.batches} lotes`,
      });

      return result;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudieron generar los embeddings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    generateEmbeddings,
  };
};
