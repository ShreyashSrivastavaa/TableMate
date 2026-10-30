import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';

export default function LandingPage() {
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!slug.trim()) {
      setError('Please enter your restaurant slug');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your host password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/r/${slug.trim().toLowerCase()}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      navigate(`/r/${slug.trim().toLowerCase()}/admin`);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen tm-bg tm-text flex flex-col justify-between selection:bg-[#ff2936] selection:text-white">
      {/* ── Top Bar ── */}
      <header className="w-full border-b tm-border px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-sm tracking-widest uppercase">
          <span className="text-[#ff2936] font-mono text-base">+</span>
          <span className="font-medium tracking-tight">TABLEMATE AI</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 text-xs uppercase tracking-widest font-mono">
          {/* Mobile: hide text, show only icon-equivalent */}
          <button
            onClick={() => setShowInquiryModal(true)}
            className="hidden sm:block hover:text-[#ff2936] transition-colors cursor-pointer tm-text-muted"
          >
            + REQUEST A PILOT
          </button>
          <a
            href="#login-section"
            className="tm-text-muted hover:tm-text transition-colors"
          >
            HOST LOGIN
          </a>
          <ThemeToggle variant="dark-surface" />
        </div>
      </header>

      {/* ── Main Hero ── */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col justify-center items-center text-center">
        {/* Massive editorial wordmark */}
        <h1 className="font-editorial text-6xl sm:text-8xl md:text-9xl tracking-tight tm-text mb-5 select-none leading-none">
          tablemate
        </h1>

        <p className="text-sm sm:text-base md:text-lg tm-text-muted max-w-xl font-normal leading-relaxed mb-4 px-2">
          Direct reservation desk and table capacity management for independent restaurants.
          Eliminate double-bookings and chaotic phone calls during dinner rush.
        </p>

        <p className="font-flourish text-lg sm:text-xl tm-text-subtle mb-10 sm:mb-12 px-2">
          [ built for independent dining rooms with zero tolerance for chaos ]
        </p>

        {/* ── Host Login Card ── */}
        <div
          id="login-section"
          className="w-full max-w-md tm-bg-card border tm-border p-6 sm:p-8 text-left"
        >
          <div className="flex items-center justify-between border-b tm-border pb-3 mb-6">
            <span className="text-xs uppercase tracking-widest font-mono tm-text-subtle">
              Host Portal Access
            </span>
            <span className="w-2 h-2 rounded-full bg-[#ff2936]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-950/40 border border-[#ff2936] text-[#ff2936] text-xs font-mono">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm uppercase tracking-wider font-mono font-medium tm-text-muted mb-2">
                Restaurant Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. your-restaurant"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full tm-input border px-4 py-3 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm uppercase tracking-wider font-mono font-medium tm-text-muted mb-2">
                Host Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full tm-input border px-4 py-3 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 tm-btn-primary py-3 text-sm uppercase tracking-widest font-mono font-bold cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Verifying Credentials...' : 'Sign In to Host Dashboard →'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t tm-border text-xs tm-text-muted font-mono font-medium flex items-center justify-between">
            <span>Need password reset?</span>
            <span className="tm-text">Contact Administrator</span>
          </div>
        </div>

        {/* Pilot CTA */}
        <div className="mt-10 sm:mt-12 text-center text-xs font-mono font-medium tm-text-muted">
          Interested in running a pilot for your restaurant?{' '}
          <button
            onClick={() => setShowInquiryModal(true)}
            className="tm-text underline underline-offset-4 hover:text-[#ff2936] transition-colors cursor-pointer ml-1"
          >
            Request Pilot Access
          </button>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full border-t tm-border tm-bg py-4 px-4 sm:px-6 text-xs font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tm-text-subtle text-xs font-medium uppercase tracking-wider">
            <span>Engine: PostgreSQL (Neon)</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">Isolation: Multi-Tenant</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">Double-Booking Guard: Active</span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-medium tm-text-muted">
            <Link to="/terms" className="hover:tm-text transition-colors">
              Terms &amp; Data Notice
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:tm-text transition-colors">
              Privacy
            </Link>
            <span>•</span>
            <span className="tm-text-subtle">v1.0.0</span>
          </div>
        </div>
      </footer>

      {/* ── Pilot Request Modal ── */}
      {showInquiryModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'var(--tm-overlay)', backdropFilter: 'blur(4px)' }}>
          <div className="tm-bg-card border tm-border max-w-lg w-full p-6 sm:p-8 text-left">
            <div className="flex items-center justify-between border-b tm-border pb-4 mb-6">
              <h3 className="text-sm uppercase tracking-widest font-mono tm-text">
                Request Restaurant Pilot
              </h3>
              <button
                onClick={() => setShowInquiryModal(false)}
                className="tm-text-subtle hover:tm-text font-mono text-sm cursor-pointer"
              >
                [ESC]
              </button>
            </div>

            <p className="text-sm tm-text-muted mb-6 leading-relaxed">
              We onboard independent restaurants with a custom floor plan, calibrated 90-minute table turn rules, printable QR table tents, and dedicated booking portal.
            </p>

            <div className="tm-bg-card-alt border tm-border p-4 mb-6 space-y-2 text-xs font-mono tm-text-subtle">
              <div className="tm-text font-semibold mb-1">Direct Contact:</div>
              <div>• Email: <span className="tm-text">pilot@tablemate.ai</span></div>
              <div>• Setup: 24-hour turnaround with your floor table inventory</div>
              <div>• Pilot fee: ₹999 flat onboarding</div>
            </div>

            <button
              onClick={() => setShowInquiryModal(false)}
              className="w-full tm-btn-primary py-3 text-xs uppercase tracking-widest font-mono font-semibold"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
