import {
  getTodayKolkata,
  addDaysToDate,
  formatFriendlyDate,
  formatFriendlyTime,
  timeToMinutes,
  minutesToTime,
} from './time';
import { normalizeIndianPhone, isValidIndianPhone } from './validation';

const NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  single: 1,
  couple: 2,
  pair: 2,
};

/**
 * Extracts number of guests from raw string
 */
export function parseGuestsInput(input, maxPartySize = 8) {
  if (!input || typeof input !== 'string') return null;
  const lower = input.toLowerCase().trim();

  // Check number words
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      if (num >= 1 && num <= maxPartySize) return num;
    }
  }

  // Check digits e.g. "4", "table for 4", "party of 2", "3 pax", "2 ppl"
  const digitMatch = lower.match(/\b(\d{1,2})\b/);
  if (digitMatch) {
    const val = parseInt(digitMatch[1], 10);
    if (val >= 1 && val <= maxPartySize) return val;
  }

  return null;
}

/**
 * Parses date inputs like "today", "tonight", "tomorrow", "day after tomorrow",
 * weekday names ("this saturday", "friday"), or formatted dates "YYYY-MM-DD"
 */
export function parseDateInput(input, today = getTodayKolkata()) {
  if (!input || typeof input !== 'string') return null;
  const lower = input.toLowerCase().trim();

  if (lower === 'today' || lower === 'tonight') {
    return today;
  }

  if (lower === 'tomorrow' || lower === 'tmrw') {
    return addDaysToDate(today, 1);
  }

  if (lower === 'day after tomorrow') {
    return addDaysToDate(today, 2);
  }

  // Exact YYYY-MM-DD
  const isoMatch = lower.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const candidate = isoMatch[0];
    if (candidate >= today) return candidate;
    return null;
  }

  // Day of week e.g. "friday", "next saturday"
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const matchedDayIndex = weekdays.findIndex((w) => lower.includes(w));
  if (matchedDayIndex !== -1) {
    const [y, m, d] = today.split('-').map(Number);
    const currentDate = new Date(y, m - 1, d);
    const currentDay = currentDate.getDay();
    let diff = matchedDayIndex - currentDay;
    if (diff <= 0) diff += 7; // next occurrence
    return addDaysToDate(today, diff);
  }

  return null;
}

/**
 * Parses time expressions like "7 pm", "7:30pm", "19:30", "8pm", "8 o'clock"
 * Aligns into 30-minute interval "HH:mm"
 */
export function parseTimeInput(input) {
  if (!input || typeof input !== 'string') return null;
  const lower = input.toLowerCase().trim();

  // Pattern for 12-hour: e.g. "7 pm", "7:30 pm", "12:30pm", "8:00 am"
  const twelveHourMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (twelveHourMatch) {
    let hours = parseInt(twelveHourMatch[1], 10);
    const minutes = twelveHourMatch[2] ? parseInt(twelveHourMatch[2], 10) : 0;
    const period = twelveHourMatch[3];

    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    // Snap minutes to nearest 30 (0 or 30)
    const snappedMin = minutes < 15 ? 0 : minutes < 45 ? 30 : 60;
    const totalMin = hours * 60 + snappedMin;
    return minutesToTime(totalMin % 1440);
  }

  // Pattern for 24-hour: e.g. "19:30", "13:00", "20:00"
  const twentyFourMatch = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (twentyFourMatch) {
    const hours = parseInt(twentyFourMatch[1], 10);
    const minutes = parseInt(twentyFourMatch[2], 10);
    const snappedMin = minutes < 15 ? 0 : minutes < 45 ? 30 : 60;
    const totalMin = hours * 60 + snappedMin;
    return minutesToTime(totalMin % 1440);
  }

  // Simple hour without am/pm, e.g. "at 7" -> restaurant defaults usually evening (19:00)
  const soloHourMatch = lower.match(/(?:at|around)?\s*\b(\d{1,2})\b(?:\s*o'?clock)?/);
  if (soloHourMatch) {
    let h = parseInt(soloHourMatch[1], 10);
    if (h >= 1 && h <= 11) {
      h += 12; // Assume evening dinner time in context of restaurant
    }
    if (h >= 12 && h <= 23) {
      return `${String(h).padStart(2, '0')}:00`;
    }
  }

  return null;
}

/**
 * Checks if user said yes / confirm
 */
export function isAffirmative(input) {
  if (!input) return false;
  const cleaned = input.toLowerCase().trim();
  return ['yes', 'y', 'confirm', 'sure', 'proceed', 'correct', 'yep', 'yeah', 'ok', 'okay'].includes(cleaned);
}

/**
 * Checks if user said restart / edit
 */
export function isRestart(input) {
  if (!input) return false;
  const cleaned = input.toLowerCase().trim();
  return ['edit', 'change', 'restart', 'no', 'cancel', 'reset'].includes(cleaned);
}

export const CHAT_STEPS = {
  ASK_GUESTS: 'ASK_GUESTS',
  ASK_DATE: 'ASK_DATE',
  ASK_TIME: 'ASK_TIME',
  ASK_NAME: 'ASK_NAME',
  ASK_PHONE: 'ASK_PHONE',
  CONFIRM: 'CONFIRM',
  COMPLETED: 'COMPLETED',
};

/**
 * Initial state for a chat session
 */
export function getInitialChatState(settings = {}) {
  return {
    step: CHAT_STEPS.ASK_GUESTS,
    collected: {
      guests: null,
      date: null,
      time: null,
      name: null,
      phone: null,
      notes: '',
    },
    errorCount: 0,
    createdReservation: null,
  };
}

/**
 * Processes a single user message in the deterministic state machine
 */
export function handleChatMessage({
  message,
  state,
  settings,
  availableSlotsForDateFn, // (date, guests) -> string[]
  saveReservationFn, // (data) -> reservation
}) {
  const text = message.trim();
  const lower = text.toLowerCase();

  // Escape hatch to form
  if (lower === 'form' || lower.includes('booking form') || lower === 'switch to form') {
    return {
      newState: state,
      botReply: "Opening the standard booking form for you now...",
      action: 'REDIRECT_FORM',
    };
  }

  // Help request
  if (lower === 'help' || lower === '?') {
    return {
      newState: state,
      botReply: settings.helpMessage || "Tell me your group size (e.g. 2), date, and time. Or type 'form' to switch.",
      action: null,
    };
  }

  const { step, collected } = state;
  const maxPartySize = settings.maxPartySize || 8;

  switch (step) {
    case CHAT_STEPS.ASK_GUESTS: {
      const parsedGuests = parseGuestsInput(text, maxPartySize);
      if (!parsedGuests) {
        return {
          newState: { ...state, errorCount: state.errorCount + 1 },
          botReply: `Please enter the number of guests as a number between 1 and ${maxPartySize} (e.g. "2" or "table for 4"). Or type "form" to switch to our standard form.`,
          action: null,
        };
      }
      return {
        newState: {
          ...state,
          step: CHAT_STEPS.ASK_DATE,
          collected: { ...collected, guests: parsedGuests },
          errorCount: 0,
        },
        botReply: `Great, for ${parsedGuests} ${parsedGuests === 1 ? 'guest' : 'guests'}. Which date would you like to visit? (You can say "today", "tomorrow", or "YYYY-MM-DD")`,
        action: null,
      };
    }

    case CHAT_STEPS.ASK_DATE: {
      const parsedDate = parseDateInput(text);
      if (!parsedDate) {
        return {
          newState: { ...state, errorCount: state.errorCount + 1 },
          botReply: `I couldn't identify that date. Please try "today", "tomorrow", a day of the week like "Friday", or a date like "${getTodayKolkata()}".`,
          action: null,
        };
      }

      // Check slot availability for that date and party size
      const availableSlots = availableSlotsForDateFn(parsedDate, collected.guests);
      if (!availableSlots || availableSlots.length === 0) {
        return {
          newState: { ...state, errorCount: state.errorCount + 1 },
          botReply: `We're fully booked for ${collected.guests} guests on ${formatFriendlyDate(parsedDate)}. Would you like to check another date? (e.g. "tomorrow")`,
          action: null,
        };
      }

      // Show first 3-5 sample slots
      const sampleSlotList = availableSlots.slice(0, 5).map(formatFriendlyTime).join(', ');

      return {
        newState: {
          ...state,
          step: CHAT_STEPS.ASK_TIME,
          collected: { ...collected, date: parsedDate },
          errorCount: 0,
        },
        botReply: `Available on ${formatFriendlyDate(parsedDate)}! Here are some slots: ${sampleSlotList}. What time would you prefer? (e.g. "7:30 pm")`,
        action: null,
      };
    }

    case CHAT_STEPS.ASK_TIME: {
      const parsedTime = parseTimeInput(text);
      if (!parsedTime) {
        return {
          newState: { ...state, errorCount: state.errorCount + 1 },
          botReply: `Please specify a time like "7:30 pm", "8 pm", or "20:00".`,
          action: null,
        };
      }

      const availableSlots = availableSlotsForDateFn(collected.date, collected.guests);
      if (!availableSlots.includes(parsedTime)) {
        const suggestions = availableSlots.slice(0, 4).map(formatFriendlyTime).join(', ');
        return {
          newState: { ...state, errorCount: state.errorCount + 1 },
          botReply: `Sorry, ${formatFriendlyTime(parsedTime)} is not available on ${formatFriendlyDate(collected.date)}. Available slots include: ${suggestions}. Please choose one of these.`,
          action: null,
        };
      }

      return {
        newState: {
          ...state,
          step: CHAT_STEPS.ASK_NAME,
          collected: { ...collected, time: parsedTime },
          errorCount: 0,
        },
        botReply: `Table is available at ${formatFriendlyTime(parsedTime)}! May I have your full name for the reservation?`,
        action: null,
      };
    }

    case CHAT_STEPS.ASK_NAME: {
      if (text.length < 2 || text.length > 60) {
        return {
          newState: { ...state, errorCount: state.errorCount + 1 },
          botReply: `Please provide a name between 2 and 60 characters.`,
          action: null,
        };
      }

      return {
        newState: {
          ...state,
          step: CHAT_STEPS.ASK_PHONE,
          collected: { ...collected, name: text },
          errorCount: 0,
        },
        botReply: `Thanks, ${text}! What is your 10-digit Indian mobile number? (e.g. 9876543210 or +91 98765 43210)`,
        action: null,
      };
    }

    case CHAT_STEPS.ASK_PHONE: {
      if (!isValidIndianPhone(text)) {
        return {
          newState: { ...state, errorCount: state.errorCount + 1 },
          botReply: `Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.`,
          action: null,
        };
      }

      const normalized = normalizeIndianPhone(text);
      const updatedCollected = { ...collected, phone: normalized };

      const summaryText =
        `📋 Please confirm your reservation details:\n` +
        `• Name: ${updatedCollected.name}\n` +
        `• Phone: +91 ${updatedCollected.phone}\n` +
        `• Party: ${updatedCollected.guests} ${updatedCollected.guests === 1 ? 'guest' : 'guests'}\n` +
        `• Date: ${formatFriendlyDate(updatedCollected.date)}\n` +
        `• Time: ${formatFriendlyTime(updatedCollected.time)}\n\n` +
        `Reply "YES" to submit this request, or "EDIT" to restart.`;

      return {
        newState: {
          ...state,
          step: CHAT_STEPS.CONFIRM,
          collected: updatedCollected,
          errorCount: 0,
        },
        botReply: summaryText,
        action: null,
      };
    }

    case CHAT_STEPS.CONFIRM: {
      if (isRestart(text)) {
        return {
          newState: getInitialChatState(settings),
          botReply: "Let's start over! How many guests will be dining with us?",
          action: null,
        };
      }

      if (!isAffirmative(text)) {
        return {
          newState: state,
          botReply: `Please reply "YES" to confirm your request, or "EDIT" to start over.`,
          action: null,
        };
      }

      // Order of operations: check availability, then create, then persist, then confirmation
      try {
        const created = saveReservationFn({
          ...collected,
          source: 'chat-sim',
        });

        return {
          newState: {
            ...state,
            step: CHAT_STEPS.COMPLETED,
            createdReservation: created,
          },
          botReply: `✅ Request received, reference ${created.reference}. The restaurant will review and confirm shortly. Thank you!`,
          action: 'BOOKING_CREATED',
        };
      } catch (err) {
        return {
          newState: state,
          botReply: `Could not complete booking: ${err.message}. Type "form" to try using our step-by-step form.`,
          action: 'ERROR',
        };
      }
    }

    case CHAT_STEPS.COMPLETED: {
      return {
        newState: state,
        botReply: `Your request (Ref: ${state.createdReservation?.reference}) is pending restaurant review. If you'd like to book another table, type "restart".`,
        action: null,
      };
    }

    default:
      return {
        newState: getInitialChatState(settings),
        botReply: settings.welcomeMessage || "Welcome! How many guests will be dining?",
        action: null,
      };
  }
}
