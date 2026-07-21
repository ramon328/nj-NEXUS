import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Vehicle } from '@/types/vehicle';
import { useAuth } from '@/contexts/AuthContext';

interface VehicleSellerEditDialogProps {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  onSuccess: (updatedVehicle: Vehicle) => void;
}

interface Seller {
  id: number;
  first_name: string;
  last_name: string;
}

const VehicleSellerEditDialog = ({
  open,
  onClose,
  vehicle,
  onSuccess,
}: VehicleSellerEditDialogProps) => {
  const { toast } = useToast();
  const { clientId } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(
    vehicle?.seller_id ? vehicle.seller_id.toString() : null
  );
  const [isLoading, setIsLoading] = useState(false);

  // Fetch sellers solo cuando el dialog se abre (no en cada cambio de
  // referencia de la prop `vehicle`, que ocurre con cada refetch de la tabla).
  useEffect(() => {
    if (open && clientId) fetchSellers();
  }, [open, clientId]);

  // Sincronizar el seller seleccionado cuando cambia el vehículo abierto.
  useEffect(() => {
    setSelectedSellerId(
      vehicle?.seller_id ? vehicle.seller_id.toString() : null
    );
  }, [open, vehicle?.id, vehicle?.seller_id]);

  const fetchSellers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('client_id', clientId)
        .in('rol', ['seller', 'vendedor'])
        .order('first_name', { ascending: true });

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los vendedores',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!vehicle?.id || !clientId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update({
          seller_id: selectedSellerId ? parseInt(selectedSellerId) : null,
        })
        .eq('id', vehicle.id)
        .select(
          `
          *,
          brand:brand_id(id, name),
          model:model_id(id, name),
          status:status_id(id, name, color),
          seller:seller_id(id, first_name, last_name)
        `
        )
        .single();

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Vendedor actualizado correctamente',
      });

      // Cerrar el modal y pasar el vehículo actualizado
      onSuccess(data);
    } catch (error) {
      console.error('Error al actualizar vendedor:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el vendedor',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSave();
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className='sm:max-w-md'
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Cambiar Vendedor</DialogTitle>
        </DialogHeader>

        <div className='py-4'>
          <p className='text-sm text-gray-500 mb-4'>
            Vehículo: {vehicle?.brand?.name} {vehicle?.model?.name} (
            {vehicle?.year})
          </p>

          <Select
            value={selectedSellerId || '_none'}
            onValueChange={(value) =>
              setSelectedSellerId(value === '_none' ? null : value)
            }
            disabled={isLoading}
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Seleccionar vendedor' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='_none'>Sin vendedor asignado</SelectItem>
              {sellers.map((seller) => (
                <SelectItem key={seller.id} value={seller.id.toString()}>
                  {seller.first_name} {seller.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={handleCancelClick}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSaveClick} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleSellerEditDialog;
