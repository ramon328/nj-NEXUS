import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PriceInput from '@/components/ui/inputs/price-input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { useChileautosAutoSync } from '@/hooks/chileautos/useChileautosAutoSync';
import { useMercadolibreAutoSync } from '@/hooks/mercadolibre/useMercadolibreAutoSync';

interface VehiclePriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: number;
  isConsigned: boolean;
  acquisitionData: {
    id?: number;
    agreed_price?: number;
    agreed_price_final?: number;
    purchase_price?: number;
    reservation_agreed_price?: number;
  } | null;
  vehiclePrice: number;
  minPrice?: number | null;
  discountPercentage?: number;
  saleData: {
    id?: number;
    sale_price?: number;
  } | null;
  onUpdate: () => void;
}

const VehiclePriceEditModal = ({
  isOpen,
  onClose,
  vehicleId,
  isConsigned,
  acquisitionData,
  vehiclePrice,
  minPrice,
  discountPercentage,
  saleData,
  onUpdate,
}: VehiclePriceEditModalProps) => {
  const { clientId } = useAuth();
  const { hasPermission } = usePermissions();
  const isSeller = !hasPermission(PermissionCode.SALES_VIEW);
  const { triggerUpdateSync } = useChileautosAutoSync();
  const { triggerPriceSync } = useMercadolibreAutoSync();

  const [isLoading, setIsLoading] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [publishedPrice, setPublishedPrice] = useState<number>(0);
  const [minPriceValue, setMinPriceValue] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [agreedPriceFinal, setAgreedPriceFinal] = useState<number>(0);
  const [discountValue, setDiscountValue] = useState<number>(0);
  // IVA del vehículo: 'inherit' (default del cliente) | 'exento' | 'afecto'.
  const [ivaMode, setIvaMode] = useState<'inherit' | 'exento' | 'afecto'>('inherit');

  // Inicializar valores cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setPurchasePrice(
        isConsigned
          ? Number(acquisitionData?.agreed_price || 0)
          : Number(acquisitionData?.purchase_price || 0)
      );
      setPublishedPrice(Number(vehiclePrice || 0));
      setMinPriceValue(Number(minPrice || 0));
      setSalePrice(Number(saleData?.sale_price || 0));
      setAgreedPriceFinal(Number(acquisitionData?.agreed_price_final || 0));
      setDiscountValue(Number(discountPercentage || 0));
      // Leer el flag de IVA actual del vehículo (null → 'inherit').
      supabase
        .from('vehicles')
        .select('iva_exento')
        .eq('id', vehicleId)
        .maybeSingle()
        .then(({ data }) => {
          const v = (data as any)?.iva_exento;
          setIvaMode(v == null ? 'inherit' : v ? 'exento' : 'afecto');
        });
    }
  }, [isOpen, isConsigned, acquisitionData, vehiclePrice, minPrice, discountPercentage, saleData, vehicleId]);

  const validatePrices = () => {
    const finalPurchasePrice = Math.max(0, Number(purchasePrice || 0));
    const finalPublishedPrice = Math.max(0, Number(publishedPrice || 0));
    const finalSalePrice = Math.max(0, Number(salePrice || 0));

    if (
      isNaN(finalPurchasePrice) ||
      isNaN(finalPublishedPrice) ||
      isNaN(finalSalePrice)
    ) {
      throw new Error('Los precios deben ser valores numéricos válidos');
    }

    return {
      finalPurchasePrice,
      finalPublishedPrice,
      finalSalePrice,
    };
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      // Validar que vehicleId sea un número válido
      if (!vehicleId || isNaN(vehicleId)) {
        throw new Error('ID de vehículo inválido');
      }

      // Validar y obtener los precios finales
      const { finalPurchasePrice, finalPublishedPrice, finalSalePrice } =
        validatePrices();

      // Actualizar precio de compra/acuerdo según el tipo
      if (isConsigned) {
        // Reajuste del precio garantizado: si se cargó un valor > 0, se guarda en
        // agreed_price_final (preserva el acordado original). Si está en 0/vacío, null.
        const finalAgreedFinal = Math.max(0, Number(agreedPriceFinal || 0));
        const { data: consignmentData, error: consignmentError } =
          await supabase
            .from('vehicles_consignments')
            .update({
              agreed_price: finalPurchasePrice,
              agreed_price_final: finalAgreedFinal > 0 ? finalAgreedFinal : null,
              agreed_price_adjusted_at:
                finalAgreedFinal > 0 ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq('vehicle_id', vehicleId)
            .select();

        if (consignmentError) {
          throw new Error(
            `Error al actualizar consignación: ${consignmentError.message}`
          );
        }
      } else {
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('vehicles_purchases')
          .update({
            purchase_price: finalPurchasePrice,
            updated_at: new Date().toISOString(),
          })
          .eq('vehicle_id', vehicleId)
          .select();

        if (purchaseError) {
          throw new Error(
            `Error al actualizar compra: ${purchaseError.message}`
          );
        }
      }

      // Validar precio mínimo (obligatorio, > 0)
      const finalMinPrice = Math.max(0, Number(minPriceValue || 0));
      if (!finalMinPrice || finalMinPrice <= 0) {
        throw new Error('El precio mínimo es obligatorio y debe ser mayor a 0');
      }

      // Actualizar precio publicado y mínimo en la tabla vehicles
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .update({
          price: finalPublishedPrice,
          min_price: finalMinPrice,
          discount_percentage: Math.min(100, Math.max(0, Number(discountValue) || 0)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', vehicleId)
        .eq('client_id', clientId)
        .select();

      if (vehicleError) {
        throw new Error(
          `Error al actualizar vehículo: ${vehicleError.message}`
        );
      }

      // iva_exento: update APARTE y tolerante a fallo. La columna puede no existir
      // aún (migración 20260616130000 sin aplicar); si falla, se ignora para NO
      // romper el guardado de precios. Post-migración persiste normalmente.
      await supabase
        .from('vehicles')
        .update({ iva_exento: ivaMode === 'inherit' ? null : ivaMode === 'exento' })
        .eq('id', vehicleId)
        .eq('client_id', clientId);

      // Actualizar precio de venta si existe
      if (saleData?.id) {
        const { data: saleUpdateData, error: saleError } = await supabase
          .from('vehicles_sales')
          .update({
            sale_price: finalSalePrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', saleData.id)
          .select();

        if (saleError) {
          throw new Error(`Error al actualizar venta: ${saleError.message}`);
        }
      }

      toast({
        title: 'Precios actualizados',
        description: 'Los precios se han actualizado correctamente',
      });

      // Sync with ChileAutos if integration is active (fire-and-forget)
      triggerUpdateSync(vehicleId);
      // Empujar el precio nuevo a MercadoLibre (fire-and-forget)
      triggerPriceSync(vehicleId);

      onUpdate();
      onClose();
      // Reload para que Línea de tiempo / Documentos / Detalles vean los precios
      // actualizados. Cada tab tiene su propia instancia de useVehicleFinancialData
      // y onUpdate solo refresca la del Resumen.
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Hubo un error al actualizar los precios',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Editar Precios</DialogTitle>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='purchasePrice'>
              {isConsigned ? 'Precio Acordado' : 'Precio de Compra'}
            </Label>
            <PriceInput
              id='purchasePrice'
              value={purchasePrice}
              onChange={(value) => setPurchasePrice(Number(value) || 0)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='publishedPrice'>Precio Publicado</Label>
            <PriceInput
              id='publishedPrice'
              value={publishedPrice}
              onChange={(value) => setPublishedPrice(Number(value) || 0)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='discount'>Descuento (%)</Label>
            <Input
              id='discount'
              type='number'
              min={0}
              max={100}
              step='0.1'
              value={discountValue || ''}
              onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
              placeholder='0'
            />
            <p className='text-[11px] text-slate-500'>
              Descuento sobre el precio publicado. En 0 no se muestra precio rebajado.
            </p>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='minPrice'>
              Precio Mínimo
              <span className='text-red-500 ml-0.5'>*</span>
            </Label>
            <PriceInput
              id='minPrice'
              value={minPriceValue}
              onChange={(value) => setMinPriceValue(Number(value) || 0)}
            />
            <p className='text-[11px] text-slate-500'>
              Bajo este precio se va a pedir confirmación con motivo al vender o cerrar.
            </p>
          </div>
          {!isSeller && (
            <div className='grid gap-2'>
              <Label htmlFor='ivaMode'>IVA del vehículo</Label>
              <Select
                value={ivaMode}
                onValueChange={(v) =>
                  setIvaMode(v as 'inherit' | 'exento' | 'afecto')
                }
              >
                <SelectTrigger id='ivaMode'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='inherit'>
                    Según configuración del cliente
                  </SelectItem>
                  <SelectItem value='afecto'>Afecto a IVA (19%)</SelectItem>
                  <SelectItem value='exento'>Exento de IVA (usado)</SelectItem>
                </SelectContent>
              </Select>
              <p className='text-[11px] text-slate-500'>
                Afecta el cálculo de IVA en la comisión/neto del vendedor. "Según
                cliente" usa el toggle general de la automotora.
              </p>
            </div>
          )}
          {saleData?.id && (
            <div className='grid gap-2'>
              <Label htmlFor='salePrice'>Precio de Venta</Label>
              <PriceInput
                id='salePrice'
                value={salePrice}
                onChange={(value) => setSalePrice(Number(value) || 0)}
              />
            </div>
          )}
          {isConsigned && saleData?.id && (
            <div className='grid gap-2'>
              <Label htmlFor='agreedPriceFinal'>
                Precio garantizado reajustado
              </Label>
              <PriceInput
                id='agreedPriceFinal'
                value={agreedPriceFinal}
                onChange={(value) => setAgreedPriceFinal(Number(value) || 0)}
              />
              <p className='text-[11px] text-slate-500'>
                Si renegociaste el precio garantizado con el consignante porque la
                venta cerró distinto. Se usa para la utilidad y conserva el acordado
                original (${Number(acquisitionData?.agreed_price || 0).toLocaleString('es-CL')}). Deja en 0 si no aplica.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VehiclePriceEditModal;
