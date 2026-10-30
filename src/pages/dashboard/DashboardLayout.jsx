import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import DemoBanner from '../../components/DemoBanner';
import { repository } from '../../services/reservationRepository';
import { Menu } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';

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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <DemoBanner />

      <div className="flex-1 flex w-full">
        <Sidebar
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          restaurantSettings={settings}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Top Header */}
          <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              {settings.restaurantName}
            </span>
            <ThemeToggle variant="light-surface" />
          </header>

          {/* Main content body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <p>
              TableMate AI Demo &bull; Local prototype with simulated availability. Data is stored in your browser&apos;s localStorage.
            </p>
            <p className="mt-1 text-slate-400 dark:text-slate-500">
              To test live real-time booking updates, open the <a href="/book" target="_blank" rel="noreferrer" className="underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">/book</a> portal in a second tab of this browser.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
