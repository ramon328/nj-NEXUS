import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type NotificationState = {
  unreadCount: number;
  lastCheckedAt: string | null;
  setUnreadCount: (count: number) => void;
  markChecked: () => void;
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      unreadCount: 0,
      lastCheckedAt: null,
      setUnreadCount: (count: number) => set({ unreadCount: count }),
      markChecked: () => set({ lastCheckedAt: new Date().toISOString() }),
    }),
    {
      name: 'notification-preferences',
      version: 1,
      partialize: (state) => ({ lastCheckedAt: state.lastCheckedAt }),
    }
  )
);
