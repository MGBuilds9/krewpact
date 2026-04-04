import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRecentPages } from '@/hooks/useRecentPages';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

vi.mock('@/components/Layout/CommandPaletteTypes', () => ({
  navigationSections: [
    {
      title: 'CRM',
      items: [
        { href: '/crm/leads', label: 'Leads', icon: {} },
        { href: '/crm/accounts', label: 'Accounts', icon: {} },
      ],
    },
  ],
}));

describe('useRecentPages', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty recentItems when localStorage is empty', () => {
    const { result } = renderHook(() => useRecentPages('/crm/leads'));
    expect(result.current.recentItems).toEqual([]);
  });

  it('does not track root or dashboard paths', () => {
    const { rerender, result } = renderHook(({ path }) => useRecentPages(path), {
      initialProps: { path: '/' },
    });
    rerender({ path: '/dashboard' });
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(result.current.recentItems).toEqual([]);
  });

  it('tracks a new pathname and resolves it to a NavItem', async () => {
    const { rerender, result } = renderHook(({ path }) => useRecentPages(path), {
      initialProps: { path: '/some/other' },
    });

    await act(async () => {
      rerender({ path: '/crm/leads' });
      await Promise.resolve();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'recentPages',
      JSON.stringify(['/crm/leads']),
    );
    expect(result.current.recentItems).toHaveLength(1);
    expect(result.current.recentItems[0].label).toBe('Leads');
  });

  it('deduplicates and moves existing path to front', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(['/crm/leads', '/crm/accounts']));

    const { rerender } = renderHook(({ path }) => useRecentPages(path), {
      initialProps: { path: '/some/other' },
    });

    await act(async () => {
      rerender({ path: '/crm/accounts' });
      await Promise.resolve();
    });

    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(saved[0]).toBe('/crm/accounts');
    expect(saved.filter((p: string) => p === '/crm/accounts')).toHaveLength(1);
  });

  it('limits stored pages to 5', async () => {
    const existing = ['/a', '/b', '/c', '/d', '/e'];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(existing));

    const { rerender } = renderHook(({ path }) => useRecentPages(path), {
      initialProps: { path: '/some/other' },
    });

    await act(async () => {
      rerender({ path: '/crm/leads' });
      await Promise.resolve();
    });

    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(saved).toHaveLength(5);
    expect(saved[0]).toBe('/crm/leads');
  });

  it('filters out paths not found in navigationSections', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(['/unknown/path']));

    const { result } = renderHook(() => useRecentPages('/some/page'));
    expect(result.current.recentItems).toHaveLength(0);
  });

  it('does not re-track the same path twice in a row', async () => {
    const { rerender } = renderHook(({ path }) => useRecentPages(path), {
      initialProps: { path: '/crm/leads' },
    });

    await act(async () => {
      rerender({ path: '/crm/leads' });
      await Promise.resolve();
    });

    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });
});
