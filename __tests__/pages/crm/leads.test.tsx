'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/crm/leads',
  useParams: () => ({ orgSlug: 'default', id: 'test-lead-id' }),
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
  useDeleteLead: () => ({ mutate: vi.fn(), isPending: false }),
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

import LeadsPage from '@/app/(dashboard)/org/[orgSlug]/crm/leads/page';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Leads List Page', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLeads.mockReturnValue({
      data: { data: [], total: 0, hasMore: false },
      isLoading: false,
      isError: false,
    });
  });

  it('renders the leads list page', () => {
    mockUseLeads.mockReturnValue({
      data: {
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
        total: 1,
        hasMore: false,
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<LeadsPage />);
    expect(screen.getByText('Acme Reno Project')).toBeDefined();
  });

  it('shows empty state when no leads', () => {
    mockUseLeads.mockReturnValue({
      data: { data: [], total: 0, hasMore: false },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<LeadsPage />);
    expect(screen.getByText(/no leads/i)).toBeDefined();
  });

  it('has search input for filtering', () => {
    renderWithProviders(<LeadsPage />);
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeDefined();
  });

  it('has New Lead button', () => {
    renderWithProviders(<LeadsPage />);
    expect(screen.getByText(/new lead/i)).toBeDefined();
  });

  it('shows loading state', () => {
    mockUseLeads.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = renderWithProviders(<LeadsPage />);
    // Should show skeleton loading elements
    const skeletons = container.querySelectorAll(
      '[class*="animate-pulse"], [data-testid="skeleton"]',
    );
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays status badges with appropriate styling', () => {
    mockUseLeads.mockReturnValue({
      data: {
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
        total: 1,
        hasMore: false,
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<LeadsPage />);
    expect(screen.getByText('Qualified')).toBeDefined();
  });
});
