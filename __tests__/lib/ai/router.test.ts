import { describe, it, expect } from 'vitest';
import { getAIProvider } from '@/lib/ai/router';

describe('getAIProvider', () => {
  it('routes nudge to gemini flash', () => {
    expect(getAIProvider('nudge')).toEqual({ provider: 'google', model: 'gemini-2.0-flash' });
  });

  it('routes draft to gemini flash', () => {
    expect(getAIProvider('draft')).toEqual({ provider: 'google', model: 'gemini-2.0-flash' });
  });

  it('routes summarize to gemini flash', () => {
    expect(getAIProvider('summarize')).toEqual({ provider: 'google', model: 'gemini-2.0-flash' });
  });

  it('routes query to claude haiku', () => {
    expect(getAIProvider('query')).toEqual({ provider: 'anthropic', model: 'claude-haiku-4-5-20251001' });
  });

  it('routes embed to openai ada', () => {
    expect(getAIProvider('embed')).toEqual({ provider: 'openai', model: 'text-embedding-ada-002' });
  });
});
