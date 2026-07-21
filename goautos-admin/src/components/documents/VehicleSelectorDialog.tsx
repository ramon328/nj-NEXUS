import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { LuSearch, LuCar } from 'react-icons/lu';
import type { Vehicle } from '@/types/vehicle';

interface VehicleSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (vehicle: Vehicle) => void;
  filterConsignedOnly?: boolean;
}

const VehicleSelectorDialog: React.FC<VehicleSelectorDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  filterConsignedOnly = false,
}) => {
  const { t } = useTranslation('common');
  const { clientId } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && clientId) {
      fetchVehicles();
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, clientId]);

  const fetchVehicles = async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      // 1. Vehículos del cliente.
      let query = supabase
        .from('vehicles')
        .select('id, brand:brand_id(name), model:model_id(name), year, license_plate, main_image, is_consigned')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (filterConsignedOnly) {
        query = query.eq('is_consigned', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      // 2. Cuáles de esos están vendidos (vehicles_sales NO tiene client_id: se filtra
      //    por vehicle_id, antes daba 400 al usar .eq('client_id', ...)).
      const vehicleIds = (data || []).map((v) => v.id);
      let soldIds: number[] = [];
      if (vehicleIds.length > 0) {
        const { data: soldData } = await supabase
          .from('vehicles_sales')
          .select('vehicle_id')
          .in('vehicle_id', vehicleIds);
        soldIds = (soldData || []).map((s) => s.vehicle_id);
      }

      // 3. Excluir los vendidos.
      const available = (data || []).filter((v) => !soldIds.includes(v.id));
      setVehicles(available);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) return vehicles;
    const q = searchQuery.toLowerCase();
    return vehicles.filter((v) => {
      const text = [
        v.brand?.name,
        v.model?.name,
        v.year?.toString(),
        v.license_plate,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }, [vehicles, searchQuery]);

  const handleSelect = (v: any) => {
    const vehicle: Vehicle = {
      id: v.id,
      main_image: v.main_image,
      license_plate: v.license_plate,
      year: v.year,
      is_consigned: v.is_consigned,
      brand: v.brand,
      model: v.model,
    };
    onSelect(vehicle);
  };

  const noResultsMessage = filterConsignedOnly
    ? t('documents.vehicleDocs.noConsignedVehicles')
    : t('documents.vehicleDocs.noVehiclesFound');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('documents.vehicleDocs.selectVehicle')}</DialogTitle>
          <DialogDescription>{t('documents.vehicleDocs.selectVehicleDesc')}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('documents.vehicleDocs.searchVehicle')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <LuCar className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">{noResultsMessage}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {filteredVehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  onClick={() => handleSelect(v)}
                >
                  {v.main_image ? (
                    <img
                      src={v.main_image}
                      alt=""
                      className="h-10 w-14 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-14 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <LuCar className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {v.brand?.name} {v.model?.name} {v.year}
                    </p>
                    {v.license_plate && (
                      <p className="text-xs text-gray-500">{v.license_plate}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VehicleSelectorDialog;
