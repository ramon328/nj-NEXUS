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
import { getPaymentMethodLabel } from '@/utils/paymentMethods';
import {
  renderCustomGridRows,
  renderCustomFinancialRows,
  renderCustomSections,
} from './helpers/customContent';

interface CloseBusinessDealPDFProps {
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

  // Datos financieros del cierre de negocio
  finalSalePrice: number;
  transferValue?: number;
  dealershipCommission: number;
  paymentMethod?: string;
  additionals?: Array<{ title: string; amount: number }>;

  // Términos y observaciones
  terms?: string;
  notes?: string;

  // Layout config
  layoutConfig?: PDFLayoutConfig;
}

const CloseBusinessDealPDF: React.FC<CloseBusinessDealPDFProps> = ({
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
  finalSalePrice,
  transferValue,
  dealershipCommission,
  paymentMethod,
  additionals,
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
  const _showCommission = lc ? (lc.showCommission !== false) : true;

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
            <Text style={styles.documentType}>CIERRE DE NEGOCIO</Text>
            <Text style={styles.documentMeta}>N° {get('documentNumber', documentNumber)}</Text>
            <Text style={styles.documentMeta}>Fecha: {get('documentDate', documentDate)}</Text>
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
            {renderCustomGridRows(ov, 'vehicle', styles)}
          </View>
        </View>
      </View>
      )}
      {renderCustomSections(ov, 'vehicle', styles, sectionStyle)}

      {/* Detalle Financiero del Cierre */}
      {_showFinancialDetails && (
      <View style={sectionStyle}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Detalle del Cierre de Negocio</Text>
          <View style={styles.sectionDivider} />
        </View>
        <View style={styles.sectionContent}>
          <View style={styles.financialTable}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Precio de Venta</Text>
              <Text style={styles.tableValue}>{formatCurrency(getNum('finalSalePrice', finalSalePrice))}</Text>
            </View>

            {(transferValue != null && transferValue > 0) && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Valor de Transferencia</Text>
              <Text style={styles.tableValue}>{formatCurrency(getNum('transferValue', transferValue))}</Text>
            </View>
            )}

            {(transferValue != null && transferValue > 0) && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Precio Final (incluida transferencia)</Text>
              <Text style={styles.tableValue}>{formatCurrency(getNum('finalSalePrice', finalSalePrice) + getNum('transferValue', transferValue))}</Text>
            </View>
            )}

            {_showCommission && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabelHighlight}>
                - Comisión Automotora
              </Text>
              <Text style={styles.tableValueHighlight}>
                {formatCurrency(getNum('dealershipCommission', dealershipCommission))}
              </Text>
            </View>
            )}

            {additionals && additionals.length > 0 && (
              <>
                {additionals.map((additional, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={styles.tableLabelHighlight}>- {additional.title}</Text>
                    <Text style={styles.tableValueHighlight}>
                      {formatCurrency(additional.amount)}
                    </Text>
                  </View>
                ))}
              </>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total a Pagar al Propietario</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(
                  _showCommission
                    ? getNum('finalSalePrice', finalSalePrice) - getNum('dealershipCommission', dealershipCommission) - (additionals || []).reduce((sum, a) => sum + a.amount, 0)
                    : getNum('finalSalePrice', finalSalePrice)
                )}
              </Text>
            </View>

            {renderCustomFinancialRows(ov, 'financial', styles)}

            {paymentMethod && (
              <View style={styles.tableRow}>
                <Text style={styles.dataLabel}>Método de Pago</Text>
                <Text style={styles.dataValue}>{get('paymentMethod', getPaymentMethodLabel(paymentMethod))}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      )}
      {renderCustomSections(ov, 'financial', styles, sectionStyle)}

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
          <Text style={styles.signatureName}>{get('companyName', companyName)}</Text>
          <Text style={styles.signatureRole}>Automotora</Text>
          <Text style={styles.signatureId}>{get('companyRut', companyRut)}</Text>
        </View>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureName}>{get('customerName', customerName)}</Text>
          <Text style={styles.signatureRole}>Propietario</Text>
          {customerRut && (
            <Text style={styles.signatureId}>{get('customerRut', customerRut)}</Text>
          )}
        </View>
      </View>
      )}
    </Page>
  </Document>
  );
};

export default CloseBusinessDealPDF;
