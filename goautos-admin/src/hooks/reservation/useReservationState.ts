import { useState } from 'react';

export const useReservationState = (vehicleId: number) => {
  const [isLoading, setIsLoading] = useState(true);
  const [reservation, setReservation] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [additionals, setAdditionals] = useState<any[]>([]);
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);

  // Calculate totals
  const totalPayments = reservation?.reservation_amount || 0;
  // Calculate totalAdditionals from the additionals array since additional_amount column doesn't exist yet
  const totalAdditionals = additionals.reduce(
    (sum, additional) => sum + (Number(additional.amount) || 0),
    0
  );
  const agreedPrice = reservation?.reservation_agreed_price || 0;

  // Calculate remaining amount: agreed price - payments + additionals
  const remainingAmount = agreedPrice - totalPayments + totalAdditionals;

  return {
    isLoading,
    setIsLoading,
    reservation,
    setReservation,
    payments,
    setPayments,
    additionals,
    setAdditionals,
    isNew,
    setIsNew,
    saving,
    setSaving,
    totalAmount: totalPayments, // Keep for backward compatibility
    totalPayments,
    totalAdditionals,
    agreedPrice,
    remainingAmount,
  };
};
