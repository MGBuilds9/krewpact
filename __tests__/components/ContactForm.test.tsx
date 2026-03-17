import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('@/hooks/useCRM', () => ({
  useCreateContact: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateContact: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}));

import { ContactForm } from '@/components/CRM/ContactForm';
import type { Contact } from '@/hooks/useCRM';

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

function renderForm(props: Parameters<typeof ContactForm>[0] = {}) {
  return render(React.createElement(ContactForm, props), { wrapper: createWrapper() });
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'ct-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '(416) 555-0100',
    role_title: 'Project Manager',
    account_id: null,
    lead_id: null,
    is_primary: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode fields', () => {
    renderForm();
    expect(screen.getByText('Create Contact')).toBeDefined();
    expect(screen.getByText('First Name *')).toBeDefined();
    expect(screen.getByText('Last Name *')).toBeDefined();
    expect(screen.getByText('Email')).toBeDefined();
    expect(screen.getByText('Phone')).toBeDefined();
    expect(screen.getByText('Role / Title')).toBeDefined();
  });

  it('validates required fields — shows error when first_name is empty', async () => {
    const user = userEvent.setup();
    renderForm();

    // Submit without filling required fields
    const submitButton = screen.getByText('Create Contact');
    await user.click(submitButton);

    await waitFor(() => {
      // React Hook Form + Zod should prevent submission and show errors
      expect(mockCreateMutate).not.toHaveBeenCalled();
    });
  });

  it('validates required last_name field', async () => {
    const user = userEvent.setup();
    renderForm();

    // Fill only first_name, leave last_name empty
    const firstNameInput = screen.getByPlaceholderText('e.g. John');
    await user.type(firstNameInput, 'John');

    const submitButton = screen.getByText('Create Contact');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateMutate).not.toHaveBeenCalled();
    });
  });

  it('shows edit mode when contact prop is provided', () => {
    renderForm({ contact: makeContact() });
    expect(screen.getByText('Save Changes')).toBeDefined();
  });

  it('pre-fills values in edit mode', () => {
    renderForm({ contact: makeContact({ first_name: 'Jane', last_name: 'Smith' }) });

    const firstNameInput = screen.getByPlaceholderText('e.g. John') as HTMLInputElement;
    const lastNameInput = screen.getByPlaceholderText('e.g. Smith') as HTMLInputElement;
    expect(firstNameInput.value).toBe('Jane');
    expect(lastNameInput.value).toBe('Smith');
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

  it('calls createContact.mutate on valid submit in create mode', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText('e.g. John'), 'Alice');
    await user.type(screen.getByPlaceholderText('e.g. Smith'), 'Johnson');

    await user.click(screen.getByText('Create Contact'));

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled();
    });
  });
});
