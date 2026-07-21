import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

interface Props {
  /** IVA débito del período: ventas afectas (19/119 del margen) + ingresos con IVA. */
  ivaDebito: number;
  /** IVA crédito del período: compras y gastos de la automotora con factura afecta. */
  ivaCredito: number;
  /** IVA neto = débito − crédito (positivo = a pagar al SII; negativo = a favor). */
  ivaNeto: number;
  /** Etiqueta del período activo (mismo filtro que el resto del dashboard). */
  filtroLabel?: string;
  loading: boolean;
}

const Row: React.FC<{
  label: string;
  amount: string;
  emphasis?: boolean;
  subtle?: boolean;
  tone?: 'credito' | 'debito' | 'neto';
}> = ({ label, amount, emphasis, subtle, tone }) => (
  <div className='flex items-baseline justify-between py-2 gap-3'>
    <span
      className={cn(
        'text-[13px] sm:text-sm',
        emphasis ? 'font-semibold text-slate-900' : 'text-slate-600',
        subtle && 'text-slate-500'
      )}
    >
      {label}
    </span>
    <span
      className={cn(
        'tabular-nums text-sm sm:text-base',
        emphasis ? 'font-bold text-slate-900' : 'font-medium text-slate-700',
        tone === 'credito' && !emphasis && 'text-emerald-600',
        tone === 'debito' && !emphasis && 'text-sky-600'
      )}
    >
      {amount}
    </span>
  </div>
);

/**
 * Resumen de IVA del período comercial. Reutiliza los totales agregados del dashboard
 * (Σ por-auto vía soldVehicleFinancials → buildIvaBreakdown), la MISMA función que el
 * "Resumen IVA" del detalle del vehículo → dashboard y detalle cuadran por construcción.
 * Convención unificada: IVA neto = débito − crédito (positivo = a pagar).
 */
const IvaSummaryCard: React.FC<Props> = ({
  ivaDebito,
  ivaCredito,
  ivaNeto,
  filtroLabel,
  loading,
}) => {
  const { formatPrice } = useCurrency();

  if (loading) {
    return (
      <Card className='rounded-2xl bg-white border border-slate-200/60'>
        <CardContent className='p-5'>
          <div className='space-y-3'>
            <span className='inline-block w-40 h-5 bg-slate-100 animate-pulse rounded' />
            {[1, 2, 3].map((i) => (
              <div key={i} className='flex items-center justify-between'>
                <span className='inline-block w-32 h-4 bg-slate-100 animate-pulse rounded' />
                <span className='inline-block w-24 h-4 bg-slate-100 animate-pulse rounded' />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sin líneas de IVA en el período (ni débito ni crédito) → no aporta información.
  if (ivaDebito === 0 && ivaCredito === 0) return null;

  const netoLabel = ivaNeto >= 0 ? 'IVA a pagar' : 'IVA a favor';

  return (
    <Card className='rounded-2xl bg-white border border-slate-200/60'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm sm:text-base font-semibold text-slate-700'>
          Resumen IVA{filtroLabel ? ` · ${filtroLabel}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-0 pb-4 px-5'>
        <Row
          label='IVA débito (ventas afectas + ingresos con IVA)'
          amount={formatPrice(ivaDebito)}
          tone='debito'
        />
        <Row
          label='− IVA crédito (compras y gastos con factura)'
          amount={`−${formatPrice(ivaCredito)}`}
          tone='credito'
        />
        <div className='border-t border-slate-200 my-1' />
        <Row
          label={`IVA neto del período (${netoLabel})`}
          amount={formatPrice(ivaNeto)}
          emphasis
        />
        <p className='pt-2 text-[11px] leading-snug text-slate-400'>
          IVA neto del período = débito − crédito (positivo = a pagar). Informativo,
          atribuido a las ventas del período. No reemplaza el F29.
        </p>
      </CardContent>
    </Card>
  );
};

export default IvaSummaryCard;
