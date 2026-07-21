import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CustomerInfo from './components/CustomerInfo';
import StatusBadge from './components/StatusBadge';
import ReservationActions from './components/ReservationActions';
import DateField from './components/DateField';
import { useTranslation } from 'react-i18next';

interface ReservationDetailsProps {
  reservation: any;
  vehicle: any;
  onUpdate: (data: {
    expirationDate?: Date | string;
    notes?: string | null;
    status?: string | null;
    reservation_agreed_price?: number;
  }) => void;
}

const ReservationDetails: React.FC<ReservationDetailsProps> = ({
  reservation,
  vehicle,
  onUpdate,
}) => {
  const { t } = useTranslation('vehicleReservations');
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(reservation.notes);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(
    reservation.expiration_date
      ? new Date(reservation.expiration_date)
      : undefined
  );
  const [status, setStatus] = useState(reservation.status || 'active');
  const [agreedPrice, setAgreedPrice] = useState(
    reservation.reservation_agreed_price || 0
  );

  const handleSaveChanges = async () => {
    await onUpdate({
      notes,
      expirationDate,
      status,
      reservation_agreed_price: agreedPrice,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setNotes(reservation.notes);
    setExpirationDate(
      reservation.expiration_date
        ? new Date(reservation.expiration_date)
        : undefined
    );
    setStatus(reservation.status || 'active');
    setIsEditing(false);
  };

  return (
    <div className='p-2 rounded-lg border'>
      <div className='flex justify-between items-center mb-1.5'>
        <p className='text-xs font-semibold text-slate-700'>
          {t('details.title')}
        </p>
        <ReservationActions
          isEditing={isEditing}
          onEdit={() => setIsEditing(true)}
          onSave={handleSaveChanges}
          onCancel={handleCancelEdit}
        />
      </div>

      <div className='grid grid-cols-2 gap-x-3 gap-y-2 text-xs'>
        <CustomerInfo
          customerId={reservation.customer_id}
          customer={reservation.customers || reservation.customer}
        />

        <div>
          <p className='text-muted-foreground'>
            {t('details.vehicleLabel')}
          </p>
          <p className='font-medium'>
            {vehicle.brand_id?.name} {vehicle.model_id?.name} ({vehicle.year})
          </p>
        </div>

        <DateField
          label={t('details.reservationDate')}
          date={reservation.reservation_date}
          isEditing={false}
        />

        <DateField
          label={t('details.expirationDate')}
          date={expirationDate || reservation.expiration_date}
          isEditing={isEditing}
          onDateChange={setExpirationDate}
        />

        <div>
          <p className='text-muted-foreground'>
            {t('details.totalPaid')}
          </p>
          <p className='font-medium'>
            {formatCurrency(reservation.reservation_amount || 0)}
          </p>
        </div>

        <div>
          {isEditing ||
          (reservation.reservation_agreed_price &&
            reservation.reservation_agreed_price > 0) ? (
            <p className='text-muted-foreground'>
              {t('details.agreedPrice')}
            </p>
          ) : null}
          {isEditing ? (
            <input
              type='text'
              inputMode='decimal'
              className='border rounded-md px-2 py-1 w-full text-xs mt-0.5 h-7'
              value={agreedPrice === 0 ? '' : agreedPrice}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setAgreedPrice(val ? Number(val) : 0);
              }}
              placeholder={t('details.agreedPricePlaceholder')}
              autoComplete='off'
            />
          ) : reservation.reservation_agreed_price &&
            reservation.reservation_agreed_price > 0 ? (
            <p className='font-medium'>
              {formatCurrency(reservation.reservation_agreed_price)}
            </p>
          ) : (
            <p className='text-muted-foreground'>{t('details.agreedPriceNotSet')}</p>
          )}
        </div>

        <div>
          <p className='text-muted-foreground'>
            {t('details.statusLabel')}
          </p>
          {isEditing ? (
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className='w-full h-7 text-xs'>
                <SelectValue placeholder={t('details.selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='active'>{t('details.status.active')}</SelectItem>
                <SelectItem value='completed'>{t('details.status.completed')}</SelectItem>
                <SelectItem value='cancelled'>{t('details.status.cancelled')}</SelectItem>
                <SelectItem value='expired'>{t('details.status.expired')}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <StatusBadge status={reservation.status} />
          )}
        </div>
      </div>

      <div className='mt-2'>
        <p className='text-xs text-muted-foreground mb-0.5'>
          {t('details.notesLabel')}
        </p>
        {isEditing ? (
          <Textarea
            value={notes || ''}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className='text-sm resize-none'
            placeholder={t('details.notesPlaceholder')}
          />
        ) : (
          <p className='text-xs border rounded-md p-2 bg-muted/50'>
            {reservation.notes || t('details.noNotes')}
          </p>
        )}
      </div>
    </div>
  );
};

export default ReservationDetails;
