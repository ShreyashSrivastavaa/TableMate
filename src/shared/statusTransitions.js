import { RESERVATION_STATUS } from './constants.js';

export const VALID_TRANSITIONS = {
  [RESERVATION_STATUS.PENDING]: [
    RESERVATION_STATUS.CONFIRMED,
    RESERVATION_STATUS.REJECTED,
    RESERVATION_STATUS.CANCELLED,
  ],
  [RESERVATION_STATUS.CONFIRMED]: [
    RESERVATION_STATUS.CANCELLED,
  ],
  [RESERVATION_STATUS.REJECTED]: [],
  [RESERVATION_STATUS.CANCELLED]: [],
};

/**
 * Checks whether transitioning from currentStatus to nextStatus is allowed
 */
export function canTransition(currentStatus, nextStatus) {
  if (!currentStatus || !nextStatus) return false;
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Returns list of allowable next actions for a given status
 */
export function getAllowedNextStatuses(currentStatus) {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Generates an updated reservation object with a new status transition record
 */
export function transitionReservationStatus(reservation, newStatus, reason = '') {
  if (!canTransition(reservation.status, newStatus)) {
    throw new Error(
      `Invalid status transition from "${reservation.status}" to "${newStatus}". Allowed: ${
        VALID_TRANSITIONS[reservation.status]?.join(', ') || 'none (terminal)'
      }`
    );
  }

  const nowIso = new Date().toISOString();

  // If reservation is rejected or cancelled, release the table
  const shouldReleaseTable =
    newStatus === RESERVATION_STATUS.REJECTED || newStatus === RESERVATION_STATUS.CANCELLED;

  const historyEntry = {
    from: reservation.status,
    to: newStatus,
    timestamp: nowIso,
    reason: reason || undefined,
  };

  return {
    ...reservation,
    status: newStatus,
    tableId: shouldReleaseTable ? null : reservation.tableId,
    updatedAt: nowIso,
    statusHistory: [...(reservation.statusHistory || []), historyEntry],
  };
}
