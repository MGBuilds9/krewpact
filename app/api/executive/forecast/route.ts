import { NextResponse } from 'next/server';

import { forbidden } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { env } from '@/lib/env';
import { createUserClientSafe } from '@/lib/supabase/server';

const EXECUTIVE_ROLES = ['platform_admin', 'executive'];

const STAGE_WEIGHTS: Record<string, number> = {
  closed_won: 1.0,
  negotiation: 0.75,
  proposal: 0.5,
  qualified: 0.25,
  lead: 0.1,
  closed_lost: 0,
};

interface ForecastQuarter {
  quarter: string;
  signed: number;
  weighted: number;
  total: number;
  isCurrent: boolean;
}

function getQuarterLabel(year: number, month: number): string {
  return `Q${Math.floor(month / 3) + 1} ${year}`;
}

function isCurrentQuarter(year: number, quarterIndex: number, now: Date): boolean {
  return year === now.getFullYear() && quarterIndex === Math.floor(now.getMonth() / 3);
}

function buildForecastBuckets(now: Date) {
  const currentYear = now.getFullYear();
  const buckets: Record<
    string,
    { signed: number; weighted: number; year: number; quarterIndex: number }
  > = {};
  for (let year = currentYear; year <= currentYear + 1; year++) {
    for (let q = 0; q < 4; q++) {
      buckets[`Q${q + 1} ${year}`] = { signed: 0, weighted: 0, year, quarterIndex: q };
    }
  }
  return buckets;
}

function accumulateOpportunities(
  buckets: ReturnType<typeof buildForecastBuckets>,
  opportunities: Array<Record<string, unknown>>,
) {
  for (const opp of opportunities) {
    const closeDate = new Date(opp.expected_close_date as string);
    const label = getQuarterLabel(closeDate.getFullYear(), closeDate.getMonth());
    if (!(label in buckets)) continue;
    const revenue = Number(opp.estimated_revenue ?? 0);
    const stage = (opp.stage as string) ?? 'lead';
    const weight = STAGE_WEIGHTS[stage] ?? 0;
    if (stage === 'closed_won') {
      buckets[label].signed += revenue;
    } else {
      buckets[label].weighted += revenue * weight;
    }
  }
}

export const GET = withApiRoute({}, async ({ logger }) => {
  const roles = await getKrewpactRoles();
  if (!roles.some((r) => EXECUTIVE_ROLES.includes(r))) {
    throw forbidden('Forbidden');
  }

  if (!env.DEFAULT_ORG_ID) return NextResponse.json({ error: 'DEFAULT_ORG_ID not configured' }, { status: 500 });

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: opportunities, error } = await supabase
    .from('opportunities')
    .select('id, stage, estimated_revenue, expected_close_date')
    .eq('org_id', env.DEFAULT_ORG_ID)
    .not('stage', 'eq', 'closed_lost')
    .not('expected_close_date', 'is', null)
    .not('estimated_revenue', 'is', null);

  if (error) {
    logger.error('Failed to fetch opportunities for forecast', { message: error.message });
    throw new Error('Failed to fetch forecast data');
  }

  const now = new Date();
  const buckets = buildForecastBuckets(now);
  accumulateOpportunities(buckets, (opportunities ?? []) as Array<Record<string, unknown>>);

  const forecast: ForecastQuarter[] = Object.entries(buckets).map(([quarter, data]) => {
    const signed = Math.round(data.signed);
    const weighted = Math.round(data.weighted);
    return {
      quarter,
      signed,
      weighted,
      total: signed + weighted,
      isCurrent: isCurrentQuarter(data.year, data.quarterIndex, now),
    };
  });

  return NextResponse.json({ forecast });
});
