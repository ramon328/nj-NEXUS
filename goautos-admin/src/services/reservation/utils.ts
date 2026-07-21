/**
 * Format a date for database insertion
 */
export const formatDateForDatabase = (date: Date | string): string => {
  // If it's already a string, return it
  if (typeof date === 'string') {
    return date;
  }

  // Format as ISO string
  return date.toISOString();
};
