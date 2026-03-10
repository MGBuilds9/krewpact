import type { SupabaseClient } from '@supabase/supabase-js';

export interface AssignmentRule {
  id: string;
  division_id: string | null;
  source_channel: string | null;
  assigned_user_id: string;
  priority: number;
  is_active: boolean;
}

export interface AssignmentResult {
  assigned: boolean;
  assigned_to: string | null;
  method: 'rule' | 'round_robin' | 'none';
}

/**
 * Assigns a lead to a sales rep using a two-tier strategy:
 * 1. Rule-based: if a matching assignment rule exists (source_channel + division match), use it
 * 2. Round-robin: distribute evenly among active users in the division
 *
 * Pure logic with database lookups via injected supabase client.
 */
export async function assignLead(
  supabase: SupabaseClient,
  lead: {
    division_id: string | null;
    source_channel: string | null;
  },
): Promise<AssignmentResult> {
  // 1. Try rule-based assignment
  const ruleResult = await tryRuleBasedAssignment(supabase, lead);
  if (ruleResult) {
    return { assigned: true, assigned_to: ruleResult, method: 'rule' };
  }

  // 2. Fall back to round-robin within division
  const rrResult = await roundRobinAssignment(supabase, lead.division_id);
  if (rrResult) {
    return { assigned: true, assigned_to: rrResult, method: 'round_robin' };
  }

  return { assigned: false, assigned_to: null, method: 'none' };
}

/**
 * Checks lead_assignment_rules for a matching rule.
 * Rules are matched by (source_channel, division_id) with priority ordering.
 */
async function tryRuleBasedAssignment(
  supabase: SupabaseClient,
  lead: { division_id: string | null; source_channel: string | null },
): Promise<string | null> {
  let query = supabase
    .from('lead_assignment_rules')
    .select('assigned_user_id')
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .limit(1);

  // Match on source_channel if present
  if (lead.source_channel) {
    query = query.or(`source_channel.eq.${lead.source_channel},source_channel.is.null`);
  } else {
    query = query.is('source_channel', null);
  }

  // Match on division_id if present
  if (lead.division_id) {
    query = query.or(`division_id.eq.${lead.division_id},division_id.is.null`);
  } else {
    query = query.is('division_id', null);
  }

  const { data } = await query;

  if (data && data.length > 0) {
    return data[0].assigned_user_id as string;
  }

  return null;
}

/**
 * Round-robin assignment: picks the user in the division with the fewest
 * currently assigned open leads. Ties are broken by user ID for determinism.
 */
async function roundRobinAssignment(
  supabase: SupabaseClient,
  divisionId: string | null,
): Promise<string | null> {
  // Get active users in division (or all if no division)
  let userQuery = supabase.from('users').select('id').eq('is_active', true);

  if (divisionId) {
    // Users linked to this division via user_divisions
    const { data: divUsers } = await supabase
      .from('user_divisions')
      .select('user_id')
      .eq('division_id', divisionId);

    if (!divUsers || divUsers.length === 0) {
      return null;
    }

    const userIds = divUsers.map((u) => u.user_id as string);
    userQuery = userQuery.in('id', userIds);
  }

  const { data: users } = await userQuery;

  if (!users || users.length === 0) {
    return null;
  }

  // Count open leads per user
  const userIds = users.map((u) => u.id as string);

  const { data: leadCounts } = await supabase
    .from('leads')
    .select('assigned_to')
    .in('assigned_to', userIds)
    .is('deleted_at', null)
    .not('status', 'in', '("won","lost","disqualified")');

  // Build count map
  const countMap = new Map<string, number>();
  for (const uid of userIds) {
    countMap.set(uid, 0);
  }
  if (leadCounts) {
    for (const row of leadCounts) {
      const oid = row.assigned_to as string;
      if (countMap.has(oid)) {
        countMap.set(oid, (countMap.get(oid) ?? 0) + 1);
      }
    }
  }

  // Pick user with fewest leads, break ties by ID
  let minCount = Infinity;
  let selectedUser: string | null = null;

  for (const [uid, count] of countMap.entries()) {
    if (count < minCount || (count === minCount && uid < (selectedUser ?? ''))) {
      minCount = count;
      selectedUser = uid;
    }
  }

  return selectedUser;
}
