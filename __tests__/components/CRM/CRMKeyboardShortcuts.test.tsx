'use client';

import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();

vi.mock('@/hooks/useOrgRouter', () => ({
  useOrgRouter: () => ({ push: mockPush, orgPath: (p: string) => p }),
}));

import { CRMKeyboardShortcuts } from '@/components/CRM/CRMKeyboardShortcuts';

describe('CRMKeyboardShortcuts', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('navigates to leads/new on "n" key', () => {
    render(<CRMKeyboardShortcuts />);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));

    expect(mockPush).toHaveBeenCalledWith('/crm/leads/new');
  });

  it('navigates to tasks on "t" key', () => {
    render(<CRMKeyboardShortcuts />);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));

    expect(mockPush).toHaveBeenCalledWith('/crm/tasks');
  });

  it('navigates to dashboard on "d" key', () => {
    render(<CRMKeyboardShortcuts />);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));

    expect(mockPush).toHaveBeenCalledWith('/crm/dashboard');
  });

  it('calls onOpenFollowUp on "f" key when provided', () => {
    const mockFollowUp = vi.fn();
    render(<CRMKeyboardShortcuts onOpenFollowUp={mockFollowUp} />);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));

    expect(mockFollowUp).toHaveBeenCalledOnce();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not fire when focus is in an input', () => {
    render(
      <div>
        <CRMKeyboardShortcuts />
        <input data-testid="text-input" />
      </div>,
    );

    // Create the event targeting the input element
    const input = document.querySelector('input')!;
    const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
    Object.defineProperty(event, 'target', { value: input, writable: false });
    document.dispatchEvent(event);

    expect(mockPush).not.toHaveBeenCalled();
  });
});
