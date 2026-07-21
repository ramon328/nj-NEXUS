import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { FinancialRow, CustomRow, parseAmount } from '@/types/document-editor';
import EditableField from '../EditableField';
import { cn } from '@/lib/utils';

interface FinancialSectionRendererProps {
  rows: FinancialRow[];
  overrides: Record<string, string | number>;
  onFieldChange: (key: string, value: string) => void;
  paymentInfo?: string;
  customRows?: CustomRow[];
}

const FinancialSectionRenderer: React.FC<FinancialSectionRendererProps> = ({
  rows,
  overrides,
  onFieldChange,
  paymentInfo,
  customRows,
}) => {
  const get = (key: string, original: number): string => {
    if (overrides[key] !== undefined) return String(overrides[key]);
    return String(original ?? 0);
  };
  const isOv = (key: string) => overrides[key] !== undefined;

  return (
    <div className="mt-1.5">
      {rows.map((row) => {
        if (row.style === 'total') {
          return (
            <div key={row.key} className="flex justify-between items-center py-1.5 pt-2 border-t border-[#cbd5e1] mt-1">
              <span className="text-[10pt] font-bold text-[#0f172a] uppercase tracking-wide">
                {row.label}
              </span>
              <EditableField
                value={get(row.key, row.value)}
                fieldKey={row.key}
                onSave={onFieldChange}
                isOverridden={isOv(row.key)}
                className="text-[10pt] font-bold text-[#0f172a]"
                type="currency"
              />
            </div>
          );
        }

        if (row.style === 'subtotal') {
          return (
            <div key={row.key} className="flex justify-between items-center py-1 border-t border-[#cbd5e1] mt-0.5">
              <span className="text-[9pt] font-bold text-[#475569]">{row.label}</span>
              <span className="text-[9pt] font-bold text-[#0f172a]">{formatCurrency(Number(get(row.key, row.value)) || 0)}</span>
            </div>
          );
        }

        if (row.style === 'deduction') {
          return (
            <div key={row.key} className="flex justify-between items-center py-[3pt] border-b border-[#cbd5e1]">
              <span className="text-[8.5pt] text-[#475569]">{row.label}</span>
              <span className="text-[8.5pt] text-[#0f172a] font-bold">{formatCurrency(Number(get(row.key, row.value)) || 0)}</span>
            </div>
          );
        }

        return (
          <div key={row.key} className="flex justify-between items-center py-[3pt] border-b border-[#cbd5e1]">
            <span className={cn(
              'text-[8.5pt]',
              row.style === 'highlight' ? 'text-[#1e40af] font-bold' : 'text-[#475569]',
            )}>
              {row.label}
            </span>
            <EditableField
              value={get(row.key, row.value)}
              fieldKey={row.key}
              onSave={onFieldChange}
              isOverridden={isOv(row.key)}
              className={cn(
                'text-[8.5pt]',
                row.style === 'highlight' ? 'text-[#1e40af] font-bold' : 'text-[#0f172a] font-bold',
              )}
              type="currency"
            />
          </div>
        );
      })}

      {/* Custom rows */}
      {customRows && customRows.map((cr) => (
        <div key={cr.id} className="flex justify-between items-center py-[3pt] border-b border-[#cbd5e1]">
          <span className="text-[8.5pt] text-[#475569]">{cr.label}</span>
          <EditableField
            value={get(cr.id, parseAmount(cr.value))}
            fieldKey={cr.id}
            onSave={onFieldChange}
            isOverridden={isOv(cr.id)}
            className="text-[8.5pt] text-[#0f172a] font-bold"
            type={cr.type === 'currency' ? 'currency' : 'text'}
          />
        </div>
      ))}

      {/* Payment info */}
      {paymentInfo && (
        <div className="flex items-center py-[3pt] mt-1">
          <span className="text-[8.5pt] text-[#475569]">Forma de Pago: {paymentInfo}</span>
        </div>
      )}
    </div>
  );
};

export default FinancialSectionRenderer;
