import { DocumentSection, GridField, SignatureSlot } from '@/types/document-editor';
import { PDFLayoutConfig } from '@/types/document-template';

interface HeaderData {
  companyName: string;
  companyRut: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
  documentTitle: string;
  documentNumber: string;
  documentDate: string;
  headerExtra?: GridField[];
}

export function buildHeaderSection(data: HeaderData): DocumentSection {
  return {
    id: 'header',
    title: '',
    type: 'header',
    visible: true,
    companyName: data.companyName,
    companyRut: data.companyRut,
    companyAddress: data.companyAddress,
    companyPhone: data.companyPhone,
    companyEmail: data.companyEmail,
    companyLogo: data.companyLogo,
    documentTitle: data.documentTitle,
    documentNumber: data.documentNumber,
    documentDate: data.documentDate,
    headerExtra: data.headerExtra,
  };
}

interface PersonData {
  name: string;
  rut?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export function buildPersonSection(
  id: string,
  title: string,
  prefix: string,
  data: PersonData,
  lc: PDFLayoutConfig,
): DocumentSection {
  const fields: GridField[] = [
    { key: `${prefix}Name`, label: 'Nombre', value: data.name },
  ];
  if (data.rut) fields.push({ key: `${prefix}Rut`, label: 'RUT', value: data.rut });
  if (data.phone) fields.push({ key: `${prefix}Phone`, label: 'Teléfono', value: data.phone });
  if (data.email) fields.push({ key: `${prefix}Email`, label: 'Email', value: data.email });
  if (data.address) fields.push({ key: `${prefix}Address`, label: 'Dirección', value: data.address, fullWidth: true });

  return {
    id,
    title,
    type: 'grid',
    visible: lc.showClientData !== false,
    visibilityKey: 'showClientData',
    fields,
  };
}

interface VehicleData {
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehiclePlate?: string;
  vehicleMileage?: number;
  vehicleEngineNumber?: string;
  vehicleChassisNumber?: string;
}

export function buildVehicleSection(data: VehicleData, lc: PDFLayoutConfig): DocumentSection {
  const fields: GridField[] = [
    { key: 'vehicleBrand', label: 'Marca', value: data.vehicleBrand },
    { key: 'vehicleModel', label: 'Modelo', value: data.vehicleModel },
  ];
  if (data.vehicleYear) fields.push({ key: 'vehicleYear', label: 'Año', value: data.vehicleYear });
  if (data.vehicleColor) fields.push({ key: 'vehicleColor', label: 'Color', value: data.vehicleColor });
  if (data.vehiclePlate) fields.push({ key: 'vehiclePlate', label: 'Patente', value: data.vehiclePlate });
  if (data.vehicleMileage) fields.push({ key: 'vehicleMileage', label: 'Kilometraje', value: `${data.vehicleMileage} km` });
  if (data.vehicleEngineNumber) fields.push({ key: 'vehicleEngineNumber', label: 'N° Motor', value: data.vehicleEngineNumber });
  if (data.vehicleChassisNumber) fields.push({ key: 'vehicleChassisNumber', label: 'N° Chasis', value: data.vehicleChassisNumber });

  return {
    id: 'vehicle',
    title: 'Detalles del Vehículo',
    type: 'grid',
    visible: lc.showVehicleDetails !== false,
    visibilityKey: 'showVehicleDetails',
    fields,
  };
}

export function buildNotesSection(notes: string | undefined, lc: PDFLayoutConfig): DocumentSection {
  return {
    id: 'notes',
    title: 'Observaciones',
    type: 'text',
    visible: lc.showNotes !== false && !!(lc.notesOverride ?? notes),
    textValue: notes || '',
    textKey: '_notesOverride',
    textFontSize: lc.notesFontSize ?? 8,
    allowCustomRows: false,
  };
}

export function buildTermsSection(terms: string | undefined, lc: PDFLayoutConfig): DocumentSection {
  return {
    id: 'terms',
    title: 'Términos y Condiciones',
    type: 'text',
    visible: lc.showTerms !== false && !!(lc.termsOverride ?? terms),
    textValue: terms || '',
    textKey: '_termsOverride',
    textFontSize: lc.termsFontSize ?? 7.5,
    allowCustomRows: false,
  };
}

export function buildSignaturesSection(
  signatures: SignatureSlot[],
  lc: PDFLayoutConfig,
): DocumentSection {
  return {
    id: 'signatures',
    title: 'Firmas',
    type: 'signatures',
    visible: lc.showSignatures !== false,
    visibilityKey: 'showSignatures',
    signatures,
    allowCustomRows: false,
  };
}
