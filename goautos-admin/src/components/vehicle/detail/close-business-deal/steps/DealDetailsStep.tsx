import {
  useCloseBusinessDealStore,
  type DealAdditional,
  type DealIncome,
  type AssumedBy,
} from '@/stores/closeBusinessDealStore';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  type VehicleExtra,
} from '@/services/vehicleExtrasService';
import SellerCommissionDrawer from '../SellerCommissionDrawer';

const DealDetailsStep = () => {
  const {
    dealDetails,
    updateDealDetails,
    vehicle,
    dealAdditionals,
    addDealAdditional,
    removeDealAdditional,
    dealIncomes,
    addDealIncome,
    removeDealIncome,
    sellerCommissions,
  } = useCloseBusinessDealStore();
  const [isCommissionDrawerOpen, setIsCommissionDrawerOpen] = useState(false);
  const [additionalExpenses, setAdditionalExpenses] = useState(0);
  const [vehicleExtras, setVehicleExtras] = useState<VehicleExtra[]>([]);
  const [additionalIncomes, setAdditionalIncomes] = useState(0);
  const [vehicleIncomes, setVehicleIncomes] = useState<VehicleExtra[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Un vehículo consignado tiene 3 partes (consignador / automotora / cliente
  // final). En consignados, el default de un gasto adicional es 'consignor' (se
  // descuenta al consignador de su liquidación); en autos propios, 'dealership'.
  const isConsigned = !!vehicle?.is_consigned;
  const defaultAdditionalAssumedBy: AssumedBy = isConsigned
    ? 'consignor'
    : 'dealership';

  const [newAdditional, setNewAdditional] = useState<Partial<DealAdditional>>({
    title: '',
    amount: 0,
  });

  const [newIncome, setNewIncome] = useState<Partial<DealIncome>>({
    title: '',
    amount: 0,
    assumedBy: 'customer',
  });

  const transferValue = vehicle?.transfer_value || 0;

  useEffect(() => {
    const fetchAdditionalExpenses = async () => {
      if (!vehicle?.id) return;

      try {
        setIsLoading(true);

        const { data: extras, error } = await supabase
          .from('vehicles_extras')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .eq('type', 'sale_additional')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching additional expenses:', error);
          return;
        }

        // Son "gasto adicional" del cierre los que descuentan a alguien de la
        // automotora: 'dealership' (la automotora lo absorbe) y 'consignor' (se le
        // descuenta al consignador). Los que paga el cliente ('customer') son
        // INGRESO, no costo — contarlos como gasto inflaba el costo y bajaba la base
        // de comisión (bug Carklass). Default legacy null → 'dealership'.
        const dealershipExtras = (extras || []).filter((e) => {
          const ab = (e as any).assumed_by ?? 'dealership';
          return ab === 'dealership' || ab === 'consignor';
        });

        setVehicleExtras(dealershipExtras);

        const totalExpenses = dealershipExtras.reduce((sum, extra) => {
          return sum + (extra.amount || 0);
        }, 0);

        setAdditionalExpenses(totalExpenses);

        if (dealershipExtras.length > 0) {
          dealershipExtras.forEach((extra) => {
            const additional: DealAdditional = {
              id: extra.id!,
              title: extra.title,
              amount: extra.amount,
            };
            addDealAdditional(additional);
          });
        }
      } catch (error) {
        console.error('Error in fetchAdditionalExpenses:', error);
        toast({
          title: 'Error',
          description: 'Error al cargar los gastos adicionales',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdditionalExpenses();
  }, [vehicle?.id, addDealAdditional]);

  useEffect(() => {
    const fetchAdditionalIncomes = async () => {
      if (!vehicle?.id) return;

      try {
        const { data: incomes, error } = await supabase
          .from('vehicles_extras')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .eq('type', 'sale_income')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching additional incomes:', error);
          return;
        }

        setVehicleIncomes(incomes || []);

        const totalIncomes = (incomes || []).reduce((sum, income) => {
          return sum + (income.amount || 0);
        }, 0);

        setAdditionalIncomes(totalIncomes);

        if (incomes && incomes.length > 0) {
          incomes.forEach((income) => {
            const dealIncome: DealIncome = {
              id: income.id!,
              title: income.title,
              amount: income.amount,
            };
            addDealIncome(dealIncome);
          });
        }
      } catch (error) {
        console.error('Error in fetchAdditionalIncomes:', error);
        toast({
          title: 'Error',
          description: 'Error al cargar los ingresos adicionales',
          variant: 'destructive',
        });
      }
    };

    fetchAdditionalIncomes();
  }, [vehicle?.id, addDealIncome]);

  // Base de cálculo: finalSalePrice solamente. CRT (transferValue) NO contamina
  // la base — el cliente lo paga aparte, no es parte del precio del vehículo.
  useEffect(() => {
    if (
      dealDetails.finalSalePrice > 0 &&
      dealDetails.dealershipCommission >= 0
    ) {
      const totalPrice = dealDetails.finalSalePrice;
      const percentage = (dealDetails.dealershipCommission / totalPrice) * 100;
      if (
        Math.abs(percentage - dealDetails.dealershipCommissionPercentage) > 0.01
      ) {
        updateDealDetails({
          dealershipCommissionPercentage: Number(percentage.toFixed(2)),
        });
      }
    }
  }, [
    dealDetails.finalSalePrice,
    dealDetails.dealershipCommission,
  ]);

  const handlePercentageChange = (percentage: number) => {
    const totalPrice = dealDetails.finalSalePrice;
    const amount = (totalPrice * percentage) / 100;
    updateDealDetails({
      dealershipCommissionPercentage: percentage,
      dealershipCommission: Number(amount.toFixed(0)),
    });
  };

  // Utilidad bruta de la automotora (para % sobre margen en drawer comisión)
  // = lo que cobra la automotora menos los gastos asumidos por ella.
  const grossMargin = useMemo(
    () => Math.max(0, (dealDetails.dealershipCommission || 0) - additionalExpenses),
    [dealDetails.dealershipCommission, additionalExpenses]
  );

  // Total $ de comisiones de vendedores (todas las líneas del drawer)
  const sellerCommissionTotal = useMemo(() => {
    return sellerCommissions.reduce((sum, s) => {
      const v = Number(s.value) || 0;
      switch (s.baseType) {
        case 'monto_fijo':
          return sum + v;
        case 'porcentaje_venta':
          return sum + ((dealDetails.finalSalePrice || 0) * v) / 100;
        case 'porcentaje_margen':
          return sum + grossMargin * (v / 100);
        default:
          return sum;
      }
    }, 0);
  }, [sellerCommissions, dealDetails.finalSalePrice, grossMargin]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  useEffect(() => {
    const fetchAdditionalExpenses = async () => {
      if (!vehicle?.id) return;

      try {
        const { data: extras, error } = await supabase
          .from('vehicles_extras')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .in('type', ['sale_additional', 'reservation_additional']);

        if (error) {
          console.error('Error fetching additional expenses:', error);
          return;
        }

        const totalExpenses = extras.reduce((sum, extra) => {
          return sum + (extra.amount || 0);
        }, 0);

        setAdditionalExpenses(totalExpenses);
      } catch (error) {
        console.error('Error in fetchAdditionalExpenses:', error);
      }
    };

    fetchAdditionalExpenses();
  }, [vehicle?.id]);

  const resetNewAdditional = () => {
    setNewAdditional({ title: '', amount: 0 });
  };

  const handleAddAdditional = async () => {
    if (!newAdditional.title?.trim()) {
      toast({
        title: 'Error',
        description: 'Debe ingresar un título para el adicional',
        variant: 'destructive',
      });
      return;
    }

    if (!newAdditional.amount || newAdditional.amount <= 0) {
      toast({
        title: 'Error',
        description: 'Debe ingresar un monto válido',
        variant: 'destructive',
      });
      return;
    }

    if (!vehicle?.id) {
      toast({
        title: 'Error',
        description: 'No se ha seleccionado un vehículo',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      const { data: newExtra, error } = await supabase
        .from('vehicles_extras')
        .insert([
          {
            vehicle_id: vehicle.id,
            title: newAdditional.title.trim(),
            amount: newAdditional.amount,
            type: 'sale_additional',
            assumed_by: newAdditional.assumedBy || defaultAdditionalAssumedBy,
            is_passthrough: !!newAdditional.isPassthrough,
            description: `Gasto adicional del cierre de negocio: ${newAdditional.title.trim()}`,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creando gasto adicional:', error);
        throw error;
      }

      setVehicleExtras((prev) => [newExtra, ...prev]);

      const newTotal = additionalExpenses + newAdditional.amount;
      setAdditionalExpenses(newTotal);

      const additional: DealAdditional = {
        id: newExtra.id!,
        title: newExtra.title,
        amount: newExtra.amount,
      };
      addDealAdditional(additional);

      resetNewAdditional();

      toast({
        title: 'Éxito',
        description: 'Gasto adicional agregado correctamente',
      });
    } catch (error) {
      console.error('Error agregando gasto adicional:', error);
      toast({
        title: 'Error',
        description: 'Error al agregar el gasto adicional',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAdditional = async (id: number) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('vehicles_extras')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error eliminando gasto adicional:', error);
        throw error;
      }

      const extraToRemove = vehicleExtras.find((extra) => extra.id === id);
      if (extraToRemove) {
        setVehicleExtras((prev) => prev.filter((extra) => extra.id !== id));
        setAdditionalExpenses((prev) => prev - extraToRemove.amount);
      }

      removeDealAdditional(id);

      toast({
        title: 'Éxito',
        description: 'Gasto adicional eliminado correctamente',
      });
    } catch (error) {
      console.error('Error eliminando gasto adicional:', error);
      toast({
        title: 'Error',
        description: 'Error al eliminar el gasto adicional',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetNewIncome = () => {
    setNewIncome({ title: '', amount: 0, assumedBy: 'customer' });
  };

  const handleAddIncome = async () => {
    if (!newIncome.title?.trim()) {
      toast({
        title: 'Error',
        description: 'Debe ingresar un título para el ingreso',
        variant: 'destructive',
      });
      return;
    }

    if (!newIncome.amount || newIncome.amount <= 0) {
      toast({
        title: 'Error',
        description: 'Debe ingresar un monto válido',
        variant: 'destructive',
      });
      return;
    }

    if (!vehicle?.id) {
      toast({
        title: 'Error',
        description: 'No se ha seleccionado un vehículo',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      const { data: newExtra, error } = await supabase
        .from('vehicles_extras')
        .insert([
          {
            vehicle_id: vehicle.id,
            title: newIncome.title.trim(),
            amount: newIncome.amount,
            type: 'sale_income',
            assumed_by: newIncome.assumedBy || 'customer',
            is_passthrough: !!newIncome.isPassthrough,
            description: `Ingreso adicional del cierre de negocio: ${newIncome.title.trim()}`,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creando ingreso adicional:', error);
        throw error;
      }

      setVehicleIncomes((prev) => [newExtra, ...prev]);

      const newTotal = additionalIncomes + newIncome.amount;
      setAdditionalIncomes(newTotal);

      const income: DealIncome = {
        id: newExtra.id!,
        title: newExtra.title,
        amount: newExtra.amount,
      };
      addDealIncome(income);

      resetNewIncome();

      toast({
        title: 'Éxito',
        description: 'Ingreso adicional agregado correctamente',
      });
    } catch (error) {
      console.error('Error agregando ingreso adicional:', error);
      toast({
        title: 'Error',
        description: 'Error al agregar el ingreso adicional',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveIncome = async (id: number) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('vehicles_extras')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error eliminando ingreso adicional:', error);
        throw error;
      }

      const incomeToRemove = vehicleIncomes.find((income) => income.id === id);
      if (incomeToRemove) {
        setVehicleIncomes((prev) => prev.filter((income) => income.id !== id));
        setAdditionalIncomes((prev) => prev - incomeToRemove.amount);
      }

      removeDealIncome(id);

      toast({
        title: 'Éxito',
        description: 'Ingreso adicional eliminado correctamente',
      });
    } catch (error) {
      console.error('Error eliminando ingreso adicional:', error);
      toast({
        title: 'Error',
        description: 'Error al eliminar el ingreso adicional',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeAssumedBy = async (
    extraId: number,
    newAssumedBy: AssumedBy,
    kind: 'expense' | 'income'
  ) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('vehicles_extras')
        .update({ assumed_by: newAssumedBy })
        .eq('id', extraId);

      if (error) {
        console.error('Error actualizando assumed_by:', error);
        throw error;
      }

      if (kind === 'expense') {
        setVehicleExtras((prev) =>
          prev.map((extra) =>
            extra.id === extraId ? { ...extra, assumed_by: newAssumedBy } : extra
          )
        );
      } else {
        setVehicleIncomes((prev) =>
          prev.map((income) =>
            income.id === extraId ? { ...income, assumed_by: newAssumedBy } : income
          )
        );
      }
    } catch (error) {
      console.error('Error en handleChangeAssumedBy:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar quién paga este movimiento',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Marca/desmarca una línea existente como pass-through (dinero solo traspasado que
  // no afecta el margen). Persiste en vehicles_extras y actualiza el estado local.
  const handleTogglePassthrough = async (
    extraId: number,
    value: boolean,
    kind: 'expense' | 'income'
  ) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('vehicles_extras')
        .update({ is_passthrough: value })
        .eq('id', extraId);

      if (error) {
        console.error('Error actualizando is_passthrough:', error);
        throw error;
      }

      if (kind === 'expense') {
        setVehicleExtras((prev) =>
          prev.map((extra) =>
            extra.id === extraId ? { ...extra, is_passthrough: value } : extra
          )
        );
      } else {
        setVehicleIncomes((prev) =>
          prev.map((income) =>
            income.id === extraId ? { ...income, is_passthrough: value } : income
          )
        );
      }
    } catch (error) {
      console.error('Error en handleTogglePassthrough:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado pass-through',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Total que se descuenta al consignador de su liquidación: los movimientos con
  // assumed_by='consignor' (el valor correcto) Y, por retrocompatibilidad, los
  // 'dealership' históricos (antes del tercer valor los cargos al consignador se
  // guardaban como 'dealership') — así no se mueven cierres ya hechos. El default
  // null → 'dealership' se mantiene para gastos viejos sin la columna.
  const isChargedToConsignor = (ab?: AssumedBy | null) =>
    ab === 'consignor' || ab === 'dealership';
  const dealershipChargedTotal = [
    ...vehicleExtras.filter((e) => isChargedToConsignor(e.assumed_by ?? 'dealership')),
    ...vehicleIncomes.filter((i) => isChargedToConsignor(i.assumed_by)),
  ].reduce((sum, extra) => sum + (extra.amount || 0), 0);

  const dealAdditionalsTotal = dealAdditionals.reduce((sum, additional) => {
    return sum + additional.amount;
  }, 0);

  const discount = dealDetails.discount || 0;
  const totalFinalPrice = dealDetails.finalSalePrice + transferValue;

  return (
    <div className='space-y-2'>
      {/* Vehicle Info Reminder */}
      {vehicle && (
        <div className='p-2 rounded-lg border bg-slate-50/60'>
          <p className='text-xs font-medium text-slate-500 mb-1'>Información del Vehículo</p>
          <div className='grid grid-cols-2 gap-x-3 text-xs'>
            <div>
              <span className='text-slate-500'>Vehículo:</span>{' '}
              <span className='font-medium'>{vehicle.brand?.name} {vehicle.model?.name} {vehicle.year}</span>
            </div>
            <div>
              <span className='text-slate-500'>Precio:</span>{' '}
              <span className='font-medium'>{formatCurrency(vehicle.price || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Deal Details Form */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
        <div className='space-y-1'>
          <Label htmlFor='finalSalePrice' className='text-xs'>Precio de Venta *</Label>
          <Input
            id='finalSalePrice'
            type='number'
            placeholder='0'
            value={dealDetails.finalSalePrice || ''}
            onChange={(e) =>
              updateDealDetails({ finalSalePrice: Number(e.target.value) })
            }
            className='text-right h-7 text-xs'
          />
        </div>

        <div className='space-y-1'>
          <Label htmlFor='transferValue' className='text-xs'>Valor de Transferencia</Label>
          <Input
            id='transferValue'
            type='number'
            value={transferValue}
            disabled
            className='text-right bg-slate-100 text-slate-600 h-7 text-xs'
          />
        </div>

        <div className='space-y-1'>
          <Label htmlFor='paymentMethod' className='text-xs'>Método de Pago *</Label>
          <Select
            value={dealDetails.paymentMethod}
            onValueChange={(value) => updateDealDetails({ paymentMethod: value })}
          >
            <SelectTrigger className='h-7 text-sm'>
              <SelectValue placeholder='Seleccionar método' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='transferencia'>Transferencia</SelectItem>
              <SelectItem value='efectivo'>Efectivo</SelectItem>
              <SelectItem value='cheque'>Cheque</SelectItem>
              <SelectItem value='credito'>Crédito</SelectItem>
              <SelectItem value='mixto'>Mixto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-1'>
          <Label htmlFor='discount' className='text-xs'>Descuento</Label>
          <Input
            id='discount'
            type='number'
            placeholder='0'
            value={dealDetails.discount || ''}
            onChange={(e) => updateDealDetails({ discount: Number(e.target.value) })}
            className='text-right h-7 text-xs'
          />
        </div>

        <div className='space-y-1'>
          <Label htmlFor='dealershipCommission' className='text-xs'>Comisión Automotora *</Label>
          <Input
            id='dealershipCommission'
            type='number'
            placeholder='0'
            value={dealDetails.dealershipCommission || ''}
            onChange={(e) =>
              updateDealDetails({ dealershipCommission: Number(e.target.value) })
            }
            className='text-right h-7 text-xs'
          />
        </div>

        <div className='space-y-1'>
          <Label htmlFor='dealershipCommissionPercentage' className='text-xs'>Comisión (%)</Label>
          <Input
            id='dealershipCommissionPercentage'
            type='number'
            step='0.01'
            placeholder='0.00'
            value={dealDetails.dealershipCommissionPercentage || ''}
            onChange={(e) => handlePercentageChange(Number(e.target.value))}
            className='text-right h-7 text-xs'
          />
        </div>
      </div>

      {/* Comisión vendedores (drawer) — PRD §4.3 */}
      <div className='border border-slate-200 rounded-lg p-3 bg-slate-50/40'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Users className='h-4 w-4 text-slate-600' />
            <span className='text-xs font-semibold text-slate-700'>
              Comisión vendedores
            </span>
          </div>
          <div className='flex items-center gap-3'>
            {sellerCommissions.length === 0 ? (
              <span className='text-xs text-slate-500'>Sin asignar</span>
            ) : (
              <span className='text-xs font-semibold text-slate-900'>
                {new Intl.NumberFormat('es-CL', {
                  style: 'currency',
                  currency: 'CLP',
                  maximumFractionDigits: 0,
                }).format(sellerCommissionTotal)}{' '}
                <span className='text-slate-500 font-normal'>
                  ({sellerCommissions.length} {sellerCommissions.length === 1 ? 'vendedor' : 'vendedores'})
                </span>
              </span>
            )}
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsCommissionDrawerOpen(true)}
              className='h-7 text-xs'
            >
              {sellerCommissions.length === 0 ? 'Asignar' : 'Editar'}
            </Button>
          </div>
        </div>
      </div>

      <SellerCommissionDrawer
        isOpen={isCommissionDrawerOpen}
        onClose={() => setIsCommissionDrawerOpen(false)}
        finalSalePrice={dealDetails.finalSalePrice}
        grossMargin={grossMargin}
        defaultSellerId={vehicle?.assigned_seller_id}
      />

      {/* Adicionales del Cierre de Negocio */}
      <div className='space-y-2'>
        <p className='text-xs font-semibold text-slate-700'>Gastos Adicionales</p>
        <div className='flex gap-1.5'>
          <Input
            placeholder='Título'
            value={newAdditional.title || ''}
            onChange={(e) =>
              setNewAdditional({ ...newAdditional, title: e.target.value })
            }
            className='flex-1 h-7 text-xs'
          />
          <Input
            type='number'
            placeholder='Monto'
            value={newAdditional.amount || ''}
            onChange={(e) =>
              setNewAdditional({ ...newAdditional, amount: Number(e.target.value) })
            }
            className='w-24 h-7 text-xs'
          />
          <Select
            value={newAdditional.assumedBy || defaultAdditionalAssumedBy}
            onValueChange={(value) =>
              setNewAdditional({ ...newAdditional, assumedBy: value as AssumedBy })
            }
          >
            <SelectTrigger className='w-32 h-7 text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='consignor'>Consignador</SelectItem>
              <SelectItem value='dealership'>Automotora</SelectItem>
              <SelectItem value='customer'>Cliente final</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddAdditional}
            size='sm'
            className='h-8 px-2'
            disabled={isLoading}
          >
            <Plus className='w-3.5 h-3.5' />
          </Button>
        </div>
        <label className='flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer'>
          <Checkbox
            checked={!!newAdditional.isPassthrough}
            onCheckedChange={(v) =>
              setNewAdditional({ ...newAdditional, isPassthrough: v === true })
            }
          />
          Pass-through (dinero solo traspasado, no afecta el margen)
        </label>

        {vehicleExtras.length > 0 && (
          <div className='space-y-1'>
            {vehicleExtras.map((extra) => {
              const assumedBy = (extra.assumed_by ?? 'dealership') as AssumedBy;
              return (
                <div
                  key={extra.id}
                  className='flex items-center justify-between p-1.5 bg-slate-50 border rounded text-xs'
                >
                  <span className='font-medium flex-1'>{extra.title}</span>
                  <div className='flex items-center gap-1.5'>
                    <span className='font-medium text-red-600'>+{formatCurrency(extra.amount)}</span>
                    <label
                      className='flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer'
                      title='Pass-through: dinero solo traspasado, no afecta el margen'
                    >
                      <Checkbox
                        checked={extra.is_passthrough === true}
                        onCheckedChange={(v) =>
                          handleTogglePassthrough(extra.id!, v === true, 'expense')
                        }
                        disabled={isLoading}
                        className='h-3.5 w-3.5'
                      />
                      P-T
                    </label>
                    <Select
                      value={assumedBy}
                      onValueChange={(value) =>
                        handleChangeAssumedBy(extra.id!, value as AssumedBy, 'expense')
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger className='w-32 h-6 text-[11px]'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='consignor'>Consignador</SelectItem>
                        <SelectItem value='dealership'>Automotora</SelectItem>
                        <SelectItem value='customer'>Cliente final</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleRemoveAdditional(extra.id!)}
                      disabled={isLoading}
                      className='h-5 w-5 p-0'
                    >
                      <Trash2 className='w-2.5 h-2.5' />
                    </Button>
                  </div>
                </div>
              );
            })}

            {additionalExpenses > 0 && (
              <div className='flex justify-between items-center p-1.5 bg-blue-50 border border-blue-200 rounded text-xs'>
                <span className='font-medium text-blue-800'>Total Gastos:</span>
                <span className='font-bold text-red-600'>+{formatCurrency(additionalExpenses)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ingresos Adicionales */}
      <div className='space-y-2'>
        <p className='text-xs font-semibold text-slate-700'>Ingresos Adicionales</p>
        <p className='text-[10px] text-slate-500 -mt-1'>
          Venta de accesorios, seguros, paquetes, etc.
        </p>
        <div className='flex gap-1.5'>
          <Input
            placeholder='Título (ej. Seguro, Accesorios)'
            value={newIncome.title || ''}
            onChange={(e) =>
              setNewIncome({ ...newIncome, title: e.target.value })
            }
            className='flex-1 h-7 text-xs'
          />
          <Input
            type='number'
            placeholder='Monto'
            value={newIncome.amount || ''}
            onChange={(e) =>
              setNewIncome({ ...newIncome, amount: Number(e.target.value) })
            }
            className='w-24 h-7 text-xs'
          />
          <Select
            value={newIncome.assumedBy || 'customer'}
            onValueChange={(value) =>
              setNewIncome({ ...newIncome, assumedBy: value as AssumedBy })
            }
          >
            <SelectTrigger className='w-32 h-7 text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='customer'>Cliente final</SelectItem>
              <SelectItem value='consignor'>Consignador</SelectItem>
              <SelectItem value='dealership'>Automotora</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddIncome}
            size='sm'
            className='h-8 px-2'
            disabled={isLoading}
          >
            <Plus className='w-3.5 h-3.5' />
          </Button>
        </div>
        <label className='flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer'>
          <Checkbox
            checked={!!newIncome.isPassthrough}
            onCheckedChange={(v) =>
              setNewIncome({ ...newIncome, isPassthrough: v === true })
            }
          />
          Pass-through (dinero solo traspasado, no afecta el margen)
        </label>

        {vehicleIncomes.length > 0 && (
          <div className='space-y-1'>
            {vehicleIncomes.map((income) => {
              const assumedBy = (income.assumed_by ?? 'customer') as AssumedBy;
              return (
                <div
                  key={income.id}
                  className='flex items-center justify-between p-1.5 bg-slate-50 border rounded text-xs'
                >
                  <span className='font-medium flex-1'>{income.title}</span>
                  <div className='flex items-center gap-1.5'>
                    <span className='font-medium text-green-600'>+{formatCurrency(income.amount)}</span>
                    <label
                      className='flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer'
                      title='Pass-through: dinero solo traspasado, no afecta el margen'
                    >
                      <Checkbox
                        checked={income.is_passthrough === true}
                        onCheckedChange={(v) =>
                          handleTogglePassthrough(income.id!, v === true, 'income')
                        }
                        disabled={isLoading}
                        className='h-3.5 w-3.5'
                      />
                      P-T
                    </label>
                    <Select
                      value={assumedBy}
                      onValueChange={(value) =>
                        handleChangeAssumedBy(income.id!, value as AssumedBy, 'income')
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger className='w-32 h-6 text-[11px]'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='customer'>Cliente final</SelectItem>
                        <SelectItem value='consignor'>Consignador</SelectItem>
                        <SelectItem value='dealership'>Automotora</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleRemoveIncome(income.id!)}
                      disabled={isLoading}
                      className='h-5 w-5 p-0'
                    >
                      <Trash2 className='w-2.5 h-2.5' />
                    </Button>
                  </div>
                </div>
              );
            })}

            {additionalIncomes > 0 && (
              <div className='flex justify-between items-center p-1.5 bg-emerald-50 border border-emerald-200 rounded text-xs'>
                <span className='font-medium text-emerald-800'>Total Ingresos:</span>
                <span className='font-bold text-green-600'>+{formatCurrency(additionalIncomes)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Card */}
      {dealDetails.finalSalePrice > 0 && (
        <div className='p-2 rounded-lg border bg-blue-50/60 border-blue-200'>
          <p className='text-xs font-semibold text-blue-800 mb-1.5'>Resumen Financiero</p>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs'>
            <div>
              <span className='text-blue-600'>Precio Final:</span>
              <div className='text-sm font-bold text-blue-900'>{formatCurrency(totalFinalPrice)}</div>
              <div className='text-[10px] text-blue-500 mt-0.5'>
                {formatCurrency(dealDetails.finalSalePrice)}
                {transferValue > 0 && <> + {formatCurrency(transferValue)}</>}
              </div>
            </div>
            <div>
              <span className='text-blue-600'>Comisión:</span>
              <div className='text-sm font-bold text-blue-900'>
                {formatCurrency(dealDetails.dealershipCommission)}
                <span className='text-[10px] ml-0.5'>({dealDetails.dealershipCommissionPercentage.toFixed(2)}%)</span>
              </div>
            </div>
            <div>
              <span className='text-blue-600'>Para el Cliente:</span>
              <div className='text-sm font-bold text-blue-900'>
                {formatCurrency(
                  dealDetails.finalSalePrice - discount - dealDetails.dealershipCommission - dealershipChargedTotal
                )}
              </div>
              {(discount > 0 || dealDetails.dealershipCommission > 0 || dealershipChargedTotal > 0) && (
                <div className='text-[10px] text-red-600 mt-0.5'>
                  {discount > 0 && (
                    <div>- {formatCurrency(discount)} (descuento)</div>
                  )}
                  {dealDetails.dealershipCommission > 0 && (
                    <div>- {formatCurrency(dealDetails.dealershipCommission)} (comisión)</div>
                  )}
                  {dealershipChargedTotal > 0 && (
                    <div>- {formatCurrency(dealershipChargedTotal)} (descontados al consignador)</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <span className='text-emerald-700'>Ingresos Automotora:</span>
              <div className='text-sm font-bold text-emerald-800'>
                {formatCurrency(additionalIncomes)}
              </div>
              <div className='text-[10px] text-emerald-600 mt-0.5'>
                Accesorios, seguros, paquetes
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className='space-y-1'>
        <Label htmlFor='notes' className='text-xs'>Observaciones</Label>
        <Textarea
          id='notes'
          placeholder='Observaciones adicionales...'
          value={dealDetails.notes}
          onChange={(e) => updateDealDetails({ notes: e.target.value })}
          rows={2}
          className='text-sm resize-none'
        />
      </div>
    </div>
  );
};

export default DealDetailsStep;
