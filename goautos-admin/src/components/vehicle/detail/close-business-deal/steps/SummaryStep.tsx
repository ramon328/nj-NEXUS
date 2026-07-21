import { useCloseBusinessDealStore } from '@/stores/closeBusinessDealStore';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type VehicleExtra } from '@/services/vehicleExtrasService';
import { getPaymentMethodLabel } from '@/utils/paymentMethods';

const SummaryStep = () => {
  const { vehicle, customer, dealDetails, dealAdditionals, dealIncomes } =
    useCloseBusinessDealStore();
  const [additionalExpenses, setAdditionalExpenses] = useState(0);
  const [vehicleExtras, setVehicleExtras] = useState<VehicleExtra[]>([]);
  const [additionalIncomes, setAdditionalIncomes] = useState(0);
  const [dealershipChargedTotal, setDealershipChargedTotal] = useState(0);

  const transferValue = vehicle?.transfer_value || 0;

  useEffect(() => {
    const fetchAdditionalExpenses = async () => {
      if (!vehicle?.id) return;

      try {
        const { data: extras, error } = await supabase
          .from('vehicles_extras')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .in('type', ['sale_additional', 'reservation_additional', 'expense']);

        if (error) {
          console.error('Error fetching additional expenses:', error);
        }

        const dbExtras = extras || [];
        const storeExtras = (dealAdditionals || []).map((additional) => ({
          id: additional.id!,
          vehicle_id: vehicle.id,
          title: additional.title,
          amount: additional.amount,
          type: 'sale_additional' as const,
          description: `Gasto adicional del cierre de negocio: ${additional.title}`,
          created_at: new Date().toISOString(),
        }));

        const allExtras = [...dbExtras, ...storeExtras];
        const uniqueExtras = allExtras.filter(
          (extra, index, self) =>
            index === self.findIndex((e) => e.id === extra.id)
        );

        setVehicleExtras(uniqueExtras);

        const saleAdditionalExpenses = uniqueExtras
          .filter((extra) => extra.type === 'sale_additional')
          .reduce((sum, extra) => {
            return sum + (extra.amount || 0);
          }, 0);

        setAdditionalExpenses(saleAdditionalExpenses);
      } catch (error) {
        console.error('Error in fetchAdditionalExpenses:', error);
      }
    };

    fetchAdditionalExpenses();
  }, [vehicle?.id, dealAdditionals]);

  useEffect(() => {
    const fetchAdditionalIncomes = async () => {
      if (!vehicle?.id) return;

      try {
        const { data: incomes, error } = await supabase
          .from('vehicles_extras')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .eq('type', 'sale_income');

        if (error) {
          console.error('Error fetching additional incomes:', error);
        }

        const dbIncomes = incomes || [];
        const storeIncomes = (dealIncomes || []).map((income) => ({
          id: income.id!,
          vehicle_id: vehicle.id,
          title: income.title,
          amount: income.amount,
          type: 'sale_income' as const,
          description: `Ingreso adicional del cierre de negocio: ${income.title}`,
          created_at: new Date().toISOString(),
        }));

        const allIncomes = [...dbIncomes, ...storeIncomes];
        const uniqueIncomes = allIncomes.filter(
          (income, index, self) =>
            index === self.findIndex((e) => e.id === income.id)
        );

        const totalIncomes = uniqueIncomes.reduce((sum, income) => {
          return sum + (income.amount || 0);
        }, 0);

        setAdditionalIncomes(totalIncomes);
      } catch (error) {
        console.error('Error in fetchAdditionalIncomes:', error);
      }
    };

    fetchAdditionalIncomes();
  }, [vehicle?.id, dealIncomes]);

  useEffect(() => {
    const fetchDealershipCharged = async () => {
      if (!vehicle?.id) return;

      try {
        const { data: extras, error } = await supabase
          .from('vehicles_extras')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .in('type', ['sale_additional', 'sale_income']);

        if (error) {
          console.error('Error fetching dealership-charged extras:', error);
          return;
        }

        // Se descuentan al consignador los extras con assumed_by='consignor' (el valor
        // correcto) y, por retrocompatibilidad, los 'dealership' históricos (antes del
        // tercer valor los cargos al consignador se guardaban como 'dealership') — así
        // no se mueven cierres ya hechos.
        // Para `sale_additional` el default histórico es 'dealership' (null → 'dealership').
        // Para `sale_income` el default es 'customer' (null → 'customer').
        const charged = (extras || []).reduce((sum, extra) => {
          const fallback = extra.type === 'sale_income' ? 'customer' : 'dealership';
          const assumed = extra.assumed_by ?? fallback;
          return assumed === 'consignor' || assumed === 'dealership'
            ? sum + (extra.amount || 0)
            : sum;
        }, 0);

        setDealershipChargedTotal(charged);
      } catch (error) {
        console.error('Error in fetchDealershipCharged:', error);
      }
    };

    fetchDealershipCharged();
  }, [vehicle?.id, dealAdditionals, dealIncomes]);

  const totalFinalPrice = dealDetails.finalSalePrice + transferValue;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const discount = dealDetails.discount || 0;
  const customerAmount =
    dealDetails.finalSalePrice -
    discount -
    dealDetails.dealershipCommission -
    dealershipChargedTotal;

  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
        {/* Vehicle Information */}
        <div className='p-2 rounded-lg border'>
          <p className='text-xs font-semibold text-slate-700 mb-1.5'>Información del Vehículo</p>
          {vehicle && (
            <div className='space-y-1 text-xs'>
              <div className='flex justify-between'>
                <span className='text-slate-500'>Marca y Modelo:</span>
                <span className='font-medium'>{vehicle.brand?.name} {vehicle.model?.name}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-slate-500'>Año:</span>
                <span className='font-medium'>{vehicle.year}</span>
              </div>
              {vehicle.license_plate && (
                <div className='flex justify-between'>
                  <span className='text-slate-500'>Patente:</span>
                  <span className='font-medium'>{vehicle.license_plate}</span>
                </div>
              )}
              <div className='flex justify-between'>
                <span className='text-slate-500'>Precio Venta:</span>
                <span className='font-medium'>{formatCurrency(dealDetails.finalSalePrice || 0)}</span>
              </div>
              {transferValue > 0 && (
                <div className='flex justify-between'>
                  <span className='text-slate-500'>Transferencia:</span>
                  <span className='font-medium text-blue-600'>{formatCurrency(transferValue)}</span>
                </div>
              )}
              <div className='flex justify-between'>
                <span className='text-slate-500'>Estado:</span>
                <Badge variant='outline' className='text-[10px] h-5'>
                  {vehicle.status?.name || 'N/A'}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Customer Information */}
        <div className='p-2 rounded-lg border'>
          <p className='text-xs font-semibold text-slate-700 mb-1.5'>Información del Cliente</p>
          {customer && (
            <div className='space-y-1 text-xs'>
              <div className='flex justify-between'>
                <span className='text-slate-500'>Nombre:</span>
                <span className='font-medium'>
                  {customer.full_name || `${customer.first_name} ${customer.last_name}`}
                </span>
              </div>
              {customer.rut && (
                <div className='flex justify-between'>
                  <span className='text-slate-500'>RUT:</span>
                  <span className='font-medium'>{customer.rut}</span>
                </div>
              )}
              {customer.email && (
                <div className='flex justify-between'>
                  <span className='text-slate-500'>Email:</span>
                  <span className='font-medium truncate ml-2'>{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className='flex justify-between'>
                  <span className='text-slate-500'>Teléfono:</span>
                  <span className='font-medium'>{customer.phone}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div className='p-2 rounded-lg border bg-slate-50/60'>
        <p className='text-xs font-semibold text-slate-700 mb-1.5'>Resumen Financiero</p>
        <div className='grid grid-cols-2 sm:grid-cols-5 gap-2'>
          <div className='p-2 bg-blue-50 rounded-lg text-center'>
            <div className='text-sm font-bold text-blue-900'>{formatCurrency(totalFinalPrice)}</div>
            <div className='text-[10px] text-blue-600 font-medium'>Precio Final</div>
            {transferValue > 0 && (
              <div className='text-[10px] text-blue-500'>Incl. transferencia</div>
            )}
          </div>
          {discount > 0 && (
            <div className='p-2 bg-orange-50 rounded-lg text-center'>
              <div className='text-sm font-bold text-orange-900'>- {formatCurrency(discount)}</div>
              <div className='text-[10px] text-orange-600 font-medium'>Descuento</div>
            </div>
          )}
          <div className='p-2 bg-green-50 rounded-lg text-center'>
            <div className='text-sm font-bold text-green-900'>{formatCurrency(dealDetails.dealershipCommission)}</div>
            <div className='text-[10px] text-green-600 font-medium'>
              Comisión ({dealDetails.dealershipCommissionPercentage.toFixed(2)}%)
            </div>
          </div>
          <div className='p-2 bg-purple-50 rounded-lg text-center'>
            <div className='text-sm font-bold text-purple-900'>{formatCurrency(customerAmount)}</div>
            <div className='text-[10px] text-purple-600 font-medium'>Para el Cliente</div>
            {dealershipChargedTotal > 0 && (
              <div className='text-[10px] text-red-600'>- {formatCurrency(dealershipChargedTotal)} consignador</div>
            )}
          </div>
          {additionalIncomes > 0 && (
            <div className='p-2 bg-emerald-50 rounded-lg text-center'>
              <div className='text-sm font-bold text-emerald-900'>+ {formatCurrency(additionalIncomes)}</div>
              <div className='text-[10px] text-emerald-700 font-medium'>Ingresos Automotora</div>
              <div className='text-[10px] text-emerald-600'>Accesorios, seguros, etc.</div>
            </div>
          )}
          <div className='p-2 bg-slate-100 rounded-lg text-center'>
            <div className='text-sm font-bold text-slate-900'>{getPaymentMethodLabel(dealDetails.paymentMethod)}</div>
            <div className='text-[10px] text-slate-600 font-medium'>Método de Pago</div>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      {(dealDetails.notes || dealDetails.termsAndConditions) && (
        <div className='p-2 rounded-lg border'>
          <p className='text-xs font-semibold text-slate-700 mb-1.5'>Detalles Adicionales</p>
          {dealDetails.notes && (
            <div className='mb-2'>
              <p className='text-[11px] text-slate-500 mb-1'>Observaciones:</p>
              <p className='text-xs text-slate-700 bg-slate-50 p-2 rounded border'>{dealDetails.notes}</p>
            </div>
          )}
          {dealDetails.termsAndConditions && (
            <div>
              <p className='text-[11px] text-slate-500 mb-1'>Términos y Condiciones:</p>
              <p className='text-xs text-slate-700 bg-slate-50 p-2 rounded border'>{dealDetails.termsAndConditions}</p>
            </div>
          )}
        </div>
      )}

      {/* Generation Info */}
      <div className='p-2 rounded-lg bg-amber-50 border border-amber-200'>
        <div className='flex items-start gap-2'>
          <CheckCircle className='w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0' />
          <div>
            <p className='text-xs font-medium text-amber-800'>
              Fecha: <strong>{formatDate(new Date())}</strong>
            </p>
            <p className='text-[11px] text-amber-700 mt-0.5'>
              El documento de cierre de negocio será registrado y estará disponible en la sección de documentos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryStep;
