import React from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationControlsProps) => {
  const { tCommon } = useI18n();
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className='flex items-center justify-center gap-2 py-4'>
      <Button
        variant='outline'
        size='icon'
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className='rounded-lg border border-[#e5e7eb] bg-white text-[#b0b7c3] hover:bg-[#f4f8fb] shadow-none'
      >
        <ChevronLeft className='h-4 w-4' />
        <span className='sr-only'>{tCommon('pagination.previous')}</span>
      </Button>

      {getPageNumbers().map((page, index) => (
        <React.Fragment key={index}>
          {page === 'ellipsis' ? (
            <Button
              variant='ghost'
              size='icon'
              disabled
              className='bg-transparent border-none shadow-none'
            >
              <MoreHorizontal className='h-4 w-4 text-[#b0b7c3]' />
            </Button>
          ) : (
            <Button
              variant={currentPage === page ? undefined : 'outline'}
              size='icon'
              onClick={() => onPageChange(page as number)}
              className={`rounded-lg font-normal text-base transition-colors ${
                currentPage === page
                  ? 'bg-[#b6e0fa] text-white border-none'
                  : 'bg-white text-[#222] border border-[#e5e7eb] hover:bg-[#f4f8fb]'
              } shadow-none`}
            >
              {page}
            </Button>
          )}
        </React.Fragment>
      ))}

      <Button
        variant='outline'
        size='icon'
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className='rounded-lg border border-[#e5e7eb] bg-white text-[#b0b7c3] hover:bg-[#f4f8fb] shadow-none'
      >
        <ChevronRight className='h-4 w-4' />
        <span className='sr-only'>{tCommon('pagination.next')}</span>
      </Button>
    </div>
  );
};

export default PaginationControls;
