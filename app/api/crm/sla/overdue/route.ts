import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { LEAD_SLA_CONFIG, OPPORTUNITY_SLA_CONFIG, calculateSLAStatus } from '@/lib/crm/sla-config';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const now = new Date();

  // Fetch leads in active stages (not won/lost)
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, company_name, status, stage_entered_at, division_id, assigned_to')
    .is('deleted_at', null)
    .not('status', 'in', '("won","lost")');

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  // Fetch opportunities in active stages (not contracted/closed_lost)
  const { data: opportunities, error: oppsError } = await supabase
    .from('opportunities')
    .select('id, opportunity_name, stage, stage_entered_at, division_id, owner_user_id')
    .not('stage', 'in', '("contracted","closed_lost")');

  if (oppsError) {
    return NextResponse.json({ error: oppsError.message }, { status: 500 });
  }

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
}
