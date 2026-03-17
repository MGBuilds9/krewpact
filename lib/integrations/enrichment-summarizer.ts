import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

/**
 * Summarize enrichment data into a 2-3 sentence company brief
 * using Gemini Flash. Returns empty string on failure (non-critical).
 */
export async function summarizeEnrichment(
  companyName: string,
  enrichmentData: Record<string, unknown>,
): Promise<string> {
  const googleMaps = enrichmentData.google_maps as Record<string, unknown> | undefined;
  const brave = enrichmentData.brave as Record<string, unknown> | undefined;
  const apollo = enrichmentData.apollo_match as Record<string, unknown> | undefined;
  const tavily = enrichmentData.tavily as Record<string, unknown> | undefined;

  // Build context from available sources
  const parts: string[] = [];

  if (googleMaps) {
    const rating = googleMaps.google_rating;
    const reviews = googleMaps.google_reviews_count;
    const address = googleMaps.address;
    const status = googleMaps.business_status;
    if (address) parts.push(`Address: ${address}`);
    if (rating) parts.push(`Google Rating: ${rating}/5 (${reviews ?? 0} reviews)`);
    if (status) parts.push(`Business Status: ${status}`);
  }

  if (brave) {
    if (brave.website) parts.push(`Website: ${brave.website}`);
    if (brave.description) parts.push(`Web Description: ${brave.description}`);
  }

  if (apollo) {
    if (apollo.title) parts.push(`Contact Title: ${apollo.title}`);
    if (apollo.email) parts.push(`Contact Email: ${apollo.email}`);
  }

  if (tavily) {
    if (tavily.answer) parts.push(`AI Research: ${tavily.answer}`);
  }

  if (parts.length === 0) {
    return '';
  }

  const { text } = await generateText({
    model: google('gemini-2.0-flash'),
    prompt: `You are a construction industry analyst for MDM Group Inc., a construction conglomerate in the Greater Toronto Area (GTA), Ontario, Canada.

Given the following enrichment data about "${companyName}", write a concise 2-3 sentence company brief. Focus on:
- What they do (industry/services)
- Size/reputation indicators (Google rating, reviews, web presence)
- Relevance to construction services (are they a potential client, partner, or competitor?)

Enrichment Data:
${parts.join('\n')}

Write ONLY the brief — no headings, no bullet points, no preamble. Keep it factual and actionable.`,
    maxOutputTokens: 200,
  });

  return text.trim();
}
