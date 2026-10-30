import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-[#ff2936] selection:text-white">
      {/* Top Bar — Minimalist Typographic Header */}
      <header className="w-full border-b border-white/10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-3 text-sm tracking-widest uppercase">
          <span className="text-[#ff2936] font-mono text-base">+</span>
          <span className="font-medium tracking-tight">TABLEMATE AI</span>
        </div>
        <div className="flex items-center space-x-6 text-xs uppercase tracking-widest font-mono">
          <button
            onClick={() => setShowInquiryModal(true)}
            className="hover:text-[#ff2936] transition-colors cursor-pointer"
          >
            + REQUEST A PILOT
          </button>
          <a
            href="#login-section"
            className="hover:text-white text-white/60 transition-colors"
          >
            HOST LOGIN
          </a>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 flex flex-col justify-center items-center text-center">
        {/* Massive Italicized Wordmark */}
        <h1 className="font-editorial text-7xl sm:text-8xl md:text-9xl tracking-tight text-white mb-6 select-none leading-none">
          tablemate
        </h1>

        {/* Plain Two-Line Description */}
        <p className="text-base sm:text-lg text-white/80 max-w-xl font-normal leading-relaxed mb-4">
          Direct reservation desk and table capacity management for independent restaurants.
          Eliminate double-bookings and chaotic phone calls during dinner rush.
        </p>

        {/* Bracket-Wrapped Editorial Flourish */}
        <p className="font-flourish text-xl text-white/60 mb-12">
          [ built for independent dining rooms with zero tolerance for chaos ]
        </p>

        {/* Host Login Section */}
        <div id="login-section" className="w-full max-w-md bg-[#101010] border border-white/20 p-8 text-left">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-6">
            <span className="text-xs uppercase tracking-widest font-mono text-white/60">
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
              <label className="block text-sm uppercase tracking-wider font-mono font-medium text-neutral-200 mb-2">
                Restaurant Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. your-restaurant"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full bg-black border border-white/30 px-4 py-3 text-base text-[16px] text-white placeholder:text-neutral-400 focus:border-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm uppercase tracking-wider font-mono font-medium text-neutral-200 mb-2">
                Host Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-black border border-white/30 px-4 py-3 text-base text-[16px] text-white placeholder:text-neutral-400 focus:border-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-white text-black hover:bg-[#ff2936] hover:text-white transition-colors py-3 text-sm uppercase tracking-widest font-mono font-bold cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black"
            >
              {loading ? 'Verifying Credentials...' : 'Sign In to Host Dashboard →'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/20 text-xs text-neutral-300 font-mono font-medium flex items-center justify-between">
            <span>Need password reset?</span>
            <span className="text-neutral-200">Contact Administrator</span>
          </div>
        </div>

        {/* Direct Contact for Pilots */}
        <div className="mt-12 text-center text-xs font-mono font-medium text-neutral-300">
          Interested in running a pilot for your restaurant?{' '}
          <button
            onClick={() => setShowInquiryModal(true)}
            className="text-white underline underline-offset-4 hover:text-[#ff2936] transition-colors cursor-pointer ml-1 focus-visible:ring-2 focus-visible:ring-white"
          >
            Request Pilot Access
          </button>
        </div>
      </main>

      {/* Persistent Bottom Project Ticker */}
      <footer className="w-full border-t border-white/20 bg-black py-4 px-6 text-xs font-mono flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-6 text-neutral-300 text-xs font-medium uppercase tracking-wider">
          <span>Engine: PostgreSQL (Neon)</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Isolation: Multi-Tenant</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Double-Booking Guard: Active</span>
        </div>

        <div className="flex items-center space-x-4 text-xs font-medium text-neutral-300">
          <Link to="/terms" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white">
            Terms & Data Notice
          </Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white">
            Privacy
          </Link>
          <span>•</span>
          <span className="text-neutral-400">v1.0.0</span>
        </div>
      </footer>

      {/* Pilot Request Modal */}
      {showInquiryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#101010] border border-white/30 max-w-lg w-full p-8 text-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <h3 className="text-sm uppercase tracking-widest font-mono text-white">
                Request Restaurant Pilot
              </h3>
              <button
                onClick={() => setShowInquiryModal(false)}
                className="text-white/50 hover:text-white font-mono text-sm cursor-pointer"
              >
                [ESC]
              </button>
            </div>

            <p className="text-sm text-white/80 mb-6 leading-relaxed">
              We onboard independent restaurants with a custom floor plan, calibrated 90-minute table turn rules, printable QR table tents, and dedicated booking portal.
            </p>

            <div className="bg-black border border-white/10 p-4 mb-6 space-y-2 text-xs font-mono text-white/70">
              <div className="text-white font-semibold mb-1">Direct Contact:</div>
              <div>• Email: <span className="text-white">pilot@tablemate.ai</span></div>
              <div>• Setup: 24-hour turnaround with your floor table inventory</div>
              <div>• Pilot fee: ₹999 flat onboarding</div>
            </div>

            <button
              onClick={() => setShowInquiryModal(false)}
              className="w-full bg-white text-black py-3 text-xs uppercase tracking-widest font-mono font-semibold hover:bg-[#ff2936] hover:text-white transition-colors cursor-pointer"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
