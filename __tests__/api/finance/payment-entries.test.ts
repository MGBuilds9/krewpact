/**
 * Tests for GET /api/finance/payment-entries
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/services/financial-ops', () => ({
  getPaymentHistory: vi.fn(),
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

const mockRequireRole = vi.fn();
vi.mock('@/lib/api/org', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { getPaymentHistory } from '@/lib/services/financial-ops';

const mockAuth = vi.mocked(auth);
const mockGetPaymentHistory = vi.mocked(getPaymentHistory);

const VALID_PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const SAMPLE_HISTORY = {
  projectId: VALID_PROJECT_ID,
  payments: [
    {
      id: 'inv-1',
      invoiceNumber: 'SINV-001',
      customerName: 'Acme Corp',
      paymentDate: '2026-03-01T12:00:00Z',
      amountPaid: 45000,
      status: 'paid',
      erpDocname: 'SINV-001',
    },
    {
      id: 'inv-2',
      invoiceNumber: 'SINV-002',
      customerName: 'Acme Corp',
      paymentDate: '2026-02-15T09:00:00Z',
      amountPaid: 27000,
      status: 'paid',
      erpDocname: 'SINV-002',
    },
  ],
  totalPaid: 72000,
  totalOutstanding: 18000,
};

describe('GET /api/finance/payment-entries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ userId: 'user_123', roles: ['accounting'] });
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const { GET } = await import('@/app/api/finance/payment-entries/route');
    const res = await GET(
      makeRequest(`/api/finance/payment-entries?project_id=${VALID_PROJECT_ID}`),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for unauthorized role (project_manager)', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import('@/app/api/finance/payment-entries/route');
    const res = await GET(
      makeRequest(`/api/finance/payment-entries?project_id=${VALID_PROJECT_ID}`),
    );
    expect(res.status).toBe(403);
  });

  it('allows access for executive role', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue({ userId: 'user_123', roles: ['executive'] });
    mockGetPaymentHistory.mockResolvedValue(SAMPLE_HISTORY);
    const { GET } = await import('@/app/api/finance/payment-entries/route');
    const res = await GET(
      makeRequest(`/api/finance/payment-entries?project_id=${VALID_PROJECT_ID}`),
    );
    expect(res.status).toBe(200);
  });

  it('returns 400 when project_id missing', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await import('@/app/api/finance/payment-entries/route');
    const res = await GET(makeRequest('/api/finance/payment-entries'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when project_id is not a UUID', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await import('@/app/api/finance/payment-entries/route');
    const res = await GET(makeRequest('/api/finance/payment-entries?project_id=not-uuid'));
    expect(res.status).toBe(400);
  });

  it('returns payment history for valid project', async () => {
    mockClerkAuth(mockAuth);
    mockGetPaymentHistory.mockResolvedValue(SAMPLE_HISTORY);

    const { GET } = await import('@/app/api/finance/payment-entries/route');
    const res = await GET(
      makeRequest(`/api/finance/payment-entries?project_id=${VALID_PROJECT_ID}`),
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.payments).toHaveLength(2);
    expect(body.totalPaid).toBe(72000);
    expect(body.totalOutstanding).toBe(18000);
    expect(mockGetPaymentHistory).toHaveBeenCalledWith(VALID_PROJECT_ID);
  });

  it('returns empty payments when none recorded', async () => {
    mockClerkAuth(mockAuth);
    mockGetPaymentHistory.mockResolvedValue({
      projectId: VALID_PROJECT_ID,
      payments: [],
      totalPaid: 0,
      totalOutstanding: 50000,
    });

    const { GET } = await import('@/app/api/finance/payment-entries/route');
    const res = await GET(
      makeRequest(`/api/finance/payment-entries?project_id=${VALID_PROJECT_ID}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.payments).toHaveLength(0);
    expect(body.totalPaid).toBe(0);
  });

  it('returns 500 when service throws', async () => {
    mockClerkAuth(mockAuth);
    mockGetPaymentHistory.mockRejectedValue(new Error('Unexpected error'));

    const { GET } = await import('@/app/api/finance/payment-entries/route');
    const res = await GET(
      makeRequest(`/api/finance/payment-entries?project_id=${VALID_PROJECT_ID}`),
    );
    expect(res.status).toBe(500);
  });
});
