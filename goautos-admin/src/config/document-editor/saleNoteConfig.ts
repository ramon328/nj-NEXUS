import { DocumentEditorSchema, DocumentSection, FinancialRow } from '@/types/document-editor';
import { PDFLayoutConfig } from '@/types/document-template';
import { buildHeaderSection, buildPersonSection, buildVehicleSection, buildNotesSection, buildTermsSection, buildSignaturesSection } from './sharedSections';

export function buildSaleNoteSchema(data: any, lc: PDFLayoutConfig): DocumentEditorSchema {
  const sections: DocumentSection[] = [];

  // Header
  sections.push(buildHeaderSection({
    companyName: data.companyName,
    companyRut: data.companyRut,
    companyAddress: data.companyAddress,
    companyPhone: data.companyPhone,
    companyEmail: data.companyEmail,
    companyLogo: data.companyLogo,
    documentTitle: 'NOTA DE VENTA',
    documentNumber: data.documentNumber,
    documentDate: data.documentDate,
  }));

  // Customer
  sections.push(buildPersonSection('customer', 'Datos del Cliente', 'customer', {
    name: data.customerName,
    rut: data.customerRut,
    phone: data.customerPhone,
    email: data.customerEmail,
    address: data.customerAddress,
  }, lc));

  // Vehicle
  sections.push(buildVehicleSection(data, lc));

  // Trade-in vehicles
  if (data.tradeInVehicles && data.tradeInVehicles.length > 0) {
    const tradeInFields = data.tradeInVehicles.flatMap((tv: any, idx: number) => {
      const fields = [
        { key: `tradeIn_${idx}_brand`, label: 'Marca', value: tv.brand || 'No especificado' },
        { key: `tradeIn_${idx}_model`, label: 'Modelo', value: tv.model || 'No especificado' },
      ];
      if (tv.year) fields.push({ key: `tradeIn_${idx}_year`, label: 'Año', value: tv.year });
      if (tv.licensePlate) fields.push({ key: `tradeIn_${idx}_plate`, label: 'Patente', value: tv.licensePlate });
      fields.push({ key: `tradeIn_${idx}_value`, label: 'Valor', value: tv.value, type: 'currency' as const });
      return fields;
    });

    sections.push({
      id: 'tradeIn',
      title: `Vehículo${data.tradeInVehicles.length > 1 ? 's' : ''} en Parte de Pago`,
      type: 'grid',
      visible: true,
      fields: tradeInFields,
    });
  }

  // Financial
  const financialRows: FinancialRow[] = [
    { key: 'vehiclePrice', label: 'Precio del vehículo', value: data.vehiclePrice, style: 'normal' },
  ];

  if (lc.showTransferValue !== false && data.transferValue && data.transferValue > 0) {
    financialRows.push({ key: 'transferValue', label: '+ Valor de Transferencia', value: data.transferValue, style: 'highlight' });
  }

  if (data.additionals) {
    data.additionals.forEach((a: any, i: number) => {
      financialRows.push({ key: `additional_${i}`, label: `+ ${a.title}`, value: a.amount, style: 'normal' });
    });
  }

  if (data.tradeInTotal != null && data.tradeInTotal > 0) {
    financialRows.push({ key: 'subtotal', label: 'SUBTOTAL', value: data.total, style: 'subtotal' });
    financialRows.push({
      key: 'tradeInDeduction',
      label: `- ${data.tradeInVehicles?.length > 1 ? `Vehículos en parte de pago (${data.tradeInVehicles.length})` : 'Vehículo en parte de pago'}`,
      value: data.tradeInTotal,
      style: 'deduction',
    });
    const totalNeto = data.total - data.tradeInTotal;
    if (totalNeto < 0) {
      // La parte de pago supera el total → el cliente queda con saldo a favor.
      financialRows.push({ key: 'total', label: 'TOTAL', value: 0, style: 'total' });
      financialRows.push({
        key: 'customerCredit',
        label: 'Saldo a favor del cliente',
        value: -totalNeto,
        style: 'total',
      });
    } else {
      financialRows.push({ key: 'total', label: 'TOTAL', value: totalNeto, style: 'total' });
    }
  } else {
    financialRows.push({ key: 'total', label: 'TOTAL', value: data.total, style: 'total' });
  }

  // Separar pagos RECIBIDOS de cuotas/letras a PLAZO (pendientes).
  const paidPayments = (data.payments || []).filter((p: any) => p.paid !== false);
  const installments = (data.payments || []).filter((p: any) => p.paid === false);
  const paymentInfo =
    paidPayments.length === 1 && installments.length === 0
      ? paidPayments[0].title
      : undefined;

  sections.push({
    id: 'financial',
    title: 'Detalle de la Venta',
    type: 'financial',
    visible: lc.showFinancialDetails !== false,
    visibilityKey: 'showFinancialDetails',
    rows: financialRows,
    paymentInfo,
  });

  // Pagos recibidos (más de 1)
  if (lc.showPayments !== false && paidPayments.length > 1) {
    const paymentRows: FinancialRow[] = paidPayments.map((p: any, i: number) => ({
      key: `payment_${i}`,
      label: `- ${p.title}`,
      value: p.amount,
      style: 'normal' as const,
    }));
    paymentRows.push({ key: 'totalPaid', label: 'Total Pagado', value: data.totalPaid, style: 'subtotal' });

    sections.push({
      id: 'payments',
      title: 'Pagos Realizados',
      type: 'financial',
      visible: true,
      visibilityKey: 'showPayments',
      rows: paymentRows,
    });
  }

  // Plan de pago: cuotas / letras a plazo (solo si hay)
  if (lc.showPayments !== false && installments.length > 0) {
    const fmtDue = (d?: string) =>
      d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CL') : '';
    const cuotaRows: FinancialRow[] = installments.map((p: any, i: number) => ({
      key: `cuota_${i}`,
      label: `${p.title || `Cuota ${i + 1}`}${p.dueDate ? ` — vence ${fmtDue(p.dueDate)}` : ''}`,
      value: p.amount,
      style: 'normal' as const,
    }));
    const pendingTotal = installments.reduce((s: number, p: any) => s + p.amount, 0);
    cuotaRows.push({ key: 'pendingTotal', label: 'Saldo a pagar', value: pendingTotal, style: 'subtotal' });

    sections.push({
      id: 'installments',
      title: 'Plan de Pago (cuotas a plazo)',
      type: 'financial',
      visible: true,
      visibilityKey: 'showPayments',
      rows: cuotaRows,
    });
  }

  // Notes & Terms
  sections.push(buildNotesSection(data.notes, lc));
  sections.push(buildTermsSection(data.terms, lc));

  // Signatures
  sections.push(buildSignaturesSection([
    { name: data.companyName, role: 'Vendedor', id: data.companyRut },
    { name: data.customerName, nameKey: 'customerName', role: 'Comprador', id: data.customerRut, idKey: 'customerRut' },
  ], lc));

  return { documentType: 'sale', sections };
}
