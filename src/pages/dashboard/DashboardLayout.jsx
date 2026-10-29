import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import DemoBanner from '../../components/DemoBanner';
import { repository } from '../../services/reservationRepository';
import { Menu } from 'lucide-react';

export default function DashboardLayout() {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [settings, setSettings] = useState(() => repository.getSettings());
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = repository.subscribe(() => {
      setSettings(repository.getSettings());
    });
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <DemoBanner />

      <div className="flex-1 flex w-full">
        <Sidebar
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          restaurantSettings={settings}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Top Header */}
          <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-sm text-slate-900">
              {settings.restaurantName}
            </span>
            <div className="w-8" />
          </header>

          {/* Main content body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>

          {/* Transparent footer stating localStorage limitation */}
          <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
            <p>
              TableMate AI Demo &bull; Local prototype with simulated availability. Data is stored in your browser's localStorage.
            </p>
            <p className="mt-1 text-slate-400">
              To test live real-time booking updates, open the <a href="/book" target="_blank" rel="noreferrer" className="underline text-indigo-600 hover:text-indigo-800">/book</a> portal in a second tab of this browser.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
