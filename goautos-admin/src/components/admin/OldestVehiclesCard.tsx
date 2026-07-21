import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import OldestVehicleInfoCard from './OldestVehicleInfoCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DateFilter } from '@/hooks/admin/useSellerPerformance';
import { OldestVehicle } from '@/hooks/admin/useInventoryKpis';

interface OldestVehiclesCardProps {
  dateFilter?: DateFilter;
  /** Pre-loaded vehicles from useInventoryKpis - if provided, skip fetching */
  preloadedVehicles?: OldestVehicle[];
  /** Loading state from parent when using preloadedVehicles */
  preloadedLoading?: boolean;
  /** Whether to render with Card wrapper (default: true) */
  showCard?: boolean;
}

const OldestVehiclesCard = ({ dateFilter, preloadedVehicles, preloadedLoading, showCard = true }: OldestVehiclesCardProps) => {
  const { t: tDashboard, i18n } = useTranslation('dashboard');
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);
  const { clientId } = useAuth();
  const [fetchedVehicles, setFetchedVehicles] = useState<any[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Use preloaded data if available, otherwise use fetched data
  const usePreloaded = preloadedVehicles !== undefined;
  const vehicles = usePreloaded ? preloadedVehicles : fetchedVehicles;
  const loading = usePreloaded ? (preloadedLoading ?? false) : fetchLoading;

  useEffect(() => {
    // Skip fetching if preloaded vehicles are provided
    if (usePreloaded) {
      setFetchLoading(false);
      return;
    }

    if (!clientId) return;

    const fetchOldestVehicles = async () => {
      setFetchLoading(true);

      const id = typeof clientId === 'string' ? parseInt(clientId) : clientId;

      // Primero obtener los IDs de estados vendido/reservado/archivado
      const { data: statesData } = await supabase
        .from('clients_vehicles_states')
        .select('id, name')
        .eq('client_id', id);

      const excludedStateIds = statesData
        ?.filter((s) => {
          const name = s.name.toLowerCase();
          return name.includes('vendido') || name.includes('sold') || name.includes('reservado') || name.includes('archivado');
        })
        .map((s) => s.id) || [];

      // Obtener vehículos vendidos de la tabla vehicles_sales
      const { data: soldVehicles } = await supabase
        .from('vehicles_sales')
        .select('vehicle_id, vehicles!vehicle_id(id, client_id)')
        .eq('vehicles.client_id', id)
        .eq('status', 'approved');

      const soldVehicleIds = new Set((soldVehicles || []).map(s => s.vehicle_id));

      // Query base
      let query = supabase
        .from('vehicles')
        .select(`
          id,
          created_at,
          main_image,
          year,
          is_consigned,
          brands:brand_id (name),
          models:model_id (name)
        `)
        .eq('client_id', id);

      // Excluir estados vendido/reservado/archivado
      if (excludedStateIds.length > 0) {
        query = query.not('status_id', 'in', `(${excludedStateIds.join(',')})`);
      }

      // Aplicar filtro de consignación (igual que useInventoryKpis)
      if (dateFilter?.consignmentFilter === 'consigned') {
        query = query.eq('is_consigned', true);
      } else if (dateFilter?.consignmentFilter === 'not_consigned') {
        query = query.eq('is_consigned', false);
      }

      query = query.order('created_at', { ascending: true });

      const { data } = await query;

      // Filtrar también los que están en vehicles_sales (igual que useInventoryKpis)
      const filteredData = (data || []).filter(v => !soldVehicleIds.has(v.id));

      // Tomar solo los primeros 10
      setFetchedVehicles(filteredData.slice(0, 10));
      setFetchLoading(false);
    };

    fetchOldestVehicles();
  }, [clientId, dateFilter?.consignmentFilter, usePreloaded]);

  const loadingContent = (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      <Skeleton className='h-[180px] w-full rounded-lg' />
      <Skeleton className='h-[180px] w-full rounded-lg' />
      <Skeleton className='h-[180px] w-full rounded-lg' />
    </div>
  );

  const vehiclesContent = (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {vehicles.map((vehicle) => {
        // Use pre-calculated daysInStock if available (from preloaded data),
        // otherwise calculate it (for fetched data)
        const daysInStock = (vehicle as OldestVehicle).daysInStock ?? Math.floor(
          (Date.now() - new Date(vehicle.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return (
          <OldestVehicleInfoCard
            key={vehicle.id}
            vehicle={vehicle}
            daysInStock={daysInStock}
          />
        );
      })}
    </div>
  );

  if (loading) {
    if (!showCard) {
      return loadingContent;
    }
    return (
      <Card className='flex flex-col h-[600px]'>
        <CardHeader className='flex-shrink-0'>
          <p className='text-xl font-medium'>
            {dv('Vehículos con Más Días en Stock', 'Vehicles with Most Days in Stock')}
          </p>
        </CardHeader>
        <CardContent className='flex-1 overflow-y-auto'>
          {loadingContent}
        </CardContent>
      </Card>
    );
  }

  if (vehicles.length === 0) {
    return null;
  }

  if (!showCard) {
    return vehiclesContent;
  }

  return (
    <Card className='flex flex-col h-[600px]'>
      <CardHeader className='flex-shrink-0'>
        <p className='text-xl font-medium'>
          {dv('Vehículos con Más Días en Stock', 'Vehicles with Most Days in Stock')}
        </p>
      </CardHeader>
      <CardContent className='flex-1 overflow-y-auto'>
        {vehiclesContent}
      </CardContent>
    </Card>
  );
};

export default OldestVehiclesCard;
