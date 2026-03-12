import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  calculatePipelineMetrics,
  calculateConversionMetrics,
  calculateVelocityMetrics,
  calculateSourceMetrics,
  calculateForecastMetrics,
} from '@/lib/crm/metrics';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
});

function getPeriodStart(period: string): string {
  const now = new Date();
  switch (period) {
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    case 'month': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString();
    }
    case 'quarter': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d.toISOString();
    }
    case 'year': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString();
    }
    default:
      return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { division_id, period = 'month' } = parsed.data;
  const periodStart = getPeriodStart(period);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Fetch opportunities (all for pipeline, filtered by period for velocity)
  let oppQuery = supabase
    .from('opportunities')
    .select(
      'id, opportunity_name, stage, estimated_revenue, probability_pct, target_close_date, account_id, contact_id, lead_id, division_id, owner_user_id, notes, created_at, updated_at, opportunity_stage_history(*)',
    );

  if (division_id) {
    oppQuery = oppQuery.eq('division_id', division_id);
  }

  const { data: opportunities, error: oppError } = await oppQuery;

  if (oppError) {
    return NextResponse.json({ error: oppError.message }, { status: 500 });
  }

  // Fetch leads filtered by period
  let leadQuery = supabase
    .from('leads')
    .select(
      'id, company_name, status, lead_score, fit_score, intent_score, engagement_score, source_channel, utm_campaign, source_detail, assigned_to, division_id, created_at, updated_at, city, province, industry, next_followup_at, last_touch_at, is_qualified, domain, enrichment_status, deleted_at',
    )
    .gte('created_at', periodStart);

  if (division_id) {
    leadQuery = leadQuery.eq('division_id', division_id);
  }

  const { data: leads, error: leadError } = await leadQuery;

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  const pipeline = calculatePipelineMetrics(opportunities ?? []);
  const conversion = calculateConversionMetrics(leads ?? []);
  const velocity = calculateVelocityMetrics(opportunities ?? []);
  const sources = calculateSourceMetrics(leads ?? []);
  const forecast = calculateForecastMetrics(opportunities ?? []);

  // Compute "My Leads" vs "My Accounts" summary for dashboard split
  const allLeads = leads ?? [];
  const openLeads = allLeads.filter((l) => !['won', 'lost'].includes(l.status));
  const convertedLeads = allLeads.filter((l) => l.status === 'won');
  const recentlyConverted = convertedLeads
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const ownership = {
    openLeadCount: openLeads.length,
    convertedLeadCount: convertedLeads.length,
    recentlyConverted: recentlyConverted.map((l) => ({
      id: l.id,
      company_name: l.company_name,
      source_channel: l.source_channel,
      created_at: l.created_at,
    })),
  };

  return NextResponse.json({ pipeline, conversion, velocity, sources, forecast, ownership });
}
