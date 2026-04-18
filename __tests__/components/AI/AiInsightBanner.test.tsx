import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({}),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('lucide-react', () => ({
  Lightbulb: () => <svg data-testid="lightbulb-icon" />,
  X: () => <svg data-testid="x-icon" />,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import { AiInsightBanner } from '@/components/AI/AiInsightBanner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInsight(overrides: Record<string, unknown> = {}) {
  return {
    id: `insight-${crypto.randomUUID()}`,
    insight_type: 'recommendation',
    title: 'Test Insight Title',
    content: 'This is the insight content.',
    confidence: 0.9,
    action_url: null,
    action_label: null,
    metadata: {},
    created_at: '2026-03-12T10:00:00Z',
    ...overrides,
  };
}

function mockFetch(
  insightsData: { insights?: unknown[] } | null,
  preferencesData: { preferences?: { insight_min_confidence?: number } } | null = {
    preferences: { insight_min_confidence: 0.7 },
  },
  dismissOk = true,
) {
  global.fetch = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url.toString();

    if (urlStr.includes('/api/ai/preferences')) {
      return {
        ok: preferencesData !== null,
        json: async () => preferencesData,
      } as Response;
    }

    if (urlStr.includes('/api/ai/insights') && (_init?.method ?? 'GET') === 'PATCH') {
      return { ok: dismissOk, json: async () => ({ success: dismissOk }) } as Response;
    }

    if (urlStr.includes('/api/ai/insights')) {
      return {
        ok: insightsData !== null,
        json: async () => insightsData,
      } as Response;
    }

    return { ok: false, json: async () => null } as Response;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AiInsightBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Renders nothing (loading state) — component returns null until data arrives
  // -------------------------------------------------------------------------
  it('renders nothing while fetch is in-flight (no visible insights yet)', () => {
    // Make fetch never resolve so component stays in the "fetching" state.
    global.fetch = vi.fn(() => new Promise(() => {})) as any;

    const { container } = render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    // The component returns null when visibleInsights.length === 0 (initial empty state).
    expect(container.firstChild).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 2. Renders insights when API returns data
  // -------------------------------------------------------------------------
  it('renders insight title and content when API returns data', async () => {
    const insight = makeInsight({ title: 'Upsell opportunity', content: 'Client has budget.' });
    mockFetch({ insights: [insight] });

    render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await waitFor(() => {
      expect(screen.getByText('Upsell opportunity')).toBeDefined();
      expect(screen.getByText('Client has budget.')).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Filters insights below min confidence threshold
  // -------------------------------------------------------------------------
  it('hides insights whose confidence is below the preference threshold', async () => {
    const lowConfidence = makeInsight({
      id: 'low',
      title: 'Low confidence insight',
      confidence: 0.5,
    });
    const highConfidence = makeInsight({
      id: 'high',
      title: 'High confidence insight',
      confidence: 0.85,
    });

    mockFetch(
      { insights: [lowConfidence, highConfidence] },
      { preferences: { insight_min_confidence: 0.7 } },
    );

    render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await waitFor(() => {
      expect(screen.getByText('High confidence insight')).toBeDefined();
    });

    expect(screen.queryByText('Low confidence insight')).toBeNull();
  });

  it('shows insight exactly at the threshold confidence', async () => {
    const atThreshold = makeInsight({ title: 'At-threshold insight', confidence: 0.7 });
    mockFetch({ insights: [atThreshold] }, { preferences: { insight_min_confidence: 0.7 } });

    render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await waitFor(() => {
      expect(screen.getByText('At-threshold insight')).toBeDefined();
    });
  });

  it('uses default threshold of 0.7 when preferences API fails', async () => {
    // Preferences endpoint fails; fallback should be 0.7.
    const aboveDefault = makeInsight({ title: 'Above default threshold', confidence: 0.8 });
    const belowDefault = makeInsight({ title: 'Below default threshold', confidence: 0.6 });

    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/ai/preferences')) {
        return { ok: false, json: async () => null } as Response;
      }
      return {
        ok: true,
        json: async () => ({ insights: [aboveDefault, belowDefault] }),
      } as Response;
    });

    render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await waitFor(() => {
      expect(screen.getByText('Above default threshold')).toBeDefined();
    });

    expect(screen.queryByText('Below default threshold')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 4. Shows nothing when no insights exist
  // -------------------------------------------------------------------------
  it('renders nothing when API returns an empty insights array', async () => {
    mockFetch({ insights: [] });

    const { container } = render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    // Give effects a tick to settle.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when API returns null data', async () => {
    mockFetch(null);

    const { container } = render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(container.firstChild).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 5. Dismiss button calls PATCH and removes insight from UI
  // -------------------------------------------------------------------------
  it('dismiss button removes insight from UI immediately (optimistic)', async () => {
    const insight = makeInsight({ id: 'insight-abc', title: 'Dismissable insight' });
    mockFetch({ insights: [insight] });

    render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await waitFor(() => {
      expect(screen.getByText('Dismissable insight')).toBeDefined();
    });

    const dismissButton = screen.getByRole('button', { name: /dismiss insight/i });
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Dismissable insight')).toBeNull();
    });
  });

  it('dismiss button calls PATCH /api/ai/insights/[id]/dismiss', async () => {
    const insight = makeInsight({ id: 'insight-xyz' });
    mockFetch({ insights: [insight] });

    render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /dismiss insight/i })).toBeDefined();
    });

    const dismissButton = screen.getByRole('button', { name: /dismiss insight/i });
    await act(async () => {
      fireEvent.click(dismissButton);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/ai/insights/insight-xyz/dismiss', {
      method: 'PATCH',
    });
  });

  it('removing last insight hides the container', async () => {
    const insight = makeInsight({ id: 'only-one', title: 'Only insight' });
    mockFetch({ insights: [insight] });

    const { container } = render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await waitFor(() => {
      expect(screen.getByText('Only insight')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /dismiss insight/i }));

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 6. Action button navigates when action_url exists
  // -------------------------------------------------------------------------
  it('renders action link when action_url and action_label are provided', async () => {
    const insight = makeInsight({
      action_url: '/org/test-org/crm/opportunities/opp-1',
      action_label: 'View Opportunity',
    });
    mockFetch({ insights: [insight] });

    render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'View Opportunity' });
      expect(link).toBeDefined();
      expect((link as HTMLAnchorElement).href).toContain('/org/test-org/crm/opportunities/opp-1');
    });
  });

  it('does not render action link when action_url is null', async () => {
    const insight = makeInsight({ action_url: null, action_label: null });
    mockFetch({ insights: [insight] });

    render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await waitFor(() => {
      expect(screen.getByText(insight.title as string)).toBeDefined();
    });

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('does not render action link when action_label is null even if action_url is set', async () => {
    const insight = makeInsight({ action_url: '/some/path', action_label: null });
    mockFetch({ insights: [insight] });

    render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await waitFor(() => {
      expect(screen.getByText(insight.title as string)).toBeDefined();
    });

    expect(screen.queryByRole('link')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 7. Error state when API fails — component should fail silently
  // -------------------------------------------------------------------------
  it('renders nothing when insights API throws (fails silently)', async () => {
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/ai/preferences')) {
        return {
          ok: true,
          json: async () => ({ preferences: { insight_min_confidence: 0.7 } }),
        } as Response;
      }
      throw new Error('Network error');
    });

    const { container } = render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when insights API returns non-ok response', async () => {
    mockFetch(null);

    const { container } = render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(container.firstChild).toBeNull();
  });

  it('continues to show remaining insights when dismiss PATCH fails', async () => {
    const insight = makeInsight({ id: 'persist-me', title: 'Should be dismissed optimistically' });
    global.fetch = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/ai/preferences')) {
        return {
          ok: true,
          json: async () => ({ preferences: { insight_min_confidence: 0.7 } }),
        } as Response;
      }
      if (urlStr.includes('/dismiss')) {
        throw new Error('PATCH failed');
      }
      return { ok: true, json: async () => ({ insights: [insight] }) } as Response;
    });

    render(<AiInsightBanner entityType="lead" entityId="lead-1" />);

    await waitFor(() => {
      expect(screen.getByText('Should be dismissed optimistically')).toBeDefined();
    });

    // Dismiss fires — optimistic removal still happens even if PATCH throws
    const dismissButton = screen.getByRole('button', { name: /dismiss insight/i });
    await act(async () => {
      fireEvent.click(dismissButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Should be dismissed optimistically')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 8. Multiple insights render correctly
  // -------------------------------------------------------------------------
  it('renders multiple insights in the same container', async () => {
    const insights = [
      makeInsight({ id: 'a', title: 'First insight', content: 'Content A', confidence: 0.9 }),
      makeInsight({ id: 'b', title: 'Second insight', content: 'Content B', confidence: 0.8 }),
      makeInsight({ id: 'c', title: 'Third insight', content: 'Content C', confidence: 0.75 }),
    ];
    mockFetch({ insights });

    render(<AiInsightBanner entityType="opportunity" entityId="opp-99" />);

    await waitFor(() => {
      expect(screen.getByText('First insight')).toBeDefined();
      expect(screen.getByText('Second insight')).toBeDefined();
      expect(screen.getByText('Third insight')).toBeDefined();
    });

    expect(screen.getAllByRole('button', { name: /dismiss insight/i })).toHaveLength(3);
  });

  it('each insight has its own dismiss button that removes only that insight', async () => {
    const insights = [
      makeInsight({ id: 'keep', title: 'Keep this one', confidence: 0.9 }),
      makeInsight({ id: 'remove', title: 'Remove this one', confidence: 0.85 }),
    ];
    mockFetch({ insights });

    render(<AiInsightBanner entityType="lead" entityId="lead-multi" />);

    await waitFor(() => {
      expect(screen.getByText('Keep this one')).toBeDefined();
      expect(screen.getByText('Remove this one')).toBeDefined();
    });

    // Dismiss buttons appear in DOM order matching the visible insights order.
    const dismissButtons = screen.getAllByRole('button', { name: /dismiss insight/i });
    expect(dismissButtons).toHaveLength(2);

    // Click the second dismiss button (Remove this one)
    await act(async () => {
      fireEvent.click(dismissButtons[1]);
    });

    await waitFor(() => {
      expect(screen.queryByText('Remove this one')).toBeNull();
    });

    // The other insight should still be visible
    expect(screen.getByText('Keep this one')).toBeDefined();
  });

  it('only shows insights that pass the confidence filter from multiple mixed', async () => {
    const insights = [
      makeInsight({ id: 'pass-1', title: 'Passes filter', confidence: 0.8 }),
      makeInsight({ id: 'fail-1', title: 'Fails filter', confidence: 0.4 }),
      makeInsight({ id: 'pass-2', title: 'Also passes', confidence: 1.0 }),
    ];
    mockFetch({ insights }, { preferences: { insight_min_confidence: 0.75 } });

    render(<AiInsightBanner entityType="account" entityId="acct-1" />);

    await waitFor(() => {
      expect(screen.getByText('Passes filter')).toBeDefined();
      expect(screen.getByText('Also passes')).toBeDefined();
    });

    expect(screen.queryByText('Fails filter')).toBeNull();
    expect(screen.getAllByRole('button', { name: /dismiss insight/i })).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // 9. Fetch URL is correctly constructed from props
  // -------------------------------------------------------------------------
  it('fetches insights with encoded entityType and entityId query params', async () => {
    mockFetch({ insights: [] });

    render(<AiInsightBanner entityType="project" entityId="proj-42" />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ai/insights?entity_type=project&entity_id=proj-42',
    );
  });

  it('does not fetch when entityType is empty', async () => {
    // Preferences fetch still runs; only the insights fetch is guarded by the early return.
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/ai/preferences')) {
        return {
          ok: true,
          json: async () => ({ preferences: { insight_min_confidence: 0.7 } }),
        } as Response;
      }
      // Should never reach here when entityType is empty
      throw new Error(`Unexpected fetch call: ${urlStr}`);
    }) as any;

    render(<AiInsightBanner entityType="" entityId="lead-1" />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const calls = (global.fetch as any).mock.calls as [string][];
    const insightCalls = calls.filter(([url]: [string]) => url.includes('/api/ai/insights?'));
    expect(insightCalls).toHaveLength(0);
  });

  it('does not fetch when entityId is empty', async () => {
    // Preferences fetch still runs; only the insights fetch is guarded by the early return.
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/ai/preferences')) {
        return {
          ok: true,
          json: async () => ({ preferences: { insight_min_confidence: 0.7 } }),
        } as Response;
      }
      // Should never reach here when entityId is empty
      throw new Error(`Unexpected fetch call: ${urlStr}`);
    }) as any;

    render(<AiInsightBanner entityType="lead" entityId="" />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const calls = (global.fetch as any).mock.calls as [string][];
    const insightCalls = calls.filter(([url]: [string]) => url.includes('/api/ai/insights?'));
    expect(insightCalls).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 10. Accessibility
  // -------------------------------------------------------------------------
  it('dismiss button has accessible aria-label', async () => {
    const insight = makeInsight({ title: 'Accessible insight' });
    mockFetch({ insights: [insight] });

    render(<AiInsightBanner entityType="lead" entityId="lead-a11y" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dismiss insight' })).toBeDefined();
    });
  });

  it('renders Lightbulb icon for each insight', async () => {
    const insights = [
      makeInsight({ id: 'i1', title: 'Insight one', confidence: 0.9 }),
      makeInsight({ id: 'i2', title: 'Insight two', confidence: 0.8 }),
    ];
    mockFetch({ insights });

    render(<AiInsightBanner entityType="lead" entityId="lead-icon" />);

    await waitFor(() => {
      expect(screen.getAllByTestId('lightbulb-icon')).toHaveLength(2);
    });
  });
});
