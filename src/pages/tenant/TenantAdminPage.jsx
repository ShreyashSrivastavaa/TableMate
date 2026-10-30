import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import { formatFriendlyDate, formatFriendlyTime } from '../../shared/time.js';
import { RESERVATION_STATUS } from '../../shared/constants.js';
import { canTransition } from '../../shared/statusTransitions.js';
import {
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  LogOut,
  ExternalLink,
  MessageCircle,
  Eye,
  Grid,
  Settings,
  RefreshCw,
  X,
  Phone,
  Sparkles,
  Lock,
  Download,
} from 'lucide-react';

export default function TenantAdminPage() {
  const { slug } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check current session
  useEffect(() => {
    setAuthChecking(true);
    api.getMe(slug)
      .then((data) => {
        setRestaurant(data.restaurant);
        setIsAuthenticated(true);
        setAuthChecking(false);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setAuthChecking(false);
      });
  }, [slug]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center text-white font-mono text-xs">
          <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-white/50 uppercase tracking-widest">Verifying host credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <OwnerLoginForm
        slug={slug}
        onLoginSuccess={(rest) => {
          setRestaurant(rest);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <OwnerDashboard
      slug={slug}
      restaurant={restaurant}
      onLogout={() => setIsAuthenticated(false)}
    />
  );
}

function OwnerLoginForm({ slug, onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.login(slug, password);
      showToast('Logged in successfully', 'success');
      onLoginSuccess(data.restaurant);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center py-12 px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-left">
        <div className="border border-white/30 bg-[#101010] p-8">
          <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-6">
            <div>
              <span className="text-xs uppercase font-mono font-semibold tracking-widest text-[#ff2936]">Host Portal</span>
              <h2 className="text-xl font-editorial italic text-white mt-1">
                {slug.toUpperCase()}
              </h2>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff2936]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-950/60 border border-[#ff2936] text-[#ff2936] text-sm font-mono font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm uppercase tracking-wider font-mono font-medium text-neutral-200 mb-2">
                Host Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-black border border-white/30 px-4 py-3 text-base text-[16px] text-white placeholder:text-neutral-400 focus:border-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-[#ff2936] hover:text-white transition-colors py-3 text-sm uppercase tracking-widest font-mono font-bold cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black"
            >
              {loading ? 'Verifying...' : 'Sign In →'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/20 text-xs text-neutral-300 font-mono font-medium flex items-center justify-between">
            <Link to={`/r/${slug}/book`} className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white">
              ← View Guest Portal
            </Link>
            <Link to="/" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white">
              TableMate Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function OwnerDashboard({ slug, restaurant, onLogout }) {
  const [activeTab, setActiveTab] = useState('reservations');
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Password reset modal
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(
    Boolean(restaurant.mustChangePassword)
  );
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');

  // Confirmation modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    targetReservation: null,
    targetStatus: null,
  });

  const { showToast } = useToast();

  const fetchReservations = useCallback(() => {
    setLoading(true);
    api.getReservations(slug, {
      status: statusFilter,
      date: selectedDate || undefined,
      search: searchQuery || undefined,
    })
      .then((data) => {
        setReservations(data.reservations || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch reservations error:', err);
        setLoading(false);
      });
  }, [slug, statusFilter, selectedDate, searchQuery]);

  useEffect(() => {
    fetchReservations();
    const interval = setInterval(fetchReservations, 15000);
    return () => clearInterval(interval);
  }, [fetchReservations]);

  const handleStatusChange = (reservation, newStatus) => {
    const isDestructive = newStatus === RESERVATION_STATUS.CANCELLED || newStatus === RESERVATION_STATUS.REJECTED;
    setModalState({
      isOpen: true,
      title: isDestructive ? `Reject / Cancel Reservation?` : `Confirm Reservation?`,
      message: `Are you sure you want to change reference ${reservation.reference} (${reservation.name}, ${reservation.guests} guests) to "${newStatus}"?`,
      targetReservation: reservation,
      targetStatus: newStatus,
    });
  };

  const executeStatusChange = async () => {
    const { targetReservation, targetStatus } = modalState;
    if (!targetReservation || !targetStatus) return;

    try {
      await api.updateReservationStatus(slug, targetReservation.id, targetStatus);
      showToast(`Reservation ${targetReservation.reference} marked as ${targetStatus}.`, 'success');
      setModalState({ isOpen: false, targetReservation: null, targetStatus: null });
      fetchReservations();
    } catch (err) {
      showToast(err.message || 'Status transition failed.', 'error');
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 12) {
      setPasswordChangeError('New password must be at least 12 characters long.');
      return;
    }

    setPasswordChangeLoading(true);
    setPasswordChangeError('');

    try {
      const res = await fetch(`/api/r/${slug}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Password update failed.');
      }

      showToast('Password changed successfully. Keep it secure!', 'success');
      setShowPasswordChangeModal(false);
    } catch (err) {
      setPasswordChangeError(err.message || 'Failed to update password');
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-[#ff2936] selection:text-white">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-[#101010] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-[#ff2936] font-mono text-base">+</span>
          <h1 className="font-editorial text-2xl tracking-wide text-white">
            {restaurant.name}
          </h1>
          <span className="text-xs font-mono uppercase bg-white/15 px-2.5 py-0.5 text-neutral-200 font-medium">
            Host Desk
          </span>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <a
            href={`/r/${slug}/book`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-neutral-200 hover:text-white font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>Public Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-neutral-300 hover:text-[#ff2936] font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Bar */}
      <div className="border-b border-white/10 bg-black px-6 flex items-center justify-between text-xs font-mono">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`py-3.5 border-b-2 uppercase tracking-wider transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white ${
              activeTab === 'reservations'
                ? 'border-[#ff2936] text-white font-bold'
                : 'border-transparent text-neutral-300 hover:text-white'
            }`}
          >
            Reservations ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`py-3.5 border-b-2 uppercase tracking-wider transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white ${
              activeTab === 'tables'
                ? 'border-[#ff2936] text-white font-bold'
                : 'border-transparent text-neutral-300 hover:text-white'
            }`}
          >
            Floor & Tables
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3.5 border-b-2 uppercase tracking-wider transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white ${
              activeTab === 'settings'
                ? 'border-[#ff2936] text-white font-bold'
                : 'border-transparent text-neutral-300 hover:text-white'
            }`}
          >
            QR & Venue Settings
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <a
            href={`/api/r/${slug}/reservations/export.csv`}
            download
            className="py-1.5 px-3 border border-white/30 bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
          <div className="text-xs text-neutral-300 font-medium hidden md:flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-[#ff2936]" />
            <span>15s Live Polling</span>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {activeTab === 'reservations' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-[#101010] p-4 border border-white/20 font-mono text-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search guest name, reference (TM-...), or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black border border-white/30 pl-9 pr-3 py-2 text-base text-[16px] text-white placeholder:text-neutral-400 focus:border-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-black border border-white/30 px-3 py-2 text-base text-[16px] text-white focus:border-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black focus:outline-none"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="text-neutral-200 hover:text-white uppercase font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
                  >
                    [Clear]
                  </button>
                )}
                <button
                  onClick={fetchReservations}
                  className="p-2 border border-white/30 bg-black hover:bg-white/10 text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
                  title="Refresh now"
                  aria-label="Refresh reservations list"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reservations List */}
            {reservations.length === 0 ? (
              <div className="border border-white/20 bg-[#101010] p-16 text-center">
                <Calendar className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
                <h4 className="text-sm uppercase font-mono tracking-widest text-neutral-100 font-bold">No Reservations Found</h4>
                <p className="text-xs text-neutral-300 font-mono font-medium mt-1">
                  Incoming diner booking submissions will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="border border-white/20 bg-[#101010] divide-y divide-white/10">
                {reservations.map((r) => {
                  const cleanPhone = r.phone.replace(/\D/g, '');
                  const intlPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

                  const confirmWaText = encodeURIComponent(
                    `Hello ${r.name}, your reservation at ${restaurant.name} for party of ${r.guests} on ${formatFriendlyDate(r.date)} at ${formatFriendlyTime(r.time)} is confirmed. Ref: ${r.reference}. We look forward to welcoming you!`
                  );
                  const rejectWaText = encodeURIComponent(
                    `Hello ${r.name}, unfortunately ${restaurant.name} cannot accommodate your reservation request for ${formatFriendlyDate(r.date)} at ${formatFriendlyTime(r.time)}. Ref: ${r.reference}.`
                  );

                  const confirmWaUrl = `https://wa.me/${intlPhone}?text=${confirmWaText}`;
                  const rejectWaUrl = `https://wa.me/${intlPhone}?text=${rejectWaText}`;

                  return (
                    <div
                      key={r.id}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-black border border-white/30 flex flex-col items-center justify-center font-mono shrink-0">
                          <span className="text-sm font-bold text-white">{r.guests}</span>
                          <span className="text-[10px] uppercase font-bold text-neutral-300">pax</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono text-sm text-[#ff2936] font-bold">
                              {r.reference}
                            </span>
                            <h4 className="font-semibold text-sm text-white">{r.name}</h4>
                            <span className="text-xs font-mono uppercase px-2.5 py-0.5 border border-white/30 text-neutral-100 font-medium">
                              {r.status}
                            </span>
                            {r.whatsappOptIn && (
                              <span className="text-[10px] font-mono uppercase bg-emerald-950/80 border border-emerald-400 text-emerald-300 px-2 py-0.5 font-bold">
                                WhatsApp Opt-In
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-200 font-medium mt-2">
                            <span>{formatFriendlyDate(r.date)} @ {formatFriendlyTime(r.time)}</span>
                            <span>•</span>
                            <span>+91 {r.phone}</span>
                            {r.table && (
                              <>
                                <span>•</span>
                                <span className="text-white font-semibold">Table {r.table.number}</span>
                              </>
                            )}
                          </div>

                          {r.notes && (
                            <p className="text-xs font-mono text-neutral-200 font-normal italic border-l-2 border-[#ff2936] pl-2 mt-2">
                              &ldquo;{r.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* WhatsApp Buttons + Host Action Controls */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                        {/* WhatsApp Reachout with Honest Labeling */}
                        <div className="text-left sm:text-right">
                          <div className="flex items-center gap-2">
                            <a
                              href={confirmWaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-mono font-bold transition-colors inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp Confirm</span>
                            </a>
                            <a
                              href={rejectWaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 border border-white/40 bg-black hover:bg-white/10 text-white text-xs font-mono font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
                            >
                              <span>WhatsApp Reject</span>
                            </a>
                          </div>
                          <span className="block text-xs text-neutral-300 font-mono mt-1 font-medium">
                            Opens WhatsApp on your phone. Nothing is sent automatically.
                          </span>
                        </div>

                        {/* Status Change Buttons */}
                        <div className="flex items-center gap-2 pl-2 border-l border-white/20">
                          {r.status === RESERVATION_STATUS.PENDING && (
                            <button
                              onClick={() => handleStatusChange(r, RESERVATION_STATUS.CONFIRMED)}
                              className="px-3.5 py-1.5 text-xs font-mono uppercase bg-white text-black hover:bg-[#ff2936] hover:text-white transition-colors cursor-pointer font-bold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black"
                            >
                              Confirm
                            </button>
                          )}
                          {(r.status === RESERVATION_STATUS.PENDING || r.status === RESERVATION_STATUS.CONFIRMED) && (
                            <button
                              onClick={() => handleStatusChange(r, RESERVATION_STATUS.CANCELLED)}
                              className="px-3.5 py-1.5 text-xs font-mono uppercase border border-white/40 text-neutral-200 hover:text-white hover:border-white transition-colors cursor-pointer font-bold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Floor & Tables View */}
        {activeTab === 'tables' && (
          <TenantTablesView slug={slug} restaurant={restaurant} />
        )}

        {/* Settings & QR Code Tab */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start font-mono text-sm">
            <div className="bg-[#101010] border border-white/20 p-6 space-y-4">
              <h3 className="text-sm uppercase font-mono font-bold tracking-widest text-white border-b border-white/10 pb-3">
                Venue Configuration
              </h3>
              <div className="space-y-3 text-neutral-200 font-medium">
                <div className="flex justify-between py-1.5 border-b border-white/10">
                  <span className="text-neutral-400">Venue Name</span>
                  <span className="text-white font-bold">{restaurant.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/10">
                  <span className="text-neutral-400">Identifier Slug</span>
                  <span className="text-white">{restaurant.slug}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/10">
                  <span className="text-neutral-400">Service Hours</span>
                  <span className="text-white">{restaurant.openTime} – {restaurant.closeTime}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/10">
                  <span className="text-neutral-400">Turn Duration</span>
                  <span className="text-white">90-Minute Window</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/10">
                  <span className="text-neutral-400">Max Party Size</span>
                  <span className="text-white">{restaurant.maxPartySize} guests</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setShowPasswordChangeModal(true)}
                  className="w-full py-3 border border-white/30 bg-black hover:bg-white/15 text-white uppercase tracking-wider font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
                >
                  Change Host Password
                </button>
              </div>
            </div>

            <div className="bg-[#101010] border border-white/20 p-6 text-center space-y-4">
              <h3 className="text-sm uppercase font-mono font-bold tracking-widest text-white border-b border-white/10 pb-3 text-left">
                Table Tent & Window QR Code
              </h3>
              <p className="text-xs text-neutral-300 font-medium text-left">
                Place this QR code on your reception desk, table tents, or Instagram bio for direct bookings.
              </p>
              <div className="p-4 bg-white inline-block">
                <QRCodeDisplay
                  value={`${window.location.origin}/r/${slug}/book`}
                  size={180}
                />
              </div>
              <div className="text-xs text-neutral-300 break-all font-mono font-medium">
                {window.location.origin}/r/{slug}/book
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        onConfirm={executeStatusChange}
        onCancel={() => setModalState({ isOpen: false, targetReservation: null, targetStatus: null })}
      />

      {/* Mandatory / Self-Service Change Password Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#101010] border border-white/30 max-w-md w-full p-8 text-left font-mono">
            <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-6">
              <div>
                <span className="text-xs uppercase text-[#ff2936] font-bold tracking-widest">Security Update</span>
                <h3 className="text-sm uppercase font-bold tracking-widest text-white mt-1">
                  Set Permanent Host Password
                </h3>
              </div>
              {!restaurant.mustChangePassword && (
                <button
                  onClick={() => setShowPasswordChangeModal(false)}
                  className="text-neutral-300 hover:text-white font-bold p-1 focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Close dialog"
                >
                  [ESC]
                </button>
              )}
            </div>

            {restaurant.mustChangePassword && (
              <div className="p-3.5 bg-amber-950/60 border border-amber-500/60 text-amber-200 text-xs font-medium mb-4">
                <strong>First Login Action Required:</strong> You must set your permanent password before accessing the reservation desk.
              </div>
            )}

            {passwordChangeError && (
              <div className="p-3 bg-red-950/60 border border-[#ff2936] text-[#ff2936] text-xs font-semibold mb-4">
                {passwordChangeError}
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block uppercase text-neutral-200 font-medium mb-2 text-xs">Current / Temporary Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-black border border-white/30 p-3 text-base text-[16px] text-white focus:border-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block uppercase text-neutral-200 font-medium mb-2 text-xs">New Permanent Password (min 12 chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-black border border-white/30 p-3 text-base text-[16px] text-white placeholder:text-neutral-400 focus:border-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={passwordChangeLoading}
                className="w-full mt-2 bg-white text-black py-3 text-sm uppercase tracking-widest font-bold hover:bg-[#ff2936] hover:text-white transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black"
              >
                {passwordChangeLoading ? 'Updating Password...' : 'Save Password & Continue →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TenantTablesView({ slug, restaurant }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTables(slug)
      .then((data) => {
        setTables(data.tables || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching tables:', err);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="text-center py-12 text-sm font-mono text-neutral-300 font-medium">
        Loading physical table allocation...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-sm uppercase tracking-widest text-white font-bold">Floor Table Map</h3>
          <p className="text-xs text-neutral-300 font-medium mt-1">
            Physical dining inventory mapped to automatic 90-minute slot assignment.
          </p>
        </div>
        <span className="text-xs text-neutral-200 font-medium border border-white/30 px-3 py-1">
          {tables.length} Total Tables
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="bg-[#101010] border border-white/20 p-4 flex flex-col justify-between hover:border-white/50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <span className="text-base font-bold text-white">T-{table.number}</span>
              <span className="text-xs uppercase font-bold text-[#ff2936]">{table.capacity} Pax</span>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-xs text-neutral-300 font-medium">
              Active on floor
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
