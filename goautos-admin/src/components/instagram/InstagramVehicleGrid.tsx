import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Car, Filter } from 'lucide-react';
import { useStatuses } from '@/hooks/useStatuses';
import { formatPrice, formatMileage } from '@/utils/facebookMarketplaceMapper';
import { CreateInstagramPostDrawer } from './CreateInstagramPostDrawer';
import { Vehicle } from '@/types/vehicle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function InstagramVehicleGrid() {
  const { t } = useTranslation('common');
  const { clientId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { statuses } = useStatuses();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles-for-ig-publish', clientId],
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
          gallery,
          description,
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
      return data || [];
    },
    enabled: !!clientId,
  });

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];

    return vehicles.filter((v) => {
      const statusName = (v.status as any)?.name?.toLowerCase();
      if (statusName === 'vendido' || statusName === 'sold') return false;

      if (statusFilter !== 'all' && v.status_id?.toString() !== statusFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const searchString = `${v.year} ${(v.brand as any)?.name} ${(v.model as any)?.name}`.toLowerCase();
        if (!searchString.includes(term)) return false;
      }

      return true;
    });
  }, [vehicles, searchTerm, statusFilter]);

  const handleVehicleClick = (vehicle: any) => {
    setSelectedVehicle(vehicle as Vehicle);
    setIsDrawerOpen(true);
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">{t('instagram.vehicleGrid.noVehicles')}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {t('instagram.vehicleGrid.noVehiclesDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('instagram.vehicleGrid.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2 text-gray-400" />
            <SelectValue placeholder={t('instagram.vehicleGrid.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('instagram.vehicleGrid.allStatuses')}</SelectItem>
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

      {/* Vehicle grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredVehicles.map((vehicle) => {
          const brand = vehicle.brand as any;
          const model = vehicle.model as any;
          const status = vehicle.status as any;

          return (
            <Card
              key={vehicle.id}
              className='relative cursor-pointer transition-all hover:shadow-md'
              onClick={() => handleVehicleClick(vehicle)}
            >
              {/* Status badge */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 items-end">
                {status && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-semibold shadow-sm border"
                    style={{
                      backgroundColor: status.color || '#6b7280',
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {status.name}
                  </Badge>
                )}
              </div>

              {/* Vehicle image */}
              <div className="aspect-[4/3] overflow-hidden rounded-t-lg bg-gray-100">
                {vehicle.main_image ? (
                  <img
                    src={vehicle.main_image}
                    alt={`${brand?.name} ${model?.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Car className="w-12 h-12" />
                  </div>
                )}
              </div>

              <CardContent className="p-3">
                <h3 className="font-medium text-sm truncate">
                  {vehicle.year} {brand?.name} {model?.name}
                </h3>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{formatMileage(vehicle.mileage)}</span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(vehicle.price)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty filter results */}
      {filteredVehicles.length === 0 && (searchTerm || statusFilter !== 'all') && (
        <div className="text-center py-8 text-gray-500">
          {t('instagram.vehicleGrid.noFilterResults')}
        </div>
      )}

      {/* Instagram Post Drawer */}
      {selectedVehicle && (
        <CreateInstagramPostDrawer
          vehicle={selectedVehicle}
          open={isDrawerOpen}
          onOpenChange={(open) => {
            setIsDrawerOpen(open);
            if (!open) setSelectedVehicle(null);
          }}
        />
      )}
    </div>
  );
}
