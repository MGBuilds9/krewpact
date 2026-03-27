import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

import { logger } from '@/lib/logger';

import { trackAIAction } from '../cost-tracker';
import { executeToolCall, queryTools } from '../tools';

interface NLQueryInput {
  query: string;
  orgId: string;
  userId?: string;
}

interface NLQueryOutput {
  answer: string;
  data?: unknown;
  toolUsed?: string;
}

async function generateAnswer(input: NLQueryInput, summary: string): Promise<string> {
  const start = Date.now();
  const { text: answer, usage } = await generateText({
    model: google('gemini-2.0-flash'),
    prompt: `You are a helpful assistant for a construction company's CRM. The user asked: "${input.query}"

Here is the data retrieved:
${summary}

Write a concise, helpful answer (2-4 sentences max). Use specific numbers from the data. If the data is empty, say so clearly.`,
    maxOutputTokens: 200,
  });
  await trackAIAction({
    orgId: input.orgId,
    userId: input.userId,
    actionType: 'query_answered',
    modelUsed: 'gemini-2.0-flash',
    inputTokens: usage?.inputTokens ?? undefined,
    outputTokens: usage?.outputTokens ?? undefined,
    latencyMs: Date.now() - start,
  });
  return answer.trim();
}

export async function executeNLQuery(input: NLQueryInput): Promise<NLQueryOutput> {
  const start = Date.now();

  // Step 1: Use Gemini to determine which tool to call and with what args
  const toolDescriptions = queryTools
    .map(
      (t) =>
        `Tool: ${t.name}\nDescription: ${t.description}\nParameters: ${JSON.stringify(t.parameters)}`,
    )
    .join('\n\n');

  const { text: toolCallText, usage } = await generateText({
    model: google('gemini-2.0-flash'),
    prompt: `You are a data query assistant for a construction CRM. Given the user's question, determine which tool to call and with what parameters.

Available tools:
${toolDescriptions}

User question: "${input.query}"

Respond in EXACTLY this format (no other text):
TOOL: <tool_name>
ARGS: <json_object>

If the question cannot be answered with the available tools, respond:
TOOL: none
ARGS: {}`,
    maxOutputTokens: 150,
  });

  // Track the planning call
  await trackAIAction({
    orgId: input.orgId,
    userId: input.userId,
    actionType: 'query_planned',
    modelUsed: 'gemini-2.0-flash',
    inputTokens: usage?.inputTokens ?? undefined,
    outputTokens: usage?.outputTokens ?? undefined,
    latencyMs: Date.now() - start,
  });

  // Step 2: Parse tool call
  const toolMatch = toolCallText.match(/TOOL:\s*(\S+)/);
  const argsMatch = toolCallText.match(/ARGS:\s*(\{[\s\S]*\})/);

  const toolName = toolMatch?.[1];
  if (!toolName || toolName === 'none') {
    return {
      answer:
        "I can help with pipeline metrics, lead searches, project status, and deal analysis. Try asking something like 'Show me stalled deals over $500k' or 'What\\'s our win rate?'",
    };
  }

  let args: Record<string, unknown> = {};
  try {
    args = argsMatch?.[1] ? JSON.parse(argsMatch[1]) : {};
  } catch {
    logger.warn('Failed to parse NL query args', { raw: argsMatch?.[1] });
  }

  // Step 3: Execute the tool
  const { data, summary } = await executeToolCall(toolName, args, input.orgId);

  const answer = await generateAnswer(input, summary);
  return { answer, data, toolUsed: toolName };
}
