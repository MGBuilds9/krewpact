import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// SequenceEnrollDialog uses React Query — mock it to keep BulkActionBar tests lightweight
vi.mock('@/components/CRM/SequenceEnrollDialog', () => ({
  SequenceEnrollDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="sequence-enroll-dialog" /> : null,
}));

// Mock useTeamMembers (used by AssignDialog)
vi.mock('@/hooks/useTeam', () => ({
  useTeamMembers: () => ({
    data: [
      { id: 'u1', full_name: 'Alice', email: 'alice@test.com' },
      { id: 'u2', full_name: 'Bob', email: 'bob@test.com' },
    ],
    isLoading: false,
  }),
}));

// Mock shadcn Select to render children directly
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (v: string) => void }) => <div data-testid="select-root">{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <div data-value={value}>{children}</div>,
}));

import { BulkActionBar } from '@/components/CRM/BulkActionBar';

describe('BulkActionBar', () => {
  it('renders nothing when no items selected', () => {
    const { container } = render(
      <BulkActionBar
        selectedIds={[]}
        entityType="lead"
        onClearSelection={vi.fn()}
        onActionComplete={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows selected count', () => {
    render(
      <BulkActionBar
        selectedIds={['id-1', 'id-2', 'id-3']}
        entityType="lead"
        onClearSelection={vi.fn()}
        onActionComplete={vi.fn()}
      />,
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('selected')).toBeInTheDocument();
  });

  it('shows Tag, Stage, Assign, Delete buttons for leads', () => {
    render(
      <BulkActionBar
        selectedIds={['id-1']}
        entityType="lead"
        onClearSelection={vi.fn()}
        onActionComplete={vi.fn()}
      />,
    );
    expect(screen.getByText('Tag')).toBeInTheDocument();
    expect(screen.getByText('Stage')).toBeInTheDocument();
    expect(screen.getByText('Assign')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('hides Stage and Assign for contacts', () => {
    render(
      <BulkActionBar
        selectedIds={['id-1']}
        entityType="contact"
        onClearSelection={vi.fn()}
        onActionComplete={vi.fn()}
      />,
    );
    expect(screen.getByText('Tag')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.queryByText('Stage')).not.toBeInTheDocument();
    expect(screen.queryByText('Assign')).not.toBeInTheDocument();
  });

  it('calls onClearSelection when X clicked', () => {
    const onClear = vi.fn();
    render(
      <BulkActionBar
        selectedIds={['id-1']}
        entityType="lead"
        onClearSelection={onClear}
        onActionComplete={vi.fn()}
      />,
    );
    // The close button (X) is the last button
    const buttons = screen.getAllByRole('button');
    const closeBtn = buttons[buttons.length - 1];
    fireEvent.click(closeBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
