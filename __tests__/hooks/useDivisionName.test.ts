import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: vi.fn(),
  getDivisionFilter: (d: { id?: string } | null | undefined) => d?.id,
  requireConcreteDivision: (d: { id?: string } | null | undefined) => d?.id ?? null,
  isAllDivisions: (d: { id?: string } | null | undefined) => d?.id === '__all_divisions__',
  ALL_DIVISIONS_ID: '__all_divisions__',
}));

import { useDivision } from '@/contexts/DivisionContext';
import { useDivisionName } from '@/hooks/useDivisionName';

const mockUseDivision = vi.mocked(useDivision);

const mockGetDivisionName = (id: string | null | undefined): string => {
  if (!id) return 'All Divisions';
  const map: Record<string, string> = { 'uuid-1': 'MDM Contracting', 'uuid-2': 'MDM Homes' };
  return map[id] ?? 'Unknown Division';
};

describe('useDivisionName', () => {
  it('returns empty string when loading', () => {
    mockUseDivision.mockReturnValue({
      isLoading: true,
      getDivisionName: mockGetDivisionName,
    } as any);
    const { result } = renderHook(() => useDivisionName('uuid-1'));
    expect(result.current).toEqual({ name: '', isLoading: true });
  });

  it('returns "All Divisions" for null divisionId', () => {
    mockUseDivision.mockReturnValue({
      isLoading: false,
      getDivisionName: mockGetDivisionName,
    } as any);
    const { result } = renderHook(() => useDivisionName(null));
    expect(result.current).toEqual({ name: 'All Divisions', isLoading: false });
  });

  it('returns "All Divisions" for undefined divisionId', () => {
    mockUseDivision.mockReturnValue({
      isLoading: false,
      getDivisionName: mockGetDivisionName,
    } as any);
    const { result } = renderHook(() => useDivisionName(undefined));
    expect(result.current).toEqual({ name: 'All Divisions', isLoading: false });
  });

  it('returns division name when UUID matches', () => {
    mockUseDivision.mockReturnValue({
      isLoading: false,
      getDivisionName: mockGetDivisionName,
    } as any);
    const { result } = renderHook(() => useDivisionName('uuid-1'));
    expect(result.current).toEqual({ name: 'MDM Contracting', isLoading: false });
  });

  it('returns "Unknown Division" when UUID has no match', () => {
    mockUseDivision.mockReturnValue({
      isLoading: false,
      getDivisionName: mockGetDivisionName,
    } as any);
    const { result } = renderHook(() => useDivisionName('uuid-unknown'));
    expect(result.current).toEqual({ name: 'Unknown Division', isLoading: false });
  });
});
