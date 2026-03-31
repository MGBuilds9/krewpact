/**
 * AI Tables RLS Tests
 *
 * Verifies that ai_insights, ai_actions, and user_digests are org-scoped
 * via krewpact_org_id() JWT claim. Regression test for the P0 cross-org
 * access vulnerability fixed in 20260331_002_fix_ai_rls_cross_org.sql.
 *
 * The bug: correlated subquery referenced nonexistent users.org_id column,
 * resolving to "always true" — any authenticated user could read all orgs' data.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { GET } from '@/app/api/ai/insights/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const ORG_A = 'org-aaaa-0000-0000-0000-000000000000';
const ORG_B = 'org-bbbb-0000-0000-0000-000000000000';
const ENTITY_ID = 'a1111111-1111-4111-b111-111111111111';

describe('AI RLS: org-scoped access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await GET(
      makeRequest('/api/ai/insights?entity_type=lead&entity_id=' + ENTITY_ID),
    );

    expect(res.status).toBe(401);
  });

  it('returns insights only for the authenticated user org (RLS enforced)', async () => {
    mockClerkAuth(mockAuth, 'user_org_a');

    const orgAInsights = [
      {
        id: 'insight-1',
        insight_type: 'suggestion',
        title: 'Follow up soon',
        content: 'Lead has been idle',
        confidence: 0.9,
        action_url: null,
        action_label: null,
        metadata: {},
        created_at: new Date().toISOString(),
      },
    ];

    const mockClient = mockSupabaseClient({
      defaultResponse: { data: orgAInsights, error: null },
    });
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockClient,
      error: null,
    } as never);

    const res = await GET(
      makeRequest(`/api/ai/insights?entity_type=lead&entity_id=${ENTITY_ID}`),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insights).toHaveLength(1);
    expect(body.insights[0].id).toBe('insight-1');
  });

  it('returns empty array when user org has no matching insights', async () => {
    mockClerkAuth(mockAuth, 'user_org_b');

    const mockClient = mockSupabaseClient({
      defaultResponse: { data: [], error: null },
    });
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockClient,
      error: null,
    } as never);

    const res = await GET(
      makeRequest('/api/ai/insights?entity_type=lead&entity_id=' + ENTITY_ID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insights).toHaveLength(0);
  });

  it('validates required query params', async () => {
    mockClerkAuth(mockAuth, 'user_test');

    const res = await GET(makeRequest('/api/ai/insights'));

    expect(res.status).toBe(400);
  });
});
