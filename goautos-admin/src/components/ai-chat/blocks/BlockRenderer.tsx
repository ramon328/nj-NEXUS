import { lazy, Suspense } from 'react';
import { GaiaBlock, VehiclePreview } from '@/types/gaia';
import { VehicleCardBlock } from './VehicleCardBlock';
import { VehicleSelectorBlock } from './VehicleSelectorBlock';
import { VehicleDetailBlock } from './VehicleDetailBlock';
import { DashboardMetricsBlock } from './DashboardMetricsBlock';
import { SaleFormBlock } from './SaleFormBlock';
import { CustomerSelectorBlock } from './CustomerSelectorBlock';
import { ConfirmationBlock } from './ConfirmationBlock';
import { QuickActionsBlock } from './QuickActionsBlock';
import { CheckCircle2, Image as ImageIcon, Loader2 } from 'lucide-react';

// Lazy: arrastra @react-pdf/renderer + pdf-lib (visores PDF). Solo carga cuando
// el usuario abre los documentos de un vehículo.
const DocumentsBlock = lazy(() => import('./DocumentsBlock'));

interface BlockRendererProps {
  block: GaiaBlock;
  onSendMessage: (msg: string) => void;
  onConfirm?: (actionId: string) => void;
  onCancel?: (actionId: string) => void;
  /**
   * Si se entrega, hacer click en un vehículo abre su detalle completo de forma
   * instantánea (vista local, sin pasar por el LLM). Si no, cae al fallback de
   * enviar un mensaje pidiendo los detalles.
   */
  onVehicleSelect?: (vehicle: VehiclePreview) => void;
  /**
   * Si se entrega, "Marcar como vendido" en el detalle abre el formulario de
   * venta inline (instantáneo). Si no, cae al fallback de mensaje al agente.
   */
  onRegisterSale?: (vehicleId: number, preview?: VehiclePreview) => void;
  /**
   * Si se entrega, "Ver documentos" en el detalle abre el bloque de documentos
   * reales (visor PDF modal) de forma instantánea.
   */
  onViewDocuments?: (vehicleId: number) => void;
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

export function BlockRenderer({ block, onSendMessage, onConfirm, onCancel, onVehicleSelect, onRegisterSale, onViewDocuments }: BlockRendererProps) {
  const handleVehicle = (v: VehiclePreview) => {
    if (onVehicleSelect) {
      onVehicleSelect(v);
    } else {
      onSendMessage(
        `Muéstrame todos los detalles del ${v.brand} ${v.model} ${v.year} (ID: ${v.id}) incluyendo compras, gastos, documentos y consignaciones`
      );
    }
  };

  switch (block.type) {
    case 'vehicle_cards':
      return <VehicleCardBlock vehicles={block.vehicles} onSelect={handleVehicle} />;

    case 'vehicle_detail':
      return (
        <VehicleDetailBlock
          vehicleId={block.vehicleId}
          preview={block.preview}
          onAction={onSendMessage}
          onRegisterSale={
            onRegisterSale ? () => onRegisterSale(block.vehicleId, block.preview) : undefined
          }
          onViewDocuments={
            onViewDocuments ? () => onViewDocuments(block.vehicleId) : undefined
          }
        />
      );

    case 'dashboard_metrics':
      return <DashboardMetricsBlock onAction={onSendMessage} />;

    case 'sale_form':
      return (
        <SaleFormBlock vehicleId={block.vehicleId} preview={block.preview} onAction={onSendMessage} />
      );

    case 'documents':
      return (
        <Suspense
          fallback={
            <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-6 flex items-center justify-center gap-2 text-slate-400 text-[13px]">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando documentos…
            </div>
          }
        >
          <DocumentsBlock vehicleId={block.vehicleId} onAction={onSendMessage} />
        </Suspense>
      );

    case 'vehicle_selector':
      return (
        <VehicleSelectorBlock
          vehicles={block.vehicles}
          prompt={block.prompt}
          onSelect={handleVehicle}
        />
      );

    case 'customer_selector':
      return (
        <CustomerSelectorBlock
          customers={block.customers}
          prompt={block.prompt}
          onSelect={(c) =>
            onSendMessage(`Selecciono cliente: ${c.first_name} ${c.last_name} (ID: ${c.id})`)
          }
        />
      );

    case 'confirmation':
      return (
        <ConfirmationBlock
          action={block.action}
          summary={block.summary}
          details={block.details}
          onConfirm={() => onConfirm?.(block.action)}
          onCancel={() => onCancel?.(block.action)}
        />
      );

    case 'quick_actions':
      return <QuickActionsBlock actions={block.actions} onSendMessage={onSendMessage} />;

    case 'image_gallery':
      return (
        <div className="space-y-2">
          {block.vehicleName && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <ImageIcon className="w-3 h-3" />
              {block.vehicleName}
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {block.images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`${block.vehicleName || 'Vehículo'} - ${i + 1}`}
                className="h-28 w-auto rounded-xl object-cover flex-shrink-0 snap-start shadow-sm"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      );

    case 'sale_summary':
      return (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2.5 border-b border-emerald-100">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">Venta registrada</p>
              <p className="text-xs text-emerald-600">{block.vehicle}</p>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Cliente</span>
              <span className="text-sm font-semibold text-slate-800">{block.customer}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Precio</span>
              <span className="text-lg font-bold text-emerald-700">{formatCLP(block.price)}</span>
            </div>
            {Object.entries(block.details).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{key}</span>
                <span className="text-sm font-medium text-slate-700">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}
