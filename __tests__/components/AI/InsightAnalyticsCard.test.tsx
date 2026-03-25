import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InsightAnalyticsCard } from '@/components/AI/InsightAnalyticsCard';

const mockAnalytics = {
  total_generated: 120,
  total_dismissed: 30,
  total_acted_on: 48,
  dismiss_rate: 25,
  action_rate: 40,
  by_type: {
    lead_follow_up: { total: 55, dismissed: 10, acted_on: 25 },
    project_risk: { total: 40, dismissed: 15, acted_on: 18 },
    upsell_opportunity: { total: 25, dismissed: 5, acted_on: 5 },
  },
  total_ai_cost_cents: 347,
};

describe('InsightAnalyticsCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders null (loading state) before fetch resolves', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));

    const { container } = render(<InsightAnalyticsCard />);

    expect(container.firstChild).toBeNull();
  });

  it('renders analytics stats after successful fetch', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ analytics: mockAnalytics }), { status: 200 }),
    );

    render(<InsightAnalyticsCard />);

    // total generated
    expect(await screen.findByText('120')).toBeInTheDocument();
    // action rate
    expect(screen.getByText('40%')).toBeInTheDocument();
    // dismiss rate
    expect(screen.getByText('25%')).toBeInTheDocument();
    // cost: 347 cents = $3.47
    expect(screen.getByText('$3.47')).toBeInTheDocument();
    // card title
    expect(screen.getByText('AI Insight Analytics')).toBeInTheDocument();
  });

  it('renders stat labels alongside the values', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ analytics: mockAnalytics }), { status: 200 }),
    );

    render(<InsightAnalyticsCard />);

    await screen.findByText('120');

    expect(screen.getByText('Generated')).toBeInTheDocument();
    expect(screen.getByText('Action Rate')).toBeInTheDocument();
    expect(screen.getByText('Dismiss Rate')).toBeInTheDocument();
    expect(screen.getByText('Total AI Cost')).toBeInTheDocument();
  });

  it('renders insight type breakdown sorted by total descending', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ analytics: mockAnalytics }), { status: 200 }),
    );

    render(<InsightAnalyticsCard />);

    await screen.findByText('120');

    // section heading
    expect(screen.getByText('By Insight Type')).toBeInTheDocument();

    // type labels (underscores replaced with spaces, Title Case via formatStatus)
    expect(screen.getByText('Lead Follow Up')).toBeInTheDocument();
    expect(screen.getByText('Project Risk')).toBeInTheDocument();
    expect(screen.getByText('Upsell Opportunity')).toBeInTheDocument();

    // per-row totals
    expect(screen.getByText('55 total · 25 acted · 10 dismissed')).toBeInTheDocument();
    expect(screen.getByText('40 total · 18 acted · 15 dismissed')).toBeInTheDocument();
    expect(screen.getByText('25 total · 5 acted · 5 dismissed')).toBeInTheDocument();

    // order: lead_follow_up (55) > project_risk (40) > upsell_opportunity (25)
    const rows = screen.getAllByText(/total · \d+ acted/);
    expect(rows[0].textContent).toContain('55');
    expect(rows[1].textContent).toContain('40');
    expect(rows[2].textContent).toContain('25');
  });

  it('renders nothing when analytics has no by_type entries', async () => {
    const emptyAnalytics = {
      ...mockAnalytics,
      total_generated: 0,
      total_dismissed: 0,
      total_acted_on: 0,
      dismiss_rate: 0,
      action_rate: 0,
      by_type: {},
      total_ai_cost_cents: 0,
    };

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ analytics: emptyAnalytics }), { status: 200 }),
    );

    render(<InsightAnalyticsCard />);

    // zero values render, but "By Insight Type" section is absent
    expect(await screen.findByText('0')).toBeInTheDocument();
    expect(screen.queryByText('By Insight Type')).not.toBeInTheDocument();
  });

  it('formats cost correctly for zero cents', async () => {
    const zeroAnalytics = { ...mockAnalytics, total_ai_cost_cents: 0 };

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ analytics: zeroAnalytics }), { status: 200 }),
    );

    render(<InsightAnalyticsCard />);

    expect(await screen.findByText('$0.00')).toBeInTheDocument();
  });

  it('renders nothing when API returns no analytics object', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    const { container } = render(<InsightAnalyticsCard />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders nothing when API returns a non-ok response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    const { container } = render(<InsightAnalyticsCard />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders nothing when fetch throws a network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'));

    const { container } = render(<InsightAnalyticsCard />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('fetches from the correct endpoint', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ analytics: mockAnalytics }), { status: 200 }),
      );

    render(<InsightAnalyticsCard />);
    await screen.findByText('AI Insight Analytics');

    expect(fetchSpy).toHaveBeenCalledWith('/api/ai/analytics');
  });
});
