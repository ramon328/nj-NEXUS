/**
 * Drawer de comisión vendedor para el flujo de Cierre de Negocio.
 * Implementa el mockup PRD §4.3:
 *  - 1+ líneas de vendedor (multi-vendedor)
 *  - Cada línea: vendedor + tipo (monto fijo / % venta / % margen) + valor
 *  - Cálculo en vivo del monto $ por línea + total
 *  - Warning visual si suma de %s > 100 (no bloquea)
 *  - Snapshot del nombre del vendedor al guardar
 *
 * Persiste en sale_commission_splits al guardar el cierre del negocio
 * (lo hace closeBusinessDealService, ver task #18).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCloseBusinessDealStore,
  type SellerCommissionBase,
  type SellerCommissionSplit,
} from '@/stores/closeBusinessDealStore';

const BASE_OPTIONS: Array<{
  value: SellerCommissionBase;
  label: string;
  suffix: string;
}> = [
  { value: 'monto_fijo', label: 'Monto fijo', suffix: '$' },
  { value: 'porcentaje_venta', label: '% sobre precio venta', suffix: '%' },
  { value: 'porcentaje_margen', label: '% sobre margen', suffix: '%' },
];

const newLocalId = () => `split-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);

interface SellerCommissionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Precio de venta — usado para calcular % sobre venta en vivo */
  finalSalePrice: number;
  /** Utilidad bruta (sale - cogs - exp) — usado para % sobre margen en vivo */
  grossMargin: number;
  /** Vendedor pre-cargado (vehicles.assigned_seller_id). Si está, se precarga al abrir */
  defaultSellerId?: number | null;
}

const SellerCommissionDrawer: React.FC<SellerCommissionDrawerProps> = ({
  isOpen,
  onClose,
  finalSalePrice,
  grossMargin,
  defaultSellerId,
}) => {
  const { clientId } = useAuth();
  const {
    sellerCommissions,
    addSellerCommission,
    updateSellerCommission,
    removeSellerCommission,
  } = useCloseBusinessDealStore();

  const [sellers, setSellers] = useState<
    Array<{ id: number; first_name: string; last_name: string }>
  >([]);

  // Cargar vendedores del cliente
  useEffect(() => {
    if (!clientId || !isOpen) return;
    supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('client_id', clientId)
      .in('rol', ['seller', 'vendedor', 'admin'])
      .order('first_name')
      .then(({ data }) => setSellers(data || []));
  }, [clientId, isOpen]);

  // Al abrir el drawer la primera vez, si no hay splits y hay defaultSellerId,
  // precargamos 1 split vacío con ese vendedor.
  useEffect(() => {
    if (!isOpen) return;
    if (sellerCommissions.length === 0 && defaultSellerId && sellers.length > 0) {
      const seller = sellers.find((s) => s.id === defaultSellerId);
      if (seller) {
        addSellerCommission({
          localId: newLocalId(),
          userId: seller.id,
          vendedorNombreSnapshot: `${seller.first_name} ${seller.last_name}`,
          baseType: 'porcentaje_venta',
          value: 0,
        });
      }
    }
    // Si no hay splits y tampoco vendedor por default, agregamos uno vacío
    // para que el usuario tenga punto de partida.
    if (sellerCommissions.length === 0 && !defaultSellerId) {
      addSellerCommission({
        localId: newLocalId(),
        userId: null,
        vendedorNombreSnapshot: '',
        baseType: 'porcentaje_venta',
        value: 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sellers]);

  // Calcular monto $ de cada split según su baseType
  const computeAmount = (split: SellerCommissionSplit): number => {
    const v = Number(split.value) || 0;
    switch (split.baseType) {
      case 'monto_fijo':
        return v;
      case 'porcentaje_venta':
        return (finalSalePrice * v) / 100;
      case 'porcentaje_margen':
        return Math.max(0, grossMargin) * (v / 100);
      default:
        return 0;
    }
  };

  // Total $ + suma de %s para validación
  const { totalAmount, sumPercentage } = useMemo(() => {
    let total = 0;
    let pct = 0;
    sellerCommissions.forEach((s) => {
      total += computeAmount(s);
      if (s.baseType !== 'monto_fijo') {
        pct += Number(s.value) || 0;
      }
    });
    return { totalAmount: total, sumPercentage: pct };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerCommissions, finalSalePrice, grossMargin]);

  const handleSellerChange = (localId: string, userIdStr: string) => {
    const userId = Number(userIdStr);
    const seller = sellers.find((s) => s.id === userId);
    if (!seller) return;
    updateSellerCommission(localId, {
      userId: seller.id,
      vendedorNombreSnapshot: `${seller.first_name} ${seller.last_name}`,
    });
  };

  const handleAddRow = () => {
    addSellerCommission({
      localId: newLocalId(),
      userId: null,
      vendedorNombreSnapshot: '',
      baseType: 'porcentaje_venta',
      value: 0,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='w-full sm:max-w-lg overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>Comisión vendedores</SheetTitle>
        </SheetHeader>

        <div className='space-y-3 py-4'>
          {sellerCommissions.map((split, idx) => {
            const amount = computeAmount(split);
            const baseOption = BASE_OPTIONS.find((o) => o.value === split.baseType)!;
            return (
              <div
                key={split.localId}
                className='border border-slate-200 rounded-xl p-3 space-y-2 bg-white'
              >
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium text-slate-600'>
                    Vendedor {idx + 1}
                  </span>
                  {sellerCommissions.length > 1 && (
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => removeSellerCommission(split.localId)}
                      className='h-7 w-7 p-0 text-slate-400 hover:text-red-600'
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                    </Button>
                  )}
                </div>

                {/* Selector vendedor */}
                <div className='space-y-1'>
                  <Label className='text-[11px] text-slate-500'>Vendedor</Label>
                  <Select
                    value={split.userId ? String(split.userId) : ''}
                    onValueChange={(v) => handleSellerChange(split.localId, v)}
                  >
                    <SelectTrigger className='h-9'>
                      <SelectValue placeholder='Seleccionar vendedor' />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.first_name} {s.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selector tipo */}
                <div className='space-y-1'>
                  <Label className='text-[11px] text-slate-500'>
                    Base de cálculo
                  </Label>
                  <Select
                    value={split.baseType}
                    onValueChange={(v) =>
                      updateSellerCommission(split.localId, {
                        baseType: v as SellerCommissionBase,
                      })
                    }
                  >
                    <SelectTrigger className='h-9'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BASE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Input valor + monto calculado */}
                <div className='grid grid-cols-2 gap-2'>
                  <div className='space-y-1'>
                    <Label className='text-[11px] text-slate-500'>
                      Valor ({baseOption.suffix})
                    </Label>
                    <Input
                      type='number'
                      step={split.baseType === 'monto_fijo' ? '1000' : '0.01'}
                      placeholder='0'
                      value={split.value || ''}
                      onChange={(e) =>
                        updateSellerCommission(split.localId, {
                          value: Number(e.target.value) || 0,
                        })
                      }
                      className='h-9 text-right'
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-[11px] text-slate-500'>
                      Monto $
                    </Label>
                    <div className='h-9 px-3 flex items-center justify-end bg-slate-50 rounded-md border border-slate-200 text-sm font-medium text-slate-900'>
                      {formatCLP(amount)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            variant='outline'
            onClick={handleAddRow}
            className='w-full gap-2 text-sm'
          >
            <Plus className='h-4 w-4' />
            Agregar vendedor
          </Button>

          {/* Warning suma >100% */}
          {sumPercentage > 100 && (
            <div className='flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200'>
              <AlertTriangle className='h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0' />
              <p className='text-[12px] text-amber-800'>
                La suma de porcentajes es <b>{sumPercentage.toFixed(2)}%</b> (mayor
                a 100%). Puedes guardar igual, pero verifica que sea intencional.
              </p>
            </div>
          )}

          {/* Total */}
          <div className='flex items-center justify-between pt-3 border-t border-slate-200'>
            <span className='text-sm font-semibold text-slate-700'>
              Total comisión vendedores
            </span>
            <span className='text-base font-bold text-slate-900'>
              {formatCLP(totalAmount)}
            </span>
          </div>
        </div>

        <SheetFooter>
          <Button variant='outline' onClick={onClose} className='flex-1'>
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default SellerCommissionDrawer;
