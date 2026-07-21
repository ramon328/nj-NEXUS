import { StyleSheet } from '@react-pdf/renderer';

// DISEÑO MODERNO Y PROFESIONAL - Sin bordes innecesarios, elegante y limpio
export const modernStyles = StyleSheet.create({
  // ============== PÁGINA ==============
  page: {
    padding: '20 30',
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
  },

  // ============== HEADER ==============
  header: {
    marginBottom: 12,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  companySection: {
    flex: 1,
  },

  logoImage: {
    width: 70,
    height: 30,
    marginBottom: 5,
    objectFit: 'contain',
  },

  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 3,
    letterSpacing: -0.2,
  },

  companyDetails: {
    fontSize: 8,
    lineHeight: 1.4,
    color: '#64748b',
  },

  documentSection: {
    alignItems: 'flex-end',
  },

  documentType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 3,
    letterSpacing: 0.5,
  },

  documentMeta: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },

  headerDivider: {
    height: 0.5,
    backgroundColor: '#cbd5e1',
    marginTop: 6,
  },

  // ============== SECCIONES ==============
  section: {
    marginBottom: 10,
  },

  sectionHeader: {
    marginBottom: 5,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  sectionDivider: {
    height: 0.5,
    backgroundColor: '#cbd5e1',
  },

  sectionContent: {
    marginTop: 6,
  },

  // ============== GRIDS Y ROWS ==============
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },

  gridCol2: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 4,
  },

  gridCol3: {
    width: '33.33%',
    paddingHorizontal: 4,
    marginBottom: 4,
  },

  gridCol4: {
    width: '25%',
    paddingHorizontal: 4,
    marginBottom: 4,
  },

  dataRow: {
    marginBottom: 4,
  },

  dataLabel: {
    fontSize: 7.5,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },

  dataValue: {
    fontSize: 9,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
  },

  // ============== TABLAS FINANCIERAS ==============
  financialTable: {
    marginTop: 6,
  },

  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottom: '0.5 solid #cbd5e1',
  },

  tableRowNoBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },

  tableLabel: {
    fontSize: 8.5,
    color: '#475569',
  },

  tableValue: {
    fontSize: 8.5,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
  },

  tableLabelHighlight: {
    fontSize: 8.5,
    color: '#1e40af',
    fontFamily: 'Helvetica-Bold',
  },

  tableValueHighlight: {
    fontSize: 8.5,
    color: '#1e40af',
    fontFamily: 'Helvetica-Bold',
  },

  // Total row
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingTop: 6,
    borderTop: '0.5 solid #cbd5e1',
    marginTop: 4,
  },

  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  // Subtotal row
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTop: '0.5 solid #cbd5e1',
    marginTop: 3,
  },

  subtotalLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
  },

  subtotalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },

  // ============== TEXTO LARGO ==============
  textBlock: {
    fontSize: 8,
    lineHeight: 1.5,
    color: '#475569',
    textAlign: 'justify',
  },

  textBlockSmall: {
    fontSize: 7.5,
    lineHeight: 1.4,
    color: '#64748b',
    textAlign: 'justify',
  },

  // ============== FIRMAS ==============
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 15,
    borderTop: '0.5 solid #cbd5e1',
  },

  signatureBox: {
    width: '45%',
    alignItems: 'center',
  },

  signatureLine: {
    width: '100%',
    height: 35,
    borderBottom: '0.75 solid #94a3b8',
    marginBottom: 5,
  },

  signatureName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },

  signatureRole: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 1,
  },

  signatureId: {
    fontSize: 7.5,
    color: '#94a3b8',
  },

  // ============== BADGES Y TAGS ==============
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },

  badgeText: {
    fontSize: 7.5,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Helvetica-Bold',
  },

  badgePrimary: {
    backgroundColor: '#dbeafe',
  },

  badgeTextPrimary: {
    color: '#1e40af',
  },

  badgeSuccess: {
    backgroundColor: '#d1fae5',
  },

  badgeTextSuccess: {
    color: '#065f46',
  },

  // ============== UTILIDADES ==============
  spacer: {
    height: 15,
  },

  spacerSmall: {
    height: 8,
  },

  textCenter: {
    textAlign: 'center',
  },

  textRight: {
    textAlign: 'right',
  },

  fontBold: {
    fontWeight: 'bold',
  },

  colorMuted: {
    color: '#94a3b8',
  },

  // ============== FOOTER ==============
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 15,
    borderTop: '0.5 solid #cbd5e1',
  },

  footerText: {
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
