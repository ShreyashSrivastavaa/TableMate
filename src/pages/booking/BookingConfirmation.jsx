import React from 'react';
import { CheckCircle2, Clock, Calendar, Users, MapPin, ArrowRight, RotateCcw } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { formatFriendlyDate, formatFriendlyTime } from '../../domain/time';

export default function BookingConfirmation({ reservation, restaurantSettings, onBookAnother }) {
  if (!reservation) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 max-w-lg mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="inline-block mb-3">
        <StatusBadge status={reservation.status} />
      </div>

      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
        Request Received
      </h2>
      <p className="text-sm font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg py-1 px-3 inline-block mt-2">
        Reference: {reservation.reference}
      </p>

      <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs sm:text-sm space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <span className="text-slate-500">Restaurant</span>
          <span className="font-semibold text-slate-900">{restaurantSettings.restaurantName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Guest Name</span>
          <span className="font-semibold text-slate-900">{reservation.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Party Size</span>
          <span className="font-semibold text-slate-900">{reservation.guests} guests</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Date</span>
          <span className="font-semibold text-slate-900">{formatFriendlyDate(reservation.date)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Time Window</span>
          <span className="font-semibold text-slate-900">{formatFriendlyTime(reservation.time)} (90-min stay)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Contact Phone</span>
          <span className="font-semibold text-slate-900">+91 {reservation.phone}</span>
        </div>
        {reservation.notes && (
          <div className="pt-2 border-t border-slate-200">
            <span className="text-slate-500 block text-xs">Special Requests:</span>
            <span className="text-slate-700 text-xs italic mt-0.5 block">"{reservation.notes}"</span>
          </div>
        )}
      </div>

      {/* Critical notice: Request received, not confirmed */}
      <div className="mt-4 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left">
        <strong>What happens next:</strong>
        <p className="mt-1 text-amber-800">
          Your request has been submitted to {restaurantSettings.restaurantName}. The restaurant host will review table availability and send confirmation.
        </p>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onBookAnother}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Book Another Table</span>
        </button>
        <a
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-sm"
        >
          <span>View on Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
