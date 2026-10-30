import { RESERVATION_STATUS } from './constants.js';
import {
  generateCandidateSlots,
  getTodayKolkata,
  getCurrentTimeKolkata,
  isDateInBookingWindow,
  timeToMinutes,
} from './time.js';

/**
 * Checks if two 90-minute reservations on the same date overlap
 */
export function doTimesOverlap(timeA, timeB, durationMinutes = 90) {
  const minA = timeToMinutes(timeA);
  const minB = timeToMinutes(timeB);
  return Math.abs(minA - minB) < durationMinutes;
}

/**
 * Checks if a table is free at a given date and time among active reservations
 * Active reservations = status is 'pending' or 'confirmed'
 */
export function isTableFree(tableId, date, time, reservations, durationMinutes = 90, ignoreReservationId = null) {
  return !reservations.some((r) => {
    if (r.id === ignoreReservationId) return false;
    if (r.date !== date) return false;
    if (r.tableId !== tableId) return false;
    // Only pending and confirmed reservations block a table
    if (r.status !== RESERVATION_STATUS.PENDING && r.status !== RESERVATION_STATUS.CONFIRMED) {
      return false;
    }
    return doTimesOverlap(r.time, time, durationMinutes);
  });
}

/**
 * Finds all tables capable of seating `guests` and free at given date and time
 */
export function getAvailableTablesForSlot(guests, date, time, tables, reservations, durationMinutes = 90) {
  return tables
    .filter((table) => table.capacity >= guests)
    .filter((table) => isTableFree(table.id, date, time, reservations, durationMinutes));
}

/**
 * Assigns the best-fit free table for a reservation:
 * Smallest capacity >= guests; if tie, table with lowest ID/number
 */
export function findBestFitTable(guests, date, time, tables, reservations, durationMinutes = 90) {
  const candidates = getAvailableTablesForSlot(guests, date, time, tables, reservations, durationMinutes);
  if (candidates.length === 0) return null;

  // Sort by capacity ascending, then table number ascending
  candidates.sort((a, b) => {
    if (a.capacity !== b.capacity) {
      return a.capacity - b.capacity;
    }
    return a.number.localeCompare(b.number, undefined, { numeric: true });
  });

  return candidates[0];
}

/**
 * Returns available time slots for a specific date and party size
 */
export function getAvailableSlotsForDate(
  date,
  guests,
  tables,
  reservations,
  settings = {}
) {
  const today = getTodayKolkata();
  if (!isDateInBookingWindow(date, today)) {
    return [];
  }

  const {
    openTime = '12:00',
    closeTime = '23:00',
    diningDurationMinutes = 90,
    slotIntervalMinutes = 30,
  } = settings;

  const allSlots = generateCandidateSlots(openTime, closeTime, diningDurationMinutes, slotIntervalMinutes);
  const currentTime = getCurrentTimeKolkata();

  return allSlots.filter((slot) => {
    // If date is today, hide past times
    if (date === today) {
      if (timeToMinutes(slot) <= timeToMinutes(currentTime)) {
        return false;
      }
    }

    // Check if there is at least one table with capacity >= guests that is free
    const availableTables = getAvailableTablesForSlot(
      guests,
      date,
      slot,
      tables,
      reservations,
      diningDurationMinutes
    );
    return availableTables.length > 0;
  });
}

/**
 * Computes table availability breakdown for a given date and time
 * Used by the Tables view on the dashboard
 */
export function getTableStatusList(date, time, tables, reservations, durationMinutes = 90) {
  return tables.map((table) => {
    const overlappingReservation = reservations.find((r) => {
      if (r.date !== date || r.tableId !== table.id) return false;
      if (r.status !== RESERVATION_STATUS.PENDING && r.status !== RESERVATION_STATUS.CONFIRMED) {
        return false;
      }
      return doTimesOverlap(r.time, time, durationMinutes);
    });

    return {
      table,
      isAvailable: !overlappingReservation,
      currentReservation: overlappingReservation || null,
    };
  });
}
