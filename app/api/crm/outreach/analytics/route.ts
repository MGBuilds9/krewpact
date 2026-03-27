import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

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

export const GET = withApiRoute({}, async ({ req }) => {
  const params = req.nextUrl.searchParams;
  const templateId = params.get('template_id');
  const sequenceId = params.get('sequence_id');
  const days = parseInt(params.get('days') ?? '30', 10);

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const since = sinceDate.toISOString();

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const countsResult = await Promise.allSettled([
    fetchOutreachCounts(supabase, since, templateId, sequenceId),
  ]);

  if (countsResult[0].status === 'rejected') {
    throw dbError('Failed to fetch outreach analytics');
  }

  const { sent, opened, clicked, replied } = countsResult[0].value;

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
});
