import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Loader2, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  SPEC_SHEET_FIELDS,
  type SpecSheetFieldKey,
  type SpecSheetTemplate,
} from '@/components/documents/pdf/VehicleSpecSheetPDF';
import {
  loadSpecSheetTemplate,
  saveSpecSheetTemplate,
} from '@/utils/vehicleSpecSheet';

/**
 * Configuración de la plantilla de Ficha Técnica a nivel CLIENTE, con VISTA PREVIA en
 * vivo. Además de qué campos salen, permite hacerla CUSTOM (como los otros docs):
 * encabezado, mensaje libre, datos de contacto y etiquetas de los campos.
 *
 * El guardado lo dispara el botón "Guardar" global de la config (expone `save()` por ref).
 */

export interface SpecSheetTemplateConfigHandle {
  save: () => Promise<void>;
}

// Datos de ejemplo para la vista previa (no es un auto real).
const SAMPLE = {
  brand: 'Toyota',
  model: 'Corolla',
  version: '2.0 XEI CVT',
  year: 2022,
  mileageLabel: '45.000 km',
  fuelType: 'Bencina',
  transmission: 'Automática',
  category: 'Sedán',
  color: 'Gris plata',
  condition: 'Usado',
  owners: '1',
  keys: '2',
  plate: 'ABCD·12',
};

// Campos del GRID (los que se renderizan como "ETIQUETA / valor" y por eso se pueden
// renombrar). version/año/km salen en el título, sin etiqueta editable.
const GRID_LABEL_KEYS: SpecSheetFieldKey[] = [
  'fuelType', 'transmission', 'category', 'color', 'condition', 'owners', 'keys', 'plate',
];
const DEFAULT_LABEL: Record<string, string> = Object.fromEntries(
  SPEC_SHEET_FIELDS.map((f) => [f.key, f.label])
);

const SpecSheetTemplateConfig = forwardRef<SpecSheetTemplateConfigHandle>((_props, ref) => {
  const { client, clientId } = useAuth();
  const [tpl, setTpl] = useState<SpecSheetTemplate>({ fields: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadSpecSheetTemplate(clientId)
      .then((t) => setTpl(t || { fields: {} }))
      .finally(() => setLoading(false));
  }, [clientId]);

  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        if (!clientId) return;
        await saveSpecSheetTemplate(clientId, tpl);
      },
    }),
    [clientId, tpl]
  );

  const isOn = (key: SpecSheetFieldKey) => tpl.fields?.[key] !== false;
  const toggle = (key: SpecSheetFieldKey) =>
    setTpl((p) => ({
      ...p,
      fields: { ...p.fields, [key]: p.fields?.[key] === false ? true : false },
    }));
  const setLabel = (key: SpecSheetFieldKey, value: string) =>
    setTpl((p) => ({ ...p, labels: { ...p.labels, [key]: value || undefined } }));
  const setContact = (k: 'phone' | 'website' | 'address', value: string) =>
    setTpl((p) => ({ ...p, contact: { ...p.contact, [k]: value || undefined } }));

  const companyName = (client as any)?.name || 'Tu Automotora';
  const companyLogo = (client as any)?.logo_url || (client as any)?.logo || null;
  const headerTitle = (tpl.headerTitle || '').trim() || 'Ficha técnica';
  const lbl = (key: SpecSheetFieldKey) => tpl.labels?.[key]?.trim() || DEFAULT_LABEL[key];

  // Contacto del preview: override de la plantilla, o ejemplo.
  const previewPhone = tpl.contact?.phone?.trim() || '+56 9 1234 5678';
  const previewWeb = tpl.contact?.website?.trim() || 'tuauto.cl';

  const previewSpecs = (
    GRID_LABEL_KEYS.map((key) => ({
      key,
      label: lbl(key),
      value: (SAMPLE as any)[key],
    })) as { key: SpecSheetFieldKey; label: string; value: string }[]
  ).filter((s) => isOn(s.key));

  if (loading) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-1">
      {/* Columna izquierda: configuración */}
      <div className="space-y-5">
        {/* Encabezado + mensaje */}
        <div className="space-y-2">
          <span className="text-[13px] font-medium text-slate-700">Encabezado y mensaje</span>
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">Título (encabezado)</label>
            <Input
              value={tpl.headerTitle ?? ''}
              onChange={(e) => setTpl((p) => ({ ...p, headerTitle: e.target.value || undefined }))}
              placeholder="Ficha técnica"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">
              Mensaje libre (sale al pie de la ficha)
            </label>
            <Textarea
              rows={3}
              value={tpl.customNote ?? ''}
              onChange={(e) => setTpl((p) => ({ ...p, customNote: e.target.value || undefined }))}
              placeholder="Ej: Financiamiento disponible. Escribinos para agendar una visita."
              className="resize-none text-[13px]"
            />
          </div>
        </div>

        {/* Campos a mostrar */}
        <div className="space-y-2">
          <span className="text-[13px] font-medium text-slate-700">Campos a mostrar</span>
          <p className="text-[11px] text-slate-400 leading-snug">
            Marca y modelo siempre aparecen. Un campo solo se muestra si está marcado y el
            vehículo tiene ese dato cargado.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SPEC_SHEET_FIELDS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => toggle(f.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] text-left transition-colors ${
                  isOn(f.key)
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                    isOn(f.key) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                  }`}
                >
                  {isOn(f.key) && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="truncate">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Renombrar etiquetas */}
        <div className="space-y-2">
          <span className="text-[13px] font-medium text-slate-700">Renombrar etiquetas (opcional)</span>
          <div className="grid grid-cols-2 gap-2">
            {GRID_LABEL_KEYS.filter((k) => isOn(k)).map((key) => (
              <Input
                key={key}
                value={tpl.labels?.[key] ?? ''}
                onChange={(e) => setLabel(key, e.target.value)}
                placeholder={DEFAULT_LABEL[key]}
                className="h-8 text-[12px]"
              />
            ))}
          </div>
        </div>

        {/* Contacto */}
        <div className="space-y-2">
          <span className="text-[13px] font-medium text-slate-700">Contacto (opcional)</span>
          <p className="text-[11px] text-slate-400 leading-snug">
            Si lo dejas vacío, usa los datos del cliente automáticamente.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <Input
              value={tpl.contact?.phone ?? ''}
              onChange={(e) => setContact('phone', e.target.value)}
              placeholder="Teléfono (ej: +56 9 1234 5678)"
              className="h-8 text-[12px]"
            />
            <Input
              value={tpl.contact?.website ?? ''}
              onChange={(e) => setContact('website', e.target.value)}
              placeholder="Sitio web (ej: tuauto.cl)"
              className="h-8 text-[12px]"
            />
            <Input
              value={tpl.contact?.address ?? ''}
              onChange={(e) => setContact('address', e.target.value)}
              placeholder="Dirección (ej: Av. Principal 123)"
              className="h-8 text-[12px]"
            />
          </div>
        </div>
      </div>

      {/* Columna derecha: vista previa en vivo */}
      <div>
        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
          Vista previa · datos de ejemplo
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* Header automotora */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              {companyLogo ? (
                <img src={companyLogo} alt="" className="h-6 max-w-[90px] object-contain" />
              ) : null}
              <span className="text-[15px] font-bold text-slate-900 truncate">{companyName}</span>
            </div>
            <span className="text-[8px] text-slate-400 shrink-0 text-right leading-tight">
              {previewPhone}
              <br />
              {previewWeb}
            </span>
          </div>

          {/* Foto */}
          <div className="mt-3 flex h-28 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-400">
            Foto del vehículo
          </div>

          {/* Título */}
          <div className="mt-3 flex items-end justify-between border-b border-slate-300 pb-2">
            <div className="min-w-0">
              <div className="text-[8px] uppercase tracking-[0.2em] text-slate-400">{headerTitle}</div>
              <div className="text-lg font-bold text-slate-900 truncate">
                {SAMPLE.brand} {SAMPLE.model}
              </div>
              {isOn('version') && (
                <div className="text-[11px] text-slate-500">{SAMPLE.version}</div>
              )}
            </div>
            <div className="text-right shrink-0 pl-2">
              {isOn('year') && (
                <div className="text-sm font-bold text-slate-900">Año {SAMPLE.year}</div>
              )}
              {isOn('mileage') && (
                <div className="text-[12px] font-bold text-slate-500">{SAMPLE.mileageLabel}</div>
              )}
            </div>
          </div>

          {/* Especificaciones */}
          <div className="mt-3 text-[9px] font-bold uppercase tracking-wide text-slate-900 border-b border-slate-300 pb-1.5">
            Especificaciones
          </div>
          {previewSpecs.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-3">
              {previewSpecs.map((s) => (
                <div key={s.key}>
                  <div className="text-[7px] uppercase tracking-wide text-slate-400">{s.label}</div>
                  <div className="text-[11px] font-bold text-slate-900">{s.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-slate-400">
              Sin campos seleccionados (solo saldrían marca y modelo).
            </p>
          )}

          {/* Mensaje libre */}
          {(tpl.customNote || '').trim() && (
            <div className="mt-4 border-t border-slate-100 pt-2 text-[10px] text-slate-600 leading-snug">
              {tpl.customNote}
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-2 text-[8px] text-slate-400">
            <span className="truncate">
              {[companyName, previewPhone, previewWeb].filter(Boolean).join(' · ')}
            </span>
            <span className="shrink-0 pl-2">Generada hoy</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Así se verá la ficha. Guarda con el botón <span className="font-medium text-slate-600">Guardar</span> de arriba.
        </p>
      </div>
    </div>
  );
});

SpecSheetTemplateConfig.displayName = 'SpecSheetTemplateConfig';

export default SpecSheetTemplateConfig;
