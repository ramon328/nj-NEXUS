import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { useNotifications } from '@/hooks/useNotifications';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import NotificationDropdown from './NotificationDropdown';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  variant: 'sidebar' | 'sidebar-collapsed' | 'mobile';
}

export default function NotificationBell({ variant }: NotificationBellProps) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refetch } =
    useNotifications();
  const { hasPermission, isSuperadmin } = usePermissions();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const canCreate = isSuperadmin || hasPermission(PermissionCode.NOTIFICATIONS_CREATE);
  const badge = unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null;

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className={cn(
          'relative flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors',
          variant === 'mobile'
            ? 'h-9 w-9 rounded-full'
            : variant === 'sidebar-collapsed'
              ? 'h-9 w-9 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-9 xl:w-9'
              : 'h-9 w-9'
        )}
        aria-label="Notificaciones"
      >
        <Bell className={cn(
          'h-[18px] w-[18px]',
          variant === 'mobile' && 'h-5 w-5',
          variant === 'sidebar-collapsed' && 'sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 lg:h-[18px] lg:w-[18px]'
        )} />
        {badge && (
          <span className={cn(
            'absolute min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none',
            variant === 'mobile'
              ? '-top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[10px]'
              : variant === 'sidebar-collapsed'
                ? '-top-0.5 -right-0.5 sm:min-w-[12px] sm:h-3 sm:text-[8px]'
                : '-top-0.5 -right-0.5'
          )}>
            {badge}
          </span>
        )}
      </button>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContentRight className="bg-[#f5f5f7] p-0 md:min-w-[520px]">
          <NotificationDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            isLoading={isLoading}
            markAsRead={markAsRead}
            markAllAsRead={markAllAsRead}
            canCreate={canCreate}
            refetch={refetch}
            onClose={() => setDrawerOpen(false)}
          />
        </DrawerContentRight>
      </Drawer>
    </>
  );
}
