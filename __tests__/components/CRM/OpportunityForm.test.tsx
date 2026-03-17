import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the CRM hooks
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('@/hooks/useCRM', () => ({
  useCreateOpportunity: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateOpportunity: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}));

import { OpportunityForm } from '@/components/CRM/OpportunityForm';

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

function renderForm(props: Parameters<typeof OpportunityForm>[0] = {}) {
  return render(React.createElement(OpportunityForm, props), { wrapper: createWrapper() });
}

describe('OpportunityForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode by default', () => {
    renderForm();
    expect(screen.getByText('Create Opportunity')).toBeDefined();
    expect(screen.getByText('Opportunity Name *')).toBeDefined();
  });

  it('renders edit mode when opportunity is provided', () => {
    const opportunity = {
      id: '1',
      opportunity_name: 'Test Opp',
      lead_id: null,
      account_id: null,
      contact_id: null,
      division_id: null,
      stage: 'intake',
      target_close_date: '2026-06-01',
      estimated_revenue: 100000,
      probability_pct: 50,
      owner_user_id: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    renderForm({ opportunity });
    expect(screen.getByText('Save Changes')).toBeDefined();
  });

  it('renders all form fields', () => {
    renderForm();
    expect(screen.getByText('Opportunity Name *')).toBeDefined();
    expect(screen.getByText('Target Close Date')).toBeDefined();
    expect(screen.getByText('Estimated Revenue ($)')).toBeDefined();
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

  it('calls createOpportunity.mutate on submit in create mode', async () => {
    const user = userEvent.setup();
    renderForm();

    const nameInput = screen.getByPlaceholderText('e.g. Renovation Phase 1');
    await user.type(nameInput, 'New Renovation Project');

    const submitButton = screen.getByText('Create Opportunity');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled();
    });
  });

  it('pre-fills values in edit mode', () => {
    const opportunity = {
      id: '1',
      opportunity_name: 'Existing Opportunity',
      lead_id: null,
      account_id: null,
      contact_id: null,
      division_id: null,
      stage: 'proposal',
      target_close_date: '2026-06-15',
      estimated_revenue: 200000,
      probability_pct: 70,
      owner_user_id: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    renderForm({ opportunity });

    const nameInput = screen.getByPlaceholderText('e.g. Renovation Phase 1') as HTMLInputElement;
    expect(nameInput.value).toBe('Existing Opportunity');
  });
});
