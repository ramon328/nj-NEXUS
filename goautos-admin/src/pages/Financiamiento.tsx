import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import FinanciamientoList from '@/components/financing/FinanciamientoList';
import FinanciamientoForm from '@/components/financing/FinanciamientoForm';
import VehiclesPagination from '@/components/vehiculos/VehiclesPagination';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { PlusCircle, Banknote, DollarSign, AlertTriangle, TrendingUp, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Financing } from '@/types/financing';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/hooks/useI18n';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';
import { calculateProgress } from '@/components/financing/utils/financingStatusUtils';
import posthog from '@/utils/posthog';

const PAGE_SIZE = 10;

const Financiamiento = () => {
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { clientId } = useAuth();
  const { tCommon } = useI18n();
  const { t: tFinancing } = useTranslation('financingPage');

  const {
    data: financingList,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['financingList', clientId],
    queryFn: async () => {
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('client_id', clientId);

      if (vehiclesError) {
        console.error('Error fetching vehicles:', vehiclesError);
        toast({
          title: tCommon('actions.error'),
          description: tFinancing('toasts.loadVehiclesError'),
          variant: 'destructive',
        });
        return [];
      }

      if (!vehiclesData || vehiclesData.length === 0) {
        return [];
      }

      const vehicleIds = vehiclesData.map((vehicle) => vehicle.id);

      const { data, error } = await supabase
        .from('financing')
        .select(
          `
          *,
          customer:customer_id(first_name, last_name, rut),
          vehicle:vehicle_id(brand_id, model_id, year, license_plate),
          payments:financing_payment(*)
        `
        )
        .in('vehicle_id', vehicleIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching financing list:', error);
        toast({
          title: tCommon('actions.error'),
          description: tFinancing('toasts.loadFinancingError'),
          variant: 'destructive',
        });
        return [];
      }

      return (data || []).map((financing) => ({
        ...financing,
        payments: financing.payments
          ? financing.payments.map((payment) => ({
              ...payment,
              payment_status: payment.payment_status as
                | 'pending'
                | 'paid'
                | 'late',
            }))
          : [],
      })) as Financing[];
    },
  });

  const allItems = financingList || [];
  const totalCount = allItems.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return allItems.slice(start, start + PAGE_SIZE);
  }, [allItems, currentPage]);

  // KPI calculations
  const kpis = useMemo(() => {
    const totalFinanced = allItems.reduce(
      (sum, f) => sum + Number(f.monthly_installment) * f.total_installments,
      0
    );
    const lateCount = allItems.filter((f) =>
      f.payments?.some((p) => p.payment_status === 'late')
    ).length;
    const avgProgress =
      allItems.length > 0
        ? allItems.reduce((sum, f) => sum + calculateProgress(f), 0) / allItems.length
        : 0;

    return { totalFinanced, lateCount, avgProgress };
  }, [allItems]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    posthog.capture({
      distinctId: clientId || 'anonymous',
      event: 'financing_filtered',
      properties: {
        page,
        page_size: PAGE_SIZE,
        total_count: totalCount,
      },
    });
  }, [clientId, totalCount]);

  const handleFormSuccess = () => {
    setShowFormDialog(false);
    refetch();
    toast({
      title: tCommon('actions.success'),
      description: tFinancing('toasts.added'),
    });
  };

  return (
    <DashboardLayout>
      <main className='flex flex-col h-full bg-[#f5f5f7]'>
        {/* Header */}
        <div className='sticky top-0 z-10 bg-[#f5f5f7] border-b border-slate-200/60'>
          <div className='px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-2 sm:pb-3'>

            {/* KPI Summary — Mobile: horizontal scroll / Desktop: grid */}
            {!isLoading && allItems.length > 0 && (
              <>
                {/* Mobile: scroll row */}
                <div className='flex sm:hidden gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 snap-x'>
                  <div className='rounded-2xl bg-white border border-slate-200/60 overflow-hidden min-w-[88%] shrink-0 snap-start'>
                    <div className='p-5 pb-6 flex flex-col gap-3'>
                      <div className='flex items-center justify-between'>
                        <p className='text-[13px] text-slate-500 font-medium'>Total</p>
                        <div className='h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600'>
                          <Banknote className='h-5 w-5' />
                        </div>
                      </div>
                      <h4 className='text-[28px] font-bold tracking-tight text-slate-900 leading-none tabular-nums'>{allItems.length}</h4>
                    </div>
                  </div>
                  <div className='rounded-2xl bg-white border border-slate-200/60 overflow-hidden min-w-[88%] shrink-0 snap-start'>
                    <div className='p-5 pb-6 flex flex-col gap-3'>
                      <div className='flex items-center justify-between'>
                        <p className='text-[13px] text-slate-500 font-medium'>Total Financiado</p>
                        <div className='h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600'>
                          <DollarSign className='h-5 w-5' />
                        </div>
                      </div>
                      <h4 className='text-[28px] font-bold tracking-tight text-slate-900 leading-none tabular-nums'>{formatCurrency(kpis.totalFinanced)}</h4>
                    </div>
                  </div>
                  <div className='rounded-2xl bg-white border border-slate-200/60 overflow-hidden min-w-[88%] shrink-0 snap-start'>
                    <div className='p-5 pb-6 flex flex-col gap-3'>
                      <div className='flex items-center justify-between'>
                        <p className='text-[13px] text-slate-500 font-medium'>Atrasados</p>
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${kpis.lateCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                          <AlertTriangle className='h-5 w-5' />
                        </div>
                      </div>
                      <h4 className={`text-[28px] font-bold tracking-tight leading-none tabular-nums ${kpis.lateCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{kpis.lateCount}</h4>
                    </div>
                  </div>
                  <div className='rounded-2xl bg-white border border-slate-200/60 overflow-hidden min-w-[88%] shrink-0 snap-start'>
                    <div className='p-5 pb-6 flex flex-col gap-3'>
                      <div className='flex items-center justify-between'>
                        <p className='text-[13px] text-slate-500 font-medium'>Progreso Promedio</p>
                        <div className='h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600'>
                          <TrendingUp className='h-5 w-5' />
                        </div>
                      </div>
                      <h4 className='text-[28px] font-bold tracking-tight text-slate-900 leading-none tabular-nums'>{Math.round(kpis.avgProgress)}%</h4>
                    </div>
                  </div>
                </div>

                {/* Desktop: card grid matching AdminStats style */}
                <div className='hidden sm:grid grid-cols-4 gap-2.5'>
                  <div className='rounded-2xl bg-white border border-slate-200/60 overflow-hidden'>
                    <div className='flex items-start justify-between py-3 px-3 md:py-4 md:px-4'>
                      <div className='flex-1 min-w-0'>
                        <h4 className='font-semibold text-lg md:text-xl tracking-tight text-slate-900 tabular-nums'>{allItems.length}</h4>
                        <p className='text-[13px] text-slate-500 mt-0.5'>Total</p>
                      </div>
                      <div className='h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 shrink-0'>
                        <Banknote className='h-5 w-5' />
                      </div>
                    </div>
                  </div>

                  <div className='rounded-2xl bg-white border border-slate-200/60 overflow-hidden'>
                    <div className='flex items-start justify-between py-3 px-3 md:py-4 md:px-4'>
                      <div className='flex-1 min-w-0'>
                        <h4 className='font-semibold text-lg md:text-xl tracking-tight text-slate-900 truncate tabular-nums'>{formatCurrency(kpis.totalFinanced)}</h4>
                        <p className='text-[13px] text-slate-500 mt-0.5'>Total Financiado</p>
                      </div>
                      <div className='h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 shrink-0'>
                        <DollarSign className='h-5 w-5' />
                      </div>
                    </div>
                  </div>

                  <div className='rounded-2xl bg-white border border-slate-200/60 overflow-hidden'>
                    <div className='flex items-start justify-between py-3 px-3 md:py-4 md:px-4'>
                      <div className='flex-1 min-w-0'>
                        <h4 className={`font-semibold text-lg md:text-xl tracking-tight tabular-nums ${kpis.lateCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{kpis.lateCount}</h4>
                        <p className='text-[13px] text-slate-500 mt-0.5'>Atrasados</p>
                      </div>
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${kpis.lateCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                        <AlertTriangle className='h-5 w-5' />
                      </div>
                    </div>
                  </div>

                  <div className='rounded-2xl bg-white border border-slate-200/60 overflow-hidden'>
                    <div className='flex items-start justify-between py-3 px-3 md:py-4 md:px-4'>
                      <div className='flex-1 min-w-0'>
                        <h4 className='font-semibold text-lg md:text-xl tracking-tight text-slate-900 tabular-nums'>{Math.round(kpis.avgProgress)}%</h4>
                        <p className='text-[13px] text-slate-500 mt-0.5'>Progreso Promedio</p>
                      </div>
                      <div className='h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 shrink-0'>
                        <TrendingUp className='h-5 w-5' />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Scrollable Content */}
        <div className='flex-1 overflow-auto relative z-0'>
          <div className='w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4'>
            <div className='flex justify-end mb-3'>
              <Button
                onClick={() => setShowFormDialog(true)}
                className='h-9 rounded-xl text-[13px] font-medium px-3.5'
              >
                <PlusCircle className='mr-1.5 h-4 w-4' />
                <span className='hidden sm:inline'>{tFinancing('page.newFinancing')}</span>
                <span className='sm:hidden'>Nuevo</span>
              </Button>
            </div>
            {/* Financing List */}
            <div data-tour='financing-list'>
              {isLoading ? (
                <div className='flex items-center justify-center py-20'>
                  <div className='animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent' />
                </div>
              ) : (
                <FinanciamientoList financingList={paginatedList} />
              )}
            </div>
          </div>
        </div>

        {/* Pagination — fixed at bottom */}
        {!isLoading && totalCount > 0 && (
          <div className='border-t border-slate-200/60'>
            <VehiclesPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
              isLoading={isLoading}
            />
          </div>
        )}
      </main>

      {/* New Financing Drawer */}
      <Drawer open={showFormDialog} onOpenChange={setShowFormDialog} direction="right">
        <DrawerContentRight className="bg-[#f5f5f7] p-0 md:min-w-[560px] md:max-w-[640px]">
          <div className="flex flex-col h-full">
            <div className="bg-white px-5 py-4 border-b border-slate-100 shrink-0 flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-slate-900 tracking-tight leading-tight">
                {tCommon('financing.form.titleNew')}
              </h2>
              <button
                onClick={() => setShowFormDialog(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-4" data-tour='financing-form'>
              <FinanciamientoForm
                onSuccess={handleFormSuccess}
                onCancel={() => setShowFormDialog(false)}
              />
            </div>
          </div>
        </DrawerContentRight>
      </Drawer>
    </DashboardLayout>
  );
};

export default Financiamiento;
