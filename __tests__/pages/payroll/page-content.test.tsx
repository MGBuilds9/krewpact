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
  usePathname: () => '/payroll',
  useParams: () => ({ orgSlug: 'default' }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseTimesheetBatchList = vi.fn();

vi.mock('@/hooks/usePayroll', () => ({
  useTimesheetBatchList: (...args: unknown[]) => mockUseTimesheetBatchList(...args),
  useApproveBatch: () => ({ mutate: vi.fn(), isPending: false }),
  useExportBatchToADP: () => ({ mutate: vi.fn(), isPending: false }),
  generatePayPeriods: () => [
    { start: '2026-03-16', end: '2026-03-29', label: '2026-03-16 – 2026-03-29' },
  ],
}));

vi.mock('@/hooks/useRBAC', () => ({
  useUserRBAC: () => ({
    hasRole: () => true,
    isAdmin: true,
  }),
}));

import PayrollPageContent from '@/app/(dashboard)/org/[orgSlug]/payroll/_page-content';

describe('PayrollPageContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTimesheetBatchList.mockReturnValue({
      data: { data: [], total: 0, hasMore: false },
      isLoading: false,
    });
  });

  it('renders PageHeader with title and description', () => {
    render(<PayrollPageContent />);
    expect(screen.getByText('Payroll')).toBeDefined();
    expect(
      screen.getByText('ADP payroll export and timesheet management'),
    ).toBeDefined();
  });

  it('renders period selector and status filter', () => {
    render(<PayrollPageContent />);
    const comboboxes = screen.getAllByRole('combobox');
    // PayrollPeriodSelector + status filter = 2 comboboxes
    expect(comboboxes.length).toBe(2);
  });

  it('shows loading skeleton when data is loading', () => {
    mockUseTimesheetBatchList.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(<PayrollPageContent />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders TimesheetBatchTable with batches', () => {
    mockUseTimesheetBatchList.mockReturnValue({
      data: {
        data: [
          {
            id: 'batch-1',
            division_id: 'div-1',
            period_start: '2026-03-16',
            period_end: '2026-03-29',
            status: 'submitted',
            submitted_by: 'user-1',
            approved_by: null,
            exported_at: null,
            adp_export_reference: null,
            created_at: '2026-03-16T00:00:00Z',
            updated_at: '2026-03-16T00:00:00Z',
          },
        ],
        total: 1,
        hasMore: false,
      },
      isLoading: false,
    });

    render(<PayrollPageContent />);
    expect(screen.getByText(/2026-03-16/)).toBeDefined();
  });

  it('renders empty table message when no batches', () => {
    render(<PayrollPageContent />);
    expect(screen.getByText(/no timesheet batches found/i)).toBeDefined();
  });
});
