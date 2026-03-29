/**
 * Tests for GET /api/finance/aged-receivables
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: { DEFAULT_ORG_ID: 'test-org-00000000-0000-0000-0000-000000000000' },
}));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/services/financial-ops', () => ({
  getAgedReceivables: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

const mockGetKrewpactRoles = vi.fn();
vi.mock('@/lib/api/org', () => ({
  getKrewpactRoles: (...args: unknown[]) => mockGetKrewpactRoles(...args),
  getOrgIdFromAuth: vi.fn().mockResolvedValue('org-uuid-test'),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 29 }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import { makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { getAgedReceivables } from '@/lib/services/financial-ops';

const mockAuth = vi.mocked(auth);
const mockGetAgedReceivables = vi.mocked(getAgedReceivables);

const SAMPLE_REPORT = {
  asOf: '2026-03-25T00:00:00.000Z',
  rows: [
    {
      customerId: 'Acme Corp',
      customerName: 'Acme Corp',
      current: 15000,
      days30: 8000,
      days60: 0,
      days90plus: 0,
      total: 23000,
    },
    {
      customerId: 'Beta Ltd',
      customerName: 'Beta Ltd',
      current: 0,
      days30: 0,
      days60: 5000,
      days90plus: 12000,
      total: 17000,
    },
  ],
  totals: {
    current: 15000,
    days30: 8000,
    days60: 5000,
    days90plus: 12000,
    total: 40000,
  },
};

describe('GET /api/finance/aged-receivables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKrewpactRoles.mockResolvedValue(['accounting']);
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const { GET } = await import('@/app/api/finance/aged-receivables/route');
    const res = await GET(makeRequest('/api/finance/aged-receivables'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for unauthorized role (estimator)', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['estimator']);
    const { GET } = await import('@/app/api/finance/aged-receivables/route');
    const res = await GET(makeRequest('/api/finance/aged-receivables'));
    expect(res.status).toBe(403);
  });

  it('allows access for operations_manager role', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['operations_manager']);
    mockGetAgedReceivables.mockResolvedValue(SAMPLE_REPORT);
    const { GET } = await import('@/app/api/finance/aged-receivables/route');
    const res = await GET(makeRequest('/api/finance/aged-receivables'));
    expect(res.status).toBe(200);
  });

  it('returns AR aging report with auto-resolved org', async () => {
    mockClerkAuth(mockAuth);
    mockGetAgedReceivables.mockResolvedValue(SAMPLE_REPORT);

    const { GET } = await import('@/app/api/finance/aged-receivables/route');
    const res = await GET(makeRequest('/api/finance/aged-receivables'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rows).toHaveLength(2);
    expect(body.totals.total).toBe(40000);
    expect(body.asOf).toBeTruthy();
  });

  it('accepts explicit org_id param', async () => {
    mockClerkAuth(mockAuth);
    mockGetAgedReceivables.mockResolvedValue(SAMPLE_REPORT);

    const orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const { GET } = await import('@/app/api/finance/aged-receivables/route');
    const res = await GET(makeRequest(`/api/finance/aged-receivables?org_id=${orgId}`));
    expect(res.status).toBe(200);
    expect(mockGetAgedReceivables).toHaveBeenCalledWith(orgId);
  });

  it('returns 400 when org_id is not a UUID', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await import('@/app/api/finance/aged-receivables/route');
    const res = await GET(makeRequest('/api/finance/aged-receivables?org_id=not-a-uuid'));
    expect(res.status).toBe(400);
  });

  it('returns 500 when service throws', async () => {
    mockClerkAuth(mockAuth);
    mockGetAgedReceivables.mockRejectedValue(new Error('DB connection failed'));

    const { GET } = await import('@/app/api/finance/aged-receivables/route');
    const res = await GET(makeRequest('/api/finance/aged-receivables'));
    expect(res.status).toBe(500);
  });

  it('returns empty rows when no outstanding invoices', async () => {
    mockClerkAuth(mockAuth);
    mockGetAgedReceivables.mockResolvedValue({
      asOf: new Date().toISOString(),
      rows: [],
      totals: { current: 0, days30: 0, days60: 0, days90plus: 0, total: 0 },
    });

    const { GET } = await import('@/app/api/finance/aged-receivables/route');
    const res = await GET(makeRequest('/api/finance/aged-receivables'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toHaveLength(0);
    expect(body.totals.total).toBe(0);
  });
});
