import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  User,
  Users as UsersIcon,
} from 'lucide-react';
import { repository } from '../../services/reservationRepository';
import StatusBadge from '../../components/StatusBadge';
import { formatFriendlyTime, formatFriendlyDate } from '../../domain/time';

export default function OverviewView() {
  const [metrics, setMetrics] = useState(() => repository.getDashboardMetrics());
  const [settings, setSettings] = useState(() => repository.getSettings());

  useEffect(() => {
    const update = () => {
      setMetrics(repository.getDashboardMetrics());
      setSettings(repository.getSettings());
    };
    const unsubscribe = repository.subscribe(update);
    return unsubscribe;
  }, []);

  const statCards = [
    {
      label: "Today's Bookings",
      value: metrics.totalToday,
      sub: `Date: ${metrics.today}`,
      icon: Calendar,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
    {
      label: 'Pending Review',
      value: metrics.pendingToday,
      sub: 'Action required',
      icon: AlertCircle,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      label: 'Confirmed',
      value: metrics.confirmedToday,
      sub: 'Guaranteed tables',
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      label: 'Cancelled / Rejected',
      value: metrics.cancelledToday,
      sub: 'Released tables',
      icon: XCircle,
      color: 'text-slate-700 bg-slate-100 border-slate-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Restaurant Overview</h2>
          <p className="text-sm text-slate-600 mt-1">
            Real-time reservation metrics for {settings.restaurantName} (Asia/Kolkata timezone).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/reservations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <span>Manage All Bookings</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">{card.label}</span>
                <div className={`p-2 rounded-lg border ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900">{card.value}</span>
                <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-Column Section: Upcoming Today & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Today */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Upcoming Today</h3>
              <p className="text-xs text-slate-500">Scheduled active tables for today</p>
            </div>
            <Link
              to="/reservations"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              View all
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {metrics.upcomingToday.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No remaining upcoming reservations for today.
              </div>
            ) : (
              metrics.upcomingToday.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-indigo-700">
                      <Clock className="w-4 h-4" />
                      <span className="text-[10px] font-bold">{r.time}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{r.name}</span>
                        <span className="text-xs text-slate-500">({r.reference})</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <UsersIcon className="w-3 h-3" /> {r.guests} guests
                        </span>
                        {r.tableId && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700">
                            Table {r.tableId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Recent Activity</h3>
              <p className="text-xs text-slate-500">Audit log of reservation actions</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {metrics.recentActivity.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No recent activity recorded yet.
              </div>
            ) : (
              metrics.recentActivity.map((act, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 text-xs p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-900 truncate">
                        {act.name} <span className="text-slate-500 font-normal">({act.reference})</span>
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      {act.from ? (
                        <>
                          Status changed from <span className="font-semibold">{act.from}</span> to{' '}
                          <span className="font-semibold text-indigo-700">{act.to}</span>
                        </>
                      ) : (
                        <>Reservation submitted ({act.to})</>
                      )}
                      {act.reason && <span className="text-slate-500 italic"> &bull; {act.reason}</span>}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
