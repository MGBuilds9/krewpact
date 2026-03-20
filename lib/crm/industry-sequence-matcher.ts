import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';

/**
 * Match a lead to the best outreach sequence based on industry.
 *
 * Priority:
 * 1. Industry-specific sequence (`target_industry` matches lead's industry)
 * 2. Generic sequence (`target_industry` IS NULL)
 *
 * Only considers sequences with `trigger_type='score_threshold'` and `is_active=true`.
 *
 * @returns The matched sequence `{ id }` or `null` if none found.
 */
export async function matchSequenceToLead(
  supabase: SupabaseClient,
  leadIndustry: string | null,
): Promise<{ id: string } | null> {
  // If lead has an industry, try industry-specific sequence first
  if (leadIndustry) {
    const { data: industrySequence, error: industryError } = await supabase
      .from('sequences')
      .select('id')
      .eq('trigger_type', 'score_threshold')
      .eq('is_active', true)
      .eq('target_industry', leadIndustry)
      .limit(1)
      .single();

    if (industrySequence && !industryError) {
      logger.info(
        `Matched industry-specific sequence ${industrySequence.id} for industry "${leadIndustry}"`,
      );
      return { id: industrySequence.id as string };
    }
  }

  // Fall back to generic sequence (no target_industry)
  const { data: genericSequence, error: genericError } = await supabase
    .from('sequences')
    .select('id')
    .eq('trigger_type', 'score_threshold')
    .eq('is_active', true)
    .is('target_industry', null)
    .limit(1)
    .single();

  if (genericSequence && !genericError) {
    logger.info(
      `Matched generic sequence ${genericSequence.id} (no industry-specific match for "${leadIndustry ?? 'none'}")`,
    );
    return { id: genericSequence.id as string };
  }

  logger.warn(`No active score_threshold sequence found for industry "${leadIndustry ?? 'none'}"`);
  return null;
}
