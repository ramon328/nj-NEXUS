
// Utility functions for formatting numbers in form inputs

/**
 * Formats a number input by removing non-numeric characters
 */
export const formatNumber = (value: string): string => {
  // Remove all non-numeric characters except dots
  return value.replace(/[^\d]/g, '');
};

/**
 * Format the display value with thousand separators
 */
export const formatDisplayNumber = (value: string | number | null): string => {
  if (value === null || value === undefined) return '';
  
  // Ensure value is a string
  const stringValue = String(value);
  if (!stringValue) return '';
  
  // Clean the value (remove all dots which are thousand separators)
  const cleanValue = stringValue.replace(/\./g, '');
  return new Intl.NumberFormat('es-CL').format(parseInt(cleanValue) || 0);
};

/**
 * Calculate the final price after discount
 */
export const calculateFinalPrice = (price: string, discount: string): number | null => {
  if (!price) {
    return null;
  }
  
  // Clean the price string (remove all dots which are thousand separators)
  const cleanPrice = price.replace(/\./g, '');
  const priceValue = parseInt(cleanPrice, 10);
  
  // Parse discount as integer with fallback to 0, ensure it's between 0 and 100
  let discountValue = 0;
  if (discount) {
    const cleanDiscount = discount.replace(/\./g, '');
    discountValue = parseInt(cleanDiscount, 10) || 0;
    // Ensure discount is between 0 and 100
    discountValue = Math.min(Math.max(discountValue, 0), 100);
  }
  
  // Make sure we have valid numbers
  if (!isNaN(priceValue)) {
    if (discountValue > 0) {
      // Apply discount and round to nearest integer
      return Math.round(priceValue * (1 - (discountValue / 100)));
    } else {
      return priceValue;
    }
  }
  
  return null;
};
