/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('ai', () => ({ generateText: vi.fn() }));
vi.mock('@ai-sdk/google', () => ({ google: vi.fn().mockReturnValue('gemini-mock') }));
vi.mock('@/lib/ai/cost-tracker', () => ({ trackAIAction: vi.fn() }));
vi.mock('@/lib/ai/tools', () => ({
  queryTools: [
    {
      name: 'search_opportunities',
      description: 'Search for opportunities in the pipeline',
      parameters: { min_value: { type: 'number' } },
    },
  ],
  executeToolCall: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateText } from 'ai';
import { trackAIAction } from '@/lib/ai/cost-tracker';
import { executeToolCall } from '@/lib/ai/tools';
import { executeNLQuery } from '@/lib/ai/agents/nl-query';

const mockGenerateText = vi.mocked(generateText);
const mockTrackAIAction = vi.mocked(trackAIAction);
const mockExecuteToolCall = vi.mocked(executeToolCall);

const ORG_ID = '00000000-0000-4000-a000-000000000001';
const USER_ID = 'user_test_nl';

beforeEach(() => {
  vi.clearAllMocks();
  mockTrackAIAction.mockResolvedValue(undefined);
  mockExecuteToolCall.mockResolvedValue({ data: [], summary: 'No results found.' });
});

describe('executeNLQuery', () => {
  it('returns helpful message when tool is none', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'TOOL: none\nARGS: {}',
      usage: { inputTokens: 100, outputTokens: 10 },
    } as any);

    const result = await executeNLQuery({ query: 'hello world', orgId: ORG_ID, userId: USER_ID });

    expect(result.answer).toContain('pipeline metrics');
    expect(result.toolUsed).toBeUndefined();
    expect(result.data).toBeUndefined();
  });

  it('parses TOOL and ARGS from Gemini response', async () => {
    mockGenerateText
      .mockResolvedValueOnce({
        text: 'TOOL: search_opportunities\nARGS: {"min_value": 500000}',
        usage: { inputTokens: 100, outputTokens: 20 },
      } as any)
      .mockResolvedValueOnce({
        text: 'You have 3 deals over $500k.',
        usage: { inputTokens: 50, outputTokens: 30 },
      } as any);

    const result = await executeNLQuery({ query: 'Show me deals over $500k', orgId: ORG_ID, userId: USER_ID });

    expect(mockExecuteToolCall).toHaveBeenCalledWith(
      'search_opportunities',
      { min_value: 500000 },
      ORG_ID,
    );
    expect(result.toolUsed).toBe('search_opportunities');
  });

  it('calls executeToolCall with parsed tool and args', async () => {
    mockGenerateText
      .mockResolvedValueOnce({
        text: 'TOOL: search_opportunities\nARGS: {"min_value": 100000}',
        usage: { inputTokens: 80, outputTokens: 15 },
      } as any)
      .mockResolvedValueOnce({
        text: 'Found 5 opportunities.',
        usage: { inputTokens: 60, outputTokens: 20 },
      } as any);

    const mockData = [{ id: 'opp-1', name: 'Big Deal' }];
    mockExecuteToolCall.mockResolvedValue({ data: mockData, summary: 'Found 1 opportunity.' });

    const result = await executeNLQuery({ query: 'Find opportunities', orgId: ORG_ID });

    expect(mockExecuteToolCall).toHaveBeenCalledWith('search_opportunities', { min_value: 100000 }, ORG_ID);
    expect(result.data).toEqual(mockData);
  });

  it('generates natural language answer from tool results', async () => {
    mockGenerateText
      .mockResolvedValueOnce({
        text: 'TOOL: search_opportunities\nARGS: {"min_value": 500000}',
        usage: { inputTokens: 100, outputTokens: 20 },
      } as any)
      .mockResolvedValueOnce({
        text: 'You have 3 deals over $500k.',
        usage: { inputTokens: 50, outputTokens: 30 },
      } as any);

    const result = await executeNLQuery({ query: 'Big deals?', orgId: ORG_ID, userId: USER_ID });

    expect(result.answer).toBe('You have 3 deals over $500k.');
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it('tracks both planning and answer AI actions', async () => {
    mockGenerateText
      .mockResolvedValueOnce({
        text: 'TOOL: search_opportunities\nARGS: {}',
        usage: { inputTokens: 100, outputTokens: 20 },
      } as any)
      .mockResolvedValueOnce({
        text: 'Pipeline looks healthy.',
        usage: { inputTokens: 50, outputTokens: 30 },
      } as any);

    await executeNLQuery({ query: 'Pipeline status?', orgId: ORG_ID, userId: USER_ID });

    expect(mockTrackAIAction).toHaveBeenCalledTimes(2);
    expect(mockTrackAIAction).toHaveBeenNthCalledWith(1, expect.objectContaining({ actionType: 'query_planned' }));
    expect(mockTrackAIAction).toHaveBeenNthCalledWith(2, expect.objectContaining({ actionType: 'query_answered' }));
  });

  it('handles malformed ARGS gracefully and defaults to {}', async () => {
    mockGenerateText
      .mockResolvedValueOnce({
        text: 'TOOL: search_opportunities\nARGS: {not valid json!!!}',
        usage: { inputTokens: 100, outputTokens: 20 },
      } as any)
      .mockResolvedValueOnce({
        text: 'No results found.',
        usage: { inputTokens: 50, outputTokens: 10 },
      } as any);

    const result = await executeNLQuery({ query: 'Show pipeline', orgId: ORG_ID, userId: USER_ID });

    expect(mockExecuteToolCall).toHaveBeenCalledWith('search_opportunities', {}, ORG_ID);
    expect(result.toolUsed).toBe('search_opportunities');
  });

  it('passes orgId and userId through to trackAIAction', async () => {
    mockGenerateText
      .mockResolvedValueOnce({
        text: 'TOOL: search_opportunities\nARGS: {}',
        usage: { inputTokens: 100, outputTokens: 20 },
      } as any)
      .mockResolvedValueOnce({
        text: 'Done.',
        usage: { inputTokens: 40, outputTokens: 10 },
      } as any);

    await executeNLQuery({ query: 'Any deals?', orgId: ORG_ID, userId: USER_ID });

    expect(mockTrackAIAction).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: ORG_ID, userId: USER_ID }),
    );
    expect(mockTrackAIAction).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: ORG_ID, userId: USER_ID }),
    );
  });
});
