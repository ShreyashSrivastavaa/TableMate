import { describe, it, expect } from 'vitest';
import {
  canTransition,
  transitionReservationStatus,
  getAllowedNextStatuses,
} from '../domain/statusTransitions';
import { RESERVATION_STATUS } from '../domain/constants';

describe('Status Transitions State Machine', () => {
  it('allows valid transitions from pending', () => {
    expect(canTransition(RESERVATION_STATUS.PENDING, RESERVATION_STATUS.CONFIRMED)).toBe(true);
    expect(canTransition(RESERVATION_STATUS.PENDING, RESERVATION_STATUS.REJECTED)).toBe(true);
    expect(canTransition(RESERVATION_STATUS.PENDING, RESERVATION_STATUS.CANCELLED)).toBe(true);
  });

  it('allows confirmed to be cancelled only', () => {
    expect(canTransition(RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.CANCELLED)).toBe(true);
    expect(canTransition(RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.PENDING)).toBe(false);
    expect(canTransition(RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.REJECTED)).toBe(false);
  });

  it('treats rejected and cancelled as terminal states', () => {
    expect(getAllowedNextStatuses(RESERVATION_STATUS.REJECTED)).toEqual([]);
    expect(getAllowedNextStatuses(RESERVATION_STATUS.CANCELLED)).toEqual([]);
    expect(canTransition(RESERVATION_STATUS.REJECTED, RESERVATION_STATUS.CONFIRMED)).toBe(false);
    expect(canTransition(RESERVATION_STATUS.CANCELLED, RESERVATION_STATUS.PENDING)).toBe(false);
  });

  it('releases tableId when reservation is rejected or cancelled', () => {
    const activeReservation = {
      id: 'res-123',
      status: RESERVATION_STATUS.PENDING,
      tableId: 'T3',
      statusHistory: [],
    };

    const confirmed = transitionReservationStatus(activeReservation, RESERVATION_STATUS.CONFIRMED);
    expect(confirmed.status).toBe(RESERVATION_STATUS.CONFIRMED);
    expect(confirmed.tableId).toBe('T3');

    const cancelled = transitionReservationStatus(confirmed, RESERVATION_STATUS.CANCELLED, 'Customer called');
    expect(cancelled.status).toBe(RESERVATION_STATUS.CANCELLED);
    expect(cancelled.tableId).toBeNull();
    expect(cancelled.statusHistory.length).toBe(2);
    expect(cancelled.statusHistory[1].reason).toBe('Customer called');
  });

  it('throws an error if an invalid transition is attempted', () => {
    const cancelled = {
      id: 'res-456',
      status: RESERVATION_STATUS.CANCELLED,
      tableId: null,
      statusHistory: [],
    };

    expect(() => {
      transitionReservationStatus(cancelled, RESERVATION_STATUS.CONFIRMED);
    }).toThrow(/Invalid status transition/);
  });
});
