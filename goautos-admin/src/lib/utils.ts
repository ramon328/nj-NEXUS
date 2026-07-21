import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  includeSymbol: boolean = true
): string {
  const formatter = new Intl.NumberFormat('es-CL', {
    style: includeSymbol ? 'currency' : 'decimal',
    currency: 'CLP',
    minimumFractionDigits: 0,
  });
  return formatter.format(amount);
}

export const formatDate = (date: string) => {
  const dateObject = new Date(date);
  return dateObject.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateTime = (date: string) => {
  const dateObject = new Date(date);
  return dateObject.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function formatDateShort(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
