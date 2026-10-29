import React from 'react';
import { RESERVATION_STATUS } from '../domain/constants';

export default function StatusBadge({ status }) {
  let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-300';
  let label = status || 'Unknown';
  let dotColor = 'bg-slate-500';

  switch (status) {
    case RESERVATION_STATUS.PENDING:
      badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300';
      dotColor = 'bg-amber-500';
      label = 'Pending Review';
      break;
    case RESERVATION_STATUS.CONFIRMED:
      badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      dotColor = 'bg-emerald-600';
      label = 'Confirmed';
      break;
    case RESERVATION_STATUS.CANCELLED:
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
      dotColor = 'bg-slate-500';
      label = 'Cancelled';
      break;
    case RESERVATION_STATUS.REJECTED:
      badgeStyle = 'bg-rose-50 text-rose-800 border-rose-300';
      dotColor = 'bg-rose-600';
      label = 'Rejected';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
