import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetSessionCallCount, AiSuggestion } from '@/components/AI/AiSuggestion';

// Mock fetch globally — must come before component import for correct hoisting
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a resolved fetch response */
function makeFetchResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  } as Response);
}

/**
 * Advance fake timers by the debounce window (500 ms) and flush all
 * microtasks/promises so React state updates are flushed too.
 * Using runAllTimersAsync avoids the waitFor + fake-timer deadlock.
 */
async function flushDebounce() {
  await act(async () => {
    await vi.runAllTimersAsync();
  });
}

const defaultProps = {
  field: 'description',
  context: { projectType: 'residential', division: 'homes' },
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AiSuggestion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    _resetSessionCallCount();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Fetch on mount ─────────────────────────────────────────────────────────

  it('fetches suggestion from /api/ai/suggest with correct field and context params', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ suggestion: null }));

    render(<AiSuggestion {...defaultProps} />);
    await flushDebounce();

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url, 'http://localhost');
    expect(parsed.pathname).toBe('/api/ai/suggest');
    expect(parsed.searchParams.get('field')).toBe('description');
    expect(JSON.parse(parsed.searchParams.get('context')!)).toEqual(defaultProps.context);
  });

  // ─── Shows suggestion text ──────────────────────────────────────────────────

  it('renders suggestion value and explanation when API returns data', async () => {
    mockFetch.mockReturnValue(
      makeFetchResponse({
        suggestion: 'Custom hardwood flooring throughout',
        explanation: 'Based on similar residential projects',
      }),
    );

    render(<AiSuggestion {...defaultProps} />);
    await flushDebounce();

    expect(screen.getByText('Based on similar residential projects')).toBeInTheDocument();
  });

  it('renders Apply button with the suggestion value in its aria-label', async () => {
    mockFetch.mockReturnValue(
      makeFetchResponse({
        suggestion: 'Custom hardwood flooring throughout',
        explanation: 'Based on similar residential projects',
      }),
    );

    render(<AiSuggestion {...defaultProps} onApply={vi.fn()} />);
    await flushDebounce();

    expect(
      screen.getByRole('button', {
        name: /Apply suggestion: Custom hardwood flooring throughout/i,
      }),
    ).toBeInTheDocument();
  });

  it('shows the Apply button label text', async () => {
    mockFetch.mockReturnValue(
      makeFetchResponse({
        suggestion: 'Tile flooring',
        explanation: 'Common choice for this area',
      }),
    );

    render(<AiSuggestion {...defaultProps} onApply={vi.fn()} />);
    await flushDebounce();

    expect(screen.getByText('Apply')).toBeInTheDocument();
  });

  // ─── Explanation text ────────────────────────────────────────────────────────

  it('displays explanation alongside suggestion', async () => {
    mockFetch.mockReturnValue(
      makeFetchResponse({
        suggestion: 'Engineered hardwood',
        explanation: 'High durability for high-traffic areas',
      }),
    );

    render(<AiSuggestion {...defaultProps} onApply={vi.fn()} />);
    await flushDebounce();

    expect(screen.getByText('High durability for high-traffic areas')).toBeInTheDocument();
  });

  it('renders Apply button even when explanation is omitted by API', async () => {
    mockFetch.mockReturnValue(
      makeFetchResponse({
        suggestion: 'Standard drywall',
        // explanation intentionally omitted — defaults to ''
      }),
    );

    render(<AiSuggestion {...defaultProps} onApply={vi.fn()} />);
    await flushDebounce();

    // Apply button must appear (suggestion is truthy)
    expect(screen.getByText('Apply')).toBeInTheDocument();
  });

  // ─── onApply callback ────────────────────────────────────────────────────────

  it('fires onApply with suggestion value when Apply is clicked', async () => {
    const onApply = vi.fn();
    mockFetch.mockReturnValue(
      makeFetchResponse({
        suggestion: 'Premium vinyl plank flooring',
        explanation: 'Great moisture resistance',
      }),
    );

    render(<AiSuggestion {...defaultProps} onApply={onApply} />);
    await flushDebounce();

    fireEvent.click(screen.getByText('Apply'));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith('Premium vinyl plank flooring');
  });

  it('does not render Apply button when onApply prop is omitted', async () => {
    mockFetch.mockReturnValue(
      makeFetchResponse({
        suggestion: 'Some suggestion',
        explanation: 'Some explanation',
      }),
    );

    // No onApply prop
    render(<AiSuggestion field="description" context={{}} />);
    await flushDebounce();

    expect(screen.getByText('Some explanation')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Apply/i })).toBeNull();
  });

  // ─── Null / falsy suggestion — render nothing ─────────────────────────────

  it('renders nothing when API returns { suggestion: null }', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ suggestion: null }));

    const { container } = render(<AiSuggestion {...defaultProps} onApply={vi.fn()} />);
    await flushDebounce();

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when API returns an empty object', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({}));

    const { container } = render(<AiSuggestion {...defaultProps} />);
    await flushDebounce();

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when API returns suggestion as empty string', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ suggestion: '' }));

    const { container } = render(<AiSuggestion {...defaultProps} />);
    await flushDebounce();

    expect(container.firstChild).toBeNull();
  });

  // ─── Error handling ──────────────────────────────────────────────────────────

  it('does not crash and renders nothing when fetch rejects (network error)', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { container } = render(<AiSuggestion {...defaultProps} />);
    await flushDebounce();

    expect(container.firstChild).toBeNull();
  });

  it('does not crash and renders nothing when fetch returns a non-ok response', async () => {
    // Non-ok → component treats as null → no state update
    mockFetch.mockReturnValue(makeFetchResponse({ error: 'Internal server error' }, false));

    const { container } = render(<AiSuggestion {...defaultProps} />);
    await flushDebounce();

    expect(container.firstChild).toBeNull();
  });

  it('does not crash when API returns malformed JSON', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      } as any),
    );

    const { container } = render(<AiSuggestion {...defaultProps} />);
    await flushDebounce();

    expect(container.firstChild).toBeNull();
  });

  // ─── Debounce behavior ───────────────────────────────────────────────────────

  it('does not fetch before the 500 ms debounce window elapses', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ suggestion: null }));

    render(<AiSuggestion {...defaultProps} />);

    // Advance only 499 ms — timer should NOT have fired yet
    await act(async () => {
      vi.advanceTimersByTime(499);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches exactly once after the full debounce window elapses', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ suggestion: null }));

    render(<AiSuggestion {...defaultProps} />);
    await flushDebounce();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('cancels pending debounce and only fetches once when context changes mid-window', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ suggestion: null }));

    const { rerender } = render(
      <AiSuggestion field="description" context={{ division: 'homes' }} />,
    );

    // Advance 300 ms — debounce still pending
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(mockFetch).not.toHaveBeenCalled();

    // Context changes → cleanup fires (clearTimeout + abort), new 500 ms starts
    rerender(<AiSuggestion field="description" context={{ division: 'contracting' }} />);

    // Advance another 200 ms (old timer would have fired at 500 ms — but was cleared)
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(mockFetch).not.toHaveBeenCalled();

    // Complete the new debounce window (300 ms remaining)
    await flushDebounce();

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url, 'http://localhost');
    // Must have used the updated context
    expect(JSON.parse(parsed.searchParams.get('context')!)).toEqual({ division: 'contracting' });
  });

  // ─── AbortController cleanup ─────────────────────────────────────────────────

  it('passes an AbortSignal to fetch', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ suggestion: null }));

    render(<AiSuggestion {...defaultProps} />);
    await flushDebounce();

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('aborts the in-flight fetch request on unmount', async () => {
    let capturedSignal: AbortSignal | undefined;

    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise(() => {}); // never resolves — simulates in-flight request
    });

    const { unmount } = render(<AiSuggestion {...defaultProps} />);

    // Trigger fetch (debounce fires)
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('clears debounce timeout on unmount so fetch is never called', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ suggestion: null }));

    const { unmount } = render(<AiSuggestion {...defaultProps} />);

    // Debounce has not fired yet (200 ms in)
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    unmount();

    // Run remaining timers — fetch must NOT be called because timeout was cleared
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ─── Accessibility ───────────────────────────────────────────────────────────

  it('Apply button has a descriptive aria-label containing the suggested value', async () => {
    mockFetch.mockReturnValue(
      makeFetchResponse({
        suggestion: 'Engineered hardwood floors',
        explanation: 'Popular choice',
      }),
    );

    render(<AiSuggestion {...defaultProps} onApply={vi.fn()} />);
    await flushDebounce();

    const btn = screen.getByRole('button', {
      name: /Apply suggestion: Engineered hardwood floors/i,
    });
    expect(btn).toBeInTheDocument();
  });

  it('Apply button has type="button" so it does not submit parent forms', async () => {
    mockFetch.mockReturnValue(
      makeFetchResponse({
        suggestion: 'Ceramic tile',
        explanation: 'Easy to clean',
      }),
    );

    render(<AiSuggestion {...defaultProps} onApply={vi.fn()} />);
    await flushDebounce();

    const btn = screen.getByRole('button', { name: /Apply suggestion/i });
    expect(btn).toHaveAttribute('type', 'button');
  });
});

// ─── Session call limit ───────────────────────────────────────────────────────

describe('session call limit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    _resetSessionCallCount();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Render a component and advance past the debounce so one fetch fires.
   * Returns the container for further assertions.
   */
  const emptyCtx = defaultProps.context;

  async function renderAndFlush(props = defaultProps) {
    const result = render(<AiSuggestion {...props} />);
    await flushDebounce();
    return result;
  }

  it('shows the paused message after 10 fetch calls', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ suggestion: null }));

    // Exhaust 10 calls — each render + flush increments sessionCallCount by 1
    for (let i = 0; i < 10; i++) {
      const { unmount } = await renderAndFlush({ field: `f${i}`, context: emptyCtx });
      unmount();
    }

    // The 11th render should see sessionCallCount >= 10 and enter paused state
    const { container } = render(<AiSuggestion field="extra" context={emptyCtx} />);
    await flushDebounce();

    expect(container.textContent).toMatch(/AI suggestions paused/i);
  });

  it('does not call fetch when session limit is already reached', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ suggestion: null }));

    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      const { unmount } = await renderAndFlush({ field: `f${i}`, context: emptyCtx });
      unmount();
    }

    const callCountAfterExhaustion = mockFetch.mock.calls.length;

    // Render one more — must NOT add another fetch call
    render(<AiSuggestion field="extra" context={emptyCtx} />);
    await flushDebounce();

    expect(mockFetch.mock.calls.length).toBe(callCountAfterExhaustion);
  });

  it('allows fetches again after resetting the counter', async () => {
    mockFetch.mockReturnValue(makeFetchResponse({ suggestion: null }));

    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      const { unmount } = await renderAndFlush({ field: `f${i}`, context: emptyCtx });
      unmount();
    }

    // Confirm paused
    const { container: pausedContainer, unmount: unmountPaused } = render(
      <AiSuggestion field="paused-check" context={emptyCtx} />,
    );
    await flushDebounce();
    expect(pausedContainer.textContent).toMatch(/AI suggestions paused/i);
    unmountPaused();

    // Reset counter
    _resetSessionCallCount();

    const callsBefore = mockFetch.mock.calls.length;

    // Should fetch again
    render(<AiSuggestion field="after-reset" context={emptyCtx} />);
    await flushDebounce();

    expect(mockFetch.mock.calls.length).toBe(callsBefore + 1);
  });
});
