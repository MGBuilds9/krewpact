import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const templateId = params.get('template_id');
  const sequenceId = params.get('sequence_id');
  const days = parseInt(params.get('days') ?? '30', 10);

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const since = sinceDate.toISOString();

  const supabase = await createUserClient();

  let baseQuery = supabase
    .from('outreach_events')
    .select('*', { count: 'exact', head: true })
    .eq('channel', 'email')
    .gte('occurred_at', since);

  if (templateId) {
    baseQuery = baseQuery.eq('template_id', templateId);
  }
  if (sequenceId) {
    baseQuery = baseQuery.eq('sequence_id', sequenceId);
  }

  const { count: totalSent } = await baseQuery;

  let openedQuery = supabase
    .from('outreach_events')
    .select('*', { count: 'exact', head: true })
    .eq('channel', 'email')
    .gte('occurred_at', since)
    .not('opened_at', 'is', null);

  if (templateId) openedQuery = openedQuery.eq('template_id', templateId);
  if (sequenceId) openedQuery = openedQuery.eq('sequence_id', sequenceId);

  const { count: totalOpened } = await openedQuery;

  let clickedQuery = supabase
    .from('outreach_events')
    .select('*', { count: 'exact', head: true })
    .eq('channel', 'email')
    .gte('occurred_at', since)
    .not('clicked_at', 'is', null);

  if (templateId) clickedQuery = clickedQuery.eq('template_id', templateId);
  if (sequenceId) clickedQuery = clickedQuery.eq('sequence_id', sequenceId);

  const { count: totalClicked } = await clickedQuery;

  let repliedQuery = supabase
    .from('outreach_events')
    .select('*', { count: 'exact', head: true })
    .eq('channel', 'email')
    .gte('occurred_at', since)
    .not('replied_at', 'is', null);

  if (templateId) repliedQuery = repliedQuery.eq('template_id', templateId);
  if (sequenceId) repliedQuery = repliedQuery.eq('sequence_id', sequenceId);

  const { count: totalReplied } = await repliedQuery;

  const sent = totalSent ?? 0;
  const opened = totalOpened ?? 0;
  const clicked = totalClicked ?? 0;
  const replied = totalReplied ?? 0;

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
