'use client';

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/crm/accounts',
  useParams: () => ({ orgSlug: 'default', id: 'test-account-id' }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseAccounts = vi.fn();
const mockUseAccount = vi.fn();
const mockUseContacts = vi.fn();
const mockUseOpportunities = vi.fn();
const mockUseActivities = vi.fn();

vi.mock('@/hooks/useCRM', () => ({
  useAccounts: (...args: unknown[]) => mockUseAccounts(...args),
  useAccount: (...args: unknown[]) => mockUseAccount(...args),
  useContacts: (...args: unknown[]) => mockUseContacts(...args),
  useOpportunities: (...args: unknown[]) => mockUseOpportunities(...args),
  useActivities: (...args: unknown[]) => mockUseActivities(...args),
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

import AccountsPage from '@/app/(dashboard)/org/[orgSlug]/crm/accounts/page';

describe('Accounts List Page', () => {
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
    mockUseAccounts.mockReturnValue({
      data: { data: [], total: 0, hasMore: false },
      isLoading: false,
      isError: false,
    });
  });

  it('renders accounts list with data', () => {
    mockUseAccounts.mockReturnValue({
      data: {
        data: [
          {
            id: 'acc-1',
            account_name: 'Acme Corp',
            account_type: 'client',
            division_id: 'div-1',
            billing_address: null,
            shipping_address: null,
            notes: null,
            created_at: '2026-02-12T10:00:00Z',
            updated_at: '2026-02-12T10:00:00Z',
          },
        ],
        total: 1,
        hasMore: false,
      },
      isLoading: false,
      isError: false,
    });

    render(<AccountsPage />);
    expect(screen.getByText('Acme Corp')).toBeDefined();
  });

  it('shows empty state when no accounts', () => {
    render(<AccountsPage />);
    expect(screen.getByText(/no accounts/i)).toBeDefined();
  });

  it('has search input', () => {
    render(<AccountsPage />);
    expect(screen.getByPlaceholderText(/search/i)).toBeDefined();
  });

  it('has New Account button', () => {
    render(<AccountsPage />);
    expect(screen.getByText(/new account/i)).toBeDefined();
  });

  it('shows loading state', () => {
    mockUseAccounts.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<AccountsPage />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
