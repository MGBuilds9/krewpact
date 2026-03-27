/**
 * AI tool definitions — schema declarations for the AI chat tool loop.
 * These define what tools the AI can call.
 */

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
      stage: {
        type: 'string',
        description: 'Filter by stage',
        enum: [
          'intake',
          'site_visit',
          'estimating',
          'proposal',
          'negotiation',
          'contracted',
          'closed_lost',
        ],
      },
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
      status: {
        type: 'string',
        description: 'Filter by status',
        enum: [
          'new',
          'contacted',
          'qualified',
          'proposal',
          'negotiation',
          'nurture',
          'won',
          'lost',
        ],
      },
      source: { type: 'string', description: 'Filter by lead source' },
      min_score: { type: 'number', description: 'Minimum lead score' },
    },
    required: [],
  },
  {
    name: 'search_projects',
    description: 'Search projects by filters',
    parameters: {
      status: {
        type: 'string',
        description: 'Filter by status',
        enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
      },
      over_budget: { type: 'boolean', description: 'Only show over-budget projects' },
    },
    required: [],
  },
  {
    name: 'get_metrics',
    description: 'Get aggregate metrics',
    parameters: {
      metric: {
        type: 'string',
        description: 'Which metric',
        enum: [
          'pipeline_value',
          'win_rate',
          'avg_deal_size',
          'leads_this_month',
          'active_projects',
        ],
      },
    },
    required: ['metric'],
  },
];
