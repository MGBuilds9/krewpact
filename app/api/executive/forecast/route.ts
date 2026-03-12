import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getOrgIdFromAuth, getKrewpactRoles } from '@/lib/api/org';

const EXECUTIVE_ROLES = ['platform_admin', 'executive'];

/** Stage weights for pipeline forecasting */
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

/** Returns Q1–Q4 label for a given month (0-based) */
function getQuarterLabel(year: number, month: number): string {
  const q = Math.floor(month / 3) + 1;
  return `Q${q} ${year}`;
}

/** Returns true if the given year+quarter matches the current date */
function isCurrentQuarter(year: number, quarterIndex: number, now: Date): boolean {
  const currentYear = now.getFullYear();
  const currentQ = Math.floor(now.getMonth() / 3);
  return year === currentYear && quarterIndex === currentQ;
}

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  if (!roles.some((r) => EXECUTIVE_ROLES.includes(r))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const orgId = await getOrgIdFromAuth();

    // Fetch all non-closed-lost opportunities with revenue and close date
    const { data: opportunities, error } = await supabase
      .from('opportunities')
      .select('id, stage, estimated_revenue, expected_close_date')
      .eq('org_id', orgId)
      .not('stage', 'eq', 'closed_lost')
      .not('expected_close_date', 'is', null)
      .not('estimated_revenue', 'is', null);

    if (error) {
      logger.error('Failed to fetch opportunities for forecast', { message: error.message });
      return NextResponse.json({ error: 'Failed to fetch forecast data' }, { status: 500 });
    }

    // Build 8-quarter grid: current year (full) + next year (full)
    const now = new Date();
    const currentYear = now.getFullYear();

    // Accumulator: keyed by "Q{n} {year}"
    const buckets: Record<
      string,
      { signed: number; weighted: number; year: number; quarterIndex: number }
    > = {};

    for (let year = currentYear; year <= currentYear + 1; year++) {
      for (let q = 0; q < 4; q++) {
        const label = `Q${q + 1} ${year}`;
        buckets[label] = { signed: 0, weighted: 0, year, quarterIndex: q };
      }
    }

    for (const opp of opportunities ?? []) {
      const closeDate = new Date(opp.expected_close_date as string);
      const oppYear = closeDate.getFullYear();
      const oppMonth = closeDate.getMonth();
      const label = getQuarterLabel(oppYear, oppMonth);

      // Only include quarters within our 8-quarter window
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
  } catch (err: unknown) {
    logger.error('Forecast fetch failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to fetch forecast' }, { status: 500 });
  }
}
