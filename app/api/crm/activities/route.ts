import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { activityCreateSchema } from '@/lib/validators/crm';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { logger } from '@/lib/logger';

const activityTypes = ['call', 'email', 'meeting', 'note', 'task'] as const;

const querySchema = z.object({
  opportunity_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  activity_type: z.enum(activityTypes).optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
});

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

  const { opportunity_id, lead_id, account_id, contact_id, activity_type, sort_by, sort_dir } =
    parsed.data;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const supabase = await createUserClient();

  let query = supabase
    .from('activities')
    .select(
      'id, activity_type, title, details, due_at, completed_at, lead_id, contact_id, account_id, opportunity_id, owner_user_id, created_at, updated_at',
      { count: 'exact' },
    )
    .order(sort_by ?? 'created_at', { ascending: sort_dir === 'asc' });

  if (opportunity_id) {
    query = query.eq('opportunity_id', opportunity_id);
  }

  if (lead_id) {
    query = query.eq('lead_id', lead_id);
  }

  if (account_id) {
    query = query.eq('account_id', account_id);
  }

  if (contact_id) {
    query = query.eq('contact_id', contact_id);
  }

  if (activity_type) {
    query = query.eq('activity_type', activity_type);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = activityCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase.from('activities').insert(parsed.data).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-create follow-up task for certain outcomes
  const followUpOutcomes = ['no_answer', 'voicemail', 'callback_requested'] as const;
  const outcome = parsed.data.outcome;
  if (outcome && (followUpOutcomes as readonly string[]).includes(outcome)) {
    try {
      const followUpDelayDays: Record<string, number> = {
        no_answer: 1,
        voicemail: 2,
        callback_requested: 1,
      };
      const delayDays = followUpDelayDays[outcome] ?? 1;
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + delayDays);

      const followUpTitle =
        outcome === 'callback_requested'
          ? `Follow up: Callback requested — ${parsed.data.title}`
          : `Follow up: ${outcome.replace('_', ' ')} — ${parsed.data.title}`;

      await supabase.from('activities').insert({
        activity_type: 'task',
        title: followUpTitle,
        details: `Auto-created follow-up from activity outcome: ${outcome}`,
        lead_id: parsed.data.lead_id,
        opportunity_id: parsed.data.opportunity_id,
        account_id: parsed.data.account_id,
        contact_id: parsed.data.contact_id,
        owner_user_id: parsed.data.owner_user_id,
        due_at: dueAt.toISOString(),
      });
    } catch (e) {
      // Follow-up creation failure should not block activity creation
      logger.error('Auto follow-up creation failed', { error: e });
    }
  }

  return NextResponse.json(data, { status: 201 });
}
