import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TimelineEventsList from './timeline/TimelineEventsList';
import TimelineSummary from './timeline/TimelineSummary';
import { useTimelineEvents } from './timeline/hooks/useTimelineEvents';
import { Vehicle } from '@/types/vehicle';
import TransactionForm from './transactions/TransactionForm';
import { TransactionFormValues } from './transactions/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { lineCostBasis } from '@/utils/fiscalCredit';

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n || 0);

const typeLabel = (type: string) =>
  type === 'income' || type === 'sale'
    ? 'Ingreso'
    : type === 'expense'
    ? 'Gasto'
    : type === 'acquisition'
    ? 'Adquisición'
    : type === 'commission'
    ? 'Comisión'
    : type === 'status_change'
    ? 'Cambio de estado'
    : type === 'document'
    ? 'Documento'
    : type;

type VehicleTimelineProps = {
  vehicle: Vehicle;
};

const VehicleTimeline = ({ vehicle }: VehicleTimelineProps) => {
  const { t } = useTranslation('vehicleTimeline');
  const queryClient = useQueryClient();
  // Avisa a las queries de ventas para que el Resumen Financiero (otra instancia de
  // useVehicleFinancialData) se recalcule al editar/eliminar un movimiento, no solo al agregar.
  const invalidateFinancials = () => {
    queryClient.invalidateQueries({ queryKey: ['salesSummary'] });
    queryClient.invalidateQueries({ queryKey: ['soldVehicles'] });
    queryClient.invalidateQueries({ queryKey: ['vehicle-net-profits-by-period'] });
  };
  const {
    sortedEvents,
    totalExpenses,
    totalIncome,
    netResult,
    regimen,
    ivaDebitoFiscal,
    isLoading,
    refetchData,
  } = useTimelineEvents(vehicle);
  const [isMobile, setIsMobile] = useState(false);
  const [filter, setFilter] = useState('todos');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'add' | 'edit'>('add');
  const [sheetInitialValues, setSheetInitialValues] = useState<any>(null);
  const [eventToEdit, setEventToEdit] = useState<any>(null);
  const [eventToDelete, setEventToDelete] = useState<any>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const filterOptions = [
    { value: 'todos', label: t('filters.all') },
    { value: 'ingresos', label: t('filters.income') },
    { value: 'gastos', label: t('filters.expenses') },
  ];

  const filteredEvents = sortedEvents.filter((event) => {
    if (filter === 'todos') return true;
    if (filter === 'ingresos')
      return event.type === 'income' || event.type === 'sale';
    if (filter === 'gastos')
      return event.type === 'expense' || event.type === 'acquisition';
    return true;
  });

  useEffect(() => {
    const checkDeviceSize = () => setIsMobile(window.innerWidth < 640);
    checkDeviceSize();
    window.addEventListener('resize', checkDeviceSize);
    return () => window.removeEventListener('resize', checkDeviceSize);
  }, []);

  const handleEditEvent = (event: any) => {
    setSheetMode('edit');
    setSheetInitialValues({
      title: event.title,
      description: event.description,
      type: event.type,
      amount: event.amount,
      category_id: event.category_id,
      assumed_by: event.assumed_by ?? 'dealership',
      genera_credito_fiscal: event.genera_credito_fiscal ?? false,
      is_passthrough: event.is_passthrough ?? false,
      documents: undefined,
    });
    setEventToEdit(event);
    setSheetOpen(true);
  };

  const handleDeleteEvent = async (event: any) => {
    if (!event || !event.id) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('vehicles_extras')
        .delete()
        .eq('id', event.id);
      if (error) throw error;
      toast.success(t('toasts.deleted'));
      setSheetOpen(false);
      setEventToEdit(null);
      setEventToDelete(null);
      setConfirmDeleteOpen(false);
      refetchData();
      invalidateFinancials();
    } catch (err) {
      toast.error('Error al eliminar el evento');
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteConfirmation = (event: any) => {
    setEventToDelete(event);
    setConfirmDeleteOpen(true);
  };

  const handleEditSubmit = async (values: TransactionFormValues) => {
    if (!eventToEdit) return;
    setSavingEdit(true);
    try {
      // Los adicionales de venta ('sale_additional'/'sale_income') llegan a la UI
      // mapeados a expense/income (según assumed_by). Si guardáramos `values.type`
      // los reclasificaríamos a 'expense'/'income' plano, sacándolos de la
      // liquidación del consignador (que filtra .in('type', ['sale_additional',
      // 'sale_income'])). Preservamos el tipo REAL de la fila para no corromperlo.
      const rawType = (eventToEdit as any).raw_type;
      const isSaleExtra =
        rawType === 'sale_additional' || rawType === 'sale_income';
      const typeToPersist = isSaleExtra ? rawType : values.type;
      const { error } = await supabase
        .from('vehicles_extras')
        .update({
          title: values.title,
          description: values.description,
          amount: values.amount,
          type: typeToPersist,
          category_id: values.category_id ?? null,
          assumed_by: values.assumed_by ?? 'dealership',
          // Regla 3 (IVA por línea): directo en el UPDATE (migración 20260618000000 aplicada).
          // Gasto = crédito fiscal recuperable; ingreso = débito fiscal (afecto a IVA).
          genera_credito_fiscal:
            values.type === 'expense' || values.type === 'income'
              ? !!values.genera_credito_fiscal
              : null,
          // Pass-through: dinero solo traspasado → informativo, fuera del margen.
          is_passthrough: !!values.is_passthrough,
        })
        .eq('id', eventToEdit.id);

      if (error) throw error;

      toast.success(t('toasts.updated'));
      setEventToEdit(null);
      setSheetOpen(false);
      refetchData();
      invalidateFinancials();
    } catch (err) {
      console.error('Error updating transaction:', err);
      toast.error(t('toasts.updateError'));
    } finally {
      setSavingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <Card className='rounded-2xl border border-slate-200/60'>
        <CardHeader>
          <CardTitle className='text-base'>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='animate-pulse space-y-3'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='h-16 rounded-xl bg-slate-100' />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      <TimelineSummary
        eventCount={sortedEvents.length}
        totalExpenses={totalExpenses}
        totalIncome={totalIncome}
        netResult={netResult}
        regimen={regimen}
        ivaDebitoFiscal={ivaDebitoFiscal}
        isCompact={isMobile}
      />

      <Card className='overflow-hidden rounded-2xl border border-slate-200/60'>
        <CardHeader className='flex flex-row items-center justify-between gap-3 space-y-0 border-b border-slate-100 px-5 py-4'>
          <CardTitle className='text-base font-semibold text-slate-900'>
            {t('title')}
          </CardTitle>
          {/* Filtro segmentado */}
          <div className='inline-flex rounded-lg bg-slate-100 p-0.5'>
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type='button'
                onClick={() => setFilter(option.value)}
                className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors sm:px-3 ${
                  filter === option.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className='px-4 py-5 sm:px-5'>
          <TimelineEventsList
            events={filteredEvents}
            isConsigned={!!vehicle.is_consigned}
            onSelect={setSelectedEvent}
            onEdit={handleEditEvent}
            onDelete={openDeleteConfirmation}
          />
        </CardContent>
      </Card>

      {/* Sheet lateral para editar movimiento */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className='flex w-full flex-col p-0 sm:max-w-lg'>
          <SheetHeader className='shrink-0 border-b px-6 py-4'>
            <SheetTitle className='text-xl'>
              {sheetMode === 'edit'
                ? sheetInitialValues?.type === 'income'
                  ? t('sheet.title.editIncome')
                  : sheetInitialValues?.type === 'expense'
                  ? t('sheet.title.editExpense')
                  : t('sheet.title.edit')
                : t('sheet.title.add')}
            </SheetTitle>
          </SheetHeader>
          <div className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
            <TransactionForm
              formRef={undefined}
              onSubmit={handleEditSubmit}
              isUploading={savingEdit}
              mode={sheetMode}
              initialType={sheetInitialValues?.type || 'expense'}
              initialValues={sheetInitialValues}
              isConsigned={!!vehicle.is_consigned}
              onCancel={() => {
                setSheetOpen(false);
                setEventToEdit(null);
                setSheetInitialValues(null);
              }}
            />
          </div>
          <SheetFooter className='shrink-0 gap-2 border-t px-6 py-4 sm:space-x-0'>
            <Button
              variant='outline'
              className='flex-1'
              onClick={() => setSheetOpen(false)}
              disabled={savingEdit}
            >
              {t('sheet.buttons.cancel')}
            </Button>
            <Button
              className='flex-1'
              onClick={() => {
                const form = document.querySelector('form');
                if (form)
                  form.dispatchEvent(
                    new Event('submit', { cancelable: true, bubbles: true })
                  );
              }}
              disabled={savingEdit}
            >
              {sheetMode === 'edit' ? t('sheet.buttons.update') : t('sheet.buttons.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete.title')}</DialogTitle>
          </DialogHeader>
          <p className='mb-4'>{t('confirmDelete.message')}</p>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={savingEdit}
            >
              {t('confirmDelete.cancel')}
            </Button>
            <Button
              variant='destructive'
              onClick={() => handleDeleteEvent(eventToDelete)}
              disabled={savingEdit}
            >
              {t('confirmDelete.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle del movimiento */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={(o) => !o && setSelectedEvent(null)}
      >
        <DialogContent className='sm:max-w-md'>
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className='text-base'>
                  {selectedEvent.title}
                </DialogTitle>
              </DialogHeader>
              <div className='space-y-3 text-sm'>
                <div className='flex items-center justify-between gap-3'>
                  <span className='text-slate-500'>Tipo</span>
                  <span className='font-medium text-slate-700'>
                    {typeLabel(selectedEvent.type)}
                  </span>
                </div>
                {selectedEvent.type !== 'status_change' &&
                  selectedEvent.type !== 'document' && (
                    <div className='flex items-start justify-between gap-3'>
                      <span className='text-slate-500'>Monto</span>
                      <div className='text-right'>
                        <span className='font-semibold text-slate-800'>
                          {fmtMoney(Math.abs(selectedEvent.amount))}
                        </span>
                        {selectedEvent.type === 'expense' &&
                          selectedEvent.genera_credito_fiscal && (
                            <p className='text-[11px] text-slate-400'>
                              neto{' '}
                              {fmtMoney(lineCostBasis(selectedEvent.amount, true))} ·
                              IVA −
                              {fmtMoney(
                                selectedEvent.amount -
                                  lineCostBasis(selectedEvent.amount, true)
                              )}
                            </p>
                          )}
                        {selectedEvent.type === 'income' &&
                          selectedEvent.genera_credito_fiscal && (
                            <p className='text-[11px] text-slate-400'>
                              IVA débito incluido{' '}
                              {fmtMoney(
                                selectedEvent.amount -
                                  lineCostBasis(selectedEvent.amount, true)
                              )}
                            </p>
                          )}
                      </div>
                    </div>
                  )}
                {(selectedEvent.type === 'expense' ||
                  selectedEvent.type === 'income') &&
                  selectedEvent.assumed_by && (
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-slate-500'>Asumido por</span>
                      <span className='font-medium text-slate-700'>
                        {selectedEvent.assumed_by === 'dealership'
                          ? 'Automotora'
                          : selectedEvent.assumed_by === 'consignor'
                          ? 'Consignador'
                          : 'Cliente'}
                      </span>
                    </div>
                  )}
                <div className='flex items-center justify-between gap-3'>
                  <span className='text-slate-500'>Fecha</span>
                  <span className='font-medium text-slate-700'>
                    {format(new Date(selectedEvent.date), "dd 'de' MMMM yyyy · HH:mm", {
                      locale: es,
                    })}
                  </span>
                </div>
                {selectedEvent.description && (
                  <div className='flex flex-col gap-1 border-t border-slate-100 pt-3'>
                    <span className='text-slate-500'>Descripción</span>
                    <p className='text-slate-700'>{selectedEvent.description}</p>
                  </div>
                )}
                {selectedEvent.docs_urls &&
                  selectedEvent.docs_urls.length > 0 && (
                    <div className='flex items-center justify-between gap-3 border-t border-slate-100 pt-3'>
                      <span className='text-slate-500'>Documento</span>
                      <a
                        href={selectedEvent.docs_urls[0]}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='font-medium text-sky-600 hover:underline'
                      >
                        Ver documento
                      </a>
                    </div>
                  )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleTimeline;
