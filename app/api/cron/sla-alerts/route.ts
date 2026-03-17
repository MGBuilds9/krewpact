import { NextRequest, NextResponse } from 'next/server';

import { verifyCronAuth } from '@/lib/api/cron-auth';
import { createCronLogger } from '@/lib/api/cron-logger';
import { isOverdue, LEAD_SLA_CONFIG, OPPORTUNITY_SLA_CONFIG } from '@/lib/crm/sla-config';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cronLog = createCronLogger('sla-alerts');
  const supabase = createServiceClient();

  // Fetch leads in active stages
  const { data: leads } = await supabase
    .from('leads')
    .select('id, company_name, status, stage_entered_at, assigned_to')
    .is('deleted_at', null)
    .not('status', 'in', '("won","lost")');

  // Fetch opportunities in active stages
  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, opportunity_name, stage, stage_entered_at, owner_user_id')
    .not('stage', 'in', '("contracted","closed_lost")');

  const notifications: Array<{
    user_id: string;
    title: string;
    body: string;
    category: string;
    link: string;
  }> = [];

  // Collect notifications for overdue leads
  for (const lead of leads ?? []) {
    if (isOverdue(lead.status, lead.stage_entered_at, LEAD_SLA_CONFIG)) {
      if (lead.assigned_to) {
        notifications.push({
          user_id: lead.assigned_to,
          title: `SLA Overdue: ${lead.company_name}`,
          body: `Lead "${lead.company_name}" has exceeded the SLA for the "${lead.status}" stage.`,
          category: 'sla_alert',
          link: `/crm/leads/${lead.id}`,
        });
      }
    }
  }

  // Collect notifications for overdue opportunities
  for (const opp of opportunities ?? []) {
    if (isOverdue(opp.stage, opp.stage_entered_at, OPPORTUNITY_SLA_CONFIG)) {
      if (opp.owner_user_id) {
        notifications.push({
          user_id: opp.owner_user_id,
          title: `SLA Overdue: ${opp.opportunity_name}`,
          body: `Opportunity "${opp.opportunity_name}" has exceeded the SLA for the "${opp.stage}" stage.`,
          category: 'sla_alert',
          link: `/crm/opportunities/${opp.id}`,
        });
      }
    }
  }

  // Batch insert all notifications in a single DB call
  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }

  const alertsCreated = notifications.length;

  const result = {
    alertsCreated,
    checkedLeads: leads?.length ?? 0,
    checkedOpportunities: opportunities?.length ?? 0,
  };
  await cronLog.success(result);
  return NextResponse.json(result);
}

// Vercel Cron Jobs sends GET requests
export { POST as GET };
