/**
 * Centralized AI model registry. Update model IDs here when upgrading.
 * All AI code should import from this file instead of hardcoding model strings.
 */
export const AI_MODELS = {
  // Primary text generation (Google Gemini)
  flash: 'gemini-2.0-flash',
  // Natural language queries and classification (Anthropic)
  haiku: 'claude-haiku-4-5-20251001',
  // Embedding (OpenAI)
  embedding: 'text-embedding-ada-002',
} as const;

export type AIModelId = (typeof AI_MODELS)[keyof typeof AI_MODELS];
