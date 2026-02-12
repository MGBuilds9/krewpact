import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubEnv('ERPNEXT_BASE_URL', 'https://erp.test.com');
vi.stubEnv('ERPNEXT_API_KEY', 'test-key');
vi.stubEnv('ERPNEXT_API_SECRET', 'test-secret');

describe('ErpClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exports ErpClient class', async () => {
    const mod = await import('@/lib/erp/client');
    expect(mod.ErpClient).toBeDefined();
  });

  it('constructs with env vars', async () => {
    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    expect(client).toBeDefined();
  });

  it('builds correct auth header', async () => {
    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    const headers = client.getAuthHeaders();
    expect(headers['Authorization']).toBe('token test-key:test-secret');
  });

  it('builds correct URL for doctype', async () => {
    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    const url = client.getResourceUrl('Customer', 'CUST-001');
    expect(url).toBe('https://erp.test.com/api/resource/Customer/CUST-001');
  });

  it('encodes document names with special characters', async () => {
    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    const url = client.getResourceUrl('Customer', 'MDM Group / Inc');
    expect(url).toContain(encodeURIComponent('MDM Group / Inc'));
  });

  it('get() calls fetch with correct URL and auth', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { name: 'CUST-001' } }), { status: 200 }),
    );
    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    const result = await client.get('Customer', 'CUST-001');
    expect(result).toEqual({ name: 'CUST-001' });
    expect(fetch).toHaveBeenCalledWith(
      'https://erp.test.com/api/resource/Customer/CUST-001',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'token test-key:test-secret',
        }),
      }),
    );
  });

  it('get() throws on non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not found', { status: 404, statusText: 'Not Found' }),
    );
    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    await expect(client.get('Customer', 'BAD')).rejects.toThrow('ERPNext API error');
  });

  it('list() builds URL with filters and fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );
    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    await client.list('Customer', { customer_group: 'Commercial' }, ['name', 'customer_name'], 10);
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('filters=');
    expect(calledUrl).toContain('fields=');
    expect(calledUrl).toContain('limit_page_length=10');
  });
});
