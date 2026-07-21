import { DocumentEditorSchema, DocumentSection } from '@/types/document-editor';
import { PDFLayoutConfig } from '@/types/document-template';
import { buildHeaderSection, buildPersonSection, buildVehicleSection, buildNotesSection, buildTermsSection, buildSignaturesSection } from './sharedSections';

export function buildConsignmentNoteSchema(data: any, lc: PDFLayoutConfig): DocumentEditorSchema {
  const sections: DocumentSection[] = [];

  sections.push(buildHeaderSection({
    companyName: data.companyName, companyRut: data.companyRut, companyAddress: data.companyAddress,
    companyPhone: data.companyPhone, companyEmail: data.companyEmail, companyLogo: data.companyLogo,
    documentTitle: 'CONTRATO DE CONSIGNACIÓN',
    documentNumber: data.documentNumber, documentDate: data.documentDate,
  }));

  sections.push(buildPersonSection('owner', 'Datos del Consignante', 'owner', {
    name: data.ownerName, rut: data.ownerRut, phone: data.ownerPhone,
    email: data.ownerEmail, address: data.ownerAddress,
  }, lc));

  sections.push(buildVehicleSection(data, lc));

  // Consignment details
  const consignmentFields = [];
  if (data.suggestedPrice) consignmentFields.push({ key: 'suggestedPrice', label: 'Precio sugerido', value: data.suggestedPrice, type: 'currency' as const });
  if (data.minimumPrice) consignmentFields.push({ key: 'minimumPrice', label: 'Precio mínimo', value: data.minimumPrice, type: 'currency' as const });
  if (data.commissionRate) consignmentFields.push({ key: 'commissionRate', label: 'Comisión (%)', value: `${data.commissionRate}%` });
  if (data.commissionAmount) consignmentFields.push({ key: 'commissionAmount', label: 'Monto comisión', value: data.commissionAmount, type: 'currency' as const });
  if (data.startDate) consignmentFields.push({ key: 'startDate', label: 'Fecha inicio', value: data.startDate });
  if (data.endDate) consignmentFields.push({ key: 'endDate', label: 'Fecha término', value: data.endDate });
  if (data.duration) consignmentFields.push({ key: 'duration', label: 'Duración', value: data.duration });

  if (consignmentFields.length > 0) {
    sections.push({
      id: 'consignment', title: 'Términos de Consignación', type: 'grid',
      visible: lc.showFinancialDetails !== false, visibilityKey: 'showFinancialDetails',
      fields: consignmentFields,
    });
  }

  sections.push(buildNotesSection(data.notes, lc));
  sections.push(buildTermsSection(data.terms, lc));
  sections.push(buildSignaturesSection([
    { name: data.companyName, role: 'Consignatario', id: data.companyRut },
    { name: data.ownerName, nameKey: 'ownerName', role: 'Consignante', id: data.ownerRut, idKey: 'ownerRut' },
  ], lc));

  return { documentType: 'consignment', sections };
}
