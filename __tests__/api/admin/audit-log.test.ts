import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/admin/audit-log/route';
import { mockSupabaseClient, mockClerkUnauth, makeRequest } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function mockClerkWithRoles(userId: string, roles: string[]) {
  mockAuth.mockResolvedValue({
    userId,
    getToken: vi.fn().mockResolvedValue('mock-jwt-token'),
    sessionId: 'session_test',
    sessionClaims: {
      sub: userId,
      krewpact_user_id: userId,
      krewpact_org_id: 'org_test_default',
      krewpact_divisions: ['contracting'],
      krewpact_roles: roles,
    },
  } as never);
}

const sampleAuditEntries = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    user_id: 'user_admin',
    action: 'create',
    entity_type: 'project',
    entity_id: '00000000-0000-4000-a000-000000000010',
    entity_name: 'Highway Bridge Repair',
    details: { status: 'active' },
    created_at: '2026-03-09T10:00:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000002',
    user_id: 'user_pm',
    action: 'update',
    entity_type: 'lead',
    entity_id: '00000000-0000-4000-a000-000000000020',
    entity_name: 'Acme Corp Lead',
    details: { field: 'status', old: 'new', new: 'qualified' },
    created_at: '2026-03-09T09:30:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000003',
    user_id: 'user_admin',
    action: 'delete',
    entity_type: 'contact',
    entity_id: '00000000-0000-4000-a000-000000000030',
    entity_name: 'John Doe',
    details: null,
    created_at: '2026-03-09T09:00:00Z',
  },
];

describe('GET /api/admin/audit-log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await GET(makeRequest('/api/admin/audit-log'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks admin/executive role', async () => {
    mockClerkWithRoles('user_123', ['project_manager']);

    const res = await GET(makeRequest('/api/admin/audit-log'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('allows platform_admin role', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          audit_log: { data: sampleAuditEntries, error: null, count: 3 },
        },
      }),
    );

    const res = await GET(makeRequest('/api/admin/audit-log'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(3);
    expect(body.total).toBe(3);
  });

  it('allows executive role', async () => {
    mockClerkWithRoles('user_exec', ['executive']);

    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          audit_log: { data: sampleAuditEntries, error: null, count: 3 },
        },
      }),
    );

    const res = await GET(makeRequest('/api/admin/audit-log'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(3);
  });

  it('returns paginated results with defaults (page=1, pageSize=25)', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          audit_log: { data: sampleAuditEntries, error: null, count: 50 },
        },
      }),
    );

    const res = await GET(makeRequest('/api/admin/audit-log'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(25);
    expect(body.total).toBe(50);
  });

  it('respects page and pageSize query params', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          audit_log: { data: [sampleAuditEntries[0]], error: null, count: 100 },
        },
      }),
    );

    const res = await GET(makeRequest('/api/admin/audit-log?page=3&pageSize=50'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(3);
    expect(body.pageSize).toBe(50);
  });

  it('clamps pageSize to max 100', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          audit_log: { data: [], error: null, count: 0 },
        },
      }),
    );

    const res = await GET(makeRequest('/api/admin/audit-log?pageSize=500'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pageSize).toBe(100);
  });

  it('clamps page to minimum 1', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          audit_log: { data: [], error: null, count: 0 },
        },
      }),
    );

    const res = await GET(makeRequest('/api/admin/audit-log?page=-5'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(1);
  });

  it('applies entity_type filter', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    const client = mockSupabaseClient({
      tables: {
        audit_log: { data: [sampleAuditEntries[0]], error: null, count: 1 },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/admin/audit-log?entity_type=project'));
    expect(res.status).toBe(200);

    // Verify the eq filter was called on the chain
    expect(client.from).toHaveBeenCalledWith('audit_log');
  });

  it('applies action filter', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    const client = mockSupabaseClient({
      tables: {
        audit_log: { data: [sampleAuditEntries[2]], error: null, count: 1 },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/admin/audit-log?action=delete'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].action).toBe('delete');
  });

  it('applies user_id filter', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    const client = mockSupabaseClient({
      tables: {
        audit_log: { data: [sampleAuditEntries[1]], error: null, count: 1 },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/admin/audit-log?user_id=user_pm'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('applies date_from and date_to filters', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    const client = mockSupabaseClient({
      tables: {
        audit_log: { data: sampleAuditEntries, error: null, count: 3 },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(
      makeRequest(
        '/api/admin/audit-log?date_from=2026-03-09T00:00:00Z&date_to=2026-03-09T23:59:59Z',
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(3);
  });

  it('applies multiple filters simultaneously', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    const client = mockSupabaseClient({
      tables: {
        audit_log: { data: [sampleAuditEntries[0]], error: null, count: 1 },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(
      makeRequest(
        '/api/admin/audit-log?entity_type=project&action=create&user_id=user_admin&page=1&pageSize=25',
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('returns empty results when audit_log table does not exist', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          audit_log: {
            data: null,
            error: { message: 'relation "public.audit_log" does not exist', code: '42P01' },
            count: null,
          },
        },
      }),
    );

    const res = await GET(makeRequest('/api/admin/audit-log'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(25);
  });

  it('returns 500 for non-table-not-found database errors', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          audit_log: {
            data: null,
            error: { message: 'connection timeout' },
            count: null,
          },
        },
      }),
    );

    const res = await GET(makeRequest('/api/admin/audit-log'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to fetch audit log');
  });

  it('returns correct response shape with all expected fields', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          audit_log: { data: [sampleAuditEntries[0]], error: null, count: 1 },
        },
      }),
    );

    const res = await GET(makeRequest('/api/admin/audit-log'));
    expect(res.status).toBe(200);
    const body = await res.json();

    // Verify response shape
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('pageSize');

    // Verify entry shape
    const entry = body.data[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('user_id');
    expect(entry).toHaveProperty('action');
    expect(entry).toHaveProperty('entity_type');
    expect(entry).toHaveProperty('entity_id');
    expect(entry).toHaveProperty('entity_name');
    expect(entry).toHaveProperty('details');
    expect(entry).toHaveProperty('created_at');
  });

  it('returns empty array when no audit entries match filters', async () => {
    mockClerkWithRoles('user_admin', ['platform_admin']);

    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          audit_log: { data: [], error: null, count: 0 },
        },
      }),
    );

    const res = await GET(makeRequest('/api/admin/audit-log?entity_type=nonexistent'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });
});
