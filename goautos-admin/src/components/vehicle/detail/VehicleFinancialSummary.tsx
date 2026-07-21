import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Calculator, X, UserCircle2, ChevronDown } from 'lucide-react';
import NetResultSection from './financial/NetResultSection';
import { DetailItem, DetailSection } from './financial/FinancialDetailCard';
import { useI18n } from '@/hooks/useI18n';
import PriceInput from '@/components/ui/inputs/price-input';
import {
  calculateVehicleNetProfit,
  type VehicleNetProfitInput,
  type VehicleNetProfitResult,
} from '@/utils/vehicleNetProfit';
import { lineCostBasis } from '@/utils/fiscalCredit';
import { buildIvaBreakdown, type IvaBreakdownRow } from '@/utils/ivaBreakdown';
import { REGIMEN_LABELS, type Regimen } from '@/utils/vehicleRegimen';
import VehicleCommissionAssignDrawer from './financial/VehicleCommissionAssignDrawer';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import type {
  SaleSellerInfo,
  VehicleCommissionSplitSummary,
} from '@/hooks/useVehicleFinancialData';

type VehicleFinancialSummaryProps = {
  isConsigned: boolean;
  acquisitionData: any;
  saleData: any;
  netResult: number;
  expenseExtras: any[];
  incomeExtras: any[];
  dealershipIncomeExtras: any[];
  dealershipExpenseExtras: any[];
  /** Líneas pass-through (dinero solo traspasado): informativas, fuera del margen. */
  passthroughExtras?: any[];
  formatCurrency: (amount: number | null | undefined) => string;
  transferValue?: number;
  /** Régimen tributario resuelto (afecto/exento/consignación) — R2. */
  regimen?: Regimen;
  /** IVA débito fiscal informativo (19% del margen) en autos afectos. NO resta del resultado. */
  ivaDebitoFiscal?: number;
  /**
   * Resultado del helper unificado. Contiene branch + breakdown que el
   * componente usa para renderizar el desglose correcto según el modelo:
   * Capital / Gastos / Ingresos / Resultado (estructura del PDF pág 3).
   */
  profitResult: VehicleNetProfitResult;
  /**
   * Inputs originales del helper. Usados por la calculadora "calcular con
   * otro precio" para re-llamar al helper con un precio hipotético.
   */
  profitInput?: VehicleNetProfitInput;
  saleSeller?: SaleSellerInfo | null;
  commissionSplits?: VehicleCommissionSplitSummary;
  vehicleId?: number;
  defaultSellerId?: number | null;
  onCommissionUpdated?: () => void;
};

const VehicleFinancialSummary = ({
  isConsigned,
  acquisitionData,
  saleData,
  netResult,
  expenseExtras,
  incomeExtras,
  dealershipIncomeExtras,
  dealershipExpenseExtras,
  passthroughExtras,
  formatCurrency: _formatCurrency,
  transferValue,
  regimen,
  ivaDebitoFiscal,
  profitResult,
  profitInput,
  saleSeller,
  commissionSplits,
  vehicleId,
  defaultSellerId,
  onCommissionUpdated,
}: VehicleFinancialSummaryProps) => {
  const { tCommon } = useI18n();
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [hypotheticalPrice, setHypotheticalPrice] = useState<number | null>(
    null
  );
  const [showCalculator, setShowCalculator] = useState(false);
  const [showCommissionDrawer, setShowCommissionDrawer] = useState(false);
  // "Ver más" del detalle de gastos (lista itemizada inline, además del hover).
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showIncomeDetail, setShowIncomeDetail] = useState(false);
  // Ancla del bloque "Resumen IVA" (para el enlace "Ver detalle" de la línea de régimen).
  const resumenIvaRef = useRef<HTMLDivElement>(null);

  const toggleSensitiveDataVisibility = () =>
    setShowSensitiveData(!showSensitiveData);

  // Si el usuario ingresó precio hipotético, re-calculamos con él.
  // Solo aplica a no vendidos (profitResult.isExpected=true).
  const effectiveProfitResult: VehicleNetProfitResult =
    hypotheticalPrice && hypotheticalPrice > 0 && profitInput && profitResult.isExpected
      ? calculateVehicleNetProfit({
          ...profitInput,
          hypotheticalPrice,
        })
      : profitResult;
  const effectiveNetResult = effectiveProfitResult.netProfit;

  // Adjuntar info de trade-in al saleData (lógica existente, preservada)
  if (saleData?.has_trade_in && saleData?.trade_in_vehicle_id) {
    const tradeInInfo = expenseExtras.find(
      (item) =>
        item.title?.toLowerCase().includes('parte de pago') ||
        item.title?.toLowerCase().includes('trade-in')
    );
    if (tradeInInfo?.metadata) {
      saleData.trade_in_vehicle_info = tradeInInfo.metadata;
    }
  }

  const { branch, breakdown, isExpected } = effectiveProfitResult;

  // Valor de transferencia (CRT): EXCLUIDO del margen (decisión canónica) — es
  // pass-through que el cliente paga aparte, no utilidad de la automotora. Se
  // mantiene la prop por compatibilidad, pero no suma a ingresos ni al resultado.
  const transferIncome = 0;
  void transferValue;

  const totalGastos = breakdown.dealershipExpenses;
  const incomeIsCommission =
    branch === 'vendido_consig_comision' ||
    branch === 'no_vendido_consig_comision' ||
    (breakdown.consignmentCommission > 0 &&
      breakdown.acquisitionCost === 0);

  const ingresoPrincipal = incomeIsCommission
    ? breakdown.consignmentCommission
    : breakdown.basePrice;

  const totalIngresos =
    ingresoPrincipal + breakdown.dealershipIncome + transferIncome;

  // Comisión financiera (columna vehicles_sales.financing_commission). Ya está
  // incluida en breakdown.dealershipIncome (se inyecta como sale_income en
  // useVehicleFinancialData). La mostramos como línea propia y la restamos de
  // "Otros ingresos" para que el desglose cuadre sin duplicar el monto.
  const financingCommission = Number((saleData as any)?.financing_commission) || 0;
  const otherDealershipIncome = breakdown.dealershipIncome - financingCommission;

  // IVA de compra (auto propio afecto): el Capital mostrado ya es el NETO (el helper
  // descontó el crédito fiscal). Lo señalizamos en el label para que sea explícito.
  const purchaseHasIvaCredit =
    !isConsigned && (acquisitionData as any)?.genera_credito_fiscal === true;
  const capitalLabel = isConsigned
    ? tCommon('vehicles.detail.financial.expenses.agreedPriceConsignment')
    : tCommon('vehicles.detail.financial.expenses.purchasePrice') +
      (purchaseHasIvaCredit ? ' (neto · IVA recuperado)' : '');

  // Desglose de IVA (Resumen IVA): filas por origen (venta débito / compra,
  // gastos, ingresos) + totales. Lógica movida al helper puro `ivaBreakdown.ts`
  // (reutilizable por el dashboard). Base de la venta = margen del sistema
  // (misma cifra que la línea informativa histórica). Informativo: no afecta el
  // resultado. Se usan `netResult`/`ivaDebitoFiscal` (props) para mantener
  // paridad con la línea previa (no reacciona al precio hipotético).
  const ivaBreakdown = buildIvaBreakdown({
    regimen,
    saleMargin: netResult,
    ivaVenta: ivaDebitoFiscal ?? 0,
    isConsigned,
    purchase: {
      purchasePrice: acquisitionData?.purchase_price,
      generaCreditoFiscal: (acquisitionData as any)?.genera_credito_fiscal,
    },
    expenseExtras: dealershipExpenseExtras,
    incomeExtras: dealershipIncomeExtras,
  });
  const creditoRows = ivaBreakdown.rows.filter((r) => r.kind === 'credito');
  const debitoRows = ivaBreakdown.rows.filter((r) => r.kind === 'debito');
  // Si hay crédito de compra y el rol NO puede ver el precio de compra, ocultamos
  // también los subtotales que lo dejarían derivar (crédito total y neto).
  const hasCompraCredit = ivaBreakdown.rows.some((r) => r.source === 'compra');

  // Labels según rama
  const ingresoLabel = (() => {
    if (incomeIsCommission) {
      return isExpected
        ? 'Comisión esperada (consignación)'
        : 'Comisión cobrada (consignación)';
    }
    if (isExpected) {
      return 'Precio publicado';
    }
    return tCommon('vehicles.detail.financial.income.salePrice');
  })();

  const resultLabel = isExpected
    ? 'Margen esperado'
    : tCommon('vehicles.detail.financial.netResult');

  // Si la rama es 'sin_datos' (vehículo no vendido sin precio publicado),
  // mostramos un estado vacío amigable.
  const showCapital = breakdown.acquisitionCost > 0;

  // En consignaciones por comisión el helper deja acquisitionCost=0 (la
  // automotora no paga el auto). Pero igual queremos mostrar un Capital
  // referencial con el precio acordado/publicado al consignante para que
  // el usuario tenga contexto visual del valor del vehículo.
  const isCommissionConsignment =
    isConsigned &&
    (acquisitionData?.metodo_consignacion === 'comision' ||
      branch === 'vendido_consig_comision' ||
      branch === 'no_vendido_consig_comision');
  const referenceCapital =
    isCommissionConsignment && !showCapital
      ? Number(acquisitionData?.agreed_price || 0)
      : 0;
  const showReferenceCapital = referenceCapital > 0;

  // Costo total = lo que sale del bolsillo de la automotora.
  //   Stock propio:                 precio compra + gastos
  //   Consignado precio garantizado: precio acordado + gastos
  //   Consignado por comisión:       sólo gastos (la automotora no paga el auto)
  const costoTotal = breakdown.acquisitionCost + totalGastos;

  // Suma de splits de comisión vendedor (sistema nuevo) — base del drawer de edición.
  const sellerCommissionTotal = commissionSplits?.totalAmount ?? 0;
  // Comisión vendedor CANÓNICA = splits con fallback al legacy `commission_amount`
  // (la misma que usa el cálculo de margen en useVehicleFinancialData). Antes el neto
  // mostrado restaba SOLO los splits → en ventas con comisión legacy (sin splits) no la
  // restaba y quedaba "margen neto = margen bruto" (reportado). Para el neto y la
  // visualización usamos esta; el drawer sigue gestionando splits.
  const effectiveSellerCommission = effectiveProfitResult.breakdown.sellerCommission || 0;
  // Configura comisión: admin/superadmin legacy, o cualquier rol con permiso de
  // editar ventas (la comisión es parte de la venta). El resto ve el monto pero
  // no edita.
  // OJO: el isAdmin legacy es false cuando el usuario admin tiene además un rol
  // personalizado asignado (multi-rol), por eso NO basta con (isAdmin ||
  // isSuperadmin) — un admin con rol custom quedaba bloqueado con "Solo admin".
  const { isAdmin, isSuperadmin, hasPermission } = usePermissions();
  const canAssignCommission =
    !!saleData?.id &&
    (isAdmin || isSuperadmin || hasPermission(PermissionCode.SALES_EDIT));
  // El precio de compra/acordado (Capital, Costo total y el bruto/IVA de compra) se
  // gatea por el permiso granular además del eye-toggle: un rol con resumen financiero
  // pero sin permiso de precio de compra no debe poder verlo ni despejarlo restando los
  // gastos. Mismo criterio que la cabecera (VehicleHeader).
  const canSeePurchasePrice = hasPermission(
    PermissionCode.VEHICLES_VIEW_PURCHASE_PRICE
  );
  const hidePurchaseFigures = hasCompraCredit && !canSeePurchasePrice;
  // Celda de moneda del Resumen IVA: oculta por eye-toggle y, opcionalmente, por
  // un gate extra (permiso de precio de compra).
  const ivaCell = (value: number, gate = true) =>
    showSensitiveData && gate ? _formatCurrency(value) : '••••••';
  const renderIvaRow = (row: IvaBreakdownRow, index: number) => {
    const gate = row.sensitivePurchase ? canSeePurchasePrice : true;
    const meta = [
      row.subLabel,
      row.date ? new Date(row.date).toLocaleDateString('es-CL') : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <tr key={`${row.source}-${row.id ?? index}`} className='align-top'>
        <td className='py-1 pr-3'>
          <span className='block text-slate-600'>{row.label}</span>
          {meta && <span className='block text-[10px] text-slate-400'>{meta}</span>}
        </td>
        <td className='py-1 pr-3 text-right tabular-nums text-slate-400'>
          {ivaCell(row.base, gate)}
        </td>
        <td
          className={`py-1 text-right tabular-nums ${
            row.kind === 'credito' ? 'text-emerald-600' : 'text-sky-600'
          }`}
        >
          {ivaCell(row.iva, gate)}
        </td>
      </tr>
    );
  };

  return (
    <div className='bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] overflow-hidden'>
      <div className='flex justify-between items-center p-4 pb-0'>
        <h2 className='text-base font-semibold text-slate-900'>
          {tCommon('vehicles.detail.financial.title')}
        </h2>
        <Button
          variant='ghost'
          size='icon'
          onClick={toggleSensitiveDataVisibility}
          className='h-8 w-8 p-0 hover:bg-slate-100 rounded-xl'
        >
          {showSensitiveData ? (
            <EyeOff className='h-4 w-4 text-slate-400' />
          ) : (
            <Eye className='h-4 w-4 text-slate-400' />
          )}
        </Button>
      </div>

      <div className='p-4 space-y-4'>
        {/* CAPITAL — costo de adquisición real (stock propio o consignación
            por precio garantizado). En consignación por comisión mostramos
            un Capital REFERENCIAL con el precio acordado al consignante para
            dar contexto visual aunque no salga del bolsillo de la automotora. */}
        {showCapital && (
          <DetailSection
            title='Capital'
            showSensitiveData={showSensitiveData}
          >
            {/* El capital ES el precio de compra/acordado: además del eye-toggle se
                gatea por el permiso granular de precio de compra (consistente con la
                cabecera y con el Resumen IVA). */}
            <DetailItem
              label={capitalLabel}
              value={breakdown.acquisitionCost}
              showSensitiveData={showSensitiveData && canSeePurchasePrice}
            />
          </DetailSection>
        )}
        {showReferenceCapital && (
          <DetailSection
            title='Capital'
            showSensitiveData={showSensitiveData}
          >
            {/* Precio acordado al consignante: mismo criterio que el precio de compra
                (la cabecera lo gatea por VEHICLES_VIEW_PURCHASE_PRICE). */}
            <DetailItem
              label='Precio acordado al consignante (referencial)'
              value={referenceCapital}
              showSensitiveData={showSensitiveData && canSeePurchasePrice}
            />
          </DetailSection>
        )}

        {/* GASTOS — extras dealership + CRT */}
        <DetailSection
          title={tCommon('vehicles.detail.financial.expenses.title')}
          totalLabel={tCommon('vehicles.detail.financial.expenses.total')}
          totalValue={totalGastos}
          showSensitiveData={showSensitiveData}
        >
          {dealershipExpenseExtras.length > 0 && (
            <DetailItem
              label={tCommon('vehicles.detail.financial.expenses.otherExpenses')}
              value={breakdown.dealershipExpenses}
              extras={dealershipExpenseExtras}
              showHover={true}
              showSensitiveData={showSensitiveData}
            />
          )}

          {dealershipExpenseExtras.length > 0 && (
            <>
              <button
                type='button'
                onClick={() => setShowExpenseDetail((v) => !v)}
                className='flex items-center gap-1 text-[12px] font-medium text-sky-600 hover:text-sky-700 transition-colors'
              >
                {showExpenseDetail ? 'Ver menos' : 'Ver más'}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    showExpenseDetail ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showExpenseDetail && (
                <div className='mt-1 space-y-1.5 rounded-lg bg-slate-50 p-2.5'>
                  {dealershipExpenseExtras.map((e: any, i: number) => {
                    const meta = [
                      e.created_at
                        ? new Date(e.created_at).toLocaleDateString('es-CL')
                        : null,
                      e.description || null,
                    ]
                      .filter(Boolean)
                      .join(' · ');
                    // Regla 3: lo que carga al costo es el NETO. Si la línea genera
                    // crédito fiscal, mostramos bruto → IVA → neto para que se
                    // entienda y la suma de líneas cuadre con el total "Otros gastos".
                    const bruto = Number(e.amount) || 0;
                    const conIva = !!e.genera_credito_fiscal;
                    const neto = lineCostBasis(bruto, e.genera_credito_fiscal);
                    const iva = bruto - neto;
                    return (
                      <div
                        key={e.id ?? i}
                        className='flex items-start justify-between gap-3 text-[12px]'
                      >
                        <div className='min-w-0'>
                          <p className='text-slate-700 truncate'>
                            {e.title || 'Sin título'}
                          </p>
                          {conIva && showSensitiveData && (
                            <p className='text-[11px] text-slate-400'>
                              Bruto {_formatCurrency(bruto)} · IVA −{_formatCurrency(iva)}
                            </p>
                          )}
                          {meta && (
                            <p className='text-[11px] text-slate-400 truncate'>
                              {meta}
                            </p>
                          )}
                        </div>
                        <div className='shrink-0 text-right'>
                          <span className='font-medium text-slate-800 tabular-nums'>
                            {showSensitiveData ? _formatCurrency(neto) : '••••••'}
                          </span>
                          {conIva && (
                            <p className='text-[10px] font-medium text-emerald-600'>
                              neto
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </DetailSection>

        {/* COSTO TOTAL — capital + gastos. Lo que sale del bolsillo de la
            automotora por este vehículo. */}
        {(showCapital || totalGastos > 0) && (
          <div className='flex items-center justify-between text-sm font-semibold text-slate-800 -mt-1 px-1'>
            <span>Costo total</span>
            <span>
              {/* Incluye el costo de adquisición (precio de compra/acordado): si el rol
                  no puede verlo se enmascara para que no se despeje restando "Otros
                  gastos". Cuando no hay capital (consignación por comisión) el total es
                  solo gastos → no requiere el permiso de precio de compra. */}
              {showSensitiveData && (!showCapital || canSeePurchasePrice)
                ? new Intl.NumberFormat('es-CL', {
                    style: 'currency',
                    currency: 'CLP',
                    maximumFractionDigits: 0,
                  }).format(costoTotal)
                : '••••••'}
            </span>
          </div>
        )}

        {/* INGRESOS — precio venta (o comisión, según rama) + extras + CRT */}
        <DetailSection
          title={tCommon('vehicles.detail.financial.income.title')}
          totalLabel={tCommon('vehicles.detail.financial.income.total')}
          totalValue={totalIngresos}
          showSensitiveData={showSensitiveData}
        >
          {ingresoPrincipal > 0 && (
            <DetailItem
              label={ingresoLabel}
              value={ingresoPrincipal}
              showSensitiveData={showSensitiveData}
              isSensitive
            />
          )}
          {dealershipIncomeExtras.length > 0 && (
            <DetailItem
              label='Otros ingresos'
              value={otherDealershipIncome}
              extras={dealershipIncomeExtras}
              showHover={true}
              showSensitiveData={showSensitiveData}
            />
          )}

          {dealershipIncomeExtras.length > 0 && (
            <>
              <button
                type='button'
                onClick={() => setShowIncomeDetail((v) => !v)}
                className='flex items-center gap-1 text-[12px] font-medium text-sky-600 hover:text-sky-700 transition-colors'
              >
                {showIncomeDetail ? 'Ver menos' : 'Ver más'}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    showIncomeDetail ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showIncomeDetail && (
                <div className='mt-1 space-y-1.5 rounded-lg bg-slate-50 p-2.5'>
                  {dealershipIncomeExtras.map((e: any, i: number) => {
                    const meta = [
                      e.created_at
                        ? new Date(e.created_at).toLocaleDateString('es-CL')
                        : null,
                      e.description || null,
                    ]
                      .filter(Boolean)
                      .join(' · ');
                    // El ingreso entra al margen por su monto COMPLETO (bruto), así
                    // las líneas suman al total "Otros ingresos". Si está afecto a IVA
                    // mostramos, INFORMATIVO, el débito fiscal incluido (no se resta).
                    const bruto = Number(e.amount) || 0;
                    const conIva = !!e.genera_credito_fiscal;
                    const ivaDebito = conIva ? bruto - lineCostBasis(bruto, true) : 0;
                    return (
                      <div
                        key={e.id ?? i}
                        className='flex items-start justify-between gap-3 text-[12px]'
                      >
                        <div className='min-w-0'>
                          <p className='text-slate-700 truncate'>
                            {e.title || 'Sin título'}
                          </p>
                          {conIva && showSensitiveData && (
                            <p className='text-[11px] text-slate-400'>
                              IVA débito incluido: {_formatCurrency(ivaDebito)}
                            </p>
                          )}
                          {meta && (
                            <p className='text-[11px] text-slate-400 truncate'>
                              {meta}
                            </p>
                          )}
                        </div>
                        <div className='shrink-0 text-right'>
                          <span className='font-medium text-slate-800 tabular-nums'>
                            {showSensitiveData ? _formatCurrency(bruto) : '••••••'}
                          </span>
                          {conIva && (
                            <p className='text-[10px] font-medium text-emerald-600'>
                              afecto IVA
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {financingCommission > 0 && (
            <DetailItem
              label='Comisión financiera'
              value={financingCommission}
              showSensitiveData={showSensitiveData}
              isSensitive
            />
          )}
          {transferIncome > 0 && (
            <DetailItem
              label='Valor de transferencia'
              value={transferIncome}
              showSensitiveData={showSensitiveData}
            />
          )}
        </DetailSection>

        {/* PASS-THROUGH — dinero que la automotora SOLO TRASPASA (ej. transferencia de
            dominio / comisión de tarjeta cobrada al cliente y pagada a un tercero). NO
            es ingreso ni gasto real → NO afecta el margen. Se lista aparte para que se
            vea, pero queda fuera del cálculo (caso Ford SRZR56). */}
        {(breakdown.passthroughIncome > 0 ||
          breakdown.passthroughExpense > 0) && (
          <div className='rounded-xl border border-slate-200/70 bg-slate-50/50 p-3'>
            <div className='mb-2 flex items-center justify-between'>
              <span className='text-[13px] font-semibold text-slate-800'>
                Pass-through (no afecta el margen)
              </span>
              <span className='text-[10px] text-slate-400'>Informativo</span>
            </div>
            <p className='mb-2 text-[11px] leading-snug text-slate-500'>
              Dinero que la automotora solo traspasa: entra y sale (se cobra al cliente
              y se paga a un tercero). No suma ni resta a la utilidad.
            </p>
            {(passthroughExtras || []).length > 0 && (
              <div className='mb-2 space-y-1.5 text-[12px]'>
                {(passthroughExtras || []).map((e: any, i: number) => {
                  const paysOut =
                    e.type === 'expense' ||
                    (e.type === 'sale_additional' && e.assumed_by === 'dealership');
                  return (
                    <div
                      key={e.id ?? i}
                      className='flex items-start justify-between gap-3'
                    >
                      <span className='min-w-0 truncate text-slate-600'>
                        {e.title || 'Sin título'}
                      </span>
                      <span className='shrink-0 tabular-nums text-slate-500'>
                        {showSensitiveData
                          ? `${paysOut ? '−' : '+'} ${_formatCurrency(
                              Number(e.amount) || 0
                            )}`
                          : '••••••'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className='space-y-1 border-t border-slate-200 pt-1.5 text-[12px]'>
              <div className='flex items-center justify-between text-slate-500'>
                <span>Entra (cobrado al cliente)</span>
                <span className='tabular-nums'>
                  {showSensitiveData
                    ? _formatCurrency(breakdown.passthroughIncome)
                    : '••••••'}
                </span>
              </div>
              <div className='flex items-center justify-between text-slate-500'>
                <span>Sale (pagado a terceros)</span>
                <span className='tabular-nums'>
                  {showSensitiveData
                    ? _formatCurrency(breakdown.passthroughExpense)
                    : '••••••'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* RÉGIMEN TRIBUTARIO — badge afecto/exento. El monto de IVA débito ya no
            se muestra suelto aquí (Mallorca lo tachó): el detalle por origen vive
            en la tabla "Resumen IVA" de más abajo. El badge se conserva como
            contexto del régimen del auto. */}
        {regimen && (regimen === 'afecto' || regimen === 'exento') && (
          <div className='flex items-center justify-between border-t border-slate-100 pt-3 text-[12px]'>
            <span className='flex items-center gap-1.5 text-slate-500'>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  regimen === 'afecto'
                    ? 'border-sky-200 bg-sky-50 text-sky-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {REGIMEN_LABELS[regimen]}
              </span>
              {regimen === 'afecto' && 'IVA débito fiscal (19% incluido en el margen)'}
            </span>
            {regimen === 'afecto' && ivaBreakdown.hasData && (
              <button
                type='button'
                onClick={() =>
                  resumenIvaRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                  })
                }
                className='text-[11px] font-medium text-sky-600 hover:text-sky-700 transition-colors'
              >
                Ver detalle en Resumen IVA
              </button>
            )}
          </div>
        )}

        {/* UTILIDAD BRUTA — antes de comisión del vendedor. Se muestra cuando hay
            comisión, para que la cadena bruto → −comisión → resultado sea visible
            (pedido "ver neto vs bruto"). */}
        {!isExpected && effectiveSellerCommission > 0 && (
          <div className='flex items-center justify-between text-sm border-t border-slate-100 pt-3'>
            <span className='text-slate-700'>Utilidad bruta</span>
            <span className='font-medium text-slate-800'>
              {showSensitiveData
                ? new Intl.NumberFormat('es-CL', {
                    style: 'currency',
                    currency: 'CLP',
                    maximumFractionDigits: 0,
                  }).format(effectiveNetResult)
                : '••••••'}
            </span>
          </div>
        )}

        {/* COMISIÓN VENDEDORES — siempre visible. Si la venta no existe aún,
            la línea queda informativa con "Disponible al cerrar venta". */}
        <div
          className={
            !isExpected && effectiveSellerCommission > 0
              ? 'flex items-center justify-between text-sm'
              : 'flex items-center justify-between text-sm border-t border-slate-100 pt-3'
          }
        >
          <span className='text-slate-700'>Comisión vendedores</span>
          <div className='flex items-center gap-2'>
            <span
              className={
                effectiveSellerCommission > 0
                  ? 'font-semibold text-slate-800'
                  : 'text-slate-500'
              }
            >
              {showSensitiveData
                ? new Intl.NumberFormat('es-CL', {
                    style: 'currency',
                    currency: 'CLP',
                    maximumFractionDigits: 0,
                  }).format(effectiveSellerCommission)
                : '••••••'}
            </span>
            {canAssignCommission ? (
              <Button
                variant='outline'
                size='sm'
                className='h-7 text-[11px] px-2'
                onClick={() => setShowCommissionDrawer(true)}
              >
                {effectiveSellerCommission > 0 ? 'Editar' : 'Asignar'}
              </Button>
            ) : saleData?.id ? (
              // Vendido pero el usuario no es admin: ve el monto, no lo edita.
              <span className='text-[10px] text-slate-400'>Solo admin</span>
            ) : (
              <span className='text-[10px] text-slate-400'>
                Disponible al cerrar venta
              </span>
            )}
          </div>
        </div>

        {/* VENDEDOR QUE VENDIÓ — sólo si el vehículo está vendido. */}
        {saleSeller && (
          <div className='flex items-center justify-between text-sm'>
            <span className='text-slate-700'>Vendido por</span>
            <span className='inline-flex items-center gap-1.5 text-slate-800 font-medium'>
              <UserCircle2 className='h-3.5 w-3.5 text-slate-400' />
              {saleSeller.fullName}
            </span>
          </div>
        )}

        {/* RESULTADO — número final del helper menos la comisión de vendedores.
            Usa la comisión CANÓNICA (splits con fallback legacy): un gasto real que se
            resta del neto. Antes restaba solo splits → neto = bruto en ventas legacy. */}
        <NetResultSection
          netResult={effectiveNetResult + transferIncome - effectiveSellerCommission}
          showSensitiveData={showSensitiveData}
        />
        {isExpected && (
          <p className='text-[11px] text-slate-500 text-center -mt-2'>
            {resultLabel}
            {hypotheticalPrice && hypotheticalPrice > 0
              ? ' — calculado con precio hipotético'
              : ' — basado en precio publicado'}
            .
          </p>
        )}

        {/* CALCULADORA "otro precio" — sólo no vendidos */}
        {isExpected && profitInput && (
          <div className='border-t border-slate-100 pt-3'>
            {!showCalculator ? (
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowCalculator(true)}
                className='w-full text-[12px] gap-2'
              >
                <Calculator className='h-3.5 w-3.5' />
                Calcular con otro precio
              </Button>
            ) : (
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <label className='text-[12px] font-medium text-slate-700'>
                    Precio hipotético de venta
                  </label>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => {
                      setShowCalculator(false);
                      setHypotheticalPrice(null);
                    }}
                    className='h-6 w-6 p-0'
                  >
                    <X className='h-3.5 w-3.5 text-slate-400' />
                  </Button>
                </div>
                <PriceInput
                  value={hypotheticalPrice ?? 0}
                  onChange={(v) => setHypotheticalPrice(Number(v) || null)}
                  placeholder='Ej: 15.000.000'
                />
                {hypotheticalPrice && hypotheticalPrice > 0 && (
                  <p className='text-[11px] text-slate-500'>
                    El margen mostrado arriba ahora usa este precio.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* RESUMEN IVA — tabla con el DETALLE por origen de dónde sale el IVA:
            débito por la venta (19% del margen), crédito de la compra afecta,
            crédito por cada gasto con IVA recuperable, y débito por cada ingreso
            extra afecto. Informativo; no modifica el resultado. La fila de compra
            respeta el permiso de precio de compra además del eye-toggle. */}
        {ivaBreakdown.hasData && (
          <div
            ref={resumenIvaRef}
            className='mt-4 rounded-xl border border-slate-200/70 bg-slate-50/50 p-3'
          >
            <div className='mb-2 flex items-center justify-between'>
              <span className='text-[13px] font-semibold text-slate-800'>Resumen IVA</span>
              <span className='text-[10px] text-slate-400'>Informativo</span>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[320px] text-[12px]'>
                <thead>
                  <tr className='text-[10px] uppercase tracking-wide text-slate-400'>
                    <th className='py-1 pr-3 text-left font-medium'>Detalle</th>
                    <th className='py-1 pr-3 text-right font-medium'>Base</th>
                    <th className='py-1 text-right font-medium'>IVA</th>
                  </tr>
                </thead>
                <tbody>
                  {/* CRÉDITO fiscal (compra + gastos afectos) */}
                  <tr>
                    <td colSpan={3} className='pt-1 text-[11px] font-medium text-emerald-600'>
                      Crédito fiscal
                    </td>
                  </tr>
                  {creditoRows.length > 0 ? (
                    creditoRows.map(renderIvaRow)
                  ) : (
                    <tr>
                      <td colSpan={3} className='py-1 text-[11px] italic text-slate-400'>
                        Sin líneas con IVA registradas
                      </td>
                    </tr>
                  )}
                  <tr className='border-t border-slate-200 font-medium text-slate-700'>
                    <td className='py-1 pr-3'>IVA crédito</td>
                    <td className='py-1 pr-3'></td>
                    <td className='py-1 text-right tabular-nums'>
                      {ivaCell(ivaBreakdown.totals.credito, !hidePurchaseFigures)}
                    </td>
                  </tr>

                  {/* DÉBITO fiscal (venta + ingresos afectos) */}
                  <tr>
                    <td colSpan={3} className='pt-2 text-[11px] font-medium text-sky-600'>
                      Débito fiscal
                    </td>
                  </tr>
                  {debitoRows.length > 0 ? (
                    debitoRows.map(renderIvaRow)
                  ) : (
                    <tr>
                      <td colSpan={3} className='py-1 text-[11px] italic text-slate-400'>
                        Sin líneas con IVA registradas
                      </td>
                    </tr>
                  )}
                  <tr className='border-t border-slate-200 font-medium text-slate-700'>
                    <td className='py-1 pr-3'>IVA débito</td>
                    <td className='py-1 pr-3'></td>
                    <td className='py-1 text-right tabular-nums'>
                      {ivaCell(ivaBreakdown.totals.debito)}
                    </td>
                  </tr>

                  {/* NETO = débito − crédito */}
                  <tr className='border-t border-slate-300 font-semibold text-slate-900'>
                    <td className='py-1.5 pr-3'>IVA neto</td>
                    <td className='py-1.5 pr-3'></td>
                    <td className='py-1.5 text-right tabular-nums'>
                      {ivaCell(ivaBreakdown.totals.neto, !hidePurchaseFigures)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className='pt-1 text-[10px] leading-snug text-slate-400'>
              Débito − crédito. Positivo = IVA a pagar al SII; negativo = IVA a
              favor. Informativo, no reemplaza el F29.
            </p>
            {hidePurchaseFigures && (
              <p className='text-[10px] italic leading-snug text-slate-400'>
                Algunas cifras se ocultan: no tienes permiso para ver el precio de compra.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Drawer standalone para asignar/editar comisión vendedor desde el
          resumen del vehículo, sin pasar por el flujo de cierre de negocio. */}
      {canAssignCommission && (
        <VehicleCommissionAssignDrawer
          isOpen={showCommissionDrawer}
          onClose={() => setShowCommissionDrawer(false)}
          saleId={saleData.id}
          finalSalePrice={Number(saleData?.sale_price) || 0}
          grossMargin={Math.max(0, effectiveNetResult + sellerCommissionTotal)}
          defaultSellerId={defaultSellerId ?? null}
          onSaved={onCommissionUpdated}
        />
      )}
    </div>
  );
};

export default VehicleFinancialSummary;
