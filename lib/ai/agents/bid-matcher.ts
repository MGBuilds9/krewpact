import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { generateWithGemini } from '../providers/gemini';
import type { GeneratedInsight } from '../types';

export async function detectBidMatches(orgId: string): Promise<Array<{ entityId: string; insight: GeneratedInsight }>> {
  const supabase = createServiceClient();

  // Get active leads with industry/location data
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('id, company_name, industry, city, province, division_id')
    .eq('org_id', orgId)
    .not('status', 'in', '("won","lost")')
    .is('deleted_at', null)
    .limit(50);

  if (leadsErr || !leads?.length) {
    if (leadsErr) logger.warn('Bid match lead fetch failed', { error: leadsErr.message });
    return [];
  }

  // Get open bidding opportunities
  const { data: bids, error: bidsErr } = await supabase
    .from('bidding_opportunities')
    .select('id, title, location, industry, deadline, source')
    .eq('org_id', orgId)
    .eq('status', 'open')
    .gt('deadline', new Date().toISOString())
    .limit(100);

  if (bidsErr || !bids?.length) {
    if (bidsErr) logger.warn('Bid match bids fetch failed', { error: bidsErr.message });
    return [];
  }

  const results: Array<{ entityId: string; insight: GeneratedInsight }> = [];

  for (const lead of leads) {
    if (!lead.industry && !lead.city) continue;

    const matches = bids.filter((bid) => {
      const industryMatch = lead.industry && bid.industry &&
        bid.industry.toLowerCase().includes(lead.industry.toLowerCase());
      const locationMatch = lead.city && bid.location &&
        bid.location.toLowerCase().includes(lead.city.toLowerCase());
      return industryMatch || locationMatch;
    });

    if (matches.length === 0) continue;

    const bestMatch = matches[0];
    let content: string;
    try {
      content = await generateWithGemini({
        prompt: `Write ONE sentence noting that the lead "${lead.company_name}" (industry: ${lead.industry ?? 'unknown'}, location: ${lead.city ?? 'unknown'}) matches a bidding opportunity: "${bestMatch.title}" (deadline: ${bestMatch.deadline ? new Date(bestMatch.deadline).toLocaleDateString() : 'unknown'}, source: ${bestMatch.source ?? 'unknown'}). Be action-oriented.`,
        maxTokens: 80,
        costContext: {
          orgId,
          actionType: 'insight_generated',
          entityType: 'lead',
          entityId: lead.id,
        },
      });
    } catch {
      content = `Matches bidding opportunity "${bestMatch.title}" — consider reaching out before the deadline.`;
    }

    results.push({
      entityId: lead.id,
      insight: {
        title: `Bid match: ${bestMatch.title}`,
        content,
        confidence: 0.8,
        actionUrl: null,
        actionLabel: 'View Bid',
        metadata: { bid_id: bestMatch.id, bid_title: bestMatch.title, match_count: matches.length },
      },
    });
  }

  return results;
}
