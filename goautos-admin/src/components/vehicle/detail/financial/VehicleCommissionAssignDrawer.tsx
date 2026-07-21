/**
 * Drawer standalone para asignar comisión vendedor desde el resumen del vehículo.
 *
 * A diferencia de SellerCommissionDrawer (acoplado al flujo close-business-deal
 * via el store), este componente lee/escribe directamente sobre
 * sale_commission_splits para una venta concreta. Permite editar la comisión
 * vehículo-por-vehículo sin pasar por el cierre de negocio.
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
import { useToast } from '@/hooks/use-toast';
import { notifyError } from '@/lib/handleError';

export type CommissionBase =
  | 'monto_fijo'
  | 'porcentaje_venta'
  | 'porcentaje_margen';

interface SplitDraft {
  localId: string;
  dbId: number | null; // id en sale_commission_splits si ya existe (null = nuevo)
  userId: number | null;
  baseType: CommissionBase;
  value: number;
  vendedorNombreSnapshot: string | null;
}

const BASE_OPTIONS: Array<{
  value: CommissionBase;
  label: string;
  suffix: string;
}> = [
  { value: 'monto_fijo', label: 'Monto fijo', suffix: '$' },
  { value: 'porcentaje_venta', label: '% sobre precio venta', suffix: '%' },
  { value: 'porcentaje_margen', label: '% sobre margen', suffix: '%' },
];

const newLocalId = () =>
  `split-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  saleId: number;
  finalSalePrice: number;
  grossMargin: number;
  defaultSellerId?: number | null;
  onSaved?: () => void;
}

const VehicleCommissionAssignDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  saleId,
  finalSalePrice,
  grossMargin,
  defaultSellerId,
  onSaved,
}) => {
  const { clientId } = useAuth();
  const { toast } = useToast();
  const [sellers, setSellers] = useState<
    Array<{ id: number; first_name: string; last_name: string }>
  >([]);
  const [splits, setSplits] = useState<SplitDraft[]>([]);
  // ids que existían en BD al abrir (para calcular qué borrar en el guardado diff).
  const [originalIds, setOriginalIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!clientId) return;
    supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('client_id', clientId)
      .in('rol', ['seller', 'vendedor', 'admin'])
      .order('first_name')
      .then(({ data }) => setSellers(data || []));
  }, [isOpen, clientId]);

  // Cargar splits existentes para esta venta
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('sale_commission_splits')
        .select(
          'id, user_id, base_type, split_type, percentage, amount, vendedor_nombre_snapshot'
        )
        .eq('sale_id', saleId);
      if (error) {
        console.error('[VehicleCommissionAssignDrawer] load error:', error);
      }
      const rows = data ?? [];
      setOriginalIds(rows.map((r: any) => r.id).filter(Boolean));
      if (rows.length === 0) {
        setSplits([
          {
            localId: newLocalId(),
            dbId: null,
            userId: defaultSellerId ?? null,
            baseType: 'porcentaje_venta',
            value: 0,
            vendedorNombreSnapshot: null,
          },
        ]);
      } else {
        setSplits(
          rows.map((r: any) => {
            const baseType: CommissionBase =
              r.base_type ??
              (r.split_type === 'amount' ? 'monto_fijo' : 'porcentaje_venta');
            const value =
              baseType === 'monto_fijo'
                ? Number(r.amount || 0)
                : Number(r.percentage || 0);
            return {
              localId: newLocalId(),
              dbId: r.id ?? null,
              userId: r.user_id,
              baseType,
              value,
              vendedorNombreSnapshot: r.vendedor_nombre_snapshot ?? null,
            };
          })
        );
      }
      setIsLoading(false);
    })();
  }, [isOpen, saleId, defaultSellerId]);

  const computeAmount = (s: SplitDraft) => {
    const value = Number(s.value) || 0;
    switch (s.baseType) {
      case 'monto_fijo':
        return value;
      case 'porcentaje_venta':
        return (finalSalePrice * value) / 100;
      case 'porcentaje_margen':
        return Math.max(0, grossMargin) * (value / 100);
    }
  };

  const total = useMemo(
    () => splits.reduce((sum, s) => sum + computeAmount(s), 0),
    [splits, finalSalePrice, grossMargin]
  );

  const percentageSum = useMemo(
    () =>
      splits
        .filter((s) => s.baseType !== 'monto_fijo')
        .reduce((sum, s) => sum + (Number(s.value) || 0), 0),
    [splits]
  );

  const updateSplit = (localId: string, patch: Partial<SplitDraft>) => {
    setSplits((prev) =>
      prev.map((s) => (s.localId === localId ? { ...s, ...patch } : s))
    );
  };

  const addLine = () => {
    setSplits((prev) => [
      ...prev,
      {
        localId: newLocalId(),
        dbId: null,
        userId: null,
        baseType: 'porcentaje_venta',
        value: 0,
        vendedorNombreSnapshot: null,
      },
    ]);
  };

  const removeLine = (localId: string) => {
    setSplits((prev) =>
      prev.length === 1 ? prev : prev.filter((s) => s.localId !== localId)
    );
  };

  // Arma la fila de BD para un draft válido.
  const rowFor = (s: SplitDraft) => {
    const value = Number(s.value) || 0;
    const amount = Math.round(computeAmount(s));
    const seller = sellers.find((u) => u.id === s.userId);
    const snapshot = seller
      ? `${seller.first_name ?? ''} ${seller.last_name ?? ''}`.trim()
      : s.vendedorNombreSnapshot ?? '';
    return {
      sale_id: saleId,
      user_id: s.userId,
      split_type:
        s.baseType === 'monto_fijo'
          ? ('amount' as const)
          : ('percentage' as const),
      percentage: s.baseType === 'monto_fijo' ? null : value,
      amount,
      base_type: s.baseType,
      vendedor_nombre_snapshot: snapshot || null,
    };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const valid = splits.filter(
        (s) => s.userId && (Number(s.value) || 0) > 0
      );

      // Guardado diff (no "borrar todo + reinsertar"): así el trigger de
      // historial registra altas/ediciones/bajas precisas en la línea de tiempo.
      const keptIds = valid
        .map((s) => s.dbId)
        .filter((id): id is number => !!id);
      const toDelete = originalIds.filter((id) => !keptIds.includes(id));

      // 1) Borrar los que se quitaron (o quedaron inválidos)
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('sale_commission_splits')
          .delete()
          .in('id', toDelete);
        if (delErr) throw delErr;
      }

      // 2) Actualizar los existentes (el trigger ignora updates sin cambios reales)
      for (const s of valid.filter((x) => x.dbId)) {
        const { error: updErr } = await supabase
          .from('sale_commission_splits')
          .update(rowFor(s))
          .eq('id', s.dbId as number);
        if (updErr) throw updErr;
      }

      // 3) Insertar los nuevos
      const inserts = valid.filter((s) => !s.dbId).map(rowFor);
      if (inserts.length > 0) {
        const { error: insErr } = await supabase
          .from('sale_commission_splits')
          .insert(inserts);
        if (insErr) throw insErr;
      }

      toast({
        title: 'Comisión guardada',
        description: `Total comisión vendedores: ${formatCLP(total)}`,
      });
      onSaved?.();
      onClose();
    } catch (err: any) {
      // notifyError mapea el error de RLS ("violates row-level security") a un
      // mensaje claro ("No tienes permisos…") en vez del texto crudo de Postgres.
      notifyError(err, 'No se pudo guardar la comisión.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='w-full sm:max-w-lg overflow-y-auto' guardClose>
        <SheetHeader>
          <SheetTitle>Comisión vendedores</SheetTitle>
        </SheetHeader>

        <div className='py-4 space-y-3'>
          {isLoading ? (
            <p className='text-sm text-slate-500'>Cargando…</p>
          ) : (
            <>
              {splits.map((s, idx) => {
                const baseInfo = BASE_OPTIONS.find(
                  (o) => o.value === s.baseType
                );
                const amount = computeAmount(s);
                return (
                  <div
                    key={s.localId}
                    className='border border-slate-200 rounded-xl p-3 space-y-2'
                  >
                    <div className='flex items-center justify-between'>
                      <span className='text-xs font-semibold text-slate-700'>
                        Vendedor {idx + 1}
                      </span>
                      {splits.length > 1 && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={() => removeLine(s.localId)}
                          className='h-7 w-7 text-slate-400 hover:text-red-500'
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                      )}
                    </div>

                    <Select
                      value={s.userId ? String(s.userId) : ''}
                      onValueChange={(val) =>
                        updateSplit(s.localId, { userId: Number(val) })
                      }
                    >
                      <SelectTrigger className='h-9 text-sm'>
                        <SelectValue placeholder='Seleccionar vendedor' />
                      </SelectTrigger>
                      <SelectContent>
                        {sellers.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.first_name} {u.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className='grid grid-cols-2 gap-2'>
                      <Select
                        value={s.baseType}
                        onValueChange={(val) =>
                          updateSplit(s.localId, {
                            baseType: val as CommissionBase,
                          })
                        }
                      >
                        <SelectTrigger className='h-9 text-sm'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BASE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className='relative'>
                        <Input
                          type='number'
                          value={s.value || ''}
                          onChange={(e) =>
                            updateSplit(s.localId, {
                              value: Number(e.target.value),
                            })
                          }
                          className='h-9 text-sm pr-8'
                          placeholder='0'
                        />
                        <span className='absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400'>
                          {baseInfo?.suffix}
                        </span>
                      </div>
                    </div>

                    <div className='text-right text-xs text-slate-500'>
                      Monto: <span className='font-semibold text-slate-700'>{formatCLP(amount)}</span>
                    </div>
                  </div>
                );
              })}

              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={addLine}
                className='w-full gap-2'
              >
                <Plus className='h-3.5 w-3.5' />
                Agregar vendedor
              </Button>

              {percentageSum > 100 && (
                <div className='flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800'>
                  <AlertTriangle className='h-3.5 w-3.5 mt-0.5 shrink-0' />
                  <span>
                    La suma de porcentajes es {percentageSum}% (mayor a 100).
                    Puedes guardar igual, pero revisa los valores.
                  </span>
                </div>
              )}

              <div className='border-t border-slate-100 pt-3 flex justify-between text-sm font-semibold'>
                <span>Total comisión vendedores</span>
                <span>{formatCLP(total)}</span>
              </div>
            </>
          )}
        </div>

        <SheetFooter>
          <Button variant='ghost' onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default VehicleCommissionAssignDrawer;
