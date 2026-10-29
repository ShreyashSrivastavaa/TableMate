import { describe, it, expect } from 'vitest';
import {
  normalizeIndianPhone,
  isValidIndianPhone,
  createReservationSchema,
  settingsSchema,
} from '../domain/validation';
import { getTodayKolkata, addDaysToDate } from '../domain/time';

describe('Validation Layer', () => {
  describe('Indian Phone Normalization & Validation', () => {
    it('normalizes mobile numbers with +91, spaces, dashes', () => {
      expect(normalizeIndianPhone('+91 98450-12345')).toBe('9845012345');
      expect(normalizeIndianPhone('09845012345')).toBe('9845012345');
      expect(normalizeIndianPhone('919845012345')).toBe('9845012345');
      expect(normalizeIndianPhone('9845012345')).toBe('9845012345');
    });

    it('validates 10-digit mobile starting with 6, 7, 8, or 9', () => {
      expect(isValidIndianPhone('9845012345')).toBe(true);
      expect(isValidIndianPhone('+91 87654 32109')).toBe(true);
      expect(isValidIndianPhone('+91 70000 11111')).toBe(true);
      expect(isValidIndianPhone('+91 62222 33333')).toBe(true);

      // Invalid start digits or lengths
      expect(isValidIndianPhone('5123456789')).toBe(false);
      expect(isValidIndianPhone('12345')).toBe(false);
      expect(isValidIndianPhone('98450123456')).toBe(false);
    });
  });

  describe('Reservation Zod Schema', () => {
    const today = getTodayKolkata();
    const schema = createReservationSchema({ maxPartySize: 8 });

    it('accepts valid reservation data', () => {
      const valid = {
        name: 'Aarav Sharma',
        phone: '+91 98200 12345',
        guests: 4,
        date: today,
        time: '19:30',
        notes: 'Quiet table please',
      };
      const result = schema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe('9820012345');
      }
    });

    it('rejects short name (<2 chars) and long name (>60 chars)', () => {
      expect(schema.safeParse({ name: 'A', phone: '9820012345', guests: 2, date: today, time: '19:30' }).success).toBe(false);
      expect(schema.safeParse({ name: 'A'.repeat(61), phone: '9820012345', guests: 2, date: today, time: '19:30' }).success).toBe(false);
    });

    it('rejects guests out of bounds (0 or >maxPartySize)', () => {
      expect(schema.safeParse({ name: 'Rahul', phone: '9820012345', guests: 0, date: today, time: '19:30' }).success).toBe(false);
      expect(schema.safeParse({ name: 'Rahul', phone: '9820012345', guests: 9, date: today, time: '19:30' }).success).toBe(false);
    });

    it('rejects dates in the past and beyond 60 days', () => {
      const yesterday = addDaysToDate(today, -1);
      const day65 = addDaysToDate(today, 65);

      expect(schema.safeParse({ name: 'Rahul', phone: '9820012345', guests: 2, date: yesterday, time: '19:30' }).success).toBe(false);
      expect(schema.safeParse({ name: 'Rahul', phone: '9820012345', guests: 2, date: day65, time: '19:30' }).success).toBe(false);
    });

    it('rejects notes exceeding 300 characters', () => {
      expect(schema.safeParse({
        name: 'Rahul',
        phone: '9820012345',
        guests: 2,
        date: today,
        time: '19:30',
        notes: 'x'.repeat(301),
      }).success).toBe(false);
    });
  });

  describe('Settings Schema', () => {
    it('validates settings and requires closeTime > openTime', () => {
      const validSettings = {
        restaurantName: 'The Coastal Bistro',
        address: 'Indiranagar, Bangalore',
        contactPhone: '+91 98450 12345',
        openTime: '12:00',
        closeTime: '23:00',
        maxPartySize: 8,
      };
      expect(settingsSchema.safeParse(validSettings).success).toBe(true);

      const invalidHours = {
        ...validSettings,
        openTime: '22:00',
        closeTime: '12:00',
      };
      expect(settingsSchema.safeParse(invalidHours).success).toBe(false);
    });
  });
});
