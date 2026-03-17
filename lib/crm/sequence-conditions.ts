import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Evaluates a condition for a sequence step.
 * Returns true if the condition is met, false otherwise.
 */
export async function evaluateCondition(
  supabase: SupabaseClient,
  enrollment: Record<string, unknown>,
  conditionType: string,
  conditionConfig: Record<string, unknown>,
): Promise<boolean> {
  const leadId = enrollment.lead_id as string;

  switch (conditionType) {
    case 'if_score': {
      const threshold = conditionConfig.threshold as number | undefined;
      if (threshold === undefined) return false;

      const { data: lead } = await supabase
        .from('leads')
        .select('lead_score')
        .eq('id', leadId)
        .single();

      if (!lead) return false;
      const score = (lead.lead_score as number) ?? 0;
      return score >= threshold;
    }

    case 'if_email_opened': {
      const { data: outreach } = await supabase
        .from('outreach')
        .select('opened_at')
        .eq('lead_id', leadId)
        .eq('sequence_id', enrollment.sequence_id)
        .not('opened_at', 'is', null)
        .limit(1)
        .maybeSingle();

      return outreach !== null;
    }

    case 'if_replied': {
      const { data: outreach } = await supabase
        .from('outreach')
        .select('replied_at')
        .eq('lead_id', leadId)
        .eq('sequence_id', enrollment.sequence_id)
        .not('replied_at', 'is', null)
        .limit(1)
        .maybeSingle();

      return outreach !== null;
    }

    case 'if_tag': {
      const tagId = conditionConfig.tag_id as string | undefined;
      if (!tagId) return false;

      const { data: tagLink } = await supabase
        .from('entity_tags')
        .select('id')
        .eq('entity_type', 'lead')
        .eq('entity_id', leadId)
        .eq('tag_id', tagId)
        .maybeSingle();

      return tagLink !== null;
    }

    case 'if_stage': {
      const stage = conditionConfig.stage as string | undefined;
      if (!stage) return false;

      const { data: lead } = await supabase.from('leads').select('stage').eq('id', leadId).single();

      if (!lead) return false;
      return (lead.stage as string) === stage;
    }

    default:
      return false;
  }
}
