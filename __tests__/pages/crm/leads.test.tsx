'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/crm/leads',
  useParams: () => ({ id: 'test-lead-id' }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock hooks
const mockUseLeads = vi.fn();
const mockUseLead = vi.fn();
const mockUseActivities = vi.fn();
const mockUseLeadStageTransition = vi.fn();
const mockUseCreateOpportunity = vi.fn();

vi.mock('@/hooks/useCRM', () => ({
  useLeads: (...args: unknown[]) => mockUseLeads(...args),
  useLead: (...args: unknown[]) => mockUseLead(...args),
  useActivities: (...args: unknown[]) => mockUseActivities(...args),
  useLeadStageTransition: () => mockUseLeadStageTransition(),
  useCreateOpportunity: () => mockUseCreateOpportunity(),
}));

vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: () => ({
    activeDivision: { id: 'div-1', name: 'MDM Contracting', code: 'contracting' },
    userDivisions: [{ id: 'div-1', name: 'MDM Contracting', code: 'contracting' }],
    isLoading: false,
  }),
}));

// Mock useIsMobile for ResponsiveTable
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

import LeadsPage from '@/app/(dashboard)/crm/leads/page';

describe('Leads List Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLeads.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  it('renders the leads list page', () => {
    mockUseLeads.mockReturnValue({
      data: [
        {
          id: 'lead-1',
          company_name: 'Acme Reno Project',
          status: 'new',
          lead_score: null,
          is_qualified: false,
          industry: null,
          city: null,
          province: null,
          created_at: '2026-02-12T10:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<LeadsPage />);
    expect(screen.getByText('Acme Reno Project')).toBeDefined();
  });

  it('shows empty state when no leads', () => {
    mockUseLeads.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<LeadsPage />);
    expect(screen.getByText(/no leads/i)).toBeDefined();
  });

  it('has search input for filtering', () => {
    render(<LeadsPage />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeDefined();
  });

  it('has New Lead button', () => {
    render(<LeadsPage />);
    expect(screen.getByText(/new lead/i)).toBeDefined();
  });

  it('shows loading state', () => {
    mockUseLeads.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<LeadsPage />);
    // Should show skeleton loading elements
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays status badges with appropriate styling', () => {
    mockUseLeads.mockReturnValue({
      data: [
        {
          id: 'lead-1',
          company_name: 'Test Lead',
          status: 'qualified',
          lead_score: null,
          is_qualified: false,
          industry: null,
          city: null,
          province: null,
          created_at: '2026-02-12T10:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<LeadsPage />);
    expect(screen.getByText('Qualified')).toBeDefined();
  });
});
