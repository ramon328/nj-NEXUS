
import { FinancingDetailType } from '@/types/financing';
import { StatusType } from '../components/StatusBadge';

/**
 * Calculate the progress of payments as a percentage
 */
export const calculateProgress = (financing: FinancingDetailType): number => {
  const paidInstallments = financing.payments.filter(p => p.is_paid).length;
  return (paidInstallments / financing.total_installments) * 100;
};

/**
 * Calculate the total amount to be paid
 */
export const calculateTotalAmount = (financing: FinancingDetailType): number => {
  return Number(financing.monthly_installment) * financing.total_installments;
};

/**
 * Calculate the amount already paid
 */
export const calculateAmountPaid = (financing: FinancingDetailType): number => {
  return financing.payments
    .filter(payment => payment.is_paid)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
};

/**
 * Calculate the remaining balance to be paid
 */
export const calculateRemainingBalance = (financing: FinancingDetailType): number => {
  const totalAmount = calculateTotalAmount(financing);
  const amountPaid = calculateAmountPaid(financing);
  return totalAmount - amountPaid;
};

/**
 * Calculate the interest paid so far
 */
export const calculateInterestPaid = (financing: FinancingDetailType): number => {
  return financing.payments
    .filter(payment => payment.is_paid)
    .reduce((sum, payment) => sum + Number(payment.interest_amount || 0), 0);
};

/**
 * Calculate the percentage of the total amount that has been paid
 */
export const calculatePercentagePaid = (financing: FinancingDetailType): number => {
  const amountPaid = calculateAmountPaid(financing);
  const totalAmount = calculateTotalAmount(financing);
  return (amountPaid / totalAmount) * 100;
};

/**
 * Determine the current payment status
 */
export const getPaymentStatus = (financing: FinancingDetailType) => {
  if (!financing.payments.length) {
    return { 
      status: 'unknown' as StatusType, 
      label: 'Desconocido', 
      icon: 'alert-circle', 
      color: 'text-gray-500' 
    };
  }

  const today = new Date();
  const dueDates = financing.payments
    .filter(p => !p.is_paid)
    .map(p => new Date(p.due_date));
  
  if (dueDates.length === 0) {
    // All payments are made
    return { 
      status: 'completed' as StatusType, 
      label: 'Completado', 
      icon: 'check-circle', 
      color: 'text-green-500' 
    };
  }

  // Sort due dates to find the earliest
  dueDates.sort((a, b) => a.getTime() - b.getTime());
  const earliestDueDate = dueDates[0];

  if (earliestDueDate < today) {
    return { 
      status: 'overdue' as StatusType, 
      label: 'Atrasado', 
      icon: 'alert-circle', 
      color: 'text-red-500' 
    };
  } else {
    // Next payment is not yet due
    return { 
      status: 'current' as StatusType, 
      label: 'Al día', 
      icon: 'check-circle', 
      color: 'text-green-500' 
    };
  }
};
