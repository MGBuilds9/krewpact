import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

interface SearchResult {
  id: string;
  type: 'lead' | 'contact' | 'account' | 'opportunity';
  title: string;
  subtitle: string | null;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ data: [], total: 0 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const pattern = `%${q}%`;
  const results: SearchResult[] = [];

  // Search leads
  const { data: leads } = await supabase
    .from('leads')
    .select('id, company_name, status')
    .ilike('company_name', pattern)
    .limit(5);

  if (leads) {
    for (const l of leads) {
      results.push({
        id: l.id,
        type: 'lead',
        title: l.company_name ?? 'Unknown',
        subtitle: l.status,
      });
    }
  }

  // Search contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email')
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`)
    .limit(5);

  if (contacts) {
    for (const c of contacts) {
      results.push({
        id: c.id,
        type: 'contact',
        title: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Unknown',
        subtitle: c.email,
      });
    }
  }

  // Search accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, account_name, industry')
    .ilike('account_name', pattern)
    .limit(5);

  if (accounts) {
    for (const a of accounts) {
      results.push({
        id: a.id,
        type: 'account',
        title: a.account_name ?? 'Unknown',
        subtitle: a.industry,
      });
    }
  }

  // Search opportunities
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, opportunity_name, stage')
    .ilike('opportunity_name', pattern)
    .limit(5);

  if (opps) {
    for (const o of opps) {
      results.push({
        id: o.id,
        type: 'opportunity',
        title: o.opportunity_name ?? 'Unknown',
        subtitle: o.stage,
      });
    }
  }

  return NextResponse.json({ data: results, total: results.length });
}
