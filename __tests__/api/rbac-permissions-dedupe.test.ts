import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/org', () => ({
  getKrewpactRoles: vi.fn().mockResolvedValue([]),
  getKrewpactDivisions: vi.fn().mockResolvedValue([]),
  getKrewpactOrgId: vi.fn().mockResolvedValue('org-1'),
  getKrewpactUserId: vi.fn().mockResolvedValue('user-1'),
}));

import { auth } from '@clerk/nextjs/server';

import { GET } from '@/app/api/rbac/permissions/route';
import { createUserClientSafe } from '@/lib/supabase/server';

import { makeRequest, mockClerkAuth } from '../helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeRbacClient(opts: {
  roleNameRows: { role_name: string; is_primary: boolean }[];
  permissionRows?: { permission_name: string }[];
  divisionRows?: { division_id: string | null }[];
}) {
  const permissionRows = opts.permissionRows ?? [];
  const divisionRows = opts.divisionRows ?? [];

  // user_divisions query chain. We build a throwaway chain here — the
  // route only awaits the result, so a Promise-like `then` is enough.
  const divisionsChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve({ data: divisionRows, error: null });
    }),
  };

  const client = {
    rpc: vi.fn().mockImplementation((procName: string) => {
      if (procName === 'get_user_role_names') {
        return Promise.resolve({ data: opts.roleNameRows, error: null });
      }
      if (procName === 'get_user_permissions') {
        return Promise.resolve({ data: permissionRows, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    }),
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'user_divisions') return divisionsChain;
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  };

  return client as never;
}

describe('GET /api/rbac/permissions — role dedupe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('collapses duplicate role_name rows from the RPC into distinct entries', async () => {
    // The get_user_role_names RPC joins across division_id, so a user who
    // holds `platform_admin` in two divisions gets two rows with the same
    // role_name. Rendering each as a badge produced the "4 badges where 2
    // are expected" QA finding (ISSUE-005).
    const client = makeRbacClient({
      roleNameRows: [
        { role_name: 'platform_admin', is_primary: true },
        { role_name: 'platform_admin', is_primary: false },
        { role_name: 'executive', is_primary: false },
        { role_name: 'executive', is_primary: false },
      ],
    });
    mockCreateUserClientSafe.mockResolvedValue({ client, error: null });

    const res = await GET(makeRequest('/api/rbac/permissions?user_id=user-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    const roleNames = body.roles.map((r: { role_name: string }) => r.role_name);
    expect(roleNames).toEqual(['platform_admin', 'executive']);
    expect(body.roles).toHaveLength(2);
  });

  it('preserves is_primary when any assignment was primary', async () => {
    const client = makeRbacClient({
      roleNameRows: [
        { role_name: 'platform_admin', is_primary: false }, // seen first
        { role_name: 'platform_admin', is_primary: true }, // primary wins
      ],
    });
    mockCreateUserClientSafe.mockResolvedValue({ client, error: null });

    const res = await GET(makeRequest('/api/rbac/permissions?user_id=user-1'));
    const body = await res.json();
    expect(body.roles).toEqual([{ role_name: 'platform_admin', is_primary: true }]);
  });

  it('leaves non-duplicated role lists unchanged', async () => {
    const client = makeRbacClient({
      roleNameRows: [
        { role_name: 'platform_admin', is_primary: true },
        { role_name: 'executive', is_primary: false },
      ],
    });
    mockCreateUserClientSafe.mockResolvedValue({ client, error: null });

    const res = await GET(makeRequest('/api/rbac/permissions?user_id=user-1'));
    const body = await res.json();
    expect(body.roles).toHaveLength(2);
    expect(body.roles).toContainEqual({ role_name: 'platform_admin', is_primary: true });
    expect(body.roles).toContainEqual({ role_name: 'executive', is_primary: false });
  });

  it('handles an empty role list gracefully', async () => {
    const client = makeRbacClient({ roleNameRows: [] });
    mockCreateUserClientSafe.mockResolvedValue({ client, error: null });

    const res = await GET(makeRequest('/api/rbac/permissions?user_id=user-1'));
    const body = await res.json();
    expect(body.roles).toEqual([]);
  });
});
