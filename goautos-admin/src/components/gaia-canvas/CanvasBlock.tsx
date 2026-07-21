import { X, Car, User, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { VehiclePreview, CustomerPreview, GaiaBlock } from '@/types/gaia';

export interface CanvasBlockData {
  id: string;
  type: string;
  content?: string;
  data?: any;
  timestamp: Date;
  query?: string;
}

interface CanvasBlockProps {
  block: CanvasBlockData;
  onRemove: () => void;
  onAction: (msg: string) => void;
}

const formatCLP = (price: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(price);

const formatTime = (date: Date) =>
  new Date(date).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  });

export function CanvasBlock({ block, onRemove, onAction }: CanvasBlockProps) {
  return (
    <div className="group rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50">
        <span className="text-[11px] text-slate-400 italic truncate max-w-[70%]">
          {block.query || ''}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-300">{formatTime(block.timestamp)}</span>
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <BlockContent block={block} onAction={onAction} />
      </div>
    </div>
  );
}

function BlockContent({ block, onAction }: { block: CanvasBlockData; onAction: (msg: string) => void }) {
  switch (block.type) {
    case 'text':
      return <TextBlock content={block.content || ''} />;

    case 'vehicle_cards':
    case 'vehicle_selector':
      return <VehicleCardsBlock data={block.data} onAction={onAction} />;

    case 'customer_selector':
      return <CustomerSelectorBlock data={block.data} onAction={onAction} />;

    case 'confirmation':
      return <ConfirmationBlock data={block.data} />;

    case 'quick_actions':
      return <QuickActionsBlock data={block.data} onAction={onAction} />;

    case 'sale_summary':
      return <SaleSummaryBlock data={block.data} />;

    case 'image_gallery':
      return <ImageGalleryBlock data={block.data} />;

    default:
      return (
        <pre className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 overflow-auto max-h-60">
          {JSON.stringify(block.data || block.content, null, 2)}
        </pre>
      );
  }
}

/* ───────────────────── Text Block ───────────────────── */

function TextBlock({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-slate max-w-none
      prose-headings:text-slate-900 prose-headings:font-semibold
      prose-p:text-slate-700 prose-p:leading-relaxed
      prose-strong:text-slate-900
      prose-ul:text-slate-700 prose-ol:text-slate-700
      prose-li:marker:text-slate-400
      prose-a:text-cyan-600 prose-a:no-underline hover:prose-a:underline
      prose-table:text-sm prose-th:bg-slate-50 prose-th:px-3 prose-th:py-2
      prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-slate-100
      prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[13px]
      prose-code:before:content-none prose-code:after:content-none"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* ───────────────────── Vehicle Cards ───────────────────── */

function VehicleCardsBlock({
  data,
  onAction,
}: {
  data: { vehicles: VehiclePreview[]; prompt?: string };
  onAction: (msg: string) => void;
}) {
  const vehicles = data?.vehicles || [];

  return (
    <div>
      {data?.prompt && (
        <p className="text-sm text-slate-500 mb-3">{data.prompt}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {vehicles.map((v) => (
          <button
            key={v.id}
            onClick={() => onAction(`Muéstrame todos los detalles del ${v.brand} ${v.model} ${v.year} (ID: ${v.id}) incluyendo compras, gastos, documentos y consignaciones`)}
            className="group/card rounded-xl border border-slate-200/80 bg-white overflow-hidden text-left
              hover:scale-[1.02] hover:shadow-lg hover:border-slate-300 transition-all duration-200"
          >
            {/* Image */}
            <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
              {v.main_image ? (
                <img
                  src={v.main_image}
                  alt={`${v.brand} ${v.model}`}
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Car className="w-12 h-12 text-slate-300" />
                </div>
              )}
              {/* Status badge overlay */}
              <div className="absolute top-2 left-2">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 backdrop-blur-sm shadow-sm"
                  style={{ color: v.statusColor || '#64748b' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: v.statusColor || '#64748b' }}
                  />
                  {v.status}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <h4 className="text-sm font-semibold text-slate-900 truncate">
                {v.brand} {v.model} {v.year}
              </h4>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {formatCLP(v.price)}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                {v.license_plate && (
                  <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded">
                    {v.license_plate}
                  </span>
                )}
                <span>{v.days_in_stock}d en stock</span>
                {v.mileage != null && (
                  <span>{v.mileage.toLocaleString('es-CL')} km</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────── Customer Selector ───────────────────── */

function CustomerSelectorBlock({
  data,
  onAction,
}: {
  data: { customers: CustomerPreview[]; prompt?: string };
  onAction: (msg: string) => void;
}) {
  const customers = data?.customers || [];

  return (
    <div>
      {data?.prompt && (
        <p className="text-sm text-slate-500 mb-3">{data.prompt}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {customers.map((c) => (
          <button
            key={c.id}
            onClick={() => onAction(`Selecciono al cliente ${c.first_name} ${c.last_name}`)}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 bg-white text-left
              hover:border-cyan-200 hover:shadow-md hover:shadow-cyan-500/5 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {c.first_name} {c.last_name}
              </p>
              {c.rut && (
                <p className="text-[11px] text-slate-400 font-mono">{c.rut}</p>
              )}
              {c.phone && (
                <p className="text-[11px] text-slate-400">{c.phone}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────── Confirmation ───────────────────── */

function ConfirmationBlock({ data }: { data: { action: string; summary: string; details: Record<string, any> } }) {
  if (!data) return null;

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-amber-900">{data.action}</h4>
          <p className="text-sm text-amber-800 mt-1">{data.summary}</p>
          {data.details && Object.keys(data.details).length > 0 && (
            <div className="mt-3 space-y-1">
              {Object.entries(data.details).map(([key, value]) => (
                <div key={key} className="flex items-baseline gap-2 text-xs">
                  <span className="text-amber-600 font-medium capitalize">{key}:</span>
                  <span className="text-amber-800">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Quick Actions ───────────────────── */

function QuickActionsBlock({
  data,
  onAction,
}: {
  data: { actions: { label: string; message: string }[] };
  onAction: (msg: string) => void;
}) {
  const actions = data?.actions || [];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={() => onAction(a.message)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700
            hover:border-cyan-200 hover:text-cyan-700 hover:shadow-md hover:shadow-cyan-500/5
            active:scale-[0.97] transition-all"
        >
          <Zap className="w-3.5 h-3.5" />
          {a.label}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────── Sale Summary ───────────────────── */

function SaleSummaryBlock({ data }: { data: { vehicle: string; customer: string; price: number; details: Record<string, any> } }) {
  if (!data) return null;

  return (
    <div className="rounded-xl bg-emerald-50 border border-emerald-200/60 p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-emerald-900">Resumen de Venta</h4>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-emerald-600 font-medium uppercase tracking-wider">Vehiculo</p>
              <p className="text-sm text-emerald-900 font-medium mt-0.5">{data.vehicle}</p>
            </div>
            <div>
              <p className="text-[11px] text-emerald-600 font-medium uppercase tracking-wider">Cliente</p>
              <p className="text-sm text-emerald-900 font-medium mt-0.5">{data.customer}</p>
            </div>
            <div>
              <p className="text-[11px] text-emerald-600 font-medium uppercase tracking-wider">Precio</p>
              <p className="text-lg text-emerald-900 font-bold mt-0.5">{formatCLP(data.price)}</p>
            </div>
          </div>
          {data.details && Object.keys(data.details).length > 0 && (
            <div className="mt-3 pt-3 border-t border-emerald-200/50 space-y-1">
              {Object.entries(data.details).map(([key, value]) => (
                <div key={key} className="flex items-baseline gap-2 text-xs">
                  <span className="text-emerald-600 font-medium capitalize">{key}:</span>
                  <span className="text-emerald-800">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Image Gallery ───────────────────── */

function ImageGalleryBlock({ data }: { data: { images: string[]; vehicleName?: string } }) {
  const images = data?.images || [];

  return (
    <div>
      {data?.vehicleName && (
        <p className="text-sm font-medium text-slate-700 mb-3">{data.vehicleName}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {images.map((img, i) => (
          <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100">
            <img
              src={img}
              alt={`${data?.vehicleName || 'Vehiculo'} - ${i + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
