import { FixedMonthlyExpense } from '@/types/fixedMonthlyExpenses';
import type { SoldVehicleRow } from '../types/soldVehicles';

/**
 * Series para los charts de barras (Ventas / Gastos / Comisiones) por período.
 * Consumen las MISMAS filas canónicas que el dashboard (SoldVehicleRow), así el
 * chart cuadra con los KPIs. Antes usaban fetchers legacy con bugs: consignado
 * costo = sale_price−comisión sólo si había close_deal (0 si no), extras
 * bucketeados por created_at (no sale_date), y comisión legacy. Todo eso queda
 * resuelto porque cada fila ya trae cogs / directExpenses / sellerCommission
 * canónicos, fechados por la venta.
 */

interface PeriodBucket {
  sales: number;
  vehicleExpenses: number;
  commonExpenses: number;
  commissions: number;
}

const emptyBucket = (): PeriodBucket => ({
  sales: 0,
  vehicleExpenses: 0,
  commonExpenses: 0,
  commissions: 0,
});

// Acumula una fila canónica en un bucket de período.
const accumulate = (bucket: PeriodBucket, r: SoldVehicleRow) => {
  bucket.sales += r.netSalePrice;
  bucket.vehicleExpenses += r.cogs;
  bucket.commonExpenses += r.directExpenses;
  bucket.commissions += r.sellerCommission;
};

const sumFixedAmount = (fixedExpenses?: FixedMonthlyExpense[]) =>
  (fixedExpenses || []).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

const inclusiveDays = (start: Date, end: Date) => {
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  if (b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
};

// Prorratea el monto mensual fijo dentro de un rango arbitrario.
const fixedExpensesForRange = (
  monthlyAmount: number,
  rangeStart: Date,
  rangeEnd: Date
): number => {
  if (monthlyAmount <= 0) return 0;
  if (rangeEnd < rangeStart) return 0;

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
      const days = inclusiveDays(effStart, effEnd);
      total += monthlyAmount * (days / daysInMonth);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return total;
};

const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const toMonthKey = (date: Date) =>
  `${MONTH_ABBR[date.getMonth()]} ${String(date.getFullYear() % 100).padStart(2, '0')}`;

export const generateMonthlyData = (
  rows: SoldVehicleRow[],
  fixedExpenses?: FixedMonthlyExpense[],
  rangeStart?: Date,
  rangeEnd?: Date
) => {
  const monthly: Record<string, PeriodBucket> = {};
  const now = new Date();

  let startDate: Date;
  let endDate: Date;

  if (rangeStart && rangeEnd) {
    startDate = rangeStart;
    endDate = rangeEnd;
  } else {
    const dates = rows
      .map((r) => (r.saleDate ? new Date(r.saleDate) : null))
      .filter((d): d is Date => !!d);
    if (dates.length === 0) return [];
    startDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    endDate = now;
  }

  // Pre-llenar todos los meses del rango.
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while (cursor <= endMonth) {
    monthly[toMonthKey(cursor)] = emptyBucket();
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Agregar filas canónicas por mes de venta.
  rows.forEach((r) => {
    if (!r.saleDate) return;
    const key = toMonthKey(new Date(r.saleDate));
    if (monthly[key]) accumulate(monthly[key], r);
  });

  // Gastos fijos prorrateados.
  const monthlyFixedAmount = sumFixedAmount(fixedExpenses);
  if (monthlyFixedAmount > 0) {
    const fixedCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (fixedCursor <= endMonth) {
      const key = toMonthKey(fixedCursor);
      if (monthly[key]) {
        const monthFirst = new Date(fixedCursor.getFullYear(), fixedCursor.getMonth(), 1);
        const monthLast = new Date(fixedCursor.getFullYear(), fixedCursor.getMonth() + 1, 0);
        const effStart = monthFirst < startDate ? startDate : monthFirst;
        const effEnd = monthLast > endDate ? endDate : monthLast;
        monthly[key].commonExpenses += fixedExpensesForRange(monthlyFixedAmount, effStart, effEnd);
      }
      fixedCursor.setMonth(fixedCursor.getMonth() + 1);
    }
  }

  return Object.entries(monthly).map(([month, data]) => ({ month, ...data }));
};

export const generateWeeklyData = (
  rows: SoldVehicleRow[],
  startDate: Date,
  endDate: Date,
  fixedExpenses?: FixedMonthlyExpense[]
) => {
  const weeks: { start: Date; end: Date; label: string }[] = [];
  let current = new Date(startDate);
  let week = 1;
  while (current <= endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6 - weekEnd.getDay()); // Sábado
    if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());
    weeks.push({ start: new Date(weekStart), end: new Date(weekEnd), label: `Semana ${week}` });
    current = new Date(weekEnd);
    current.setDate(current.getDate() + 1);
    week++;
  }

  const weekly: Record<string, PeriodBucket> = {};
  weeks.forEach((w) => (weekly[w.label] = emptyBucket()));

  rows.forEach((r) => {
    if (!r.saleDate) return;
    const date = new Date(r.saleDate);
    const w = weeks.find((wk) => date >= wk.start && date <= wk.end);
    if (w) accumulate(weekly[w.label], r);
  });

  const monthlyFixedAmount = sumFixedAmount(fixedExpenses);
  if (monthlyFixedAmount > 0) {
    weeks.forEach((w) => {
      weekly[w.label].commonExpenses += fixedExpensesForRange(monthlyFixedAmount, w.start, w.end);
    });
  }

  return Object.entries(weekly).map(([month, data]) => ({ month, ...data }));
};

export const generateDailyData = (
  rows: SoldVehicleRow[],
  startDate: Date,
  endDate: Date,
  fixedExpenses?: FixedMonthlyExpense[]
) => {
  const days: { date: Date; label: string }[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const effectiveEnd = endDate > today ? today : endDate;
  const current = new Date(startDate);
  while (current <= effectiveEnd) {
    days.push({
      date: new Date(current),
      label: `${current.getDate().toString().padStart(2, '0')}/${(current.getMonth() + 1).toString().padStart(2, '0')}`,
    });
    current.setDate(current.getDate() + 1);
  }

  const daily: Record<string, PeriodBucket> = {};
  days.forEach((d) => (daily[d.label] = emptyBucket()));

  rows.forEach((r) => {
    if (!r.saleDate) return;
    const date = new Date(r.saleDate);
    const day = days.find((d) => date.toDateString() === d.date.toDateString());
    if (day) accumulate(daily[day.label], r);
  });

  const monthlyFixedAmount = sumFixedAmount(fixedExpenses);
  if (monthlyFixedAmount > 0) {
    days.forEach((d) => {
      daily[d.label].commonExpenses += fixedExpensesForRange(monthlyFixedAmount, d.date, d.date);
    });
  }

  return Object.entries(daily).map(([month, data]) => ({ month, ...data }));
};
