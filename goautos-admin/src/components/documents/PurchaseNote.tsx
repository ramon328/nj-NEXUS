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
import { getPaymentMethodLabel } from '@/utils/paymentMethods';

// Tipos para los datos del vendedor
interface Seller extends CustomerData {
  bank_name?: string;
  bank_account_type?: string;
  bank_account_number?: string;
}

// Tipos para los datos del vehículo
interface Vehicle {
  brand?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  color?: string;
  mileage?: number;
}

// Tipos para los datos de pago
interface Payment {
  purchase_price?: number;
  discounts?: number;
  total?: number;
  payment_method?: string;
}

// Props para el componente unificado
interface PurchaseNoteProps {
  // Modo del componente
  isEditable?: boolean;

  // Propiedades para modo editable
  client?: Client | null;
  editableText?: {
    terms?: string;
    notes?: string;
    conditions?: string;
    paymentMethod?: string;
    terminos_condiciones?: string; // Para compatibilidad con nuevo formato
  };
  handleTextChange?: (type: string, value: string) => void;

  // Propiedades para modo visualización
  seller?: Seller;
  vehicle?: VehicleData;
  payment?: Payment;
  notes?: string;
  terms?: string;
  documentClient?: Client | null; // Cliente para mostrar en modo visualización
  documentNumber?: string; // Número de documento
  documentDate?: string; // Fecha del documento
  legalInfo?: any;

  // Funcional
  onPrint?: () => void;
}

const PurchaseNote: React.FC<PurchaseNoteProps> = ({
  isEditable = false,
  client,
  editableText = {},
  handleTextChange = () => {},
  seller,
  vehicle,
  payment,
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

  const displayPaymentMethod = isEditable
    ? editableText.paymentMethod || ''
    : getPaymentMethodLabel(payment?.payment_method) || '';

  // Cliente a mostrar (priorizar el cliente específico del documento en modo visualización)
  const displayClient = !isEditable && documentClient ? documentClient : client;

  // Valores para mostrar en el documento
  const displaySeller = isEditable
    ? {
        first_name: 'CLIENTE EJEMPLO',
        last_name: '',
        email: 'cliente@ejemplo.com',
        phone: '+56 9 8765 4321',
        address: 'Calle Venta 987, Ciudad',
        rut: '11.222.333-4',
      }
    : seller;

  const displayVehicle = isEditable
    ? {
        brand: 'Honda',
        model: 'Civic',
        year: 2020,
        license_plate: 'ABCD12',
        color: 'Negro',
        mileage: 45000,
      }
    : vehicle;

  const displayPayment = isEditable
    ? {
        purchase_price: 10000000,
        discounts: 200000,
        total: 9800000,
      }
    : payment;

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
          label='Términos y Condiciones'
        />
      );
    }
    return (
      <div className='text-xs print:text-xs whitespace-pre-wrap'>
        {displayTerms}
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
        {displayNotes}
      </div>
    );
  };

  const getSellerFullName = () => {
    if (!displaySeller) return t('purchase.sellerFallback');
    return `${displaySeller.first_name || ''} ${
      displaySeller.last_name || ''
    }`.trim();
  };

  return (
    <div className={isEditable ? 'border border-slate-200/60 rounded-2xl bg-white overflow-hidden' : ''}>
      {isEditable && (
        <p className='py-3 text-sm text-muted-foreground text-center'>
          {t('purchase.editablePreview')}
        </p>
      )}

      <div
        className={
          isEditable
            ? ''
            : ''
        }
      >
        <div className='purchase-document p-3 min-h-[80vh] bg-white print:p-2 print:text-xs print:scale-75 print:origin-top-left print:w-[133%]'>
          <DocumentHeader
            client={displayClient}
            documentType={t('purchase.type')}
            documentNumber={documentNumber}
            documentDate={documentDate}
            legalInfo={legalInfo}
          />

          <CustomerDetails customer={displaySeller} />

          <VehicleDetails vehicle={displayVehicle} />

          <div className=' rounded-lg p-2 mb-3 print:mb-1 print:p-1'>
            <h2 className='font-semibold text-xs mb-2 print:text-xs'>
              {t('purchase.total.title')}
            </h2>
            <div className='space-y-1 text-xs print:space-y-0 print:text-xs'>
              <div className='flex justify-between text-xs print:text-xs'>
                <p>
                  <strong>{t('purchase.total.purchasePrice')}</strong>
                </p>
                <p>{formatCurrency(displayPayment?.purchase_price || 0)}</p>
              </div>
            </div>
          </div>

          <div className=' rounded-lg p-2 mb-3 print:mb-1 print:p-1'>
            <h2 className='font-semibold text-xs mb-2 print:text-xs'>
              {t('purchase.payment.title')}
            </h2>
            <div className=' rounded-lg p-2 print:p-1'>
              <div className='space-y-1 text-xs print:space-y-0 print:text-xs'>
                <div className='flex justify-between text-xs print:text-xs'>
                  <p>{displayPaymentMethod || 'TRANSFERENCIA'}</p>
                  <p>{formatCurrency(displayPayment?.total || 0)}</p>
                </div>
                <hr className='my-1 print:my-0' />
                <div className='flex justify-between font-semibold text-xs print:text-xs'>
                  <p>{t('purchase.payment.totalLabel')}</p>
                  <p>{formatCurrency(displayPayment?.total || 0)}</p>
                </div>
              </div>
            </div>
            <div className=' rounded-lg p-2 print:p-1 mt-2 print:mt-1 bg-gray-50'>
              <p className='text-center text-xs print:text-xs'>
                {t('purchase.payment.accept', {
                  amount: (displayPayment?.total || 0).toLocaleString(),
                  method: displayPaymentMethod || 'TRANSFERENCIA',
                })}
              </p>
            </div>
          </div>
          {(displayTerms || isEditable) && (
            <div className='mb-2  rounded-lg p-2 print:mb-1 print:p-1'>
              <h2 className='font-semibold text-xs mb-2 print:text-xs'>
                {t('quotation.terms')}
              </h2>
              <div className=' rounded-lg p-2 print:p-1'>
                {renderTerms()}
              </div>
            </div>
          )}

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

          <DocumentSignatures
            leftSignatory={{
              name:
                formatRut(
                  legalInfo?.rut || displayClient?.legal_info?.rut || displayClient?.contact?.rut
                ) || '',
              subtitle: legalInfo?.company_name || displayClient?.name || t('signatures.company'),
              extraInfo: '(Comprador)',
            }}
            rightSignatory={{
              name: getSellerFullName(),
              subtitle: displaySeller?.rut || '',
              extraInfo: '(Vendedor)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PurchaseNote;
