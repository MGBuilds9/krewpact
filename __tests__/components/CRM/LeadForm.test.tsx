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

// Mock the DivisionContext
vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: () => ({
    activeDivision: { id: 'div-1', name: 'MDM Contracting' },
  }),
}));

import { LeadForm } from '@/components/CRM/LeadForm';
import type { Lead } from '@/hooks/useCRM';

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
  return render(React.createElement(LeadForm, props), { wrapper: createWrapper() });
}

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: '1',
    company_name: 'Test Corp',
    domain: null,
    industry: 'Retail',
    company_size: null,
    revenue_range: null,
    address: null,
    city: 'Toronto',
    province: 'ON',
    postal_code: null,
    country: null,
    division_id: 'div-1',
    source_channel: 'referral',
    source_campaign: null,
    status: 'new',
    substatus: null,
    lead_score: null,
    fit_score: null,
    intent_score: null,
    engagement_score: null,
    is_qualified: false,
    in_sequence: false,
    notes: null,
    tags: null,
    owner_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    last_activity_at: null,
    last_contacted_at: null,
    next_followup_at: null,
    deleted_at: null,
    enrichment_data: null,
    enrichment_status: null,
    ...overrides,
  };
}

describe('LeadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode by default', () => {
    renderForm();
    expect(screen.getByText('Create Lead')).toBeDefined();
    expect(screen.getByText('Company Name *')).toBeDefined();
  });

  it('renders edit mode when lead is provided', () => {
    renderForm({ lead: makeLead() });
    expect(screen.getByText('Save Changes')).toBeDefined();
  });

  it('renders all form fields', () => {
    renderForm();
    expect(screen.getByText('Company Name *')).toBeDefined();
    expect(screen.getByText('Industry')).toBeDefined();
    expect(screen.getByText('Source')).toBeDefined();
    expect(screen.getByText('City')).toBeDefined();
    expect(screen.getByText('Province')).toBeDefined();
    expect(screen.getByText('Notes')).toBeDefined();
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

    const nameInput = screen.getByPlaceholderText('e.g. Tim Hortons, Rogers');
    await user.type(nameInput, 'New Construction Company');

    const submitButton = screen.getByText('Create Lead');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled();
    });
  });

  it('pre-fills values in edit mode', () => {
    renderForm({ lead: makeLead({ company_name: 'Existing Corp' }) });

    const nameInput = screen.getByPlaceholderText('e.g. Tim Hortons, Rogers') as HTMLInputElement;
    expect(nameInput.value).toBe('Existing Corp');
  });
});
