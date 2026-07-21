// Régimen del margen (Chile): el margen bruto incluye IVA. Por eso IVA = margen × 19/119.
export const DEFAULT_IVA_PERCENTAGE = 19;

export type CommissionBaseType = 'total' | 'margin';
export type CommissionType = 'percentage' | 'fixed';

export interface SellerBreakdownInput {
  salePrice: number;
  acquisitionCost: number;
  commissionPercentage: number;
  commissionBaseType?: CommissionBaseType;
  ivaPercentage?: number;
  /** 'percentage' (default) o 'fixed' (monto fijo, ignora el %). */
  commissionType?: CommissionType;
  /** Monto fijo de comisión cuando commissionType === 'fixed'. */
  commissionFixedAmount?: number;
}

export interface SellerBreakdown {
  grossMargin: number;
  ivaAmount: number;
  netMargin: number;
  commissionBase: number;
  commission: number;
}

export const calculateSellerBreakdown = ({
  salePrice,
  acquisitionCost,
  commissionPercentage,
  commissionBaseType = 'margin',
  ivaPercentage = DEFAULT_IVA_PERCENTAGE,
  commissionType = 'percentage',
  commissionFixedAmount = 0,
}: SellerBreakdownInput): SellerBreakdown => {
  const grossMargin = Math.max(0, (salePrice || 0) - (acquisitionCost || 0));
  const ivaAmount = grossMargin * (ivaPercentage / (100 + ivaPercentage));
  const netMargin = grossMargin - ivaAmount;
  const commissionBase = commissionBaseType === 'total' ? salePrice || 0 : netMargin;
  // Comisión fija: el vendedor cobra un monto fijo (ignora el %). Es lo que usan
  // automotoras como Beichek. En otro caso, % sobre la base.
  const commission =
    commissionType === 'fixed'
      ? commissionFixedAmount || 0
      : (commissionBase * (commissionPercentage || 0)) / 100;

  return {
    grossMargin,
    ivaAmount,
    netMargin,
    commissionBase,
    commission,
  };
};
