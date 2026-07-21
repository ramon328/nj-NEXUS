import { useVehicleFinancialData } from '@/hooks/useVehicleFinancialData';
import { useTransactions } from '../../transactions/useTransactions';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VehicleStatusHistory } from '@/types/vehicle';
import { getCommissionSplitsWithUsers } from '@/services/vehicleSaleService';

export const useTimelineEvents = (vehicle: any) => {
  const [statusHistory, setStatusHistory] = useState<VehicleStatusHistory[]>(
    []
  );
  const [loadingStatusHistory, setLoadingStatusHistory] = useState(false);
  const [commissionSplits, setCommissionSplits] = useState<any[]>([]);
  const [commissionHistory, setCommissionHistory] = useState<any[]>([]);

  const {
    acquisitionData,
    saleData,
    isLoading: isFinancialDataLoading,
    refetchData: refetchFinancialData,
    // Fuente ÚNICA de los totales: el mismo helper que el Resumen Financiero
    // (aplica IVA por línea, excluye la transferencia y alinea assumed_by). Antes
    // la línea de tiempo los recalculaba sumando montos crudos y NO cuadraba con
    // el resumen.
    totalExpenses: financialTotalExpenses,
    totalIncome: financialTotalIncome,
    netResult: financialNetResult,
    regimen: financialRegimen,
    ivaDebitoFiscal: financialIvaDebito,
  } = useVehicleFinancialData(vehicle.id, vehicle.is_consigned);

  const {
    transactions,
    loading: isTransactionsLoading,
    fetchTransactions,
  } = useTransactions(vehicle);

  // Fetch status history
  const fetchStatusHistory = async () => {
    if (!vehicle.id) return;

    setLoadingStatusHistory(true);
    try {
      const { data, error } = await supabase
        .from('vehicles_status_history')
        .select(
          `
          *,
          old_status:old_status_id(id, name, color),
          new_status:new_status_id(id, name, color),
          user:changed_by(id, first_name, last_name)
        `
        )
        .eq('vehicle_id', vehicle.id)
        .order('changed_at', { ascending: true });

      if (error) {
        console.error('Error fetching status history:', error);
        return;
      }

      setStatusHistory(data || []);
    } catch (error) {
      console.error('Error in fetchStatusHistory:', error);
    } finally {
      setLoadingStatusHistory(false);
    }
  };

  useEffect(() => {
    fetchStatusHistory();
  }, [vehicle.id]);

  // Movimientos de comisión de vendedor (sale_commission_splits) para mostrarlos
  // en la línea de tiempo del vehículo. Se traen por sale_id cuando hay venta.
  const saleId = saleData?.id;
  const fetchCommissionSplits = async () => {
    if (!saleId) {
      setCommissionSplits([]);
      return;
    }
    const splits = await getCommissionSplitsWithUsers(saleId);
    setCommissionSplits(splits || []);
  };

  // Historial de movimientos de comisión (auditoría). Se usa para mostrar las
  // ediciones/bajas que el estado actual ya no refleja. Usa el snapshot del
  // nombre del vendedor, así no necesita joins.
  const fetchCommissionHistory = async () => {
    if (!saleId) {
      setCommissionHistory([]);
      return;
    }
    const { data, error } = await supabase
      .from('sale_commission_splits_history')
      .select(
        'id, action, amount, previous_amount, vendedor_nombre_snapshot, changed_at'
      )
      .eq('sale_id', saleId)
      .order('changed_at', { ascending: true });
    if (error) {
      console.error('Error fetching commission history:', error);
      return;
    }
    setCommissionHistory(data || []);
  };

  useEffect(() => {
    fetchCommissionSplits();
    fetchCommissionHistory();
  }, [saleId]);

  const isLoading =
    isFinancialDataLoading || isTransactionsLoading || loadingStatusHistory;

  const generateTimelineEvents = () => {
    const timelineEvents = [];

    if (acquisitionData) {
      timelineEvents.push({
        id: 'acquisition',
        title: vehicle.is_consigned ? 'Consignación' : 'Compra del vehículo',
        description: vehicle.is_consigned
          ? `Vehículo recibido en consignación`
          : `Vehículo adquirido para inventario`,
        amount: vehicle.is_consigned
          ? acquisitionData.agreed_price || 0
          : acquisitionData.purchase_price || 0,
        type: 'acquisition',
        date: acquisitionData.created_at,
        iconType: 'user',
      });
    }

    // Add status history events
    if (statusHistory && statusHistory.length > 0) {
      statusHistory.forEach((historyItem) => {
        const oldStatusName = historyItem.old_status?.name || 'Estado inicial';
        const newStatusName =
          historyItem.new_status?.name || 'Estado desconocido';
        const userName = historyItem.user
          ? `${historyItem.user.first_name} ${historyItem.user.last_name}`
          : 'Usuario desconocido';

        timelineEvents.push({
          id: `status-${historyItem.id}`,
          title: `Cambio de estado`,
          description: `${oldStatusName} → ${newStatusName} (por ${userName})`,
          amount: 0,
          type: 'status_change',
          date: historyItem.changed_at,
          iconType: 'status',
          statusData: {
            oldStatus: historyItem.old_status,
            newStatus: historyItem.new_status,
            user: historyItem.user,
          },
        });
      });
    }

    if (transactions && transactions.length > 0) {
      transactions.forEach((transaction) => {
        const rawType = transaction.type;
        const isPlain =
          rawType === 'expense' ||
          rawType === 'income' ||
          rawType === 'document';
        // Adicionales registrados en el cierre de venta (nota de venta). Se
        // mapean a gasto o ingreso según quién los asume:
        //   - customer   (cliente paga)              → ingreso de la automotora
        //   - dealership (automotora absorbe)        → gasto
        //   - consignor  (se descuenta al consignador) → se muestra como cargo/gasto
        //     con el badge "Consignador". Es NEUTRO en los totales (que vienen del
        //     helper financiero, no de estos eventos), sólo cambia el color del ítem.
        // Antes se ignoraban, así que NO sumaban en la tarjeta de Gastos ni
        // aparecían en el historial → la utilidad quedaba sobreestimada
        // (reportado por MallorcAutos 2026-06-03, Ford Expedition: faltaban
        // $820.000 de "transferencia de vehículo").
        const isSaleExtra =
          rawType === 'sale_additional' || rawType === 'sale_income';
        if (!isPlain && !isSaleExtra) return;

        const assumedBy = (transaction as any).assumed_by ?? 'dealership';
        const eventType = isSaleExtra
          ? assumedBy === 'customer'
            ? 'income'
            : 'expense'
          : rawType;

        const docs_urls = Array.isArray(transaction.docs_urls)
          ? transaction.docs_urls
          : transaction.docs_urls
          ? [transaction.docs_urls]
          : [];
        timelineEvents.push({
          id: transaction.id,
          title: transaction.title,
          description: transaction.description || '',
          amount: transaction.amount || 0,
          type: eventType,
          date: transaction.created_at,
          iconType:
            eventType === 'expense'
              ? 'arrow-down'
              : eventType === 'income'
              ? 'arrow-up'
              : 'calendar',
          docs_urls,
          category_id: transaction.category_id,
          assumed_by: assumedBy,
          // Tipo REAL de la fila en BD (p.ej. 'sale_additional'/'sale_income'). `type`
          // de arriba es el mapeado para la UI (expense/income); al editar debemos
          // reescribir el tipo real para NO reclasificar un adicional de venta a
          // 'expense' y sacarlo de la liquidación del consignador (.in('type', [...])).
          raw_type: rawType,
          // Regla 3: para que la edición refleje si el gasto genera crédito fiscal.
          genera_credito_fiscal: (transaction as any).genera_credito_fiscal ?? null,
          // Pass-through: para que editar la línea NO resetee el flag (lo lee handleEditEvent).
          is_passthrough: (transaction as any).is_passthrough ?? false,
        });
      });
    }

    if (saleData) {
      timelineEvents.push({
        id: 'sale',
        title: 'Venta del vehículo',
        description: `Vehículo vendido`,
        amount: saleData.sale_price || 0,
        type: 'sale',
        date: saleData.sale_date || saleData.created_at,
        iconType: 'shopping-cart',
      });
    }

    // Movimientos de comisión de vendedor (solo lectura en el timeline).
    if (commissionSplits && commissionSplits.length > 0) {
      commissionSplits.forEach((split: any) => {
        const u = split.user;
        const vendedor = u
          ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
          : 'Vendedor';
        const detalle =
          split.split_type === 'percentage' && split.percentage != null
            ? `${vendedor} · ${split.percentage}%`
            : vendedor;
        timelineEvents.push({
          id: `commission-${split.id}`,
          title: 'Comisión de vendedor',
          description: detalle,
          amount: split.amount || 0,
          type: 'commission',
          date: split.created_at,
          iconType: 'commission',
        });
      });
    }

    // Movimientos del historial de comisión: mostramos las ediciones y bajas
    // (las altas ya están representadas por el split actual de arriba, evitando
    // duplicar). Así quedan visibles cambios que el estado actual ya no refleja.
    if (commissionHistory && commissionHistory.length > 0) {
      const fmt = (n: number) =>
        new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP',
          maximumFractionDigits: 0,
        }).format(n || 0);
      commissionHistory
        .filter((h: any) => h.action === 'updated' || h.action === 'deleted')
        .forEach((h: any) => {
          const vendedor = h.vendedor_nombre_snapshot || 'Vendedor';
          const isDeleted = h.action === 'deleted';
          const description = isDeleted
            ? vendedor
            : h.previous_amount != null
            ? `${vendedor} · ${fmt(h.previous_amount)} → ${fmt(h.amount)}`
            : vendedor;
          timelineEvents.push({
            id: `commission-h-${h.id}`,
            title: isDeleted ? 'Comisión eliminada' : 'Comisión actualizada',
            description,
            amount: h.amount || 0,
            type: 'commission',
            date: h.changed_at,
            iconType: 'commission',
          });
        });
    }

    return timelineEvents.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const sortedEvents = !isLoading ? generateTimelineEvents() : [];

  // Los totales NO se recalculan acá: se toman del helper unificado para que las
  // tarjetas de la línea de tiempo cuadren EXACTAMENTE con el Resumen Financiero
  // (IVA por línea, transferencia excluida, comisión, consignación, etc.).
  const totalExpenses = financialTotalExpenses;
  const totalIncome = financialTotalIncome;
  const netResult = financialNetResult;

  return {
    sortedEvents,
    totalExpenses,
    totalIncome,
    netResult,
    regimen: financialRegimen,
    ivaDebitoFiscal: financialIvaDebito,
    isLoading,
    refetchData: () => {
      fetchTransactions();
      fetchStatusHistory();
      fetchCommissionSplits();
      fetchCommissionHistory();
      refetchFinancialData();
    },
  };
};
