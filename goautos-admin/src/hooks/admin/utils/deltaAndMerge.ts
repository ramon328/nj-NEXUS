export function deltaPct(curr: number, prev?: number | null) {
  if (prev == null || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

type SalesPoint = {
  month: string;
  sales: number;
  vehicleExpenses: number;
  commonExpenses: number;
  commissions: number;
};
type VisitPoint = { month: string; visits: number };

export function buildPerformanceSeries(sales: SalesPoint[], visits: VisitPoint[]) {
  const mapVisits = new Map(visits.map(v => [v.month, v.visits]));
  return sales.map(s => {
    const totalSales = s.sales || 0;
    const totalCosts = (s.vehicleExpenses || 0) + (s.commonExpenses || 0) + (s.commissions || 0);
    return {
      month: s.month,
      sales: totalSales,
      costs: totalCosts,
      margin: totalSales - totalCosts,
      visits: mapVisits.get(s.month) || 0,
    };
  });
}
