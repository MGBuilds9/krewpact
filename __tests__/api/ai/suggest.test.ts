import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import { GET } from '@/app/api/ai/suggest/route';
import { createUserClientSafe } from '@/lib/supabase/server';

import { mockClerkAuth, mockClerkUnauth } from '../../helpers/mock-auth';
import { makeRequest } from '../../helpers/mock-request';
import { mockSupabaseClient } from '../../helpers/mock-supabase';

const mockAuth = vi.mocked(auth);

describe('GET /api/ai/suggest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user_test_123');
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeRequest(
      '/api/ai/suggest?field=estimated_value&context=' +
        encodeURIComponent(JSON.stringify({ project_type: 'renovation' })),
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 for missing field param', async () => {
    const supabase = mockSupabaseClient();
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest(
      '/api/ai/suggest?context=' + encodeURIComponent(JSON.stringify({ project_type: 'reno' })),
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 for missing context param', async () => {
    const supabase = mockSupabaseClient();
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const req = makeRequest('/api/ai/suggest?field=estimated_value');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns suggestion for estimated_value field based on opportunities', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        opportunities: {
          data: [{ value: 60000 }, { value: 80000 }, { value: 100000 }],
          error: null,
        },
      },
    });
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const context = JSON.stringify({ project_type: 'commercial_renovation' });
    const req = makeRequest(
      `/api/ai/suggest?field=estimated_value&context=${encodeURIComponent(context)}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestion).toBeDefined();
    expect(body.explanation).toMatch(/Similar projects averaged/);
    expect(body.explanation).toMatch(/3 won deals/);
  });

  it('returns null suggestion for estimated_value when no opportunities data', async () => {
    const supabase = mockSupabaseClient({
      tables: { opportunities: { data: [], error: null } },
    });
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const context = JSON.stringify({ project_type: 'residential' });
    const req = makeRequest(
      `/api/ai/suggest?field=estimated_value&context=${encodeURIComponent(context)}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestion).toBeNull();
  });

  it('returns suggestion for industry field based on matching lead', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        leads: {
          data: [{ industry: 'Telecommunications' }],
          error: null,
        },
      },
    });
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const context = JSON.stringify({ company_name: 'Telco Partners Inc' });
    const req = makeRequest(
      `/api/ai/suggest?field=industry&context=${encodeURIComponent(context)}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestion).toBe('Telecommunications');
    expect(body.explanation).toMatch(/Previously recorded as/);
  });

  it('returns null suggestion for unknown field', async () => {
    const supabase = mockSupabaseClient();
    (createUserClientSafe as any).mockResolvedValue({ client: supabase, error: null });

    const context = JSON.stringify({ some: 'context' });
    const req = makeRequest(
      `/api/ai/suggest?field=unknown_field&context=${encodeURIComponent(context)}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestion).toBeNull();
  });
});
