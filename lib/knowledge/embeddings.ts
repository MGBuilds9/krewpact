interface ChunkOptions {
  maxTokens?: number;
  overlapTokens?: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkDocument(content: string, options: ChunkOptions = {}): string[] {
  const { maxTokens = 500, overlapTokens = 100 } = options;

  if (!content.trim()) return [];

  const totalTokens = estimateTokens(content);
  if (totalTokens <= maxTokens) return [content.trim()];

  const paragraphs = content.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const combined = currentChunk ? `${currentChunk}\n\n${para}` : para;
    if (estimateTokens(combined) > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      // Overlap: take last N tokens worth of chars from current chunk
      const overlapChars = overlapTokens * 4;
      const overlap = currentChunk.slice(-overlapChars);
      currentChunk = overlap ? `${overlap}\n\n${para}` : para;
    } else {
      currentChunk = combined;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export async function embedChunks(chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: chunks,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding failed: ${error}`);
  }

  const result = await response.json();
  return result.data.map((d: { embedding: number[] }) => d.embedding);
}
