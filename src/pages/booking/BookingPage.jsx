import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import BookingForm from './BookingForm';
import ChatSimulation from './ChatSimulation';
import BookingConfirmation from './BookingConfirmation';
import { repository } from '../../services/reservationRepository';
import { Utensils, MessageSquare, MapPin, Clock, Phone, Sparkles } from 'lucide-react';

export default function BookingPage() {
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'chat'
  const [settings, setSettings] = useState(() => repository.getSettings());
  const [completedReservation, setCompletedReservation] = useState(null);

  useEffect(() => {
    const unsubscribe = repository.subscribe(() => {
      setSettings(repository.getSettings());
    });
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      <DemoBanner />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* Restaurant Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-6 text-center">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Utensils className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {settings.restaurantName}
          </h1>
          {settings.tagline && (
            <p className="text-sm text-indigo-600 font-medium mt-1">{settings.tagline}</p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{settings.address}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Open: {settings.openTime} &ndash; {settings.closeTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{settings.contactPhone}</span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs (Only if not completed) */}
        {!completedReservation && (
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white p-1 rounded-xl border border-slate-300 shadow-sm flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'form'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Step-by-Step Form</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'chat'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Simulated Chat</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        {completedReservation ? (
          <BookingConfirmation
            reservation={completedReservation}
            restaurantSettings={settings}
            onBookAnother={() => setCompletedReservation(null)}
          />
        ) : activeTab === 'form' ? (
          <BookingForm
            restaurantSettings={settings}
            onSuccess={(created) => setCompletedReservation(created)}
          />
        ) : (
          <ChatSimulation
            restaurantSettings={settings}
            onSwitchToForm={() => setActiveTab('form')}
            onSuccess={(created) => setCompletedReservation(created)}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <p>
          TableMate AI Demo &bull; Fictional restaurant, sample data, not a live system.
        </p>
        <p className="mt-1 text-slate-400">
          Data is stored locally in your browser. Open <a href="/" className="underline text-indigo-600">Dashboard</a> in another tab of this same browser to view live updates.
        </p>
      </footer>
    </div>
  );
}
