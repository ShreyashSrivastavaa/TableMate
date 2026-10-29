import React, { useState, useEffect, useMemo } from 'react';
import { repository } from '../../services/reservationRepository';
import { Search, Users, Phone, Calendar, Clock, History, X } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { formatFriendlyDate, formatFriendlyTime } from '../../domain/time';

export default function CustomersView() {
  const [customers, setCustomers] = useState(() => repository.getCustomers());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    const unsubscribe = repository.subscribe(() => {
      setCustomers(repository.getCustomers());
    });
    return unsubscribe;
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Guest Directory</h2>
          <p className="text-sm text-slate-600 mt-1">
            De-duplicated customer profiles synthesized from reservation phone numbers.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by guest name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Customer Directory List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="mt-3 text-base font-semibold text-slate-900">No guests found</h4>
          <p className="mt-1 text-sm text-slate-500">
            Guest profiles will automatically appear as reservations are created.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredCustomers.map((c) => (
              <div
                key={c.phone}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 shrink-0">
                    {c.name ? c.name.charAt(0).toUpperCase() : 'G'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-base text-slate-900">{c.name}</h4>
                      {c.reservationCount > 1 && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {c.reservationCount} visits
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                      <Phone className="w-3.5 h-3.5" /> +91 {c.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                  {c.mostRecentReservation && (
                    <div className="text-right">
                      <span className="text-slate-400 block text-[11px]">Last Booking:</span>
                      <span className="font-medium text-slate-800">
                        {formatFriendlyDate(c.mostRecentReservation.date)} ({c.mostRecentReservation.time})
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedCustomer(c)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium inline-flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>History</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Reservation History Modal */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">+91 {selectedCustomer.phone}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                All Reservations ({selectedCustomer.allReservations.length})
              </h4>
              <div className="space-y-2">
                {selectedCustomer.allReservations.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">{r.reference}</span>
                        <span className="text-slate-400 font-normal">({r.source})</span>
                      </div>
                      <p className="text-slate-600 mt-1">
                        {formatFriendlyDate(r.date)} at {formatFriendlyTime(r.time)} &bull; {r.guests} guests
                      </p>
                      {r.notes && <p className="text-slate-500 italic mt-0.5">"{r.notes}"</p>}
                    </div>
                    <div>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
