'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock the CRM hooks
const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useCRM', () => ({
  useSequences: () => ({
    data: [
      { id: 'seq-1', name: 'Welcome Sequence', description: 'For new leads' },
      { id: 'seq-2', name: 'Follow-up Sequence', description: null },
    ],
  }),
  useEnrollInSequence: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// Mock Select since Radix portals don't work in jsdom
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: { children: React.ReactNode; onValueChange: (v: string) => void; value?: string }) => (
    <div data-testid="select-root">{children}</div>
  ),
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <button data-testid="select-trigger" id={id}>{children}</button>
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

import { EnrollLeadDialog } from '@/components/CRM/EnrollLeadDialog';

describe('EnrollLeadDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog with title and description', () => {
    render(
      <EnrollLeadDialog
        open={true}
        onOpenChange={vi.fn()}
        leadId="lead-1"
      />,
    );

    expect(screen.getByText('Enroll in Sequence')).toBeInTheDocument();
    expect(screen.getByText(/Select an active sequence/)).toBeInTheDocument();
  });

  it('renders sequence options', () => {
    render(
      <EnrollLeadDialog
        open={true}
        onOpenChange={vi.fn()}
        leadId="lead-1"
      />,
    );

    expect(screen.getByText(/Welcome Sequence/)).toBeInTheDocument();
    expect(screen.getByText(/Follow-up Sequence/)).toBeInTheDocument();
  });

  it('shows cancel button', () => {
    render(
      <EnrollLeadDialog
        open={true}
        onOpenChange={vi.fn()}
        leadId="lead-1"
      />,
    );

    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
  });

  it('shows enroll button (disabled when no sequence selected)', () => {
    render(
      <EnrollLeadDialog
        open={true}
        onOpenChange={vi.fn()}
        leadId="lead-1"
      />,
    );

    const enrollBtn = screen.getByRole('button', { name: /Enroll/ });
    expect(enrollBtn).toBeInTheDocument();
    expect(enrollBtn).toBeDisabled();
  });
});
