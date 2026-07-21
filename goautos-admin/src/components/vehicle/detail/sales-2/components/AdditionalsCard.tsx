import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import {
  useVehicleSaleStore,
  SaleAdditional,
} from '@/stores/vehicleSaleStore';
import PriceInput from '@/components/ui/inputs/price-input';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/functions';

const CARD = 'rounded-xl border border-slate-200 bg-white p-3 space-y-3';
const FIELD = 'h-9 text-[13px]';

// ─── Tarjeta compartida "Adicionales" (extras de la venta) ───
// Vive tanto en el paso Venta (para ingresar los extras ANTES de armar el
// desglose de pagos y que el "Total a pagar" los incluya) como en el paso
// Permuta. Ambas instancias leen/escriben los mismos additionals del store.

const KindToggle = ({
  value,
  onChange,
}: {
  value: SaleAdditional['kind'];
  onChange: (k: 'income' | 'expense') => void;
}) => (
  <div className='grid grid-cols-2 gap-1.5'>
    <button
      type='button'
      onClick={() => onChange('income')}
      className={`text-[12px] py-1.5 rounded-lg border transition-colors ${
        value === 'income'
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium'
          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
      }`}
    >
      Ingreso (cliente paga)
    </button>
    <button
      type='button'
      onClick={() => onChange('expense')}
      className={`text-[12px] py-1.5 rounded-lg border transition-colors ${
        value === 'expense'
          ? 'bg-red-50 border-red-300 text-red-700 font-medium'
          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
      }`}
    >
      Gasto (la absorbe la automotora)
    </button>
  </div>
);

// Checkbox "pass-through": dinero que la automotora solo traspasa (ej. transferencia de
// dominio / comisión tarjeta que se le cobra al cliente y se paga a un tercero). No es
// ingreso ni gasto real → no afecta el margen. Se muestra igual en el desglose.
const PassthroughToggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className='flex items-start gap-2 rounded-lg bg-white border border-slate-200 px-2 py-1.5 cursor-pointer'>
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => onChange(v === true)}
      className='mt-0.5'
    />
    <span className='text-[11px] leading-snug text-slate-600'>
      <span className='font-medium text-slate-700'>Pass-through</span> (no afecta el margen)
      <span className='block text-slate-400'>
        Dinero que solo se traspasa: se cobra al cliente y se paga a un tercero (ej. transferencia, comisión de tarjeta).
      </span>
    </span>
  </label>
);

const AdditionalsCard = () => {
  const { t } = useTranslation('vehicleSales');
  const {
    additionals,
    reservationExtras,
    addAdditional,
    updateAdditional,
    removeAdditional,
  } = useVehicleSaleStore();

  // ── Estado local del formulario ──
  // Sin kind por defecto: el usuario elige explícitamente si es ingreso o gasto.
  const [newAdditional, setNewAdditional] = useState<Partial<SaleAdditional>>({
    title: '',
    price: 0,
    description: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAdditional, setEditingAdditional] = useState<Partial<SaleAdditional>>({});

  const resetNewAdditional = () =>
    setNewAdditional({ title: '', price: 0, description: '' });

  const handleAddAdditional = () => {
    if (!newAdditional.kind) {
      toast({
        title: 'Error',
        description: 'Selecciona si el adicional es un ingreso o un gasto.',
        variant: 'destructive',
      });
      return;
    }
    if (!newAdditional.title?.trim()) {
      toast({
        title: 'Error',
        description: t('steps.saleInfo.errors.additionalTitleRequired'),
        variant: 'destructive',
      });
      return;
    }
    if (!newAdditional.price || newAdditional.price <= 0) {
      toast({
        title: 'Error',
        description: t('steps.saleInfo.errors.additionalPriceInvalid'),
        variant: 'destructive',
      });
      return;
    }
    addAdditional({
      id: Date.now(),
      title: newAdditional.title.trim(),
      price: newAdditional.price,
      description: newAdditional.description?.trim() || '',
      kind: newAdditional.kind,
      isPassthrough: !!newAdditional.isPassthrough,
    });
    resetNewAdditional();
  };

  const handleStartEdit = (additional: SaleAdditional) => {
    setEditingId(additional.id?.toString() || '');
    // Los adicionales legacy sin kind son ingresos (mismo default que el cálculo).
    setEditingAdditional({ ...additional, kind: additional.kind ?? 'income' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingAdditional({});
  };

  const handleSaveEdit = () => {
    if (!editingAdditional.title?.trim() || !editingAdditional.price || editingAdditional.price <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresa un título y un precio válido para el adicional.',
        variant: 'destructive',
      });
      return;
    }
    if (editingId) {
      updateAdditional(editingId, {
        title: editingAdditional.title.trim(),
        price: editingAdditional.price,
        description: editingAdditional.description?.trim() || '',
        kind: editingAdditional.kind ?? 'income',
        isPassthrough: !!editingAdditional.isPassthrough,
      });
      handleCancelEdit();
    }
  };

  const reservationAdditionals = reservationExtras.filter(
    (e) => e.type === 'reservation_additional'
  );

  return (
    <div className={CARD}>
      <div>
        <p className='text-[13px] font-semibold text-slate-900'>
          {t('steps.saleInfo.additionals.title')}
        </p>
        <p className='text-[11px] text-slate-400'>
          Cargos extra al cliente (transferencia, accesorios) o gastos que absorbe la automotora.
        </p>
      </div>

      {/* Nuevo adicional */}
      <div className='rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 space-y-2'>
        <KindToggle
          value={newAdditional.kind}
          onChange={(kind) => setNewAdditional((prev) => ({ ...prev, kind }))}
        />
        <Input
          value={newAdditional.title || ''}
          onChange={(e) => setNewAdditional((prev) => ({ ...prev, title: e.target.value }))}
          placeholder={t('steps.saleInfo.additionals.addNew.titlePlaceholder')}
          className={FIELD}
        />
        <PriceInput
          value={newAdditional.price || 0}
          onChange={(value) => setNewAdditional((prev) => ({ ...prev, price: value }))}
          placeholder={t('steps.saleInfo.additionals.addNew.pricePlaceholder')}
          className={FIELD}
        />
        <PassthroughToggle
          checked={!!newAdditional.isPassthrough}
          onChange={(v) => setNewAdditional((prev) => ({ ...prev, isPassthrough: v }))}
        />
        <Button onClick={handleAddAdditional} size='sm' className='w-full h-9 text-[13px]'>
          <Plus className='w-3.5 h-3.5 mr-1' />
          {t('steps.saleInfo.additionals.addNew.addButton')}
        </Button>
      </div>

      {/* Adicionales de reserva (sólo lectura) */}
      {reservationAdditionals.length > 0 && (
        <div className='space-y-1'>
          <p className='text-[11px] font-medium text-slate-500'>Adicionales de reserva</p>
          {reservationAdditionals.map((additional) => (
            <div
              key={additional.id}
              className='flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[13px]'
            >
              <span className='font-medium text-slate-700'>{additional.title}</span>
              <span className='font-medium text-slate-900'>{formatCurrency(additional.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Lista de adicionales de la venta */}
      {additionals.length > 0 && (
        <div className='space-y-1.5'>
          {additionals.map((additional) => {
            // Cargo al consignador: NEUTRO para el comprador (lo paga el
            // consignador de su liquidación) → no es "Ingreso (cliente paga)".
            const isConsignor = additional.assumedBy === 'consignor';
            const isExpense =
              !isConsignor && (additional.kind ?? 'income') === 'expense';
            const isEditing = editingId === additional.id?.toString();
            return (
              <div
                key={additional.id}
                className='rounded-lg border border-slate-200 p-2.5 text-[13px]'
              >
                {isEditing ? (
                  <div className='space-y-2'>
                    <KindToggle
                      value={editingAdditional.kind}
                      onChange={(kind) =>
                        setEditingAdditional((prev) => ({ ...prev, kind }))
                      }
                    />
                    <Input
                      value={editingAdditional.title || ''}
                      onChange={(e) =>
                        setEditingAdditional((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className={FIELD}
                    />
                    <PriceInput
                      value={editingAdditional.price || 0}
                      onChange={(value) =>
                        setEditingAdditional((prev) => ({ ...prev, price: value }))
                      }
                      className={FIELD}
                    />
                    <PassthroughToggle
                      checked={!!editingAdditional.isPassthrough}
                      onChange={(v) =>
                        setEditingAdditional((prev) => ({ ...prev, isPassthrough: v }))
                      }
                    />
                    <div className='flex gap-1.5'>
                      <Button size='sm' onClick={handleSaveEdit} className='h-8 text-[12px]'>
                        {t('common:buttons.save')}
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={handleCancelEdit}
                        className='h-8 text-[12px]'
                      >
                        {t('common:buttons.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className='flex justify-between items-center'>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-1.5'>
                        <span className='font-medium text-slate-800 truncate'>{additional.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-px rounded-full shrink-0 ${
                            isConsignor
                              ? 'bg-slate-100 text-slate-500'
                              : isExpense
                              ? 'bg-red-50 text-red-600'
                              : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {isConsignor ? 'Consignador' : isExpense ? 'Gasto' : 'Ingreso'}
                        </span>
                        {additional.isPassthrough && (
                          <span className='text-[10px] px-1.5 py-px rounded-full shrink-0 bg-slate-100 text-slate-500'>
                            Pass-through
                          </span>
                        )}
                      </div>
                      <div
                        className={
                          isConsignor
                            ? 'text-slate-500'
                            : isExpense
                            ? 'text-red-600'
                            : 'text-slate-500'
                        }
                      >
                        {isConsignor ? '' : isExpense ? '−' : '+'}
                        {formatCurrency(additional.price)}
                      </div>
                    </div>
                    <div className='flex gap-1 shrink-0'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleStartEdit(additional)}
                        className='h-7 w-7 p-0 text-slate-400 hover:text-slate-700'
                      >
                        <Edit2 className='w-3.5 h-3.5' />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => removeAdditional(additional.id!.toString())}
                        className='h-7 w-7 p-0 text-slate-400 hover:text-red-600'
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdditionalsCard;
