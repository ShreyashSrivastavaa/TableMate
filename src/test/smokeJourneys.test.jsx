import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { repository } from '../services/reservationRepository';
import { RESERVATION_STATUS } from '../domain/constants';

describe('End-to-End User Journeys (Smoke Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
    repository.reset();
  });

  it('renders landing page with product name, host login, and pilot inquiry', () => {
    render(<App initialEntries={['/']} />);

    expect(screen.getByText(/TABLEMATE AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Host Portal Access/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ REQUEST A PILOT/i)).toBeInTheDocument();
  });

  it('navigates to /book customer portal and shows request received after booking', async () => {
    render(<App initialEntries={['/book']} />);

    // Check customer portal renders
    expect(screen.getByRole('heading', { name: /The Coastal Bistro/i })).toBeInTheDocument();
    expect(screen.getByText(/Step-by-Step Form/i)).toBeInTheDocument();

    // In step 1: click on the first available time slot button
    const slotButtons = screen.getAllByRole('button').filter(
      (btn) => /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(btn.textContent.trim())
    );
    expect(slotButtons.length).toBeGreaterThan(0);
    fireEvent.click(slotButtons[0]);

    // Click continue to details
    const continueBtn = screen.getByRole('button', { name: /Continue to Details/i });
    fireEvent.click(continueBtn);

    // Step 2: Fill Name and Phone
    expect(await screen.findByText(/Your Contact Details/i)).toBeInTheDocument();
    const nameInput = screen.getByPlaceholderText(/e\.g\. Priya Sundaram/i);
    const phoneInput = screen.getByPlaceholderText(/98450 12345/i);

    fireEvent.change(nameInput, { target: { value: 'Aarav Pilot Test' } });
    fireEvent.change(phoneInput, { target: { value: '9845099999' } });

    // Review step
    const reviewBtn = screen.getByRole('button', { name: /Review Reservation/i });
    fireEvent.click(reviewBtn);

    expect(await screen.findByText(/Review & Confirm Request/i)).toBeInTheDocument();

    // Submit booking request
    const submitBtn = screen.getByRole('button', { name: /Submit Reservation Request/i });
    fireEvent.click(submitBtn);

    // Verify confirmation view: Must say "Request received", never "confirmed"
    expect(await screen.findByRole('heading', { name: /Request Received/i })).toBeInTheDocument();
    expect(screen.getByText(/The restaurant host will review/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Review/i)).toBeInTheDocument();
  });

  it('allows restaurant host to confirm a pending reservation in /reservations', async () => {
    const newRes = repository.create({
      name: 'Host Action Test',
      phone: '9845088888',
      guests: 2,
      date: '2026-11-20',
      time: '18:00',
      source: 'booking-form',
    });
    expect(newRes.status).toBe(RESERVATION_STATUS.PENDING);

    render(<App initialEntries={['/reservations']} />);

    // Both desktop table and mobile card render the name, so findAllByText matches both
    const matchedNames = await screen.findAllByText(/Host Action Test/i);
    expect(matchedNames.length).toBeGreaterThan(0);

    // Confirm buttons exist
    const confirmButtons = screen.getAllByRole('button', { name: /^Confirm$/i });
    expect(confirmButtons.length).toBeGreaterThan(0);
    fireEvent.click(confirmButtons[0]);

    // Modal popup confirmation
    const modalConfirmBtn = await screen.findByRole('button', { name: /Yes, confirmed/i });
    fireEvent.click(modalConfirmBtn);

    // Verify status updated in repository
    await waitFor(() => {
      const updated = repository.get(newRes.id);
      expect(updated.status).toBe(RESERVATION_STATUS.CONFIRMED);
    });
  });

  it('resets demo data cleanly via Reset Demo Data button', async () => {
    render(<App initialEntries={['/sandbox']} />);

    const resetButtons = screen.getAllByRole('button', { name: /Reset Demo Data/i });
    fireEvent.click(resetButtons[0]);

    const modalResetBtn = await screen.findByRole('button', { name: /Reset Data/i });
    fireEvent.click(modalResetBtn);

    expect(repository.list().length).toBeGreaterThanOrEqual(20);
  });
});
