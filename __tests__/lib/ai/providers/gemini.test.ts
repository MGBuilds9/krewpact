import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));
vi.mock('@/lib/ai/cost-tracker', () => ({
  trackAIAction: vi.fn(),
}));

import { generateText } from 'ai';

import { trackAIAction } from '@/lib/ai/cost-tracker';
import { generateWithGemini } from '@/lib/ai/providers/gemini';

const mockGenerateText = vi.mocked(generateText);
const mockTrackAIAction = vi.mocked(trackAIAction);

describe('generateWithGemini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateText.mockResolvedValue({
      text: 'Generated response text',
      usage: { inputTokens: 50, outputTokens: 30 },
    } as any);
    mockTrackAIAction.mockResolvedValue(undefined as any);
  });

  it('calls generateText with correct model and prompt', async () => {
    await generateWithGemini({ prompt: 'Hello Gemini' });

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'google/gemini-2.0-flash',
        prompt: 'Hello Gemini',
      }),
    );
  });

  it('returns trimmed text from generateText response', async () => {
    mockGenerateText.mockResolvedValue({
      text: '  trimmed response  ',
      usage: { inputTokens: 10, outputTokens: 5 },
    } as any);

    const result = await generateWithGemini({ prompt: 'Trim me' });

    expect(result).toBe('trimmed response');
  });

  it('tracks AI action with correct token counts when costContext is provided', async () => {
    const costContext = {
      orgId: '00000000-0000-4000-a000-000000000001',
      userId: 'user_test_123',
      actionType: 'nudge',
      entityType: 'lead' as const,
      entityId: 'lead-abc',
    };

    await generateWithGemini({ prompt: 'Track this', costContext });

    expect(mockTrackAIAction).toHaveBeenCalledOnce();
    expect(mockTrackAIAction).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: costContext.orgId,
        userId: costContext.userId,
        actionType: costContext.actionType,
        entityType: costContext.entityType,
        entityId: costContext.entityId,
        modelUsed: 'gemini-2.0-flash',
        inputTokens: 50,
        outputTokens: 30,
        latencyMs: expect.any(Number),
      }),
    );
  });

  it('does NOT call trackAIAction when costContext is not provided', async () => {
    await generateWithGemini({ prompt: 'No tracking' });

    expect(mockTrackAIAction).not.toHaveBeenCalled();
  });

  it('respects maxTokens parameter by passing it as maxOutputTokens', async () => {
    await generateWithGemini({ prompt: 'Short answer', maxTokens: 50 });

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 50,
      }),
    );
  });

  it('uses default maxTokens of 200 when not specified', async () => {
    await generateWithGemini({ prompt: 'Default tokens' });

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 200,
      }),
    );
  });

  it('passes undefined for inputTokens/outputTokens when usage is missing', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'No usage info',
      usage: undefined,
    } as any);

    const costContext = {
      orgId: '00000000-0000-4000-a000-000000000002',
      actionType: 'summarize',
    };

    await generateWithGemini({ prompt: 'No usage', costContext });

    expect(mockTrackAIAction).toHaveBeenCalledWith(
      expect.objectContaining({
        modelUsed: 'gemini-2.0-flash',
        inputTokens: undefined,
        outputTokens: undefined,
      }),
    );
  });

  it('throws when generateText rejects', async () => {
    mockGenerateText.mockRejectedValue(new Error('Gemini API failure'));

    await expect(generateWithGemini({ prompt: 'Fail me' })).rejects.toThrow('Gemini API failure');
  });

  it('does not call trackAIAction when generateText throws', async () => {
    mockGenerateText.mockRejectedValue(new Error('Network error'));

    await expect(
      generateWithGemini({
        prompt: 'Error path',
        costContext: { orgId: 'org-1', actionType: 'draft' },
      }),
    ).rejects.toThrow('Network error');

    expect(mockTrackAIAction).not.toHaveBeenCalled();
  });

  it('records a non-negative latencyMs in the cost tracking call', async () => {
    const costContext = {
      orgId: '00000000-0000-4000-a000-000000000003',
      actionType: 'draft',
    };

    await generateWithGemini({ prompt: 'Latency check', costContext });

    const callArgs = mockTrackAIAction.mock.calls[0][0];
    expect(callArgs.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
