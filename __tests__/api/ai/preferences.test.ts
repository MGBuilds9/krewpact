import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi
      .fn()
      .mockReturnValue({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { auth } from '@clerk/nextjs/server';

import { GET, PATCH } from '@/app/api/ai/preferences/route';
import { rateLimit } from '@/lib/api/rate-limit';
import { createUserClientSafe } from '@/lib/supabase/server';

import { makeJsonRequest, makeRequest } from '../../helpers/mock-request';

function mockUserClient(aiPrefs: Record<string, unknown> | null, updateError: any = null) {
  const selectChain: any = {};
  ['select', 'eq', 'single'].forEach((m) => {
    selectChain[m] = vi.fn().mockReturnValue(selectChain);
  });
  selectChain.then = (resolve: any) =>
    resolve({ data: aiPrefs !== null ? { ai_preferences: aiPrefs } : null, error: null });

  const updateChain: any = {};
  ['update', 'eq'].forEach((m) => {
    updateChain[m] = vi.fn().mockReturnValue(updateChain);
  });
  updateChain.then = (resolve: any) => resolve({ error: updateError });

  const fromFn = vi.fn().mockImplementation(() => {
    return { ...selectChain, update: updateChain.update };
  });

  return { client: { from: fromFn }, error: null };
}

describe('GET /api/ai/preferences', () => {
  const mockAuth = vi.mocked(auth);
  const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
  const mockRateLimit = vi.mocked(rateLimit);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' } as any);
    mockRateLimit.mockResolvedValue({ success: true } as any);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as any);
    const req = makeRequest('/api/ai/preferences');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns default preferences when user has no ai_preferences', async () => {
    (mockCreateUserClientSafe as any).mockResolvedValue(mockUserClient(null));
    const req = makeRequest('/api/ai/preferences');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences).toMatchObject({
      insight_min_confidence: 0.7,
      digest_enabled: true,
      ai_suggestions_enabled: true,
    });
  });

  it('returns merged preferences when user has stored ai_preferences', async () => {
    (mockCreateUserClientSafe as any).mockResolvedValue(
      mockUserClient({ insight_min_confidence: 0.9, digest_enabled: false }),
    );
    const req = makeRequest('/api/ai/preferences');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences.insight_min_confidence).toBe(0.9);
    expect(body.preferences.digest_enabled).toBe(false);
    expect(body.preferences.ai_suggestions_enabled).toBe(true);
  });
});

describe('PATCH /api/ai/preferences', () => {
  const mockAuth = vi.mocked(auth);
  const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
  const mockRateLimit = vi.mocked(rateLimit);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' } as any);
    mockRateLimit.mockResolvedValue({ success: true } as any);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as any);
    const req = makeJsonRequest('/api/ai/preferences', { insight_min_confidence: 0.8 }, 'PATCH');
    const res = await PATCH(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for invalid preference values (confidence > 1)', async () => {
    const req = makeJsonRequest('/api/ai/preferences', { insight_min_confidence: 1.5 }, 'PATCH');
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('merges new preferences with existing ones', async () => {
    (mockCreateUserClientSafe as any).mockResolvedValue(
      mockUserClient({ insight_min_confidence: 0.7, digest_enabled: true }),
    );
    const req = makeJsonRequest('/api/ai/preferences', { digest_enabled: false }, 'PATCH');
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preferences.digest_enabled).toBe(false);
    expect(body.preferences.insight_min_confidence).toBe(0.7);
  });

  it('returns success with merged preferences', async () => {
    (mockCreateUserClientSafe as any).mockResolvedValue(mockUserClient({}));
    const req = makeJsonRequest(
      '/api/ai/preferences',
      { insight_min_confidence: 0.8, ai_suggestions_enabled: false },
      'PATCH',
    );
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.preferences.insight_min_confidence).toBe(0.8);
    expect(body.preferences.ai_suggestions_enabled).toBe(false);
  });

  it('returns 500 when update fails', async () => {
    (mockCreateUserClientSafe as any).mockResolvedValue(
      mockUserClient({}, { message: 'DB write error' }),
    );
    const req = makeJsonRequest('/api/ai/preferences', { digest_enabled: false }, 'PATCH');
    const res = await PATCH(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
