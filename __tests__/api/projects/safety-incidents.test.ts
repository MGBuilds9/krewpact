/**
 * Tests for /api/projects/[id]/safety/incidents (GET list, POST create).
 *
 * Covers: auth, pagination, creation, validation (severity enum), DB errors.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/projects/[id]/safety/incidents/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleIncident = {
  id: 'inc-1',
  project_id: 'proj-1',
  incident_date: '2026-03-05',
  severity: 'medium',
  summary: 'Worker slipped on wet surface in basement',
  details: { location: 'Basement B2', witness: 'John D.' },
  reported_by: 'user_test_123',
  created_at: '2026-03-05T15:00:00Z',
};

describe('GET /api/projects/[id]/safety/incidents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest('/api/projects/proj-1/safety/incidents'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns paginated safety incidents', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { safety_incidents: { data: [sampleIncident], error: null } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/projects/proj-1/safety/incidents'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].severity).toBe('medium');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { safety_incidents: { data: null, error: { message: 'DB error' } } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/projects/proj-1/safety/incidents'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(500);
  });
});

describe('POST /api/projects/[id]/safety/incidents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/safety/incidents', {
        incident_date: '2026-03-05',
        severity: 'low',
        summary: 'Test',
        details: {},
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('creates a safety incident', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { safety_incidents: { data: sampleIncident, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/safety/incidents', {
        incident_date: '2026-03-05',
        severity: 'medium',
        summary: 'Worker slipped on wet surface in basement',
        details: { location: 'Basement B2' },
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.severity).toBe('medium');
  });

  it('rejects invalid severity enum', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/safety/incidents', {
        incident_date: '2026-03-05',
        severity: 'extreme',
        summary: 'Invalid severity',
        details: {},
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('rejects missing required fields', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/safety/incidents', {
        incident_date: '2026-03-05',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeRequest('/api/projects/proj-1/safety/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });
});
