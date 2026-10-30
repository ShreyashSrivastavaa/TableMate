import { z } from 'zod';
import { getTodayKolkata, isDateInBookingWindow, timeToMinutes } from './time.js';

/**
 * Normalizes an Indian phone number string:
 * Removes spaces, dashes, parentheses, dots, leading +91 or 91 or 0
 * Returns 10 digits if valid, or original sanitized string
 */
export function normalizeIndianPhone(input) {
  if (!input || typeof input !== 'string') return '';
  // Strip all non-digit characters except maybe a leading +
  let cleaned = input.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  // Strip any remaining non-digit characters
  cleaned = cleaned.replace(/\D/g, '');
  return cleaned;
}

/**
 * Validates whether a phone number is a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)
 */
export function isValidIndianPhone(input) {
  const normalized = normalizeIndianPhone(input);
  return /^[6-9]\d{9}$/.test(normalized);
}

/**
 * Creates dynamic reservation schema parameterized with settings
 */
export function createReservationSchema(settings = { maxPartySize: 8 }) {
  const today = getTodayKolkata();

  return z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name cannot exceed 60 characters'),

    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .refine(
        (val) => isValidIndianPhone(val),
        { message: 'Enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)' }
      )
      .transform((val) => normalizeIndianPhone(val)),

    guests: z
      .coerce
      .number({ required_error: 'Party size is required' })
      .int('Number of guests must be a whole number')
      .min(1, 'At least 1 guest required')
      .max(settings.maxPartySize || 8, `Maximum party size is ${settings.maxPartySize || 8} guests`),

    date: z
      .string({ required_error: 'Date is required' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .refine((dateVal) => isDateInBookingWindow(dateVal, today), {
        message: 'Reservations can only be made between today and 60 days ahead',
      }),

    time: z
      .string({ required_error: 'Time is required' })
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format'),

    notes: z
      .string()
      .max(300, 'Special requests cannot exceed 300 characters')
      .optional()
      .default(''),
  });
}

/**
 * Schema for restaurant settings
 */
export const settingsSchema = z.object({
  restaurantName: z.string().trim().min(2, 'Restaurant name must be at least 2 characters').max(80),
  tagline: z.string().trim().max(120).optional(),
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(200),
  contactPhone: z.string().trim().min(8, 'Contact phone must be at least 8 characters'),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Open time must be HH:mm'),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Close time must be HH:mm'),
  maxPartySize: z.coerce.number().int().min(2, 'Max party size must be at least 2').max(20),
  slotIntervalMinutes: z.coerce.number().int().min(15).max(60).default(30),
  diningDurationMinutes: z.coerce.number().int().min(45).max(180).default(90),
  welcomeMessage: z.string().max(250).optional(),
  unknownInputMessage: z.string().max(250).optional(),
  helpMessage: z.string().max(300).optional(),
}).refine(
  (data) => timeToMinutes(data.closeTime) > timeToMinutes(data.openTime),
  {
    message: 'Closing time must be after opening time',
    path: ['closeTime'],
  }
);

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
export const MIN_OWNER_PASSWORD_LENGTH = 12;

export function validateOwnerPassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < MIN_OWNER_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Owner password must be at least ${MIN_OWNER_PASSWORD_LENGTH} characters long.`,
    };
  }
  return { valid: true };
}
