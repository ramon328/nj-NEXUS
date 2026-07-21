import { DocumentEditorSchema, DocumentSection, FinancialRow } from '@/types/document-editor';
import { PDFLayoutConfig } from '@/types/document-template';
import { buildHeaderSection, buildPersonSection, buildVehicleSection, buildNotesSection, buildTermsSection, buildSignaturesSection } from './sharedSections';

export function buildReservationNoteSchema(data: any, lc: PDFLayoutConfig): DocumentEditorSchema {
  const sections: DocumentSection[] = [];

  const headerExtra = [];
  if (data.expirationDate) headerExtra.push({ key: 'expirationDate', label: 'Vence', value: data.expirationDate });
  if (data.reservationDays) headerExtra.push({ key: 'reservationDays', label: 'Días de reserva', value: `${data.reservationDays} días` });

  sections.push(buildHeaderSection({
    companyName: data.companyName, companyRut: data.companyRut, companyAddress: data.companyAddress,
    companyPhone: data.companyPhone, companyEmail: data.companyEmail, companyLogo: data.companyLogo,
    documentTitle: 'NOTA DE RESERVA',
    documentNumber: data.documentNumber, documentDate: data.documentDate,
    headerExtra: headerExtra.length > 0 ? headerExtra : undefined,
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
  rows.push({ key: 'reservationAmount', label: 'Monto de reserva', value: data.reservationAmount, style: 'highlight' });
  rows.push({ key: 'remainingAmount', label: 'Saldo pendiente', value: data.remainingAmount, style: 'subtotal' });

  sections.push({
    id: 'financial', title: 'Detalle de la Reserva', type: 'financial',
    visible: lc.showFinancialDetails !== false, visibilityKey: 'showFinancialDetails', rows,
  });

  sections.push(buildNotesSection(data.notes, lc));
  sections.push(buildTermsSection(data.terms, lc));
  sections.push(buildSignaturesSection([
    { name: data.companyName, role: 'Vendedor', id: data.companyRut },
    { name: data.customerName, nameKey: 'customerName', role: 'Cliente', id: data.customerRut, idKey: 'customerRut' },
  ], lc));

  return { documentType: 'reservation', sections };
}
