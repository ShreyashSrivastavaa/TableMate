import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RotateCcw, Utensils, LayoutDashboard, AlertCircle } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import ThemeToggle from './ThemeToggle';
import { repository } from '../services/reservationRepository';
import { useToast } from '../context/ToastContext';

export default function DemoBanner() {
  const [showResetModal, setShowResetModal] = useState(false);
  const location = useLocation();
  const { showToast } = useToast();

  const isBookRoute = location.pathname.startsWith('/book');

  const handleResetConfirm = () => {
    repository.reset();
    setShowResetModal(false);
    showToast('Demo data reset to default schedule (~25 sample reservations)', 'info');
  };

  return (
    <>
      <div className="bg-slate-900 border-b border-slate-800 text-slate-300 px-4 py-2 text-xs md:text-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              DEMO MODE
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Fictional restaurant, sample data, not a live system.
            </span>
            <span className="text-slate-400 sm:hidden">
              Sample data, not live.
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isBookRoute ? (
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors font-medium text-xs"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                <span>Restaurant Dashboard</span>
              </Link>
            ) : (
              <Link
                to="/book"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors font-medium text-xs"
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Customer Booking Portal (/book)</span>
              </Link>
            )}

            <button
              onClick={() => setShowResetModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors font-medium text-xs"
              title="Reset all sample data"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Demo Data</span>
            </button>

            <ThemeToggle
              variant="dark-surface"
              className="border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white"
            />
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetModal}
        title="Reset Demo Data?"
        message="This will restore all default reservations, settings, and tables relative to today. Any bookings created during this session will be replaced."
        confirmLabel="Reset Data"
        cancelLabel="Keep Current"
        isDestructive={true}
        onConfirm={handleResetConfirm}
        onCancel={() => setShowResetModal(false)}
      />
    </>
  );
}
