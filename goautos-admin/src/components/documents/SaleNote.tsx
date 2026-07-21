import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';
import { Client } from '@/types/client';
import { ExtraPageConfig } from '@/types/document-template';
import EditableTemplateText from '@/components/configuration/document-templates/EditableTemplateText';
import DocumentHeader from '@/components/configuration/document-templates/DocumentHeader';
import CustomerDetails, { CustomerData } from './shared/CustomerDetails';
import VehicleDetails, { VehicleData } from './shared/VehicleDetails';
import DocumentSignatures from './shared/DocumentSignatures';
import { useAuth } from '@/contexts/AuthContext';
import { formatRut } from '@/utils/rutFormatter';

// Types for customer data
interface Customer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  rut?: string;
}

// Types for vehicle data
interface Vehicle {
  brand?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  color?: string;
  mileage?: number;
  engine_number?: string;
  chassis_number?: string;
  owner_number?: string;
}

// Types for payment and price data
interface SaleData {
  vehicle_price?: number;
  additionals?: number;
  total?: number;
  payment_method?: string;
  payment_date?: string;
  transfer_value?: number; // Added for transfer value
}

// Type for additional transactions
interface AdditionalTransaction {
  id?: number | string;
  description?: string;
  amount?: number;
  type?: 'income' | 'expense';
}

// Type for sale additionals
interface SaleAdditional {
  id: number;
  amount: number;
  title: string;
  description?: string;
  created_at: string;
}

// Type for trade-in vehicle
interface TradeInVehicle {
  brand?: string;
  model?: string;
  version?: string;
  year?: number;
  license_plate?: string;
  color?: string;
  value?: number;
}

// Type for payment breakdown item
interface PaymentBreakdownItem {
  title: string;
  amount: number;
}

// Type for reservation payment
interface ReservationPayment {
  id: number;
  title: string;
  amount: number;
  description?: string;
  type: 'reservation_payment' | 'reservation_additional';
  created_at: string;
  vehicle_id: number;
}

// Props for the unified component
interface SaleNoteProps {
  // Component mode
  isEditable?: boolean;

  // Properties for editable mode
  client?: Client | null;
  legalInfo?: any; // NEW: legal_info to use in the document
  editableText?: {
    terms?: string;
    notes?: string;
    terminos_condiciones?: string; // For compatibility with new format
    extra_page_config?: ExtraPageConfig;
  };
  handleTextChange?: (type: string, value: string | ExtraPageConfig) => void;

  // Properties for view mode
  customer?: CustomerData;
  vehicle?: VehicleData;
  saleData?: SaleData;
  additionalTransactions?: AdditionalTransaction[]; // Legacy support
  saleAdditionals?: SaleAdditional[]; // New sale additionals
  saleIncomes?: SaleAdditional[]; // Ingresos del cierre (accesorios, seguros, paquetes)
  allAdditionals?: SaleAdditional[]; // All additionals (reservation + sale) for financial summary
  reservationPayments?: ReservationPayment[]; // Reservation payments
  notes?: string;
  terms?: string;
  documentClient?: Client | null; // Client to show in view mode
  documentNumber?: string; // Document number
  documentDate?: string; // Document date
  tradeInVehicle?: TradeInVehicle; // Trade-in vehicle information (legacy single)
  tradeInVehicles?: TradeInVehicle[]; // Multiple trade-in vehicles
  paymentBreakdown?: PaymentBreakdownItem[] | string; // Desglose de pagos
  extraPageConfig?: ExtraPageConfig; // Extra page configuration

  // Functional
  onPrint?: () => void;
}

const SaleNote: React.FC<SaleNoteProps> = ({
  isEditable = false,
  client,
  legalInfo,
  editableText = {},
  handleTextChange = () => {},
  customer,
  vehicle,
  saleData,
  additionalTransactions = [],
  saleAdditionals = [],
  saleIncomes = [],
  allAdditionals = [],
  reservationPayments = [],
  notes,
  terms,
  documentClient,
  documentNumber,
  documentDate,
  tradeInVehicle,
  tradeInVehicles,
  paymentBreakdown,
  extraPageConfig,
  onPrint,
}) => {
  const { userData } = useAuth();
  const { t } = useTranslation('vehicleDocuments');

  // Get appropriate values based on mode
  const getDisplayTerms = () => {
    const rawTerms = isEditable
      ? editableText.terms || editableText.terminos_condiciones || ''
      : terms || '';

    // Si rawTerms es un objeto o string JSON, extraer el campo 'terms'
    if (typeof rawTerms === 'object' && rawTerms !== null) {
      return (rawTerms as any).terms || '';
    }

    // Si es un string que parece JSON, intentar parsearlo
    if (typeof rawTerms === 'string' && rawTerms.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(rawTerms);
        return parsed.terms || rawTerms;
      } catch {
        return rawTerms;
      }
    }

    return rawTerms;
  };

  const displayTerms = getDisplayTerms();
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

  const displaySaleData = isEditable
    ? {
        vehicle_price: 15000000,
        additionals: 500000,
        total: 15500000,
        payment_method: 'TRANSFERENCIA',
        payment_date: '25 de abril de 2023',
        transfer_value: 1000000, // Added for transfer value
      }
    : saleData;

  // Render conditionally for editable or static fields
  const renderTerms = () => {
    if (isEditable) {
      return (
        <EditableTemplateText
          value={displayTerms}
          onChange={(value) =>
            handleTextChange(
              editableText.terminos_condiciones ? 'terminos_condiciones' : 'terms',
              value
            )
          }
          label={t('quotation.terms')}
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
        {displayNotes || t('quotation.noObservations')}
      </div>
    );
  };

  // Calculate totals for additional transactions (view mode)
  const calculateAdditionalsTotal = () => {
    if (isEditable) return displaySaleData?.additionals || 0;

    // Use all additionals (reservation + sale) for the financial summary
    if (allAdditionals && allAdditionals.length > 0) {
      return allAdditionals.reduce(
        (sum, additional) => sum + (Number(additional.amount) || 0),
        0
      );
    }

    // Fallback to legacy method if no allAdditionals
    if (saleAdditionals && saleAdditionals.length > 0) {
      return saleAdditionals.reduce(
        (sum, additional) => sum + (Number(additional.amount) || 0),
        0
      );
    }

    return additionalTransactions
      .filter((item) => {
        // Excluir vehículos en parte de pago del cálculo de adicionales
        const description = item.description?.toLowerCase() || '';
        return (
          !description.includes('parte de pago') &&
          !description.includes('trade-in')
        );
      })
      .reduce((total, item) => {
        // Add income and subtract expenses
        const amount = item.amount || 0;
        return total + (item.type === 'income' ? amount : -amount);
      }, 0);
  };

  const additionalTotal = calculateAdditionalsTotal();

  // Get sale additionals to display (for both editable and view modes)
  const displaySaleAdditionals = isEditable
    ? [
        {
          id: 1,
          title: 'Gestoría',
          amount: 50000,
          description: 'Gestoría de transferencia',
        },
      ]
    : saleAdditionals;

  // Get sale incomes (accesorios, seguros, paquetes) to display
  const displaySaleIncomes = isEditable
    ? [
        {
          id: 10,
          title: 'Seguro adicional',
          amount: 100000,
          description: 'Seguro extendido',
        },
        {
          id: 11,
          title: 'Accesorios',
          amount: 50000,
          description: 'Kit de accesorios premium',
        },
      ]
    : saleIncomes;

  // Get the sale price (base price from sale_price field)
  const baseVehiclePrice = displaySaleData?.vehicle_price || 0;

  // Precio publicado original del vehículo (para mostrar ajuste si existe)
  const publishedVehiclePrice = isEditable
    ? 16000000
    : displayVehicle?.price || 0;

  // Si el precio publicado es mayor que el precio de venta, mostrar el ajuste
  const priceAdjustment =
    publishedVehiclePrice > 0 && baseVehiclePrice > 0
      ? Math.max(0, publishedVehiclePrice - baseVehiclePrice)
      : 0;
  const hasPriceAdjustment = priceAdjustment > 0;

  // Obtener el valor de transferencia desde el vehicle (tabla vehicles)
  const transferValue = displayVehicle?.transfer_value || 0;

  // Sumar ingresos del cierre (accesorios, seguros, paquetes)
  const incomesTotal = (displaySaleIncomes || []).reduce(
    (sum, income) => sum + (Number(income.amount) || 0),
    0
  );

  // Calcular el total sumando precio base, valor de transferencia, adicionales e ingresos
  const totalPrice =
    baseVehiclePrice + transferValue + additionalTotal + incomesTotal;

  // Calculate total trade-in value from all trade-in vehicles
  const tradeInValue = (() => {
    const vehicles = tradeInVehicles && tradeInVehicles.length > 0
      ? tradeInVehicles
      : tradeInVehicle ? [tradeInVehicle] : [];
    return vehicles.reduce((sum, v) => sum + (v.value || 0), 0);
  })();

  // Parse payment breakdown if it's a string
  const getPaymentBreakdown = () => {
    if (!paymentBreakdown) return null;

    // If it's already an array, return it
    if (Array.isArray(paymentBreakdown)) {
      return paymentBreakdown;
    }

    // If it's a string, try to parse it as JSON
    if (typeof paymentBreakdown === 'string') {
      try {
        const parsed = JSON.parse(paymentBreakdown);
        return parsed;
      } catch (error) {
        console.error('Error parsing payment breakdown:', error);
        return null;
      }
    }

    return null;
  };

  const parsedPaymentBreakdown = getPaymentBreakdown();

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
          {t('sale.editablePreview')}
        </p>
      )}

      <div
        className={
          isEditable
            ? ''
            : ''
        }
      >
        <div className='sale-note-document p-3 min-h-[80vh] bg-white print:p-2 print:text-xs print:scale-75 print:origin-top-left print:w-[133%]'>
          <DocumentHeader
            client={displayClient}
            legalInfo={legalInfo}
            documentType={t('sale.type')}
            documentNumber={documentNumber}
            documentDate={documentDate}
          />

          <CustomerDetails customer={displayCustomer} />

          <VehicleDetails vehicle={displayVehicle} />

          {/* Trade-in vehicle details section */}
          {(() => {
            const displayVehicles = tradeInVehicles && tradeInVehicles.length > 0
              ? tradeInVehicles
              : tradeInVehicle ? [tradeInVehicle] : [];
            if (displayVehicles.length === 0 || isEditable) return null;
            return (
              <div className='rounded-lg p-1 mb-1 print:mb-0.5 print:p-0.5'>
                <h2 className='font-semibold text-xs mb-0.5 print:text-xs'>
                  {t('sale.tradeIn.title')} {displayVehicles.length > 1 ? `(${displayVehicles.length})` : ''}
                </h2>
                {displayVehicles.map((tv, idx) => (
                  <div key={idx} className={`grid grid-cols-2 gap-x-2 gap-y-0.5 print:gap-x-1 print:gap-y-0.5 ${idx > 0 ? 'mt-1.5 pt-1.5 border-t border-dashed' : ''}`}>
                    <div>
                      <p className='text-xs print:text-xs'><strong>{t('vehicle.brand')}</strong></p>
                      <p className='text-xs print:text-xs'>{tv?.brand || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className='text-xs print:text-xs'><strong>{t('vehicle.model')}</strong></p>
                      <p className='text-xs print:text-xs'>{tv?.model || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className='text-xs print:text-xs'><strong>{t('vehicle.year')}</strong></p>
                      <p className='text-xs print:text-xs'>{tv?.year || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className='text-xs print:text-xs'><strong>{t('vehicle.license')}</strong></p>
                      <p className='text-xs print:text-xs'>{tv?.license_plate || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className='text-xs print:text-xs'><strong>{t('sale.financial.totalLabel')}</strong></p>
                      <p className='text-xs print:text-xs'>{formatCurrency(tv?.value || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Consolidated Financial Section */}
          <div className=' rounded-lg p-1 mb-1 print:mb-0.5 print:p-0.5'>
            <h2 className='font-semibold text-xs mb-0.5 print:text-xs print:mb-0.5'>
              {t('sale.detail.title')}
            </h2>

            <div className='space-y-0.5 text-xs print:space-y-0 print:text-xs'>
              {/* Precio publicado y ajuste de precio (si aplica) */}
              {hasPriceAdjustment ? (
                <>
                  <div className='flex justify-between text-xs print:text-xs'>
                    <span>Precio publicado del vehículo</span>
                    <span>{formatCurrency(publishedVehiclePrice)}</span>
                  </div>
                  <div className='flex justify-between text-xs print:text-xs text-orange-700'>
                    <span>- Ajuste de precio</span>
                    <span>-{formatCurrency(priceAdjustment)}</span>
                  </div>
                </>
              ) : (
                <div className='flex justify-between text-xs print:text-xs'>
                  <span>Precio de venta del vehículo</span>
                  <span>{formatCurrency(baseVehiclePrice)}</span>
                </div>
              )}
              {/* Transfer value */}
              {transferValue > 0 && (
                <div className='flex justify-between text-xs print:text-xs text-blue-700'>
                  <span>+ Valor de Transferencia</span>
                  <span>{formatCurrency(transferValue)}</span>
                </div>
              )}

              {/* Additionals (gastos: gestoría, traspaso, etc.) */}
              {displaySaleAdditionals && displaySaleAdditionals.length > 0 && (
                <>
                  {displaySaleAdditionals.map((additional, index) => (
                    <div
                      key={additional.id || index}
                      className='flex justify-between text-xs print:text-xs text-gray-600'
                    >
                      <span>+ {additional.title}</span>
                      <span>{formatCurrency(additional.amount)}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Ingresos del cierre (accesorios, seguros, paquetes) */}
              {displaySaleIncomes && displaySaleIncomes.length > 0 && (
                <>
                  {displaySaleIncomes.map((income, index) => (
                    <div
                      key={income.id || `income-${index}`}
                      className='flex justify-between text-xs print:text-xs text-emerald-700'
                    >
                      <span>+ {income.title}</span>
                      <span>{formatCurrency(income.amount)}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Trade-in: show SUBTOTAL then deduction then TOTAL */}
              {tradeInValue > 0 ? (
                <>
                  <div className='flex justify-between font-semibold text-xs print:text-xs mt-1 print:mt-0 pt-1 border-t border-gray-200'>
                    <span>SUBTOTAL</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>
                  <div className='flex justify-between text-xs print:text-xs text-orange-700'>
                    <span>- {tradeInVehicles && tradeInVehicles.length > 1
                      ? `Vehículos en parte de pago (${tradeInVehicles.length})`
                      : t('sale.financial.tradeInLabel')}</span>
                    <span>{formatCurrency(tradeInValue)}</span>
                  </div>
                  <div className='flex justify-between font-bold text-xs print:text-xs mt-1 print:mt-0 pt-1 border-t border-gray-300'>
                    <span>TOTAL</span>
                    <span>{formatCurrency(totalPrice - tradeInValue)}</span>
                  </div>
                </>
              ) : (
                <div className='flex justify-between font-bold text-xs print:text-xs mt-1 print:mt-0 pt-1 border-t border-gray-300'>
                  <span>TOTAL</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
              )}

              {/* Payments breakdown */}
              {(() => {
                const allPayments = [
                  ...(reservationPayments || []).map(p => ({ title: p.title, amount: p.amount || 0 })),
                  ...(parsedPaymentBreakdown || []).map(p => ({ title: p.title, amount: p.amount || 0 })),
                ];
                if (allPayments.length === 0) return null;

                if (allPayments.length === 1) {
                  return (
                    <div className='text-xs print:text-xs text-gray-600 mt-1'>
                      Forma de Pago: {allPayments[0].title}
                    </div>
                  );
                }

                return (
                  <div className='pt-1 print:pt-0.5'>
                    <div className='text-xs print:text-xs font-medium text-gray-700 mb-0.5 print:mb-0'>
                      {t('sale.financial.paymentsTitle')}
                    </div>
                    {allPayments.map((payment, index) => (
                      <div key={index} className='flex justify-between text-xs print:text-xs text-gray-600'>
                        <span>- {payment.title}</span>
                        <span>{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                    <div className='flex justify-between font-semibold text-xs print:text-xs pt-1 print:pt-0.5 mt-1 print:mt-0.5 border-t border-gray-300'>
                      <span>{t('sale.financial.totalPaid')}</span>
                      <span>{formatCurrency(allPayments.reduce((s, p) => s + p.amount, 0))}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className='mb-1  rounded-lg p-1 print:mb-0.5 print:p-0.5'>
            <h2 className='font-semibold text-xs mb-0.5 print:text-xs'>
              {t('quotation.observations')}
            </h2>
            <div className=' rounded-lg p-1 print:p-0.5'>
              {renderNotes()}
            </div>
          </div>

          <div className='mb-1  rounded-lg p-1 print:mb-0.5 print:p-0.5'>
            <h2 className='font-semibold text-xs mb-0.5 print:text-xs'>
              {t('quotation.terms')}
            </h2>
            <div className=' rounded-lg p-1 print:p-0.5'>
              {renderTerms()}
            </div>
          </div>

          <DocumentSignatures
            leftSignatory={{
              name:
                formatRut(legalInfo?.rut || displayClient?.contact?.rut) || '',
              subtitle:
                legalInfo?.company_name ||
                displayClient?.name ||
                t('signatures.company'),
            }}
            rightSignatory={{
              name: getCustomerFullName(),
              subtitle: displayCustomer?.rut || '',
            }}
          />
        </div>

        {/* Extra PDF Files Marker - Hidden element for PDF generation */}
        {(() => {
          const config = isEditable
            ? editableText?.extra_page_config
            : extraPageConfig;

          if (!config || !config.enabled || !config.files || config.files.length === 0) {
            return null;
          }

          const pdfFiles = config.files.filter(f => f.type === 'pdf');

          return (
            <>
              {/* Hidden marker with PDF URLs for download component */}
              {pdfFiles.length > 0 && (
                <div
                  className="extra-pdf-files-marker"
                  style={{ display: 'none' }}
                  data-pdf-urls={JSON.stringify(pdfFiles.map(f => f.url))}
                />
              )}

              {/* Visual representation for screen/print */}
              {config.files.map((file) => (
                <div
                  key={file.id}
                  className="page-break-before mt-8 print:mt-0 print:pt-8"
                >
                  <div className="space-y-4">
                    {/* File title */}
                    <div className="border-b-2 border-gray-300 pb-3 mb-4">
                      <h2 className="text-xl font-bold text-gray-900 print:text-lg">
                        {file.name}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {file.type === 'pdf' ? 'Documento PDF' : 'Documento Word'}
                      </p>
                    </div>

                    {/* Embedded PDF or download link */}
                    {file.type === 'pdf' ? (
                      <div className=" rounded-lg overflow-hidden print:hidden">
                        <iframe
                          src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0`}
                          className="w-full h-[600px]"
                          title={file.name}
                        />
                      </div>
                    ) : (
                      <div className=" rounded-lg p-6 text-center print:hidden">
                        <p className="text-gray-700 mb-4">
                          Para ver este documento Word, haz clic en el botón de descarga
                        </p>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Descargar {file.name}
                        </a>
                      </div>
                    )}

                    {/* Print version - show message that PDF is included */}
                    <div className="hidden print:block  rounded-lg p-4">
                      <p className="text-sm text-gray-700">
                        <strong>{file.type === 'pdf' ? 'Documento PDF incluido en las páginas siguientes' : 'Documento disponible en:'}</strong>
                      </p>
                      {file.type !== 'pdf' && (
                        <p className="text-xs text-gray-600 mt-2 break-all">
                          {file.url}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default SaleNote;
