import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

import { trackAIAction } from '../cost-tracker';
import { AI_MODELS } from '../models';
import type { CostEntry } from '../types';

interface GeminiGenerateOptions {
  prompt: string;
  maxTokens?: number;
  costContext?: Omit<CostEntry, 'modelUsed'>;
}

export async function generateWithGemini({
  prompt,
  maxTokens = 200,
  costContext,
}: GeminiGenerateOptions): Promise<string> {
  const start = Date.now();

  const { text, usage } = await generateText({
    model: google(AI_MODELS.flash),
    prompt,
    maxOutputTokens: maxTokens,
  });

  if (costContext) {
    await trackAIAction({
      ...costContext,
      modelUsed: AI_MODELS.flash,
      inputTokens: usage?.inputTokens ?? undefined,
      outputTokens: usage?.outputTokens ?? undefined,
      latencyMs: Date.now() - start,
    });
  }

  return text.trim();
}
