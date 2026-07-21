import React from 'react';
import { AlertCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Financing } from '@/types/financing';
import { formatDate } from '@/lib/utils';

export type FinancingStatusInfo = {
  label: string;
  variant: 'success' | 'destructive' | 'default' | 'warning';
  iconType: 'CheckCircle2' | 'AlertCircle' | 'Clock' | 'AlertTriangle';
};

export const getFinancingStatus = (financing: Financing): FinancingStatusInfo => {
  // Calculate the percentage of payments completed
  const totalPayments = financing.total_installments || 0;
  const completedPayments = financing.payments?.filter(p => p.is_paid).length || 0;
  const percentage = totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0;

  // Check if any payments are late
  const hasLatePayments = financing.payments?.some(p => p.payment_status === 'late') || false;

  // Determine status based on payments
  if (percentage >= 100) {
    return {
      label: 'Completado',
      variant: 'success',
      iconType: 'CheckCircle2'
    };
  } else if (hasLatePayments) {
    return {
      label: 'Con atraso',
      variant: 'destructive',
      iconType: 'AlertCircle'
    };
  } else if (percentage > 0) {
    return {
      label: 'En progreso',
      variant: 'default',
      iconType: 'Clock'
    };
  } else {
    return {
      label: 'Pendiente',
      variant: 'warning',
      iconType: 'AlertTriangle'
    };
  }
};

export const calculateProgress = (financing: Financing): number => {
  const totalPayments = financing.total_installments || 0;
  const completedPayments = financing.payments?.filter(p => p.is_paid).length || 0;
  
  return totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0;
};

export const calculateAmountPaid = (financing: Financing): number => {
  return financing.payments?.filter(p => p.is_paid)
    .reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
};

export const calculateRemainingAmount = (financing: Financing): number => {
  const totalAmount = financing.monthly_installment * financing.total_installments;
  const amountPaid = calculateAmountPaid(financing);
  
  return totalAmount - amountPaid;
};

export const getNextPaymentDate = (financing: Financing): string => {
  if (!financing.payments || financing.payments.length === 0) {
    return 'No hay pagos programados';
  }
  
  const pendingPayments = financing.payments
    .filter(p => !p.is_paid)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  
  if (pendingPayments.length === 0) {
    return 'Todos los pagos completados';
  }
  
  return formatDate(pendingPayments[0].due_date);
};
