import DocumentHeader from '@/components/configuration/document-templates/DocumentHeader';
import EditableTemplateText from '@/components/configuration/document-templates/EditableTemplateText';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { Client } from '@/types/client';
import React from 'react';
import CustomerDetails, { CustomerData } from './shared/CustomerDetails';
import DocumentSignatures from './shared/DocumentSignatures';
import VehicleDetails, { VehicleData } from './shared/VehicleDetails';
import { useTranslation } from 'react-i18next';
import { formatRut } from '@/utils/rutFormatter';

// Tipos para datos específicos de consignación
interface ConsignmentData {
  client_price?: number;
  publication_price?: number;
  commission_percentage?: number;
  minimum_commission?: number;
  duration_days?: number;
}

// Información legal
interface LegalInfo {
  company_name?: string;
  rut?: string;
  legal_representative?: string;
  legal_address?: string;
}

// Props para el componente unificado
interface ConsignmentNoteProps {
  // Modo del componente
  isEditable?: boolean;

  // Propiedades para modo editable
  client?: Client | null;
  legalInfo?: LegalInfo | null;
  editableText?: {
    terms?: string;
    notes?: string;
    terminos_condiciones?: string; // Para compatibilidad con nuevo formato
  };
  handleTextChange?: (type: string, value: string) => void;

  // Propiedades para modo visualización
  customer?: CustomerData;
  vehicle?: VehicleData;
  consignmentData?: ConsignmentData;
  notes?: string;
  terms?: string;
  documentClient?: Client | null; // Cliente para mostrar en modo visualización
  documentNumber?: string; // Número de documento
  documentDate?: string; // Fecha del documento

  // Funcional
  onPrint?: () => void;
}

const ConsignmentNote: React.FC<ConsignmentNoteProps> = ({
  isEditable = false,
  client,
  legalInfo,
  editableText = {},
  handleTextChange = () => {},
  customer,
  vehicle,
  consignmentData,
  notes,
  terms,
  documentClient,
  documentNumber,
  documentDate,
  onPrint,
}) => {
  const { userData } = useAuth();
  const { t } = useTranslation('vehicleDocuments');
  console.log('userData', userData);
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
      }
    : vehicle;

  const displayConsignmentData = isEditable
    ? {
        client_price: 15000000,
        publication_price: 16500000,
        commission_percentage: 6,
        minimum_commission: 1000000,
        duration_days: 60,
      }
    : consignmentData;

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
          label='Notas'
        />
      );
    }
    return (
      <div className='text-xs print:text-xs whitespace-pre-wrap'>
        {displayNotes || 'Sin observaciones'}
      </div>
    );
  };

  const getCustomerFullName = () => {
    if (!displayCustomer) return 'Cliente';
    return `${displayCustomer.first_name || ''} ${
      displayCustomer.last_name || ''
    }`.trim();
  };

  return (
    <div className={isEditable ? 'border border-slate-200/60 rounded-2xl bg-white overflow-hidden' : ''}>
      {isEditable && (
        <p className='py-3 text-sm text-muted-foreground text-center'>
          {t('consignment.editablePreview')}
        </p>
      )}

      <div
        className={
          isEditable
            ? ''
            : ''
        }
      >
        <div className='consignment-note-document p-3 min-h-[80vh] bg-white print:p-2 print:text-xs print:scale-75 print:origin-top-left print:w-[133%]'>
          <DocumentHeader
            client={displayClient}
            legalInfo={legalInfo}
            documentType={t('consignment.type')}
            documentNumber={documentNumber}
            documentDate={documentDate}
          />

          <div className='my-3 text-justify text-xs print:text-xs print:my-1'>
            <p>
              Vienen a suscribir el siguiente contrato de consignación de
              vehículo motorizado entre{' '}
              <strong>{displayClient?.name || 'Empresa'}</strong>, razón social{' '}
              <strong>{legalInfo?.company_name || 'Razón Social'}</strong>, RUT{' '}
              {legalInfo?.rut || displayClient?.contact?.rut || 'XX.XXX.XXX-X'},
              representado por{' '}
              {legalInfo?.legal_representative || 'Representante Legal'}, con
              domicilio en{' '}
              {legalInfo?.legal_address ||
                displayClient?.contact?.address ||
                'Dirección Legal'}
              , en adelante "el consignatario o comisionista",
            </p>
          </div>

          <CustomerDetails customer={displayCustomer} />

          <div className='my-2 text-justify text-xs print:text-xs print:my-1'>
            <p>
              en adelante "el consignador o comitente", ambos mayores de edad,
              lo cual lo acreditan adjuntando copia de sus cédulas de identidad
              a este contrato.
            </p>
            <p className='mt-1 print:mt-0 text-xs print:text-xs'>
              Ambas partes han convenido celebrar el presente contrato de
              consignación de acuerdo en forma libre, informada, espontánea y
              voluntaria.
            </p>
            <p className='mt-1 print:mt-0 text-xs print:text-xs'>
              <strong>{getCustomerFullName()}</strong>, RUT{' '}
              <strong>{displayCustomer?.rut || '[RUT DEL CLIENTE]'}</strong>,
              deja en poder de{' '}
              {userData?.first_name + ' ' + userData?.last_name ||
                '[REPRESENTANTE LEGAL]'}
              , representantes de {displayClient?.name || 'Empresa'}, quien lo
              recibe en condiciones para ser vendido a un tercero; es decir, el
              vehículo no cuenta con ningún vicio que impida ser utilizado según
              su naturaleza en forma normal e inmediatamente adquirido por el
              tercero. En ese estado y condición lo recibe, según lo declaran
              ambas partes en el presente contrato el vehículo:
            </p>
          </div>

          <VehicleDetails vehicle={displayVehicle} />
          <div className=' rounded-lg p-2 mb-3 print:mb-1 print:p-1'>
            <div className='grid grid-cols-2 gap-2 print:gap-1'>
              <div className=' pr-1 print:pr-0.5'>
                <h3 className='font-semibold text-xs print:text-xs'>
                  {t('consignment.prices.client')}
                </h3>
                <p className='text-sm font-bold my-1 print:my-0 print:text-xs'>
                  {formatCurrency(displayConsignmentData?.client_price || 0)}
                </p>
              </div>
              <div className='pl-1 print:pl-0.5'>
                <h3 className='font-semibold text-xs print:text-xs'>
                  {t('consignment.prices.publication')}
                </h3>
                <p className='text-sm font-bold my-1 print:my-0 print:text-xs'>
                  {formatCurrency(
                    displayConsignmentData?.publication_price || 0
                  )}
                </p>
              </div>
            </div>
          </div>

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
          />
        </div>
      </div>
    </div>
  );
};

export default ConsignmentNote;
