import React from 'react';
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
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
      {/* Customer Facing Booking Portal */}
      <Route path="/book" element={<BookingPage />} />

      {/* Restaurant Admin Dashboard */}
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<OverviewView />} />
        <Route path="reservations" element={<ReservationsView />} />
        <Route path="tables" element={<TablesView />} />
        <Route path="customers" element={<CustomersView />} />
        <Route path="settings" element={<SettingsView />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App({ initialEntries }) {
  if (initialEntries) {
    return (
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <AppRoutes />
        </MemoryRouter>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ToastProvider>
  );
}
