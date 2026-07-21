import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VehicleSelectCard } from './VehicleSelectCard';
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
  SelectValue,
} from '@/components/ui/select';

interface VehicleCardSelectorProps {
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  publishedVehicleIds?: number[];
  disabled?: boolean;
}

export const VehicleCardSelector = ({
  selectedIds,
  onSelectionChange,
  publishedVehicleIds = [],
  disabled = false,
}: VehicleCardSelectorProps) => {
  const { clientId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewVehicle, setPreviewVehicle] = useState<Vehicle | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { statuses } = useStatuses();

  // Fetch vehicles with full data for preview
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles-for-fb-publish', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
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

  // Handle preview
  const handlePreview = (vehicle: any) => {
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
        const searchString = `${v.year} ${v.brand_name} ${v.model_name}`.toLowerCase();
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
          <div className="flex flex-1 gap-3 w-full sm:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar vehículo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Filtrar por estado" />
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
                id="select-all"
                checked={availableVehicles.length > 0 && selectedIds.length === availableVehicles.length}
                onCheckedChange={handleSelectAll}
                disabled={disabled || availableVehicles.length === 0}
              />
              <label
                htmlFor="select-all"
                className="text-sm text-gray-600 cursor-pointer"
              >
                Seleccionar todos
              </label>
            </div>

            {selectedIds.length > 0 && (
              <span className="text-sm font-medium text-blue-600">
                {selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Vehicle grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredVehicles.map((vehicle) => (
          <VehicleSelectCard
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

      {/* Vehicle Preview Sheet - with selection mode for Facebook */}
      <VehiclePreviewSheet
        vehicle={previewVehicle}
        open={isPreviewOpen}
        onClose={handleClosePreview}
        onViewDetails={handleViewDetails}
        selectionMode={true}
        isSelected={previewVehicle ? selectedIds.includes(previewVehicle.id) : false}
        onSelect={(id) => {
          handleSelect(id);
        }}
        isPublished={(previewVehicle as any)?.isPublished || false}
      />
    </div>
  );
};
