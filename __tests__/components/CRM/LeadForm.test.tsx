import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the CRM hooks
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('@/hooks/useCRM', () => ({
  useCreateLead: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateLead: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}));

import { LeadForm } from '@/components/CRM/LeadForm';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function renderForm(props: Parameters<typeof LeadForm>[0] = {}) {
  return render(
    React.createElement(LeadForm, props),
    { wrapper: createWrapper() },
  );
}

describe('LeadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode by default', () => {
    renderForm();
    expect(screen.getByText('Create Lead')).toBeDefined();
    expect(screen.getByText('Lead Name *')).toBeDefined();
  });

  it('renders edit mode when lead is provided', () => {
    const lead = {
      id: '1',
      lead_name: 'Test Lead',
      division_id: null,
      source: 'website',
      company_name: 'Corp',
      email: 'test@test.com',
      phone: '555-0100',
      estimated_value: 50000,
      probability_pct: 75,
      stage: 'new',
      assigned_to: null,
      lost_reason: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    renderForm({ lead });
    expect(screen.getByText('Save Changes')).toBeDefined();
  });

  it('renders all form fields', () => {
    renderForm();
    expect(screen.getByText('Lead Name *')).toBeDefined();
    expect(screen.getByText('Company')).toBeDefined();
    expect(screen.getByText('Source')).toBeDefined();
    expect(screen.getByText('Email')).toBeDefined();
    expect(screen.getByText('Phone')).toBeDefined();
    expect(screen.getByText('Estimated Value ($)')).toBeDefined();
    expect(screen.getByText('Probability (%)')).toBeDefined();
  });

  it('shows Cancel button when onCancel is provided', () => {
    const onCancel = vi.fn();
    renderForm({ onCancel });
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDefined();
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not show Cancel button when onCancel is omitted', () => {
    renderForm();
    expect(screen.queryByText('Cancel')).toBeNull();
  });

  it('calls createLead.mutate on submit in create mode', async () => {
    const user = userEvent.setup();
    renderForm();

    const nameInput = screen.getByPlaceholderText('e.g. Renovation Project');
    await user.type(nameInput, 'New Construction Project');

    // Provide valid email to pass Zod email validation (empty string is not undefined)
    const emailInput = screen.getByPlaceholderText('email@example.com');
    await user.type(emailInput, 'test@example.com');

    const submitButton = screen.getByText('Create Lead');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled();
    });
  });

  it('pre-fills values in edit mode', () => {
    const lead = {
      id: '1',
      lead_name: 'Existing Lead',
      division_id: null,
      source: 'referral',
      company_name: 'Test Corp',
      email: 'existing@test.com',
      phone: '555-0200',
      estimated_value: 100000,
      probability_pct: 50,
      stage: 'qualified',
      assigned_to: null,
      lost_reason: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    renderForm({ lead });

    const nameInput = screen.getByPlaceholderText('e.g. Renovation Project') as HTMLInputElement;
    expect(nameInput.value).toBe('Existing Lead');
  });
});
