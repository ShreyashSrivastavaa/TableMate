import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  User,
  Phone,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
} from 'lucide-react';
import { repository } from '../../services/reservationRepository';
import { getAvailableSlotsForDate } from '../../domain/availability';
import { createReservationSchema } from '../../domain/validation';
import { getTodayKolkata, addDaysToDate, formatFriendlyDate, formatFriendlyTime } from '../../domain/time';
import { useToast } from '../../context/ToastContext';

export default function BookingForm({ restaurantSettings, onSuccess }) {
  const [step, setStep] = useState(1);
  const [tables, setTables] = useState(() => repository.getTables());
  const [reservations, setReservations] = useState(() => repository.list());
  const { showToast } = useToast();

  const today = getTodayKolkata();
  const maxDate = addDaysToDate(today, 60);

  const [formData, setFormData] = useState({
    guests: 2,
    date: today,
    time: '',
    name: '',
    phone: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = repository.subscribe(() => {
      setTables(repository.getTables());
      setReservations(repository.list());
    });
    return unsubscribe;
  }, []);

  // Compute available slots whenever date, guests, tables, or reservations change
  const availableSlots = useMemo(() => {
    return getAvailableSlotsForDate(
      formData.date,
      formData.guests,
      tables,
      reservations,
      restaurantSettings
    );
  }, [formData.date, formData.guests, tables, reservations, restaurantSettings]);

  // If currently selected time is no longer available in newly computed slots, reset it
  useEffect(() => {
    if (formData.time && !availableSlots.includes(formData.time)) {
      setFormData((prev) => ({ ...prev, time: '' }));
    }
  }, [availableSlots, formData.time]);

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
    const schema = createReservationSchema(restaurantSettings);
    const result = schema.safeParse(formData);

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setStep(3);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const created = repository.create({
        ...formData,
        source: 'booking-form',
      });
      showToast(`Reservation request received! Ref: ${created.reference}`, 'success');
      onSuccess(created);
    } catch (err) {
      showToast(err.message, 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-w-xl mx-auto transition-colors">
      {/* Step Indicator Header */}
      <div className="bg-slate-900 text-white p-5 border-b border-slate-800">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className={step >= 1 ? 'text-indigo-400 font-bold' : 'text-slate-500'}>
            1. Party & Time
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
        {/* Step 1: Party & Time Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Choose Party Size & Date</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Slots are updated in real-time based on current floor availability.
              </p>
            </div>

            {/* Guest Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Number of Guests
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {Array.from({ length: restaurantSettings.maxPartySize || 8 }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleFieldChange('guests', num)}
                    className={`py-2 text-sm font-bold rounded-lg border transition-all ${
                      formData.guests === num
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reservation Date
              </label>
              <input
                type="date"
                min={today}
                max={maxDate}
                value={formData.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Booking window: Today ({today}) to 60 days ahead ({maxDate}).
              </p>
            </div>

            {/* Time Slot Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Available Time Slots (30-min intervals, 90-min stay)
              </label>

              {availableSlots.length === 0 ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-semibold">No tables currently available</span>
                    <p className="mt-0.5">
                      All tables accommodating {formData.guests} guests are reserved on {formatFriendlyDate(formData.date)}. Please try a different party size or date.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
                  {availableSlots.map((slot) => {
                    const isSelected = formData.time === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleFieldChange('time', slot)}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {formatFriendlyTime(slot)}
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.time && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.time}</p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                disabled={!formData.time}
                onClick={handleStep1Next}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors shadow-sm"
              >
                <span>Continue to Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Guest Details */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Your Contact Details</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                We'll notify this mobile number regarding confirmation.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Priya Sundaram"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Indian Mobile Number *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="98450 12345"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full pl-12 pr-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Accepts 10 digits starting with 6, 7, 8, or 9.
              </p>
              {errors.phone && <p className="text-xs text-rose-600 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Special Requests / Dietary Notes (Optional)
              </label>
              <textarea
                rows="3"
                maxLength="300"
                placeholder="Allergies, high chair, window seating preference, etc."
                value={formData.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <span>Maximum 300 characters</span>
                <span>{formData.notes.length}/300</span>
              </div>
              {errors.notes && <p className="text-xs text-rose-600 mt-1">{errors.notes}</p>}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleStep2Next}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-sm"
              >
                <span>Review Reservation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review and Submit */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Review & Confirm Request</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Please double check your details before submitting to the restaurant.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 text-sm">
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Restaurant</span>
                <span className="font-semibold text-slate-900 dark:text-white">{restaurantSettings.restaurantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Party Size</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formData.guests} guests</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Date</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatFriendlyDate(formData.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Time Slot</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatFriendlyTime(formData.time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Guest Name</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Phone</span>
                <span className="font-semibold text-slate-900 dark:text-white">+91 {formData.phone}</span>
              </div>
              {formData.notes && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block">Notes:</span>
                  <span className="italic text-slate-700 dark:text-slate-300 mt-0.5 block">"{formData.notes}"</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs text-indigo-900 dark:text-indigo-200">
              <strong>Order of Operations:</strong> Submitting will lock your table and create a pending request (TM-XXXXXX). You will immediately receive a reference code.
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-md disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Reservation Request'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
