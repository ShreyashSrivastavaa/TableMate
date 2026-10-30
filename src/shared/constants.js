export const DEFAULT_TABLES = [
  { id: 'T1', number: '1', capacity: 2, label: 'Table 1 (Window)' },
  { id: 'T2', number: '2', capacity: 2, label: 'Table 2 (Indoor Cozy)' },
  { id: 'T3', number: '3', capacity: 4, label: 'Table 3 (Main Dining)' },
  { id: 'T4', number: '4', capacity: 4, label: 'Table 4 (Main Dining)' },
  { id: 'T5', number: '5', capacity: 4, label: 'Table 5 (Courtyard Patio)' },
  { id: 'T6', number: '6', capacity: 6, label: 'Table 6 (Round Booth)' },
  { id: 'T7', number: '7', capacity: 8, label: 'Table 7 (Family Banquet)' },
];

export const DEFAULT_SETTINGS = {
  restaurantName: 'The Coastal Bistro',
  tagline: 'Fresh coastal flavours & seafood',
  address: '12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
  contactPhone: '+91 98450 12345',
  openTime: '12:00',
  closeTime: '23:00',
  maxPartySize: 8,
  slotIntervalMinutes: 30,
  diningDurationMinutes: 90,
  welcomeMessage: "Welcome to The Coastal Bistro's reservation desk. How many guests will be dining with us?",
  unknownInputMessage: "I couldn't quite understand that. Please reply with the requested detail, or click 'Switch to Booking Form'.",
  helpMessage: "You can tell me: group size (e.g. '4 guests'), date (e.g. 'tomorrow' or '2026-11-01'), and time (e.g. '7:30 pm'). Type 'form' to switch to our standard form.",
};

export const RESERVATION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

export const RESERVATION_SOURCE = {
  SAMPLE: 'sample',
  BOOKING_FORM: 'booking-form',
  CHAT_SIM: 'chat-sim',
};

export const TIMEZONE = 'Asia/Kolkata';
