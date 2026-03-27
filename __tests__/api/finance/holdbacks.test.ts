/**
 * Tests for GET /api/finance/holdbacks
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/services/financial-ops', () => ({
  getHoldbackSchedule: vi.fn(),
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
  getOrgIdFromAuth: vi.fn().mockResolvedValue('mdm-group'),
}));

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { getHoldbackSchedule } from '@/lib/services/financial-ops';

const mockAuth = vi.mocked(auth);
const mockGetHoldbackSchedule = vi.mocked(getHoldbackSchedule);

const VALID_PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const SAMPLE_SCHEDULE = {
  projectId: VALID_PROJECT_ID,
  items: [
    {
      invoiceId: 'inv-1',
      invoiceNumber: 'SINV-001',
      invoiceDate: '2026-01-15',
      totalAmount: 50000,
      holdbackAmount: 5000,
      substantialPerformanceDate: '2026-01-20',
      releaseDate: '2026-03-20',
      daysUntilRelease: -5,
      status: 'released' as const,
    },
    {
      invoiceId: 'inv-2',
      invoiceNumber: 'SINV-002',
      invoiceDate: '2026-02-10',
      totalAmount: 30000,
      holdbackAmount: 3000,
      substantialPerformanceDate: '2026-02-15',
      releaseDate: '2026-04-15',
      daysUntilRelease: 25,
      status: 'held' as const,
    },
  ],
  totalHeld: 3000,
  totalReleased: 5000,
  nextRelease: '2026-04-15',
};

describe('GET /api/finance/holdbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ userId: 'user_123', roles: ['accounting'] });
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const { GET } = await import('@/app/api/finance/holdbacks/route');
    const res = await GET(makeRequest(`/api/finance/holdbacks?project_id=${VALID_PROJECT_ID}`));
    expect(res.status).toBe(401);
  });

  it('returns 403 for unauthorized role (field_supervisor)', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import('@/app/api/finance/holdbacks/route');
    const res = await GET(makeRequest(`/api/finance/holdbacks?project_id=${VALID_PROJECT_ID}`));
    expect(res.status).toBe(403);
  });

  it('allows access for accounting role', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue({ userId: 'user_123', roles: ['accounting'] });
    mockGetHoldbackSchedule.mockResolvedValue(SAMPLE_SCHEDULE);
    const { GET } = await import('@/app/api/finance/holdbacks/route');
    const res = await GET(makeRequest(`/api/finance/holdbacks?project_id=${VALID_PROJECT_ID}`));
    expect(res.status).toBe(200);
  });

  it('returns 400 when project_id missing', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await import('@/app/api/finance/holdbacks/route');
    const res = await GET(makeRequest('/api/finance/holdbacks'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when project_id is not a UUID', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await import('@/app/api/finance/holdbacks/route');
    const res = await GET(makeRequest('/api/finance/holdbacks?project_id=not-a-uuid'));
    expect(res.status).toBe(400);
  });

  it('returns holdback schedule for valid project', async () => {
    mockClerkAuth(mockAuth);
    mockGetHoldbackSchedule.mockResolvedValue(SAMPLE_SCHEDULE);

    const { GET } = await import('@/app/api/finance/holdbacks/route');
    const res = await GET(makeRequest(`/api/finance/holdbacks?project_id=${VALID_PROJECT_ID}`));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.projectId).toBe(VALID_PROJECT_ID);
    expect(body.items).toHaveLength(2);
    expect(body.totalHeld).toBe(3000);
    expect(body.totalReleased).toBe(5000);
    expect(mockGetHoldbackSchedule).toHaveBeenCalledWith(VALID_PROJECT_ID);
  });

  it('returns empty schedule when no invoices', async () => {
    mockClerkAuth(mockAuth);
    mockGetHoldbackSchedule.mockResolvedValue({
      projectId: VALID_PROJECT_ID,
      items: [],
      totalHeld: 0,
      totalReleased: 0,
      nextRelease: null,
    });

    const { GET } = await import('@/app/api/finance/holdbacks/route');
    const res = await GET(makeRequest(`/api/finance/holdbacks?project_id=${VALID_PROJECT_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(0);
    expect(body.nextRelease).toBeNull();
  });
});
