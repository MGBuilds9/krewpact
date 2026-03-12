/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { createServiceClient } from '@/lib/supabase/server';
import { trackAIAction } from '@/lib/ai/cost-tracker';

describe('trackAIAction', () => {
  const mockInsert = vi.fn().mockResolvedValue({ error: null });

  beforeEach(() => {
    vi.clearAllMocks();
    (createServiceClient as any).mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    });
  });

  it('inserts action record into ai_actions table', async () => {
    await trackAIAction({
      orgId: 'org-1',
      userId: 'user-1',
      actionType: 'insight_generated',
      modelUsed: 'gemini-2.0-flash',
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        user_id: 'user-1',
        action_type: 'insight_generated',
        model_used: 'gemini-2.0-flash',
      }),
    );
  });

  it('inserts null user_id when not provided', async () => {
    await trackAIAction({
      orgId: 'org-2',
      actionType: 'nudge',
      modelUsed: 'gemini-2.0-flash',
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-2',
        user_id: null,
        action_type: 'nudge',
        model_used: 'gemini-2.0-flash',
      }),
    );
  });

  it('uses provided costCents rather than estimating', async () => {
    await trackAIAction({
      orgId: 'org-1',
      actionType: 'test',
      modelUsed: 'gemini-2.0-flash',
      costCents: 42,
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ cost_cents: 42 }),
    );
  });

  it('estimates cost from token counts when costCents not provided', async () => {
    await trackAIAction({
      orgId: 'org-1',
      actionType: 'test',
      modelUsed: 'gemini-2.0-flash',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    // gemini-2.0-flash: input 8 cents/1M + output 30 cents/1M = 38 cents
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ cost_cents: 38 }),
    );
  });

  it('does not throw on insert failure', async () => {
    mockInsert.mockRejectedValueOnce(new Error('DB down'));
    await expect(
      trackAIAction({
        orgId: 'org-1',
        actionType: 'test',
        modelUsed: 'gemini-2.0-flash',
      }),
    ).resolves.toBeUndefined();
  });

  it('does not throw when createServiceClient throws', async () => {
    (createServiceClient as any).mockImplementationOnce(() => {
      throw new Error('no service key');
    });
    await expect(
      trackAIAction({
        orgId: 'org-1',
        actionType: 'test',
        modelUsed: 'gemini-2.0-flash',
      }),
    ).resolves.toBeUndefined();
  });
});
