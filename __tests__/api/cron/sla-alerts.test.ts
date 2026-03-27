import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifyCronAuth = vi.fn();
vi.mock('@/lib/api/cron-auth', () => ({
  verifyCronAuth: (...args: unknown[]) => mockVerifyCronAuth(...args),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

import { makeRequest, mockSupabaseClient } from '@/__tests__/helpers';
import { GET } from '@/app/api/cron/sla-alerts/route';
import { createServiceClient } from '@/lib/supabase/server';

const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeCronRequest() {
  return makeRequest('/api/cron/sla-alerts', { method: 'POST' });
}

describe('POST /api/cron/sla-alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyCronAuth.mockResolvedValue({ authorized: true });
  });

  it('returns 401 when cron auth fails', async () => {
    mockVerifyCronAuth.mockResolvedValue({ authorized: false });

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(401);
  });

  it('allows request when cron auth succeeds', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: { data: [], error: null },
          opportunities: { data: [], error: null },
          notifications: { data: null, error: null },
        },
      }) as any,
    );

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alertsCreated).toBe(0);
  });

  it('creates alerts for overdue leads with assigned_to', async () => {
    // Lead in 'new' stage (48h SLA) entered 72h ago — overdue
    const staleDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: {
            data: [
              {
                id: 'lead-1',
                company_name: 'Overdue Corp',
                status: 'new',
                stage_entered_at: staleDate,
                assigned_to: 'user-1',
              },
            ],
            error: null,
          },
          opportunities: { data: [], error: null },
          notifications: { data: null, error: null },
        },
      }) as any,
    );

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alertsCreated).toBe(1);
    expect(body.checkedLeads).toBe(1);
    expect(body.checkedOpportunities).toBe(0);
  });

  it('skips leads without assigned_to (no notification created)', async () => {
    const staleDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: {
            data: [
              {
                id: 'lead-1',
                company_name: 'Unassigned Corp',
                status: 'new',
                stage_entered_at: staleDate,
                assigned_to: null,
              },
            ],
            error: null,
          },
          opportunities: { data: [], error: null },
          notifications: { data: null, error: null },
        },
      }) as any,
    );

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alertsCreated).toBe(0);
    expect(body.checkedLeads).toBe(1);
  });

  it('creates alerts for overdue opportunities with owner_user_id', async () => {
    // Opportunity in 'intake' stage (24h SLA) entered 48h ago — overdue
    const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: { data: [], error: null },
          opportunities: {
            data: [
              {
                id: 'opp-1',
                opportunity_name: 'Delayed Deal',
                stage: 'intake',
                stage_entered_at: staleDate,
                owner_user_id: 'user-2',
              },
            ],
            error: null,
          },
          notifications: { data: null, error: null },
        },
      }) as any,
    );

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alertsCreated).toBe(1);
    expect(body.checkedOpportunities).toBe(1);
  });

  it('does not create alerts for leads within SLA', async () => {
    const freshDate = new Date().toISOString();

    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: {
            data: [
              {
                id: 'lead-1',
                company_name: 'Fresh Corp',
                status: 'new',
                stage_entered_at: freshDate,
                assigned_to: 'user-1',
              },
            ],
            error: null,
          },
          opportunities: { data: [], error: null },
          notifications: { data: null, error: null },
        },
      }) as any,
    );

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alertsCreated).toBe(0);
  });

  it('does not create alerts for stages not in SLA config (e.g. won)', async () => {
    const staleDate = new Date(Date.now() - 9999 * 60 * 60 * 1000).toISOString();

    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: {
            data: [
              {
                id: 'lead-1',
                company_name: 'Won Corp',
                status: 'won',
                stage_entered_at: staleDate,
                assigned_to: 'user-1',
              },
            ],
            error: null,
          },
          opportunities: { data: [], error: null },
          notifications: { data: null, error: null },
        },
      }) as any,
    );

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    // 'won' is not in LEAD_SLA_CONFIG so isOverdue returns false
    expect(body.alertsCreated).toBe(0);
  });

  it('handles null leads/opportunities from Supabase gracefully', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: { data: null, error: null },
          opportunities: { data: null, error: null },
          notifications: { data: null, error: null },
        },
      }) as any,
    );

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alertsCreated).toBe(0);
    expect(body.checkedLeads).toBe(0);
    expect(body.checkedOpportunities).toBe(0);
  });
});
