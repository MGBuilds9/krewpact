import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { createUserClientSafe } from '@/lib/supabase/server';

interface SearchResult {
  id: string;
  type: 'lead' | 'contact' | 'account' | 'opportunity';
  title: string;
  subtitle: string | null;
}

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

async function searchEntities(supabase: SupabaseClient, pattern: string): Promise<SearchResult[]> {
  const [leadsRes, contactsRes, accountsRes, oppsRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id, company_name, status')
      .ilike('company_name', pattern)
      .limit(5),
    supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),
    supabase
      .from('accounts')
      .select('id, account_name, industry')
      .ilike('account_name', pattern)
      .limit(5),
    supabase
      .from('opportunities')
      .select('id, opportunity_name, stage')
      .ilike('opportunity_name', pattern)
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  (leadsRes.data ?? []).forEach((l) =>
    results.push({
      id: l.id,
      type: 'lead',
      title: l.company_name ?? 'Unknown',
      subtitle: l.status,
    }),
  );
  (contactsRes.data ?? []).forEach((c) =>
    results.push({
      id: c.id,
      type: 'contact',
      title: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Unknown',
      subtitle: c.email,
    }),
  );
  (accountsRes.data ?? []).forEach((a) =>
    results.push({
      id: a.id,
      type: 'account',
      title: a.account_name ?? 'Unknown',
      subtitle: a.industry,
    }),
  );
  (oppsRes.data ?? []).forEach((o) =>
    results.push({
      id: o.id,
      type: 'opportunity',
      title: o.opportunity_name ?? 'Unknown',
      subtitle: o.stage,
    }),
  );

  return results;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ data: [], total: 0 });

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const results = await searchEntities(supabase, `%${q}%`);
  return NextResponse.json({ data: results, total: results.length });
}
