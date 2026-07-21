import React from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface VehiclesPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  showingText?: string;
}

const VehiclesPagination: React.FC<VehiclesPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className='flex items-center justify-center px-4 py-4 border-t bg-white flex-shrink-0'>
      <div className='flex items-center space-x-1'>
        {/* First Page */}
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || isLoading}
          className='h-8 w-8 p-0 disabled:opacity-30'
        >
          <ChevronsLeft className='h-4 w-4' />
        </Button>

        {/* Previous Page */}
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className='h-8 w-8 p-0 disabled:opacity-30'
        >
          <ChevronLeft className='h-4 w-4' />
        </Button>

        {/* Page Numbers */}
        {visiblePages.map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className='px-3 py-1 text-sm text-muted-foreground'>
                ...
              </span>
            ) : (
              <Button
                variant={currentPage === page ? 'default' : 'outline'}
                size='sm'
                onClick={() => onPageChange(page as number)}
                disabled={isLoading}
                className={`h-8 min-w-8 px-2 ${currentPage === page ? 'bg-slate-800 hover:bg-slate-700 border-slate-800' : ''}`}
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}

        {/* Next Page */}
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className='h-8 w-8 p-0 disabled:opacity-30'
        >
          <ChevronRight className='h-4 w-4' />
        </Button>

        {/* Last Page */}
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || isLoading}
          className='h-8 w-8 p-0 disabled:opacity-30'
        >
          <ChevronsRight className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
};

export default VehiclesPagination;
