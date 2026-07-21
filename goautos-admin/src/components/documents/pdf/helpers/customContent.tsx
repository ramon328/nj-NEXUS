import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/utils';
import { getCustomRows, getCustomSections, parseAmount } from '@/types/document-editor';

export { getCustomRows, getCustomSections };

export function renderCustomFinancialRows(overrides: Record<string, string | number>, sectionId: string, styles: any) {
  const rows = getCustomRows(overrides, sectionId);
  if (rows.length === 0) return null;

  return rows.map(row => (
    <View key={row.id} style={styles.tableRow}>
      <Text style={styles.tableLabel}>{row.label}</Text>
      <Text style={styles.tableValue}>
        {row.type === 'currency' ? formatCurrency(parseAmount(overrides[row.id] ?? row.value)) : String(overrides[row.id] ?? row.value)}
      </Text>
    </View>
  ));
}

export function renderCustomGridRows(overrides: Record<string, string | number>, sectionId: string, styles: any) {
  const rows = getCustomRows(overrides, sectionId);
  if (rows.length === 0) return null;

  return rows.map(row => (
    <View key={row.id} style={styles.gridCol2}>
      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>{row.label}</Text>
        <Text style={styles.dataValue}>
          {row.type === 'currency' ? formatCurrency(parseAmount(overrides[row.id] ?? row.value)) : String(overrides[row.id] ?? row.value)}
        </Text>
      </View>
    </View>
  ));
}

export function renderCustomSections(overrides: Record<string, string | number>, afterSectionId: string, styles: any, sectionStyle?: any) {
  const sections = getCustomSections(overrides).filter(s => s.afterSectionId === afterSectionId);
  if (sections.length === 0) return null;

  return sections.map(section => (
    <View key={section.id} style={sectionStyle ?? styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
        <View style={styles.sectionDivider} />
      </View>
      <View style={styles.grid}>
        {section.fields.map(field => (
          <View key={field.id} style={styles.gridCol2}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>{field.label}</Text>
              <Text style={styles.dataValue}>
                {field.type === 'currency' ? formatCurrency(parseAmount(overrides[field.id] ?? field.value)) : String(overrides[field.id] ?? field.value)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  ));
}
