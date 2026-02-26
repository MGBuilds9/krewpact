import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

interface DeepResearchResult {
  research_report: string;
  sources: string[];
  researched_at: string;
}

/**
 * Deep research a lead using Tavily Extract (website content) + Gemini synthesis.
 * Returns a structured company brief with sources.
 */
export async function deepResearchLead(
  companyName: string,
  website: string | null,
  enrichmentData: Record<string, unknown>,
): Promise<DeepResearchResult> {
  const sources: string[] = [];
  const contextParts: string[] = [];

  // 1. Tavily Extract — pull full content from company website
  if (website) {
    const tavilyKey = process.env.TAVILY_RESEARCH_API_KEY || process.env.TAVILY_API_KEY;
    if (tavilyKey) {
      try {
        const url = website.startsWith('http') ? website : `https://${website}`;
        const res = await fetch('https://api.tavily.com/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tavilyKey}`,
          },
          body: JSON.stringify({
            urls: [url],
            extract_depth: 'advanced',
            format: 'markdown',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const results = data.results ?? data.data ?? [];
          for (const r of results) {
            if (r.raw_content || r.content) {
              const content = (r.raw_content || r.content) as string;
              // Truncate to ~3000 chars to stay within token limits
              contextParts.push(`Website Content (${url}):\n${content.slice(0, 3000)}`);
              sources.push(url);
            }
          }
        }
      } catch (err) {
        console.error('Tavily Extract error:', err);
      }
    }
  }

  // 2. Gather existing enrichment context
  const googleMaps = enrichmentData.google_maps as Record<string, unknown> | undefined;
  const brave = enrichmentData.brave as Record<string, unknown> | undefined;
  const apollo = enrichmentData.apollo_match as Record<string, unknown> | undefined;
  const tavily = enrichmentData.tavily as Record<string, unknown> | undefined;

  if (googleMaps) {
    const parts = [];
    if (googleMaps.address) parts.push(`Address: ${googleMaps.address}`);
    if (googleMaps.google_rating) parts.push(`Rating: ${googleMaps.google_rating}/5 (${googleMaps.google_reviews_count ?? 0} reviews)`);
    if (googleMaps.business_status) parts.push(`Status: ${googleMaps.business_status}`);
    if (parts.length) contextParts.push(`Google Maps:\n${parts.join('\n')}`);
  }

  if (brave?.description) {
    contextParts.push(`Web Description: ${brave.description}`);
  }

  if (apollo) {
    const parts = [];
    if (apollo.title) parts.push(`Contact Title: ${apollo.title}`);
    if (apollo.email) parts.push(`Contact Email: ${apollo.email}`);
    if (parts.length) contextParts.push(`Apollo Contact:\n${parts.join('\n')}`);
  }

  if (tavily?.answer) {
    contextParts.push(`Tavily Research: ${tavily.answer}`);
  }

  if (contextParts.length === 0) {
    return {
      research_report: 'Insufficient data for deep research.',
      sources: [],
      researched_at: new Date().toISOString(),
    };
  }

  // 3. Gemini synthesis
  const { text } = await generateText({
    model: google('gemini-2.0-flash'),
    prompt: `You are a construction industry analyst for MDM Group Inc., a construction conglomerate in the Greater Toronto Area (GTA), Ontario, Canada. MDM offers general contracting, residential construction, wood/lumber, telecom, and property management services.

Write a structured research report (~200 words) about "${companyName}" based on the following data:

${contextParts.join('\n\n---\n\n')}

Structure your report with these sections (use plain text, no markdown headers):

BUSINESS OVERVIEW: What they do, core services, industry focus.
REPUTATION & SIZE: Google rating, reviews, web presence, years in business if available.
SERVICES & CAPABILITIES: Specific services offered based on website/description.
MDM RELEVANCE: Are they a potential client (need construction), partner (complementary services), or competitor? What MDM division would be most relevant?

Write factually. If data is insufficient for a section, note that briefly and move on.`,
    maxOutputTokens: 500,
  });

  return {
    research_report: text.trim(),
    sources,
    researched_at: new Date().toISOString(),
  };
}
