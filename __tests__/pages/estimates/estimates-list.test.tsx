'use client';

import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/estimates',
  useParams: () => ({ orgSlug: 'default' }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock hooks
const mockUseEstimates = vi.fn();

vi.mock('@/hooks/useEstimates', () => ({
  useEstimates: (...args: unknown[]) => mockUseEstimates(...args),
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

import EstimatesListPage from '@/app/(dashboard)/org/[orgSlug]/estimates/page';

describe('Estimates List Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEstimates.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  it('renders the estimates list page', () => {
    mockUseEstimates.mockReturnValue({
      data: [
        {
          id: 'est-1',
          estimate_number: 'EST-2026-001',
          division_id: 'div-1',
          status: 'draft',
          subtotal_amount: 10000,
          tax_amount: 1300,
          total_amount: 11300,
          revision_no: 1,
          currency_code: 'CAD',
          created_at: '2026-02-13T10:00:00Z',
          updated_at: '2026-02-13T10:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<EstimatesListPage />);
    expect(screen.getByText('EST-2026-001')).toBeDefined();
  });

  it('shows empty state when no estimates', () => {
    render(<EstimatesListPage />);
    expect(screen.getByText(/no estimates/i)).toBeDefined();
  });

  it('has search input', () => {
    render(<EstimatesListPage />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeDefined();
  });

  it('has New Estimate button', () => {
    render(<EstimatesListPage />);
    expect(screen.getByText(/new estimate/i)).toBeDefined();
  });

  it('shows loading state', () => {
    mockUseEstimates.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<EstimatesListPage />);
    const skeletons = container.querySelectorAll(
      '[class*="animate-pulse"], [data-testid="skeleton"]',
    );
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays status badges', () => {
    mockUseEstimates.mockReturnValue({
      data: [
        {
          id: 'est-1',
          estimate_number: 'EST-2026-001',
          division_id: 'div-1',
          status: 'review',
          subtotal_amount: 5000,
          tax_amount: 650,
          total_amount: 5650,
          revision_no: 1,
          currency_code: 'CAD',
          created_at: '2026-02-13T10:00:00Z',
          updated_at: '2026-02-13T10:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<EstimatesListPage />);
    expect(screen.getByText('Review')).toBeDefined();
  });
});
