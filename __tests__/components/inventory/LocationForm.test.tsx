import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocationForm } from '@/components/inventory/LocationForm';

const DIV_ID = '00000000-0000-4000-a000-000000000001';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

function renderForm(props: Partial<React.ComponentProps<typeof LocationForm>> = {}) {
  const defaults = {
    open: true,
    onOpenChange: vi.fn(),
    divisionId: DIV_ID,
    onSubmit: vi.fn(),
    isSubmitting: false,
  };
  return render(React.createElement(LocationForm, { ...defaults, ...props }), {
    wrapper: createWrapper(),
  });
}

describe('LocationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dialog when open', () => {
    renderForm();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Add Location')).toBeTruthy();
  });

  it('does not render dialog when closed', () => {
    renderForm({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows name and type fields', () => {
    renderForm();
    expect(screen.getByLabelText(/Name/i)).toBeTruthy();
    expect(screen.getByText('Location Details')).toBeTruthy();
  });

  it('renders the type select trigger', () => {
    renderForm();
    // Radix Select renders a combobox trigger
    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await user.click(screen.getByRole('button', { name: /Create Location/i }));

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderForm({ onOpenChange });

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables submit button when isSubmitting', () => {
    renderForm({ isSubmitting: true });
    const btn = screen.getByRole('button', { name: /Saving/i });
    expect(btn).toHaveProperty('disabled', true);
  });
});
