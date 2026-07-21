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
  renderCustomGridRows,
  renderCustomFinancialRows,
  renderCustomSections,
} from './helpers/customContent';

interface QuotationPDFProps {
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
  validUntil?: string;

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
  transferValue?: number;
  additionals?: Array<{ title: string; amount: number }>;
  total: number;

  // Opciones de financiamiento (opcional)
  financing?: {
    downPayment?: number;
    installments?: number;
    monthlyPayment?: number;
    interestRate?: number;
  };

  // Términos y observaciones
  terms?: string;
  notes?: string;

  // Layout config
  layoutConfig?: PDFLayoutConfig;
}

const QuotationPDF: React.FC<QuotationPDFProps> = ({
  companyName,
  companyRut,
  companyAddress,
  companyPhone,
  companyEmail,
  companyLogo,
  documentNumber,
  documentDate,
  validUntil,
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
  transferValue,
  additionals,
  total,
  financing,
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
  const _showTransferValue = lc ? (lc.showTransferValue !== false) : true;
  const _showFinancing = lc ? (lc.showFinancing !== false) : true;

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
            <Text style={styles.companyName}>{get('companyName', companyName)}</Text>
            <Text style={styles.companyDetails}>RUT: {get('companyRut', companyRut)}</Text>
            {companyAddress && (
              <Text style={styles.companyDetails}>{get('companyAddress', companyAddress)}</Text>
            )}
            {companyPhone && (
              <Text style={styles.companyDetails}>Tel: {get('companyPhone', companyPhone)}</Text>
            )}
            {companyEmail && (
              <Text style={styles.companyDetails}>{get('companyEmail', companyEmail)}</Text>
            )}
          </View>
          <View style={styles.documentSection}>
            <Text style={styles.documentType}>COTIZACIÓN</Text>
            <Text style={styles.documentMeta}>N° {get('documentNumber', documentNumber)}</Text>
            <Text style={styles.documentMeta}>Fecha: {get('documentDate', documentDate)}</Text>
            {validUntil && (
              <Text style={styles.documentMeta}>Válida hasta: {get('validUntil', validUntil)}</Text>
            )}
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
                  <Text style={styles.dataValue}>{get('vehicleMileage', vehicleMileage)} km</Text>
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

      {/* Detalle de la Cotización */}
      {_showFinancialDetails && (
      <View style={sectionStyle}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Detalle de la Cotización</Text>
          <View style={styles.sectionDivider} />
        </View>
        <View style={styles.sectionContent}>
          <View style={styles.financialTable}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Precio del vehículo</Text>
              <Text style={styles.tableValue}>{formatCurrency(getNum('vehiclePrice', vehiclePrice))}</Text>
            </View>

            {_showTransferValue && transferValue && transferValue > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableLabelHighlight}>
                  + Valor de Transferencia
                </Text>
                <Text style={styles.tableValueHighlight}>
                  {formatCurrency(getNum('transferValue', transferValue!))}
                </Text>
              </View>
            )}

            {additionals && additionals.length > 0 && (
              <>
                {additionals.map((additional, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={styles.tableLabel}>+ {additional.title}</Text>
                    <Text style={styles.tableValue}>
                      {formatCurrency(additional.amount)}
                    </Text>
                  </View>
                ))}
              </>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(getNum('total', total))}</Text>
            </View>

            {renderCustomFinancialRows(ov, 'financial', styles)}
          </View>
        </View>
      </View>
      )}
      {renderCustomSections(ov, 'financial', styles, sectionStyle)}

      {/* Opciones de Financiamiento */}
      {_showFinancing && financing && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Opciones de Financiamiento</Text>
            <View style={styles.sectionDivider} />
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.grid}>
              {financing.downPayment && (
                <View style={styles.gridCol2}>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Pie Inicial</Text>
                    <Text style={styles.dataValue}>{formatCurrency(getNum('financingDownPayment', financing.downPayment!))}</Text>
                  </View>
                </View>
              )}
              {financing.installments && (
                <View style={styles.gridCol2}>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Número de Cuotas</Text>
                    <Text style={styles.dataValue}>{get('financingInstallments', financing.installments)}</Text>
                  </View>
                </View>
              )}
              {financing.monthlyPayment && (
                <View style={styles.gridCol2}>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Cuota Mensual</Text>
                    <Text style={styles.dataValue}>{formatCurrency(getNum('financingMonthlyPayment', financing.monthlyPayment!))}</Text>
                  </View>
                </View>
              )}
              {financing.interestRate && (
                <View style={styles.gridCol2}>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Tasa de Interés</Text>
                    <Text style={styles.dataValue}>{get('financingInterestRate', financing.interestRate)}%</Text>
                  </View>
                </View>
              )}
              {renderCustomGridRows(ov, 'financing', styles)}
            </View>
          </View>
        </View>
      )}
      {_showFinancing && financing && renderCustomSections(ov, 'financing', styles, sectionStyle)}

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

      {/* Firma */}
      {_showSignatures && (
      <View style={signaturesStyle} wrap={false}>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureName}>{get('companyName', companyName)}</Text>
          <Text style={styles.signatureRole}>Vendedor</Text>
          <Text style={styles.signatureId}>{get('companyRut', companyRut)}</Text>
        </View>
        <View style={styles.signatureBox}>
          {/* Espacio para firma del cliente */}
        </View>
      </View>
      )}
    </Page>
  </Document>
  );
};

export default QuotationPDF;
