import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('ErpClient resilience', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ERPNEXT_BASE_URL = 'https://erp.test.com';
    process.env.ERPNEXT_API_KEY = 'key';
    process.env.ERPNEXT_API_SECRET = 'secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses timeout on fetch calls', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { name: 'test' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    await client.get('Customer', 'CUST-001');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].signal).toBeDefined();
  });

  it('retries on 500 errors', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve({ ok: false, status: 500, statusText: 'Internal Server Error' });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { name: 'test' } }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    const result = await client.get('Customer', 'CUST-001');
    expect(result).toEqual({ name: 'test' });
    expect(callCount).toBe(3);
  });

  it('throws after max retries', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    vi.stubGlobal('fetch', mockFetch);

    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    await expect(client.get('Customer', 'CUST-001')).rejects.toThrow('ERPNext API error: 500');
  });

  it('does not retry on 4xx errors', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    vi.stubGlobal('fetch', mockFetch);

    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    await expect(client.get('Customer', 'CUST-001')).rejects.toThrow('ERPNext API error: 404');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('isMockMode returns true when no base URL', async () => {
    process.env.ERPNEXT_BASE_URL = '';
    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    expect(client.isMockMode()).toBe(true);
  });
});
