import { describe, it, expect } from 'vitest';
import {
  doTimesOverlap,
  isTableFree,
  findBestFitTable,
  getAvailableSlotsForDate,
} from '../domain/availability';
import { generateCandidateSlots } from '../domain/time';
import { RESERVATION_STATUS } from '../domain/constants';

describe('Availability & Table Assignment Logic', () => {
  const tables = [
    { id: 'T1', number: '1', capacity: 2 },
    { id: 'T2', number: '2', capacity: 2 },
    { id: 'T3', number: '3', capacity: 4 },
    { id: 'T4', number: '4', capacity: 4 },
    { id: 'T6', number: '6', capacity: 6 },
    { id: 'T7', number: '7', capacity: 8 },
  ];

  describe('90-minute window overlap detection', () => {
    it('detects overlap for times within 90 minutes', () => {
      expect(doTimesOverlap('19:00', '19:30', 90)).toBe(true);
      expect(doTimesOverlap('19:00', '20:00', 90)).toBe(true);
      expect(doTimesOverlap('19:00', '20:29', 90)).toBe(true);
    });

    it('does not overlap when exactly 90 minutes or greater', () => {
      expect(doTimesOverlap('19:00', '20:30', 90)).toBe(false);
      expect(doTimesOverlap('19:00', '21:00', 90)).toBe(false);
    });
  });

  describe('Table Blocking & Best-Fit Assignment', () => {
    const testDate = '2026-11-05';

    it('assigns smallest capacity table (best fit)', () => {
      const bestFor2 = findBestFitTable(2, testDate, '19:00', tables, []);
      expect(bestFor2.capacity).toBe(2);
      expect(bestFor2.id).toBe('T1');

      const bestFor4 = findBestFitTable(4, testDate, '19:00', tables, []);
      expect(bestFor4.capacity).toBe(4);
      expect(bestFor4.id).toBe('T3');

      const bestFor5 = findBestFitTable(5, testDate, '19:00', tables, []);
      expect(bestFor5.capacity).toBe(6);
      expect(bestFor5.id).toBe('T6');
    });

    it('pending and confirmed block a table, while rejected and cancelled release it', () => {
      const reservations = [
        {
          id: 'res-1',
          date: testDate,
          time: '19:00',
          tableId: 'T1',
          status: RESERVATION_STATUS.PENDING,
        },
        {
          id: 'res-2',
          date: testDate,
          time: '19:00',
          tableId: 'T2',
          status: RESERVATION_STATUS.CONFIRMED,
        },
        {
          id: 'res-3',
          date: testDate,
          time: '19:00',
          tableId: 'T3',
          status: RESERVATION_STATUS.CANCELLED,
        },
      ];

      // T1 is blocked by pending
      expect(isTableFree('T1', testDate, '19:30', reservations, 90)).toBe(false);
      // T2 is blocked by confirmed
      expect(isTableFree('T2', testDate, '19:30', reservations, 90)).toBe(false);
      // T3 was cancelled, so it IS free
      expect(isTableFree('T3', testDate, '19:30', reservations, 90)).toBe(true);

      // Next party of 2 should be assigned T3 (as T1 and T2 are blocked)
      const assigned = findBestFitTable(2, testDate, '19:30', tables, reservations);
      expect(assigned.id).toBe('T3');
    });
  });

  describe('Candidate Slots & Opening Hours Buffer', () => {
    it('ensures the last slot leaves 90 minutes before closeTime', () => {
      // Open 12:00, Close 23:00 -> last slot must be 21:30
      const slots = generateCandidateSlots('12:00', '23:00', 90, 30);
      expect(slots[0]).toBe('12:00');
      expect(slots[slots.length - 1]).toBe('21:30');
      expect(slots.includes('22:00')).toBe(false);
      expect(slots.includes('22:30')).toBe(false);
    });
  });
});
