'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import { PipelineView } from '@/components/CRM/PipelineView';
import type { PipelineData, Opportunity } from '@/hooks/useCRM';

function makeOpp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-1',
    opportunity_name: 'Test Opp',
    lead_id: null,
    account_id: null,
    contact_id: null,
    division_id: null,
    stage: 'intake',
    target_close_date: null,
    estimated_revenue: 50000,
    probability_pct: 60,
    owner_user_id: null,
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-12T10:00:00Z',
    ...overrides,
  };
}

describe('PipelineView', () => {
  it('renders stages as columns', () => {
    const data: PipelineData = {
      stages: {
        intake: { opportunities: [], total_value: 0, count: 0 },
        site_visit: { opportunities: [], total_value: 0, count: 0 },
        estimating: { opportunities: [], total_value: 0, count: 0 },
        proposal: { opportunities: [], total_value: 0, count: 0 },
        negotiation: { opportunities: [], total_value: 0, count: 0 },
        contracted: { opportunities: [], total_value: 0, count: 0 },
        closed_lost: { opportunities: [], total_value: 0, count: 0 },
      },
    };

    render(<PipelineView data={data} />);
    expect(screen.getByText('Intake')).toBeDefined();
    expect(screen.getByText('Site Visit')).toBeDefined();
    expect(screen.getByText('Estimating')).toBeDefined();
    expect(screen.getByText('Proposal')).toBeDefined();
    expect(screen.getByText('Negotiation')).toBeDefined();
    expect(screen.getByText('Contracted')).toBeDefined();
    expect(screen.getByText('Closed Lost')).toBeDefined();
  });

  it('places opportunities in correct columns', () => {
    const data: PipelineData = {
      stages: {
        intake: {
          opportunities: [
            makeOpp({ id: 'opp-1', opportunity_name: 'Alpha Project', stage: 'intake' }),
          ],
          total_value: 50000,
          count: 1,
        },
        estimating: {
          opportunities: [
            makeOpp({ id: 'opp-2', opportunity_name: 'Beta Project', stage: 'estimating' }),
          ],
          total_value: 75000,
          count: 1,
        },
      },
    };

    render(<PipelineView data={data} />);
    expect(screen.getByText('Alpha Project')).toBeDefined();
    expect(screen.getByText('Beta Project')).toBeDefined();
  });

  it('shows column totals', () => {
    const data: PipelineData = {
      stages: {
        intake: {
          opportunities: [
            makeOpp({ id: 'opp-1', estimated_revenue: 50000 }),
            makeOpp({ id: 'opp-2', estimated_revenue: 25000 }),
          ],
          total_value: 75000,
          count: 2,
        },
      },
    };

    render(<PipelineView data={data} />);
    // Should show count (appears in both column badge and pipeline header)
    const countElements = screen.getAllByText('2');
    expect(countElements.length).toBeGreaterThanOrEqual(1);
    // Should show total formatted as currency (in column and pipeline header)
    const totalElements = screen.getAllByText('$75,000.00');
    expect(totalElements.length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty stages', () => {
    const data: PipelineData = {
      stages: {
        intake: { opportunities: [], total_value: 0, count: 0 },
        estimating: { opportunities: [], total_value: 0, count: 0 },
      },
    };

    render(<PipelineView data={data} />);
    expect(screen.getByText('Intake')).toBeDefined();
    expect(screen.getByText('Estimating')).toBeDefined();
  });

  it('handles empty pipeline (no stages data)', () => {
    const data: PipelineData = {
      stages: {},
    };

    render(<PipelineView data={data} />);
    expect(screen.getByText(/no opportunities/i)).toBeDefined();
  });
});
