'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/crm/contacts',
  useParams: () => ({ orgSlug: 'default' }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseContacts = vi.fn();

vi.mock('@/hooks/useCRM', () => ({
  useContacts: (...args: unknown[]) => mockUseContacts(...args),
  useDeleteContact: () => ({ mutate: vi.fn(), isPending: false }),
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

import ContactsPage from '@/app/(dashboard)/org/[orgSlug]/crm/contacts/page';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Contacts List Page', () => {
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
    mockUseContacts.mockReturnValue({
      data: { data: [], total: 0, hasMore: false },
      isLoading: false,
      isError: false,
    });
  });

  it('renders contacts list with data', () => {
    mockUseContacts.mockReturnValue({
      data: {
        data: [
          {
            id: 'ct-1',
            first_name: 'John',
            last_name: 'Doe',
            account_id: null,
            email: 'john@acme.com',
            phone: '555-1234',
            role_title: 'Project Manager',
            is_primary: true,
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

    renderWithProviders(<ContactsPage />);
    expect(screen.getByText('John Doe')).toBeDefined();
  });

  it('shows empty state when no contacts', () => {
    renderWithProviders(<ContactsPage />);
    expect(screen.getByText(/no contacts/i)).toBeDefined();
  });

  it('has search input', () => {
    renderWithProviders(<ContactsPage />);
    expect(screen.getByPlaceholderText(/search/i)).toBeDefined();
  });

  it('shows email when available', () => {
    mockUseContacts.mockReturnValue({
      data: {
        data: [
          {
            id: 'ct-1',
            first_name: 'Jane',
            last_name: 'Smith',
            account_id: null,
            email: 'jane@example.com',
            phone: null,
            role_title: null,
            is_primary: false,
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

    renderWithProviders(<ContactsPage />);
    expect(screen.getByText('jane@example.com')).toBeDefined();
  });

  it('shows loading state', () => {
    mockUseContacts.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = renderWithProviders(<ContactsPage />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
