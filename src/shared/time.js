import { TIMEZONE } from './constants.js';

/**
 * Returns current Date object or current date string formatted as YYYY-MM-DD in Asia/Kolkata
 */
export function getTodayKolkata(baseDate = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(baseDate);
}

/**
 * Returns current time string HH:mm in Asia/Kolkata
 */
export function getCurrentTimeKolkata(baseDate = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(baseDate);
}

/**
 * Parses "HH:mm" into total minutes from midnight (0 to 1439)
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converts minutes from midnight into "HH:mm"
 */
export function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Add days to a YYYY-MM-DD string
 */
export function addDaysToDate(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Checks if date is within [today, today + maxDays]
 */
export function isDateInBookingWindow(dateStr, today = getTodayKolkata(), maxDays = 60) {
  if (!dateStr || dateStr < today) return false;
  const maxDate = addDaysToDate(today, maxDays);
  return dateStr <= maxDate;
}

/**
 * Generates all candidate 30-min time slots for given open and close times
 * Ensuring the last slot allows a 90-minute stay before closeTime.
 */
export function generateCandidateSlots(openTime = '12:00', closeTime = '23:00', diningDurationMinutes = 90, intervalMinutes = 30) {
  const openMin = timeToMinutes(openTime);
  const closeMin = timeToMinutes(closeTime);
  const lastSlotMin = closeMin - diningDurationMinutes;

  const slots = [];
  for (let min = openMin; min <= lastSlotMin; min += intervalMinutes) {
    slots.push(minutesToTime(min));
  }
  return slots;
}

/**
 * Formats YYYY-MM-DD into a friendly label, e.g. "Friday, Oct 30, 2026"
 */
export function formatFriendlyDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats "HH:mm" into "h:mm A", e.g. "19:30" -> "7:30 PM"
 */
export function formatFriendlyTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
}
