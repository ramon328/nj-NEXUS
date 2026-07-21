import { useState } from 'react';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Calendar,
  Clock,
  Hash,
  Tag,
  Car,
  Gauge,
  DollarSign,
  RefreshCw,
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChileautosListing } from '@/types/chileautos';
import { formatPrice, formatMileage } from './ChileautosVehicleCard';

interface ChileautosListingDetailDrawerProps {
  listing: ChileautosListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: (vehicleId: number) => void;
  onRemove: (vehicleId: number) => void;
  onVerify?: (identifier: string) => Promise<{ exists: boolean; data?: any }>;
  /**
   * Abre el editor del aviso (sheet en modo 'edit') para el vehículo de este listing.
   * Permite corregir título/versión/precio/descripción sin perder fotos.
   */
  onEdit?: (vehicleId: number) => void;
  isSyncing?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  published: { label: 'Publicado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  pending: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  error: { label: 'Error', color: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle },
  sold: { label: 'Vendido', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: DollarSign },
  withdrawn: { label: 'Retirado', color: 'bg-slate-50 text-slate-600 border-slate-200', icon: AlertTriangle },
};

const PRODUCT_CONFIG: Record<string, { label: string; color: string }> = {
  premium: { label: 'Premium', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  topspot: { label: 'Top Spot', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  showcase: { label: 'Showcase', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  certificado: { label: 'Certificado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export function ChileautosListingDetailDrawer({
  listing,
  open,
  onOpenChange,
  onSync,
  onRemove,
  onVerify,
  onEdit,
  isSyncing,
}: ChileautosListingDetailDrawerProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ exists: boolean; data?: any } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!listing) return null;

  const statusCfg = STATUS_CONFIG[listing.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const vehicleTitle = listing.title || `${listing.vehicle?.brand?.name || ''} ${listing.vehicle?.model?.name || ''} ${listing.vehicle?.year || ''}`.trim();

  const handleCopyId = () => {
    if (!listing.chileautos_identifier) return;
    navigator.clipboard.writeText(listing.chileautos_identifier);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleVerify = async () => {
    if (!onVerify) return;
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const result = await onVerify(listing.chileautos_identifier);
      setVerifyResult(result);
    } catch {
      setVerifyResult({ exists: false });
    }
    setIsVerifying(false);
  };

  const handleRemove = () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    onRemove(listing.vehicle_id);
    setConfirmRemove(false);
    onOpenChange(false);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setConfirmRemove(false);
          setVerifyResult(null);
        }
      }}
      direction="right"
    >
      <DrawerContentRight className="md:min-w-[480px]">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <Badge className={cn('text-[10px] font-semibold border', statusCfg.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusCfg.label}
              </Badge>
              {listing.active_products?.map((product) => {
                const cfg = PRODUCT_CONFIG[product];
                return cfg ? (
                  <Badge key={product} className={cn('text-[10px] font-semibold border', cfg.color)}>
                    {cfg.label}
                  </Badge>
                ) : null;
              })}
            </div>

            <DrawerTitle className="text-[16px] font-semibold text-slate-900 leading-tight">
              {vehicleTitle}
            </DrawerTitle>
            <DrawerDescription className="sr-only">Detalle de publicación en ChileAutos</DrawerDescription>

            {listing.price && (
              <p className="text-[15px] font-bold text-emerald-600 mt-1">
                {formatPrice(listing.price)}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
            <div className="space-y-4">
              {/* Vehicle image */}
              {listing.vehicle?.main_image && (
                <div className="rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={listing.vehicle.main_image}
                    alt={vehicleTitle}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {/* Sync error */}
              {listing.sync_error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">Error de sincronización</span>
                  </div>
                  <p className="text-[13px] text-red-700 leading-relaxed">{listing.sync_error}</p>
                </div>
              )}

              {/* Verification result */}
              {verifyResult && (
                <div className={cn(
                  'rounded-xl p-3.5 border',
                  verifyResult.exists
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200',
                )}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {verifyResult.exists ? (
                      <>
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <span className="text-[13px] font-semibold text-emerald-700">Verificado en ChileAutos</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <span className="text-[13px] font-semibold text-amber-700">No encontrado en ChileAutos</span>
                      </>
                    )}
                  </div>
                  <p className="text-[12px] text-slate-600">
                    {verifyResult.exists
                      ? 'La publicación fue encontrada activa en el inventario de ChileAutos.'
                      : 'No se pudo verificar la publicación. Puede que haya sido removida o que aún no esté indexada (puede tardar hasta 4 horas).'}
                  </p>
                </div>
              )}

              {/* Info grid */}
              <div className="space-y-1">
                {/* ChileAutos Identifier */}
                <div className="flex items-center gap-3 px-1 py-2.5 border-b border-slate-50">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Hash className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 font-medium">Identificador ChileAutos</p>
                    <p className="text-[13px] text-slate-800 font-mono truncate">{listing.chileautos_identifier || 'Pendiente de asignar'}</p>
                  </div>
                  {listing.chileautos_identifier && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyId}>
                        {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(`https://www.chileautos.cl/details/${listing.chileautos_identifier}`, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Vehicle info */}
                {listing.vehicle?.brand?.name && (
                  <div className="flex items-center gap-3 px-1 py-2.5 border-b border-slate-50">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Car className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Vehículo</p>
                      <p className="text-[13px] text-slate-800 font-medium">
                        {listing.vehicle.brand.name} {listing.vehicle.model?.name} {listing.vehicle.year}
                      </p>
                    </div>
                  </div>
                )}

                {/* Mileage */}
                {listing.vehicle?.mileage && (
                  <div className="flex items-center gap-3 px-1 py-2.5 border-b border-slate-50">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Gauge className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Kilometraje</p>
                      <p className="text-[13px] text-slate-800 font-medium">{formatMileage(listing.vehicle.mileage)}</p>
                    </div>
                  </div>
                )}

                {/* License plate */}
                {listing.vehicle?.license_plate && (
                  <div className="flex items-center gap-3 px-1 py-2.5 border-b border-slate-50">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Patente</p>
                      <p className="text-[13px] text-slate-800 font-medium font-mono">{listing.vehicle.license_plate}</p>
                    </div>
                  </div>
                )}

                {/* Products */}
                {listing.active_products && listing.active_products.length > 0 && (
                  <div className="flex items-center gap-3 px-1 py-2.5 border-b border-slate-50">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Tag className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Productos activos</p>
                      <div className="flex gap-1 mt-0.5">
                        {listing.active_products.map((p) => (
                          <span key={p} className="text-[11px] font-medium text-slate-700 capitalize bg-slate-100 px-1.5 py-0.5 rounded">
                            {PRODUCT_CONFIG[p]?.label || p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sale status */}
                <div className="flex items-center gap-3 px-1 py-2.5 border-b border-slate-50">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Estado de venta</p>
                    <p className="text-[13px] text-slate-800 font-medium">{listing.sale_status}</p>
                  </div>
                </div>

                {/* Created at */}
                <div className="flex items-center gap-3 px-1 py-2.5 border-b border-slate-50">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Fecha de publicación</p>
                    <p className="text-[13px] text-slate-800 font-medium">
                      {format(new Date(listing.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>

                {/* Last sync */}
                {listing.last_synced_at && (
                  <div className="flex items-center gap-3 px-1 py-2.5 border-b border-slate-50">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <RefreshCw className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Última sincronización</p>
                      <p className="text-[13px] text-slate-800 font-medium">
                        {formatDistanceToNow(new Date(listing.last_synced_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Currency */}
                <div className="flex items-center gap-3 px-1 py-2.5">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Moneda</p>
                    <p className="text-[13px] text-slate-800 font-medium">{listing.currency}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0 space-y-2">
            {/* View on ChileAutos */}
            {listing.status === 'published' && listing.chileautos_identifier && (
              <Button
                variant="outline"
                className="w-full rounded-xl gap-1.5 text-[13px] text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                onClick={() => window.open(`https://www.chileautos.cl/details/${listing.chileautos_identifier}`, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver en ChileAutos
              </Button>
            )}

            {/* Editar publicación — corrige título/versión/precio/descripción sin perder fotos.
                Solo para avisos realmente publicados (un 'error' nunca llegó a publicarse,
                ahí corresponde Reintentar, no Editar). */}
            {onEdit && listing.status === 'published' && (
              <Button
                variant="outline"
                onClick={() => { onEdit(listing.vehicle_id); onOpenChange(false); }}
                className="w-full rounded-xl gap-1.5 text-[13px]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {onVerify && listing.status === 'published' && listing.chileautos_identifier && (
                <Button
                  variant="outline"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="flex-1 rounded-xl gap-1.5 text-[13px]"
                >
                  {isVerifying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {isVerifying ? 'Verificando...' : 'Verificar'}
                </Button>
              )}

              {(listing.status === 'published' || listing.status === 'error') && (
                <Button
                  variant="outline"
                  onClick={() => { onSync(listing.vehicle_id); }}
                  disabled={isSyncing}
                  className="flex-1 rounded-xl gap-1.5 text-[13px]"
                >
                  {isSyncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {listing.status === 'error' ? 'Reintentar' : 'Actualizar'}
                </Button>
              )}
            </div>

            {listing.status !== 'withdrawn' && (
              <Button
                variant="outline"
                onClick={handleRemove}
                className={cn(
                  'w-full rounded-xl gap-1.5 text-[13px] transition-all',
                  confirmRemove
                    ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 hover:text-white'
                    : 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200',
                )}
              >
                {confirmRemove ? <AlertTriangle className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                {confirmRemove ? 'Confirmar despublicar' : 'Despublicar'}
              </Button>
            )}
          </div>
        </div>
      </DrawerContentRight>
    </Drawer>
  );
}
