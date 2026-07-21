
import {
  getOrCreateReservation,
  createReservationDocument,
  createReservation,
  updateReservation,
  createReservationPayment,
  updateReservationPayment,
  deleteReservationPayment,
  getReservationPayments
} from './reservation';

/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please import directly from '@/services/reservation' instead.
 * 
 * Example:
 * import { getOrCreateReservation } from '@/services/reservation';
 */

// Re-export everything from the new files to maintain backward compatibility
export {
  getOrCreateReservation,
  createReservationDocument,
  createReservation,
  updateReservation,
  createReservationPayment,
  updateReservationPayment,
  deleteReservationPayment,
  getReservationPayments
};
