import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { findAccountDuplicates } from '@/lib/crm/duplicate-detector';
import { createUserClientSafe } from '@/lib/supabase/server';

const matchSchema = z.object({
  limit: z.number().int().min(1).max(500).default(100),
  threshold: z.number().min(0).max(1).default(0.6),
});

/**
 * POST /api/crm/leads/match-accounts
 *
 * Runs batch matching across unmatched leads against all accounts.
 * Inserts results into lead_account_matches.
 */

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

interface MatchResults {
  processed: number;
  matched: number;
  skipped: number;
  errors: string[];
}

interface InsertMatchParams {
  supabase: SupabaseClient;
  lead: Record<string, unknown>;
  accounts: Array<Record<string, unknown>>;
  threshold: number;
  results: MatchResults;
}

async function insertLeadMatches({
  supabase,
  lead,
  accounts,
  threshold,
  results,
}: InsertMatchParams): Promise<void> {
  const dupResult = findAccountDuplicates(
    { account_name: lead.company_name as string },
    accounts,
    threshold,
  );
  if (!dupResult.hasDuplicates) {
    results.skipped++;
    return;
  }

  const topMatches = dupResult.matches.slice(0, 3);
  let insertedAny = false;

  for (const match of topMatches) {
    const { error: insertError } = await supabase
      .from('lead_account_matches')
      .insert({
        lead_id: lead.id,
        account_id: match.id,
        match_type: match.matchType,
        match_score: Math.round(match.similarity * 100) / 100,
        is_confirmed: false,
      })
      .select('id')
      .single();
    if (insertError) {
      const isDupe =
        insertError.message.includes('duplicate') || insertError.message.includes('unique');
      if (!isDupe)
        results.errors.push(`Lead ${lead.id} → Account ${match.id}: ${insertError.message}`);
    } else {
      insertedAny = true;
    }
  }

  if (insertedAny) results.matched++;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 10, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { limit, threshold } = parsed.data;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const [matchedRowsRes, allLeadsRes, allAccountsRes] = await Promise.all([
    supabase.from('lead_account_matches').select('lead_id'),
    supabase
      .from('leads')
      .select('id, company_name, email, city')
      .is('deleted_at', null)
      .limit(limit * 2),
    supabase
      .from('accounts')
      .select('id, account_name, email, phone')
      .is('deleted_at', null)
      .limit(2000),
  ]);

  if (allLeadsRes.error)
    return NextResponse.json({ error: allLeadsRes.error.message }, { status: 500 });
  if (allAccountsRes.error)
    return NextResponse.json({ error: allAccountsRes.error.message }, { status: 500 });

  const matchedLeadIds = new Set(
    (matchedRowsRes.data ?? []).map((r: { lead_id: string }) => r.lead_id),
  );
  const unmatchedLeads = (allLeadsRes.data ?? [])
    .filter((l: { id: string }) => !matchedLeadIds.has(l.id))
    .slice(0, limit);

  if (unmatchedLeads.length === 0)
    return NextResponse.json({ data: { processed: 0, matched: 0, skipped: 0, errors: [] } });

  const accounts: Array<Record<string, unknown>> = allAccountsRes.data ?? [];
  const results: MatchResults = { processed: 0, matched: 0, skipped: 0, errors: [] };

  for (const lead of unmatchedLeads) {
    results.processed++;
    await insertLeadMatches({
      supabase,
      lead: lead as Record<string, unknown>,
      accounts,
      threshold,
      results,
    });
  }

  return NextResponse.json({ data: results });
}
