import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * ThemeToggle — a small sun/moon toggle button.
 * Accepts an optional `variant` prop:
 *   'dark-surface' (default) — for dark-bg pages (Freshman aesthetic)
 *   'light-surface'          — for light-bg pages (Dashboard/Booking)
 */
export default function ThemeToggle({ variant = 'dark-surface', className = '' }) {
  const { isDark, toggle } = useTheme();

  const base =
    'inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const styles = {
    'dark-surface':
      'text-white/60 hover:text-white hover:bg-white/10 focus-visible:ring-white focus-visible:ring-offset-black',
    'light-surface':
      'text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-indigo-600 focus-visible:ring-offset-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-900',
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
