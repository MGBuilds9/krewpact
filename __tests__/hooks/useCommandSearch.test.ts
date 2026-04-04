import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCommandSearch } from '@/hooks/useCommandSearch';

const mockApiFetch = vi.fn();
vi.mock('@/lib/api-client', () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

describe('useCommandSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null results for query shorter than 2 chars', () => {
    const { result } = renderHook(() => useCommandSearch('a'));
    expect(result.current.searchResults).toBeNull();
    expect(result.current.isSearching).toBe(false);
    expect(result.current.isNlQuery).toBe(false);
  });

  it('fires keyword search after 300ms debounce', async () => {
    const mockResults = {
      leads: [],
      accounts: [],
      contacts: [],
      opportunities: [],
      estimates: [],
      projects: [],
      tasks: [],
    };
    mockApiFetch.mockResolvedValue({ results: mockResults });

    const { result } = renderHook(() => useCommandSearch('mdm'));

    expect(result.current.isSearching).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/search/global',
      expect.objectContaining({ params: { q: 'mdm' } }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.searchResults).toEqual(mockResults);
    expect(result.current.isSearching).toBe(false);
  });

  it('detects NL query and fires after 600ms', async () => {
    mockApiFetch.mockResolvedValue({ answer: 'You have 5 leads' });

    const { result } = renderHook(() => useCommandSearch('show me all leads'));

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/ai/query',
      expect.objectContaining({ method: 'POST', body: { query: 'show me all leads' } }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isNlQuery).toBe(true);
    expect(result.current.nlAnswer).toBe('You have 5 leads');
  });

  it('treats question mark queries as NL', async () => {
    mockApiFetch.mockResolvedValue({ answer: '42' });

    const { result } = renderHook(() => useCommandSearch('how many projects?'));

    expect(result.current.isNlQuery).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isNlQuery).toBe(true);
  });

  it('clears results when query drops below 2 chars', async () => {
    const mockResults = {
      leads: [],
      accounts: [],
      contacts: [],
      opportunities: [],
      estimates: [],
      projects: [],
      tasks: [],
    };
    mockApiFetch.mockResolvedValue({ results: mockResults });

    const { result, rerender } = renderHook(({ q }) => useCommandSearch(q), {
      initialProps: { q: 'mdm' },
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.searchResults).toEqual(mockResults);

    act(() => {
      rerender({ q: 'a' });
    });

    expect(result.current.searchResults).toBeNull();
    expect(result.current.isSearching).toBe(false);
  });

  it('aborts previous request when query changes', async () => {
    let resolveFirst!: (v: unknown) => void;
    mockApiFetch
      .mockReturnValueOnce(
        new Promise((r) => {
          resolveFirst = r;
        }),
      )
      .mockResolvedValue({
        results: {
          leads: [{ id: '2', name: 'B', subtitle: null }],
          accounts: [],
          contacts: [],
          opportunities: [],
          estimates: [],
          projects: [],
          tasks: [],
        },
      });

    const { result, rerender } = renderHook(({ q }) => useCommandSearch(q), {
      initialProps: { q: 'abc' },
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      rerender({ q: 'xyz' });
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      resolveFirst({
        results: {
          leads: [{ id: '1', name: 'A', subtitle: null }],
          accounts: [],
          contacts: [],
          opportunities: [],
          estimates: [],
          projects: [],
          tasks: [],
        },
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    // Final results should be from the second query, not the stale first
    expect(result.current.searchResults?.leads[0]?.name).toBe('B');
  });

  it('sets isSearching true while request in-flight then false on completion', async () => {
    let resolve!: (v: unknown) => void;
    mockApiFetch.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    const { result } = renderHook(() => useCommandSearch('test'));

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isSearching).toBe(true);

    await act(async () => {
      resolve({
        results: {
          leads: [],
          accounts: [],
          contacts: [],
          opportunities: [],
          estimates: [],
          projects: [],
          tasks: [],
        },
      });
      await Promise.resolve();
    });

    expect(result.current.isSearching).toBe(false);
  });
});
