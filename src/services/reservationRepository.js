import {
  DEFAULT_SETTINGS,
  DEFAULT_TABLES,
  RESERVATION_STATUS,
  RESERVATION_SOURCE,
} from '../domain/constants';
import { generateSampleReservations } from './sampleData';
import { findBestFitTable } from '../domain/availability';
import { transitionReservationStatus, canTransition } from '../domain/statusTransitions';
import { normalizeIndianPhone } from '../domain/validation';
import { getTodayKolkata, getCurrentTimeKolkata, timeToMinutes } from '../domain/time';

const STORAGE_KEYS = {
  RESERVATIONS: 'tablemate_reservations_v1',
  SETTINGS: 'tablemate_settings_v1',
  TABLES: 'tablemate_tables_v1',
};

const BROADCAST_EVENT = 'tablemate_data_changed';

/**
 * Generate a unique reference format TM-XXXXXX with collision detection
 */
export function generateReference(existingReferences = new Set()) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Avoid confusing 0,1,I,O
  let attempts = 0;
  while (attempts < 1000) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const ref = `TM-${code}`;
    if (!existingReferences.has(ref)) {
      return ref;
    }
    attempts++;
  }
  return `TM-${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

class ReservationRepository {
  constructor() {
    this.listeners = new Set();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (Object.values(STORAGE_KEYS).includes(e.key)) {
          this.notifyListeners();
        }
      });
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in repository listener:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BROADCAST_EVENT));
    }
  }

  // Settings
  getSettings() {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  updateSettings(newSettings) {
    const merged = { ...this.getSettings(), ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    this.notifyListeners();
    return merged;
  }

  // Tables
  getTables() {
    if (typeof window === 'undefined') return DEFAULT_TABLES;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TABLES);
      return data ? JSON.parse(data) : DEFAULT_TABLES;
    } catch {
      return DEFAULT_TABLES;
    }
  }

  // Reservations
  list() {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
      if (!data) {
        // Auto-seed if empty
        const initial = generateSampleReservations();
        localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  get(id) {
    const all = this.list();
    return all.find((r) => r.id === id) || null;
  }

  getByReference(ref) {
    const all = this.list();
    return all.find((r) => r.reference.toUpperCase() === ref.trim().toUpperCase()) || null;
  }

  create(reservationData) {
    const reservations = this.list();
    const tables = this.getTables();
    const settings = this.getSettings();

    const normalizedPhone = normalizeIndianPhone(reservationData.phone);
    const existingRefs = new Set(reservations.map((r) => r.reference));
    const reference = generateReference(existingRefs);

    // Availability & best-fit table assignment
    const bestTable = findBestFitTable(
      reservationData.guests,
      reservationData.date,
      reservationData.time,
      tables,
      reservations,
      settings.diningDurationMinutes || 90
    );

    if (!bestTable) {
      throw new Error('No table available for this party size and time slot.');
    }

    const nowIso = new Date().toISOString();
    const newReservation = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      reference,
      name: reservationData.name.trim(),
      phone: normalizedPhone,
      date: reservationData.date,
      time: reservationData.time,
      guests: Number(reservationData.guests),
      notes: (reservationData.notes || '').trim(),
      status: RESERVATION_STATUS.PENDING,
      source: reservationData.source || RESERVATION_SOURCE.BOOKING_FORM,
      tableId: bestTable.id,
      createdAt: nowIso,
      updatedAt: nowIso,
      statusHistory: [
        {
          from: null,
          to: RESERVATION_STATUS.PENDING,
          timestamp: nowIso,
          reason: 'Customer requested reservation',
        },
      ],
      reminderDue: `${reservationData.date}T${reservationData.time}:00+05:30`,
    };

    reservations.unshift(newReservation);
    localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations));
    this.notifyListeners();

    return newReservation;
  }

  updateStatus(id, newStatus, reason = '') {
    const reservations = this.list();
    const index = reservations.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error(`Reservation not found with id ${id}`);
    }

    const current = reservations[index];
    const updated = transitionReservationStatus(current, newStatus, reason);

    reservations[index] = updated;
    localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations));
    this.notifyListeners();

    return updated;
  }

  reset() {
    const freshSample = generateSampleReservations();
    localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(freshSample));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(DEFAULT_TABLES));
    this.notifyListeners();
    return freshSample;
  }

  // Derived Customers View
  getCustomers() {
    const reservations = this.list();
    const customerMap = new Map();

    reservations.forEach((r) => {
      const phone = normalizeIndianPhone(r.phone);
      if (!customerMap.has(phone)) {
        customerMap.set(phone, {
          phone,
          name: r.name,
          reservations: [],
        });
      }
      const cust = customerMap.get(phone);
      cust.reservations.push(r);
      // Keep most recent name
      if (r.createdAt > (cust.mostRecentCreatedAt || '')) {
        cust.mostRecentCreatedAt = r.createdAt;
        cust.name = r.name;
      }
    });

    return Array.from(customerMap.values()).map((c) => {
      // Sort reservations newest first
      const sorted = c.reservations.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      return {
        phone: c.phone,
        name: c.name,
        reservationCount: sorted.length,
        mostRecentReservation: sorted[0],
        allReservations: sorted,
      };
    }).sort((a, b) => b.reservationCount - a.reservationCount);
  }

  // Derived Dashboard Metrics
  getDashboardMetrics() {
    const reservations = this.list();
    const today = getTodayKolkata();
    const currentTime = getCurrentTimeKolkata();
    const currentMinutes = timeToMinutes(currentTime);

    const todayReservations = reservations.filter((r) => r.date === today);

    const totalToday = todayReservations.length;
    const pendingToday = todayReservations.filter((r) => r.status === RESERVATION_STATUS.PENDING).length;
    const confirmedToday = todayReservations.filter((r) => r.status === RESERVATION_STATUS.CONFIRMED).length;
    const cancelledToday = todayReservations.filter(
      (r) => r.status === RESERVATION_STATUS.CANCELLED || r.status === RESERVATION_STATUS.REJECTED
    ).length;

    // Upcoming today: active reservations (pending or confirmed) whose time is later than current time
    const upcomingToday = todayReservations.filter((r) => {
      const isActive = r.status === RESERVATION_STATUS.PENDING || r.status === RESERVATION_STATUS.CONFIRMED;
      return isActive && timeToMinutes(r.time) >= currentMinutes;
    }).sort((a, b) => a.time.localeCompare(b.time));

    // Recent activity: compile all status transition events across all reservations
    const recentActivity = [];
    reservations.forEach((r) => {
      r.statusHistory.forEach((h) => {
        recentActivity.push({
          reservationId: r.id,
          reference: r.reference,
          name: r.name,
          date: r.date,
          time: r.time,
          from: h.from,
          to: h.to,
          timestamp: h.timestamp,
          reason: h.reason,
        });
      });
    });

    recentActivity.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return {
      today,
      totalToday,
      pendingToday,
      confirmedToday,
      cancelledToday,
      upcomingToday,
      recentActivity: recentActivity.slice(0, 10),
    };
  }
}

export const repository = new ReservationRepository();
