import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Minus,
  ChevronsUpDown,
  Check,
  Plus,
  Trash2,
  Car,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useVehicleInfoByPatent } from '@/integrations/getapi';
import { deriveTradeInValue, cashDifferenceFromToma } from '@/utils/tradeInValue';
import {
  useVehicleSaleStore,
  TradeInVehicle,
} from '@/stores/vehicleSaleStore';
import AdditionalsCard from '../components/AdditionalsCard';
import PriceInput from '@/components/ui/inputs/price-input';
import { useBrands } from '@/hooks/useBrands';
import { useModels } from '@/hooks/useModels';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/functions';

const CARD = 'rounded-xl border border-slate-200 bg-white p-3 space-y-3';
const LABEL = 'text-xs font-medium text-slate-600';
const FIELD = 'h-9 text-[13px]';

// ─── Subcomponente: tarjeta de un vehículo en parte de pago ───

const TradeInVehicleCard = ({
  vehicle,
  index,
  canRemove,
  salePrice,
  deriveFromCash,
}: {
  vehicle: TradeInVehicle;
  index: number;
  canRemove: boolean;
  salePrice: number;
  // Cuando hay UN solo auto en parte de pago, el toma se DERIVA de la diferencia en
  // efectivo (regla 5b del fundamento contable): el dealer entra el efectivo, no el toma.
  deriveFromCash: boolean;
}) => {
  const { t } = useTranslation('vehicleSales');
  const { updateTradeInVehicle, removeTradeInVehicle } = useVehicleSaleStore();

  const { brands, isLoading: loadingBrands } = useBrands();
  const { models, isLoading: loadingModels } = useModels(vehicle.brand_id);

  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [searchingPatent, setSearchingPatent] = useState(false);
  const { fetchAndMapVehicleInfo } = useVehicleInfoByPatent();

  // Regla 5b: la DIFERENCIA EN EFECTIVO es lo que se negocia (fuente de verdad); el toma
  // se deriva del precio de venta REAL. Guardamos la diferencia en estado local y derivamos
  // el toma — así, si después cambia el precio de venta, el toma lo SIGUE (no queda congelado).
  const [cashDiff, setCashDiff] = useState<number | null>(null);
  // Inicializa la diferencia desde el toma guardado la primera vez que hay precio (modo
  // edición / al abrir). Después la diferencia manda.
  useEffect(() => {
    if (deriveFromCash && cashDiff === null && salePrice > 0) {
      setCashDiff(cashDifferenceFromToma(salePrice, vehicle.trade_in_value));
    }
  }, [deriveFromCash, salePrice, cashDiff, vehicle.trade_in_value]);
  // El toma = precio real − diferencia. Se recalcula si cambia el precio o la diferencia.
  useEffect(() => {
    if (!deriveFromCash || cashDiff === null) return;
    const toma = deriveTradeInValue(salePrice, cashDiff);
    if (toma !== vehicle.trade_in_value) updateTradeInVehicle(vehicle.id, { trade_in_value: toma });
  }, [deriveFromCash, salePrice, cashDiff, vehicle.id, vehicle.trade_in_value, updateTradeInVehicle]);

  // Jala marca/modelo/año por patente (mismo lookup que "agregar vehículo de 0"),
  // así no hay que tipearlos a mano. El valor de la permuta lo pone el vendedor.
  const handleSearchByPatent = async () => {
    const plate = vehicle.license_plate?.trim();
    if (!plate) {
      toast({
        title: 'Ingresa una patente',
        description: 'Escribe la patente del auto recibido para buscar su información.',
        variant: 'destructive',
      });
      return;
    }
    setSearchingPatent(true);
    try {
      // Solo necesitamos marca/modelo/año → pasamos brands y [] para el resto
      // (el lookup trae los modelos de la marca internamente).
      const { mappedData } = await fetchAndMapVehicleInfo(
        plate, brands, [], [], [], [], []
      );
      if (mappedData && (mappedData.brand_id || mappedData.year)) {
        update({
          brand_id: mappedData.brand_id || vehicle.brand_id,
          brand: mappedData.brand_name || vehicle.brand,
          model_id: mappedData.model_id || vehicle.model_id,
          model: mappedData.model_name || vehicle.model,
          year: mappedData.year || vehicle.year,
        });
        toast({
          title: 'Datos encontrados',
          description: `${mappedData.brand_name || ''} ${mappedData.model_name || ''} ${mappedData.year || ''}`.trim() || 'Revisa los datos.',
        });
      } else {
        toast({
          title: 'Sin resultados',
          description: 'No encontramos info para esa patente. Completa marca/modelo a mano.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error al buscar',
        description: 'No se pudo consultar la patente. Prueba de nuevo o llena manualmente.',
        variant: 'destructive',
      });
    } finally {
      setSearchingPatent(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1886 + 1 },
    (_, i) => currentYear - i
  );

  const update = (updates: Partial<TradeInVehicle>) =>
    updateTradeInVehicle(vehicle.id, updates);

  const handleBrandSelect = (brandId: string) => {
    const selectedBrand = brands.find((b) => b.id === brandId);
    update({
      brand_id: brandId,
      brand: selectedBrand?.name || '',
      model_id: '',
      model: '',
    });
    setBrandSearch('');
    setBrandOpen(false);
  };

  const handleModelSelect = (modelId: string) => {
    const selectedModel = models.find((m) => m.id.toString() === modelId);
    update({
      model_id: modelId,
      model: selectedModel?.name || '',
    });
    setModelSearch('');
    setModelOpen(false);
  };

  const filteredBrands = brands.filter((brand) => {
    if (!brandSearch.trim()) return true;
    return brand.name?.toLowerCase().includes(brandSearch.toLowerCase());
  });

  const filteredModels = models.filter((model) => {
    if (!modelSearch.trim()) return true;
    return model.name?.toLowerCase().includes(modelSearch.toLowerCase());
  });

  const selectedBrand = brands.find((b) => b.id === vehicle.brand_id);
  const selectedModel = models.find(
    (m) => m.id.toString() === vehicle.model_id?.toString()
  );

  return (
    <div className='rounded-xl border border-slate-200 p-3 space-y-3'>
      <div className='flex items-center justify-between'>
        <p className='text-[13px] font-medium text-slate-700 flex items-center gap-1.5'>
          <Car className='w-3.5 h-3.5 text-slate-400' />
          Vehículo {index + 1}
        </p>
        {canRemove && (
          <Button
            variant='ghost'
            size='sm'
            className='h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50'
            onClick={() => removeTradeInVehicle(vehicle.id)}
          >
            <Trash2 className='w-3.5 h-3.5' />
          </Button>
        )}
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        {/* Patente + buscar por patente (jala marca/modelo/año) */}
        <div className='space-y-1.5'>
          <Label className={LABEL}>{t('steps.tradeIn.details.licensePlate')} *</Label>
          <div className='flex gap-1.5'>
            <Input
              value={vehicle.license_plate}
              onChange={(e) => update({ license_plate: e.target.value.toUpperCase() })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchByPatent();
                }
              }}
              placeholder={t('steps.tradeIn.details.licensePlaceholder')}
              className={`uppercase ${FIELD}`}
            />
            <Button
              type='button'
              variant='outline'
              onClick={handleSearchByPatent}
              disabled={searchingPatent || !vehicle.license_plate?.trim()}
              title='Buscar marca, modelo y año por patente'
              className={`shrink-0 px-2.5 gap-1.5 text-[12px] ${FIELD}`}
            >
              {searchingPatent ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Sparkles className='w-3.5 h-3.5' />
              )}
              <span className='hidden sm:inline'>Buscar</span>
            </Button>
          </div>
        </div>

        {/* Año */}
        <div className='space-y-1.5'>
          <Label className={LABEL}>{t('steps.tradeIn.details.year')} *</Label>
          <Select
            value={vehicle.year.toString()}
            onValueChange={(value) => update({ year: parseInt(value) })}
          >
            <SelectTrigger className={FIELD}>
              <SelectValue placeholder={t('steps.tradeIn.details.selectYear')} />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Marca */}
        <div className='space-y-1.5'>
          <Label className={LABEL}>{t('steps.tradeIn.details.brand')} *</Label>
          <Popover open={brandOpen} onOpenChange={setBrandOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                role='combobox'
                aria-expanded={brandOpen}
                className={cn(
                  'w-full justify-between font-normal text-[13px]',
                  FIELD,
                  !selectedBrand && 'text-muted-foreground'
                )}
                disabled={loadingBrands}
              >
                <span className='truncate'>
                  {selectedBrand
                    ? selectedBrand.name
                    : t('steps.tradeIn.details.selectBrand')}
                </span>
                <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0' align='start'>
              <div className='flex flex-col'>
                <div className='p-2 border-b'>
                  <Input
                    placeholder={t('steps.tradeIn.details.searchBrand')}
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    className='h-8 text-[13px]'
                  />
                </div>
                <ScrollArea className='h-48'>
                  <div className='p-1'>
                    {loadingBrands ? (
                      <div className='px-2 py-4 text-center text-xs text-muted-foreground'>
                        {t('steps.tradeIn.details.loadingBrands')}
                      </div>
                    ) : filteredBrands.length > 0 ? (
                      filteredBrands.map((brand) => (
                        <div
                          key={brand.id}
                          className={cn(
                            'flex items-center rounded-md px-2 py-1.5 cursor-pointer hover:bg-accent transition-colors text-[13px]',
                            brand.id === vehicle.brand_id && 'bg-accent'
                          )}
                          onClick={() => handleBrandSelect(brand.id)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-3.5 w-3.5 flex-shrink-0',
                              brand.id === vehicle.brand_id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className='truncate'>{brand.name}</div>
                        </div>
                      ))
                    ) : (
                      <div className='px-2 py-4 text-center text-xs text-muted-foreground'>
                        No se encontraron marcas
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Modelo */}
        <div className='space-y-1.5'>
          <Label className={LABEL}>{t('steps.tradeIn.details.model')} *</Label>
          <Popover open={modelOpen} onOpenChange={setModelOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                role='combobox'
                aria-expanded={modelOpen}
                className={cn(
                  'w-full justify-between font-normal text-[13px]',
                  FIELD,
                  !selectedModel && 'text-muted-foreground'
                )}
                disabled={loadingModels || !vehicle.brand_id}
              >
                <span className='truncate'>
                  {selectedModel
                    ? selectedModel.name
                    : !vehicle.brand_id
                    ? t('steps.tradeIn.details.selectBrandFirst')
                    : t('steps.tradeIn.details.selectModel')}
                </span>
                <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0' align='start'>
              <div className='flex flex-col'>
                <div className='p-2 border-b'>
                  <Input
                    placeholder={t('steps.tradeIn.details.searchModel')}
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    className='h-8 text-[13px]'
                  />
                </div>
                <ScrollArea className='h-48'>
                  <div className='p-1'>
                    {loadingModels ? (
                      <div className='px-2 py-4 text-center text-xs text-muted-foreground'>
                        {t('steps.tradeIn.details.loadingModels')}
                      </div>
                    ) : filteredModels.length > 0 ? (
                      filteredModels.map((model) => (
                        <div
                          key={model.id}
                          className={cn(
                            'flex items-center rounded-md px-2 py-1.5 cursor-pointer hover:bg-accent transition-colors text-[13px]',
                            model.id.toString() === vehicle.model_id?.toString() && 'bg-accent'
                          )}
                          onClick={() => handleModelSelect(model.id.toString())}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-3.5 w-3.5 flex-shrink-0',
                              model.id.toString() === vehicle.model_id?.toString()
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          <div className='truncate'>{model.name}</div>
                        </div>
                      ))
                    ) : (
                      <div className='px-2 py-4 text-center text-xs text-muted-foreground'>
                        {!vehicle.brand_id
                          ? t('steps.tradeIn.details.selectBrandFirst')
                          : t('steps.tradeIn.details.noModels')}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Valor de la permuta */}
      {deriveFromCash && salePrice > 0 ? (
        // El vendedor pone el VALOR DE TOMA (lo que le reconoce al auto del cliente).
        // La diferencia con el precio de venta real se calcula y se muestra: si el
        // cliente paga (toma < venta) o si queda saldo A FAVOR (toma > venta).
        <div className='space-y-2'>
          <div className='space-y-1.5'>
            <Label className={LABEL}>Valor de toma del auto recibido *</Label>
            <PriceInput
              value={vehicle.trade_in_value}
              onChange={(toma) => setCashDiff(cashDifferenceFromToma(salePrice, toma))}
              placeholder='Ej: 8.000.000'
              className={`w-full ${FIELD}`}
            />
          </div>
          {(vehicle.trade_in_value || 0) > salePrice ? (
            <div className='flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2'>
              <span className='text-[12px] font-medium text-emerald-700'>Saldo a favor del cliente</span>
              <span className='text-[13px] font-semibold text-emerald-800'>
                {formatCurrency((vehicle.trade_in_value || 0) - salePrice)}
              </span>
            </div>
          ) : (
            <div className='flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2'>
              <span className='text-[12px] text-slate-500'>Diferencia que paga el cliente en efectivo</span>
              <span className='text-[13px] font-semibold text-slate-900'>
                {formatCurrency(salePrice - (vehicle.trade_in_value || 0))}
              </span>
            </div>
          )}
          <p className='text-[11px] text-slate-400'>
            Es el costo con el que el auto entra al inventario. Si supera el precio de venta,
            el excedente queda como saldo a favor del cliente.
          </p>
        </div>
      ) : (
        <div className='space-y-1.5'>
          <Label className={LABEL}>{t('steps.tradeIn.details.tradeInValue')} *</Label>
          <PriceInput
            value={vehicle.trade_in_value}
            onChange={(value) => update({ trade_in_value: value })}
            placeholder={t('steps.tradeIn.details.tradeInValuePlaceholder')}
            className={`w-full ${FIELD}`}
          />
        </div>
      )}
    </div>
  );
};

// ─── Componente principal: Permuta (+ tarjeta compartida de Adicionales) ───

const TradeInStep = () => {
  const { t } = useTranslation('vehicleSales');
  const {
    tradeInInfo,
    saleInfo,
    updateTradeInInfo,
    addTradeInVehicle,
    getRemainingAmount,
    additionals,
    reservationExtras,
  } = useVehicleSaleStore();

  const totalTradeInValue = tradeInInfo.vehicles.reduce(
    (sum, v) => sum + (v.trade_in_value || 0),
    0
  );
  const incomeAdditionals = additionals.filter((a) => (a.kind ?? 'income') !== 'expense');
  const expenseAdditionals = additionals.filter((a) => (a.kind ?? 'income') === 'expense');
  const reservationAdditionals = reservationExtras.filter(
    (e) => e.type === 'reservation_additional'
  );

  const handleTradeInChange = (hasTradeIn: boolean) => {
    updateTradeInInfo({ hasTradeIn });
    if (hasTradeIn && tradeInInfo.vehicles.length === 0) {
      addTradeInVehicle();
    }
    if (!hasTradeIn) {
      updateTradeInInfo({ hasTradeIn: false, vehicles: [] });
    }
  };

  return (
    <div className='space-y-3'>
      {/* ── Permuta ── */}
      <div className={CARD}>
        <div className='flex items-center justify-between'>
          <p className='text-[13px] font-semibold text-slate-900'>
            {t('steps.tradeIn.question')}
          </p>
          <div className='inline-flex rounded-lg border border-slate-200 p-0.5'>
            <button
              type='button'
              onClick={() => handleTradeInChange(false)}
              className={`px-3 py-1 text-[12px] rounded-md transition-colors ${
                !tradeInInfo.hasTradeIn
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t('steps.tradeIn.answers.no')}
            </button>
            <button
              type='button'
              onClick={() => handleTradeInChange(true)}
              className={`px-3 py-1 text-[12px] rounded-md transition-colors ${
                tradeInInfo.hasTradeIn
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t('steps.tradeIn.answers.yes')}
            </button>
          </div>
        </div>

        {tradeInInfo.hasTradeIn && (
          <div className='space-y-3'>
            {tradeInInfo.vehicles.map((vehicle, index) => (
              <TradeInVehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                index={index}
                canRemove={tradeInInfo.vehicles.length > 1}
                salePrice={saleInfo.salePrice || 0}
                deriveFromCash={tradeInInfo.vehicles.length === 1}
              />
            ))}
            <Button
              variant='outline'
              size='sm'
              className='w-full h-9 text-[12px] border-dashed'
              onClick={addTradeInVehicle}
            >
              <Plus className='w-3.5 h-3.5 mr-1.5' />
              Agregar otro vehículo en parte de pago
            </Button>
          </div>
        )}
      </div>

      {/* ── Adicionales (tarjeta compartida — también vive en el paso Venta) ── */}
      <AdditionalsCard />

      {/* ── Resumen ── */}
      <div className='rounded-xl border border-slate-200 bg-slate-50/70 p-3'>
        <p className='text-[13px] font-semibold text-slate-900 mb-2'>
          {t('steps.tradeIn.summary.title')}
        </p>
        <div className='space-y-1.5 text-[13px]'>
          <div className='flex justify-between'>
            <span className='text-slate-500'>{t('steps.tradeIn.summary.salePrice')}</span>
            <span className='font-medium text-slate-900'>{formatCurrency(saleInfo.salePrice)}</span>
          </div>

          {incomeAdditionals.length > 0 && (
            <div className='flex justify-between'>
              <span className='text-slate-500'>Adicionales (ingreso)</span>
              <span className='font-medium text-emerald-600'>
                +{formatCurrency(incomeAdditionals.reduce((s, a) => s + a.price, 0))}
              </span>
            </div>
          )}

          {expenseAdditionals.length > 0 && (
            <div className='flex justify-between'>
              <span className='text-slate-500'>Adicionales (gasto)</span>
              <span className='font-medium text-red-600'>
                −{formatCurrency(expenseAdditionals.reduce((s, a) => s + a.price, 0))}
              </span>
            </div>
          )}

          {reservationAdditionals.length > 0 && (
            <div className='flex justify-between'>
              <span className='text-slate-500'>{t('steps.tradeIn.summary.reservationAdditionals')}</span>
              <span className='font-medium text-emerald-600'>
                +{formatCurrency(reservationAdditionals.reduce((s, e) => s + e.amount, 0))}
              </span>
            </div>
          )}

          {tradeInInfo.hasTradeIn && totalTradeInValue > 0 && (
            <div className='flex justify-between'>
              <span className='flex items-center gap-1 text-slate-500'>
                <Minus className='w-3 h-3' />
                {t('steps.tradeIn.summary.tradeInValue')} ({tradeInInfo.vehicles.length})
              </span>
              <span className='font-medium text-slate-700'>−{formatCurrency(totalTradeInValue)}</span>
            </div>
          )}

          <div className='flex justify-between pt-2 border-t border-slate-200'>
            <span className='font-semibold text-slate-900'>{t('steps.tradeIn.summary.totalToPay')}</span>
            <span className='font-semibold text-slate-900'>{formatCurrency(getRemainingAmount())}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeInStep;
