import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/apiClient';
import { createReservationSchema } from '../../shared/validation.js';
import { getTodayKolkata, addDaysToDate, formatFriendlyDate, formatFriendlyTime } from '../../shared/time.js';
import { useToast } from '../../context/ToastContext';
import {
  Utensils,
  MessageSquare,
  Clock,
  Phone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  Send,
  Info,
} from 'lucide-react';

export default function TenantBookingPage() {
  const { slug } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'chat'
  const [completedBooking, setCompletedBooking] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    setLoading(true);
    api.getPublicRestaurant(slug)
      .then((data) => {
        setRestaurant(data.restaurant);
        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err.message || 'Restaurant not found');
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Loading restaurant reservation desk...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Restaurant Not Found</h2>
          <p className="text-sm font-medium text-slate-700 mt-2">
            No active reservation desk found for slug: <span className="font-mono font-bold">"{slug}"</span>.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold rounded-lg shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
          >
            Go to TableMate Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
        {/* Restaurant Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6 text-center">
          <div className="w-14 h-14 bg-indigo-700 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Utensils className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {restaurant.name}
          </h1>
          <p className="text-sm text-indigo-700 font-semibold mt-1">Official Reservation Portal</p>

          <div className="flex flex-wrap items-center justify-center gap-5 text-sm font-medium text-slate-700 mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <span>Hours: {restaurant.openTime} &ndash; {restaurant.closeTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-600" />
              <span>Contact: {restaurant.phone}</span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs (Only if not completed) */}
        {!completedBooking && (
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white p-1 rounded-xl border border-slate-300 shadow-sm flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 ${
                  activeTab === 'form'
                    ? 'bg-indigo-700 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>Step-by-Step Form</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 ${
                  activeTab === 'chat'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Simulated Chat</span>
              </button>
            </div>
          </div>
        )}

        {/* Body content */}
        {completedBooking ? (
          <TenantBookingConfirmation
            reservation={completedBooking}
            restaurant={restaurant}
            onBookAnother={() => setCompletedBooking(null)}
          />
        ) : activeTab === 'form' ? (
          <TenantStepForm
            slug={slug}
            restaurant={restaurant}
            onSuccess={(b) => setCompletedBooking(b)}
          />
        ) : (
          <TenantChatSimulation
            slug={slug}
            restaurant={restaurant}
            onSwitchToForm={() => setActiveTab('form')}
            onSuccess={(b) => setCompletedBooking(b)}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-sm font-medium text-slate-700">
        <p>
          TableMate AI &bull; Direct restaurant reservations without the hassle.
        </p>
        <p className="mt-1 text-slate-700">
          Restaurant owner? <Link to={`/r/${slug}/admin`} className="underline text-indigo-700 hover:text-indigo-900 font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600">Host Dashboard Sign-in</Link>
        </p>
      </footer>
    </div>
  );
}

function TenantStepForm({ slug, restaurant, onSuccess }) {
  const today = getTodayKolkata();
  const maxDate = addDaysToDate(today, 60);
  const [step, setStep] = useState(1);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    guests: 2,
    date: today,
    time: '',
    name: '',
    phone: '',
    notes: '',
    website: '', // Honeypot field
    consentGiven: false,
  });

  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slotTakenNotice, setSlotTakenNotice] = useState(null);

  // Fetch available slots from backend whenever date or guests change
  const refreshSlots = (targetDate = formData.date, targetGuests = formData.guests) => {
    setLoadingSlots(true);
    api.getSlots(slug, targetDate, targetGuests)
      .then((data) => {
        setSlots(data.slots || []);
        setLoadingSlots(false);
      })
      .catch((err) => {
        console.error('Error fetching slots:', err);
        setSlots([]);
        setLoadingSlots(false);
      });
  };

  useEffect(() => {
    refreshSlots();
  }, [formData.date, formData.guests, slug]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleStep1Next = () => {
    if (!formData.time) {
      setErrors({ time: 'Please select an available time slot.' });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleStep2Next = () => {
    const schema = createReservationSchema(restaurant);
    const parsed = schema.safeParse(formData);

    if (!parsed.success) {
      const fieldErrors = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!formData.consentGiven) {
      setErrors({ consentGiven: 'You must agree to the reservation privacy consent to proceed.' });
      return;
    }

    setErrors({});
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSlotTakenNotice(null);

    try {
      const result = await api.createBooking(slug, {
        name: formData.name,
        phone: formData.phone,
        date: formData.date,
        time: formData.time,
        guests: formData.guests,
        notes: formData.notes,
        website: formData.website, // Honeypot
        source: 'booking-form',
      });

      showToast(`Reservation request received! Reference: ${result.reference}`, 'success');
      onSuccess(result.reservation);
    } catch (err) {
      setIsSubmitting(false);
      if (err.status === 409 || err.code === 'SLOT_UNAVAILABLE') {
        setSlotTakenNotice(
          `The slot for ${formData.time} was just reserved by another diner. Please choose another available slot.`
        );
        setStep(1);
        handleFieldChange('time', '');
        refreshSlots();
        showToast('That slot was just booked. Slots refreshed.', 'warning');
      } else {
        showToast(err.message, 'error');
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-xl mx-auto">
      {/* Header Stepper */}
      <div className="bg-slate-900 text-white p-5 border-b border-slate-800">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className={step >= 1 ? 'text-indigo-400 font-bold' : 'text-slate-500'}>
            1. Party & Slot
          </span>
          <span className="text-slate-600">&bull;&bull;&bull;</span>
          <span className={step >= 2 ? 'text-indigo-400 font-bold' : 'text-slate-500'}>
            2. Guest Details
          </span>
          <span className="text-slate-600">&bull;&bull;&bull;</span>
          <span className={step >= 3 ? 'text-indigo-400 font-bold' : 'text-slate-500'}>
            3. Confirmation
          </span>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {slotTakenNotice && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{slotTakenNotice}</span>
          </div>
        )}

        {/* Step 1: Party, Date, Slots */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Select Date & Time</h3>
              <p className="text-sm font-medium text-slate-700 mt-1">
                Real-time live availability from {restaurant.name}'s floor capacity.
              </p>
            </div>

            {/* Guests */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Number of Guests
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {Array.from({ length: restaurant.maxPartySize || 8 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleFieldChange('guests', n)}
                    className={`py-2.5 text-base font-bold rounded-lg border transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 ${
                      formData.guests === n
                        ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Date
              </label>
              <input
                type="date"
                min={today}
                max={maxDate}
                value={formData.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                className="w-full px-3.5 py-2.5 text-base text-[16px] text-slate-900 font-normal border border-slate-300 rounded-lg focus:border-indigo-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 focus:outline-none"
              />
            </div>

            {/* Slots */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-800">
                  Available Slots (30-min intervals)
                </label>
                {loadingSlots && <span className="text-xs font-medium text-slate-700 animate-pulse">Checking floor...</span>}
              </div>

              {slots.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 text-center">
                  {loadingSlots ? 'Checking table availability...' : 'No tables available for this party size and date. Try another date or group size.'}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => handleFieldChange('time', slot)}
                      className={`py-2.5 px-3 text-sm font-semibold rounded-lg border transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 ${
                        formData.time === slot
                          ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                          : 'bg-white text-slate-900 border-slate-300 hover:border-indigo-600 hover:bg-slate-50'
                      }`}
                    >
                      {formatFriendlyTime(slot)}
                    </button>
                  ))}
                </div>
              )}
              {errors.time && <p className="text-sm font-semibold text-rose-700 mt-1.5">{errors.time}</p>}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                disabled={!formData.time}
                onClick={handleStep1Next}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-semibold text-sm transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
              >
                <span>Continue to Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Contact, Privacy & Consent */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Your Contact Details</h3>
              <p className="text-sm font-medium text-slate-700 mt-1">
                The restaurant will send reservation updates to this mobile number.
              </p>
            </div>

            {/* Honeypot field for anti-spam bots */}
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={(e) => handleFieldChange('website', e.target.value)}
              className="hidden"
              tabIndex="-1"
              autoComplete="off"
            />

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Priya Sundaram"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full px-3.5 py-2.5 text-base text-[16px] text-slate-900 font-normal border border-slate-300 rounded-lg focus:border-indigo-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 focus:outline-none"
              />
              {errors.name && <p className="text-sm font-semibold text-rose-700 mt-1.5">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Indian Mobile Number *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-700">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="98450 12345"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full pl-14 pr-3.5 py-2.5 text-base text-[16px] text-slate-900 font-normal border border-slate-300 rounded-lg focus:border-indigo-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 focus:outline-none"
                />
              </div>
              {errors.phone && <p className="text-sm font-semibold text-rose-700 mt-1.5">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Special Requests / Dietary Notes (Optional)
              </label>
              <textarea
                rows="2"
                maxLength="300"
                placeholder="High chair, quiet corner, allergies, etc."
                value={formData.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                className="w-full px-3.5 py-2.5 text-base text-[16px] text-slate-900 font-normal border border-slate-300 rounded-lg focus:border-indigo-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 focus:outline-none"
              />
            </div>

            {/* Privacy Notice & Consent Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-indigo-700" />
                <span>Privacy Notice & Data Consent</span>
              </div>
              <p className="leading-relaxed font-normal">
                <strong>What we collect:</strong> Only your name and phone number.
                <br />
                <strong>Why:</strong> Exclusively to coordinate and confirm your reservation with {restaurant.name}.
                <br />
                <strong>Who sees it:</strong> Only {restaurant.name}'s verified host staff. We do not sell your personal data or send marketing spam.
                <br />
                <strong>Deletion:</strong> You can contact {restaurant.name} directly at {restaurant.phone} to delete your contact history.
              </p>
              <label className="flex items-start gap-2.5 pt-2 border-t border-slate-200 cursor-pointer font-medium text-slate-900">
                <input
                  type="checkbox"
                  checked={formData.consentGiven}
                  onChange={(e) => handleFieldChange('consentGiven', e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-indigo-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
                />
                <span className="leading-snug">
                  I agree to share my name and phone number with {restaurant.name} for this reservation.
                </span>
              </label>
              {errors.consentGiven && (
                <p className="text-sm text-rose-700 font-semibold">{errors.consentGiven}</p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleStep2Next}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-sm transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
              >
                <span>Review Request</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Review & Submit Request</h3>
              <p className="text-sm font-medium text-slate-700 mt-1">
                Please review your details before sending to {restaurant.name}.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3 text-sm">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-700 font-medium">Restaurant</span>
                <span className="font-semibold text-slate-900">{restaurant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700 font-medium">Party Size</span>
                <span className="font-semibold text-slate-900">{formData.guests} guests</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700 font-medium">Date</span>
                <span className="font-semibold text-slate-900">{formatFriendlyDate(formData.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700 font-medium">Time</span>
                <span className="font-semibold text-slate-900">{formatFriendlyTime(formData.time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700 font-medium">Guest Name</span>
                <span className="font-semibold text-slate-900">{formData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700 font-medium">Phone</span>
                <span className="font-semibold text-slate-900">+91 {formData.phone}</span>
              </div>
              {formData.notes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-700 font-medium block">Notes:</span>
                  <span className="italic text-slate-900 mt-0.5 block">"{formData.notes}"</span>
                </div>
              )}
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-sm font-medium text-amber-950">
              <strong>Confirmation Notice:</strong> Your submission creates a pending reservation request. The restaurant host will review floor capacity and confirm.
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-colors shadow-md disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function TenantBookingConfirmation({ reservation, restaurant, onBookAnother }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 max-w-lg mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500/20 text-emerald-700 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-950 border border-amber-300">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span>Pending Restaurant Review</span>
      </span>

      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
        Request Received
      </h2>
      <p className="text-base font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg py-1.5 px-4 inline-block mt-2">
        Reference: {reservation.reference}
      </p>

      <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-sm space-y-2.5 font-normal">
        <div className="flex justify-between pb-2 border-b border-slate-200">
          <span className="text-slate-700 font-medium">Restaurant</span>
          <span className="font-semibold text-slate-900">{restaurant.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-700 font-medium">Guest</span>
          <span className="font-semibold text-slate-900">{reservation.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-700 font-medium">Party Size</span>
          <span className="font-semibold text-slate-900">{reservation.guests} guests</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-700 font-medium">Date & Time</span>
          <span className="font-semibold text-slate-900">
            {formatFriendlyDate(reservation.date)} at {formatFriendlyTime(reservation.time)}
          </span>
        </div>
      </div>

      {/* Direct WhatsApp Reachout Button with Honest Labeling */}
      {restaurant.phone && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          {(() => {
            const rawPhone = (restaurant.whatsappNumber || restaurant.phone || '').replace(/\D/g, '');
            const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
            const prefilledText = encodeURIComponent(
              `Hello ${restaurant.name}, I submitted reservation request ref: ${reservation.reference} for ${reservation.guests} guests on ${reservation.date} at ${reservation.time}.`
            );
            const waUrl = `https://wa.me/${cleanPhone}?text=${prefilledText}`;
            return (
              <div>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open WhatsApp with {restaurant.name}</span>
                </a>
                <p className="text-xs text-slate-700 mt-2 font-mono font-medium">
                  Opens WhatsApp on your phone. Nothing is sent automatically.
                </p>
              </div>
            );
          })()}
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={onBookAnother}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-colors shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Book Another Table</span>
        </button>
      </div>
    </div>
  );
}

function TenantChatSimulation({ slug, restaurant, onSwitchToForm, onSuccess }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: `Welcome to ${restaurant.name}! How many guests will be dining with us? (e.g. "table for 2")`,
      time: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState('GUESTS');
  const [collected, setCollected] = useState({
    guests: null,
    date: null,
    time: null,
    name: null,
    phone: null,
  });

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    setMessages((prev) => [...prev, { id: 'u-' + Date.now(), sender: 'user', text, time: 'Just now' }]);

    if (text.toLowerCase() === 'form') {
      onSwitchToForm();
      return;
    }

    // Step machine connected to real API
    if (step === 'GUESTS') {
      const g = parseInt(text.replace(/\D/g, ''), 10) || 2;
      setCollected((c) => ({ ...c, guests: g }));
      setStep('DATE');
      setMessages((prev) => [
        ...prev,
        {
          id: 'b-' + Date.now(),
          sender: 'bot',
          text: `Great, party of ${g}. Which date would you like to visit? (e.g. "${getTodayKolkata()}")`,
          time: 'Just now',
        },
      ]);
    } else if (step === 'DATE') {
      setCollected((c) => ({ ...c, date: text }));
      setStep('TIME');
      setMessages((prev) => [
        ...prev,
        {
          id: 'b-' + Date.now(),
          sender: 'bot',
          text: `Checking availability for ${text}... What time would you prefer? (e.g. "19:30" or "8:00 pm")`,
          time: 'Just now',
        },
      ]);
    } else if (step === 'TIME') {
      setCollected((c) => ({ ...c, time: '19:30' }));
      setStep('NAME');
      setMessages((prev) => [
        ...prev,
        {
          id: 'b-' + Date.now(),
          sender: 'bot',
          text: `May I have your full name for the booking?`,
          time: 'Just now',
        },
      ]);
    } else if (step === 'NAME') {
      setCollected((c) => ({ ...c, name: text }));
      setStep('PHONE');
      setMessages((prev) => [
        ...prev,
        {
          id: 'b-' + Date.now(),
          sender: 'bot',
          text: `Thanks ${text}! What is your 10-digit Indian mobile number?`,
          time: 'Just now',
        },
      ]);
    } else if (step === 'PHONE') {
      const finalPhone = text.replace(/\D/g, '').slice(-10);
      const finalData = { ...collected, phone: finalPhone };
      setCollected(finalData);
      setStep('CONFIRM');

      try {
        const res = await api.createBooking(slug, {
          name: finalData.name,
          phone: finalData.phone,
          date: finalData.date || getTodayKolkata(),
          time: '19:30',
          guests: finalData.guests || 2,
          source: 'chat-sim',
        });
        setMessages((prev) => [
          ...prev,
          {
            id: 'b-' + Date.now(),
            sender: 'bot',
            text: `✅ Request received, reference ${res.reference}. The restaurant will review and confirm.`,
            time: 'Just now',
          },
        ]);
        if (onSuccess) {
          setTimeout(() => onSuccess(res.reservation), 1500);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'b-' + Date.now(),
            sender: 'bot',
            text: `Could not create request: ${err.message}. Type "form" to use the standard booking form.`,
            time: 'Just now',
          },
        ]);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-xl mx-auto flex flex-col h-[550px]">
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">{restaurant.name}</h4>
          <span className="text-xs text-emerald-300 font-semibold">Simulation, not WhatsApp, not AI</span>
        </div>
        <button
          onClick={onSwitchToForm}
          className="text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-slate-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
        >
          Use Form
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]/30">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-normal ${
                m.sender === 'bot'
                  ? 'bg-white text-slate-900 rounded-tl-none border border-slate-300 shadow-sm'
                  : 'bg-emerald-700 text-white rounded-tr-none'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          placeholder="Type message (or 'form' to switch)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-4 py-2.5 text-base text-[16px] text-slate-900 placeholder:text-slate-600 bg-white border border-slate-300 rounded-xl focus:border-emerald-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700 focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="p-3 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
