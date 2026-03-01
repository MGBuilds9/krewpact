import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock useCRM hooks
const mockMutate = vi.fn();
vi.mock('@/hooks/useCRM', () => ({
  useCreateActivity: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

// We need to mock the form components since they use React context from react-hook-form
// and shadcn Select uses Radix portals which are tricky in jsdom
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue }: { children: React.ReactNode; onValueChange: (v: string) => void; defaultValue?: string }) => (
    <div data-testid="select-root">{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="select-trigger">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

import { ActivityForm } from '@/components/CRM/ActivityForm';

// Wrap with a minimal QueryClientProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('ActivityForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(
      <Wrapper>
        <ActivityForm entityType="lead" entityId="lead-123" />
      </Wrapper>,
    );

    expect(screen.getByText('Activity Type *')).toBeInTheDocument();
    expect(screen.getByText('Title *')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log Activity/i })).toBeInTheDocument();
  });

  it('renders cancel button when onCancel provided', () => {
    const onCancel = vi.fn();
    render(
      <Wrapper>
        <ActivityForm entityType="lead" entityId="lead-123" onCancel={onCancel} />
      </Wrapper>,
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelBtn).toBeInTheDocument();
  });

  it('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <Wrapper>
        <ActivityForm entityType="lead" entityId="lead-123" onCancel={onCancel} />
      </Wrapper>,
    );

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not render cancel button when onCancel not provided', () => {
    render(
      <Wrapper>
        <ActivityForm entityType="opportunity" entityId="opp-123" />
      </Wrapper>,
    );

    expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
  });
});
