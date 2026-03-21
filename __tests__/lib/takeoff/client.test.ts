import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('TakeoffEngineClient', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.TAKEOFF_ENGINE_URL = 'https://takeoff.test.com';
    process.env.TAKEOFF_ENGINE_TOKEN = 'test-token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns stubs in mock mode when TAKEOFF_ENGINE_URL is missing', async () => {
    process.env.TAKEOFF_ENGINE_URL = '';
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    expect(client.isMockMode()).toBe(true);
    const result = await client.createJob({
      estimate_id: 'est-1',
      file_urls: [],
      filenames: [],
    });
    expect(result.job_id).toMatch(/^mock-job-/);
  });

  it('returns stubs in mock mode when TAKEOFF_ENGINE_URL is "mock"', async () => {
    process.env.TAKEOFF_ENGINE_URL = 'mock';
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    expect(client.isMockMode()).toBe(true);
    const status = await client.getJobStatus('job-abc');
    expect(status).toMatchObject({ job_id: 'job-abc', status: 'pending' });
    const lines = await client.getJobLines('job-abc');
    expect(lines).toEqual([]);
    await expect(client.cancelJob('job-abc')).resolves.toBeUndefined();
    await expect(client.submitFeedback('job-abc', [])).resolves.toBeUndefined();
    await expect(client.healthCheck()).resolves.toBe(true);
  });

  it('includes Bearer token in auth headers', async () => {
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    const headers = client.getAuthHeaders();
    expect(headers.Authorization).toBe('Bearer test-token');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('createJob calls POST /api/v1/jobs with correct body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ job_id: 'job-123' }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    const params = {
      estimate_id: 'est-1',
      file_urls: ['https://s3.test/f.pdf'],
      filenames: ['f.pdf'],
    };
    const result = await client.createJob(params);
    expect(result).toEqual({ job_id: 'job-123' });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://takeoff.test.com/api/v1/jobs');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(params);
  });

  it('getJobStatus calls GET /api/v1/jobs/:id', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ job_id: 'job-123', status: 'complete' }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    const result = await client.getJobStatus('job-123');
    expect(result).toMatchObject({ status: 'complete' });
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://takeoff.test.com/api/v1/jobs/job-123');
  });

  it('getJobLines calls GET /api/v1/jobs/:id/lines', async () => {
    const lines = [{ id: 'l1', label: 'Foundation' }];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(lines),
    });
    vi.stubGlobal('fetch', mockFetch);
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    const result = await client.getJobLines('job-123');
    expect(result).toEqual(lines);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://takeoff.test.com/api/v1/jobs/job-123/lines');
  });

  it('cancelJob calls POST /api/v1/jobs/:id/cancel', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', mockFetch);
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    await client.cancelJob('job-123');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://takeoff.test.com/api/v1/jobs/job-123/cancel');
    expect(init.method).toBe('POST');
  });

  it('submitFeedback calls POST /api/v1/jobs/:id/feedback', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', mockFetch);
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    const feedback = [{ line_id: 'l1', correction: 'fix' }];
    await client.submitFeedback('job-123', feedback);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://takeoff.test.com/api/v1/jobs/job-123/feedback');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(feedback);
  });

  it('healthCheck returns true on ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    await expect(client.healthCheck()).resolves.toBe(true);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe('https://takeoff.test.com/api/v1/health');
  });

  it('healthCheck returns false on failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    vi.stubGlobal('fetch', mockFetch);
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    await expect(client.healthCheck()).resolves.toBe(false);
  });

  it('retries on 500 and succeeds on third attempt', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve({ ok: false, status: 500, statusText: 'Internal Server Error' });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ job_id: 'job-retry' }) });
    });
    vi.stubGlobal('fetch', mockFetch);
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    const result = await client.createJob({ estimate_id: 'est-1', file_urls: [], filenames: [] });
    expect(result).toEqual({ job_id: 'job-retry' });
    expect(callCount).toBe(3);
  }, 15_000);

  it('throws after max retries are exhausted', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    vi.stubGlobal('fetch', mockFetch);
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    await expect(
      client.createJob({ estimate_id: 'est-1', file_urls: [], filenames: [] }),
    ).rejects.toThrow('Takeoff Engine API error: 500');
  }, 15_000);

  it('does not retry on 4xx errors', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    vi.stubGlobal('fetch', mockFetch);
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    await expect(client.getJobStatus('job-missing')).rejects.toThrow(
      'Takeoff Engine API error: 404',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('uses AbortSignal timeout on fetch calls', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ job_id: 'job-sig' }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const { TakeoffEngineClient } = await import('@/lib/takeoff/client');
    const client = new TakeoffEngineClient();
    await client.createJob({ estimate_id: 'est-1', file_urls: [], filenames: [] });
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeDefined();
  });
});
