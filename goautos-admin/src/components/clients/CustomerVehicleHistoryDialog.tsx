import React from 'react';
import { useLocation } from 'wouter';
import { useI18n } from '@/hooks/useI18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, ExternalLink } from 'lucide-react';
import { useCustomerVehicleHistory } from '@/hooks/useCustomerVehicleHistory';
import { formatDateShort } from '@/lib/utils';

interface CustomerVehicleHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number | null;
  customerName: string;
}

const typeBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  sale: 'default',
  purchase: 'secondary',
  consignment: 'outline',
};

const CustomerVehicleHistoryDialog: React.FC<CustomerVehicleHistoryDialogProps> = ({
  open,
  onOpenChange,
  customerId,
  customerName,
}) => {
  const [, navigate] = useLocation();
  const { tCommon } = useI18n();
  const { history, loading } = useCustomerVehicleHistory(open ? customerId : null);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sale: tCommon('customers.vehicleHistory.sale'),
      purchase: tCommon('customers.vehicleHistory.purchase'),
      consignment: tCommon('customers.vehicleHistory.consignment'),
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px] w-[95vw] max-w-[95vw] sm:w-auto'>
        <DialogHeader>
          <DialogTitle>
            {tCommon('customers.vehicleHistory.title')} - {customerName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className='flex items-center justify-center py-8 text-muted-foreground'>
            <span>{tCommon('actions.loading')}</span>
          </div>
        ) : history.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-8 text-muted-foreground'>
            <Car className='h-10 w-10 mb-3 opacity-40' />
            <p>{tCommon('customers.vehicleHistory.noHistory')}</p>
          </div>
        ) : (
          <div className='space-y-3 max-h-[400px] overflow-y-auto'>
            {history.map((entry, idx) => (
              <div
                key={`${entry.type}-${entry.vehicleId}-${idx}`}
                className='flex items-center justify-between p-3 rounded-lg border bg-card'
              >
                <div className='space-y-1 min-w-0 flex-1'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <Badge variant={typeBadgeVariant[entry.type]}>
                      {getTypeLabel(entry.type)}
                    </Badge>
                    <span className='text-xs text-muted-foreground'>
                      {formatDateShort(entry.date)}
                    </span>
                  </div>
                  <p className='font-medium text-sm truncate'>
                    {entry.brand} {entry.model} {entry.year}
                  </p>
                  {entry.licensePlate && (
                    <p className='text-xs text-muted-foreground'>
                      {entry.licensePlate}
                    </p>
                  )}
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  className='shrink-0 ml-2'
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/vehiculos/${entry.vehicleId}`);
                  }}
                >
                  <ExternalLink className='h-4 w-4' />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerVehicleHistoryDialog;
