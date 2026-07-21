import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReservationAdditionalsListProps {
  additionals: any[];
  totalAdditionals: number;
  onAddAdditional: () => void;
  onEditAdditional: (additional: any) => void;
  onDeleteAdditional: (additionalId: number) => void;
}

const ReservationAdditionalsList: React.FC<ReservationAdditionalsListProps> = ({
  additionals = [],
  totalAdditionals,
  onAddAdditional,
  onEditAdditional,
  onDeleteAdditional,
}) => {
  // Ensure additionals is always an array
  const safeAdditionals = additionals || [];
  const { t } = useTranslation('vehicleReservations');

  return (
    <>
      {safeAdditionals.length === 0 ? (
        <div className='text-center py-4 text-muted-foreground'>
          <p className='text-xs'>{t('additionals.empty.title')}</p>
          <p className='text-[11px] mt-0.5'>
            {t('additionals.empty.subtitle')}
          </p>
        </div>
      ) : (
        <div className='space-y-1.5'>
          {safeAdditionals.map((additional) => (
            <div
              key={additional.id}
              className='flex items-center justify-between p-2 border rounded-lg text-xs'
            >
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-1.5'>
                  <p className='font-medium truncate'>{additional.title}</p>
                  <Badge
                    variant='outline'
                    className='text-[10px] px-1 py-0 text-orange-600 border-orange-200 shrink-0'
                  >
                    {t('additionals.badge')}
                  </Badge>
                </div>
                {additional.description && (
                  <p className='text-[11px] text-muted-foreground truncate'>
                    {additional.description}
                  </p>
                )}
                <div className='flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5'>
                  <span>
                    {format(new Date(additional.created_at), 'dd/MM/yyyy', {
                      locale: es,
                    })}
                  </span>
                  <span className='font-semibold text-orange-600'>
                    + {formatCurrency(additional.amount)}
                  </span>
                </div>
              </div>
              <div className='flex items-center gap-1 ml-2 shrink-0'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 w-7 p-0'
                  onClick={() => onEditAdditional(additional)}
                >
                  <Edit className='h-3.5 w-3.5' />
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 w-7 p-0 text-destructive'
                  onClick={() => onDeleteAdditional(additional.id)}
                >
                  <Trash2 className='h-3.5 w-3.5' />
                </Button>
              </div>
            </div>
          ))}

          <div className='border-t pt-1.5 mt-1.5'>
            <div className='flex justify-between items-center text-xs font-semibold'>
              <span>{t('additionals.total')}</span>
              <span className='text-orange-600'>
                + {formatCurrency(totalAdditionals)}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReservationAdditionalsList;
