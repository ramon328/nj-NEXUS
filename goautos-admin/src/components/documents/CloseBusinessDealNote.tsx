import React from 'react';
import { Client } from '@/types/client';
import { CustomerData } from './shared/CustomerDetails';
import { VehicleData } from './shared/VehicleDetails';
import DocumentHeader from '@/components/configuration/document-templates/DocumentHeader';
import CustomerDetails from './shared/CustomerDetails';
import VehicleDetails from './shared/VehicleDetails';
import DocumentSignatures from './shared/DocumentSignatures';
import EditableTemplateText from '@/components/configuration/document-templates/EditableTemplateText';
import { useAuth } from '@/contexts/AuthContext';
import { formatRut } from '@/utils/rutFormatter';
import { formatCurrency } from '@/lib/utils';
import { getPaymentMethodLabel } from '@/utils/paymentMethods';

interface CloseBusinessDealNoteProps {
  // Component mode
  isEditable?: boolean;

  // Properties for editable mode
  client?: Client | null;
  legalInfo?: any; // Legal info to use in the document
  editableText?: {
    terms?: string;
    notes?: string;
    terminos_condiciones?: string;
  };
  handleTextChange?: (type: string, value: string) => void;

  // Properties for view mode
  documentClient?: Client | null;
  customer?: CustomerData;
  vehicle?: VehicleData;
  dealDetails: {
    finalSalePrice: number;
    dealershipCommission: number;
    paymentMethod: string;
  };
  notes?: string;
  terms?: string;
  documentNumber?: string;
  documentDate?: string;
  allAdditionals?: any[];
}

const CloseBusinessDealNote: React.FC<CloseBusinessDealNoteProps> = ({
  isEditable = false,
  client,
  legalInfo,
  editableText = {},
  handleTextChange = () => {},
  documentClient,
  customer,
  vehicle,
  dealDetails,
  notes,
  terms,
  documentNumber,
  documentDate,
  allAdditionals = [],
}) => {
  const { userData } = useAuth();

  // Get appropriate values based on mode
  const displayTerms = isEditable
    ? editableText.terms || editableText.terminos_condiciones || ''
    : terms || '';

  const displayNotes = isEditable ? editableText.notes || '' : notes || '';

  // Client to display (prioritize specific document client in view mode)
  const displayClient = !isEditable && documentClient ? documentClient : client;

  // Values to display in the document
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

  const displayDealDetails = isEditable
    ? {
        finalSalePrice: 15000000,
        sale_price: 15000000,
        dealershipCommission: 1500000,
        paymentMethod: 'transferencia',
      }
    : dealDetails;

  const formatCurrencyInWords = (amount: number) => {
    // Función simple para convertir números a palabras (para el texto de aceptación)
    const millions = Math.floor(amount / 1000000);
    const remainder = amount % 1000000;
    const thousands = Math.floor(remainder / 1000);
    const hundreds = remainder % 1000;

    let result = '';
    if (millions > 0) {
      result += `${millions === 1 ? 'un millón' : `${millions} millones`}`;
    }
    if (thousands > 0) {
      if (result) result += ' ';
      result += `${thousands === 1 ? 'un mil' : `${thousands} mil`}`;
    }
    if (hundreds > 0) {
      if (result) result += ' ';
      result += `${hundreds}`;
    }

    return result + ' pesos';
  };

  const liquidationAmount =
    displayDealDetails.finalSalePrice - displayDealDetails.dealershipCommission;

  // Obtener el valor de transferencia del vehículo
  const transferValue = displayVehicle?.transfer_value || 0;

  // Calcular el total de gastos adicionales
  const totalAdditionalExpenses = allAdditionals.reduce((sum, additional) => {
    return sum + (additional.amount || 0);
  }, 0);

  // Calcular el subtotal (sale_price + transfer_value + gastos adicionales)
  const subtotal =
    ((displayDealDetails as any).sale_price ||
      displayDealDetails.finalSalePrice) +
    transferValue +
    totalAdditionalExpenses;

  // Calcular la liquidación a favor del cliente (precio de venta - comisión - gastos adicionales)
  const clientLiquidation =
    displayDealDetails.finalSalePrice -
    displayDealDetails.dealershipCommission -
    totalAdditionalExpenses;

  // Debug: Log para verificar los valores
  console.log('🔍 Debug CloseBusinessDealNote:', {
    displayVehicle,
    transferValue,
    sale_price: (displayDealDetails as any).sale_price,
    finalSalePrice: displayDealDetails.finalSalePrice,
    totalAdditionalExpenses,
    allAdditionals,
    subtotal,
    dealershipCommission: displayDealDetails.dealershipCommission,
    clientLiquidation,
    calculation: `${displayDealDetails.finalSalePrice} - ${displayDealDetails.dealershipCommission} - ${totalAdditionalExpenses} = ${clientLiquidation}`,
  });

  // Render conditionally for editable or static fields
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
          Vista previa de la liquidación de venta. Los textos editables se
          mostrarán resaltados.
        </p>
      )}

      <div
        className={
          isEditable
            ? ''
            : ''
        }
      >
        <div className='close-business-deal-document p-3 min-h-[80vh] bg-white print:p-2 print:text-xs print:scale-75 print:origin-top-left print:w-[133%]'>
          <DocumentHeader
            client={displayClient}
            legalInfo={legalInfo}
            documentType='LIQUIDACIÓN DE VENTA'
            documentNumber={documentNumber}
            documentDate={documentDate}
          />

          <CustomerDetails
            customer={displayCustomer}
            title='DATOS DEL CLIENTE'
          />

          <VehicleDetails vehicle={displayVehicle} title='DATOS DEL VEHÍCULO' />

          {/* Observations */}
          {displayNotes && (
            <div className='mb-2  rounded-lg p-2 print:mb-1 print:p-1'>
              <h2 className='font-semibold text-xs mb-1 print:text-xs'>
                OBSERVACIONES
              </h2>
              <div className='text-xs print:text-xs'>{renderNotes()}</div>
            </div>
          )}

          {/* Liquidation Summary */}
          <div className=' rounded-lg p-2 mb-3 print:mb-1 print:p-1'>
            <h2 className='font-semibold text-xs mb-2 print:text-xs'>
              DETALLE DE LA LIQUIDACIÓN
            </h2>
            <div className='space-y-1 text-xs print:space-y-0 print:text-xs'>
              {/* Verificar si es vehículo consignado */}
              {displayVehicle?.is_consigned ? (
                // Formato para vehículos consignados
                <>
                  <div className='flex justify-between text-xs print:text-xs'>
                    <span>Precio de venta total</span>
                    <span className='font-bold'>
                      {formatCurrency(
                        displayDealDetails.finalSalePrice + transferValue
                      )}
                    </span>
                  </div>
                  {transferValue > 0 && (
                    <div className='flex justify-between text-xs print:text-xs'>
                      <span>Valor de transferencia</span>
                      <span className='font-bold text-red-600'>
                        -{formatCurrency(transferValue)}
                      </span>
                    </div>
                  )}
                  {totalAdditionalExpenses > 0 && (
                    <div className='flex justify-between text-xs print:text-xs'>
                      <span>
                        Gastos adicionales
                        <span className='text-gray-500 opacity-75'>
                          (
                          {allAdditionals.map((additional, index) => (
                            <span key={index}>
                              {additional.title} -
                              {formatCurrency(additional.amount)}
                              {index < allAdditionals.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                          )
                        </span>
                      </span>
                      <span className='font-bold text-red-600'>
                        -{formatCurrency(totalAdditionalExpenses)}
                      </span>
                    </div>
                  )}
                  <div className='flex justify-between text-xs print:text-xs'>
                    <span>Comisión {displayClient?.name || 'Automotora'}</span>
                    <span className='font-bold text-red-600'>
                      -{formatCurrency(displayDealDetails.dealershipCommission)}
                    </span>
                  </div>
                </>
              ) : (
                // Formato para vehículos no consignados (formato original)
                <>
                  <div className='flex justify-between text-xs print:text-xs'>
                    <span>Precio de venta</span>
                    <span className='font-bold'>
                      {formatCurrency(
                        (displayDealDetails as any).sale_price ||
                          displayDealDetails.finalSalePrice
                      )}
                    </span>
                  </div>
                  {transferValue > 0 && (
                    <div className='flex justify-between text-xs print:text-xs'>
                      <span>Valor de transferencia</span>
                      <span className='font-bold text-red-600'>
                        -{formatCurrency(transferValue)}
                      </span>
                    </div>
                  )}
                  {totalAdditionalExpenses > 0 && (
                    <div className='flex justify-between text-xs print:text-xs'>
                      <span>
                        Gastos adicionales
                        <span className='text-gray-500 opacity-75'>
                          (
                          {allAdditionals.map((additional, index) => (
                            <span key={index}>
                              {additional.title} -
                              {formatCurrency(additional.amount)}
                              {index < allAdditionals.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                          )
                        </span>
                      </span>
                      <span className='font-bold'>
                        {formatCurrency(totalAdditionalExpenses)}
                      </span>
                    </div>
                  )}
                  <div className='flex justify-between border-t border-gray-300 pt-3 print:pt-2 mt-3 print:mt-2 text-xs print:text-xs'>
                    <span>Subtotal</span>
                    <span className='font-bold'>
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className='flex justify-between text-xs print:text-xs'>
                    <span>Comisión {displayClient?.name || 'Automotora'}</span>
                    <span className='font-bold text-red-600'>
                      -{formatCurrency(displayDealDetails.dealershipCommission)}
                    </span>
                  </div>
                </>
              )}
              <div className='flex justify-between border-t border-gray-300 pt-3 print:pt-2 mt-3 print:mt-2 font-bold text-xs print:text-xs'>
                <span>Liquidación a favor del cliente</span>
                <span>{formatCurrency(clientLiquidation)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className=' rounded-lg p-2 mb-3 print:mb-1 print:p-1'>
            <h2 className='font-semibold text-xs mb-2 print:text-xs'>
              MEDIO DE PAGO
            </h2>
            <div className='flex text-xs print:text-xs'>
              <span className='font-bold w-32'>Método:</span>
              <span>
                {getPaymentMethodLabel(displayDealDetails.paymentMethod)}
              </span>
            </div>
          </div>

          {/* Acceptance Text */}
          <div className='mb-3 text-xs print:mb-1 print:text-xs'>
            <p>
              Acepto la suma indicada{' '}
              <strong>({formatCurrencyInWords(clientLiquidation)})</strong> en{' '}
              {getPaymentMethodLabel(displayDealDetails.paymentMethod)} a mi entera satisfacción y sin
              ningún tipo de reparo posterior.
            </p>
          </div>

          {/* Terms and Conditions */}
          <div className='mb-2  rounded-lg p-2 print:mb-1 print:p-1'>
            <h2 className='font-semibold text-xs mb-2 print:text-xs'>
              TÉRMINOS Y CONDICIONES
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
              subtitle: displayClient?.name || 'Empresa',
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

export default CloseBusinessDealNote;
