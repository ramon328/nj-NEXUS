import React from 'react';
import { GridField, CustomRow } from '@/types/document-editor';
import EditableField from '../EditableField';

interface GridSectionRendererProps {
  fields: GridField[];
  overrides: Record<string, string | number>;
  onFieldChange: (key: string, value: string) => void;
  customRows?: CustomRow[];
}

const GridSectionRenderer: React.FC<GridSectionRendererProps> = ({
  fields,
  overrides,
  onFieldChange,
  customRows,
}) => {
  const get = (key: string, original: string | number | undefined): string => {
    if (overrides[key] !== undefined) return String(overrides[key]);
    return String(original ?? '');
  };
  const isOv = (key: string) => overrides[key] !== undefined;

  const allFields = [
    ...fields,
    ...(customRows || []).map(cr => ({
      key: cr.id,
      label: cr.label,
      value: cr.value,
      type: cr.type as 'text' | 'currency' | undefined,
      fullWidth: false,
    })),
  ];

  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
      {allFields.map((field) => (
        <div key={field.key} className={field.fullWidth ? 'col-span-2' : ''}>
          <div className="mb-1">
            <div className="text-[7.5pt] text-[#64748b] uppercase tracking-wide mb-0.5">
              {field.label.toUpperCase()}
            </div>
            <EditableField
              value={get(field.key, field.value)}
              fieldKey={field.key}
              onSave={onFieldChange}
              isOverridden={isOv(field.key)}
              className="text-[9pt] font-bold text-[#0f172a]"
              type={field.type === 'currency' ? 'currency' : 'text'}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default GridSectionRenderer;
