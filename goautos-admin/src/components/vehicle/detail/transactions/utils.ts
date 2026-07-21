// This util is deprecated - use useCurrency hook instead
export const formatCurrency = (
  amount: number,
  currency: string = 'CLP',
  locale: string = 'es-CL'
) => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(amount);
};

export const getFileNameFromUrl = (url: string) => {
  try {
    const path = new URL(url).pathname;
    return path.split('/').pop() || 'Documento';
  } catch {
    return 'Documento';
  }
};
