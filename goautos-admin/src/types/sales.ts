/**
 * Types for sales and commission splits
 */

export type CommissionSplitType = 'percentage' | 'amount';

/**
 * Represents a single commission split for a sale
 */
export interface CommissionSplit {
  id?: string;
  sale_id?: number;
  user_id: string;
  split_type: CommissionSplitType;
  percentage?: number | null;  // Used when split_type = 'percentage'
  amount: number;              // Calculated or fixed amount
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Commission split with user details for display
 */
export interface CommissionSplitWithUser extends CommissionSplit {
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    rol: string;
  };
}

/**
 * Input type for creating/editing commission splits in the UI
 */
export interface CommissionSplitInput {
  id?: string;
  userId: string;
  splitType: CommissionSplitType;
  percentage?: number;
  amount?: number;
  notes?: string;
}

/**
 * Validates that commission splits don't exceed total commission
 */
export const validateCommissionSplits = (
  splits: CommissionSplitInput[],
  totalCommission: number
): { valid: boolean; error?: string } => {
  if (splits.length === 0) {
    return { valid: true };
  }

  let totalAssigned = 0;
  let totalPercentage = 0;

  // First pass: calculate amounts from percentages
  for (const split of splits) {
    if (split.splitType === 'percentage') {
      const pct = split.percentage || 0;
      totalPercentage += pct;
      totalAssigned += (totalCommission * pct) / 100;
    } else {
      totalAssigned += split.amount || 0;
    }
  }

  if (totalPercentage > 100) {
    return {
      valid: false,
      error: 'La suma de porcentajes no puede exceder 100%',
    };
  }

  if (totalAssigned > totalCommission + 0.01) {
    return {
      valid: false,
      error: 'El total asignado excede la comisión disponible',
    };
  }

  return { valid: true };
};

/**
 * Calculates the amount for each split based on total commission
 */
export const calculateSplitAmounts = (
  splits: CommissionSplitInput[],
  totalCommission: number
): CommissionSplit[] => {
  return splits.map((split) => {
    let amount = 0;

    if (split.splitType === 'percentage' && split.percentage) {
      amount = (totalCommission * split.percentage) / 100;
    } else if (split.splitType === 'amount' && split.amount) {
      amount = split.amount;
    }

    return {
      user_id: split.userId,
      split_type: split.splitType,
      percentage: split.splitType === 'percentage' ? split.percentage : null,
      amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
      notes: split.notes || null,
    };
  });
};
