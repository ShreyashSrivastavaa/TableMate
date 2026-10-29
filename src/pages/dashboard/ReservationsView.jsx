import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Phone,
  Clock,
  Users,
  MessageSquare,
  X,
} from 'lucide-react';
import { repository } from '../../services/reservationRepository';
import { RESERVATION_STATUS } from '../../domain/constants';
import { canTransition, getAllowedNextStatuses } from '../../domain/statusTransitions';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../context/ToastContext';
import { formatFriendlyDate, formatFriendlyTime } from '../../domain/time';

export default function ReservationsView() {
  const [reservations, setReservations] = useState(() => repository.list());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { reservation, newStatus, title, message }
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = repository.subscribe(() => {
      setReservations(repository.list());
    });
    return unsubscribe;
  }, []);

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesRef = r.reference.toLowerCase().includes(q);
        const matchesPhone = r.phone.includes(q);
        if (!matchesName && !matchesRef && !matchesPhone) return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (r.status !== selectedStatus) return false;
      }

      // Date filter
      if (selectedDate) {
        if (r.date !== selectedDate) return false;
      }

      return true;
    });
  }, [reservations, searchQuery, selectedStatus, selectedDate]);

  const handleStatusChangeClick = (reservation, newStatus) => {
    if (!canTransition(reservation.status, newStatus)) return;

    let title = 'Confirm Status Change';
    let message = `Are you sure you want to transition reservation ${reservation.reference} to ${newStatus}?`;

    if (newStatus === RESERVATION_STATUS.CONFIRMED) {
      title = 'Confirm Reservation';
      message = `Confirm reservation ${reservation.reference} for ${reservation.name} (${reservation.guests} guests at ${reservation.time})?`;
    } else if (newStatus === RESERVATION_STATUS.REJECTED) {
      title = 'Reject Reservation';
      message = `Reject reservation request ${reservation.reference}? The allocated table will be released.`;
    } else if (newStatus === RESERVATION_STATUS.CANCELLED) {
      title = 'Cancel Reservation';
      message = `Cancel reservation ${reservation.reference}? The allocated table will be released.`;
    }

    setConfirmAction({
      reservation,
      newStatus,
      title,
      message,
    });
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    try {
      const updated = repository.updateStatus(
        confirmAction.reservation.id,
        confirmAction.newStatus,
        'Updated via Restaurant Dashboard'
      );
      showToast(
        `Reservation ${updated.reference} marked as ${updated.status}`,
        updated.status === RESERVATION_STATUS.CONFIRMED ? 'success' : 'info'
      );
      // update detail modal if currently open
      if (detailItem && detailItem.id === updated.id) {
        setDetailItem(updated);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setConfirmAction(null);
    }
  };

  const statusTabs = [
    { id: 'ALL', label: 'All Bookings', count: reservations.length },
    {
      id: RESERVATION_STATUS.PENDING,
      label: 'Pending',
      count: reservations.filter((r) => r.status === RESERVATION_STATUS.PENDING).length,
    },
    {
      id: RESERVATION_STATUS.CONFIRMED,
      label: 'Confirmed',
      count: reservations.filter((r) => r.status === RESERVATION_STATUS.CONFIRMED).length,
    },
    {
      id: RESERVATION_STATUS.CANCELLED,
      label: 'Cancelled',
      count: reservations.filter((r) => r.status === RESERVATION_STATUS.CANCELLED).length,
    },
    {
      id: RESERVATION_STATUS.REJECTED,
      label: 'Rejected',
      count: reservations.filter((r) => r.status === RESERVATION_STATUS.REJECTED).length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reservations</h2>
          <p className="text-sm text-slate-600 mt-1">
            Search, filter, and manage guest bookings and status changes.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedStatus === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStatus === tab.id ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search and Date Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by guest name, phone, or TM-XXXXXX reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-700"
            />
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="px-2.5 py-2 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              title="Clear date filter"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Reservations Display: Desktop Table / Mobile Cards */}
      {filteredReservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="mt-3 text-base font-semibold text-slate-900">No reservations found</h4>
          <p className="mt-1 text-sm text-slate-500">
            Try adjusting your search query, status tab, or date filter.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Reference</th>
                  <th className="px-4 py-3.5">Guest</th>
                  <th className="px-4 py-3.5">Date & Time</th>
                  <th className="px-4 py-3.5">Party / Table</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReservations.map((r) => {
                  const allowed = getAllowedNextStatuses(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-800">
                        {r.reference}
                        <div className="text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                          {r.source}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900">{r.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> +91 {r.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-900 font-medium">{formatFriendlyDate(r.date)}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-indigo-500" /> {formatFriendlyTime(r.time)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-900 font-medium">{r.guests} guests</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {r.tableId ? `Table ${r.tableId}` : <span className="text-slate-400">Released</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setDetailItem(r)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          Details
                        </button>

                        {allowed.includes(RESERVATION_STATUS.CONFIRMED) && (
                          <button
                            onClick={() => handleStatusChangeClick(r, RESERVATION_STATUS.CONFIRMED)}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
                          >
                            Confirm
                          </button>
                        )}

                        {allowed.includes(RESERVATION_STATUS.REJECTED) && (
                          <button
                            onClick={() => handleStatusChangeClick(r, RESERVATION_STATUS.REJECTED)}
                            className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                          >
                            Reject
                          </button>
                        )}

                        {allowed.includes(RESERVATION_STATUS.CANCELLED) && (
                          <button
                            onClick={() => handleStatusChangeClick(r, RESERVATION_STATUS.CANCELLED)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredReservations.map((r) => {
              const allowed = getAllowedNextStatuses(r.status);
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {r.reference}
                      </span>
                      <h4 className="text-base font-semibold text-slate-900 mt-0.5">{r.name}</h4>
                      <p className="text-xs text-slate-500">+91 {r.phone}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-500">Date & Time:</span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {r.date} @ {r.time}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Party / Table:</span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {r.guests} guests &bull; {r.tableId ? `Table ${r.tableId}` : 'None'}
                      </p>
                    </div>
                  </div>

                  {r.notes && (
                    <p className="text-xs text-slate-600 italic bg-amber-50/60 p-2 rounded border border-amber-100">
                      "{r.notes}"
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => setDetailItem(r)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      View Details
                    </button>
                    {allowed.includes(RESERVATION_STATUS.CONFIRMED) && (
                      <button
                        onClick={() => handleStatusChangeClick(r, RESERVATION_STATUS.CONFIRMED)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                      >
                        Confirm
                      </button>
                    )}
                    {allowed.includes(RESERVATION_STATUS.REJECTED) && (
                      <button
                        onClick={() => handleStatusChangeClick(r, RESERVATION_STATUS.REJECTED)}
                        className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 rounded-lg border border-rose-200"
                      >
                        Reject
                      </button>
                    )}
                    {allowed.includes(RESERVATION_STATUS.CANCELLED) && (
                      <button
                        onClick={() => handleStatusChangeClick(r, RESERVATION_STATUS.CANCELLED)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-slate-600">
                  {detailItem.reference}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{detailItem.name}</h3>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={detailItem.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-500">Date & Time</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {formatFriendlyDate(detailItem.date)} at {formatFriendlyTime(detailItem.time)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Party Size</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {detailItem.guests} guests
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Contact Phone</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    +91 {detailItem.phone}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Assigned Table</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {detailItem.tableId ? `Table ${detailItem.tableId}` : 'None (released)'}
                  </p>
                </div>
              </div>

              {detailItem.notes && (
                <div>
                  <span className="text-xs font-semibold text-slate-700">Special Notes / Dietary:</span>
                  <p className="mt-1 text-xs text-slate-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    {detailItem.notes}
                  </p>
                </div>
              )}

              {/* Status transition history */}
              <div>
                <span className="text-xs font-semibold text-slate-700">Status History Audit Log:</span>
                <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                  {detailItem.statusHistory.map((h, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-medium text-slate-900">
                          {h.from ? `${h.from} → ${h.to}` : `Created as ${h.to}`}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {h.reason && <p className="text-slate-500 text-[11px] mt-0.5">{h.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons in modal */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                {getAllowedNextStatuses(detailItem.status).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChangeClick(detailItem, st)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize ${
                      st === RESERVATION_STATUS.CONFIRMED
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : st === RESERVATION_STATUS.REJECTED
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Set to {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <ConfirmModal
          isOpen={true}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={`Yes, ${confirmAction.newStatus}`}
          cancelLabel="Cancel"
          isDestructive={
            confirmAction.newStatus === RESERVATION_STATUS.REJECTED ||
            confirmAction.newStatus === RESERVATION_STATUS.CANCELLED
          }
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
