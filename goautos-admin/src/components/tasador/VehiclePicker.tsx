import { useState, useEffect, useMemo, useRef } from 'react';
import { Package, Search, Car, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryVehicle {
  id: number;
  year: number;
  price: number;
  mileage: number;
  main_image: string | null;
  brand: { name: string } | null;
  model: { name: string } | null;
  transmission: string | null;
  fuel_type: { name: string } | null;
}

interface VehiclePickerProps {
  onSelect: (query: string, vehicleId?: number) => void;
}

const VehiclePicker = ({ onSelect }: VehiclePickerProps) => {
  const { clientId } = useAuth();
  const [vehicles, setVehicles] = useState<InventoryVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!clientId) return;

    const fetch = async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id, year, price, mileage, main_image, transmission,
          brand:brand_id(name),
          model:model_id(name),
          fuel_type:fuel_type_id(name)
        `)
        .eq('client_id', clientId)
        .eq('show_in_stock', true)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        setVehicles(data as unknown as InventoryVehicle[]);
      }
      setLoading(false);
    };

    fetch();
  }, [clientId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles.slice(0, 8);
    const terms = search.toLowerCase().split(/\s+/);
    return vehicles
      .filter((v) => {
        const text = `${v.brand?.name || ''} ${v.model?.name || ''} ${v.year} ${v.mileage}`.toLowerCase();
        return terms.every((t) => text.includes(t));
      })
      .slice(0, 8);
  }, [vehicles, search]);

  const buildQuery = (v: InventoryVehicle) => {
    const parts: string[] = [];
    if (v.brand?.name) parts.push(v.brand.name);
    if (v.model?.name) parts.push(v.model.name);
    if (v.year) parts.push(String(v.year));
    if (v.mileage && v.mileage > 0) parts.push(`con ${v.mileage.toLocaleString('es-CL')} km`);
    if (v.transmission) {
      parts.push(v.transmission === 'automatic' ? 'automático' : v.transmission === 'manual' ? 'mecánico' : '');
    }
    return parts.filter(Boolean).join(' ');
  };

  const handleSelect = (v: InventoryVehicle) => {
    const query = buildQuery(v);
    setIsOpen(false);
    setSearch('');
    onSelect(query, v.id);
  };

  if (loading || vehicles.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="group flex items-center gap-3 w-full p-3.5 text-left bg-white border border-gray-200/60 rounded-xl hover:border-primary/30 hover:shadow-sm transition-all"
      >
        <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
          <Package className="w-4 h-4 text-sky-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">
            Tasar desde inventario
          </p>
          <p className="text-xs text-gray-500">{vehicles.length} vehículos en stock</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors shrink-0" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          >
            {/* Search input */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar en tu inventario..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Vehicle list */}
            <div className="max-h-[320px] overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No se encontraron vehículos</p>
              ) : (
                filtered.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleSelect(v)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                  >
                    {v.main_image ? (
                      <img
                        src={v.main_image}
                        alt=""
                        className="w-12 h-9 rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-9 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate group-hover:text-primary transition-colors">
                        {v.brand?.name} {v.model?.name} {v.year}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {v.mileage > 0 ? `${v.mileage.toLocaleString('es-CL')} km` : 'Sin km'}
                        {v.price > 0 && ` · $${v.price.toLocaleString('es-CL')}`}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VehiclePicker;
