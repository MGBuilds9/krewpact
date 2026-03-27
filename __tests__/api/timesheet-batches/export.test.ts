import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/api/org', () => ({
  getKrewpactRoles: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

vi.mock('@/lib/services/payroll', () => ({
  exportToADP: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { GET } from '@/app/api/timesheet-batches/[batchId]/export/route';
import { getKrewpactRoles } from '@/lib/api/org';
import { exportToADP } from '@/lib/services/payroll';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockGetRoles = vi.mocked(getKrewpactRoles);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockExportToADP = vi.mocked(exportToADP);

const BATCH_ID = '00000000-0000-4000-a000-000000000001';

function makeExportRequest() {
  return makeRequest(`/api/timesheet-batches/${BATCH_ID}/export`);
}

describe('GET /api/timesheet-batches/[batchId]/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await GET(makeExportRequest(), { params: Promise.resolve({ batchId: BATCH_ID }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks required role', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockGetRoles.mockResolvedValue(['field_supervisor']);

    const res = await GET(makeExportRequest(), { params: Promise.resolve({ batchId: BATCH_ID }) });
    expect(res.status).toBe(403);
  });

  it('returns CSV with correct headers for authorized user', async () => {
    const csv = 'Employee ID,Date,Hours,Type,Project Code\nuser1,2026-03-10,8,REG,proj1';
    mockClerkAuth(mockAuth, 'user_123');
    mockGetRoles.mockResolvedValue(['payroll_admin']);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockExportToADP.mockResolvedValue(csv);

    const res = await GET(makeExportRequest(), { params: Promise.resolve({ batchId: BATCH_ID }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    const body = await res.text();
    expect(body).toBe(csv);
  });

  it('returns 422 when batch is not approved', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockGetRoles.mockResolvedValue(['platform_admin']);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockExportToADP.mockRejectedValue(new Error('Batch must be approved before export'));

    const res = await GET(makeExportRequest(), { params: Promise.resolve({ batchId: BATCH_ID }) });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('approved');
  });

  it('allows access for accounting role', async () => {
    const csv = 'Employee ID,Date,Hours,Type,Project Code';
    mockClerkAuth(mockAuth, 'user_123');
    mockGetRoles.mockResolvedValue(['accounting']);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient(),
      error: null,
    });
    mockExportToADP.mockResolvedValue(csv);

    const res = await GET(makeExportRequest(), { params: Promise.resolve({ batchId: BATCH_ID }) });
    expect(res.status).toBe(200);
  });
});
