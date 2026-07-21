import { DocumentEditorSchema, DocumentSection, FinancialRow } from '@/types/document-editor';
import { PDFLayoutConfig } from '@/types/document-template';
import { buildHeaderSection, buildPersonSection, buildVehicleSection, buildNotesSection, buildTermsSection, buildSignaturesSection } from './sharedSections';

export function buildQuotationSchema(data: any, lc: PDFLayoutConfig): DocumentEditorSchema {
  const sections: DocumentSection[] = [];

  sections.push(buildHeaderSection({
    companyName: data.companyName, companyRut: data.companyRut, companyAddress: data.companyAddress,
    companyPhone: data.companyPhone, companyEmail: data.companyEmail, companyLogo: data.companyLogo,
    documentTitle: 'COTIZACIÓN',
    documentNumber: data.documentNumber, documentDate: data.documentDate,
    headerExtra: data.validUntil ? [{ key: 'validUntil', label: 'Válida hasta', value: data.validUntil }] : undefined,
  }));

  sections.push(buildPersonSection('customer', 'Datos del Cliente', 'customer', {
    name: data.customerName, rut: data.customerRut, phone: data.customerPhone,
    email: data.customerEmail, address: data.customerAddress,
  }, lc));

  sections.push(buildVehicleSection(data, lc));

  // Financial
  const rows: FinancialRow[] = [
    { key: 'vehiclePrice', label: 'Precio del vehículo', value: data.vehiclePrice, style: 'normal' },
  ];
  if (lc.showTransferValue !== false && data.transferValue && data.transferValue > 0) {
    rows.push({ key: 'transferValue', label: '+ Valor de Transferencia', value: data.transferValue, style: 'highlight' });
  }
  if (data.additionals) {
    data.additionals.forEach((a: any, i: number) => {
      rows.push({ key: `additional_${i}`, label: `+ ${a.title}`, value: a.amount, style: 'normal' });
    });
  }
  rows.push({ key: 'total', label: 'TOTAL', value: data.total, style: 'total' });

  sections.push({
    id: 'financial', title: 'Detalle de la Cotización', type: 'financial',
    visible: lc.showFinancialDetails !== false, visibilityKey: 'showFinancialDetails', rows,
  });

  // Financing
  if (lc.showFinancing !== false && data.financing) {
    const f = data.financing;
    const finFields = [];
    if (f.downPayment) finFields.push({ key: 'financing_downPayment', label: 'Pie', value: f.downPayment, type: 'currency' as const });
    if (f.installments) finFields.push({ key: 'financing_installments', label: 'Cuotas', value: f.installments });
    if (f.monthlyPayment) finFields.push({ key: 'financing_monthlyPayment', label: 'Cuota mensual', value: f.monthlyPayment, type: 'currency' as const });
    if (f.interestRate) finFields.push({ key: 'financing_interestRate', label: 'Tasa de interés', value: `${f.interestRate}%` });

    if (finFields.length > 0) {
      sections.push({
        id: 'financing', title: 'Opciones de Financiamiento', type: 'grid',
        visible: true, visibilityKey: 'showFinancing', fields: finFields,
      });
    }
  }

  sections.push(buildNotesSection(data.notes, lc));
  sections.push(buildTermsSection(data.terms, lc));
  sections.push(buildSignaturesSection([
    { name: data.companyName, role: 'Vendedor', id: data.companyRut },
    { name: data.customerName, nameKey: 'customerName', role: 'Cliente', id: data.customerRut, idKey: 'customerRut' },
  ], lc));

  return { documentType: 'quotation', sections };
}
