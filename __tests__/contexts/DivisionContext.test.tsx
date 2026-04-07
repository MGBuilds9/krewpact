import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn().mockReturnValue({ data: { id: 'user-1' } }),
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}));

import {
  ALL_DIVISIONS,
  ALL_DIVISIONS_ID,
  DivisionProvider,
  type DivisionWithRole,
  getDivisionFilter,
  isAllDivisions,
  requireConcreteDivision,
  useDivision,
} from '@/contexts/DivisionContext';
import { apiFetch } from '@/lib/api-client';

const mockApiFetch = vi.mocked(apiFetch);

function makeDivision(overrides: Partial<DivisionWithRole> = {}): DivisionWithRole {
  return {
    id: 'div-primary',
    name: 'Primary Division',
    code: 'PRIMARY',
    description: null,
    is_active: true,
    manager_id: null,
    settings: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_role: 'admin',
    is_primary: true,
    ...overrides,
  };
}

const PRIMARY = makeDivision();
const SECONDARY = makeDivision({
  id: 'div-secondary',
  name: 'Secondary Division',
  code: 'SECONDARY',
  is_primary: false,
});

function setupApiResponses(divisions: DivisionWithRole[]) {
  mockApiFetch.mockImplementation((url: string) => {
    if (url.startsWith('/api/user/divisions')) return Promise.resolve(divisions);
    if (url.startsWith('/api/org/divisions')) {
      return Promise.resolve({
        data: divisions.map((d) => ({ id: d.id, name: d.name, code: d.code })),
      });
    }
    return Promise.resolve(null);
  });
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DivisionProvider>{children}</DivisionProvider>
      </QueryClientProvider>
    );
  };
}

describe('DivisionContext helpers (pure)', () => {
  describe('isAllDivisions', () => {
    it('returns true for the sentinel object', () => {
      expect(isAllDivisions(ALL_DIVISIONS)).toBe(true);
    });

    it('returns false for a concrete division', () => {
      expect(isAllDivisions(PRIMARY)).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isAllDivisions(null)).toBe(false);
      expect(isAllDivisions(undefined)).toBe(false);
    });
  });

  describe('getDivisionFilter', () => {
    it('returns undefined for the sentinel (so the query is unscoped)', () => {
      expect(getDivisionFilter(ALL_DIVISIONS)).toBeUndefined();
    });

    it('returns undefined for null/undefined', () => {
      expect(getDivisionFilter(null)).toBeUndefined();
      expect(getDivisionFilter(undefined)).toBeUndefined();
    });

    it('returns the concrete division id when one is selected', () => {
      expect(getDivisionFilter(PRIMARY)).toBe('div-primary');
      expect(getDivisionFilter(SECONDARY)).toBe('div-secondary');
    });
  });

  describe('requireConcreteDivision', () => {
    it('returns the active division id when it is concrete', () => {
      expect(requireConcreteDivision(PRIMARY, [PRIMARY, SECONDARY])).toBe('div-primary');
      expect(requireConcreteDivision(SECONDARY, [PRIMARY, SECONDARY])).toBe('div-secondary');
    });

    it('falls back to the primary division when the sentinel is active', () => {
      expect(requireConcreteDivision(ALL_DIVISIONS, [SECONDARY, PRIMARY])).toBe('div-primary');
    });

    it('falls back to the first available division when no primary exists', () => {
      const a = makeDivision({ id: 'div-a', is_primary: false });
      const b = makeDivision({ id: 'div-b', is_primary: false });
      expect(requireConcreteDivision(ALL_DIVISIONS, [a, b])).toBe('div-a');
    });

    it('returns null when there are no available divisions', () => {
      expect(requireConcreteDivision(ALL_DIVISIONS, [])).toBeNull();
      expect(requireConcreteDivision(null, [])).toBeNull();
    });

    it('refuses the sentinel even when it is the active division', () => {
      // The whole point: never propagate the sentinel ID into a mutation.
      const result = requireConcreteDivision(ALL_DIVISIONS, [PRIMARY]);
      expect(result).not.toBe(ALL_DIVISIONS_ID);
      expect(result).toBe('div-primary');
    });
  });
});

describe('DivisionProvider sentinel bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('restores the ALL_DIVISIONS sentinel when localStorage holds it', async () => {
    localStorage.setItem('activeDivisionId', ALL_DIVISIONS_ID);
    setupApiResponses([PRIMARY, SECONDARY]);

    const { result } = renderHook(() => useDivision(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.activeDivision?.id).toBe(ALL_DIVISIONS_ID);
    });
    expect(isAllDivisions(result.current.activeDivision)).toBe(true);
  });

  it('falls back to the primary division when localStorage holds an unknown ID', async () => {
    localStorage.setItem('activeDivisionId', 'div-that-was-revoked');
    setupApiResponses([PRIMARY, SECONDARY]);

    const { result } = renderHook(() => useDivision(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.activeDivision?.id).toBe('div-primary');
    });
  });

  it('defaults to the primary division on first boot when nothing is stored', async () => {
    setupApiResponses([SECONDARY, PRIMARY]);

    const { result } = renderHook(() => useDivision(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.activeDivision?.id).toBe('div-primary');
    });
    expect(localStorage.getItem('activeDivisionId')).toBe('div-primary');
  });

  it('round-trips the sentinel through setActiveDivision + localStorage', async () => {
    setupApiResponses([PRIMARY, SECONDARY]);

    const { result } = renderHook(() => useDivision(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.activeDivision?.id).toBe('div-primary');
    });

    act(() => {
      result.current.setActiveDivision(ALL_DIVISIONS_ID);
    });

    await waitFor(() => {
      expect(result.current.activeDivision?.id).toBe(ALL_DIVISIONS_ID);
    });
    expect(localStorage.getItem('activeDivisionId')).toBe(ALL_DIVISIONS_ID);
  });

  it('rejects setActiveDivision for an unknown division ID', async () => {
    setupApiResponses([PRIMARY, SECONDARY]);

    const { result } = renderHook(() => useDivision(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.activeDivision?.id).toBe('div-primary');
    });

    act(() => {
      result.current.setActiveDivision('div-that-does-not-exist');
    });

    // Active division should not change.
    expect(result.current.activeDivision?.id).toBe('div-primary');
  });

  it('switches back from the sentinel to a concrete division', async () => {
    localStorage.setItem('activeDivisionId', ALL_DIVISIONS_ID);
    setupApiResponses([PRIMARY, SECONDARY]);

    const { result } = renderHook(() => useDivision(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.activeDivision?.id).toBe(ALL_DIVISIONS_ID);
    });

    act(() => {
      result.current.setActiveDivision('div-secondary');
    });

    await waitFor(() => {
      expect(result.current.activeDivision?.id).toBe('div-secondary');
    });
    expect(localStorage.getItem('activeDivisionId')).toBe('div-secondary');
  });
});
