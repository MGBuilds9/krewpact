'use client';

import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/crm/opportunities',
  useParams: () => ({ orgSlug: 'default' }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockUsePipeline = vi.fn();

vi.mock('@/hooks/useCRM', () => ({
  usePipeline: (...args: unknown[]) => mockUsePipeline(...args),
  useOpportunityStageTransition: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: () => ({
    activeDivision: { id: 'div-1', name: 'MDM Contracting', code: 'contracting' },
    userDivisions: [{ id: 'div-1', name: 'MDM Contracting', code: 'contracting' }],
    isLoading: false,
  }),
  getDivisionFilter: (d: { id?: string } | null | undefined) => d?.id,
  requireConcreteDivision: (d: { id?: string } | null | undefined) => d?.id ?? null,
  isAllDivisions: (d: { id?: string } | null | undefined) => d?.id === '__all_divisions__',
  ALL_DIVISIONS_ID: '__all_divisions__',
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

import OpportunitiesPage from '@/app/(dashboard)/org/[orgSlug]/crm/opportunities/OpportunitiesView';

describe('Opportunities Pipeline Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePipeline.mockReturnValue({
      data: { stages: {} },
      isLoading: false,
      isError: false,
    });
  });

  it('renders pipeline view with stages', () => {
    mockUsePipeline.mockReturnValue({
      data: {
        stages: {
          intake: {
            opportunities: [
              {
                id: 'opp-1',
                opportunity_name: 'Big Reno Job',
                stage: 'intake',
                estimated_revenue: 100000,
                probability_pct: 50,
                target_close_date: null,
                lead_id: null,
                account_id: null,
                contact_id: null,
                division_id: 'div-1',
                owner_user_id: null,
                created_at: '2026-02-12T10:00:00Z',
                updated_at: '2026-02-12T10:00:00Z',
              },
            ],
            total_value: 100000,
            count: 1,
          },
          estimating: { opportunities: [], total_value: 0, count: 0 },
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<OpportunitiesPage />);
    expect(screen.getByText('Big Reno Job')).toBeDefined();
  });

  it('shows loading state', () => {
    mockUsePipeline.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<OpportunitiesPage />);
    // When loading, pipeline stages are not yet rendered
    expect(screen.queryByText('Qualification')).not.toBeInTheDocument();
  });

  it('shows empty pipeline message when no stages data', () => {
    mockUsePipeline.mockReturnValue({
      data: { stages: {} },
      isLoading: false,
      isError: false,
    });

    render(<OpportunitiesPage />);
    expect(screen.getByText(/no opportunities/i)).toBeDefined();
  });
});
