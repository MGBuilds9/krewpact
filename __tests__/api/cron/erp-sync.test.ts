import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReadSalesInvoice = vi.fn();
const mockReadPurchaseInvoice = vi.fn();
const mockList = vi.fn();

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

// Mock SyncService
vi.mock('@/lib/erp/sync-service', () => ({
  SyncService: class MockSyncService {
    readSalesInvoice = mockReadSalesInvoice;
    readPurchaseInvoice = mockReadPurchaseInvoice;
  },
  isMockMode: vi.fn(() => false),
}));

// Mock ErpClient
vi.mock('@/lib/erp/client', () => ({
  ErpClient: class MockErpClient {
    list = mockList;
  },
}));

import { GET } from '@/app/api/cron/erp-sync/route';
import { isMockMode } from '@/lib/erp/sync-service';

const CRON_SECRET = 'test-cron-secret';

function makeCronRequest(authHeader?: string, qstashSig?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader) headers['authorization'] = authHeader;
  if (qstashSig) headers['upstash-signature'] = qstashSig;
  return new Request('http://localhost/api/cron/erp-sync', {
    method: 'GET',
    headers,
  });
}

describe('GET /api/cron/erp-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    vi.mocked(isMockMode).mockReturnValue(false);
  });

  it('returns 401 without auth', async () => {
    const res = await GET(makeCronRequest() as never);
    expect(res.status).toBe(401);
  });

  it('accepts Bearer token auth', async () => {
    mockList.mockResolvedValue([]);

    const res = await GET(makeCronRequest(`Bearer ${CRON_SECRET}`) as never);
    expect(res.status).toBe(200);
  });

  it('accepts QStash signature auth', async () => {
    mockList.mockResolvedValue([]);

    const res = await GET(makeCronRequest(undefined, 'qstash-sig-value') as never);
    expect(res.status).toBe(200);
  });

  it('returns empty summary in mock mode', async () => {
    vi.mocked(isMockMode).mockReturnValue(true);

    const res = await GET(makeCronRequest(`Bearer ${CRON_SECRET}`) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoices_synced).toBe(0);
    expect(body.pos_synced).toBe(0);
    expect(body.errors).toEqual([]);
  });

  it('syncs Sales Invoices from ERPNext', async () => {
    mockList
      .mockResolvedValueOnce([
        { name: 'SINV-001' },
        { name: 'SINV-002' },
      ])
      .mockResolvedValueOnce([]); // Purchase Invoices

    mockReadSalesInvoice.mockResolvedValue({ status: 'succeeded' });

    const res = await GET(makeCronRequest(`Bearer ${CRON_SECRET}`) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoices_synced).toBe(2);
    expect(body.pos_synced).toBe(0);
    expect(mockReadSalesInvoice).toHaveBeenCalledTimes(2);
    expect(mockReadSalesInvoice).toHaveBeenCalledWith('SINV-001');
    expect(mockReadSalesInvoice).toHaveBeenCalledWith('SINV-002');
  });

  it('syncs Purchase Invoices from ERPNext', async () => {
    mockList
      .mockResolvedValueOnce([]) // Sales Invoices
      .mockResolvedValueOnce([
        { name: 'PINV-001' },
      ]);

    mockReadPurchaseInvoice.mockResolvedValue({ status: 'succeeded' });

    const res = await GET(makeCronRequest(`Bearer ${CRON_SECRET}`) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoices_synced).toBe(0);
    expect(body.pos_synced).toBe(1);
    expect(mockReadPurchaseInvoice).toHaveBeenCalledWith('PINV-001');
  });

  it('continues on individual invoice sync failure', async () => {
    mockList
      .mockResolvedValueOnce([
        { name: 'SINV-001' },
        { name: 'SINV-002' },
      ])
      .mockResolvedValueOnce([]);

    mockReadSalesInvoice
      .mockRejectedValueOnce(new Error('Fetch failed'))
      .mockResolvedValueOnce({ status: 'succeeded' });

    const res = await GET(makeCronRequest(`Bearer ${CRON_SECRET}`) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoices_synced).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain('SINV-001');
    expect(body.errors[0]).toContain('Fetch failed');
  });

  it('handles ERPNext list API failure gracefully', async () => {
    mockList
      .mockRejectedValueOnce(new Error('ERPNext unavailable'))
      .mockResolvedValueOnce([]);

    const res = await GET(makeCronRequest(`Bearer ${CRON_SECRET}`) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invoices_synced).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain('Failed to list Sales Invoices');
  });
});
