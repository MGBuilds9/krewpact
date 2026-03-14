/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers — inline the logic from the leads page so we can test it in
// isolation without mounting the full 'use client' page component.
// ---------------------------------------------------------------------------

const STATUS_BADGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700 border-gray-200',
  contacted: 'bg-blue-100 text-blue-700 border-blue-200',
  qualified: 'bg-green-100 text-green-700 border-green-200',
  proposal: 'bg-purple-100 text-purple-700 border-purple-200',
  negotiation: 'bg-orange-100 text-orange-700 border-orange-200',
  nurture: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  won: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  lost: 'bg-red-100 text-red-700 border-red-200',
};

function formatStage(stage: string): string {
  return stage
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function isStale(lastTouchAt: string | null, thresholdDays = 14): boolean {
  if (!lastTouchAt) return true;
  const diff = Date.now() - new Date(lastTouchAt).getTime();
  return diff > thresholdDays * 24 * 60 * 60 * 1000;
}

function formatSourceChannel(channel: string | null): string {
  if (!channel) return '-';
  return channel.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// ---------------------------------------------------------------------------
// Test components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-xs border', STATUS_BADGE_COLORS[status] || '')}
      data-testid="status-badge"
    >
      {formatStage(status)}
    </Badge>
  );
}

function StaleIndicator({ lastTouchAt }: { lastTouchAt: string | null }) {
  if (!isStale(lastTouchAt)) return null;
  return <span data-testid="stale-indicator">Stale</span>;
}

function ContactCount({ count }: { count: number }) {
  return <span data-testid="contact-count">{count} contact{count !== 1 ? 's' : ''}</span>;
}

// ---------------------------------------------------------------------------
// Tests: Status badge colors
// ---------------------------------------------------------------------------

describe('Lead status badges', () => {
  it('renders "new" badge with gray styling', () => {
    render(<StatusBadge status="new" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('New');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-700');
  });

  it('renders "contacted" badge with blue styling', () => {
    render(<StatusBadge status="contacted" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('Contacted');
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-700');
  });

  it('renders "won" badge with emerald styling', () => {
    render(<StatusBadge status="won" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('Won');
    expect(badge.className).toContain('bg-emerald-100');
  });

  it('renders "lost" badge with red styling', () => {
    render(<StatusBadge status="lost" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('Lost');
    expect(badge.className).toContain('bg-red-100');
  });

  it('renders unknown status with fallback (no color class crash)', () => {
    render(<StatusBadge status="unknown_stage" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge.textContent).toBe('Unknown Stage');
  });

  it('formats underscore statuses into title case', () => {
    expect(formatStage('new')).toBe('New');
    expect(formatStage('contacted')).toBe('Contacted');
    expect(formatStage('qualified')).toBe('Qualified');
    expect(formatStage('proposal')).toBe('Proposal');
    expect(formatStage('negotiation')).toBe('Negotiation');
    expect(formatStage('nurture')).toBe('Nurture');
    expect(formatStage('won')).toBe('Won');
    expect(formatStage('lost')).toBe('Lost');
  });
});

// ---------------------------------------------------------------------------
// Tests: Stale lead indicator
// ---------------------------------------------------------------------------

describe('Stale lead indicator', () => {
  it('shows stale indicator for leads with null last_touch_at', () => {
    render(<StaleIndicator lastTouchAt={null} />);
    expect(screen.getByTestId('stale-indicator')).toBeInTheDocument();
  });

  it('shows stale indicator for leads not touched in > 14 days', () => {
    const oldDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    render(<StaleIndicator lastTouchAt={oldDate} />);
    expect(screen.getByTestId('stale-indicator')).toBeInTheDocument();
  });

  it('does NOT show stale indicator for recently touched leads', () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    render(<StaleIndicator lastTouchAt={recentDate} />);
    expect(screen.queryByTestId('stale-indicator')).not.toBeInTheDocument();
  });

  it('does NOT show stale indicator for lead touched exactly today', () => {
    render(<StaleIndicator lastTouchAt={new Date().toISOString()} />);
    expect(screen.queryByTestId('stale-indicator')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests: Contact count display
// ---------------------------------------------------------------------------

describe('Contact count display', () => {
  it('shows "1 contact" (singular) for a single contact', () => {
    render(<ContactCount count={1} />);
    expect(screen.getByTestId('contact-count').textContent).toBe('1 contact');
  });

  it('shows "2 contacts" (plural) for multiple contacts', () => {
    render(<ContactCount count={2} />);
    expect(screen.getByTestId('contact-count').textContent).toBe('2 contacts');
  });

  it('shows "0 contacts" for no contacts', () => {
    render(<ContactCount count={0} />);
    expect(screen.getByTestId('contact-count').textContent).toBe('0 contacts');
  });

  it('shows "10 contacts" for ten contacts', () => {
    render(<ContactCount count={10} />);
    expect(screen.getByTestId('contact-count').textContent).toBe('10 contacts');
  });
});

// ---------------------------------------------------------------------------
// Tests: Source channel formatting
// ---------------------------------------------------------------------------

describe('Source channel formatting', () => {
  it('formats "referral" to "Referral"', () => {
    expect(formatSourceChannel('referral')).toBe('Referral');
  });

  it('formats "cold_outreach" to "Cold Outreach"', () => {
    expect(formatSourceChannel('cold_outreach')).toBe('Cold Outreach');
  });

  it('formats "web_form" to "Web Form"', () => {
    expect(formatSourceChannel('web_form')).toBe('Web Form');
  });

  it('returns "-" for null source', () => {
    expect(formatSourceChannel(null)).toBe('-');
  });

  it('formats "apollo" to "Apollo"', () => {
    expect(formatSourceChannel('apollo')).toBe('Apollo');
  });
});
