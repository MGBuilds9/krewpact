/* eslint-disable @typescript-eslint/no-require-imports */

// ---------------------------------------------------------------------------
// vi.mock calls MUST come before all imports
// ---------------------------------------------------------------------------

// Mock Radix-backed Dialog — renders children immediately and fires
// onOpenChange(true) when open transitions false → true, mirroring Radix
// behaviour while avoiding the JSDOM animation limitations.
vi.mock('@/components/ui/dialog', () => {
  const React = require('react');

  const Dialog = ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: React.ReactNode;
  }) => {
    const prevOpenRef = React.useRef(null as boolean | null);
    React.useEffect(() => {
      if (open && prevOpenRef.current === false) {
        onOpenChange(true);
      }
      if (!open && prevOpenRef.current === true) {
        onOpenChange(false);
      }
      prevOpenRef.current = open;
    }, [open, onOpenChange]);

    if (!open) return null;
    return React.createElement('div', { role: 'dialog' }, children);
  };

  const DialogContent = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children);
  const DialogHeader = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children);
  const DialogTitle = ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', null, children);
  const DialogFooter = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children);

  const DialogDescription = ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => React.createElement('p', { className }, children);

  return { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
});

// Lightweight Lucide stubs to avoid SVG import issues in jsdom.
vi.mock('lucide-react', () => ({
  Loader2: () => null,
  RefreshCw: () => null,
  Copy: () => null,
  Send: () => null,
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailDraftModal } from '@/components/AI/EmailDraftModal';

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Clipboard mock
//
// jsdom does not implement navigator.clipboard. Define a stub object at module
// scope so that the component's handleCopy does not throw. Individual tests
// that need to assert on writeText calls use vi.spyOn on the stub object.
// ---------------------------------------------------------------------------

const clipboardStub = { writeText: vi.fn().mockResolvedValue(undefined) };
Object.defineProperty(navigator, 'clipboard', {
  value: clipboardStub,
  configurable: true,
  writable: true,
});

// ---------------------------------------------------------------------------
// Shared test data / helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  entityType: 'lead' as const,
  entityId: 'lead-abc-123',
  draftType: 'follow_up' as const,
};

function makeDraftResponse(overrides: Record<string, any> = {}) {
  return {
    subject: 'Following up on your inquiry',
    body: 'Hi there,\n\nJust wanted to follow up on our recent conversation.',
    to: ['prospect@example.com'],
    ...overrides,
  };
}

/** Single successful draft-email fetch response. */
function mockDraftOk(data: Record<string, any> = makeDraftResponse()) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  } as any);
}

/** Single non-ok draft-email response. */
function mockDraftFail() {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    json: () => Promise.resolve({ error: 'Internal Server Error' }),
  } as any);
}

/** fetch throws a network error. */
function mockDraftThrow() {
  mockFetch.mockRejectedValueOnce(new Error('Network error'));
}

/**
 * Render open=false then rerender open=true so the Dialog's useEffect detects
 * the transition and fires onOpenChange(true), which the component's
 * handleOpenChange wires to generateDraft.
 */
type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'lead' | 'opportunity' | 'account';
  entityId: string;
  draftType?: 'follow_up' | 'introduction' | 'proposal' | 'custom';
};

function renderAndOpen(props: Partial<ModalProps> = {}) {
  const onOpenChange = props.onOpenChange ?? vi.fn();
  const merged = { ...defaultProps, ...props, onOpenChange };

  const result = render(<EmailDraftModal {...merged} open={false} />);
  act(() => {
    result.rerender(<EmailDraftModal {...merged} open={true} />);
  });
  return result;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('EmailDraftModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clipboardStub.writeText.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // 1. Visibility
  // -------------------------------------------------------------------------

  describe('visibility', () => {
    it('renders nothing when open is false', () => {
      render(<EmailDraftModal {...defaultProps} open={false} onOpenChange={vi.fn()} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not call the draft API when open is false', () => {
      render(<EmailDraftModal {...defaultProps} open={false} onOpenChange={vi.fn()} />);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('renders the dialog title when open is true', () => {
      mockDraftOk();
      renderAndOpen();
      expect(screen.getByText('AI Email Draft')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Auto-fetch on open (false → true transition)
  // -------------------------------------------------------------------------

  describe('auto-fetch on open', () => {
    it('calls /api/ai/draft-email with the correct payload when opened', async () => {
      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/ai/draft-email',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entity_type: 'lead',
              entity_id: 'lead-abc-123',
              draft_type: 'follow_up',
            }),
          }),
        );
      });
    });

    it('sends correct entity_type and draft_type for an opportunity', async () => {
      mockDraftOk();
      renderAndOpen({
        entityType: 'opportunity',
        entityId: 'opp-xyz-999',
        draftType: 'proposal',
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/ai/draft-email',
          expect.objectContaining({
            body: JSON.stringify({
              entity_type: 'opportunity',
              entity_id: 'opp-xyz-999',
              draft_type: 'proposal',
            }),
          }),
        );
      });
    });

    it('does not re-fetch when dialog is already open and has content', async () => {
      const onOpenChange = vi.fn();

      mockDraftOk();
      const { rerender } = render(
        <EmailDraftModal {...defaultProps} open={false} onOpenChange={onOpenChange} />,
      );
      act(() => {
        rerender(<EmailDraftModal {...defaultProps} open={true} onOpenChange={onOpenChange} />);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      // Re-render with the same open=true — no state transition, no new fetch.
      rerender(<EmailDraftModal {...defaultProps} open={true} onOpenChange={onOpenChange} />);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Loading / generating state
  // -------------------------------------------------------------------------

  describe('loading state', () => {
    it('shows "Generating draft…" while the initial fetch is pending', async () => {
      // Never resolves — stays loading
      mockFetch.mockReturnValueOnce(new Promise(() => {}));
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByText('Generating draft...')).toBeInTheDocument();
      });
    });

    it('hides the spinner and shows form fields after the draft loads', async () => {
      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.queryByText('Generating draft...')).not.toBeInTheDocument();
      });

      expect(screen.getByLabelText('To')).toBeInTheDocument();
      expect(screen.getByLabelText('Subject')).toBeInTheDocument();
      expect(screen.getByLabelText('Body')).toBeInTheDocument();
    });

    it('disables the Regenerate button while loading', async () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}));
      renderAndOpen();

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /Regenerate/i });
        expect(btn).toBeDisabled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // 4. Displaying generated content
  // -------------------------------------------------------------------------

  describe('generated content display', () => {
    it('populates Subject and Body fields from the API response', async () => {
      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      const bodyField = screen.getByLabelText('Body') as HTMLTextAreaElement;
      expect(bodyField.value).toBe(
        'Hi there,\n\nJust wanted to follow up on our recent conversation.',
      );
    });

    it('populates the To field from the first address in the response', async () => {
      mockDraftOk(makeDraftResponse({ to: ['client@acme.com'] }));
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByLabelText('To')).toHaveValue('client@acme.com');
      });
    });

    it('leaves To empty when the API returns an empty to array', async () => {
      mockDraftOk(makeDraftResponse({ to: [] }));
      renderAndOpen();

      await waitFor(() => {
        expect(screen.queryByText('Generating draft...')).not.toBeInTheDocument();
      });

      const toInput = screen.getByLabelText('To') as HTMLInputElement;
      expect(toInput.value).toBe('');
    });

    it('allows editing Subject after generation', async () => {
      const user = userEvent.setup();
      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      const subjectInput = screen.getByLabelText('Subject');
      await user.clear(subjectInput);
      await user.type(subjectInput, 'Custom Subject Line');

      expect(subjectInput).toHaveValue('Custom Subject Line');
    });

    it('allows editing Body after generation', async () => {
      const user = userEvent.setup();
      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByLabelText('Body')).not.toHaveValue('');
      });

      const bodyInput = screen.getByLabelText('Body');
      await user.clear(bodyInput);
      await user.type(bodyInput, 'Replacement body text');

      expect(bodyInput).toHaveValue('Replacement body text');
    });
  });

  // -------------------------------------------------------------------------
  // 5. Regenerate button
  // -------------------------------------------------------------------------

  describe('Regenerate button', () => {
    it('renders the Regenerate button after the draft loads', async () => {
      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.queryByText('Generating draft...')).not.toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Regenerate/i })).toBeInTheDocument();
    });

    it('triggers a new API call when Regenerate is clicked', async () => {
      const user = userEvent.setup();
      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      // Second call returns an updated draft.
      mockDraftOk(
        makeDraftResponse({
          subject: 'Revised follow-up subject',
          body: 'Updated body content.',
        }),
      );

      await user.click(screen.getByRole('button', { name: /Regenerate/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Revised follow-up subject');
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('disables Regenerate while a regeneration fetch is in progress', async () => {
      const user = userEvent.setup();
      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      // Second call never resolves — stays loading.
      mockFetch.mockReturnValueOnce(new Promise(() => {}));
      await user.click(screen.getByRole('button', { name: /Regenerate/i }));

      expect(screen.getByRole('button', { name: /Regenerate/i })).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // 6. Copy button
  // -------------------------------------------------------------------------

  describe('Copy button', () => {
    it('renders the Copy button after the draft loads', async () => {
      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.queryByText('Generating draft...')).not.toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /^Copy$/i })).toBeInTheDocument();
    });

    it('calls clipboard.writeText with "Subject: …\\n\\n<body>" format', async () => {
      const user = userEvent.setup();

      // Create a fresh spy inside this test and patch navigator.clipboard
      // directly so the component's handleCopy references this exact function.
      const capturedArgs: string[] = [];
      const localWriteText = vi.fn((text: string) => {
        capturedArgs.push(text);
        return Promise.resolve();
      });
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: localWriteText },
        configurable: true,
        writable: true,
      });

      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      await user.click(screen.getByRole('button', { name: /^Copy$/i }));

      // "Copied!" appearing proves handleCopy ran and writeText resolved.
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });

      expect(capturedArgs).toContain(
        'Subject: Following up on your inquiry\n\nHi there,\n\nJust wanted to follow up on our recent conversation.',
      );
    });

    it('shows "Copied!" immediately after clicking Copy', async () => {
      const user = userEvent.setup();
      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.queryByText('Generating draft...')).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^Copy$/i }));

      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    it('reverts "Copied!" back to "Copy" after 2 seconds', { timeout: 10000 }, async () => {
      const user = userEvent.setup();
      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.queryByText('Generating draft...')).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^Copy$/i }));
      expect(screen.getByText('Copied!')).toBeInTheDocument();

      // The component resets after 2000ms — wait up to 3s.
      await waitFor(
        () => {
          expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
          expect(screen.getByRole('button', { name: /^Copy$/i })).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  // -------------------------------------------------------------------------
  // 7. Send button
  // -------------------------------------------------------------------------

  describe('Send button', () => {
    it('is disabled when To, Subject, and Body are all empty', async () => {
      mockDraftOk(makeDraftResponse({ to: [], subject: '', body: '' }));
      renderAndOpen();

      await waitFor(() => {
        expect(screen.queryByText('Generating draft...')).not.toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /^Send$/i })).toBeDisabled();
    });

    it('is disabled when To is empty even with Subject and Body filled', async () => {
      mockDraftOk(makeDraftResponse({ to: [] }));
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      expect(screen.getByRole('button', { name: /^Send$/i })).toBeDisabled();
    });

    it('is enabled when To, Subject, and Body are all populated', async () => {
      mockDraftOk(); // to: ['prospect@example.com'], subject, body all present
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      expect(screen.getByRole('button', { name: /^Send$/i })).not.toBeDisabled();
    });

    it('calls /api/email/send with the correct lead entity payload', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      mockDraftOk();
      renderAndOpen({ onOpenChange });

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      mockFetch.mockResolvedValueOnce({ ok: true } as any);
      await user.click(screen.getByRole('button', { name: /^Send$/i }));

      await waitFor(() => {
        const lastCall = mockFetch.mock.calls.at(-1)!;
        expect(lastCall[0]).toBe('/api/email/send');
        const body = JSON.parse(lastCall[1].body);
        expect(body).toEqual({
          to: [{ address: 'prospect@example.com' }],
          subject: 'Following up on your inquiry',
          body: 'Hi there,\n\nJust wanted to follow up on our recent conversation.',
          bodyType: 'text',
          leadId: 'lead-abc-123',
        });
      });
    });

    it('includes accountId (not leadId) for account entity type', async () => {
      const user = userEvent.setup();

      mockDraftOk();
      renderAndOpen({ entityType: 'account', entityId: 'acct-999' });

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      mockFetch.mockResolvedValueOnce({ ok: true } as any);
      await user.click(screen.getByRole('button', { name: /^Send$/i }));

      await waitFor(() => {
        const lastCall = mockFetch.mock.calls.at(-1)!;
        const body = JSON.parse(lastCall[1].body);
        expect(body.accountId).toBe('acct-999');
        expect(body).not.toHaveProperty('leadId');
      });
    });

    it('includes neither leadId nor accountId for opportunity entity type', async () => {
      const user = userEvent.setup();

      mockDraftOk();
      renderAndOpen({ entityType: 'opportunity', entityId: 'opp-555' });

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      mockFetch.mockResolvedValueOnce({ ok: true } as any);
      await user.click(screen.getByRole('button', { name: /^Send$/i }));

      await waitFor(() => {
        const lastCall = mockFetch.mock.calls.at(-1)!;
        const body = JSON.parse(lastCall[1].body);
        expect(body).not.toHaveProperty('leadId');
        expect(body).not.toHaveProperty('accountId');
      });
    });

    it('calls onOpenChange(false) after a successful send', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      mockDraftOk();
      renderAndOpen({ onOpenChange });

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      mockFetch.mockResolvedValueOnce({ ok: true } as any);
      await user.click(screen.getByRole('button', { name: /^Send$/i }));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('shows "Failed to send email" when /api/email/send returns non-ok', async () => {
      const user = userEvent.setup();

      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      mockFetch.mockResolvedValueOnce({ ok: false } as any);
      await user.click(screen.getByRole('button', { name: /^Send$/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to send email')).toBeInTheDocument();
      });
    });

    it('shows "Failed to send email" when the send fetch throws', async () => {
      const user = userEvent.setup();

      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await user.click(screen.getByRole('button', { name: /^Send$/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to send email')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // 8. Close / cancel
  // -------------------------------------------------------------------------

  describe('close / cancel', () => {
    it('hides the dialog when open transitions to false', async () => {
      mockDraftOk();
      const onOpenChange = vi.fn();

      const { rerender } = render(
        <EmailDraftModal {...defaultProps} open={false} onOpenChange={onOpenChange} />,
      );
      act(() => {
        rerender(<EmailDraftModal {...defaultProps} open={true} onOpenChange={onOpenChange} />);
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(<EmailDraftModal {...defaultProps} open={false} onOpenChange={onOpenChange} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('resets state so the spinner appears on re-open', async () => {
      const onOpenChange = vi.fn();

      // First open
      mockDraftOk();
      const { rerender } = render(
        <EmailDraftModal {...defaultProps} open={false} onOpenChange={onOpenChange} />,
      );
      act(() => {
        rerender(<EmailDraftModal {...defaultProps} open={true} onOpenChange={onOpenChange} />);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Following up on your inquiry');
      });

      // Close — handleOpenChange(false) clears subject/body/to/error.
      rerender(<EmailDraftModal {...defaultProps} open={false} onOpenChange={onOpenChange} />);

      // Re-open — state is cleared, so spinner appears while new draft loads.
      mockDraftOk(makeDraftResponse({ subject: 'Brand new subject', body: 'Fresh body' }));
      act(() => {
        rerender(<EmailDraftModal {...defaultProps} open={true} onOpenChange={onOpenChange} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Generating draft...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Subject')).toHaveValue('Brand new subject');
      });
    });
  });

  // -------------------------------------------------------------------------
  // 9. Error states
  // -------------------------------------------------------------------------

  describe('error states', () => {
    it('shows "Failed to generate draft" when the API returns non-ok', async () => {
      mockDraftFail();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByText('Failed to generate draft')).toBeInTheDocument();
      });
    });

    it('shows "Failed to generate draft" when fetch throws a network error', async () => {
      mockDraftThrow();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByText('Failed to generate draft')).toBeInTheDocument();
      });
    });

    it('does not show an error message on a successful initial load', async () => {
      mockDraftOk();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.queryByText('Generating draft...')).not.toBeInTheDocument();
      });

      expect(screen.queryByText('Failed to generate draft')).not.toBeInTheDocument();
    });

    it('clears a previous error when Regenerate succeeds', async () => {
      const user = userEvent.setup();

      mockDraftFail();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByText('Failed to generate draft')).toBeInTheDocument();
      });

      mockDraftOk();
      await user.click(screen.getByRole('button', { name: /Regenerate/i }));

      await waitFor(() => {
        expect(screen.queryByText('Failed to generate draft')).not.toBeInTheDocument();
      });
    });

    it('renders form fields (not a blank screen) when the API errors', async () => {
      mockDraftFail();
      renderAndOpen();

      await waitFor(() => {
        expect(screen.getByText('Failed to generate draft')).toBeInTheDocument();
      });

      // loading=false, subject="" → form view is rendered (not spinner)
      expect(screen.getByLabelText('To')).toBeInTheDocument();
      expect(screen.getByLabelText('Subject')).toBeInTheDocument();
      expect(screen.getByLabelText('Body')).toBeInTheDocument();
    });
  });
});
