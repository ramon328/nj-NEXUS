import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type VehicleHistoryEntry = {
  type: 'sale' | 'purchase' | 'consignment';
  vehicleId: number;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  date: string;
};

export const useCustomerVehicleHistory = (customerId: number | null) => {
  const { clientId } = useAuth();
  const [history, setHistory] = useState<VehicleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId || !clientId) {
      setHistory([]);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const entries: VehicleHistoryEntry[] = [];

        // Fetch sales (vehicles sold TO this customer)
        const { data: sales } = await supabase
          .from('vehicles_sales')
          .select(`
            sale_date,
            vehicle_id,
            vehicles:vehicle_id (
              id,
              license_plate,
              year,
              client_id,
              brands:brand_id (name),
              models:model_id (name)
            )
          `)
          .eq('customer_id', customerId)
          .eq('status', 'approved');

        (sales || []).forEach((s: any) => {
          if (s.vehicles?.client_id === clientId) {
            entries.push({
              type: 'sale',
              vehicleId: s.vehicles.id,
              brand: s.vehicles.brands?.name || '',
              model: s.vehicles.models?.name || '',
              year: s.vehicles.year || 0,
              licensePlate: s.vehicles.license_plate || '',
              date: s.sale_date,
            });
          }
        });

        // Fetch purchases (vehicles bought FROM this customer)
        const { data: purchases } = await supabase
          .from('vehicles_purchases')
          .select(`
            purchase_date,
            vehicle_id,
            vehicles:vehicle_id (
              id,
              license_plate,
              year,
              client_id,
              brands:brand_id (name),
              models:model_id (name)
            )
          `)
          .eq('customer_id', customerId);

        (purchases || []).forEach((p: any) => {
          if (p.vehicles?.client_id === clientId) {
            entries.push({
              type: 'purchase',
              vehicleId: p.vehicles.id,
              brand: p.vehicles.brands?.name || '',
              model: p.vehicles.models?.name || '',
              year: p.vehicles.year || 0,
              licensePlate: p.vehicles.license_plate || '',
              date: p.purchase_date,
            });
          }
        });

        // Fetch consignments (vehicles consigned BY this customer)
        const { data: consignments } = await supabase
          .from('vehicles_consignments')
          .select(`
            created_at,
            vehicle_id,
            vehicles:vehicle_id (
              id,
              license_plate,
              year,
              client_id,
              brands:brand_id (name),
              models:model_id (name)
            )
          `)
          .eq('customer_id', customerId);

        (consignments || []).forEach((c: any) => {
          if (c.vehicles?.client_id === clientId) {
            entries.push({
              type: 'consignment',
              vehicleId: c.vehicles.id,
              brand: c.vehicles.brands?.name || '',
              model: c.vehicles.models?.name || '',
              year: c.vehicles.year || 0,
              licensePlate: c.vehicles.license_plate || '',
              date: c.created_at,
            });
          }
        });

        // Sort by date descending
        entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistory(entries);
      } catch (error) {
        console.error('Error fetching customer vehicle history:', error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [customerId, clientId]);

  return { history, loading };
};
