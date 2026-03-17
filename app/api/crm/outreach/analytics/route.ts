import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { createUserClientSafe } from '@/lib/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createUserClientSafe>>['client'];

function buildOutreachQuery(
  supabase: SupabaseClient,
  since: string,
  templateId: string | null,
  sequenceId: string | null,
) {
  let q = supabase
    .from('outreach')
    .select('*', { count: 'exact', head: true })
    .eq('channel', 'email')
    .gte('occurred_at', since);
  if (templateId) q = q.eq('template_id', templateId);
  if (sequenceId) q = q.eq('sequence_id', sequenceId);
  return q;
}

async function fetchOutreachCounts(
  supabase: SupabaseClient,
  since: string,
  templateId: string | null,
  sequenceId: string | null,
) {
  const [sentRes, openedRes, clickedRes, repliedRes] = await Promise.all([
    buildOutreachQuery(supabase, since, templateId, sequenceId),
    buildOutreachQuery(supabase, since, templateId, sequenceId).not('opened_at', 'is', null),
    buildOutreachQuery(supabase, since, templateId, sequenceId).not('clicked_at', 'is', null),
    buildOutreachQuery(supabase, since, templateId, sequenceId).not('replied_at', 'is', null),
  ]);
  return {
    sent: sentRes.count ?? 0,
    opened: openedRes.count ?? 0,
    clicked: clickedRes.count ?? 0,
    replied: repliedRes.count ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = req.nextUrl.searchParams;
  const templateId = params.get('template_id');
  const sequenceId = params.get('sequence_id');
  const days = parseInt(params.get('days') ?? '30', 10);

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const since = sinceDate.toISOString();

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { sent, opened, clicked, replied } = await fetchOutreachCounts(
    supabase,
    since,
    templateId,
    sequenceId,
  );

  return NextResponse.json({
    data: {
      total_sent: sent,
      total_opened: opened,
      total_clicked: clicked,
      total_replied: replied,
      open_rate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
      click_rate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
      reply_rate: sent > 0 ? Math.round((replied / sent) * 1000) / 10 : 0,
    },
  });
}
