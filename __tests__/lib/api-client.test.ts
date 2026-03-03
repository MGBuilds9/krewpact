import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, ApiError } from '@/lib/api-client';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('makes a GET request and returns JSON', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await apiFetch('/api/projects');
    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      '/api/projects',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('appends query params to URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }));

    await apiFetch('/api/projects', {
      params: { division_id: 'abc', limit: 10, empty: undefined },
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/projects?division_id=abc&limit=10',
      expect.any(Object),
    );
  });

  it('sends JSON body for POST', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"id":"1"}', { status: 201 }));

    await apiFetch('/api/projects', {
      method: 'POST',
      body: { name: 'New' },
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/projects',
      expect.objectContaining({
        method: 'POST',
        body: '{"name":"New"}',
      }),
    );
  });

  it('throws ApiError on non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }),
    );

    try {
      await apiFetch('/api/projects/bad');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
      expect((err as ApiError).message).toBe('Not found');
    }
  });

  it('handles non-JSON error responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    try {
      await apiFetch('/api/crash');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
    }
  });
});
