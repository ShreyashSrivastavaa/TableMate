import React from 'react';
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/landing/LandingPage';
import TermsAndPrivacyPage from './pages/legal/TermsAndPrivacyPage';
import TenantBookingPage from './pages/tenant/TenantBookingPage';
import TenantAdminPage from './pages/tenant/TenantAdminPage';

// Sandbox/Demo views for local test isolation only
import DashboardLayout from './pages/dashboard/DashboardLayout';
import OverviewView from './pages/dashboard/OverviewView';
import ReservationsView from './pages/dashboard/ReservationsView';
import TablesView from './pages/dashboard/TablesView';
import CustomersView from './pages/dashboard/CustomersView';
import SettingsView from './pages/dashboard/SettingsView';
import BookingPage from './pages/booking/BookingPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Production Landing Page (Freshman Dark Minimalist Aesthetic) */}
      <Route path="/" element={<LandingPage />} />

      {/* Production Multi-Tenant Pilot Restaurant Routes */}
      <Route path="/r/:slug/book" element={<TenantBookingPage />} />
      <Route path="/r/:slug/admin" element={<TenantAdminPage />} />

      {/* Legal & Data Transparency */}
      <Route path="/terms" element={<TermsAndPrivacyPage />} />
      <Route path="/privacy" element={<TermsAndPrivacyPage />} />

      {/* Test Sandbox Routes (Used strictly by Vitest journey suites) */}
      <Route path="/sandbox" element={<DashboardLayout />}>
        <Route index element={<OverviewView />} />
        <Route path="reservations" element={<ReservationsView />} />
        <Route path="tables" element={<TablesView />} />
        <Route path="customers" element={<CustomersView />} />
        <Route path="settings" element={<SettingsView />} />
      </Route>
      <Route path="/sandbox/book" element={<BookingPage />} />
      <Route path="/book" element={<BookingPage />} />
      <Route path="/reservations" element={<DashboardLayout />}>
        <Route index element={<ReservationsView />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App({ initialEntries }) {
  if (initialEntries) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <AppRoutes />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
