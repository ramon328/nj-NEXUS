import { DocumentEditorSchema, DocumentSection, FinancialRow, GridField } from '@/types/document-editor';
import { PDFLayoutConfig } from '@/types/document-template';
import { getPaymentMethodLabel } from '@/utils/paymentMethods';
import { buildHeaderSection, buildPersonSection, buildVehicleSection, buildNotesSection, buildTermsSection, buildSignaturesSection } from './sharedSections';

export function buildPurchaseNoteSchema(data: any, lc: PDFLayoutConfig): DocumentEditorSchema {
  const sections: DocumentSection[] = [];

  sections.push(buildHeaderSection({
    companyName: data.companyName, companyRut: data.companyRut, companyAddress: data.companyAddress,
    companyPhone: data.companyPhone, companyEmail: data.companyEmail, companyLogo: data.companyLogo,
    documentTitle: 'NOTA DE COMPRA',
    documentNumber: data.documentNumber, documentDate: data.documentDate,
  }));

  sections.push(buildPersonSection('seller', 'Datos del Vendedor', 'seller', {
    name: data.sellerName, rut: data.sellerRut, phone: data.sellerPhone,
    email: data.sellerEmail, address: data.sellerAddress,
  }, lc));

  // Vehicle with extra field
  const vehicleSection = buildVehicleSection(data, lc);
  if (data.vehicleOwnerNumber) {
    vehicleSection.fields?.push({ key: 'vehicleOwnerNumber', label: 'N° Propietario', value: data.vehicleOwnerNumber });
  }
  sections.push(vehicleSection);

  // Financial
  const rows: FinancialRow[] = [
    { key: 'purchasePrice', label: 'Precio de compra', value: data.purchasePrice, style: 'normal' },
  ];
  if (data.discounts && data.discounts > 0) {
    rows.push({ key: 'discounts', label: '- Descuentos', value: data.discounts, style: 'deduction' });
  }
  if (data.additionals) {
    data.additionals.forEach((a: any, i: number) => {
      rows.push({ key: `additional_${i}`, label: `+ ${a.title}`, value: a.amount, style: 'normal' });
    });
  }
  rows.push({ key: 'total', label: 'TOTAL', value: data.total, style: 'total' });

  sections.push({
    id: 'financial', title: 'Detalle de la Compra', type: 'financial',
    visible: lc.showFinancialDetails !== false, visibilityKey: 'showFinancialDetails',
    rows, paymentInfo: getPaymentMethodLabel(data.paymentMethod),
  });

  sections.push(buildNotesSection(data.notes, lc));
  sections.push(buildTermsSection(data.terms, lc));
  sections.push(buildSignaturesSection([
    { name: data.companyName, role: 'Comprador', id: data.companyRut },
    { name: data.sellerName, nameKey: 'sellerName', role: 'Vendedor', id: data.sellerRut, idKey: 'sellerRut' },
  ], lc));

  return { documentType: 'purchase', sections };
}
