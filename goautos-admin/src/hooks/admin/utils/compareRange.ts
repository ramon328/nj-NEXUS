import { ConsignmentFilter } from '../useSellerPerformance';

export type DateFilter = { startDate?: Date; endDate?: Date; consignmentFilter?: ConsignmentFilter; dealershipIds?: number[] | null };

export function getComparableRange(range?: DateFilter): DateFilter | undefined {
  if (!range?.startDate || !range?.endDate) return undefined;
  const durMs = range.endDate.getTime() - range.startDate.getTime();
  const prevEnd = new Date(range.startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durMs);
  return { startDate: prevStart, endDate: prevEnd };
}
