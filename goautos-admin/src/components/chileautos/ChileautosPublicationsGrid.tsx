import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Loader2,
  Globe,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  Hash,
  ChevronRight,
  Car,
  Search,
  Filter,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChileautosListing } from '@/types/chileautos';
import { formatPrice, formatMileage } from './ChileautosVehicleCard';

interface ChileautosPublicationsGridProps {
  publications: ChileautosListing[];
  isLoading?: boolean;
  onRemove: (vehicleId: number) => void;
  onSync: (vehicleId: number) => void;
  isUpdating?: boolean;
  onListingClick?: (listing: ChileautosListing) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: typeof CheckCircle2 }> = {
  published: { label: 'Publicado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle2 },
  pending: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: Clock },
  error: { label: 'Error', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', icon: AlertCircle },
  sold: { label: 'Vendido', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: DollarSign },
  withdrawn: { label: 'Retirado', color: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400', icon: AlertTriangle },
};

const PRODUCT_LABELS: Record<string, string> = {
  premium: 'Premium',
  topspot: 'Top Spot',
  showcase: 'Showcase',
  certificado: 'Certificado',
};

export const ChileautosPublicationsGrid = ({
  publications,
  isLoading,
  onRemove,
  onSync,
  isUpdating,
  onListingClick,
}: ChileautosPublicationsGridProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredPublications = useMemo(() => {
    if (!publications) return [];
    const term = searchTerm.trim().toLowerCase();
    return publications.filter((listing) => {
      if (statusFilter !== 'all' && listing.status !== statusFilter) {
        return false;
      }
      if (term) {
        const haystack = [
          listing.title,
          listing.vehicle?.brand?.name,
          listing.vehicle?.model?.name,
          listing.vehicle?.year,
          listing.vehicle?.license_plate,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [publications, searchTerm, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!publications || publications.length === 0) {
    return (
      <div className="text-center py-12">
        <Globe className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Sin publicaciones</h3>
        <p className="mt-1 text-sm text-gray-500">Aún no has publicado vehículos en ChileAutos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: search + status filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar marca, modelo o patente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className={cn('w-auto px-2.5 gap-1 shrink-0', statusFilter !== 'all' && 'border-sky-400')}
            aria-label="Filtrar por estado"
          >
            <Filter className={cn('h-4 w-4', statusFilter !== 'all' ? 'text-sky-500' : 'text-gray-400')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                  {cfg.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Publications list */}
      <div className="space-y-1.5">
        {filteredPublications.map((listing) => {
          const statusCfg = STATUS_CONFIG[listing.status] || STATUS_CONFIG.pending;
          const vehicleTitle = listing.title || `${listing.vehicle?.brand?.name || ''} ${listing.vehicle?.model?.name || ''} ${listing.vehicle?.year || ''}`.trim();

          return (
            <button
              key={listing.id}
              onClick={() => onListingClick?.(listing)}
              className="w-full text-left rounded-xl p-3 sm:p-4 border border-slate-200/60 bg-white hover:bg-slate-50 active:bg-slate-100 transition-all group"
            >
              <div className="flex items-start gap-3">
                {/* Image */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  {listing.vehicle?.main_image ? (
                    <img
                      src={listing.vehicle.main_image}
                      alt={vehicleTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="h-6 w-6 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[13px] sm:text-[14px] font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {vehicleTitle}
                      </h3>
                      <p className="text-[13px] font-bold text-emerald-600 mt-0.5">
                        {formatPrice(listing.price)}
                        {listing.vehicle?.mileage ? (
                          <span className="font-normal text-slate-400 ml-2">{formatMileage(listing.vehicle.mileage)}</span>
                        ) : null}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 mt-0.5 flex-shrink-0 transition-colors" />
                  </div>

                  {/* Badges row */}
                  <div className="flex items-center flex-wrap gap-1 mt-1.5">
                    <Badge className={cn('text-[10px] font-semibold border', statusCfg.color)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full mr-1', statusCfg.dot)} />
                      {statusCfg.label}
                    </Badge>
                    {listing.active_products?.map((p) => (
                      <Badge key={p} variant="outline" className="text-[10px] font-medium text-slate-500 border-slate-200">
                        {PRODUCT_LABELS[p] || p}
                      </Badge>
                    ))}
                    {listing.vehicle?.license_plate && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                        {listing.vehicle.license_plate}
                      </span>
                    )}
                  </div>

                  {/* Bottom row: identifier + sync info */}
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                    {listing.chileautos_identifier && (
                      <span className="flex items-center gap-1 font-mono">
                        <Hash className="h-2.5 w-2.5" />
                        {listing.chileautos_identifier.slice(0, 8)}...
                      </span>
                    )}
                    {listing.last_synced_at && (
                      <>
                        <span className="text-slate-200">·</span>
                        <span>
                          Sync {formatDistanceToNow(new Date(listing.last_synced_at), { addSuffix: true, locale: es })}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Sync error inline */}
                  {listing.sync_error && (
                    <div className="flex items-start gap-1 mt-1.5">
                      <AlertCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-red-500 truncate">{listing.sync_error}</p>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Empty filtered results */}
      {filteredPublications.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-500">
          No se encontraron publicaciones con los filtros aplicados.
        </div>
      )}
    </div>
  );
};
