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
  usePathname: () => '/estimates/est-1',
  useParams: () => ({ orgSlug: 'default', id: 'est-1' }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock hooks
const mockUseEstimate = vi.fn();
const mockUseEstimateLines = vi.fn();
const mockUseEstimateVersions = vi.fn();
const mockUseUpdateEstimate = vi.fn();
const mockUseAddEstimateLine = vi.fn();
const mockUseDeleteEstimateLine = vi.fn();
const mockUseCreateEstimateVersion = vi.fn();

vi.mock('@/hooks/useEstimates', () => ({
  useEstimate: (...args: unknown[]) => mockUseEstimate(...args),
  useEstimateLines: (...args: unknown[]) => mockUseEstimateLines(...args),
  useEstimateVersions: (...args: unknown[]) => mockUseEstimateVersions(...args),
  useUpdateEstimate: () => mockUseUpdateEstimate(),
  useAddEstimateLine: () => mockUseAddEstimateLine(),
  useDeleteEstimateLine: () => mockUseDeleteEstimateLine(),
  useCreateEstimateVersion: () => mockUseCreateEstimateVersion(),
}));

vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: () => ({
    activeDivision: { id: 'div-1', name: 'MDM Contracting', code: 'contracting' },
    userDivisions: [{ id: 'div-1', name: 'MDM Contracting', code: 'contracting' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/hooks/useEstimating', () => ({
  useEstimateAllowances: () => ({ data: [], isLoading: false }),
  useEstimateAlternates: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useContracting', () => ({
  useCreateProposal: () => ({ mutate: vi.fn(), isPending: false }),
}));

import EstimateBuilderPage from '@/app/(dashboard)/org/[orgSlug]/estimates/[id]/page';

const mockEstimate = {
  id: 'est-1',
  estimate_number: 'EST-2026-001',
  division_id: 'div-1',
  opportunity_id: null,
  account_id: null,
  contact_id: null,
  status: 'draft',
  currency_code: 'CAD',
  subtotal_amount: 1725,
  tax_amount: 224.25,
  total_amount: 1949.25,
  revision_no: 1,
  created_by: 'user-1',
  created_at: '2026-02-13T10:00:00Z',
  updated_at: '2026-02-13T10:00:00Z',
};

const mockLines = [
  {
    id: 'line-1',
    estimate_id: 'est-1',
    parent_line_id: null,
    line_type: 'item',
    description: 'Concrete foundation',
    quantity: 10,
    unit: 'cu yd',
    unit_cost: 150,
    markup_pct: 15,
    line_total: 1725,
    is_optional: false,
    sort_order: 1,
    created_at: '2026-02-13T10:00:00Z',
    updated_at: '2026-02-13T10:00:00Z',
  },
];

describe('Estimate Builder Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEstimate.mockReturnValue({
      data: mockEstimate,
      isLoading: false,
      isError: false,
    });
    mockUseEstimateLines.mockReturnValue({
      data: mockLines,
      isLoading: false,
    });
    mockUseEstimateVersions.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseUpdateEstimate.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseAddEstimateLine.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeleteEstimateLine.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseCreateEstimateVersion.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('renders estimate number and status', () => {
    render(<EstimateBuilderPage />);
    expect(screen.getByText('EST-2026-001')).toBeDefined();
    expect(screen.getByText('Draft')).toBeDefined();
  });

  it('shows line items', () => {
    render(<EstimateBuilderPage />);
    expect(screen.getByDisplayValue('Concrete foundation')).toBeDefined();
  });

  it('shows totals panel with subtotal, HST, total', () => {
    render(<EstimateBuilderPage />);
    expect(screen.getByText('Subtotal')).toBeDefined();
    expect(screen.getByText(/HST 13%/)).toBeDefined();
    // "Total" appears as both CardTitle "Totals" and TotalsPanel label "Total"
    expect(screen.getAllByText(/^Total/).length).toBeGreaterThanOrEqual(2);
  });

  it('has Save Version button', () => {
    render(<EstimateBuilderPage />);
    expect(screen.getByText(/save version/i)).toBeDefined();
  });

  it('shows status transition button for draft estimate', () => {
    render(<EstimateBuilderPage />);
    // Draft can transition to Review
    expect(screen.getByText(/submit for review/i)).toBeDefined();
  });

  it('shows loading skeleton when data is loading', () => {
    mockUseEstimate.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<EstimateBuilderPage />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows not found state for missing estimate', () => {
    mockUseEstimate.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });

    render(<EstimateBuilderPage />);
    expect(screen.getByText(/not found/i)).toBeDefined();
  });

  it('shows version history section', () => {
    mockUseEstimateVersions.mockReturnValue({
      data: [
        {
          id: 'ver-1',
          estimate_id: 'est-1',
          revision_no: 1,
          snapshot: { estimate: {}, lines: [] },
          reason: 'Initial draft',
          created_by: 'user-1',
          created_at: '2026-02-13T10:00:00Z',
        },
      ],
      isLoading: false,
    });

    render(<EstimateBuilderPage />);
    expect(screen.getByText(/version history/i)).toBeDefined();
    // "Revision 1" appears in estimate header (VersionHistory is dynamic-loaded)
    expect(screen.getAllByText(/Revision 1/).length).toBeGreaterThanOrEqual(1);
  });
});
