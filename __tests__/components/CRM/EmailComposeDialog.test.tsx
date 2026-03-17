import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock useCRM hooks
const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useCRM', () => ({
  useSendEmail: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { EmailComposeDialog } from '@/components/CRM/EmailComposeDialog';

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('EmailComposeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ success: true });
  });

  it('renders dialog with title and fields when open', () => {
    render(
      <Wrapper>
        <EmailComposeDialog open={true} onOpenChange={vi.fn()} />
      </Wrapper>,
    );

    expect(screen.getByText('Compose Email')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Body')).toBeInTheDocument();
  });

  it('pre-fills recipient email when provided', () => {
    render(
      <Wrapper>
        <EmailComposeDialog
          open={true}
          onOpenChange={vi.fn()}
          recipientEmail="jane@example.com"
          recipientName="Jane Doe"
        />
      </Wrapper>,
    );

    const toInput = screen.getByLabelText('To') as HTMLInputElement;
    expect(toInput.value).toBe('jane@example.com');
  });

  it('disables send button when required fields are empty', () => {
    render(
      <Wrapper>
        <EmailComposeDialog open={true} onOpenChange={vi.fn()} />
      </Wrapper>,
    );

    const sendBtn = screen.getByRole('button', { name: /Send Email/i });
    expect(sendBtn).toBeDisabled();
  });

  it('calls sendEmail with entity IDs on submit', { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Wrapper>
        <EmailComposeDialog
          open={true}
          onOpenChange={onOpenChange}
          recipientEmail="jane@example.com"
          recipientName="Jane Doe"
          leadId="lead-123"
          contactId="contact-456"
          accountId="acct-789"
        />
      </Wrapper>,
    );

    await user.type(screen.getByLabelText('Subject'), 'Project Quote');
    await user.type(screen.getByLabelText('Body'), 'Here is the quote you requested.');

    const sendBtn = screen.getByRole('button', { name: /Send Email/i });
    expect(sendBtn).not.toBeDisabled();
    await user.click(sendBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      to: [{ address: 'jane@example.com', name: 'Jane Doe' }],
      subject: 'Project Quote',
      body: 'Here is the quote you requested.',
      bodyType: 'text',
      leadId: 'lead-123',
      contactId: 'contact-456',
      accountId: 'acct-789',
    });
  });

  it('renders cancel button', () => {
    render(
      <Wrapper>
        <EmailComposeDialog open={true} onOpenChange={vi.fn()} />
      </Wrapper>,
    );

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });
});
