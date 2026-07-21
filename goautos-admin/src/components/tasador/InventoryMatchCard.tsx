import { useState, useEffect } from 'react';
import { Package, ExternalLink, Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { VehicleDetails } from '@/types/tasador';
import { formatPrice } from './utils';

interface InventoryMatchCardProps {
  vehicleDetails: VehicleDetails;
}

interface MatchedVehicle {
  id: number;
  year: number;
  price: number;
  mileage: number;
  main_image: string | null;
  brand: { name: string } | null;
  model: { name: string } | null;
  status: { name: string; color: string } | null;
}

const InventoryMatchCard = ({ vehicleDetails }: InventoryMatchCardProps) => {
  const { clientId } = useAuth();
  const [matches, setMatches] = useState<MatchedVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId || !vehicleDetails.brand || !vehicleDetails.model) {
      setLoading(false);
      return;
    }

    const fetchMatches = async () => {
      try {
        // First get the brand ID
        const { data: brandData } = await supabase
          .from('brands')
          .select('id')
          .ilike('name', vehicleDetails.brand)
          .limit(1)
          .single();

        if (!brandData) {
          setLoading(false);
          return;
        }

        // Then get matching model ID
        const { data: modelData } = await supabase
          .from('models')
          .select('id')
          .eq('brand_id', brandData.id)
          .ilike('name', `%${vehicleDetails.model}%`)
          .limit(1)
          .single();

        // Query vehicles
        let query = supabase
          .from('vehicles')
          .select(`
            id, year, price, mileage, main_image,
            brand:brand_id(name),
            model:model_id(name),
            status:status_id(name, color)
          `)
          .eq('client_id', clientId)
          .eq('brand_id', brandData.id)
          .eq('show_in_stock', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (modelData) {
          query = query.eq('model_id', modelData.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setMatches((data as unknown as MatchedVehicle[]) || []);
      } catch (err) {
        console.error('Error fetching inventory matches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [clientId, vehicleDetails.brand, vehicleDetails.model]);

  if (loading) return null;
  if (matches.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
          <Package className="h-4 w-4 text-sky-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">En tu inventario</p>
          <p className="text-xs text-gray-500">
            {matches.length} {matches.length === 1 ? 'unidad similar' : 'unidades similares'} en stock
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {matches.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
          >
            {v.main_image ? (
              <img
                src={v.main_image}
                alt=""
                className="w-14 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-14 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                <Car className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {v.brand?.name} {v.model?.name} {v.year}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {v.mileage > 0 && <span>{v.mileage.toLocaleString('es-CL')} km</span>}
                {v.status && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      backgroundColor: `${v.status.color}15`,
                      color: v.status.color,
                    }}
                  >
                    {v.status.name}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-gray-900">{formatPrice(v.price)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryMatchCard;
