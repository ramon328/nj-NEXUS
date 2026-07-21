import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Sede (sucursal) activa seleccionada en el selector del TopBar.
 *
 * Es el equivalente de `superadminStore` (tenant activo) pero para la sede:
 * un store zustand persistido con un único id seleccionado.
 *
 * `null` = "Todas" (sin sede específica; el usuario ve todas las sedes permitidas
 * según su restricción). Un número = filtrar a esa sede concreta.
 *
 * El id acá es solo la SELECCIÓN cruda del selector; la lógica de qué sedes puede
 * ver realmente el usuario (restricción por rol/asignación) vive en
 * `useActiveDealership`, que es la fuente única de verdad.
 */
interface ActiveDealershipStore {
  /** Sede elegida en el selector del TopBar, o null = "Todas". */
  selectedDealershipId: number | null;
  setSelectedDealership: (id: number | null) => void;
}

export const useActiveDealershipStore = create<ActiveDealershipStore>()(
  persist(
    (set) => ({
      selectedDealershipId: null,
      setSelectedDealership: (id) => set({ selectedDealershipId: id }),
    }),
    { name: 'active-dealership' }
  )
);
