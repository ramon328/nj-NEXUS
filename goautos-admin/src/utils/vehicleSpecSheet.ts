import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/integrations/supabase/client';
import { prepareImageForPDF } from '@/utils/imageUtils';
import VehicleSpecSheetPDF, {
  VehicleSpecSheetData,
  type SpecSheetTemplate,
} from '@/components/documents/pdf/VehicleSpecSheetPDF';

const FALLBACK_BRAND_COLOR = '#1e3a5f';

const lsKey = (clientId?: number | null) => `gaut:specSheetTemplate:${clientId ?? 'anon'}`;

// Parsea el layout_config guardado → plantilla completa (tolerante: campos faltantes
// quedan undefined). specFields es el objeto de toggles; el resto es lo custom.
const parseTemplate = (layout: any): SpecSheetTemplate => {
  if (!layout || typeof layout !== 'object') return { fields: {} };
  return {
    fields:
      layout.specFields && typeof layout.specFields === 'object' ? layout.specFields : {},
    customNote: typeof layout.customNote === 'string' ? layout.customNote : undefined,
    headerTitle: typeof layout.headerTitle === 'string' ? layout.headerTitle : undefined,
    contact: layout.contact && typeof layout.contact === 'object' ? layout.contact : undefined,
    labels: layout.labels && typeof layout.labels === 'object' ? layout.labels : undefined,
  };
};

/**
 * Carga la "plantilla" de ficha técnica del cliente (campos + texto/título/contacto/
 * etiquetas custom). Intenta document_templates (compartida entre usuarios de la
 * automotora); si falla por permisos/constraint, cae a localStorage. Nunca tira.
 */
export const loadSpecSheetTemplate = async (
  clientId?: number | null
): Promise<SpecSheetTemplate> => {
  if (!clientId) return { fields: {} };
  try {
    const { data } = await supabase
      .from('document_templates')
      .select('layout_config')
      .eq('client_id', clientId)
      .eq('template_type', 'spec_sheet')
      .maybeSingle();
    if ((data as any)?.layout_config) return parseTemplate((data as any).layout_config);
  } catch {
    // ignora — probamos localStorage abajo
  }
  try {
    const raw = localStorage.getItem(lsKey(clientId));
    if (raw) {
      const parsed = JSON.parse(raw);
      // Formato nuevo: { fields, customNote, ... }. Viejo: solo el objeto de toggles.
      if (parsed && typeof parsed === 'object' && 'fields' in parsed) {
        return parseTemplate({
          specFields: parsed.fields,
          customNote: parsed.customNote,
          headerTitle: parsed.headerTitle,
          contact: parsed.contact,
          labels: parsed.labels,
        });
      }
      return { fields: parsed || {} };
    }
  } catch {
    /* noop */
  }
  return { fields: {} };
};

/**
 * Guarda la plantilla del cliente. Intenta persistir en document_templates (compartida);
 * si no se puede (permisos/constraint), guarda en localStorage para que igual se recuerde.
 */
export const saveSpecSheetTemplate = async (
  clientId: number,
  template: SpecSheetTemplate
): Promise<void> => {
  const layout = {
    specFields: template.fields || {},
    customNote: template.customNote,
    headerTitle: template.headerTitle,
    contact: template.contact,
    labels: template.labels,
  };
  // Siempre dejamos copia local (respuesta inmediata aunque la BD falle).
  try {
    localStorage.setItem(lsKey(clientId), JSON.stringify(template));
  } catch {
    /* noop */
  }
  try {
    await supabase
      .from('document_templates')
      .upsert(
        { client_id: clientId, template_type: 'spec_sheet', layout_config: layout },
        { onConflict: 'client_id,template_type' }
      );
  } catch {
    // La copia en localStorage ya quedó; no rompemos el flujo.
  }
};

const sanitizeHex = (value?: string | null): string | null => {
  if (!value || typeof value !== 'string') return null;
  const hex = value.trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex}` : null;
};

const stripProtocol = (url?: string | null): string | undefined =>
  url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined;

/**
 * Genera y descarga la ficha técnica del vehículo, estilo ChileAutos pero SIN precios:
 * banner de la automotora, foto, Marca/Modelo/Versión + Año/KM y "Detalles destacados".
 */
// Arma el PDF de la ficha y devuelve el blob + nombre de archivo (SIN descargar).
// Lo usan el viewer (preview) y la descarga.
export const buildVehicleSpecSheetBlob = async (
  vehicleId: number,
  clientId?: number | null,
  templateOverride?: SpecSheetTemplate
): Promise<{ blob: Blob; fileName: string }> => {
  // Si no se pasa una plantilla puntual, usamos la guardada del cliente.
  const tpl = templateOverride ?? (await loadSpecSheetTemplate(clientId));
  const fields = tpl.fields;

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select(
      `*, brand:brand_id(name), model:model_id(name), color:color_id(name),
       condition:condition_id(name), fuel_type:fuel_type_id(name), category:category_id(name)`
    )
    .eq('id', vehicleId)
    .single();

  if (error || !vehicle) {
    throw error || new Error('Vehículo no encontrado');
  }

  const v = vehicle as any;

  // Branding de la automotora
  let companyName = 'Automotora';
  let companyLogoRaw: string | undefined;
  let brandColor = FALLBACK_BRAND_COLOR;
  let companyPhone: string | undefined;
  let companyEmail: string | undefined;
  let companyWebsite: string | undefined;
  let companyAddress: string | undefined;

  if (clientId) {
    const { data: client } = await supabase
      .from('clients')
      .select('name, logo, theme, contact, domain')
      .eq('id', clientId)
      .maybeSingle();

    if (client) {
      const c = client as any;
      if (c.name) companyName = c.name;
      companyLogoRaw = c.logo || undefined;
      brandColor = sanitizeHex(c.theme?.light?.primary) || FALLBACK_BRAND_COLOR;
      companyPhone = c.contact?.phone || undefined;
      companyEmail = c.contact?.email || undefined;
      companyWebsite = stripProtocol(c.domain);
      companyAddress = c.contact?.address || undefined;
    }
  }

  // Override de contacto desde la plantilla (si el cliente lo customizó). Lo que esté
  // vacío en la plantilla cae al dato real del cliente.
  companyPhone = tpl.contact?.phone || companyPhone;
  companyWebsite = tpl.contact?.website || companyWebsite;
  companyAddress = tpl.contact?.address || companyAddress;

  const [companyLogo, mainImage] = await Promise.all([
    prepareImageForPDF(companyLogoRaw),
    prepareImageForPDF(v.main_image),
  ]);

  const data: VehicleSpecSheetData = {
    companyName,
    companyLogo: companyLogo || undefined,
    companyPhone,
    companyEmail,
    companyWebsite,
    companyAddress,
    brandColor,

    brand: v.brand?.name || '',
    model: v.model?.name || '',
    version: v.version_name || undefined,
    year: v.year || undefined,
    mileage: typeof v.mileage === 'number' ? v.mileage : undefined,
    fuelType: v.fuel_type?.name || undefined,
    transmission: v.transmission || undefined,
    category: v.category?.name || undefined,
    color: v.color?.name || undefined,
    condition: v.condition?.name || undefined,
    owners: typeof v.owners === 'number' ? v.owners : undefined,
    keys: typeof v.keys === 'number' ? v.keys : undefined,
    plate: v.license_plate || undefined,
    mainImage: mainImage || undefined,

    fields,
    headerTitle: tpl.headerTitle,
    customNote: tpl.customNote,
    labels: tpl.labels,

    generatedDate: new Date().toLocaleDateString('es-CL'),
  };

  const blob = await pdf(React.createElement(VehicleSpecSheetPDF, { data })).toBlob();

  const fileName =
    `Ficha ${[data.brand, data.model, data.year].filter(Boolean).join(' ')}`.trim() ||
    'Ficha técnica';

  return { blob, fileName };
};

// Genera y descarga la ficha técnica del vehículo.
export const downloadVehicleSpecSheet = async (
  vehicleId: number,
  clientId?: number | null,
  templateOverride?: SpecSheetTemplate
): Promise<void> => {
  const { blob, fileName } = await buildVehicleSpecSheetBlob(
    vehicleId,
    clientId,
    templateOverride
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
