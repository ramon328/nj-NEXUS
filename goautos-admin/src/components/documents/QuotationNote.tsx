import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';
import { Client } from '@/types/client';
import EditableTemplateText from '@/components/configuration/document-templates/EditableTemplateText';
import DocumentHeader from '@/components/configuration/document-templates/DocumentHeader';
import { format, addDays } from 'date-fns';
import CustomerDetails, { CustomerData } from './shared/CustomerDetails';
import VehicleDetails, { VehicleData } from './shared/VehicleDetails';
import DocumentSignatures from './shared/DocumentSignatures';
import { useAuth } from '@/contexts/AuthContext';
import { formatRut } from '@/utils/rutFormatter';

// Tipos para datos específicos de cotización
interface QuotationData {
  estimated_price?: number;
  quotation_date?: string;
  validity_period?: string;
  expiration_date?: string;
  status?: string;
}

// Props para el componente unificado
interface QuotationNoteProps {
  // Modo del componente
  isEditable?: boolean;

  // Propiedades para modo editable
  client?: Client | null;
  legalInfo?: any; // Legal info to use in the document
  editableText?: {
    terms?: string;
    notes?: string;
    terminos_condiciones?: string; // Para compatibilidad con nuevo formato
  };
  handleTextChange?: (type: string, value: string) => void;

  // Propiedades para modo visualización
  customer?: CustomerData;
  vehicle?: VehicleData;
  quotationData?: QuotationData;
  notes?: string;
  terms?: string;
  documentClient?: Client | null; // Cliente para mostrar en modo visualización
  documentNumber?: string; // Número de documento
  documentDate?: string; // Fecha del documento

  // Funcional
  onPrint?: () => void;
}

const QuotationNote: React.FC<QuotationNoteProps> = ({
  isEditable = false,
  client,
  legalInfo,
  editableText = {},
  handleTextChange = () => {},
  customer,
  vehicle,
  quotationData,
  notes,
  terms,
  documentClient,
  documentNumber,
  documentDate,
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
        first_name: t('quotation.placeholders.clientFirst'),
        last_name: t('quotation.placeholders.clientLast'),
        email: t('quotation.placeholders.email'),
        phone: t('quotation.placeholders.phone'),
        address: t('quotation.placeholders.address'),
        rut: t('quotation.placeholders.rut'),
      }
    : customer;

  const displayVehicle = isEditable
    ? {
        brand: t('quotation.placeholders.brand'),
        model: t('quotation.placeholders.model'),
        year: 2022,
        license_plate: 'AB1234',
        color: t('quotation.placeholders.color'),
        mileage: 15000,
        version: t('quotation.placeholders.version'),
        condition: t('quotation.placeholders.condition'),
      }
    : vehicle;

  const displayQuotationData = isEditable
    ? {
        estimated_price: 15000000,
        quotation_date: new Date().toISOString(),
        validity_period: '15 días',
        expiration_date: format(addDays(new Date(), 15), 'dd-MM-yyyy'),
        status: 'Vigente',
      }
    : quotationData;

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
          'Esta cotización es válida hasta la fecha de expiración indicada o hasta agotar stock.'}
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

  // Calcular fecha de expiración de la cotización
  const getExpirationDate = () => {
    if (displayQuotationData?.expiration_date) {
      return displayQuotationData.expiration_date;
    }

    if (
      displayQuotationData?.quotation_date &&
      displayQuotationData?.validity_period
    ) {
      const quotationDate = new Date(displayQuotationData.quotation_date);
      const validityDays =
        parseInt(displayQuotationData.validity_period.split(' ')[0]) || 15;
      return format(addDays(quotationDate, validityDays), 'dd-MM-yyyy');
    }

    return format(addDays(new Date(), 15), 'dd-MM-yyyy');
  };

  const getCustomerFullName = () => {
    if (!displayCustomer) return t('quotation.placeholders.clientFirst');
    return `${displayCustomer.first_name || ''} ${
      displayCustomer.last_name || ''
    }`.trim();
  };

  return (
    <div className={isEditable ? 'border border-slate-200/60 rounded-2xl bg-white overflow-hidden' : ''}>
      {isEditable && (
        <p className='py-3 text-sm text-muted-foreground text-center'>
          {t('quotation.editablePreview')}
        </p>
      )}

      <div
        className={
          isEditable
            ? ''
            : ''
        }
      >
        <div className='quotation-note-document p-3 min-h-[80vh] bg-white print:p-2 print:text-xs print:scale-75 print:origin-top-left print:w-[133%]'>
          <DocumentHeader
            client={displayClient}
            legalInfo={legalInfo}
            documentType={t('quotation.type')}
            documentNumber={documentNumber}
            documentDate={documentDate}
          />

          <CustomerDetails customer={displayCustomer} />

          <VehicleDetails vehicle={displayVehicle} />

          <div className=' rounded-lg p-2 mb-3 print:mb-1 print:p-1'>
            <h2 className='font-semibold text-xs mb-2 print:text-xs'>
              {t('quotation.price')}
            </h2>
            <div className='flex items-baseline'>
              <p className='text-sm font-semibold print:text-xs'>
                {formatCurrency(displayQuotationData?.estimated_price || 0)}
              </p>
            </div>
            <div className='flex flex-col sm:flex-row sm:justify-between mt-1 print:mt-0 gap-0.5 print:gap-0 text-xs print:text-xs'>
              <p>
                <strong>{t('quotation.date')}</strong> {documentDate || '-'}
              </p>
              <p>
                <strong>{t('quotation.validUntil')}</strong>{' '}
                {getExpirationDate()}
              </p>
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
                  displayClient?.legal_info?.rut || displayClient?.contact?.rut
                ) || '',
              subtitle: displayClient?.name || t('signatures.company'),
            }}
            rightSignatory={{
              name: getCustomerFullName(),
              subtitle: displayCustomer?.rut || '',
            }}
            className='mt-8 sm:mt-12'
          />
        </div>
      </div>
    </div>
  );
};

export default QuotationNote;
