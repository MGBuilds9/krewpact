import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SystemHealthCard } from '@/components/Admin/SystemHealthCard';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockHealthOk() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      status: 'ok',
      timestamp: '2026-03-25T10:00:00Z',
      checks: {
        supabase: 'ok',
        clerk: 'ok',
        erpnext: 'ok',
        redis: 'ok',
        sentry: 'ok',
      },
    }),
  });
}

function mockHealthDegraded() {
  mockFetch.mockResolvedValue({
    ok: false,
    json: async () => ({
      status: 'degraded',
      timestamp: '2026-03-25T10:00:00Z',
      checks: {
        supabase: 'ok',
        clerk: 'ok',
        erpnext: 'down',
        redis: 'degraded',
        sentry: 'ok',
      },
    }),
  });
}

describe('SystemHealthCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders System Health title', () => {
    mockHealthOk();
    render(<SystemHealthCard />);
    expect(screen.getByText('System Health')).toBeDefined();
  });

  it('renders loading skeletons initially', () => {
    // Delay fetch resolution to keep loading state
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { container } = render(<SystemHealthCard />);
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });

  it('renders service rows after fetch resolves', async () => {
    mockHealthOk();
    render(<SystemHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('Supabase')).toBeDefined();
    });

    expect(screen.getByText('Clerk Auth')).toBeDefined();
    expect(screen.getByText('ERPNext')).toBeDefined();
    expect(screen.getByText('Redis')).toBeDefined();
    expect(screen.getByText('Sentry')).toBeDefined();
  });

  it('shows ok status in header when all services healthy', async () => {
    mockHealthOk();
    render(<SystemHealthCard />);

    await waitFor(() => {
      const okItems = screen.getAllByText('ok');
      expect(okItems.length).toBeGreaterThan(0);
    });
  });

  it('shows degraded status in header when a service is down', async () => {
    mockHealthDegraded();
    render(<SystemHealthCard />);

    await waitFor(() => {
      const degradedItems = screen.getAllByText('degraded');
      expect(degradedItems.length).toBeGreaterThan(0);
    });
  });

  it('shows individual service status values', async () => {
    mockHealthDegraded();
    render(<SystemHealthCard />);

    await waitFor(() => {
      expect(screen.getByText('ERPNext')).toBeDefined();
    });

    const allDown = screen.getAllByText('down');
    expect(allDown.length).toBeGreaterThan(0);
  });

  it('fetches /api/health?deep=true on mount', async () => {
    mockHealthOk();
    render(<SystemHealthCard />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/health?deep=true');
    });
  });

  it('refreshes health data every 60 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockHealthOk();
    render(<SystemHealthCard />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    vi.advanceTimersByTime(60_000);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});
