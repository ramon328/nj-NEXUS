import React, { useState, useRef, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { PDFLayoutConfig } from '@/types/document-template';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Inline editable field ───────────────────────────────────────────────────

interface EditableFieldProps {
  value: string;
  fieldKey: string;
  onSave: (key: string, value: string) => void;
  className?: string;
  isOverridden?: boolean;
  type?: 'text' | 'currency';
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  fieldKey,
  onSave,
  className,
  isOverridden,
  type = 'text',
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const sanitizeCurrency = (raw: string): string => {
    // Strip everything except digits and minus sign
    const cleaned = raw.replace(/[^0-9-]/g, '');
    return cleaned || '0';
  };

  const commit = () => {
    setEditing(false);
    const finalValue = type === 'currency' ? sanitizeCurrency(draft) : draft;
    if (finalValue !== value) {
      onSave(fieldKey, finalValue);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className={cn(
          'bg-blue-50 border border-blue-300 rounded px-1.5 py-0.5 outline-none text-[#0f172a] w-full',
          className,
        )}
        style={{ fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'inherit' }}
        inputMode={type === 'currency' ? 'numeric' : undefined}
        placeholder={type === 'currency' ? 'Ingresa solo números' : undefined}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        'group/field relative cursor-pointer rounded px-1 -mx-1 transition-colors hover:bg-blue-50/80',
        isOverridden && 'bg-amber-50 ring-1 ring-amber-200',
        className,
      )}
      title="Click para editar"
    >
      {type === 'currency' ? formatCurrency(Number(value) || 0) : value}
      <Pencil className="inline-block ml-1 h-3 w-3 text-blue-400 opacity-0 group-hover/field:opacity-100 transition-opacity" />
    </span>
  );
};

// ─── Editable textarea for long content ──────────────────────────────────────

interface EditableTextAreaProps {
  value: string;
  fieldKey: string;
  onSave: (key: string, value: string) => void;
  className?: string;
  isOverridden?: boolean;
  fontSize?: number;
}

const EditableTextArea: React.FC<EditableTextAreaProps> = ({
  value,
  fieldKey,
  onSave,
  className,
  isOverridden,
  fontSize,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) {
      onSave(fieldKey, draft);
    }
  };

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={e => {
          setDraft(e.target.value);
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
          }
        }}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className={cn(
          'bg-blue-50 border border-blue-300 rounded px-2 py-1.5 outline-none text-[#475569] w-full resize-none',
          className,
        )}
        style={{ fontSize: fontSize ? `${fontSize}pt` : undefined }}
      />
    );
  }

  return (
    <p
      onClick={() => setEditing(true)}
      className={cn(
        'group/field relative cursor-pointer rounded px-1.5 -mx-1.5 py-0.5 transition-colors hover:bg-blue-50/80 whitespace-pre-wrap',
        isOverridden && 'bg-amber-50 ring-1 ring-amber-200',
        className,
      )}
      style={{ fontSize: fontSize ? `${fontSize}pt` : undefined }}
      title="Click para editar"
    >
      {value}
      <Pencil className="inline-block ml-1 h-3 w-3 text-blue-400 opacity-0 group-hover/field:opacity-100 transition-opacity" />
    </p>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────

export interface SaleNoteHTMLPreviewProps {
  // Company
  companyName: string;
  companyRut: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
  // Document
  documentNumber: string;
  documentDate: string;
  // Customer
  customerName: string;
  customerRut?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  // Vehicle
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehiclePlate?: string;
  vehicleMileage?: number;
  vehicleEngineNumber?: string;
  vehicleChassisNumber?: string;
  // Financial
  vehiclePrice: number;
  transferValue?: number;
  additionals?: Array<{ title: string; amount: number }>;
  total: number;
  // Payments
  payments?: Array<{ title: string; amount: number }>;
  totalPaid: number;
  // Trade-in
  tradeInVehicles?: Array<{ brand: string; model: string; year?: number; licensePlate?: string; value: number }>;
  tradeInTotal?: number;
  // Text
  terms?: string;
  notes?: string;
  // Layout
  layoutConfig?: PDFLayoutConfig;
  // Edit callback
  onFieldChange: (key: string, value: string) => void;
}

const SaleNoteHTMLPreview: React.FC<SaleNoteHTMLPreviewProps> = (props) => {
  const {
    companyName, companyRut, companyAddress, companyPhone, companyEmail, companyLogo,
    documentNumber, documentDate,
    customerName, customerRut, customerPhone, customerEmail, customerAddress,
    vehicleBrand, vehicleModel, vehicleYear, vehicleColor, vehiclePlate,
    vehicleMileage, vehicleEngineNumber, vehicleChassisNumber,
    vehiclePrice, transferValue, additionals, total,
    payments, totalPaid,
    tradeInVehicles, tradeInTotal,
    terms, notes,
    layoutConfig: lc,
    onFieldChange,
  } = props;

  const overrides = lc?.contentOverrides || {};
  const get = (key: string, original: string | number | undefined): string => {
    if (overrides[key] !== undefined) return String(overrides[key]);
    return String(original ?? '');
  };
  const isOv = (key: string) => overrides[key] !== undefined;

  const effectiveNotes = (lc?.notesOverride != null) ? lc.notesOverride : (notes ?? '');
  const effectiveTerms = (lc?.termsOverride != null) ? lc.termsOverride : (terms ?? '');
  const _showNotes = lc ? (lc.showNotes !== false) : true;
  const _showTerms = lc ? (lc.showTerms !== false) : true;
  const _showClientData = lc ? (lc.showClientData !== false) : true;
  const _showVehicleDetails = lc ? (lc.showVehicleDetails !== false) : true;
  const _showFinancialDetails = lc ? (lc.showFinancialDetails !== false) : true;
  const _showSignatures = lc ? (lc.showSignatures !== false) : true;
  const _showPayments = lc ? (lc.showPayments !== false) : true;
  const _showTransferValue = lc ? (lc.showTransferValue !== false) : true;

  const marginH = lc?.pageMarginH ?? 30;
  const marginV = lc?.pageMarginV ?? 20;
  const sectionSpacing = lc?.sectionSpacing ?? 10;

  // ─── DataRow helper ──────────────────────────────────────────────────────
  const DataRow = ({ label, fieldKey, original, type }: { label: string; fieldKey: string; original: string | number | undefined; type?: 'text' | 'currency' }) => (
    <div className="mb-1">
      <div className="text-[7.5pt] text-[#64748b] uppercase tracking-wide mb-0.5">{label.toUpperCase()}</div>
      <EditableField
        value={get(fieldKey, original)}
        fieldKey={fieldKey}
        onSave={onFieldChange}
        isOverridden={isOv(fieldKey)}
        className="text-[9pt] font-bold text-[#0f172a]"
        type={type}
      />
    </div>
  );

  // ─── Section wrapper ──────────────────────────────────────────────────────
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: sectionSpacing }}>
      <div className="mb-1.5">
        <div className="text-[10pt] font-bold text-[#0f172a] uppercase tracking-widest mb-1">{title.toUpperCase()}</div>
        <div className="h-[0.5px] bg-[#cbd5e1]" />
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );

  // ─── Financial row ────────────────────────────────────────────────────────
  const FinRow = ({ label, fieldKey, original, highlight, bold }: { label: string; fieldKey: string; original: number; highlight?: boolean; bold?: boolean }) => (
    <div className="flex justify-between items-center py-[3pt] border-b border-[#cbd5e1]">
      <span className={cn('text-[8.5pt]', highlight ? 'text-[#1e40af] font-bold' : 'text-[#475569]', bold && 'font-bold')}>
        {label}
      </span>
      <EditableField
        value={get(fieldKey, original)}
        fieldKey={fieldKey}
        onSave={onFieldChange}
        isOverridden={isOv(fieldKey)}
        className={cn('text-[8.5pt]', highlight ? 'text-[#1e40af] font-bold' : 'text-[#0f172a] font-bold')}
        type="currency"
      />
    </div>
  );

  return (
    <div className="bg-gray-200 flex-1 overflow-auto flex justify-center py-6">
      {/* Page */}
      <div
        className="bg-white shadow-xl mx-auto"
        style={{
          width: 595, // A4 width in points
          minHeight: 842,
          padding: `${marginV}pt ${marginH}pt`,
          fontSize: '9pt',
          fontFamily: 'Helvetica, Arial, sans-serif',
          color: '#1a1a1a',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 12 }}>
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              {companyLogo && (
                <img src={companyLogo} alt="" className="h-[30px] w-auto object-contain mb-1.5" />
              )}
              <div className="text-[12pt] font-bold text-[#0f172a] mb-0.5 -tracking-wide">{companyName}</div>
              <div className="text-[8pt] leading-relaxed text-[#64748b]">RUT: {companyRut}</div>
              {companyAddress && <div className="text-[8pt] leading-relaxed text-[#64748b]">{companyAddress}</div>}
              {companyPhone && <div className="text-[8pt] leading-relaxed text-[#64748b]">Tel: {companyPhone}</div>}
              {companyEmail && <div className="text-[8pt] leading-relaxed text-[#64748b]">{companyEmail}</div>}
            </div>
            <div className="text-right">
              <div className="text-[12pt] font-bold text-[#0f172a] mb-0.5 tracking-wide">NOTA DE VENTA</div>
              <div className="text-[8pt] text-[#64748b] mt-0.5">N° {documentNumber}</div>
              <div className="text-[8pt] text-[#64748b] mt-0.5">Fecha: {documentDate}</div>
            </div>
          </div>
          <div className="h-[0.5px] bg-[#cbd5e1] mt-1.5" />
        </div>

        {/* Datos del Cliente */}
        {_showClientData && (
          <Section title="Datos del Cliente">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <DataRow label="Nombre" fieldKey="customerName" original={customerName} />
              {customerRut && <DataRow label="RUT" fieldKey="customerRut" original={customerRut} />}
              {customerPhone && <DataRow label="Teléfono" fieldKey="customerPhone" original={customerPhone} />}
              {customerEmail && <DataRow label="Email" fieldKey="customerEmail" original={customerEmail} />}
              {customerAddress && (
                <div className="col-span-2">
                  <DataRow label="Dirección" fieldKey="customerAddress" original={customerAddress} />
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Detalles del Vehículo */}
        {_showVehicleDetails && (
          <Section title="Detalles del Vehículo">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <DataRow label="Marca" fieldKey="vehicleBrand" original={vehicleBrand} />
              <DataRow label="Modelo" fieldKey="vehicleModel" original={vehicleModel} />
              {vehicleYear && <DataRow label="Año" fieldKey="vehicleYear" original={vehicleYear} />}
              {vehicleColor && <DataRow label="Color" fieldKey="vehicleColor" original={vehicleColor} />}
              {vehiclePlate && <DataRow label="Patente" fieldKey="vehiclePlate" original={vehiclePlate} />}
              {vehicleMileage && <DataRow label="Kilometraje" fieldKey="vehicleMileage" original={`${vehicleMileage} km`} />}
              {vehicleEngineNumber && <DataRow label="N° Motor" fieldKey="vehicleEngineNumber" original={vehicleEngineNumber} />}
              {vehicleChassisNumber && <DataRow label="N° Chasis" fieldKey="vehicleChassisNumber" original={vehicleChassisNumber} />}
            </div>
          </Section>
        )}

        {/* Vehículos en Parte de Pago */}
        {tradeInVehicles && tradeInVehicles.length > 0 && (
          <Section title={`Vehículo${tradeInVehicles.length > 1 ? 's' : ''} en Parte de Pago${tradeInVehicles.length > 1 ? ` (${tradeInVehicles.length})` : ''}`}>
            {tradeInVehicles.map((tv, idx) => (
              <div key={idx} className={idx > 0 ? 'mt-2 pt-1.5 border-t border-dashed border-gray-300' : ''}>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <DataRow label="Marca" fieldKey={`tradeIn_${idx}_brand`} original={tv.brand || 'No especificado'} />
                  <DataRow label="Modelo" fieldKey={`tradeIn_${idx}_model`} original={tv.model || 'No especificado'} />
                  {tv.year && <DataRow label="Año" fieldKey={`tradeIn_${idx}_year`} original={tv.year} />}
                  {tv.licensePlate && <DataRow label="Patente" fieldKey={`tradeIn_${idx}_plate`} original={tv.licensePlate} />}
                  <DataRow label="Valor" fieldKey={`tradeIn_${idx}_value`} original={tv.value} type="currency" />
                </div>
              </div>
            ))}
            {tradeInTotal != null && tradeInTotal > 0 && tradeInVehicles.length > 1 && (
              <div className="mt-1.5 pt-1 border-t border-gray-400">
                <div className="flex justify-between px-1">
                  <span className="text-[10pt] font-bold">Total Parte de Pago</span>
                  <span className="text-[10pt] font-bold">{formatCurrency(tradeInTotal)}</span>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Detalle de la Venta */}
        {_showFinancialDetails && (
          <Section title="Detalle de la Venta">
            <div className="mt-1.5">
              <FinRow label="Precio del vehículo" fieldKey="vehiclePrice" original={vehiclePrice} />

              {_showTransferValue && transferValue && transferValue > 0 && (
                <FinRow label="+ Valor de Transferencia" fieldKey="transferValue" original={transferValue} highlight />
              )}

              {additionals && additionals.map((a, i) => (
                <FinRow key={i} label={`+ ${a.title}`} fieldKey={`additional_${i}`} original={a.amount} />
              ))}

              {tradeInTotal != null && tradeInTotal > 0 ? (
                <>
                  <div className="flex justify-between items-center py-1 border-t border-[#cbd5e1] mt-0.5">
                    <span className="text-[9pt] font-bold text-[#475569]">SUBTOTAL</span>
                    <span className="text-[9pt] font-bold text-[#0f172a]">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between items-center py-[3pt] border-b border-[#cbd5e1]">
                    <span className="text-[8.5pt] text-[#475569]">
                      - {tradeInVehicles && tradeInVehicles.length > 1
                        ? `Vehículos en parte de pago (${tradeInVehicles.length})`
                        : 'Vehículo en parte de pago'}
                    </span>
                    <span className="text-[8.5pt] text-[#0f172a] font-bold">{formatCurrency(tradeInTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 pt-2 border-t border-[#cbd5e1] mt-1">
                    <span className="text-[10pt] font-bold text-[#0f172a] uppercase tracking-wide">TOTAL</span>
                    <EditableField
                      value={get('total', total - tradeInTotal)}
                      fieldKey="total"
                      onSave={onFieldChange}
                      isOverridden={isOv('total')}
                      className="text-[10pt] font-bold text-[#0f172a]"
                      type="currency"
                    />
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center py-1.5 pt-2 border-t border-[#cbd5e1] mt-1">
                  <span className="text-[10pt] font-bold text-[#0f172a] uppercase tracking-wide">TOTAL</span>
                  <EditableField
                    value={get('total', total)}
                    fieldKey="total"
                    onSave={onFieldChange}
                    isOverridden={isOv('total')}
                    className="text-[10pt] font-bold text-[#0f172a]"
                    type="currency"
                  />
                </div>
              )}

              {_showPayments && payments && payments.length > 0 && (
                payments.length === 1 ? (
                  <div className="flex items-center py-[3pt] mt-1">
                    <span className="text-[8.5pt] text-[#475569]">Forma de Pago: {payments[0].title}</span>
                  </div>
                ) : (
                  <>
                    <div className="h-4" />
                    <div className="text-[10pt] font-bold text-[#0f172a] py-[3pt]">Pagos Realizados</div>
                    {payments.map((p, i) => (
                      <div key={i} className="flex justify-between items-center py-[3pt] border-b border-[#cbd5e1]">
                        <span className="text-[8.5pt] text-[#475569]">- {p.title}</span>
                        <span className="text-[8.5pt] text-[#0f172a] font-bold">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-1 border-t border-[#cbd5e1] mt-0.5">
                      <span className="text-[9pt] font-bold text-[#475569]">Total Pagado</span>
                      <span className="text-[9pt] font-bold text-[#0f172a]">{formatCurrency(totalPaid)}</span>
                    </div>
                  </>
                )
              )}
            </div>
          </Section>
        )}

        {/* Observaciones */}
        {_showNotes && effectiveNotes && (
          <Section title="Observaciones">
            <EditableTextArea
              value={effectiveNotes}
              fieldKey="_notesOverride"
              onSave={onFieldChange}
              isOverridden={lc?.notesOverride != null}
              fontSize={lc?.notesFontSize ?? 8}
              className="text-[#475569] leading-relaxed text-justify"
            />
          </Section>
        )}

        {/* Términos y Condiciones */}
        {_showTerms && effectiveTerms && (
          <Section title="Términos y Condiciones">
            <EditableTextArea
              value={effectiveTerms}
              fieldKey="_termsOverride"
              onSave={onFieldChange}
              isOverridden={lc?.termsOverride != null}
              fontSize={lc?.termsFontSize ?? 7.5}
              className="text-[#64748b] leading-snug text-justify"
            />
          </Section>
        )}

        {/* Firmas */}
        {_showSignatures && (
          <div
            className="flex justify-between border-t border-[#cbd5e1] pt-4"
            style={{ marginTop: lc?.signaturesMarginTop ?? 18 }}
          >
            <div className="w-[45%] text-center">
              <div className="h-[35px] border-b border-[#94a3b8] mb-1.5" />
              <div className="text-[9pt] font-bold text-[#0f172a] mb-0.5">{companyName}</div>
              <div className="text-[8pt] text-[#64748b] mb-0.5">Vendedor</div>
              <div className="text-[7.5pt] text-[#94a3b8]">{companyRut}</div>
            </div>
            <div className="w-[45%] text-center">
              <div className="h-[35px] border-b border-[#94a3b8] mb-1.5" />
              <div className="text-[9pt] font-bold text-[#0f172a] mb-0.5">
                {get('customerName', customerName)}
              </div>
              <div className="text-[8pt] text-[#64748b] mb-0.5">Comprador</div>
              <div className="text-[7.5pt] text-[#94a3b8]">{get('customerRut', customerRut)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaleNoteHTMLPreview;
