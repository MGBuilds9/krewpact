import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

// Mock the sequence processor
vi.mock('@/lib/crm/sequence-processor', () => ({
  processSequences: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient, createServiceClient } from '@/lib/supabase/server';
import { processSequences } from '@/lib/crm/sequence-processor';
import { POST } from '@/app/api/crm/sequences/process/route';
import { mockClerkAuth, mockClerkUnauth, makeRequest } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);
const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockProcessSequences = vi.mocked(processSequences);

describe('POST /api/crm/sequences/process', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('returns 401 without auth or cron secret', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeRequest('/api/crm/sequences/process', { method: 'POST' }));
    expect(res.status).toBe(401);
  });

  it('processes with authenticated user', async () => {
    mockClerkAuth(mockAuth);
    const mockClient = {} as never;
    mockCreateUserClient.mockResolvedValue(mockClient);
    mockProcessSequences.mockResolvedValue({
      processed: 3,
      completed: 1,
      errors: [],
      deadLettered: 0,
    });

    const res = await POST(makeRequest('/api/crm/sequences/process', { method: 'POST' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ processed: 3, completed: 1, errors: [], deadLettered: 0 });
    expect(mockProcessSequences).toHaveBeenCalledWith(mockClient);
  });

  it('processes with valid cron secret', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const mockClient = {} as never;
    mockCreateServiceClient.mockReturnValue(mockClient);
    mockProcessSequences.mockResolvedValue({
      processed: 5,
      completed: 2,
      errors: [],
      deadLettered: 0,
    });

    const res = await POST(
      makeRequest('/api/crm/sequences/process', {
        method: 'POST',
        headers: { 'x-cron-secret': 'test-cron-secret' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ processed: 5, completed: 2, errors: [], deadLettered: 0 });
    expect(mockCreateServiceClient).toHaveBeenCalled();
  });

  it('rejects invalid cron secret and falls back to user auth', async () => {
    process.env.CRON_SECRET = 'correct-secret';
    mockClerkUnauth(mockAuth);

    const res = await POST(
      makeRequest('/api/crm/sequences/process', {
        method: 'POST',
        headers: { 'x-cron-secret': 'wrong-secret' },
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns processor errors in response', async () => {
    mockClerkAuth(mockAuth);
    const mockClient = {} as never;
    mockCreateUserClient.mockResolvedValue(mockClient);
    mockProcessSequences.mockResolvedValue({
      processed: 2,
      completed: 0,
      errors: ['Enrollment enroll-1: Insert failed'],
      deadLettered: 0,
    });

    const res = await POST(makeRequest('/api/crm/sequences/process', { method: 'POST' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain('Insert failed');
  });
});
