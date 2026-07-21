import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';
import { Client } from '@/types/client';
import EditableTemplateText from '@/components/configuration/document-templates/EditableTemplateText';
import DocumentHeader from '@/components/configuration/document-templates/DocumentHeader';
import CustomerDetails, { CustomerData } from './shared/CustomerDetails';
import VehicleDetails, { VehicleData } from './shared/VehicleDetails';
import DocumentSignatures from './shared/DocumentSignatures';
import { useAuth } from '@/contexts/AuthContext';
import { formatRut } from '@/utils/rutFormatter';

// Tipos para los datos del cliente
interface Customer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  rut?: string;
}

// Tipos para los datos del vehículo
interface Vehicle {
  brand?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  color?: string;
  mileage?: number;
  version?: string;
  condition?: string;
}

// Tipos para datos específicos de reserva
interface ReservationData {
  vehicle_price?: number;
  transfer_value?: number;
  reservation_amount?: number;
  reservation_date?: string;
  expiration_date?: string;
  status?: string;
  reservation_agreed_price?: number;
}

// Props para el componente unificado
interface ReservationNoteProps {
  // Modo del componente
  isEditable?: boolean;

  // Propiedades para modo editable
  client?: Client | null;
  editableText?: {
    terms?: string;
    notes?: string;
    terminos_condiciones?: string; // Para compatibilidad con nuevo formato
  };
  handleTextChange?: (type: string, value: string) => void;

  // Propiedades para modo visualización
  customer?: CustomerData;
  vehicle?: VehicleData;
  reservationData?: {
    vehicle_price?: number;
    transfer_value?: number;
    reservation_amount?: number;
    reservation_date?: string;
    expiration_date?: string;
    status?: string;
    reservation_agreed_price?: number;
  };
  additionals?: Array<{
    id: number;
    amount: number;
    title: string;
    description?: string;
    created_at: string;
  }>;
  notes?: string;
  terms?: string;
  documentClient?: Client | null; // Cliente para mostrar en modo visualización
  documentNumber?: string; // Número de documento
  documentDate?: string; // Fecha del documento
  legalInfo?: any;

  // Funcional
  onPrint?: () => void;
}

const ReservationNote: React.FC<ReservationNoteProps> = ({
  isEditable = false,
  client,
  editableText = {},
  handleTextChange = () => {},
  customer,
  vehicle,
  reservationData,
  additionals = [],
  notes,
  terms,
  documentClient,
  documentNumber,
  documentDate,
  legalInfo,
  onPrint,
}) => {
  const { userData } = useAuth();
  const { t } = useTranslation('vehicleDocuments');

  // Obtener los valores adecuados según el modo
  const displayTerms = isEditable
    ? editableText.terms || editableText.terminos_condiciones || ''
    : terms || '';

  const displayNotes = isEditable ? editableText.notes || '' : notes || '';

  // Cliente a mostrar (priorizar el cliente específico del documento en modo visualización)
  const displayClient = !isEditable && documentClient ? documentClient : client;

  // Valores de ejemplo para mostrar en el modo editable
  const displayCustomer = isEditable
    ? {
        first_name: 'Cliente',
        last_name: 'Ejemplo',
        email: 'cliente@ejemplo.com',
        phone: '+56 9 1234 5678',
        address: 'Calle Ejemplo 123, Ciudad',
        rut: '12.345.678-9',
      }
    : customer;

  const displayVehicle = isEditable
    ? {
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        license_plate: 'AB1234',
        color: 'Blanco',
        mileage: 15000,
        version: 'Limited',
        condition: 'Nuevo',
      }
    : vehicle;

  const displayReservationData = isEditable
    ? {
        vehicle_price: 15000000,
        reservation_amount: 500000,
        reservation_date: new Date().toLocaleDateString(),
        expiration_date: new Date(
          new Date().setDate(new Date().getDate() + 7)
        ).toLocaleDateString(),
        status: 'Pendiente',
        reservation_agreed_price: 12000000,
      }
    : reservationData;

  // Renderizado condicional para campos editables o estáticos
  const renderTerms = () => {
    if (isEditable) {
      return (
        <EditableTemplateText
          value={displayTerms}
          onChange={(value) =>
            handleTextChange(
              editableText.terminos_condiciones
                ? 'terminos_condiciones'
                : 'terms',
              value
            )
          }
          label={t('quotation.terms')}
        />
      );
    }
    return (
      <div className='text-xs print:text-xs whitespace-pre-wrap'>
        {displayTerms ||
          'No se han configurado términos y condiciones para este documento.'}
      </div>
    );
  };

  const renderNotes = () => {
    if (isEditable) {
      return (
        <EditableTemplateText
          value={displayNotes}
          onChange={(value) => handleTextChange('notes', value)}
          label={t('quotation.observations')}
        />
      );
    }
    return (
      <div className='text-xs print:text-xs whitespace-pre-wrap'>
        {displayNotes || t('quotation.noObservations')}
      </div>
    );
  };

  const getCustomerFullName = () => {
    if (!displayCustomer) return 'Cliente';
    return `${displayCustomer.first_name || ''} ${
      displayCustomer.last_name || ''
    }`.trim();
  };

  // Calcular saldo pendiente
  const calculateRemainingBalance = () => {
    const vehiclePrice = displayReservationData?.vehicle_price || 0;
    const transferValue = displayReservationData?.transfer_value || 0;
    const reservationAmount = displayReservationData?.reservation_amount || 0;
    const totalAdditionals = calculateTotalAdditionals();
    return vehiclePrice + transferValue - reservationAmount + totalAdditionals;
  };

  // Calcular total de adicionales
  const calculateTotalAdditionals = () => {
    if (isEditable) {
      // En modo editable, mostrar ejemplo
      return 150000;
    }
    return additionals.reduce(
      (sum, additional) => sum + (Number(additional.amount) || 0),
      0
    );
  };

  // Adicionales de ejemplo para modo editable
  const displayAdditionals = isEditable
    ? [
        {
          id: 1,
          title: 'Seguro adicional',
          amount: 100000,
          description: 'Seguro extendido',
        },
        {
          id: 2,
          title: 'Accesorios',
          amount: 50000,
          description: 'Kit de accesorios premium',
        },
      ]
    : additionals;

  return (
    <div className={isEditable ? 'border border-slate-200/60 rounded-2xl bg-white overflow-hidden' : ''}>
      {isEditable && (
        <p className='py-3 text-sm text-muted-foreground text-center'>
          {t('reservation.editablePreview')}
        </p>
      )}

      <div
        className={
          isEditable
            ? ''
            : ''
        }
      >
        <div className='reservation-note-document p-3 min-h-[80vh] bg-white print:p-2 print:text-xs print:scale-75 print:origin-top-left print:w-[133%]'>
          <DocumentHeader
            client={displayClient}
            documentType={t('reservation.type')}
            documentNumber={documentNumber}
            documentDate={documentDate}
            legalInfo={legalInfo}
          />

          <CustomerDetails customer={displayCustomer} />

          <VehicleDetails vehicle={displayVehicle} />

          <div className=' rounded-lg p-2 mb-3 print:mb-1 print:p-1'>
            <h2 className='font-semibold text-xs mb-2 print:text-xs'>
              {t('reservation.detail.title')}
            </h2>
            <div className='space-y-1 text-xs print:space-y-0 print:text-xs'>
              <div className='flex justify-between text-xs print:text-xs'>
                <p>
                  <strong>
                    {displayReservationData?.reservation_agreed_price > 0
                      ? t('reservation.detail.agreedPriceLabel')
                      : t('reservation.detail.vehiclePriceLabel')}
                  </strong>
                </p>
                <p>
                  {formatCurrency(
                    displayReservationData?.reservation_agreed_price > 0
                      ? displayReservationData.reservation_agreed_price
                      : displayReservationData?.vehicle_price || 0
                  )}
                </p>
              </div>
              {displayReservationData?.transfer_value != null && displayReservationData.transfer_value > 0 && (
                <div className='flex justify-between text-xs print:text-xs'>
                  <p>
                    <strong>+ Valor de Transferencia</strong>
                  </p>
                  <p>
                    {formatCurrency(displayReservationData.transfer_value)}
                  </p>
                </div>
              )}
              <div className='flex justify-between text-xs print:text-xs'>
                <p>
                  <strong>{t('reservation.detail.reservationAmount')}</strong>
                </p>
                <p>
                  {formatCurrency(
                    displayReservationData?.reservation_amount || 0
                  )}
                </p>
              </div>

              {/* Sección de adicionales */}
              {displayAdditionals.length > 0 && (
                <>
                  <hr className='my-2' />
                  <div className='bg-gray-50 p-2 print:p-1 rounded'>
                    <p className='font-semibold text-xs mb-1 print:text-xs'>
                      {t('reservation.detail.additionals.title')}
                    </p>
                    {displayAdditionals.map((additional, index) => (
                      <div
                        key={additional.id || index}
                        className='flex justify-between text-xs print:text-xs mb-0.5 print:mb-0'
                      >
                        <span>{additional.title}</span>
                        <span>{formatCurrency(additional.amount)}</span>
                      </div>
                    ))}
                    <hr className='my-1' />
                    <div className='flex justify-between text-xs print:text-xs font-semibold'>
                      <span>{t('reservation.detail.additionals.total')}</span>
                      <span>{formatCurrency(calculateTotalAdditionals())}</span>
                    </div>
                  </div>
                </>
              )}

              <hr className='my-2' />
              <div className='flex justify-between text-xs print:text-xs'>
                <p>
                  <strong>{t('reservation.detail.remaining')}</strong>
                </p>
                <p>{formatCurrency(calculateRemainingBalance())}</p>
              </div>
              <hr className='my-2' />
              <div className='flex justify-between text-xs print:text-xs'>
                <p>
                  <strong>{t('reservation.detail.reservationDate')}</strong>
                </p>
                <p>{displayReservationData?.reservation_date || '-'}</p>
              </div>
              <div className='flex justify-between text-xs print:text-xs'>
                <p>
                  <strong>{t('reservation.detail.validUntil')}</strong>
                </p>
                <p>{displayReservationData?.expiration_date || '-'}</p>
              </div>
            </div>
          </div>

          {displayNotes && (
            <div className='mb-2  rounded-lg p-2 print:mb-1 print:p-1'>
              <h2 className='font-semibold text-xs mb-2 print:text-xs'>
                {t('quotation.observations')}
              </h2>
              <div className=' rounded-lg p-2 print:p-1'>
                {renderNotes()}
              </div>
            </div>
          )}

          <div className='mb-2  rounded-lg p-2 print:mb-1 print:p-1'>
            <h2 className='font-semibold text-xs mb-2 print:text-xs'>
              {t('quotation.terms')}
            </h2>
            <div className=' rounded-lg p-2 print:p-1'>
              {renderTerms()}
            </div>
          </div>

          <DocumentSignatures
            leftSignatory={{
              name:
                formatRut(
                  legalInfo?.rut || displayClient?.legal_info?.rut || displayClient?.contact?.rut
                ) || '',
              subtitle: legalInfo?.company_name || displayClient?.name || t('signatures.company'),
            }}
            rightSignatory={{
              name: getCustomerFullName(),
              subtitle: displayCustomer?.rut || '',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ReservationNote;
