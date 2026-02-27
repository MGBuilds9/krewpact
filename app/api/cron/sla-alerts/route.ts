import { createUserClient } from '@/lib/supabase/server';
import {
  LEAD_SLA_CONFIG,
  OPPORTUNITY_SLA_CONFIG,
  isOverdue,
} from '@/lib/crm/sla-config';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createUserClient();

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

  let alertsCreated = 0;

  // Create notifications for overdue leads
  for (const lead of leads ?? []) {
    if (isOverdue(lead.status, lead.stage_entered_at, LEAD_SLA_CONFIG)) {
      if (lead.assigned_to) {
        await supabase.from('notifications').insert({
          user_id: lead.assigned_to,
          title: `SLA Overdue: ${lead.company_name}`,
          body: `Lead "${lead.company_name}" has exceeded the SLA for the "${lead.status}" stage.`,
          category: 'sla_alert',
          link: `/crm/leads/${lead.id}`,
        });
        alertsCreated++;
      }
    }
  }

  // Create notifications for overdue opportunities
  for (const opp of opportunities ?? []) {
    if (isOverdue(opp.stage, opp.stage_entered_at, OPPORTUNITY_SLA_CONFIG)) {
      if (opp.owner_user_id) {
        await supabase.from('notifications').insert({
          user_id: opp.owner_user_id,
          title: `SLA Overdue: ${opp.opportunity_name}`,
          body: `Opportunity "${opp.opportunity_name}" has exceeded the SLA for the "${opp.stage}" stage.`,
          category: 'sla_alert',
          link: `/crm/opportunities/${opp.id}`,
        });
        alertsCreated++;
      }
    }
  }

  return NextResponse.json({
    alertsCreated,
    checkedLeads: leads?.length ?? 0,
    checkedOpportunities: opportunities?.length ?? 0,
  });
}
