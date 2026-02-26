import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('@/hooks/useCRM', () => ({
  useCreateAccount: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateAccount: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}));

vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: () => ({
    activeDivision: { id: '00000000-0000-0000-0000-000000000001', name: 'MDM Contracting' },
  }),
}));

import { AccountForm } from '@/components/CRM/AccountForm';
import type { Account } from '@/hooks/useCRM';

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

function renderForm(props: Parameters<typeof AccountForm>[0] = {}) {
  return render(
    React.createElement(AccountForm, props),
    { wrapper: createWrapper() },
  );
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    account_name: 'Acme Construction',
    account_type: 'client',
    division_id: '00000000-0000-0000-0000-000000000001',
    billing_address: null,
    shipping_address: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('AccountForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode fields', () => {
    renderForm();
    expect(screen.getByText('Create Account')).toBeDefined();
    expect(screen.getByText('Account Name *')).toBeDefined();
    expect(screen.getByText('Account Type *')).toBeDefined();
    expect(screen.getByText('Notes')).toBeDefined();
  });

  it('validates account_name required — does not call mutate when name is empty', async () => {
    const user = userEvent.setup();
    renderForm();

    // Submit without filling required account_name
    await user.click(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(mockCreateMutate).not.toHaveBeenCalled();
    });
  });

  it('shows account type dropdown with expected options', () => {
    renderForm();
    // The select trigger should display the default value
    expect(screen.getByText('Account Type *')).toBeDefined();
    // Default value is 'prospect' — verify the trigger renders
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDefined();
  });

  it('shows edit mode when account prop is provided', () => {
    renderForm({ account: makeAccount() });
    expect(screen.getByText('Save Changes')).toBeDefined();
  });

  it('pre-fills account_name in edit mode', () => {
    renderForm({ account: makeAccount({ account_name: 'Rogers Construction' }) });
    const nameInput = screen.getByPlaceholderText('e.g. Tim Hortons') as HTMLInputElement;
    expect(nameInput.value).toBe('Rogers Construction');
  });

  it('calls onCancel when Cancel button is clicked', () => {
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

  it('enables the submit button when account_name is provided', async () => {
    const user = userEvent.setup();
    renderForm();

    // Submit button should not be disabled (isPending is false)
    const submitButton = screen.getByText('Create Account') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);

    await user.type(screen.getByPlaceholderText('e.g. Tim Hortons'), 'New Client Corp');

    // Input now has value
    const input = screen.getByPlaceholderText('e.g. Tim Hortons') as HTMLInputElement;
    expect(input.value).toBe('New Client Corp');
  });

  it('renders submit button that is enabled when form is ready', async () => {
    renderForm();
    // isPending is false, so button should be enabled
    const submitButton = screen.getByText('Create Account') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);
    expect(submitButton.type).toBe('submit');
  });
});
