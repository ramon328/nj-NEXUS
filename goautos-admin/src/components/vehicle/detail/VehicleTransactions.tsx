import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useTransactions } from './transactions/useTransactions';
import TransactionForm from './transactions/TransactionForm';
import TransactionList from './transactions/TransactionList';
import { TransactionFormValues } from './transactions/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Vehicle } from '@/types/vehicle';

type VehicleTransactionsProps = {
  vehicle?: Vehicle;
};

const VehicleTransactions = ({ vehicle }: VehicleTransactionsProps) => {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const {
    transactions,
    loading,
    uploadingFiles,
    setUploadingFiles,
    fetchTransactions,
    uploadDocuments,
    addTransaction,
  } = useTransactions(vehicle);

  const handleSubmit = async (values: TransactionFormValues) => {
    try {
      setUploadingFiles(true);
      const docUrls = await uploadDocuments(values.documents || null);

      const success = await addTransaction(values, docUrls);

      if (success) {
        // Reset form and fetch updated data
        setOpen(false);
        fetchTransactions();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleFormSubmit = () => {
    if (formRef.current) {
      formRef.current.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h3 className='font-semibold text-lg'>Transacciones</h3>
        <Button variant='outline' size='sm' onClick={() => setOpen(true)}>
          <PlusCircle className='mr-2 h-4 w-4' />
          Agregar Transacción
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className='flex w-full flex-col p-0 sm:max-w-lg'>
          <SheetHeader className='shrink-0 border-b px-6 py-4'>
            <SheetTitle className='text-xl'>Nueva transacción</SheetTitle>
          </SheetHeader>

          <div className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
            <TransactionForm
              formRef={formRef}
              onSubmit={handleSubmit}
              onCancel={() => setOpen(false)}
              isUploading={uploadingFiles}
              initialType='expense'
            />
          </div>

          <SheetFooter className='shrink-0 gap-2 border-t px-6 py-4 sm:space-x-0'>
            <Button
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={uploadingFiles}
              className='flex-1'
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={uploadingFiles}
              className='flex-1'
            >
              {uploadingFiles ? 'Subiendo archivos...' : 'Guardar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <TransactionList
        transactions={transactions}
        loading={loading}
        onRefresh={fetchTransactions}
      />
    </div>
  );
};

export default VehicleTransactions;
