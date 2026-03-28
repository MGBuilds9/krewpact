import { AI_MODELS } from './models';
import type { AIProviderConfig, AITask } from './types';

export function getAIProvider(task: AITask): AIProviderConfig {
  switch (task) {
    case 'nudge':
    case 'draft':
    case 'summarize':
      return { provider: 'google', model: AI_MODELS.flash };
    case 'query':
      return { provider: 'anthropic', model: AI_MODELS.haiku };
    case 'embed':
      return { provider: 'openai', model: AI_MODELS.embedding };
  }
}
