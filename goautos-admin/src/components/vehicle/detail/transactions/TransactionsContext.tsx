import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { VehicleTransaction } from './types';
import {
  fetchVehicleTransactions,
  addVehicleTransaction,
} from './api/transactionService';
import { uploadVehicleDocuments } from './api/documentUploadService';

type TransactionsContextType = {
  transactions: VehicleTransaction[];
  loading: boolean;
  uploadingFiles: boolean;
  setUploadingFiles: (value: boolean) => void;
  fetchTransactions: (opts?: { silent?: boolean }) => Promise<void>;
  uploadDocuments: (files: FileList | null) => Promise<string[]>;
  addTransaction: (
    values: Partial<VehicleTransaction>,
    docUrls: string[]
  ) => Promise<boolean>;
};

const TransactionsContext = createContext<TransactionsContextType | undefined>(
  undefined
);

export const TransactionsProvider: React.FC<{
  vehicle: any;
  children: React.ReactNode;
}> = ({ vehicle, children }) => {
  const queryClient = useQueryClient();
  const [transactions, setTransactions] = useState<VehicleTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // silent: refresca la lista SIN poner loading=true, para que al agregar un
  // gasto/ingreso la fila aparezca de inmediato sin el parpadeo de "recargando".
  const fetchTransactions = async (opts?: { silent?: boolean }) => {
    if (!vehicle?.id) return;

    try {
      if (!opts?.silent) setLoading(true);
      const data = await fetchVehicleTransactions(vehicle.id);
      setTransactions(data);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (vehicle?.id) {
      fetchTransactions();
    }
  }, [vehicle?.id]);

  const uploadDocuments = async (files: FileList | null): Promise<string[]> => {
    setUploadingFiles(true);
    try {
      return await uploadVehicleDocuments(vehicle.id, files);
    } finally {
      setUploadingFiles(false);
    }
  };

  const addTransaction = async (
    values: Partial<VehicleTransaction>,
    docUrls: string[]
  ) => {
    const success = await addVehicleTransaction(vehicle.id, values, docUrls);
    if (success) {
      // Refresco silencioso de la lista (aparece de una, sin parpadeo) y aviso a
      // las queries de ventas para que el Resumen Financiero / dashboard recalculen
      // el margen sin tener que recargar la página.
      await fetchTransactions({ silent: true });
      queryClient.invalidateQueries({ queryKey: ['salesSummary'] });
      queryClient.invalidateQueries({ queryKey: ['soldVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-net-profits-by-period'] });
    }
    return success;
  };

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        loading,
        uploadingFiles,
        setUploadingFiles,
        fetchTransactions,
        uploadDocuments,
        addTransaction,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (context === undefined) {
    throw new Error(
      'useTransactions must be used within a TransactionsProvider'
    );
  }
  return context;
};
