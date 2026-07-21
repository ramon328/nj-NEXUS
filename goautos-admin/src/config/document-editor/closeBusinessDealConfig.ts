import { DocumentEditorSchema, DocumentSection, FinancialRow } from '@/types/document-editor';
import { PDFLayoutConfig } from '@/types/document-template';
import { getPaymentMethodLabel } from '@/utils/paymentMethods';
import { buildHeaderSection, buildPersonSection, buildVehicleSection, buildNotesSection, buildTermsSection, buildSignaturesSection } from './sharedSections';

export function buildCloseBusinessDealSchema(data: any, lc: PDFLayoutConfig): DocumentEditorSchema {
  const sections: DocumentSection[] = [];

  sections.push(buildHeaderSection({
    companyName: data.companyName, companyRut: data.companyRut, companyAddress: data.companyAddress,
    companyPhone: data.companyPhone, companyEmail: data.companyEmail, companyLogo: data.companyLogo,
    documentTitle: 'CIERRE DE NEGOCIO',
    documentNumber: data.documentNumber, documentDate: data.documentDate,
  }));

  sections.push(buildPersonSection('customer', 'Datos del Cliente', 'customer', {
    name: data.customerName, rut: data.customerRut, phone: data.customerPhone,
    email: data.customerEmail, address: data.customerAddress,
  }, lc));

  sections.push(buildVehicleSection(data, lc));

  // Financial
  const rows: FinancialRow[] = [
    { key: 'finalSalePrice', label: 'Precio final de venta', value: data.finalSalePrice, style: 'normal' },
  ];
  if (lc.showTransferValue !== false && data.transferValue && data.transferValue > 0) {
    rows.push({ key: 'transferValue', label: '+ Valor de Transferencia', value: data.transferValue, style: 'highlight' });
  }
  if (data.additionals) {
    data.additionals.forEach((a: any, i: number) => {
      rows.push({ key: `additional_${i}`, label: `+ ${a.title}`, value: a.amount, style: 'normal' });
    });
  }
  if (lc.showCommission !== false && data.dealershipCommission) {
    rows.push({ key: 'dealershipCommission', label: 'Comisión automotora', value: data.dealershipCommission, style: 'highlight' });
  }
  rows.push({ key: 'total', label: 'TOTAL', value: data.finalSalePrice + (data.transferValue || 0), style: 'total' });

  sections.push({
    id: 'financial', title: 'Detalle del Cierre', type: 'financial',
    visible: lc.showFinancialDetails !== false, visibilityKey: 'showFinancialDetails',
    rows, paymentInfo: getPaymentMethodLabel(data.paymentMethod),
  });

  sections.push(buildNotesSection(data.notes, lc));
  sections.push(buildTermsSection(data.terms, lc));
  sections.push(buildSignaturesSection([
    { name: data.companyName, role: 'Automotora', id: data.companyRut },
    { name: data.customerName, nameKey: 'customerName', role: 'Comprador', id: data.customerRut, idKey: 'customerRut' },
  ], lc));

  return { documentType: 'close_deal', sections };
}
