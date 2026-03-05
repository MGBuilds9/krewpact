import { describe, it, expect } from 'vitest';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';

describe('parsePagination', () => {
  it('returns defaults when no params', () => {
    const params = new URLSearchParams();
    expect(parsePagination(params)).toEqual({ limit: 25, offset: 0 });
  });

  it('parses limit and offset', () => {
    const params = new URLSearchParams({ limit: '10', offset: '20' });
    expect(parsePagination(params)).toEqual({ limit: 10, offset: 20 });
  });

  it('caps limit at maxLimit', () => {
    const params = new URLSearchParams({ limit: '500' });
    expect(parsePagination(params)).toEqual({ limit: 100, offset: 0 });
  });

  it('uses custom defaults', () => {
    const params = new URLSearchParams();
    expect(parsePagination(params, { defaultLimit: 50, maxLimit: 200 })).toEqual({
      limit: 50,
      offset: 0,
    });
  });

  it('handles invalid values', () => {
    const params = new URLSearchParams({ limit: 'abc', offset: '-1' });
    expect(parsePagination(params)).toEqual({ limit: 25, offset: 0 });
  });
});

describe('paginatedResponse', () => {
  it('returns correct hasMore when more data exists', () => {
    const result = paginatedResponse([{ id: 1 }], 50, 25, 0);
    expect(result.hasMore).toBe(true);
    expect(result.total).toBe(50);
  });

  it('returns hasMore=false on last page', () => {
    const result = paginatedResponse([{ id: 1 }], 10, 25, 0);
    expect(result.hasMore).toBe(false);
  });

  it('handles null data', () => {
    const result = paginatedResponse(null, null, 25, 0);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});
