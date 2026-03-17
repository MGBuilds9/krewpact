import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SLABadge } from '@/components/CRM/SLABadge';
import type { SLAStatus } from '@/lib/crm/sla-config';

describe('SLABadge', () => {
  it('renders nothing when sla is null', () => {
    const { container } = render(<SLABadge sla={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when under 75% used', () => {
    const sla: SLAStatus = {
      isOverdue: false,
      hoursRemaining: 36,
      hoursElapsed: 12,
      maxHours: 48,
      label: '48 hours',
      percentUsed: 25,
    };
    const { container } = render(<SLABadge sla={sla} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders amber warning when 75-100% used', () => {
    const sla: SLAStatus = {
      isOverdue: false,
      hoursRemaining: 8,
      hoursElapsed: 40,
      maxHours: 48,
      label: '48 hours',
      percentUsed: 83,
    };
    render(<SLABadge sla={sla} />);
    expect(screen.getByText('8h left')).toBeInTheDocument();
  });

  it('renders red overdue badge', () => {
    const sla: SLAStatus = {
      isOverdue: true,
      hoursRemaining: 0,
      hoursElapsed: 72,
      maxHours: 48,
      label: '48 hours',
      percentUsed: 100,
    };
    render(<SLABadge sla={sla} />);
    expect(screen.getByText('1d overdue')).toBeInTheDocument();
  });

  it('shows hours when overdue less than 24h', () => {
    const sla: SLAStatus = {
      isOverdue: true,
      hoursRemaining: 0,
      hoursElapsed: 60,
      maxHours: 48,
      label: '48 hours',
      percentUsed: 100,
    };
    render(<SLABadge sla={sla} />);
    expect(screen.getByText('12h overdue')).toBeInTheDocument();
  });

  it('shows days remaining when > 24h left', () => {
    const sla: SLAStatus = {
      isOverdue: false,
      hoursRemaining: 30,
      hoursElapsed: 90,
      maxHours: 120,
      label: '5 days',
      percentUsed: 75,
    };
    render(<SLABadge sla={sla} />);
    expect(screen.getByText('1d left')).toBeInTheDocument();
  });
});
