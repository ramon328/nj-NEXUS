import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChileautosVehicleCard } from './ChileautosVehicleCard';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, Car, Filter } from 'lucide-react';
import { useStatuses } from '@/hooks/useStatuses';
import VehiclePreviewSheet from '@/components/vehiculos/board/VehiclePreviewSheet';
import { Vehicle } from '@/types/vehicle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

interface ChileautosVehicleSelectorProps {
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  publishedVehicleIds?: number[];
  disabled?: boolean;
  onPublishSuccess?: () => void;
  onPublishClick?: (vehicleId: number) => void;
}

export const ChileautosVehicleSelector = ({
  selectedIds,
  onSelectionChange,
  publishedVehicleIds = [],
  disabled = false,
  onPublishSuccess,
  onPublishClick,
}: ChileautosVehicleSelectorProps) => {
  const { clientId } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewVehicle, setPreviewVehicle] = useState<Vehicle | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { statuses } = useStatuses();

  // Fetch vehicles with full data for preview
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles-for-chileautos-publish', clientId, publishedVehicleIds],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          vehicle_type,
          year,
          price,
          mileage,
          main_image,
          license_plate,
          transmission,
          fuel_type_id,
          discount_percentage,
          label,
          state_updated_at,
          status_id,
          brand:brand_id(id, name),
          model:model_id(id, name),
          status:status_id(id, name, color),
          fuel_type:fuel_type_id(id, name),
          category:category_id(id, name)
        `)
        .in('vehicle_type', ['car', 'truck'])
        .eq('client_id', clientId)
        .eq('show_in_stock', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(v => ({
        ...v,
        brand_name: v.brand?.name,
        model_name: v.model?.name,
        isPublished: publishedVehicleIds.includes(v.id),
      }));
    },
    enabled: !!clientId,
  });

  // Handle preview - open publish sheet directly for unpublished vehicles
  const handlePreview = (vehicle: any) => {
    if (!vehicle.isPublished && onPublishClick) {
      onPublishClick(vehicle.id);
      return;
    }
    setPreviewVehicle(vehicle as Vehicle);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewVehicle(null);
  };

  const handleViewDetails = (vehicleId: number) => {
    window.open(`/vehiculos/${vehicleId}`, '_blank');
  };

  // Filter vehicles based on search and status (excluding sold vehicles)
  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];

    return vehicles.filter(v => {
      // Exclude sold vehicles
      const statusName = v.status?.name?.toLowerCase();
      if (statusName === 'vendido' || statusName === 'sold') {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && v.status_id?.toString() !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const searchString = `${v.year} ${v.brand_name} ${v.model_name} ${v.license_plate || ''}`.toLowerCase();
        if (!searchString.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [vehicles, searchTerm, statusFilter]);

  // Get available (not published) vehicles
  const availableVehicles = useMemo(() => {
    return filteredVehicles.filter(v => !v.isPublished);
  }, [filteredVehicles]);

  // Handle select/deselect
  const handleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  // Handle select all available
  const handleSelectAll = () => {
    const allAvailableIds = availableVehicles.map(v => v.id);
    if (selectedIds.length === allAvailableIds.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allAvailableIds);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="text-center py-12">
        <Car className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Sin vehículos
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          No hay vehículos disponibles para publicar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search, filter and select all */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row flex-1 gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar marca, modelo o patente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status filter (icon only) */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className={`w-auto px-2.5 gap-1 shrink-0 ${statusFilter !== 'all' ? 'border-sky-400' : ''}`}
                aria-label="Filtrar por estado"
              >
                <Filter className={`h-4 w-4 ${statusFilter !== 'all' ? 'text-sky-500' : 'text-gray-400'}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: status.color || '#6b7280' }}
                      />
                      {status.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select all and counter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all-ca"
                checked={availableVehicles.length > 0 && selectedIds.length === availableVehicles.length}
                onCheckedChange={handleSelectAll}
                disabled={disabled || availableVehicles.length === 0}
              />
              <label
                htmlFor="select-all-ca"
                className="text-sm text-gray-600 cursor-pointer"
              >
                Seleccionar todos
              </label>
            </div>

            {selectedIds.length > 0 && (
              <span className="text-sm font-medium text-orange-600">
                {selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="font-semibold text-slate-900 tabular-nums">{filteredVehicles.length}</span>
          encontrados
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-semibold text-slate-900 tabular-nums">{filteredVehicles.filter(v => v.isPublished).length}</span>
          publicados
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
          <span className="font-semibold text-slate-900 tabular-nums">{availableVehicles.length}</span>
          disponibles
        </span>
      </div>

      {/* Vehicle grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
        {filteredVehicles.map((vehicle) => (
          <ChileautosVehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            isSelected={selectedIds.includes(vehicle.id)}
            onSelect={handleSelect}
            onPreview={handlePreview}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Empty search results */}
      {filteredVehicles.length === 0 && (searchTerm || statusFilter !== 'all') && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron vehículos con los filtros aplicados
        </div>
      )}

      {/* Vehicle Preview Sheet */}
      <VehiclePreviewSheet
        vehicle={previewVehicle}
        open={isPreviewOpen}
        onClose={handleClosePreview}
        onViewDetails={handleViewDetails}
        selectionMode={true}
        chileautosMode={true}
        isSelected={previewVehicle ? selectedIds.includes(previewVehicle.id) : false}
        onSelect={(id) => {
          handleSelect(id);
        }}
        isPublished={(previewVehicle as any)?.isPublished || false}
        onChileautosPublishSuccess={() => {
          handleClosePreview();
          // Invalidate both listings and vehicle queries to update the UI
          queryClient.invalidateQueries({ queryKey: ['chileautos-listings'] });
          queryClient.invalidateQueries({ queryKey: ['vehicles-for-chileautos-publish'] });
          onPublishSuccess?.();
        }}
      />
    </div>
  );
};
