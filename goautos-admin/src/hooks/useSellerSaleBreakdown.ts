import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  calculateSellerBreakdown,
  CommissionBaseType,
  CommissionType,
  SellerBreakdown,
} from '@/utils/sellerCalculation';

interface UseSellerSaleBreakdownArgs {
  vehicleId: number | null | undefined;
  isConsigned: boolean | null | undefined;
  sellerId: number | null | undefined;
  salePrice: number;
  commissionBaseType?: CommissionBaseType;
  /**
   * If provided, overrides the seller's tier percentage. Used when the seller
   * (or admin) types a custom % at registration time.
   */
  commissionPercentageOverride?: number | null;
}

interface UseSellerSaleBreakdownResult {
  breakdown: SellerBreakdown | null;
  acquisitionCost: number;
  commissionPercentage: number;
  loading: boolean;
}

export const useSellerSaleBreakdown = ({
  vehicleId,
  isConsigned,
  sellerId,
  salePrice,
  commissionBaseType = 'margin',
  commissionPercentageOverride,
}: UseSellerSaleBreakdownArgs): UseSellerSaleBreakdownResult => {
  const { client } = useAuth();
  const clientIvaExempt = !!client?.ventas_exentas_iva;
  const [vehicleIvaExento, setVehicleIvaExento] = useState<boolean | null>(null);
  // Exento por VEHÍCULO tiene prioridad; null → default del cliente.
  const ivaExempt = vehicleIvaExento ?? clientIvaExempt;
  const [acquisitionCost, setAcquisitionCost] = useState(0);
  const [commissionPercentage, setCommissionPercentage] = useState(0);
  const [commissionType, setCommissionType] = useState<CommissionType>('percentage');
  const [commissionFixed, setCommissionFixed] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!vehicleId) {
      setAcquisitionCost(0);
      return;
    }

    setLoading(true);
    // Flag de IVA exento del vehículo (override del default del cliente).
    supabase
      .from('vehicles')
      .select('iva_exento')
      .eq('id', vehicleId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setVehicleIvaExento((data as any)?.iva_exento ?? null);
      });
    const fetchAcquisition = async () => {
      if (isConsigned) {
        const { data } = await supabase
          .from('vehicles_consignments')
          .select('agreed_price')
          .eq('vehicle_id', vehicleId)
          .maybeSingle();
        if (!cancelled) setAcquisitionCost(Number(data?.agreed_price) || 0);
      } else {
        const { data } = await supabase
          .from('vehicles_purchases')
          .select('purchase_price')
          .eq('vehicle_id', vehicleId)
          .maybeSingle();
        if (!cancelled) setAcquisitionCost(Number(data?.purchase_price) || 0);
      }
    };

    fetchAcquisition().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [vehicleId, isConsigned]);

  useEffect(() => {
    let cancelled = false;
    if (!sellerId) {
      setCommissionPercentage(0);
      return;
    }

    supabase
      .from('seller_commission_tiers')
      .select('percentage, fixed_amount, commission_type')
      .eq('seller_id', sellerId)
      .order('max_amount', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setCommissionPercentage(Number((data as any)?.percentage) || 0);
        setCommissionType(
          ((data as any)?.commission_type as CommissionType) || 'percentage'
        );
        setCommissionFixed(Number((data as any)?.fixed_amount) || 0);
      });

    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  const effectivePercentage =
    commissionPercentageOverride != null
      ? Number(commissionPercentageOverride) || 0
      : commissionPercentage;

  const breakdown = vehicleId
    ? calculateSellerBreakdown({
        salePrice,
        acquisitionCost,
        commissionPercentage: effectivePercentage,
        commissionBaseType,
        commissionType,
        commissionFixedAmount: commissionFixed,
        // Auto usado exento de IVA → no descontar IVA del margen/comisión.
        ivaPercentage: ivaExempt ? 0 : undefined,
      })
    : null;

  return {
    breakdown,
    acquisitionCost,
    commissionPercentage: effectivePercentage,
    loading,
  };
};
