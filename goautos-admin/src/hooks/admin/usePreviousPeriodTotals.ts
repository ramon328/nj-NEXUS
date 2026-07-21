import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getComparableRange, DateFilter } from './utils/compareRange';
import { useSalesStats } from './useSalesStats';

export interface PreviousPeriodTotals {
  prevSales: number | null;
  prevExpenses: number | null;
  prevMargin: number | null;
  loading: boolean;
}

export const usePreviousPeriodTotals = (dateFilter?: DateFilter): PreviousPeriodTotals => {
  const { clientId } = useAuth();
  const clientIdNumber = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;

  const startMs = dateFilter?.startDate?.getTime();
  const endMs = dateFilter?.endDate?.getTime();
  const consignmentFilter = dateFilter?.consignmentFilter;
  // Sede activa (Slice 4): el período de comparación debe filtrarse por la misma sede.
  const dealershipIds = dateFilter?.dealershipIds;
  const dealershipKey = dealershipIds?.slice().sort().join(',');

  const prevRange = useMemo(
    () => getComparableRange(dateFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startMs, endMs]
  );

  const hasPrevRange = !!(prevRange?.startDate && prevRange?.endDate);
  const prevStart = prevRange?.startDate;
  const prevEnd = prevRange?.endDate;

  // Build filter for useSalesStats. When no previous range exists, pass clientId as
  // undefined so the hook skips fetching entirely.
  const prevFilter = useMemo(() => {
    if (!hasPrevRange || !prevStart || !prevEnd) return undefined;
    return {
      startDate: prevStart,
      endDate: prevEnd,
      consignmentFilter,
      dealershipIds,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPrevRange, prevStart, prevEnd, consignmentFilter, dealershipKey]);

  const { totalSales, costOfSales, grossMargin, loading } = useSalesStats(
    hasPrevRange ? clientIdNumber : undefined,
    prevFilter
  );

  return {
    prevSales: hasPrevRange ? totalSales : null,
    prevExpenses: hasPrevRange ? costOfSales : null,
    prevMargin: hasPrevRange ? grossMargin : null,
    loading: hasPrevRange ? loading : false,
  };
};
