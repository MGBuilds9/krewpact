import type { AIProviderConfig, AITask } from './types';

export function getAIProvider(task: AITask): AIProviderConfig {
  switch (task) {
    case 'nudge':
    case 'draft':
    case 'summarize':
      return { provider: 'google', model: 'gemini-2.0-flash' };
    case 'query':
      return { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' };
    case 'embed':
      return { provider: 'openai', model: 'text-embedding-ada-002' };
  }
}
