import React, { useCallback } from 'react';
import { PDFLayoutConfig } from '@/types/document-template';
import {
  DocumentEditorSchema,
  DocumentSection,
  CustomRow,
  CustomSection,
  getCustomRows,
  setCustomRows,
  getCustomSections,
  setCustomSections,
} from '@/types/document-editor';
import GridSectionRenderer from './sections/GridSectionRenderer';
import FinancialSectionRenderer from './sections/FinancialSectionRenderer';
import TextSectionRenderer from './sections/TextSectionRenderer';
import SignaturesSectionRenderer from './sections/SignaturesSectionRenderer';
import AddRowButton from './AddRowButton';
import AddSectionButton from './AddSectionButton';
import EditableField from './EditableField';

interface GenericDocumentHTMLPreviewProps {
  schema: DocumentEditorSchema;
  layoutConfig: PDFLayoutConfig;
  onFieldChange: (key: string, value: string) => void;
  onLayoutConfigChange: (config: PDFLayoutConfig) => void;
}

const GenericDocumentHTMLPreview: React.FC<GenericDocumentHTMLPreviewProps> = ({
  schema,
  layoutConfig: lc,
  onFieldChange,
  onLayoutConfigChange,
}) => {
  const overrides = lc?.contentOverrides || {};
  const marginH = lc?.pageMarginH ?? 30;
  const marginV = lc?.pageMarginV ?? 20;
  const sectionSpacing = lc?.sectionSpacing ?? 10;

  const get = (key: string, original: string | number | undefined): string => {
    if (overrides[key] !== undefined) return String(overrides[key]);
    return String(original ?? '');
  };
  const isOv = (key: string) => overrides[key] !== undefined;

  // Handle adding custom rows
  const handleAddCustomRow = useCallback((row: CustomRow) => {
    const existing = getCustomRows(overrides, row.sectionId);
    const updated = setCustomRows(overrides, row.sectionId, [...existing, row]);
    onLayoutConfigChange({ ...lc, contentOverrides: { ...overrides, ...updated } });
  }, [overrides, lc, onLayoutConfigChange]);

  // Handle adding custom sections
  const handleAddCustomSection = useCallback((section: CustomSection) => {
    const existing = getCustomSections(overrides);
    const updated = setCustomSections(overrides, [...existing, section]);
    onLayoutConfigChange({ ...lc, contentOverrides: { ...overrides, ...updated } });
  }, [overrides, lc, onLayoutConfigChange]);

  // Handle adding a field to a custom section
  const handleAddCustomSectionField = useCallback((sectionId: string, label: string, value: string) => {
    const sections = getCustomSections(overrides);
    const idx = sections.findIndex(s => s.id === sectionId);
    if (idx === -1) return;
    sections[idx].fields.push({
      id: `cf_${Date.now()}`,
      label,
      value,
    });
    const updated = setCustomSections(overrides, sections);
    onLayoutConfigChange({ ...lc, contentOverrides: { ...overrides, ...updated } });
  }, [overrides, lc, onLayoutConfigChange]);

  // Section wrapper
  const SectionWrapper = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: sectionSpacing }}>
      <div className="mb-1.5">
        <div className="text-[10pt] font-bold text-[#0f172a] uppercase tracking-widest mb-1">{title.toUpperCase()}</div>
        <div className="h-[0.5px] bg-[#cbd5e1]" />
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );

  // Render a single section
  const renderSection = (section: DocumentSection) => {
    if (!section.visible) return null;

    const customRows = getCustomRows(overrides, section.id);

    switch (section.type) {
      case 'header':
        return (
          <div key={section.id} style={{ marginBottom: 12 }}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                {section.companyLogo && (
                  <img src={section.companyLogo} alt="" className="h-[30px] w-auto object-contain mb-1.5" />
                )}
                <div className="text-[12pt] font-bold text-[#0f172a] mb-0.5 -tracking-wide">{section.companyName}</div>
                <div className="text-[8pt] leading-relaxed text-[#64748b]">RUT: {section.companyRut}</div>
                {section.companyAddress && <div className="text-[8pt] leading-relaxed text-[#64748b]">{section.companyAddress}</div>}
                {section.companyPhone && <div className="text-[8pt] leading-relaxed text-[#64748b]">Tel: {section.companyPhone}</div>}
                {section.companyEmail && <div className="text-[8pt] leading-relaxed text-[#64748b]">{section.companyEmail}</div>}
              </div>
              <div className="text-right">
                <div className="text-[12pt] font-bold text-[#0f172a] mb-0.5 tracking-wide">{section.documentTitle}</div>
                {section.documentNumber && <div className="text-[8pt] text-[#64748b] mt-0.5">N° {section.documentNumber}</div>}
                {section.documentDate && <div className="text-[8pt] text-[#64748b] mt-0.5">Fecha: {section.documentDate}</div>}
                {section.headerExtra?.map(f => (
                  <div key={f.key} className="text-[8pt] text-[#64748b] mt-0.5">
                    {f.label}: <EditableField value={get(f.key, f.value)} fieldKey={f.key} onSave={onFieldChange} isOverridden={isOv(f.key)} className="text-[8pt]" />
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[0.5px] bg-[#cbd5e1] mt-1.5" />
          </div>
        );

      case 'grid':
        return (
          <div key={section.id}>
            <SectionWrapper title={section.title}>
              <GridSectionRenderer
                fields={section.fields || []}
                overrides={overrides}
                onFieldChange={onFieldChange}
                customRows={customRows}
              />
              {section.allowCustomRows !== false && (
                <AddRowButton sectionId={section.id} sectionType="grid" onAdd={handleAddCustomRow} />
              )}
            </SectionWrapper>
          </div>
        );

      case 'financial':
        return (
          <div key={section.id}>
            <SectionWrapper title={section.title}>
              <FinancialSectionRenderer
                rows={section.rows || []}
                overrides={overrides}
                onFieldChange={onFieldChange}
                paymentInfo={section.paymentInfo}
                customRows={customRows}
              />
              {section.allowCustomRows !== false && (
                <AddRowButton sectionId={section.id} sectionType="financial" onAdd={handleAddCustomRow} />
              )}
            </SectionWrapper>
          </div>
        );

      case 'text': {
        const effectiveValue = section.textKey?.startsWith('_')
          ? (section.textKey === '_notesOverride' && lc?.notesOverride != null ? lc.notesOverride : section.textKey === '_termsOverride' && lc?.termsOverride != null ? lc.termsOverride : section.textValue || '')
          : get(section.textKey || '', section.textValue);

        if (!effectiveValue) return null;

        const isOverridden = section.textKey === '_notesOverride'
          ? lc?.notesOverride != null
          : section.textKey === '_termsOverride'
            ? lc?.termsOverride != null
            : isOv(section.textKey || '');

        return (
          <div key={section.id}>
            <SectionWrapper title={section.title}>
              <TextSectionRenderer
                value={effectiveValue}
                fieldKey={section.textKey || ''}
                onFieldChange={onFieldChange}
                isOverridden={isOverridden}
                fontSize={section.textFontSize}
                className={section.textKey === '_termsOverride'
                  ? 'text-[#64748b] leading-snug text-justify'
                  : 'text-[#475569] leading-relaxed text-justify'
                }
              />
            </SectionWrapper>
          </div>
        );
      }

      case 'signatures':
        return (
          <div key={section.id}>
            {section.visible && section.signatures && (
              <SignaturesSectionRenderer
                signatures={section.signatures}
                overrides={overrides}
                marginTop={lc?.signaturesMarginTop ?? 18}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Build the rendering order: interleave custom sections
  const customSections = getCustomSections(overrides);

  const renderAll = () => {
    const elements: React.ReactNode[] = [];

    for (const section of schema.sections) {
      elements.push(renderSection(section));

      // Render custom sections that go after this section
      for (const cs of customSections.filter(c => c.afterSectionId === section.id)) {
        elements.push(
          <div key={cs.id}>
            <SectionWrapper title={cs.title}>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {cs.fields.map(f => (
                  <div key={f.id} className="mb-1">
                    <div className="text-[7.5pt] text-[#64748b] uppercase tracking-wide mb-0.5">{f.label.toUpperCase()}</div>
                    <EditableField
                      value={get(f.id, f.value)}
                      fieldKey={f.id}
                      onSave={onFieldChange}
                      isOverridden={isOv(f.id)}
                      className="text-[9pt] font-bold text-[#0f172a]"
                      type={f.type === 'currency' ? 'currency' : 'text'}
                    />
                  </div>
                ))}
              </div>
              <AddRowButton
                sectionId={cs.id}
                sectionType="grid"
                onAdd={(row) => {
                  handleAddCustomSectionField(cs.id, row.label, row.value);
                }}
              />
            </SectionWrapper>
          </div>
        );
      }

      // Add section button (except after header and signatures)
      if (section.type !== 'header' && section.type !== 'signatures') {
        elements.push(
          <AddSectionButton key={`add-after-${section.id}`} afterSectionId={section.id} onAdd={handleAddCustomSection} />
        );
      }
    }

    return elements;
  };

  return (
    <div className="bg-gray-200 flex-1 overflow-auto flex justify-center py-6">
      <div
        className="bg-white shadow-xl mx-auto"
        style={{
          width: 595,
          minHeight: 842,
          padding: `${marginV}pt ${marginH}pt`,
          fontSize: '9pt',
          fontFamily: 'Helvetica, Arial, sans-serif',
          color: '#1a1a1a',
        }}
      >
        {renderAll()}
      </div>
    </div>
  );
};

export default GenericDocumentHTMLPreview;
