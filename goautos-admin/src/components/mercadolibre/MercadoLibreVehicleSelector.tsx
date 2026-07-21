import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Car, ShoppingCart, Globe } from 'lucide-react';

interface MercadoLibreVehicleSelectorProps {
  onSelect: (vehicleId: number) => void;
  publishedVehicleIds: number[];
  disabled?: boolean;
}

const MercadoLibreVehicleSelector: React.FC<MercadoLibreVehicleSelectorProps> = ({
  onSelect,
  publishedVehicleIds,
  disabled,
}) => {
  const { clientId } = useAuth();
  const [search, setSearch] = useState('');

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['ml-vehicle-selector', clientId],
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
          brand:brand_id(name),
          model:model_id(name),
          status:status_id(name, color)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const filteredVehicles = (vehicles || []).filter((v: any) => {
    const statusName = v.status?.name?.toLowerCase() || '';
    if (statusName.includes('vendido') || statusName.includes('sold')) return false;

    if (!search) return true;
    const term = search.toLowerCase();
    const brand = v.brand?.name?.toLowerCase() || '';
    const model = v.model?.name?.toLowerCase() || '';
    const year = v.year?.toString() || '';
    return brand.includes(term) || model.includes(term) || year.includes(term);
  });

  const availableCount = filteredVehicles.filter(
    (v: any) => !publishedVehicleIds.includes(v.id)
  ).length;
  const publishedCount = filteredVehicles.filter(
    (v: any) => publishedVehicleIds.includes(v.id)
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        Cargando vehículos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por marca, modelo o año..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
          <span>{availableCount} disponibles</span>
          <span>·</span>
          <span>{publishedCount} publicados</span>
        </div>
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No se encontraron vehículos
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredVehicles.map((vehicle: any) => {
            const isPublished = publishedVehicleIds.includes(vehicle.id);
            const brand = vehicle.brand?.name || '';
            const model = vehicle.model?.name || '';
            const year = vehicle.year || '';
            const price = vehicle.price
              ? new Intl.NumberFormat('es-CL', {
                  style: 'currency',
                  currency: 'CLP',
                  maximumFractionDigits: 0,
                }).format(vehicle.price)
              : '-';

            return (
              <div
                key={vehicle.id}
                onClick={() => !isPublished && !disabled && onSelect(vehicle.id)}
                className={`relative rounded-xl border overflow-hidden transition-all ${
                  isPublished
                    ? 'opacity-60 cursor-not-allowed border-gray-200'
                    : 'cursor-pointer hover:shadow-md hover:border-yellow-400 border-gray-200'
                } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
              >
                <div className="aspect-[4/3] bg-gray-100">
                  {vehicle.main_image ? (
                    <img
                      src={vehicle.main_image}
                      alt={`${brand} ${model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>

                {isPublished && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-500 text-white text-[10px] gap-1">
                      <ShoppingCart className="h-3 w-3" />
                      En ML
                    </Badge>
                  </div>
                )}

                {vehicle.status && (
                  <div className="absolute top-2 left-2">
                    <Badge
                      className="text-[10px] text-white gap-1"
                      style={{ backgroundColor: vehicle.status.color || '#6b7280' }}
                      title="Estado en tu sitio web (no en MercadoLibre)"
                    >
                      <Globe className="h-3 w-3" />
                      {vehicle.status.name}
                    </Badge>
                  </div>
                )}

                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {brand} {model} {year}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{price}</p>
                  {vehicle.mileage && (
                    <p className="text-[10px] text-gray-400">
                      {Number(vehicle.mileage).toLocaleString('es-CL')} km
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MercadoLibreVehicleSelector;
