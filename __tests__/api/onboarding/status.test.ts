/**
 * Tests for GET /api/onboarding/status
 * Checks onboarding completion based on org profile, divisions, and team members.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/onboarding/status/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

describe('GET /api/onboarding/status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/onboarding/status'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns step 1 when org has no profile', async () => {
    mockClerkAuth(mockAuth);
    const sb = mockSupabaseClient({
      tables: {
        organizations: { data: null, error: null },
        divisions: { data: null, error: null, count: 0 },
        user_profiles: { data: null, error: null, count: 0 },
      },
    });
    mockCreateUserClient.mockResolvedValue(sb);

    const res = await GET(makeRequest('/api/onboarding/status'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completed).toBe(false);
    expect(body.currentStep).toBe(1);
  });

  it('returns step 2 when org has profile but no divisions', async () => {
    mockClerkAuth(mockAuth);
    const sb = mockSupabaseClient({
      tables: {
        organizations: {
          data: { id: 'org-1', name: 'MDM Group', address: '123 Main St', phone: '905-555-0100' },
          error: null,
        },
        divisions: { data: null, error: null, count: 0 },
        user_profiles: { data: null, error: null, count: 0 },
      },
    });
    mockCreateUserClient.mockResolvedValue(sb);

    const res = await GET(makeRequest('/api/onboarding/status'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completed).toBe(false);
    expect(body.currentStep).toBe(2);
  });

  it('returns step 3 when org has profile + divisions but no team', async () => {
    mockClerkAuth(mockAuth);
    const sb = mockSupabaseClient({
      tables: {
        organizations: {
          data: { id: 'org-1', name: 'MDM Group', address: '123 Main St', phone: '905-555-0100' },
          error: null,
        },
        divisions: { data: null, error: null, count: 2 },
        user_profiles: { data: null, error: null, count: 0 },
      },
    });
    mockCreateUserClient.mockResolvedValue(sb);

    const res = await GET(makeRequest('/api/onboarding/status'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completed).toBe(false);
    expect(body.currentStep).toBe(3);
  });

  it('returns step 4 (completed) when org has profile + divisions + team', async () => {
    mockClerkAuth(mockAuth);
    const sb = mockSupabaseClient({
      tables: {
        organizations: {
          data: { id: 'org-1', name: 'MDM Group', address: '123 Main St', phone: '905-555-0100' },
          error: null,
        },
        divisions: { data: null, error: null, count: 3 },
        user_profiles: { data: null, error: null, count: 2 },
      },
    });
    mockCreateUserClient.mockResolvedValue(sb);

    const res = await GET(makeRequest('/api/onboarding/status'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completed).toBe(true);
    expect(body.currentStep).toBe(4);
  });

  it('returns 500 when org query fails', async () => {
    mockClerkAuth(mockAuth);
    const sb = mockSupabaseClient({
      tables: {
        organizations: { data: null, error: { message: 'DB error' } },
        divisions: { data: null, error: null, count: 0 },
        user_profiles: { data: null, error: null, count: 0 },
      },
    });
    mockCreateUserClient.mockResolvedValue(sb);

    const res = await GET(makeRequest('/api/onboarding/status'));
    expect(res.status).toBe(500);
  });

  it('returns 500 when divisions query fails', async () => {
    mockClerkAuth(mockAuth);
    const sb = mockSupabaseClient({
      tables: {
        organizations: {
          data: { id: 'org-1', name: 'MDM Group', address: '123 Main St', phone: '905-555-0100' },
          error: null,
        },
        divisions: { data: null, error: { message: 'DB error' } },
        user_profiles: { data: null, error: null, count: 0 },
      },
    });
    mockCreateUserClient.mockResolvedValue(sb);

    const res = await GET(makeRequest('/api/onboarding/status'));
    expect(res.status).toBe(500);
  });

  it('returns 500 when member query fails', async () => {
    mockClerkAuth(mockAuth);
    const sb = mockSupabaseClient({
      tables: {
        organizations: {
          data: { id: 'org-1', name: 'MDM Group', address: '123 Main St', phone: '905-555-0100' },
          error: null,
        },
        divisions: { data: null, error: null, count: 1 },
        user_profiles: { data: null, error: { message: 'DB error' } },
      },
    });
    mockCreateUserClient.mockResolvedValue(sb);

    const res = await GET(makeRequest('/api/onboarding/status'));
    expect(res.status).toBe(500);
  });

  it('considers org incomplete when name is set but address is null', async () => {
    mockClerkAuth(mockAuth);
    const sb = mockSupabaseClient({
      tables: {
        organizations: {
          data: { id: 'org-1', name: 'MDM Group', address: null, phone: null },
          error: null,
        },
        divisions: { data: null, error: null, count: 0 },
        user_profiles: { data: null, error: null, count: 0 },
      },
    });
    mockCreateUserClient.mockResolvedValue(sb);

    const res = await GET(makeRequest('/api/onboarding/status'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentStep).toBe(1);
    expect(body.completed).toBe(false);
  });
});
