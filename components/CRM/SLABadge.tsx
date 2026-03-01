'use client';

import type { SLAStatus } from '@/lib/crm/sla-config';

interface SLABadgeProps {
  sla: SLAStatus | null;
}

export function SLABadge({ sla }: SLABadgeProps) {
  if (!sla) return null;

  if (sla.isOverdue) {
    const overdueHours = Math.max(0, sla.hoursElapsed - sla.maxHours);
    const label = overdueHours >= 24
      ? `${Math.floor(overdueHours / 24)}d overdue`
      : `${Math.floor(overdueHours)}h overdue`;

    return (
      <span
        className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
        title={`SLA: ${sla.label} — ${label}`}
      >
        {label}
      </span>
    );
  }

  if (sla.percentUsed >= 75) {
    const hoursLeft = Math.floor(sla.hoursRemaining);
    const label = hoursLeft >= 24
      ? `${Math.floor(hoursLeft / 24)}d left`
      : `${hoursLeft}h left`;

    return (
      <span
        className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
        title={`SLA: ${sla.label} — ${label}`}
      >
        {label}
      </span>
    );
  }

  return null;
}
