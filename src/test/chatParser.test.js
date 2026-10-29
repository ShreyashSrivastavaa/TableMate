import { describe, it, expect, vi } from 'vitest';
import {
  parseGuestsInput,
  parseDateInput,
  parseTimeInput,
  handleChatMessage,
  getInitialChatState,
  CHAT_STEPS,
} from '../domain/chatParser';
import { getTodayKolkata, addDaysToDate } from '../domain/time';

describe('Chat Parser & Deterministic State Machine', () => {
  const today = getTodayKolkata();

  describe('Natural Input Parsers', () => {
    it('parses guests from words and numbers', () => {
      expect(parseGuestsInput('two')).toBe(2);
      expect(parseGuestsInput('Table for 4 please')).toBe(4);
      expect(parseGuestsInput('party of 6')).toBe(6);
      expect(parseGuestsInput('couple')).toBe(2);
      expect(parseGuestsInput('single')).toBe(1);
      expect(parseGuestsInput('15', 8)).toBeNull(); // Above maxPartySize
      expect(parseGuestsInput('hello')).toBeNull();
    });

    it('parses relative dates', () => {
      expect(parseDateInput('today', today)).toBe(today);
      expect(parseDateInput('tonight', today)).toBe(today);
      expect(parseDateInput('tomorrow', today)).toBe(addDaysToDate(today, 1));
      expect(parseDateInput('day after tomorrow', today)).toBe(addDaysToDate(today, 2));
    });

    it('parses various time formats and aligns to 30-min intervals', () => {
      expect(parseTimeInput('7 pm')).toBe('19:00');
      expect(parseTimeInput('7:30 pm')).toBe('19:30');
      expect(parseTimeInput('8:00 PM')).toBe('20:00');
      expect(parseTimeInput('19:30')).toBe('19:30');
      expect(parseTimeInput('1:30 pm')).toBe('13:30');
    });
  });

  describe('State Machine Flow & Error Recovery', () => {
    const settings = {
      maxPartySize: 8,
      welcomeMessage: 'Welcome to Coastal Bistro',
      helpMessage: 'Help details',
    };
    const mockAvailableSlotsFn = vi.fn().mockReturnValue(['19:00', '19:30', '20:00']);
    const mockSaveReservationFn = vi.fn().mockImplementation((data) => ({
      id: 'res-999',
      reference: 'TM-ABC123',
      ...data,
    }));

    it('escapes to form on typing "form"', () => {
      const state = getInitialChatState(settings);
      const res = handleChatMessage({
        message: 'form',
        state,
        settings,
        availableSlotsForDateFn: mockAvailableSlotsFn,
        saveReservationFn: mockSaveReservationFn,
      });
      expect(res.action).toBe('REDIRECT_FORM');
    });

    it('re-asks on invalid guest count and advances on valid input', () => {
      let state = getInitialChatState(settings);
      expect(state.step).toBe(CHAT_STEPS.ASK_GUESTS);

      // Invalid input
      const invalidRes = handleChatMessage({
        message: 'banana',
        state,
        settings,
        availableSlotsForDateFn: mockAvailableSlotsFn,
        saveReservationFn: mockSaveReservationFn,
      });
      expect(invalidRes.newState.step).toBe(CHAT_STEPS.ASK_GUESTS);
      expect(invalidRes.botReply).toMatch(/Please enter the number of guests/);

      // Valid input
      const validRes = handleChatMessage({
        message: 'table for 4',
        state,
        settings,
        availableSlotsForDateFn: mockAvailableSlotsFn,
        saveReservationFn: mockSaveReservationFn,
      });
      expect(validRes.newState.step).toBe(CHAT_STEPS.ASK_DATE);
      expect(validRes.newState.collected.guests).toBe(4);
    });

    it('completes the full flow: guests -> date -> time -> name -> phone -> confirm', () => {
      let state = getInitialChatState(settings);

      // 1. Guests
      let res = handleChatMessage({
        message: '2',
        state,
        settings,
        availableSlotsForDateFn: mockAvailableSlotsFn,
        saveReservationFn: mockSaveReservationFn,
      });
      state = res.newState;
      expect(state.step).toBe(CHAT_STEPS.ASK_DATE);

      // 2. Date
      res = handleChatMessage({
        message: 'tomorrow',
        state,
        settings,
        availableSlotsForDateFn: mockAvailableSlotsFn,
        saveReservationFn: mockSaveReservationFn,
      });
      state = res.newState;
      expect(state.step).toBe(CHAT_STEPS.ASK_TIME);

      // 3. Time
      res = handleChatMessage({
        message: '7:30 pm',
        state,
        settings,
        availableSlotsForDateFn: mockAvailableSlotsFn,
        saveReservationFn: mockSaveReservationFn,
      });
      state = res.newState;
      expect(state.step).toBe(CHAT_STEPS.ASK_NAME);

      // 4. Name
      res = handleChatMessage({
        message: 'Priya Sundaram',
        state,
        settings,
        availableSlotsForDateFn: mockAvailableSlotsFn,
        saveReservationFn: mockSaveReservationFn,
      });
      state = res.newState;
      expect(state.step).toBe(CHAT_STEPS.ASK_PHONE);

      // 5. Phone
      res = handleChatMessage({
        message: '+91 98450 12345',
        state,
        settings,
        availableSlotsForDateFn: mockAvailableSlotsFn,
        saveReservationFn: mockSaveReservationFn,
      });
      state = res.newState;
      expect(state.step).toBe(CHAT_STEPS.CONFIRM);
      expect(res.botReply).toMatch(/Please confirm your reservation details/);

      // 6. Confirm
      res = handleChatMessage({
        message: 'yes',
        state,
        settings,
        availableSlotsForDateFn: mockAvailableSlotsFn,
        saveReservationFn: mockSaveReservationFn,
      });
      state = res.newState;
      expect(state.step).toBe(CHAT_STEPS.COMPLETED);
      expect(mockSaveReservationFn).toHaveBeenCalledTimes(1);
      expect(res.botReply).toMatch(/Request received, reference TM-ABC123/);
    });
  });
});
