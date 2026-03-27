import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { calculateSLAStatus, LEAD_SLA_CONFIG, OPPORTUNITY_SLA_CONFIG } from '@/lib/crm/sla-config';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async () => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const now = new Date();

  // Fetch leads in active stages (not won/lost)
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, company_name, status, stage_entered_at, division_id, assigned_to')
    .is('deleted_at', null)
    .not('status', 'in', '("won","lost")');

  if (leadsError) throw dbError(leadsError.message);

  // Fetch opportunities in active stages (not contracted/closed_lost)
  const { data: opportunities, error: oppsError } = await supabase
    .from('opportunities')
    .select('id, opportunity_name, stage, stage_entered_at, division_id, owner_user_id')
    .not('stage', 'in', '("contracted","closed_lost")');

  if (oppsError) throw dbError(oppsError.message);

  // Calculate SLA status for each
  const overdueLeads = (leads ?? [])
    .map((lead) => {
      const sla = calculateSLAStatus(lead.status, lead.stage_entered_at, LEAD_SLA_CONFIG, now);
      return { ...lead, sla, entityType: 'lead' as const };
    })
    .filter((l) => l.sla?.isOverdue);

  const overdueOpportunities = (opportunities ?? [])
    .map((opp) => {
      const sla = calculateSLAStatus(opp.stage, opp.stage_entered_at, OPPORTUNITY_SLA_CONFIG, now);
      return { ...opp, sla, entityType: 'opportunity' as const };
    })
    .filter((o) => o.sla?.isOverdue);

  return NextResponse.json({
    overdue: [...overdueLeads, ...overdueOpportunities],
    counts: {
      leads: overdueLeads.length,
      opportunities: overdueOpportunities.length,
      total: overdueLeads.length + overdueOpportunities.length,
    },
  });
});
