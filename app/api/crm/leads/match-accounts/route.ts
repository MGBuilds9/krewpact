import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { findAccountDuplicates } from '@/lib/crm/duplicate-detector';

const matchSchema = z.object({
  limit: z.number().int().min(1).max(500).default(100),
  threshold: z.number().min(0).max(1).default(0.6),
});

/**
 * POST /api/crm/leads/match-accounts
 *
 * Runs batch matching across unmatched leads against all accounts.
 * Inserts results into lead_account_matches.
 *
 * Accepts:
 *   limit     — max leads to process (default 100)
 *   threshold — trigram similarity threshold (default 0.6)
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 10, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { limit, threshold } = parsed.data;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Fetch already-matched lead IDs first
  const { data: matchedRows } = await supabase
    .from('lead_account_matches')
    .select('lead_id');
  const matchedLeadIds = new Set((matchedRows ?? []).map((r: { lead_id: string }) => r.lead_id));

  // Fetch leads, then filter out already-matched ones
  const { data: allLeads, error: leadsError } = await supabase
    .from('leads')
    .select('id, company_name, email, city')
    .is('deleted_at', null)
    .limit(limit + matchedLeadIds.size);

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  const unmatchedLeads = (allLeads ?? []).filter(
    (l: { id: string }) => !matchedLeadIds.has(l.id)
  ).slice(0, limit);

  if (!unmatchedLeads || unmatchedLeads.length === 0) {
    return NextResponse.json({
      data: { processed: 0, matched: 0, skipped: 0, errors: [] },
    });
  }

  // Fetch all accounts for comparison
  const { data: allAccounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, account_name, email, phone')
    .is('deleted_at', null)
    .limit(2000);

  if (accountsError) {
    return NextResponse.json({ error: accountsError.message }, { status: 500 });
  }

  const accounts: Array<Record<string, unknown>> = allAccounts ?? [];

  const results = {
    processed: 0,
    matched: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const lead of unmatchedLeads) {
    results.processed++;

    const dupResult = findAccountDuplicates(
      { account_name: lead.company_name as string },
      accounts,
      threshold,
    );

    if (!dupResult.hasDuplicates) {
      results.skipped++;
      continue;
    }

    // Insert top match candidates (up to 3 per lead)
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
        // Unique constraint violation means already matched — skip silently
        if (!insertError.message.includes('duplicate') && !insertError.message.includes('unique')) {
          results.errors.push(
            `Lead ${lead.id} → Account ${match.id}: ${insertError.message}`,
          );
        }
      } else {
        insertedAny = true;
      }
    }

    if (insertedAny) {
      results.matched++;
    }
  }

  return NextResponse.json({ data: results });
}
