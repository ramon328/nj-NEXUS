import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import React from 'react';
import { Link } from 'wouter';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  active?: boolean;
  collapsed?: boolean;
}

export const SidebarNavItem = ({
  icon: Icon,
  label,
  path,
  active = false,
  collapsed = false,
}: NavItemProps) => {
  if (!Icon) {
    console.error(`Missing icon for navigation item: ${label}`);
    // Fallback to a standard link without icon
    return collapsed ? null : (
      <Link
        href={path}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal font-inter transition-colors',
          active
            ? 'bg-neutral-100 text-sidebar-foreground font-semibold shadow-sm'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-neutral-50'
        )}
      >
        <span>{label}</span>
      </Link>
    );
  }

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={path}
              className={cn(
                'flex items-center justify-center h-10 w-10 rounded-md text-sm font-normal font-inter transition-colors mb-1',
                active
                  ? 'border-l-[3px] border-slate-800 text-sidebar-foreground font-semibold'
                  : 'border-l-[3px] border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-neutral-50'
              )}
            >
              <Icon className='h-5 w-5' />
            </Link>
          </TooltipTrigger>
          <TooltipContent side='right' className='font-inter'>
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link
      href={path}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal font-inter transition-colors',
        active
          ? 'border-l-[3px] border-slate-800 text-sidebar-foreground font-semibold'
          : 'border-l-[3px] border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-neutral-50'
      )}
    >
      <Icon className='h-5 w-5' />
      <span>{label}</span>
    </Link>
  );
};
