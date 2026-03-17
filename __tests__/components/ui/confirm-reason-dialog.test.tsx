// ---------------------------------------------------------------------------
// vi.mock calls MUST come before all imports
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/dialog', async () => {
  const React = await import('react');

  const Dialog = ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: React.ReactNode;
  }) => {
    if (!open) return null;
    return React.createElement('div', { role: 'dialog' }, children);
  };

  const DialogContent = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children);
  const DialogHeader = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children);
  const DialogTitle = ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', null, children);
  const DialogDescription = ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', null, children);
  const DialogFooter = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children);

  return { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
});

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmReasonDialog } from '@/components/ui/confirm-reason-dialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultProps(overrides: Partial<Parameters<typeof ConfirmReasonDialog>[0]> = {}) {
  return {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Delete Record',
    onConfirm: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConfirmReasonDialog', () => {
  it('renders title and description', () => {
    render(
      <ConfirmReasonDialog {...defaultProps({ description: 'This action cannot be undone.' })} />,
    );

    expect(screen.getByText('Delete Record')).toBeDefined();
    expect(screen.getByText('This action cannot be undone.')).toBeDefined();
  });

  it('does not render description when omitted', () => {
    render(<ConfirmReasonDialog {...defaultProps()} />);
    expect(screen.queryByRole('paragraph')).toBeNull();
  });

  it('confirm button is disabled when reasonRequired=true and textarea is empty', () => {
    render(<ConfirmReasonDialog {...defaultProps({ reasonRequired: true })} />);
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('confirm button is enabled when reasonRequired=true and textarea has text', async () => {
    const user = userEvent.setup();
    render(<ConfirmReasonDialog {...defaultProps({ reasonRequired: true })} />);

    const textarea = screen.getByRole('textbox');
    await act(async () => {
      await user.type(textarea, 'Some reason');
    });

    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('confirm button is always enabled when reasonRequired=false', () => {
    render(<ConfirmReasonDialog {...defaultProps({ reasonRequired: false })} />);
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('calls onConfirm with the reason text when confirmed', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmReasonDialog {...defaultProps({ onConfirm })} />);

    const textarea = screen.getByRole('textbox');
    await act(async () => {
      await user.type(textarea, 'My reason');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /confirm/i }));
    });

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith('My reason');
  });

  it('calls onOpenChange(false) when cancelled', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ConfirmReasonDialog {...defaultProps({ onOpenChange })} />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /cancel/i }));
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('clears reason text after confirm', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ConfirmReasonDialog {...defaultProps({ onOpenChange })} />);

    const textarea = screen.getByRole('textbox');
    await act(async () => {
      await user.type(textarea, 'Some reason');
    });
    expect((textarea as HTMLTextAreaElement).value).toBe('Some reason');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /confirm/i }));
    });

    // onOpenChange(false) is called — if dialog were controlled, re-render would
    // unmount it. We verify the internal state was cleared by checking the value
    // right before close (the textarea value resets to '').
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('clears reason text after cancel', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ConfirmReasonDialog {...defaultProps({ onOpenChange })} />);

    const textarea = screen.getByRole('textbox');
    await act(async () => {
      await user.type(textarea, 'Some reason');
    });
    expect((textarea as HTMLTextAreaElement).value).toBe('Some reason');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /cancel/i }));
    });

    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('destructive variant renders destructive button style', () => {
    render(<ConfirmReasonDialog {...defaultProps({ destructive: true })} />);
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    // shadcn/ui applies the variant via className; verify the class is present
    expect(confirmBtn.className).toContain('destructive');
  });

  it('renders custom confirmLabel', () => {
    render(<ConfirmReasonDialog {...defaultProps({ confirmLabel: 'Yes, delete it' })} />);
    expect(screen.getByRole('button', { name: /yes, delete it/i })).toBeDefined();
  });

  it('renders custom reasonLabel', () => {
    render(<ConfirmReasonDialog {...defaultProps({ reasonLabel: 'Justification' })} />);
    expect(screen.getByText(/justification/i)).toBeDefined();
  });
});
