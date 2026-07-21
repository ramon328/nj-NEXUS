import React, { useState } from 'react';
import { VehicleTransaction } from './types';
import { formatCurrency, getFileNameFromUrl } from './utils';
import { File, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TransactionListProps {
  transactions: VehicleTransaction[];
  loading: boolean;
  onRefresh?: () => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  loading,
  onRefresh,
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingId(id);

    try {
      const { error } = await supabase
        .from('vehicles_extras')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Transacción eliminada');

      // Actualizar la lista
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error al eliminar transacción:', error);
      toast.error('No se pudo eliminar la transacción');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className='py-6 text-center'>
        <div className='animate-pulse space-y-3'>
          <div className='h-2 bg-gray-200 rounded'></div>
          <div className='h-2 bg-gray-200 rounded'></div>
          <div className='h-2 bg-gray-200 rounded'></div>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className='rounded-lg border bg-card p-6 text-center'>
        <p className='text-muted-foreground'>
          No hay transacciones registradas para este vehículo.
        </p>
      </div>
    );
  }

  return (
    <div className='rounded-md border'>
      <div className='divide-y'>
        {transactions.map((transaction) => (
          <div key={transaction.id} className='p-4'>
            <div className='flex justify-between items-start'>
              <div className='flex-1'>
                <div className='flex justify-between'>
                  <h4 className='font-medium text-base'>{transaction.title}</h4>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 ml-2'
                    onClick={() => handleDelete(transaction.id)}
                    disabled={deletingId === transaction.id}
                  >
                    {deletingId === transaction.id ? (
                      <Loader2 className='h-3 w-3 animate-spin' />
                    ) : (
                      <Trash2 className='h-3 w-3 text-red-500' />
                    )}
                  </Button>
                </div>
                <p className='text-sm text-muted-foreground mt-1'>
                  {transaction.description}
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  {new Date(transaction.created_at).toLocaleDateString('es-CL')}
                </p>

                {transaction.docs_urls && transaction.docs_urls.length > 0 && (
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {transaction.docs_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80'
                      >
                        <File className='h-3 w-3 mr-1' />
                        <span className='truncate max-w-[150px]'>
                          {getFileNameFromUrl(url)}
                        </span>
                        <ExternalLink className='h-3 w-3 ml-1' />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div
                className={`text-right ml-4 ${
                  transaction.type === 'income'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                <span className='font-semibold'>
                  {transaction.type === 'income' ? '+' : '-'}{' '}
                  {formatCurrency(transaction.amount)}
                </span>
                <p className='text-xs capitalize'>
                  {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;
