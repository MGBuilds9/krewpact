'use client';

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/crm/contacts/ct-1',
  useParams: () => ({ id: 'ct-1' }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseContact = vi.fn();
const mockUseAccount = vi.fn();
const mockUseActivities = vi.fn();
const mockUseCreateContact = vi.fn();
const mockUseUpdateContact = vi.fn();

vi.mock('@/hooks/useCRM', () => ({
  useContact: (...args: unknown[]) => mockUseContact(...args),
  useAccount: (...args: unknown[]) => mockUseAccount(...args),
  useActivities: (...args: unknown[]) => mockUseActivities(...args),
  useCreateContact: () => ({ mutate: mockUseCreateContact, isPending: false }),
  useUpdateContact: () => ({ mutate: mockUseUpdateContact, isPending: false }),
}));

vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: () => ({
    activeDivision: { id: 'div-1', name: 'MDM Contracting', code: 'contracting' },
    userDivisions: [{ id: 'div-1', name: 'MDM Contracting', code: 'contracting' }],
    isLoading: false,
  }),
}));

import ContactDetailPage from '@/app/(dashboard)/crm/contacts/[id]/page';

const baseContact = {
  id: 'ct-1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '(416) 555-0100',
  role_title: 'Project Manager',
  account_id: null,
  lead_id: null,
  is_primary: true,
  division_id: 'div-1',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
};

describe('Contact Detail Page', () => {
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
    mockUseAccount.mockReturnValue({ data: undefined, isLoading: false });
    mockUseActivities.mockReturnValue({ data: { data: [], total: 0, hasMore: false }, isLoading: false });
  });

  it('shows loading state', () => {
    mockUseContact.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<ContactDetailPage />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows 404 state when contact not found', () => {
    mockUseContact.mockReturnValue({ data: undefined, isLoading: false });
    render(<ContactDetailPage />);
    expect(screen.getByText('Contact not found')).toBeDefined();
    expect(screen.getByText(/back to contacts/i)).toBeDefined();
  });

  it('shows contact info when loaded', () => {
    mockUseContact.mockReturnValue({ data: baseContact, isLoading: false });
    render(<ContactDetailPage />);
    expect(screen.getByText('John Doe')).toBeDefined();
    // "Project Manager" appears in header badge and in the details list
    const roleElements = screen.getAllByText('Project Manager');
    expect(roleElements.length).toBeGreaterThan(0);
    expect(screen.getByText('john@example.com')).toBeDefined();
  });

  it('shows Primary badge when contact is_primary', () => {
    mockUseContact.mockReturnValue({ data: { ...baseContact, is_primary: true }, isLoading: false });
    render(<ContactDetailPage />);
    expect(screen.getByText('Primary')).toBeDefined();
  });

  it('has Overview tab', () => {
    mockUseContact.mockReturnValue({ data: baseContact, isLoading: false });
    render(<ContactDetailPage />);
    expect(screen.getByRole('tab', { name: /overview/i })).toBeDefined();
  });

  it('has Account tab', () => {
    mockUseContact.mockReturnValue({ data: baseContact, isLoading: false });
    render(<ContactDetailPage />);
    expect(screen.getByRole('tab', { name: /account/i })).toBeDefined();
  });

  it('has Activities tab', () => {
    mockUseContact.mockReturnValue({ data: baseContact, isLoading: false });
    render(<ContactDetailPage />);
    expect(screen.getByRole('tab', { name: /activities/i })).toBeDefined();
  });

  it('shows phone number when available', () => {
    mockUseContact.mockReturnValue({ data: baseContact, isLoading: false });
    render(<ContactDetailPage />);
    expect(screen.getByText('(416) 555-0100')).toBeDefined();
  });

  it('renders Edit button when contact is loaded', () => {
    mockUseContact.mockReturnValue({ data: baseContact, isLoading: false });
    render(<ContactDetailPage />);
    expect(screen.getByText('Edit')).toBeDefined();
  });
});
