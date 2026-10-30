import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import ThemeToggle from '../../components/ThemeToggle';
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
      <div className="min-h-screen tm-bg flex items-center justify-center p-4">
        <div className="text-center tm-text font-mono text-xs">
          <div className="w-6 h-6 border-2 tm-border border-t-transparent animate-spin mx-auto mb-3" style={{ borderTopColor: 'transparent' }} />
          <p className="tm-text-subtle uppercase tracking-widest">Verifying host credentials...</p>
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
    <div className="min-h-screen tm-bg tm-text flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-left">
        <div className="border tm-border tm-bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between border-b tm-border pb-4 mb-6">
            <div>
              <span className="text-xs uppercase font-mono font-semibold tracking-widest text-[#ff2936]">Host Portal</span>
              <h2 className="text-xl font-editorial italic tm-text mt-1">
                {slug.toUpperCase()}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle variant="dark-surface" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff2936]" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-950/60 border border-[#ff2936] text-[#ff2936] text-sm font-mono font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm uppercase tracking-wider font-mono font-medium tm-text-muted mb-2">
                Host Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full tm-input border px-4 py-3 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full tm-btn-primary py-3 text-sm uppercase tracking-widest font-mono font-bold cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Sign In →'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t tm-border text-xs tm-text-muted font-mono font-medium flex items-center justify-between">
            <Link to={`/r/${slug}/book`} className="hover:tm-text transition-colors">
              ← View Guest Portal
            </Link>
            <Link to="/" className="hover:tm-text transition-colors">
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
    <div className="min-h-screen tm-bg tm-text flex flex-col selection:bg-[#ff2936] selection:text-white">
      {/* Top Header */}
      <header className="border-b tm-border tm-bg-card px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <span className="text-[#ff2936] font-mono text-base shrink-0">+</span>
          <h1 className="font-editorial text-xl sm:text-2xl tracking-wide tm-text truncate">
            {restaurant.name}
          </h1>
          <span className="text-xs font-mono uppercase px-2 py-0.5 tm-border border tm-text-muted font-medium hidden sm:inline shrink-0">
            Host Desk
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono shrink-0">
          <a
            href={`/r/${slug}/book`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 tm-text-muted hover:tm-text font-medium transition-colors"
          >
            <span>Public Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <ThemeToggle variant="dark-surface" />
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 tm-text-muted hover:text-[#ff2936] font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Bar — horizontally scrollable on mobile */}
      <div className="border-b tm-border tm-bg-card-alt tab-bar-scroll">
        <div className="px-4 sm:px-6 flex items-center justify-between text-xs font-mono min-w-max sm:min-w-0">
          <div className="flex">
            {[
              { id: 'reservations', label: `Reservations (${reservations.length})` },
              { id: 'tables', label: 'Floor & Tables' },
              { id: 'settings', label: 'QR & Settings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-1 mr-6 border-b-2 uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#ff2936] tm-text font-bold'
                    : 'border-transparent tm-text-muted hover:tm-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pl-4">
            <a
              href={`/api/r/${slug}/reservations/export.csv`}
              download
              className="py-1.5 px-3 border tm-border hover:bg-white/10 tm-text font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </a>
            <div className="tm-text-subtle font-medium hidden md:flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-[#ff2936]" />
              <span>15s Live Polling</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'reservations' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 tm-bg-card p-4 border tm-border font-mono text-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 tm-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search guest, reference, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full tm-input border pl-9 pr-3 py-2 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 min-w-0 tm-input border px-3 py-2 focus:outline-none"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="tm-text-muted hover:tm-text uppercase font-medium cursor-pointer whitespace-nowrap"
                  >
                    [Clear]
                  </button>
                )}
                <button
                  onClick={fetchReservations}
                  className="p-2 border tm-border tm-bg hover:bg-white/10 dark:hover:bg-white/10 tm-text cursor-pointer"
                  title="Refresh now"
                  aria-label="Refresh reservations list"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reservations List */}
            {reservations.length === 0 ? (
              <div className="border tm-border tm-bg-card p-12 sm:p-16 text-center">
                <Calendar className="w-8 h-8 tm-text-subtle mx-auto mb-3" />
                <h4 className="text-sm uppercase font-mono tracking-widest tm-text font-bold">No Reservations Found</h4>
                <p className="text-xs tm-text-muted font-mono font-medium mt-1">
                  Incoming diner booking submissions will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="border tm-border tm-bg-card divide-y" style={{ borderColor: 'var(--tm-border)' }}>
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
                      className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 tm-bg-card-alt border tm-border flex flex-col items-center justify-center font-mono shrink-0">
                          <span className="text-sm font-bold tm-text">{r.guests}</span>
                          <span className="text-[10px] uppercase font-bold tm-text-muted">pax</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <span className="font-mono text-sm text-[#ff2936] font-bold">
                              {r.reference}
                            </span>
                            <h4 className="font-semibold text-sm tm-text">{r.name}</h4>
                            <span className="text-xs font-mono uppercase px-2.5 py-0.5 border tm-border tm-text-muted font-medium">
                              {r.status}
                            </span>
                            {r.whatsappOptIn && (
                              <span className="text-[10px] font-mono uppercase bg-emerald-950/80 border border-emerald-400 text-emerald-300 px-2 py-0.5 font-bold">
                                WhatsApp Opt-In
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono tm-text-muted font-medium mt-2">
                            <span>{formatFriendlyDate(r.date)} @ {formatFriendlyTime(r.time)}</span>
                            <span>•</span>
                            <span>+91 {r.phone}</span>
                            {r.table && (
                              <>
                                <span>•</span>
                                <span className="tm-text font-semibold">Table {r.table.number}</span>
                              </>
                            )}
                          </div>

                          {r.notes && (
                            <p className="text-xs font-mono tm-text-muted font-normal italic border-l-2 border-[#ff2936] pl-2 mt-2">
                              &ldquo;{r.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* WhatsApp Buttons + Host Action Controls */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                        {/* WhatsApp Reachout */}
                        <div className="text-left sm:text-right">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={confirmWaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-mono font-bold transition-colors inline-flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp Confirm</span>
                            </a>
                            <a
                              href={rejectWaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 border tm-border tm-bg hover:bg-white/10 tm-text text-xs font-mono font-medium transition-colors"
                            >
                              <span>WhatsApp Reject</span>
                            </a>
                          </div>
                          <span className="block text-xs tm-text-subtle font-mono mt-1 font-medium">
                            Opens WhatsApp on your phone. Nothing is sent automatically.
                          </span>
                        </div>

                        {/* Status Change Buttons */}
                        <div className="flex items-center gap-2 pl-2 border-l tm-border">
                          {r.status === RESERVATION_STATUS.PENDING && (
                            <button
                              onClick={() => handleStatusChange(r, RESERVATION_STATUS.CONFIRMED)}
                              className="px-3.5 py-1.5 text-xs font-mono uppercase tm-btn-primary cursor-pointer font-bold"
                            >
                              Confirm
                            </button>
                          )}
                          {(r.status === RESERVATION_STATUS.PENDING || r.status === RESERVATION_STATUS.CONFIRMED) && (
                            <button
                              onClick={() => handleStatusChange(r, RESERVATION_STATUS.CANCELLED)}
                              className="px-3.5 py-1.5 text-xs font-mono uppercase border tm-border tm-text-muted hover:tm-text transition-colors cursor-pointer font-bold"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start font-mono text-sm">
            <div className="tm-bg-card border tm-border p-5 sm:p-6 space-y-4">
              <h3 className="text-sm uppercase font-mono font-bold tracking-widest tm-text border-b tm-border pb-3">
                Venue Configuration
              </h3>
              <div className="space-y-1">
                {[
                  ['Venue Name', restaurant.name, true],
                  ['Identifier Slug', restaurant.slug, false],
                  ['Service Hours', `${restaurant.openTime} – ${restaurant.closeTime}`, false],
                  ['Turn Duration', '90-Minute Window', false],
                  ['Max Party Size', `${restaurant.maxPartySize} guests`, false],
                ].map(([label, value, bold]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b tm-border last:border-b-0">
                    <span className="tm-text-subtle">{label}</span>
                    <span className={`tm-text ${bold ? 'font-bold' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setShowPasswordChangeModal(true)}
                  className="w-full py-3 border tm-border tm-bg hover:bg-white/10 dark:hover:bg-white/10 tm-text uppercase tracking-wider font-bold cursor-pointer"
                >
                  Change Host Password
                </button>
              </div>
            </div>

            <div className="tm-bg-card border tm-border p-5 sm:p-6 text-center space-y-4">
              <h3 className="text-sm uppercase font-mono font-bold tracking-widest tm-text border-b tm-border pb-3 text-left">
                Table Tent &amp; Window QR Code
              </h3>
              <p className="text-xs tm-text-muted font-medium text-left">
                Place this QR code on your reception desk, table tents, or Instagram bio for direct bookings.
              </p>
              <div className="p-4 bg-white inline-block">
                <QRCodeDisplay
                  value={`${window.location.origin}/r/${slug}/book`}
                  size={180}
                />
              </div>
              <div className="text-xs tm-text-subtle break-all font-mono font-medium">
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
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'var(--tm-overlay)', backdropFilter: 'blur(4px)' }}>
          <div className="tm-bg-card border tm-border max-w-md w-full p-6 sm:p-8 text-left font-mono">
            <div className="flex items-center justify-between border-b tm-border pb-4 mb-6">
              <div>
                <span className="text-xs uppercase text-[#ff2936] font-bold tracking-widest">Security Update</span>
                <h3 className="text-sm uppercase font-bold tracking-widest tm-text mt-1">
                  Set Permanent Host Password
                </h3>
              </div>
              {!restaurant.mustChangePassword && (
                <button
                  onClick={() => setShowPasswordChangeModal(false)}
                  className="tm-text-muted hover:tm-text font-bold p-1"
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
                <label className="block uppercase tm-text-muted font-medium mb-2 text-xs">Current / Temporary Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full tm-input border p-3 focus:outline-none"
                />
              </div>

              <div>
                <label className="block uppercase tm-text-muted font-medium mb-2 text-xs">New Permanent Password (min 12 chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full tm-input border p-3 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={passwordChangeLoading}
                className="w-full mt-2 tm-btn-primary py-3 text-sm uppercase tracking-widest font-bold cursor-pointer disabled:opacity-50"
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
      <div className="flex items-center justify-between border-b tm-border pb-4">
        <div>
          <h3 className="text-sm uppercase tracking-widest tm-text font-bold">Floor Table Map</h3>
          <p className="text-xs tm-text-muted font-medium mt-1">
            Physical dining inventory mapped to automatic 90-minute slot assignment.
          </p>
        </div>
        <span className="text-xs tm-text-muted font-medium border tm-border px-3 py-1">
          {tables.length} Total Tables
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="tm-bg-card border tm-border p-4 flex flex-col justify-between hover:border-[#ff2936] transition-colors"
          >
            <div className="flex justify-between items-start">
              <span className="text-base font-bold tm-text">T-{table.number}</span>
              <span className="text-xs uppercase font-bold text-[#ff2936]">{table.capacity} Pax</span>
            </div>
            <div className="mt-4 pt-3 border-t tm-border text-xs tm-text-subtle font-medium">
              Active on floor
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
