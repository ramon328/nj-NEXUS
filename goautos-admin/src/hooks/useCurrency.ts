import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useCurrency = () => {
  const { client } = useAuth();

  const currency = client?.currency || 'CLP';
  const locale = currency === 'USD' ? 'en-US' : 'es-CL';

  const formatPrice = useMemo(() => {
    return (price: number, options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: currency === 'USD' ? 2 : 0,
        ...options,
      }).format(price);
    };
  }, [locale, currency]);

  return {
    currency,
    locale,
    formatPrice,
  };
};
