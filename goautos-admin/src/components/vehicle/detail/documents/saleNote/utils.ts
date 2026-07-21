
export const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(value);
};

export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const calculateTotals = (saleData: any, extraTransactions: any[]) => {
  // Make sure we're getting the sale price from the correct property
  const vehiclePrice = saleData?.sale_price || 0;
  
  const additionalIncome = extraTransactions
    .filter(extra => extra.type === 'income')
    .reduce((sum, extra) => sum + Number(extra.amount || 0), 0);
    
  const additionalExpenses = extraTransactions
    .filter(extra => extra.type === 'expense')
    .reduce((sum, extra) => sum + Number(extra.amount || 0), 0);
    
  const totalAdditional = additionalIncome - additionalExpenses;
  const grandTotal = vehiclePrice + totalAdditional;
  
  return {
    vehiclePrice,
    additionalIncome,
    additionalExpenses,
    totalAdditional,
    grandTotal
  };
};
