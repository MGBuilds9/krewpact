import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: vi.fn(),
}));

import { useDivision } from '@/contexts/DivisionContext';
import { useDivisionName } from '@/hooks/useDivisionName';

const mockUseDivision = vi.mocked(useDivision);

const mockDivisions = [
  { id: 'uuid-1', name: 'MDM Contracting', code: 'contracting' },
  { id: 'uuid-2', name: 'MDM Homes', code: 'homes' },
];

describe('useDivisionName', () => {
  it('returns empty string when loading', () => {
    mockUseDivision.mockReturnValue({ isLoading: true, userDivisions: [] } as any);
    const { result } = renderHook(() => useDivisionName('uuid-1'));
    expect(result.current).toEqual({ name: '', isLoading: true });
  });

  it('returns "All Divisions" for null divisionId', () => {
    mockUseDivision.mockReturnValue({ isLoading: false, userDivisions: mockDivisions } as any);
    const { result } = renderHook(() => useDivisionName(null));
    expect(result.current).toEqual({ name: 'All Divisions', isLoading: false });
  });

  it('returns "All Divisions" for undefined divisionId', () => {
    mockUseDivision.mockReturnValue({ isLoading: false, userDivisions: mockDivisions } as any);
    const { result } = renderHook(() => useDivisionName(undefined));
    expect(result.current).toEqual({ name: 'All Divisions', isLoading: false });
  });

  it('returns division name when UUID matches', () => {
    mockUseDivision.mockReturnValue({ isLoading: false, userDivisions: mockDivisions } as any);
    const { result } = renderHook(() => useDivisionName('uuid-1'));
    expect(result.current).toEqual({ name: 'MDM Contracting', isLoading: false });
  });

  it('returns "Unknown Division" when UUID has no match', () => {
    mockUseDivision.mockReturnValue({ isLoading: false, userDivisions: mockDivisions } as any);
    const { result } = renderHook(() => useDivisionName('uuid-unknown'));
    expect(result.current).toEqual({ name: 'Unknown Division', isLoading: false });
  });
});
