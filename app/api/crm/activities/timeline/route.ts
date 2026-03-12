import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { parsePagination } from '@/lib/api/pagination';

const querySchema = z.object({
  lead_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
});

export interface TimelineEntry {
  id: string;
  source: 'activity' | 'outreach';
  type: string;
  title: string;
  details: string | null;
  occurred_at: string;
  created_at: string;
  owner_user_id: string | null;
  metadata: Record<string, unknown>;
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

  const { lead_id, account_id, contact_id, opportunity_id } = parsed.data;
  if (!lead_id && !account_id && !contact_id && !opportunity_id) {
    return NextResponse.json(
      { error: 'At least one of lead_id, account_id, contact_id, or opportunity_id is required' },
      { status: 400 },
    );
  }

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Fetch activities
  let activityQuery = supabase
    .from('activities')
    .select(
      'id, activity_type, title, details, due_at, completed_at, lead_id, contact_id, account_id, opportunity_id, owner_user_id, created_at, updated_at',
    );

  if (lead_id) activityQuery = activityQuery.eq('lead_id', lead_id);
  if (account_id) activityQuery = activityQuery.eq('account_id', account_id);
  if (contact_id) activityQuery = activityQuery.eq('contact_id', contact_id);
  if (opportunity_id) activityQuery = activityQuery.eq('opportunity_id', opportunity_id);

  const { data: activities, error: actError } = await activityQuery;

  if (actError) {
    return NextResponse.json({ error: actError.message }, { status: 500 });
  }

  // Fetch outreach events
  let outreachQuery = supabase
    .from('outreach')
    .select(
      'id, lead_id, contact_id, channel, direction, activity_type, outcome, outcome_detail, subject, message_preview, notes, sequence_id, sequence_step, is_automated, occurred_at, created_by',
    );

  if (lead_id) outreachQuery = outreachQuery.eq('lead_id', lead_id);
  if (contact_id) outreachQuery = outreachQuery.eq('contact_id', contact_id);

  const { data: outreach, error: outreachError } = await outreachQuery;

  if (outreachError) {
    return NextResponse.json({ error: outreachError.message }, { status: 500 });
  }

  // Merge into unified timeline
  const timeline: TimelineEntry[] = [];

  for (const act of activities ?? []) {
    timeline.push({
      id: act.id,
      source: 'activity',
      type: act.activity_type,
      title: act.title,
      details: typeof act.details === 'string' ? act.details : null,
      occurred_at: act.created_at,
      created_at: act.created_at,
      owner_user_id: act.owner_user_id,
      metadata: {
        due_at: act.due_at,
        completed_at: act.completed_at,
        lead_id: act.lead_id,
        contact_id: act.contact_id,
        account_id: act.account_id,
        opportunity_id: act.opportunity_id,
      },
    });
  }

  for (const out of outreach ?? []) {
    timeline.push({
      id: out.id,
      source: 'outreach',
      type: out.channel,
      title: out.subject ?? `${out.channel} — ${out.direction}`,
      details: out.message_preview ?? out.notes ?? null,
      occurred_at: out.occurred_at,
      created_at: out.occurred_at,
      owner_user_id: out.created_by,
      metadata: {
        direction: out.direction,
        outcome: out.outcome,
        outcome_detail: out.outcome_detail,
        is_automated: out.is_automated,
        sequence_id: out.sequence_id,
        sequence_step: out.sequence_step,
        channel: out.channel,
        lead_id: out.lead_id,
        contact_id: out.contact_id,
      },
    });
  }

  // Sort by occurred_at descending (most recent first)
  timeline.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  // Apply pagination
  const total = timeline.length;
  const paged = timeline.slice(offset, offset + limit);

  return NextResponse.json({
    data: paged,
    total,
    hasMore: total > offset + limit,
  });
}
