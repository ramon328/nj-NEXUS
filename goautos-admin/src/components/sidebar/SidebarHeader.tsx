import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Icon } from '@iconify/react';

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
  showArrow?: boolean;
}

export const SidebarHeader = ({
  collapsed,
  onToggle,
  showArrow = true,
}: SidebarHeaderProps) => {
  return (
    <div className='relative flex h-14 w-full items-center border-b border-gray-200/80 px-4'>
      <div
        className={cn(
          'flex w-full items-center',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <img
            src='/goauto-logo-negro.png'
            alt='GoAuto Logo'
            className='h-7'
          />
        )}

        <Button
          variant='ghost'
          size='sm'
          className={cn(
            'h-10 w-10 p-0 rounded-xl flex items-center justify-center hover:bg-gray-200/90 hover:text-gray-800 transition-all duration-300 ease-in-out',
            collapsed ? 'mx-auto' : ''
          )}
          onClick={onToggle}
        >
          <Icon
            icon='eva:menu-outline'
            className='h-6 w-6 text-gray-500'
            width={48}
            height={48}
          />
        </Button>
      </div>
    </div>
  );
};
