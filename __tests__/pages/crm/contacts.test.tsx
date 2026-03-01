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
  usePathname: () => '/crm/contacts',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseContacts = vi.fn();

vi.mock('@/hooks/useCRM', () => ({
  useContacts: (...args: unknown[]) => mockUseContacts(...args),
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

import ContactsPage from '@/app/(dashboard)/crm/contacts/page';

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

    render(<ContactsPage />);
    expect(screen.getByText('John Doe')).toBeDefined();
  });

  it('shows empty state when no contacts', () => {
    render(<ContactsPage />);
    expect(screen.getByText(/no contacts/i)).toBeDefined();
  });

  it('has search input', () => {
    render(<ContactsPage />);
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

    render(<ContactsPage />);
    expect(screen.getByText('jane@example.com')).toBeDefined();
  });

  it('shows loading state', () => {
    mockUseContacts.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<ContactsPage />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
