import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SuperadminStore {
  /** The tenant (client) ID the superadmin is currently impersonating, or null */
  selectedTenantId: number | null;
  setSelectedTenantId: (id: number | null) => void;
}

export const useSuperadminStore = create<SuperadminStore>()(
  persist(
    (set) => ({
      selectedTenantId: null,
      setSelectedTenantId: (id) => set({ selectedTenantId: id }),
    }),
    { name: 'superadmin-tenant' }
  )
);
