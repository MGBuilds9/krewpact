/**
 * Unit tests for lib/services/financial-ops.ts
 *
 * Covers: holdback calculation, schedule aggregation, AR aging buckets,
 * payment history totals, and edge cases.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calculateHoldbacks,
  getAgedReceivables,
  getHoldbackSchedule,
  getPaymentHistory,
  HOLDBACK_DAYS,
  HOLDBACK_RATE,
} from '@/lib/services/financial-ops';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from: (...args: unknown[]) => mockFrom(...args) })),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

function makeInvoiceChain(data: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.not = vi.fn().mockReturnValue(chain);
  chain.gt = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => void) => resolve({ data, error: null });
  return chain;
}

describe('HOLDBACK_RATE / HOLDBACK_DAYS constants', () => {
  it('holdback rate is 10%', () => {
    expect(HOLDBACK_RATE).toBe(0.1);
  });
  it('holdback days is 60', () => {
    expect(HOLDBACK_DAYS).toBe(60);
  });
});

describe('calculateHoldbacks()', () => {
  const PROJECT_ID = 'proj-uuid-1';

  beforeEach(() => vi.clearAllMocks());

  it('returns empty array when no invoices', async () => {
    mockFrom.mockReturnValue(makeInvoiceChain([]));
    const result = await calculateHoldbacks(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('computes 10% holdback amount per invoice', async () => {
    mockFrom.mockReturnValue(
      makeInvoiceChain([
        {
          id: 'inv-1',
          invoice_number: 'SINV-001',
          invoice_date: '2026-01-15',
          total_amount: 100000,
          snapshot_payload: null,
          status: 'submitted',
          created_at: '2026-01-15T00:00:00Z',
        },
      ]),
    );

    const [item] = await calculateHoldbacks(PROJECT_ID);
    expect(item!.holdbackAmount).toBe(10000);
    expect(item!.totalAmount).toBe(100000);
    expect(item!.status).toBe('pending_performance');
  });

  it('marks holdback as held when release date is in the future', async () => {
    const futureDate = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];
    mockFrom.mockReturnValue(
      makeInvoiceChain([
        {
          id: 'inv-2',
          invoice_number: 'SINV-002',
          invoice_date: '2026-02-01',
          total_amount: 50000,
          snapshot_payload: { substantial_performance_date: '2026-02-01' },
          status: 'submitted',
          created_at: '2026-02-01T00:00:00Z',
        },
      ]),
    );

    const [item] = await calculateHoldbacks(PROJECT_ID);
    expect(item!.status).toBe('held');
    expect(item!.daysUntilRelease).toBeGreaterThan(0);
    expect(item!.releaseDate).toBeTruthy();
  });

  it('marks holdback as released when 60+ days have passed', async () => {
    const oldDate = new Date(Date.now() - 90 * 86_400_000).toISOString().split('T')[0];
    mockFrom.mockReturnValue(
      makeInvoiceChain([
        {
          id: 'inv-3',
          invoice_number: 'SINV-003',
          invoice_date: oldDate,
          total_amount: 20000,
          snapshot_payload: { substantial_performance_date: oldDate },
          status: 'paid',
          created_at: `${oldDate}T00:00:00Z`,
        },
      ]),
    );

    const [item] = await calculateHoldbacks(PROJECT_ID);
    expect(item!.status).toBe('released');
    expect(item!.daysUntilRelease).toBeLessThanOrEqual(0);
  });

  it('returns empty array on supabase error', async () => {
    const chain = makeInvoiceChain([]);
    chain.then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(chain);

    const result = await calculateHoldbacks(PROJECT_ID);
    expect(result).toEqual([]);
  });
});

describe('getHoldbackSchedule()', () => {
  const PROJECT_ID = 'proj-uuid-2';

  beforeEach(() => vi.clearAllMocks());

  it('returns aggregated totals', async () => {
    const futureDate = new Date(Date.now() + 20 * 86_400_000).toISOString().split('T')[0];
    const oldDate = new Date(Date.now() - 90 * 86_400_000).toISOString().split('T')[0];

    mockFrom.mockReturnValue(
      makeInvoiceChain([
        {
          id: 'inv-a',
          invoice_number: 'SINV-A',
          invoice_date: futureDate,
          total_amount: 60000,
          snapshot_payload: { substantial_performance_date: '2026-02-01' },
          status: 'submitted',
          created_at: `${futureDate}T00:00:00Z`,
        },
        {
          id: 'inv-b',
          invoice_number: 'SINV-B',
          invoice_date: oldDate,
          total_amount: 40000,
          snapshot_payload: { substantial_performance_date: oldDate },
          status: 'paid',
          created_at: `${oldDate}T00:00:00Z`,
        },
      ]),
    );

    const schedule = await getHoldbackSchedule(PROJECT_ID);
    expect(schedule.projectId).toBe(PROJECT_ID);
    expect(schedule.totalReleased).toBe(4000); // 10% of 40000
    expect(schedule.totalHeld).toBe(6000); // 10% of 60000
    expect(schedule.items).toHaveLength(2);
  });
});

describe('getAgedReceivables()', () => {
  const ORG_ID = 'org-uuid-1';

  beforeEach(() => vi.clearAllMocks());

  it('returns empty report when no invoices', async () => {
    mockFrom.mockReturnValue(makeInvoiceChain([]));
    const report = await getAgedReceivables(ORG_ID);
    expect(report.rows).toEqual([]);
    expect(report.totals.total).toBe(0);
    expect(report.asOf).toBeTruthy();
  });

  it('buckets overdue invoices into correct aging columns', async () => {
    // 20 days overdue → days30 bucket (1–30 days)
    const date30 = new Date(Date.now() - 20 * 86_400_000).toISOString().split('T')[0];
    // 95 days overdue → days90plus bucket
    const date90 = new Date(Date.now() - 95 * 86_400_000).toISOString().split('T')[0];
    mockFrom.mockReturnValue(
      makeInvoiceChain([
        {
          customer_name: 'Alpha Co',
          due_date: date30,
          total_amount: 10000,
          amount_paid: 0,
          status: 'submitted',
        },
        {
          customer_name: 'Alpha Co',
          due_date: date90,
          total_amount: 5000,
          amount_paid: 0,
          status: 'overdue',
        },
      ]),
    );

    const report = await getAgedReceivables(ORG_ID);
    const row = report.rows.find((r) => r.customerName === 'Alpha Co');
    expect(row).toBeDefined();
    expect(row!.days30).toBe(10000);
    expect(row!.days90plus).toBe(5000);
    expect(row!.total).toBe(15000);
  });

  it('excludes fully paid invoices', async () => {
    mockFrom.mockReturnValue(
      makeInvoiceChain([
        {
          customer_name: 'Paid Co',
          due_date: '2026-01-01',
          total_amount: 20000,
          amount_paid: 20000,
          status: 'paid',
        },
      ]),
    );

    const report = await getAgedReceivables(ORG_ID);
    expect(report.rows).toHaveLength(0);
  });

  it('returns empty report on supabase error', async () => {
    const chain = makeInvoiceChain([]);
    chain.then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: { message: 'fail' } });
    mockFrom.mockReturnValue(chain);

    const report = await getAgedReceivables(ORG_ID);
    expect(report.rows).toEqual([]);
    expect(report.totals.total).toBe(0);
  });
});

describe('getPaymentHistory()', () => {
  const PROJECT_ID = 'proj-uuid-3';

  beforeEach(() => vi.clearAllMocks());

  it('returns empty history when no payments', async () => {
    mockFrom
      .mockReturnValueOnce(makeInvoiceChain([])) // paid invoices query
      .mockReturnValueOnce(makeInvoiceChain([])); // all invoices query

    const history = await getPaymentHistory(PROJECT_ID);
    expect(history.payments).toEqual([]);
    expect(history.totalPaid).toBe(0);
    expect(history.totalOutstanding).toBe(0);
  });

  it('computes totals from invoice snapshots', async () => {
    const paidInvoices = [
      {
        id: 'inv-1',
        invoice_number: 'SINV-001',
        customer_name: 'Acme',
        updated_at: '2026-03-01T00:00:00Z',
        amount_paid: 45000,
        total_amount: 50000,
        status: 'submitted',
        erp_docname: 'SINV-001',
      },
    ];
    const allInvoices = [
      { total_amount: 50000, amount_paid: 45000 },
      { total_amount: 30000, amount_paid: 0 },
    ];

    mockFrom
      .mockReturnValueOnce(makeInvoiceChain(paidInvoices))
      .mockReturnValueOnce(makeInvoiceChain(allInvoices));

    const history = await getPaymentHistory(PROJECT_ID);
    expect(history.payments).toHaveLength(1);
    expect(history.totalPaid).toBe(45000);
    expect(history.totalOutstanding).toBe(35000); // (50k-45k) + (30k-0)
  });
});
