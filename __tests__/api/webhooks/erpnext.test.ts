import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Clerk auth (required by withApiRoute import even though auth: 'public' skips calling it)
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

const mockReadSalesInvoice = vi.fn();
const mockReadPurchaseInvoice = vi.fn();

// Mock Supabase server client (required by SyncService)
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

// Mock SyncService
vi.mock('@/lib/erp/sync-service', () => ({
  SyncService: class MockSyncService {
    readSalesInvoice = mockReadSalesInvoice;
    readPurchaseInvoice = mockReadPurchaseInvoice;
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/webhooks/erpnext/route';

const WEBHOOK_SECRET = 'test-erpnext-webhook-secret';

function makeWebhookRequest(payload: Record<string, unknown>, secret?: string): NextRequest {
  const hdrs: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (secret !== undefined) {
    hdrs['x-webhook-secret'] = secret;
  }
  return new NextRequest(new URL('http://localhost/api/webhooks/erpnext'), {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify(payload),
  });
}

describe('POST /api/webhooks/erpnext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ERPNEXT_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  it('returns 401 when no secret header is provided', async () => {
    const res = await POST(
      makeWebhookRequest({
        doctype: 'Sales Invoice',
        name: 'SINV-001',
        event: 'on_update',
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when wrong secret is provided', async () => {
    const res = await POST(
      makeWebhookRequest(
        { doctype: 'Sales Invoice', name: 'SINV-001', event: 'on_update' },
        'wrong-secret',
      ),
    );
    expect(res.status).toBe(401);
  });

  it('returns 500 when ERPNEXT_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.ERPNEXT_WEBHOOK_SECRET;
    const res = await POST(
      makeWebhookRequest(
        { doctype: 'Sales Invoice', name: 'SINV-001', event: 'on_update' },
        WEBHOOK_SECRET,
      ),
    );
    expect(res.status).toBe(500);
  });

  it('processes Sales Invoice webhook successfully', async () => {
    mockReadSalesInvoice.mockResolvedValue({
      id: 'job-1',
      status: 'succeeded',
      entity_type: 'sales_invoice',
      entity_id: 'SINV-001',
      erp_docname: 'SINV-001',
      attempt_count: 1,
    });

    const res = await POST(
      makeWebhookRequest(
        { doctype: 'Sales Invoice', name: 'SINV-001', event: 'on_update' },
        WEBHOOK_SECRET,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.doctype).toBe('Sales Invoice');
    expect(mockReadSalesInvoice).toHaveBeenCalledWith('SINV-001');
  });

  it('processes Purchase Invoice webhook successfully', async () => {
    mockReadPurchaseInvoice.mockResolvedValue({
      id: 'job-2',
      status: 'succeeded',
      entity_type: 'purchase_invoice',
      entity_id: 'PINV-001',
      erp_docname: 'PINV-001',
      attempt_count: 1,
    });

    const res = await POST(
      makeWebhookRequest(
        { doctype: 'Purchase Invoice', name: 'PINV-001', event: 'on_submit' },
        WEBHOOK_SECRET,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockReadPurchaseInvoice).toHaveBeenCalledWith('PINV-001');
  });

  it('returns 200 for Customer event (logged, no action)', async () => {
    const res = await POST(
      makeWebhookRequest(
        { doctype: 'Customer', name: 'CUST-001', event: 'on_update' },
        WEBHOOK_SECRET,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.doctype).toBe('Customer');
    // No sync methods called for Customer
    expect(mockReadSalesInvoice).not.toHaveBeenCalled();
    expect(mockReadPurchaseInvoice).not.toHaveBeenCalled();
  });

  it('returns 200 for Project event (logged, no action)', async () => {
    const res = await POST(
      makeWebhookRequest(
        { doctype: 'Project', name: 'PROJ-001', event: 'on_update' },
        WEBHOOK_SECRET,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.doctype).toBe('Project');
  });

  it('returns 200 for unknown doctype (logged, no error)', async () => {
    const res = await POST(
      makeWebhookRequest(
        { doctype: 'Journal Entry', name: 'JE-001', event: 'on_submit' },
        WEBHOOK_SECRET,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.doctype).toBe('Journal Entry');
  });

  it('returns 400 for Sales Invoice without document name', async () => {
    const res = await POST(
      makeWebhookRequest(
        { doctype: 'Sales Invoice', name: '', event: 'on_update' },
        WEBHOOK_SECRET,
      ),
    );
    expect(res.status).toBe(400);
  });

  it('returns 500 when sync method throws', async () => {
    mockReadSalesInvoice.mockRejectedValue(new Error('ERPNext connection failed'));

    const res = await POST(
      makeWebhookRequest(
        { doctype: 'Sales Invoice', name: 'SINV-002', event: 'on_update' },
        WEBHOOK_SECRET,
      ),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain('ERPNext connection failed');
  });
});
