import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock useCRM hooks
const mockMutateAsync = vi.fn();
const mockBulkEmail = {
  mutateAsync: mockMutateAsync,
  isPending: false,
};

vi.mock('@/hooks/useCRM', () => ({
  useBulkEmail: vi.fn(() => mockBulkEmail),
}));

// Mock fetch for templates
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { BulkEmailDialog } from '@/components/CRM/BulkEmailDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockTemplates = [
  { id: 'tpl-1', name: 'Welcome Template', subject: 'Welcome!', html: '<p>Welcome aboard</p>' },
  { id: 'tpl-2', name: 'Follow Up', subject: 'Following up', html: '<p>Just checking in</p>' },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  selectedLeadIds: ['lead-1', 'lead-2', 'lead-3'],
  onSendComplete: vi.fn(),
};

describe('BulkEmailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ sent: 3, failed: 0, total: 3 });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ data: mockTemplates }),
    });
  });

  it('renders dialog when open', () => {
    render(
      <Wrapper>
        <BulkEmailDialog {...defaultProps} />
      </Wrapper>,
    );

    expect(screen.getByText('Bulk Email')).toBeInTheDocument();
  });

  it('shows selected lead count in review step', () => {
    render(
      <Wrapper>
        <BulkEmailDialog {...defaultProps} />
      </Wrapper>,
    );

    expect(screen.getByTestId('lead-count')).toHaveTextContent('3 leads selected');
  });

  it('advances to compose step', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <BulkEmailDialog {...defaultProps} />
      </Wrapper>,
    );

    await user.click(screen.getByRole('button', { name: /Next: Compose/i }));

    expect(screen.getByText('Compose Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Body')).toBeInTheDocument();
  });

  it('shows template selector in compose step', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <BulkEmailDialog {...defaultProps} />
      </Wrapper>,
    );

    await user.click(screen.getByRole('button', { name: /Next: Compose/i }));

    expect(screen.getByLabelText('Template (optional)')).toBeInTheDocument();
  });

  it('allows freeform compose with subject and body', { timeout: 15000 }, async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <BulkEmailDialog {...defaultProps} />
      </Wrapper>,
    );

    await user.click(screen.getByRole('button', { name: /Next: Compose/i }));

    const subjectInput = screen.getByLabelText('Subject');
    const bodyInput = screen.getByLabelText('Body');

    await user.type(subjectInput, 'Test Subject');
    await user.type(bodyInput, 'Test body content');

    expect(subjectInput).toHaveValue('Test Subject');
    expect(bodyInput).toHaveValue('Test body content');
  });

  it('advances to confirm step', { timeout: 15000 }, async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <BulkEmailDialog {...defaultProps} />
      </Wrapper>,
    );

    // Go to compose
    await user.click(screen.getByRole('button', { name: /Next: Compose/i }));

    // Fill in fields
    await user.type(screen.getByLabelText('Subject'), 'Test Subject');
    await user.type(screen.getByLabelText('Body'), 'Test body');

    // Advance to confirm
    await user.click(screen.getByRole('button', { name: /Next: Review & Send/i }));

    expect(screen.getByText('Confirm & Send')).toBeInTheDocument();
    expect(screen.getByText('Test Subject')).toBeInTheDocument();
    expect(screen.getByText('Test body')).toBeInTheDocument();
  });

  it('calls bulk email mutation on send', { timeout: 15000 }, async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <BulkEmailDialog {...defaultProps} />
      </Wrapper>,
    );

    // Navigate to compose
    await user.click(screen.getByRole('button', { name: /Next: Compose/i }));
    await user.type(screen.getByLabelText('Subject'), 'Outreach');
    await user.type(screen.getByLabelText('Body'), 'Hello there');

    // Navigate to confirm
    await user.click(screen.getByRole('button', { name: /Next: Review & Send/i }));

    // Send
    await user.click(screen.getByRole('button', { name: /Send Email/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      lead_ids: ['lead-1', 'lead-2', 'lead-3'],
      subject: 'Outreach',
      html: 'Hello there',
    });
  });

  it('shows results after send (sent/failed counts)', { timeout: 15000 }, async () => {
    mockMutateAsync.mockResolvedValue({ sent: 2, failed: 1, total: 3 });
    const user = userEvent.setup();

    render(
      <Wrapper>
        <BulkEmailDialog {...defaultProps} />
      </Wrapper>,
    );

    // Navigate through steps
    await user.click(screen.getByRole('button', { name: /Next: Compose/i }));
    await user.type(screen.getByLabelText('Subject'), 'Outreach');
    await user.type(screen.getByLabelText('Body'), 'Hello');
    await user.click(screen.getByRole('button', { name: /Next: Review & Send/i }));
    await user.click(screen.getByRole('button', { name: /Send Email/i }));

    await waitFor(() => {
      expect(screen.getByText('Email Sent')).toBeInTheDocument();
    });

    expect(screen.getByTestId('result-total')).toHaveTextContent('3');
    expect(screen.getByTestId('result-sent')).toHaveTextContent('2');
    expect(screen.getByTestId('result-failed')).toHaveTextContent('1');
  });

  it('closes dialog on cancel', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Wrapper>
        <BulkEmailDialog {...defaultProps} onOpenChange={onOpenChange} />
      </Wrapper>,
    );

    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables send when subject/body empty', { timeout: 15000 }, async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <BulkEmailDialog {...defaultProps} />
      </Wrapper>,
    );

    // Navigate to compose
    await user.click(screen.getByRole('button', { name: /Next: Compose/i }));

    // "Next: Review & Send" should be disabled when fields are empty
    const nextBtn = screen.getByRole('button', { name: /Next: Review & Send/i });
    expect(nextBtn).toBeDisabled();

    // Fill only subject — still disabled
    await user.type(screen.getByLabelText('Subject'), 'Subject only');
    expect(nextBtn).toBeDisabled();

    // Fill body too — now enabled
    await user.type(screen.getByLabelText('Body'), 'Some content');
    expect(nextBtn).not.toBeDisabled();
  });
});
