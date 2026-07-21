import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
} from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/utils';
import { modernStyles as styles } from './styles/modernStyles';
import { PDFLayoutConfig } from '@/types/document-template';
import {
  getCustomRows,
  renderCustomGridRows,
  renderCustomFinancialRows,
  renderCustomSections,
} from './helpers/customContent';

interface SaleNotePDFProps {
  // Datos de la empresa
  companyName: string;
  companyRut: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;

  // Datos del documento
  documentNumber: string;
  documentDate: string;

  // Datos del cliente
  customerName: string;
  customerRut?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;

  // Datos del vehículo
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehiclePlate?: string;
  vehicleMileage?: number;
  vehicleEngineNumber?: string;
  vehicleChassisNumber?: string;

  // Datos financieros
  vehiclePrice: number;
  originalVehiclePrice?: number;
  priceAdjustment?: number;
  transferValue?: number;
  additionals?: Array<{ title: string; amount: number }>;
  incomes?: Array<{ title: string; amount: number }>;
  total: number;

  // Pagos
  payments?: Array<{ title: string; amount: number; dueDate?: string; paid?: boolean }>;
  totalPaid: number;

  // Trade-in vehicles
  tradeInVehicles?: Array<{ brand: string; model: string; year?: number; licensePlate?: string; value: number }>;
  tradeInTotal?: number;

  // Términos y observaciones
  terms?: string;
  notes?: string;

  // Layout config
  layoutConfig?: PDFLayoutConfig;
}

const SaleNotePDF: React.FC<SaleNotePDFProps> = ({
  companyName,
  companyRut,
  companyAddress,
  companyPhone,
  companyEmail,
  companyLogo,
  documentNumber,
  documentDate,
  customerName,
  customerRut,
  customerPhone,
  customerEmail,
  customerAddress,
  vehicleBrand,
  vehicleModel,
  vehicleYear,
  vehicleColor,
  vehiclePlate,
  vehicleMileage,
  vehicleEngineNumber,
  vehicleChassisNumber,
  vehiclePrice,
  originalVehiclePrice,
  priceAdjustment,
  transferValue,
  additionals,
  incomes,
  total,
  payments,
  totalPaid,
  tradeInVehicles,
  tradeInTotal,
  terms,
  notes,
  layoutConfig,
}) => {
  const lc = layoutConfig;
  const ov = lc?.contentOverrides || {};
  const get = (key: string, original: string | number | undefined): string => {
    if (ov[key] !== undefined) return String(ov[key]);
    return String(original ?? '');
  };
  const getNum = (key: string, original: number): number => {
    if (ov[key] !== undefined) return Number(ov[key]) || 0;
    return original;
  };

  const pageStyle: any = lc ? [styles.page, { padding: `${lc.pageMarginV ?? 20} ${lc.pageMarginH ?? 30}` }] : styles.page;
  const sectionStyle: any = lc ? [styles.section, { marginBottom: lc.sectionSpacing }] : styles.section;
  const signaturesStyle: any = lc ? [styles.signatures, { marginTop: lc.signaturesMarginTop }] : styles.signatures;
  const termsTextStyle: any = lc ? [styles.textBlockSmall, { fontSize: lc.termsFontSize }] : styles.textBlockSmall;
  const notesTextStyle: any = lc?.notesFontSize ? [styles.textBlock, { fontSize: lc.notesFontSize }] : styles.textBlock;
  const effectiveNotes = (lc?.notesOverride != null) ? lc.notesOverride : notes;
  const effectiveTerms = (lc?.termsOverride != null) ? lc.termsOverride : terms;
  const _showNotes = lc ? (lc.showNotes !== false) : true;
  const _showTerms = lc ? (lc.showTerms !== false) : true;
  const _showClientData = lc ? (lc.showClientData !== false) : true;
  const _showVehicleDetails = lc ? (lc.showVehicleDetails !== false) : true;
  const _showFinancialDetails = lc ? (lc.showFinancialDetails !== false) : true;
  const _showSignatures = lc ? (lc.showSignatures !== false) : true;
  const _showPayments = lc ? (lc.showPayments !== false) : true;
  const _showTransferValue = lc ? (lc.showTransferValue !== false) : true;

  // Igual que saleNoteConfig: pagos RECIBIDOS vs cuotas/letras a PLAZO. El contenido
  // custom anclado a 'payments'/'installments'/'tradeIn' solo se imprime cuando esa
  // sección existe en el schema del editor; si no, quedaría huérfano (visible en el
  // PDF pero imposible de ver/borrar en el preview).
  const paidPayments = (payments || []).filter((p) => p.paid !== false);
  const installments = (payments || []).filter((p) => p.paid === false);
  const hasTradeIn = !!tradeInVehicles && tradeInVehicles.length > 0;

  return (
  <Document>
    <Page size={lc?.pageSize || 'A4'} style={pageStyle} wrap>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.companySection}>
            {companyLogo && (
              <Image src={companyLogo} style={styles.logoImage} />
            )}
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyDetails}>RUT: {companyRut}</Text>
            {companyAddress && (
              <Text style={styles.companyDetails}>{companyAddress}</Text>
            )}
            {companyPhone && (
              <Text style={styles.companyDetails}>Tel: {companyPhone}</Text>
            )}
            {companyEmail && (
              <Text style={styles.companyDetails}>{companyEmail}</Text>
            )}
          </View>
          <View style={styles.documentSection}>
            <Text style={styles.documentType}>NOTA DE VENTA</Text>
            <Text style={styles.documentMeta}>N° {documentNumber}</Text>
            <Text style={styles.documentMeta}>Fecha: {documentDate}</Text>
          </View>
        </View>
        <View style={styles.headerDivider} />
      </View>

      {/* Datos del Cliente */}
      {_showClientData && (
      <View style={sectionStyle}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Datos del Cliente</Text>
          <View style={styles.sectionDivider} />
        </View>
        <View style={styles.sectionContent}>
          <View style={styles.grid}>
            <View style={styles.gridCol2}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Nombre</Text>
                <Text style={styles.dataValue}>{get('customerName', customerName)}</Text>
              </View>
            </View>
            {customerRut && (
              <View style={styles.gridCol2}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>RUT</Text>
                  <Text style={styles.dataValue}>{get('customerRut', customerRut)}</Text>
                </View>
              </View>
            )}
            {customerPhone && (
              <View style={styles.gridCol2}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Teléfono</Text>
                  <Text style={styles.dataValue}>{get('customerPhone', customerPhone)}</Text>
                </View>
              </View>
            )}
            {customerEmail && (
              <View style={styles.gridCol2}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Email</Text>
                  <Text style={styles.dataValue}>{get('customerEmail', customerEmail)}</Text>
                </View>
              </View>
            )}
            {customerAddress && (
              <View style={{ width: '100%', paddingHorizontal: 6 }}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Dirección</Text>
                  <Text style={styles.dataValue}>{get('customerAddress', customerAddress)}</Text>
                </View>
              </View>
            )}
            {renderCustomGridRows(ov, 'customer', styles)}
          </View>
        </View>
      </View>
      )}
      {renderCustomSections(ov, 'customer', styles, sectionStyle)}

      {/* Detalles del Vehículo */}
      {_showVehicleDetails && (
      <View style={sectionStyle}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Detalles del Vehículo</Text>
          <View style={styles.sectionDivider} />
        </View>
        <View style={styles.sectionContent}>
          <View style={styles.grid}>
            <View style={styles.gridCol2}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Marca</Text>
                <Text style={styles.dataValue}>{get('vehicleBrand', vehicleBrand)}</Text>
              </View>
            </View>
            <View style={styles.gridCol2}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Modelo</Text>
                <Text style={styles.dataValue}>{get('vehicleModel', vehicleModel)}</Text>
              </View>
            </View>
            {vehicleYear && (
              <View style={styles.gridCol2}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Año</Text>
                  <Text style={styles.dataValue}>{get('vehicleYear', vehicleYear)}</Text>
                </View>
              </View>
            )}
            {vehicleColor && (
              <View style={styles.gridCol2}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Color</Text>
                  <Text style={styles.dataValue}>{get('vehicleColor', vehicleColor)}</Text>
                </View>
              </View>
            )}
            {vehiclePlate && (
              <View style={styles.gridCol2}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Patente</Text>
                  <Text style={styles.dataValue}>{get('vehiclePlate', vehiclePlate)}</Text>
                </View>
              </View>
            )}
            {vehicleMileage && (
              <View style={styles.gridCol2}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Kilometraje</Text>
                  <Text style={styles.dataValue}>{get('vehicleMileage', `${vehicleMileage} km`)}</Text>
                </View>
              </View>
            )}
            {vehicleEngineNumber && (
              <View style={styles.gridCol2}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>N° Motor</Text>
                  <Text style={styles.dataValue}>{get('vehicleEngineNumber', vehicleEngineNumber)}</Text>
                </View>
              </View>
            )}
            {vehicleChassisNumber && (
              <View style={styles.gridCol2}>
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>N° Chasis</Text>
                  <Text style={styles.dataValue}>{get('vehicleChassisNumber', vehicleChassisNumber)}</Text>
                </View>
              </View>
            )}
            {renderCustomGridRows(ov, 'vehicle', styles)}
          </View>
        </View>
      </View>
      )}
      {renderCustomSections(ov, 'vehicle', styles, sectionStyle)}

      {/* Vehículos en Parte de Pago */}
      {tradeInVehicles && tradeInVehicles.length > 0 && (
      <View style={sectionStyle}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Vehículo{tradeInVehicles.length > 1 ? 's' : ''} en Parte de Pago{tradeInVehicles.length > 1 ? ` (${tradeInVehicles.length})` : ''}
          </Text>
          <View style={styles.sectionDivider} />
        </View>
        <View style={styles.sectionContent}>
          {tradeInVehicles.map((tv, idx) => (
            <View key={idx} style={idx > 0 ? { marginTop: 8, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: '#d1d5db', borderStyle: 'dashed' } : {}}>
              <View style={styles.grid}>
                <View style={styles.gridCol2}>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Marca</Text>
                    <Text style={styles.dataValue}>{get(`tradeIn_${idx}_brand`, tv.brand || 'No especificado')}</Text>
                  </View>
                </View>
                <View style={styles.gridCol2}>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Modelo</Text>
                    <Text style={styles.dataValue}>{get(`tradeIn_${idx}_model`, tv.model || 'No especificado')}</Text>
                  </View>
                </View>
                {tv.year && (
                  <View style={styles.gridCol2}>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Año</Text>
                      <Text style={styles.dataValue}>{get(`tradeIn_${idx}_year`, tv.year)}</Text>
                    </View>
                  </View>
                )}
                {tv.licensePlate && (
                  <View style={styles.gridCol2}>
                    <View style={styles.dataRow}>
                      <Text style={styles.dataLabel}>Patente</Text>
                      <Text style={styles.dataValue}>{get(`tradeIn_${idx}_plate`, tv.licensePlate)}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.gridCol2}>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Valor</Text>
                    <Text style={styles.dataValue}>{formatCurrency(getNum(`tradeIn_${idx}_value`, tv.value || 0))}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
          {tradeInTotal && tradeInVehicles.length > 1 && (
            <View style={{ marginTop: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#9ca3af' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>Total Parte de Pago</Text>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{formatCurrency(tradeInTotal)}</Text>
              </View>
            </View>
          )}
          {getCustomRows(ov, 'tradeIn').length > 0 && (
            <View style={styles.grid}>
              {renderCustomGridRows(ov, 'tradeIn', styles)}
            </View>
          )}
        </View>
      </View>
      )}
      {hasTradeIn && renderCustomSections(ov, 'tradeIn', styles, sectionStyle)}

      {/* Detalle de la Venta */}
      {_showFinancialDetails && (
      <View style={sectionStyle}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Detalle de la Venta</Text>
          <View style={styles.sectionDivider} />
        </View>
        <View style={styles.sectionContent}>
          <View style={styles.financialTable}>
            {priceAdjustment && priceAdjustment > 0 && originalVehiclePrice ? (
              <>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Precio publicado del vehículo</Text>
                  <Text style={styles.tableValue}>{formatCurrency(getNum('originalVehiclePrice', originalVehiclePrice))}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>- Ajuste de precio</Text>
                  <Text style={styles.tableValue}>-{formatCurrency(getNum('priceAdjustment', priceAdjustment))}</Text>
                </View>
              </>
            ) : (
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Precio del vehículo</Text>
                <Text style={styles.tableValue}>{formatCurrency(getNum('vehiclePrice', vehiclePrice))}</Text>
              </View>
            )}

            {_showTransferValue && transferValue && transferValue > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableLabelHighlight}>
                  + Valor de Transferencia
                </Text>
                <Text style={styles.tableValueHighlight}>
                  {formatCurrency(getNum('transferValue', transferValue))}
                </Text>
              </View>
            )}

            {additionals && additionals.length > 0 && (
              <>
                {additionals.map((additional, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={styles.tableLabel}>+ {additional.title}</Text>
                    <Text style={styles.tableValue}>
                      {formatCurrency(getNum(`additional_${index}`, additional.amount))}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {incomes && incomes.length > 0 && (
              <>
                {incomes.map((income, index) => (
                  <View key={`income-${index}`} style={styles.tableRow}>
                    <Text style={styles.tableLabel}>+ {income.title}</Text>
                    <Text style={styles.tableValue}>
                      {formatCurrency(getNum(`income_${index}`, income.amount))}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {tradeInTotal && tradeInTotal > 0 ? (
              <>
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>SUBTOTAL</Text>
                  <Text style={styles.subtotalValue}>{formatCurrency(getNum('total', total))}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>
                    - {tradeInVehicles && tradeInVehicles.length > 1
                      ? `Vehículos en parte de pago (${tradeInVehicles.length})`
                      : 'Vehículo en parte de pago'}
                  </Text>
                  <Text style={styles.tableValue}>
                    {formatCurrency(tradeInTotal)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(Math.max(0, getNum('total', total) - tradeInTotal))}
                  </Text>
                </View>
                {getNum('total', total) - tradeInTotal < 0 ? (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Saldo a favor del cliente</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(tradeInTotal - getNum('total', total))}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>{formatCurrency(getNum('total', total))}</Text>
              </View>
            )}

            {renderCustomFinancialRows(ov, 'financial', styles)}

            {_showPayments && payments && payments.length > 0 && (() => {
              const pendingTotal = installments.reduce((s, p) => s + p.amount, 0);
              const fmtDue = (d?: string) =>
                d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CL') : '';
              return (
                <>
                  {/* Pagos recibidos */}
                  {paidPayments.length === 1 && installments.length === 0 ? (
                    <View style={[styles.tableRow, { marginTop: 4 }]}>
                      <Text style={styles.tableLabel}>Forma de Pago: {paidPayments[0].title}</Text>
                    </View>
                  ) : paidPayments.length > 0 ? (
                    <>
                      <View style={styles.spacer} />
                      <View style={styles.tableRowNoBorder}>
                        <Text style={[styles.tableLabel, { fontSize: 10, fontFamily: 'Helvetica-Bold' }]}>
                          Pagos Realizados
                        </Text>
                      </View>
                      {paidPayments.map((payment, index) => (
                        <View key={index} style={styles.tableRow}>
                          <Text style={styles.tableLabel}>- {payment.title}</Text>
                          <Text style={styles.tableValue}>{formatCurrency(payment.amount)}</Text>
                        </View>
                      ))}
                      <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>Total Pagado</Text>
                        <Text style={styles.subtotalValue}>{formatCurrency(totalPaid)}</Text>
                      </View>
                      {paidPayments.length > 1 && renderCustomFinancialRows(ov, 'payments', styles)}
                    </>
                  ) : null}

                  {/* Plan de pago: cuotas / letras a plazo (solo si hay) */}
                  {installments.length > 0 && (
                    <>
                      <View style={styles.spacer} />
                      <View style={styles.tableRowNoBorder}>
                        <Text style={[styles.tableLabel, { fontSize: 10, fontFamily: 'Helvetica-Bold' }]}>
                          Plan de Pago (cuotas a plazo)
                        </Text>
                      </View>
                      {installments.map((c, index) => (
                        <View key={index} style={styles.tableRow}>
                          <Text style={styles.tableLabel}>
                            {c.title || `Cuota ${index + 1}`}
                            {c.dueDate ? ` — vence ${fmtDue(c.dueDate)}` : ''}
                          </Text>
                          <Text style={styles.tableValue}>{formatCurrency(c.amount)}</Text>
                        </View>
                      ))}
                      <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>Saldo a pagar</Text>
                        <Text style={styles.subtotalValue}>{formatCurrency(pendingTotal)}</Text>
                      </View>
                      {renderCustomFinancialRows(ov, 'installments', styles)}
                    </>
                  )}
                </>
              );
            })()}
          </View>
        </View>
      </View>
      )}
      {renderCustomSections(ov, 'financial', styles, sectionStyle)}
      {_showPayments && paidPayments.length > 1 && renderCustomSections(ov, 'payments', styles, sectionStyle)}
      {_showPayments && installments.length > 0 && renderCustomSections(ov, 'installments', styles, sectionStyle)}

      {/* Observaciones */}
      {_showNotes && effectiveNotes && (
        <View style={sectionStyle} wrap>
          <View style={styles.sectionHeader} wrap={false}>
            <Text style={styles.sectionTitle}>Observaciones</Text>
            <View style={styles.sectionDivider} />
          </View>
          <View style={styles.sectionContent}>
            <Text style={notesTextStyle}>{effectiveNotes}</Text>
          </View>
        </View>
      )}
      {renderCustomSections(ov, 'notes', styles, sectionStyle)}

      {/* Términos y Condiciones */}
      {_showTerms && effectiveTerms && (
        <View style={sectionStyle} wrap>
          <View style={styles.sectionHeader} wrap={false}>
            <Text style={styles.sectionTitle}>Términos y Condiciones</Text>
            <View style={styles.sectionDivider} />
          </View>
          <View style={styles.sectionContent}>
            <Text style={termsTextStyle}>{effectiveTerms}</Text>
          </View>
        </View>
      )}
      {renderCustomSections(ov, 'terms', styles, sectionStyle)}

      {/* Firmas */}
      {_showSignatures && (
      <View style={signaturesStyle} wrap={false}>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureName}>{companyName}</Text>
          <Text style={styles.signatureRole}>Vendedor</Text>
          <Text style={styles.signatureId}>{companyRut}</Text>
        </View>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureName}>{get('customerName', customerName)}</Text>
          <Text style={styles.signatureRole}>Comprador</Text>
          <Text style={styles.signatureId}>{get('customerRut', customerRut)}</Text>
        </View>
      </View>
      )}
    </Page>
  </Document>
  );
};

export default SaleNotePDF;
