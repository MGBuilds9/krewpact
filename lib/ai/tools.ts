import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; enum?: string[] }>;
  required: string[];
}

export const queryTools: ToolDefinition[] = [
  {
    name: 'search_opportunities',
    description: 'Search opportunities/deals by filters',
    parameters: {
      stage: { type: 'string', description: 'Filter by stage', enum: ['intake', 'site_visit', 'estimating', 'proposal', 'negotiation', 'contracted', 'closed_lost'] },
      min_value: { type: 'number', description: 'Minimum deal value' },
      max_value: { type: 'number', description: 'Maximum deal value' },
      stale_days: { type: 'number', description: 'Only show deals not updated in N days' },
    },
    required: [],
  },
  {
    name: 'search_leads',
    description: 'Search leads by filters',
    parameters: {
      status: { type: 'string', description: 'Filter by status', enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'nurture', 'won', 'lost'] },
      source: { type: 'string', description: 'Filter by lead source' },
      min_score: { type: 'number', description: 'Minimum lead score' },
    },
    required: [],
  },
  {
    name: 'search_projects',
    description: 'Search projects by filters',
    parameters: {
      status: { type: 'string', description: 'Filter by status', enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] },
      over_budget: { type: 'boolean', description: 'Only show over-budget projects' },
    },
    required: [],
  },
  {
    name: 'get_metrics',
    description: 'Get aggregate metrics',
    parameters: {
      metric: { type: 'string', description: 'Which metric', enum: ['pipeline_value', 'win_rate', 'avg_deal_size', 'leads_this_month', 'active_projects'] },
    },
    required: ['metric'],
  },
];

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  orgId: string,
): Promise<{ data: unknown; summary: string }> {
  const supabase = createServiceClient();

  try {
    if (toolName === 'search_opportunities') {
      let query = supabase
        .from('opportunities')
        .select('id, name, stage, value, updated_at')
        .eq('org_id', orgId)
        .limit(20);

      if (args.stage) query = query.eq('stage', args.stage as string);
      if (typeof args.min_value === 'number') query = query.gte('value', args.min_value);
      if (typeof args.max_value === 'number') query = query.lte('value', args.max_value);
      if (typeof args.stale_days === 'number') {
        const cutoff = new Date(Date.now() - args.stale_days * 24 * 60 * 60 * 1000).toISOString();
        query = query.lt('updated_at', cutoff);
      }

      const { data, error } = await query.order('value', { ascending: false });
      if (error) {
        logger.warn('search_opportunities tool error', { error: error.message });
        return { data: [], summary: 'No opportunities found.' };
      }

      const count = data?.length ?? 0;
      const totalValue = data?.reduce((sum, o) => sum + (o.value ?? 0), 0) ?? 0;
      const summary = count === 0
        ? 'No opportunities matched the filters.'
        : `Found ${count} opportunit${count === 1 ? 'y' : 'ies'} with a total value of $${totalValue.toLocaleString()}. ${data?.slice(0, 3).map(o => `"${o.name}" (${o.stage}, $${(o.value ?? 0).toLocaleString()})`).join('; ')}.`;

      return { data, summary };
    }

    if (toolName === 'search_leads') {
      let query = supabase
        .from('leads')
        .select('id, first_name, last_name, company_name, status, lead_score, source')
        .eq('org_id', orgId)
        .limit(20);

      if (args.status) query = query.eq('status', args.status as string);
      if (args.source) query = query.eq('source', args.source as string);
      if (typeof args.min_score === 'number') query = query.gte('lead_score', args.min_score);

      const { data, error } = await query.order('lead_score', { ascending: false });
      if (error) {
        logger.warn('search_leads tool error', { error: error.message });
        return { data: [], summary: 'No leads found.' };
      }

      const count = data?.length ?? 0;
      const summary = count === 0
        ? 'No leads matched the filters.'
        : `Found ${count} lead${count === 1 ? '' : 's'}. ${data?.slice(0, 3).map(l => `${l.first_name} ${l.last_name}${l.company_name ? ` (${l.company_name})` : ''} — score ${l.lead_score ?? 0}`).join('; ')}.`;

      return { data, summary };
    }

    if (toolName === 'search_projects') {
      let query = supabase
        .from('projects')
        .select('id, project_name, status, budget, actual_cost')
        .eq('org_id', orgId)
        .limit(20);

      if (args.status) query = query.eq('status', args.status as string);

      const { data, error } = await query.order('actual_cost', { ascending: false });
      if (error) {
        logger.warn('search_projects tool error', { error: error.message });
        return { data: [], summary: 'No projects found.' };
      }

      let filtered = data ?? [];
      if (args.over_budget === true) {
        filtered = filtered.filter(p => p.budget && p.actual_cost && p.actual_cost > p.budget);
      }

      const count = filtered.length;
      const summary = count === 0
        ? 'No projects matched the filters.'
        : `Found ${count} project${count === 1 ? '' : 's'}. ${filtered.slice(0, 3).map(p => `"${p.project_name}" (${p.status}${p.budget ? `, budget $${p.budget.toLocaleString()}` : ''})`).join('; ')}.`;

      return { data: filtered, summary };
    }

    if (toolName === 'get_metrics') {
      const metric = args.metric as string;

      if (metric === 'pipeline_value') {
        const { data, error } = await supabase
          .from('opportunities')
          .select('value')
          .eq('org_id', orgId)
          .not('stage', 'in', '("contracted","closed_lost")');
        if (error) return { data: null, summary: 'Could not fetch pipeline value.' };
        const total = (data ?? []).reduce((sum, o) => sum + (o.value ?? 0), 0);
        return { data: { pipeline_value: total }, summary: `Total pipeline value: $${total.toLocaleString()} across ${data?.length ?? 0} open deals.` };
      }

      if (metric === 'win_rate') {
        const { data, error } = await supabase
          .from('opportunities')
          .select('stage')
          .eq('org_id', orgId)
          .in('stage', ['contracted', 'closed_lost']);
        if (error) return { data: null, summary: 'Could not fetch win rate.' };
        const total = data?.length ?? 0;
        const won = data?.filter(o => o.stage === 'contracted').length ?? 0;
        const rate = total > 0 ? Math.round((won / total) * 100) : 0;
        return { data: { win_rate: rate, won, total }, summary: `Win rate: ${rate}% (${won} won out of ${total} closed deals).` };
      }

      if (metric === 'avg_deal_size') {
        const { data, error } = await supabase
          .from('opportunities')
          .select('value')
          .eq('org_id', orgId)
          .eq('stage', 'contracted')
          .not('value', 'is', null);
        if (error) return { data: null, summary: 'Could not fetch average deal size.' };
        const values = (data ?? []).map(o => o.value ?? 0);
        const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
        return { data: { avg_deal_size: avg }, summary: `Average deal size: $${avg.toLocaleString()} across ${values.length} contracted deals.` };
      }

      if (metric === 'leads_this_month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const { count, error } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', startOfMonth.toISOString());
        if (error) return { data: null, summary: 'Could not fetch leads this month.' };
        return { data: { leads_this_month: count ?? 0 }, summary: `${count ?? 0} new leads created this month.` };
      }

      if (metric === 'active_projects') {
        const { count, error } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('status', 'active');
        if (error) return { data: null, summary: 'Could not fetch active projects.' };
        return { data: { active_projects: count ?? 0 }, summary: `${count ?? 0} active projects currently in progress.` };
      }

      return { data: null, summary: `Unknown metric: ${metric}.` };
    }

    return { data: null, summary: `Unknown tool: ${toolName}.` };
  } catch (err) {
    logger.warn('executeToolCall error', { toolName, error: err instanceof Error ? err.message : String(err) });
    return { data: null, summary: 'An error occurred while fetching data.' };
  }
}
