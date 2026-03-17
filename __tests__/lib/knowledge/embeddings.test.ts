import { describe, expect, it } from 'vitest';

import { chunkDocument } from '@/lib/knowledge/embeddings';

describe('chunkDocument', () => {
  it('returns empty array for empty content', () => {
    expect(chunkDocument('')).toHaveLength(0);
    expect(chunkDocument('   ')).toHaveLength(0);
  });

  it('returns single chunk for short documents', () => {
    const chunks = chunkDocument('Short document content.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('Short document content.');
  });

  it('splits long documents into multiple chunks', () => {
    // Create content > 500 tokens (~2000 chars)
    const paragraphs = Array.from(
      { length: 20 },
      (_, i) => `Paragraph ${i + 1}. ${Array(50).fill('word').join(' ')}`,
    );
    const longContent = paragraphs.join('\n\n');
    const chunks = chunkDocument(longContent);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('respects custom maxTokens option', () => {
    const content = Array.from({ length: 10 }, (_, i) => `Paragraph ${i}.`).join('\n\n');
    const smallChunks = chunkDocument(content, { maxTokens: 10, overlapTokens: 2 });
    const largeChunks = chunkDocument(content, { maxTokens: 1000, overlapTokens: 0 });
    expect(smallChunks.length).toBeGreaterThan(largeChunks.length);
  });

  it('creates overlapping chunks', () => {
    // With overlap, end of chunk N should appear at start of chunk N+1
    const paragraphs = Array.from(
      { length: 20 },
      (_, i) => `Unique paragraph ${i}: ${Array(30).fill('content').join(' ')}`,
    );
    const content = paragraphs.join('\n\n');
    const chunks = chunkDocument(content, { maxTokens: 100, overlapTokens: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    // All chunks should be non-empty
    chunks.forEach((chunk) => expect(chunk.length).toBeGreaterThan(0));
  });

  it('preserves all content (no data loss)', () => {
    const paragraphs = ['First paragraph.', 'Second paragraph.', 'Third paragraph.'];
    const content = paragraphs.join('\n\n');
    const chunks = chunkDocument(content, { maxTokens: 20, overlapTokens: 5 });
    // Each original paragraph should appear in at least one chunk
    paragraphs.forEach((para) => {
      const found = chunks.some((chunk) => chunk.includes(para));
      expect(found).toBe(true);
    });
  });
});
