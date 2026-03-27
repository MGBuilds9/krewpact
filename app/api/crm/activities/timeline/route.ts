import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

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

type Filters = z.infer<typeof querySchema>;
type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

async function fetchActivities(supabase: SupabaseClient, filters: Filters) {
  let q = supabase
    .from('activities')
    .select(
      'id, activity_type, title, details, due_at, completed_at, lead_id, contact_id, account_id, opportunity_id, owner_user_id, created_at, updated_at',
    );
  if (filters.lead_id) q = q.eq('lead_id', filters.lead_id);
  if (filters.account_id) q = q.eq('account_id', filters.account_id);
  if (filters.contact_id) q = q.eq('contact_id', filters.contact_id);
  if (filters.opportunity_id) q = q.eq('opportunity_id', filters.opportunity_id);
  return q;
}

async function fetchOutreach(supabase: SupabaseClient, filters: Filters) {
  let q = supabase
    .from('outreach')
    .select(
      'id, lead_id, contact_id, channel, direction, activity_type, outcome, outcome_detail, subject, message_preview, notes, sequence_id, sequence_step, is_automated, occurred_at, created_by',
    );
  if (filters.lead_id) q = q.eq('lead_id', filters.lead_id);
  if (filters.contact_id) q = q.eq('contact_id', filters.contact_id);
  return q;
}

function mapActivitiesToTimeline(activities: Array<Record<string, unknown>>): TimelineEntry[] {
  return activities.map((act) => ({
    id: act.id as string,
    source: 'activity' as const,
    type: act.activity_type as string,
    title: act.title as string,
    details: typeof act.details === 'string' ? act.details : null,
    occurred_at: act.created_at as string,
    created_at: act.created_at as string,
    owner_user_id: act.owner_user_id as string | null,
    metadata: {
      due_at: act.due_at,
      completed_at: act.completed_at,
      lead_id: act.lead_id,
      contact_id: act.contact_id,
      account_id: act.account_id,
      opportunity_id: act.opportunity_id,
    },
  }));
}

function mapOutreachToTimeline(outreach: Array<Record<string, unknown>>): TimelineEntry[] {
  return outreach.map((out) => ({
    id: out.id as string,
    source: 'outreach' as const,
    type: out.channel as string,
    title: (out.subject as string) ?? `${out.channel} — ${out.direction}`,
    details: (out.message_preview as string) ?? (out.notes as string) ?? null,
    occurred_at: out.occurred_at as string,
    created_at: out.occurred_at as string,
    owner_user_id: out.created_by as string | null,
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
  }));
}

export const GET = withApiRoute({ querySchema }, async ({ req, query }) => {
  const filters = query as Filters;

  if (!filters.lead_id && !filters.account_id && !filters.contact_id && !filters.opportunity_id) {
    return NextResponse.json(
      {
        error: {
          code: 'MISSING_FILTER',
          message: 'At least one of lead_id, account_id, contact_id, or opportunity_id is required',
        },
      },
      { status: 400 },
    );
  }

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const [{ data: activities, error: actError }, { data: outreach, error: outreachError }] =
    await Promise.all([fetchActivities(supabase, filters), fetchOutreach(supabase, filters)]);

  if (actError) throw dbError(actError.message);
  if (outreachError) throw dbError(outreachError.message);

  const timeline = [
    ...mapActivitiesToTimeline((activities ?? []) as Array<Record<string, unknown>>),
    ...mapOutreachToTimeline((outreach ?? []) as Array<Record<string, unknown>>),
  ].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  const total = timeline.length;
  return NextResponse.json({
    data: timeline.slice(offset, offset + limit),
    total,
    hasMore: total > offset + limit,
  });
});
