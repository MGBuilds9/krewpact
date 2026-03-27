'use client';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMutateAsync = vi.fn();

vi.mock('@/hooks/useCRM', () => ({
  useSequences: () => ({
    data: [
      { id: 'seq-1', name: 'Welcome Sequence', description: 'For new leads' },
      { id: 'seq-2', name: 'Follow-up Sequence', description: null },
    ],
  }),
  useBulkEnrollInSequence: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    value: _value,
  }: {
    children: React.ReactNode;
    onValueChange: (v: string) => void;
    value?: string;
  }) => (
    <div data-testid="select-root" onClick={() => onValueChange('seq-1')}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <button data-testid="select-trigger" id={id}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

import { SequenceEnrollDialog } from '@/components/CRM/SequenceEnrollDialog';

describe('SequenceEnrollDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog title and description with lead count', () => {
    render(
      <SequenceEnrollDialog
        open={true}
        onClose={vi.fn()}
        leadIds={['lead-1', 'lead-2', 'lead-3']}
      />,
    );

    expect(screen.getByText('Enroll in Sequence')).toBeInTheDocument();
    expect(screen.getByText(/3 leads/)).toBeInTheDocument();
  });

  it('shows singular "lead" for single lead', () => {
    render(<SequenceEnrollDialog open={true} onClose={vi.fn()} leadIds={['lead-1']} />);

    expect(screen.getByText(/1 lead[^s]/)).toBeInTheDocument();
  });

  it('renders sequence options', () => {
    render(<SequenceEnrollDialog open={true} onClose={vi.fn()} leadIds={['lead-1']} />);

    expect(screen.getByText(/Welcome Sequence/)).toBeInTheDocument();
    expect(screen.getByText(/Follow-up Sequence/)).toBeInTheDocument();
  });

  it('shows Cancel button', () => {
    render(<SequenceEnrollDialog open={true} onClose={vi.fn()} leadIds={['lead-1']} />);

    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
  });

  it('shows Enroll button with count', () => {
    render(<SequenceEnrollDialog open={true} onClose={vi.fn()} leadIds={['lead-1', 'lead-2']} />);

    expect(screen.getByRole('button', { name: /Enroll 2 Leads/ })).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<SequenceEnrollDialog open={true} onClose={onClose} leadIds={['lead-1']} />);

    await userEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not render when closed', () => {
    render(<SequenceEnrollDialog open={false} onClose={vi.fn()} leadIds={['lead-1']} />);

    expect(screen.queryByText('Enroll in Sequence')).not.toBeInTheDocument();
  });
});
