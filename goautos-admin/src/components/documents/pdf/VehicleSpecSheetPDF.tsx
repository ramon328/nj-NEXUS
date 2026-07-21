import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

// Campos configurables de la ficha (la "plantilla": el cliente elige cuáles salen).
// Marca y Modelo siempre van (son el título). El resto es opt-out.
export type SpecSheetFieldKey =
  | 'version'
  | 'year'
  | 'mileage'
  | 'fuelType'
  | 'transmission'
  | 'category'
  | 'color'
  | 'condition'
  | 'owners'
  | 'keys'
  | 'plate';

export const SPEC_SHEET_FIELDS: { key: SpecSheetFieldKey; label: string }[] = [
  { key: 'version', label: 'Versión' },
  { key: 'year', label: 'Año' },
  { key: 'mileage', label: 'Kilometraje' },
  { key: 'fuelType', label: 'Combustible' },
  { key: 'transmission', label: 'Transmisión' },
  { key: 'category', label: 'Carrocería' },
  { key: 'color', label: 'Color' },
  { key: 'condition', label: 'Condición' },
  { key: 'owners', label: 'N° de dueños' },
  { key: 'keys', label: 'N° de llaves' },
  { key: 'plate', label: 'Patente' },
];

// true/undefined = mostrar; false = ocultar. (Default: mostrar todo lo que tenga valor.)
export type SpecSheetFieldConfig = Partial<Record<SpecSheetFieldKey, boolean>>;

// Plantilla COMPLETA de la ficha (editable por el cliente, "como los otros docs"):
// qué campos salen + texto/título/contacto/etiquetas custom. Todo opcional.
export interface SpecSheetTemplate {
  fields: SpecSheetFieldConfig;
  /** Mensaje libre que sale en la ficha (ej. oferta, contacto, CTA). */
  customNote?: string;
  /** Título/encabezado custom (default "Ficha técnica"). */
  headerTitle?: string;
  /** Override del contacto (default = datos del cliente). */
  contact?: { phone?: string; website?: string; address?: string };
  /** Etiquetas custom por campo (ej. mileage → "Kms"). */
  labels?: Partial<Record<SpecSheetFieldKey, string>>;
}

export interface VehicleSpecSheetData {
  // Branding automotora
  companyName: string;
  companyLogo?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyAddress?: string;
  brandColor?: string;

  // Vehículo
  brand: string;
  model: string;
  version?: string;
  year?: number;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  category?: string;
  color?: string;
  condition?: string;
  owners?: number;
  keys?: number;
  plate?: string;
  mainImage?: string;

  // Plantilla: qué campos mostrar. Si no viene, se muestran todos los que tengan valor.
  fields?: SpecSheetFieldConfig;
  /** Encabezado custom (default "Ficha técnica"). */
  headerTitle?: string;
  /** Mensaje libre del cliente (sale antes del footer). */
  customNote?: string;
  /** Etiquetas custom por campo (ej. mileage → "Kms"). */
  labels?: Partial<Record<SpecSheetFieldKey, string>>;

  generatedDate: string;
}

const INK = '#0f172a';
const SUB = '#475569';
const MUTED = '#94a3b8';
const LINE = '#e5e7eb';
const LINE_STRONG = '#cbd5e1';

const TRANSMISSION_LABELS: Record<string, string> = {
  automatic: 'Automática',
  automatica: 'Automática',
  automática: 'Automática',
  manual: 'Manual',
  cvt: 'CVT',
  tiptronic: 'Tiptronic',
};
const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : undefined);
const prettyTransmission = (t?: string) =>
  t ? TRANSMISSION_LABELS[t.toLowerCase()] || cap(t) : undefined;
const formatNumber = (n?: number) =>
  typeof n === 'number' ? n.toLocaleString('es-CL') : undefined;

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingHorizontal: 40,
    paddingBottom: 42,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: INK,
    backgroundColor: '#ffffff',
  },

  // Header (sin color)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: INK,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { height: 30, maxWidth: 130, objectFit: 'contain', marginRight: 11 },
  companyName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: INK, maxWidth: 300 },
  headerRight: { alignItems: 'flex-end' },
  headerContact: { fontSize: 8, color: MUTED, marginBottom: 1.5 },

  // Foto
  hero: {
    width: '100%',
    height: 232,
    objectFit: 'cover',
    borderRadius: 6,
    border: `1px solid ${LINE}`,
    marginTop: 18,
  },
  heroPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 6,
    border: `1px solid ${LINE}`,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  heroPlaceholderText: { color: MUTED, fontSize: 11 },

  // Título
  titleRow: {
    marginTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: LINE_STRONG,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  kicker: {
    fontSize: 8,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: MUTED,
    marginBottom: 6,
  },
  brandModel: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: INK },
  version: { fontSize: 11, color: SUB, marginTop: 3 },
  headRight: { alignItems: 'flex-end' },
  year: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: INK },
  km: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: SUB, marginTop: 2 },

  // Especificaciones
  specsTitle: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: INK,
    fontFamily: 'Helvetica-Bold',
    marginTop: 22,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: LINE_STRONG,
    marginBottom: 14,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '33.33%', paddingRight: 14, marginBottom: 16 },
  cellLabel: {
    fontSize: 7.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: MUTED,
    marginBottom: 3,
  },
  cellValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: INK },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: LINE,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: MUTED },

  // Mensaje libre (plantilla)
  note: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  noteText: { fontSize: 9.5, color: SUB, lineHeight: 1.4 },
});

interface Spec {
  label: string;
  value?: string;
}

const VehicleSpecSheetPDF: React.FC<{ data: VehicleSpecSheetData }> = ({ data }) => {
  // Plantilla: un campo se muestra salvo que esté explícitamente en false.
  const show = (key: SpecSheetFieldKey) => data.fields?.[key] !== false;
  const km = formatNumber(data.mileage);
  const fullTitle = [data.brand, data.model].filter(Boolean).join(' ') || 'Vehículo';

  // Etiqueta custom por campo (la plantilla puede renombrar, ej. "Kilometraje"→"Kms").
  const L = data.labels || {};
  const specs: Spec[] = (
    [
      { key: 'fuelType', label: L.fuelType || 'Combustible', value: data.fuelType },
      { key: 'transmission', label: L.transmission || 'Transmisión', value: prettyTransmission(data.transmission) },
      { key: 'category', label: L.category || 'Carrocería', value: data.category },
      { key: 'color', label: L.color || 'Color', value: data.color },
      { key: 'condition', label: L.condition || 'Condición', value: data.condition },
      { key: 'owners', label: L.owners || 'N° de dueños', value: typeof data.owners === 'number' ? String(data.owners) : undefined },
      { key: 'keys', label: L.keys || 'N° de llaves', value: typeof data.keys === 'number' ? String(data.keys) : undefined },
      { key: 'plate', label: L.plate || 'Patente', value: data.plate },
    ] as (Spec & { key: SpecSheetFieldKey })[]
  ).filter((s) => show(s.key) && s.value !== undefined && s.value !== '');

  const contactLines = [
    data.companyPhone,
    data.companyEmail,
    data.companyWebsite,
    data.companyAddress,
  ].filter(Boolean) as string[];
  const headerTitle = (data.headerTitle || 'Ficha técnica').trim();
  const customNote = (data.customNote || '').trim();

  return (
    <Document title={`Ficha técnica ${fullTitle}`} author={data.companyName}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {data.companyLogo ? <Image src={data.companyLogo} style={styles.logo} /> : null}
            <Text style={styles.companyName}>{data.companyName}</Text>
          </View>
          {contactLines.length > 0 ? (
            <View style={styles.headerRight}>
              {contactLines.map((line, i) => (
                <Text key={i} style={styles.headerContact}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {/* Foto */}
        {data.mainImage ? (
          <Image src={data.mainImage} style={styles.hero} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderText}>Sin imagen</Text>
          </View>
        )}

        {/* Título */}
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.kicker}>{headerTitle}</Text>
            <Text style={styles.brandModel}>{fullTitle}</Text>
            {data.version && show('version') ? <Text style={styles.version}>{data.version}</Text> : null}
          </View>
          <View style={styles.headRight}>
            {data.year && show('year') ? <Text style={styles.year}>Año {data.year}</Text> : null}
            {km && show('mileage') ? <Text style={styles.km}>{km} km</Text> : null}
          </View>
        </View>

        {/* Especificaciones */}
        <Text style={styles.specsTitle}>Especificaciones</Text>
        <View style={styles.grid}>
          {specs.map((s, i) => (
            <View key={i} style={styles.cell}>
              <Text style={styles.cellLabel}>{s.label}</Text>
              <Text style={styles.cellValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Mensaje libre de la plantilla (si el cliente lo configuró) */}
        {customNote ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>{customNote}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {[data.companyName, data.companyPhone, data.companyWebsite].filter(Boolean).join('  ·  ')}
          </Text>
          <Text style={styles.footerText}>Generada el {data.generatedDate}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default VehicleSpecSheetPDF;
