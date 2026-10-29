import React, { useState, useEffect } from 'react';
import { repository } from '../../services/reservationRepository';
import { getTableStatusList } from '../../domain/availability';
import { getTodayKolkata, getCurrentTimeKolkata, generateCandidateSlots, formatFriendlyTime } from '../../domain/time';
import { Grid, Users, Clock, CheckCircle2, XCircle } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

export default function TablesView() {
  const [reservations, setReservations] = useState(() => repository.list());
  const [tables, setTables] = useState(() => repository.getTables());
  const [settings, setSettings] = useState(() => repository.getSettings());
  const [selectedDate, setSelectedDate] = useState(() => getTodayKolkata());
  const [selectedTime, setSelectedTime] = useState('19:30');

  useEffect(() => {
    const unsubscribe = repository.subscribe(() => {
      setReservations(repository.list());
      setTables(repository.getTables());
      setSettings(repository.getSettings());
    });
    return unsubscribe;
  }, []);

  const candidateSlots = generateCandidateSlots(
    settings.openTime,
    settings.closeTime,
    settings.diningDurationMinutes || 90,
    settings.slotIntervalMinutes || 30
  );

  const tableStatusList = getTableStatusList(
    selectedDate,
    selectedTime,
    tables,
    reservations,
    settings.diningDurationMinutes || 90
  );

  const availableCount = tableStatusList.filter((t) => t.isAvailable).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Floor & Table Status</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
              simulated availability
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Check real-time table capacity and seating allocations for any date and time window.
          </p>
        </div>
      </div>

      {/* Date & Time Selector Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Select Time Slot</label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              {candidateSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {formatFriendlyTime(slot)} ({slot})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-700">{availableCount} Free Tables</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span className="text-slate-700">{tables.length - availableCount} Reserved / Occupied</span>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tableStatusList.map(({ table, isAvailable, currentReservation }) => (
          <div
            key={table.id}
            className={`rounded-xl border p-5 transition-all shadow-sm ${
              isAvailable
                ? 'bg-white border-slate-200 hover:border-indigo-300'
                : 'bg-slate-50 border-rose-200 ring-1 ring-rose-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500">ID: {table.id}</span>
                <h4 className="text-lg font-bold text-slate-900 mt-0.5">{table.label}</h4>
              </div>
              {isAvailable ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Free
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <XCircle className="w-3 h-3" /> Occupied
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
              <Users className="w-4 h-4 text-slate-400" />
              <span>Max Capacity: <strong className="text-slate-900">{table.capacity} guests</strong></span>
            </div>

            {currentReservation ? (
              <div className="mt-4 pt-3 border-t border-rose-100 text-xs">
                <span className="text-slate-500 block">Reserved By:</span>
                <p className="font-semibold text-slate-900 truncate mt-0.5">
                  {currentReservation.name} ({currentReservation.guests} guests)
                </p>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Slot: {currentReservation.time}</span>
                  <StatusBadge status={currentReservation.status} />
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 italic">
                Ready for assignment (90-min window)
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
