import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  VehicleColumn,
  availableColumns,
} from '@/components/vehiculos/TableColumnSelector';

export type VehiclesDefaultView = 'board' | 'table';

interface VehiclesTableStore {
  selectedColumns: VehicleColumn[];
  defaultView: VehiclesDefaultView;
  setSelectedColumns: (columns: VehicleColumn[]) => void;
  setDefaultView: (view: VehiclesDefaultView) => void;
  resetToDefaults: () => void;
}

const getDefaultColumns = (): VehicleColumn[] => {
  try {
    return availableColumns.filter((col) => col.isDefault);
  } catch {
    return [];
  }
};

export const useVehiclesTableStore = create<VehiclesTableStore>()(
  persist(
    (set) => ({
      selectedColumns: getDefaultColumns(),
      defaultView: 'table',

      setSelectedColumns: (columns: VehicleColumn[]) => {
        set({ selectedColumns: columns });
      },

      setDefaultView: (view: VehiclesDefaultView) => {
        set({ defaultView: view });
      },

      resetToDefaults: () => {
        set({ selectedColumns: getDefaultColumns(), defaultView: 'table' });
      },
    }),
    {
      name: 'vehicles-table-preferences', // Nombre del localStorage key
      version: 2, // Incrementamos la versión por el nuevo campo
    }
  )
);
