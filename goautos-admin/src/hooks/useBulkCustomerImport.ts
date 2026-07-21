import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Explicitly define the structure of the import result
interface ImportResult {
  total: number;
  processed: number;
  skipped: number;
}

interface BatchResult {
  success: boolean;
  processed: number;
  batches: number;
  client_id: number;
}

// Define the customer data structure
interface CustomerImportData {
  codigo: string;
  rut_comprador: string;
  nombre_comprador: string;
  email_comprador: string;
  rut_vendedor: string;
  nombre_vendedor: string;
  email_vendedor: string;
  marca: string;
  modelo: string;
  precio: string;
  ano: string;
}

export const useBulkCustomerImport = () => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const { toast } = useToast();
  const { clientId } = useAuth();

  const importCustomers = async (data: CustomerImportData[]) => {
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
      setCurrentStep('Importando registros...');

      // Validate data is an array and not empty
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No hay datos para importar');
      }

      console.log('Importing data:', data);

      // Convert data to a JSON string
      const jsonString = JSON.stringify(data);

      // Call the unified RPC function with the stringified JSON data
      const { data: result, error } = await supabase.rpc(
        'process_bulk_import',
        {
          p_data: jsonString,
          p_client_id: clientId,
        }
      );

      if (error) {
        console.error('Error in bulk import:', error);
        throw error;
      }

      console.log('Import result:', result);

      // Type-safe result handling
      const importResult = result as unknown as ImportResult;

      // Validate that the result has the expected structure
      if (
        typeof importResult !== 'object' ||
        !('total' in importResult) ||
        !('processed' in importResult) ||
        !('skipped' in importResult)
      ) {
        throw new Error('Respuesta del servidor inválida');
      }

      // Show import success
      toast({
        title: '¡Importación completada!',
        description: `Se han importado ${importResult.processed} registros de ${
          importResult.total
        }${
          importResult.skipped > 0
            ? ` (${importResult.skipped} duplicados omitidos)`
            : ''
        }`,
      });

      // Now generate embeddings if we processed any records
      if (importResult.processed > 0) {
        setCurrentStep('Generando embeddings de vehículos...');

        toast({
          title: 'Procesando embeddings...',
          description:
            'Por favor espera, esto puede tomar unos minutos. No cierres la página.',
          duration: 8000,
        });

        const { data: batchData, error: batchError } =
          await supabase.functions.invoke('generate-embeddings-batch', {
            body: {
              client_id: clientId,
              batch_size: 50,
            },
          });

        if (batchError) {
          console.error('Error in batch embedding generation:', batchError);
          toast({
            title: 'Advertencia',
            description:
              'Los registros se importaron correctamente, pero hubo un error generando los embeddings. Puedes intentar nuevamente más tarde.',
            variant: 'destructive',
          });
        } else {
          const batchResult = batchData as BatchResult;
          toast({
            title: '¡Proceso completo!',
            description: `Importación y embeddings completados. Se procesaron ${batchResult.processed} embeddings en ${batchResult.batches} lotes.`,
          });
        }
      }

      setCurrentStep('');
      return importResult;
    } catch (error) {
      console.error('Error in bulk import:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo procesar la importación',
        variant: 'destructive',
      });
      setCurrentStep('');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    currentStep,
    importCustomers,
  };
};
