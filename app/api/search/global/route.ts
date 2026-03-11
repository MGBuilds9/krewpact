import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

interface EntityResult {
  id: string;
  name: string;
  subtitle: string | null;
}

interface GlobalSearchResults {
  leads: EntityResult[];
  accounts: EntityResult[];
  contacts: EntityResult[];
  opportunities: EntityResult[];
  estimates: EntityResult[];
  projects: EntityResult[];
  tasks: EntityResult[];
}

const MAX_PER_TYPE = 5;

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({
      results: {
        leads: [],
        accounts: [],
        contacts: [],
        opportunities: [],
        estimates: [],
        projects: [],
        tasks: [],
      },
    });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const pattern = `%${q}%`;

  // Extract divisions from JWT claims for division isolation
  const claims = sessionClaims as Record<string, unknown> | null;
  const divisions = (claims?.krewpact_divisions ?? []) as string[];

  // Run all queries in parallel for performance
  const [leadsRes, accountsRes, contactsRes, oppsRes, estimatesRes, projectsRes, tasksRes] =
    await Promise.all([
      // Leads: search company_name
      (() => {
        let query = supabase
          .from('leads')
          .select('id, company_name, status')
          .ilike('company_name', pattern)
          .limit(MAX_PER_TYPE);
        if (divisions.length > 0) {
          query = query.in('division_id', divisions);
        }
        return query;
      })(),

      // Accounts: search account_name
      (() => {
        let query = supabase
          .from('accounts')
          .select('id, account_name, industry')
          .ilike('account_name', pattern)
          .limit(MAX_PER_TYPE);
        if (divisions.length > 0) {
          query = query.in('division_id', divisions);
        }
        return query;
      })(),

      // Contacts: search first_name, last_name, email
      supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`)
        .limit(MAX_PER_TYPE),

      // Opportunities: search opportunity_name
      (() => {
        let query = supabase
          .from('opportunities')
          .select('id, opportunity_name, stage')
          .ilike('opportunity_name', pattern)
          .limit(MAX_PER_TYPE);
        if (divisions.length > 0) {
          query = query.in('division_id', divisions);
        }
        return query;
      })(),

      // Estimates: search estimate_number
      (() => {
        let query = supabase
          .from('estimates')
          .select('id, estimate_number, status')
          .ilike('estimate_number', pattern)
          .limit(MAX_PER_TYPE);
        if (divisions.length > 0) {
          query = query.in('division_id', divisions);
        }
        return query;
      })(),

      // Projects: search project_name, project_number
      (() => {
        let query = supabase
          .from('projects')
          .select('id, project_name, project_number, status')
          .or(`project_name.ilike.${pattern},project_number.ilike.${pattern}`)
          .limit(MAX_PER_TYPE);
        if (divisions.length > 0) {
          query = query.in('division_id', divisions);
        }
        return query;
      })(),

      // Tasks: search title
      supabase
        .from('tasks')
        .select('id, title, status, project_id')
        .ilike('title', pattern)
        .limit(MAX_PER_TYPE),
    ]);

  const results: GlobalSearchResults = {
    leads: (leadsRes.data ?? []).map((l) => ({
      id: l.id,
      name: l.company_name ?? 'Unknown',
      subtitle: l.status ?? null,
    })),
    accounts: (accountsRes.data ?? []).map((a) => ({
      id: a.id,
      name: a.account_name ?? 'Unknown',
      subtitle: a.industry ?? null,
    })),
    contacts: (contactsRes.data ?? []).map((c) => ({
      id: c.id,
      name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Unknown',
      subtitle: c.email ?? null,
    })),
    opportunities: (oppsRes.data ?? []).map((o) => ({
      id: o.id,
      name: o.opportunity_name ?? 'Unknown',
      subtitle: o.stage ?? null,
    })),
    estimates: (estimatesRes.data ?? []).map((e) => ({
      id: e.id,
      name: e.estimate_number ?? 'Unknown',
      subtitle: e.status ?? null,
    })),
    projects: (projectsRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.project_name ?? 'Unknown',
      subtitle: p.status ?? null,
    })),
    tasks: (tasksRes.data ?? []).map((t) => ({
      id: t.id,
      name: t.title ?? 'Unknown',
      subtitle: t.status ?? null,
    })),
  };

  return NextResponse.json({ results });
}
