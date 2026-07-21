import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRangeFilter } from './utils/salesDataFetchers';

const inclusiveDays = (start: Date, end: Date) => {
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  if (b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
};

const fixedExpensesForRange = (
  monthlyAmount: number,
  rangeStart: Date,
  rangeEnd: Date
): number => {
  if (monthlyAmount <= 0 || rangeEnd < rangeStart) return 0;

  let total = 0;
  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const endStop = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

  while (cursor <= endStop) {
    const monthFirst = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthLast = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const daysInMonth = monthLast.getDate();
    const effStart = monthFirst < rangeStart ? rangeStart : monthFirst;
    const effEnd = monthLast > rangeEnd ? rangeEnd : monthLast;
    if (effStart <= effEnd) {
      total += monthlyAmount * (inclusiveDays(effStart, effEnd) / daysInMonth);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return total;
};

export interface OperationalExpensesResult {
  unattributedExtras: number;  // gastos ad-hoc no atribuibles a un auto
  fixedProrated: number;       // fixed_monthly_expenses prorrateados al rango
  total: number;
  loading: boolean;
}

/**
 * Operational expenses (PRD §5.5):
 * - vehicles_extras with vehicle_id NULL within period (gastos puntuales del
 *   mes no atribuibles a un auto). Se cargan desde Configuración → Gastos fijos
 *   vía useUnattributedExpenses, que setea client_id + type='expense'.
 *   El filtro .eq('client_id', clientId) de abajo es OBLIGATORIO para no
 *   mezclar gastos entre tenants.
 * - fixed_monthly_expenses prorated by calendar days in the period
 */
const ENABLE_UNATTRIBUTED_EXTRAS = true;

export const useOperationalExpenses = (
  clientId: number | undefined,
  dateFilter?: DateRangeFilter
): OperationalExpensesResult => {
  const { data, isLoading } = useQuery({
    queryKey: [
      'operationalExpenses',
      clientId,
      dateFilter?.startDate?.getTime(),
      dateFilter?.endDate?.getTime(),
    ],
    queryFn: async () => {
      if (!clientId) return { unattributedExtras: 0, fixedProrated: 0 };

      let unattributedExtras = 0;
      if (ENABLE_UNATTRIBUTED_EXTRAS) {
        let extrasQuery = supabase
          .from('vehicles_extras')
          .select('amount, created_at')
          .eq('client_id', clientId)
          .is('vehicle_id', null)
          .eq('type', 'expense');
        if (dateFilter?.startDate) {
          extrasQuery = extrasQuery.gte('created_at', dateFilter.startDate.toISOString());
        }
        if (dateFilter?.endDate) {
          extrasQuery = extrasQuery.lte('created_at', dateFilter.endDate.toISOString());
        }
        const { data: extrasRaw } = await extrasQuery;
        unattributedExtras = ((extrasRaw || []) as Array<{ amount: number | null }>).reduce(
          (sum, e) => sum + (Number(e.amount) || 0),
          0
        );
      }

      const { data: fixedRaw } = await supabase
        .from('fixed_monthly_expenses')
        .select('amount, is_active')
        .eq('client_id', clientId)
        .eq('is_active', true);

      const monthlySum = ((fixedRaw || []) as Array<{ amount: number | null }>).reduce(
        (sum, f) => sum + (Number(f.amount) || 0),
        0
      );

      let fixedProrated = 0;
      if (dateFilter?.startDate && dateFilter?.endDate) {
        fixedProrated = fixedExpensesForRange(monthlySum, dateFilter.startDate, dateFilter.endDate);
      } else if (monthlySum > 0) {
        // No date filter → assume current calendar month so total isn't unbounded.
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        fixedProrated = fixedExpensesForRange(monthlySum, start, end);
      }

      return { unattributedExtras, fixedProrated };
    },
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  });

  const unattributedExtras = data?.unattributedExtras ?? 0;
  const fixedProrated = data?.fixedProrated ?? 0;

  return {
    unattributedExtras,
    fixedProrated,
    total: unattributedExtras + fixedProrated,
    loading: isLoading,
  };
};
