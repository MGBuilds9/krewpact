import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  calculatePipelineMetrics,
  calculateConversionMetrics,
  calculateVelocityMetrics,
  calculateSourceMetrics,
} from '@/lib/crm/metrics';

const querySchema = z.object({
  division_id: z.string().uuid().optional(),
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

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { division_id, period = 'month' } = parsed.data;
  const periodStart = getPeriodStart(period);
  const supabase = await createUserClient();

  // Fetch opportunities (all for pipeline, filtered by period for velocity)
  let oppQuery = supabase
    .from('opportunities')
    .select('*, opportunity_stage_history(*)');

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
    .select('*')
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

  return NextResponse.json({ pipeline, conversion, velocity, sources });
}
