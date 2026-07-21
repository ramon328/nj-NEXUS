import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { LuSearch, LuCar } from 'react-icons/lu';
import type { Vehicle } from '@/types/vehicle';

interface VehicleSelectionStepProps {
  onSelect: (vehicle: Vehicle) => void;
  filterConsignedOnly?: boolean;
  /** Exclude vehicles that already have a document of this type (e.g. 'sale', 'reservation', 'close_deal') */
  excludeWithDocumentType?: string;
}

const VehicleSelectionStep: React.FC<VehicleSelectionStepProps> = ({
  onSelect,
  filterConsignedOnly = false,
  excludeWithDocumentType,
}) => {
  const { t } = useTranslation('common');
  const { clientId } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (clientId) {
      fetchVehicles();
    }
  }, [clientId]);

  const fetchVehicles = async () => {
    if (!clientId) return;
    setIsLoading(true);
    try {
      // Exclude sold vehicles
      const { data: soldData } = await supabase
        .from('vehicles_sales')
        .select('vehicle_id')
        .eq('client_id', clientId);

      const soldIds = soldData?.map((s) => s.vehicle_id) || [];

      // Exclude vehicles that already have a document of the specified type
      let docExcludeIds: number[] = [];
      if (excludeWithDocumentType) {
        const { data: docData } = await supabase
          .from('vehicles_documents')
          .select('vehicle_id')
          .eq('client_id', clientId)
          .eq('type', excludeWithDocumentType);
        docExcludeIds = docData?.map((d) => d.vehicle_id) || [];
      }

      const excludeIds = [...new Set([...soldIds, ...docExcludeIds])];

      let query = supabase
        .from('vehicles')
        .select('id, brand:brand_id(name), model:model_id(name), year, license_plate, main_image, is_consigned, min_price')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (filterConsignedOnly) {
        query = query.eq('is_consigned', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      const available = (data || []).filter((v) => !excludeIds.includes(v.id));
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
    <div>
      <div className="sticky -top-3 -mx-3 px-3 pt-3 pb-2 z-10 bg-background">
        <div className="relative">
          <LuSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder={t('documents.vehicleDocs.searchVehicle')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-7 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <LuCar className="h-6 w-6 text-gray-300 mb-1" />
          <p className="text-xs text-gray-500">{noResultsMessage}</p>
        </div>
      ) : (
        <div className="space-y-0.5">
            {filteredVehicles.map((v) => (
              <button
                key={v.id}
                type="button"
                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                onClick={() => handleSelect(v)}
              >
                {v.main_image ? (
                  <img
                    src={v.main_image}
                    alt=""
                    className="h-8 w-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-8 w-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <LuCar className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {v.brand?.name} {v.model?.name} {v.year}
                  </p>
                  {v.license_plate && (
                    <p className="text-[11px] text-gray-500">{v.license_plate}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
      )}
    </div>
  );
};

export default VehicleSelectionStep;
