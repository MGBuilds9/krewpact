import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

import { generateWithGemini } from '../providers/gemini';

interface DigestSection {
  title: string;
  items: Array<{ label: string; value: string; url?: string }>;
}

interface DigestResult {
  sections: DigestSection[];
  summary: string;
}

type UserRole = 'sales' | 'pm' | 'executive' | 'other';

function categorizeRole(roleKeys: string[]): UserRole {
  if (roleKeys.some((r) => ['executive', 'platform_admin'].includes(r))) return 'executive';
  if (
    roleKeys.some((r) => ['project_manager', 'project_coordinator', 'field_supervisor'].includes(r))
  )
    return 'pm';
  if (roleKeys.some((r) => ['operations_manager', 'estimator'].includes(r))) return 'sales';
  return 'other';
}

async function fetchSalesSections(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
): Promise<DigestSection[]> {
  const sections: DigestSection[] = [];

  // Pipeline summary
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, name, stage, value, updated_at')
    .eq('org_id', orgId)
    .not('stage', 'in', '("contracted","closed_lost")')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (opps?.length) {
    const totalValue = opps.reduce(
      (sum: number, o: { value: number | null }) => sum + (o.value ?? 0),
      0,
    );
    const formatted = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(totalValue);
    sections.push({
      title: 'Active Pipeline',
      items: [
        { label: 'Open deals', value: String(opps.length) },
        { label: 'Total pipeline value', value: formatted },
        ...opps.slice(0, 3).map((o: { name: string; stage: string; value: number | null }) => ({
          label: o.name,
          value: `${o.stage} — ${o.value ? '$' + o.value.toLocaleString() : 'TBD'}`,
        })),
      ],
    });
  }

  // Stale deals
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: stale } = await supabase
    .from('opportunities')
    .select('id, name, stage, updated_at')
    .eq('org_id', orgId)
    .not('stage', 'in', '("contracted","closed_lost")')
    .lt('updated_at', fourteenDaysAgo)
    .limit(5);

  if (stale?.length) {
    sections.push({
      title: 'Needs Attention',
      items: stale.map((o: { name: string; updated_at: string }) => {
        const days = Math.floor(
          (Date.now() - new Date(o.updated_at).getTime()) / (1000 * 60 * 60 * 24),
        );
        return { label: o.name, value: `${days} days without activity` };
      }),
    });
  }

  // New leads today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: newLeads } = await supabase
    .from('leads')
    .select('id, company_name, source_channel')
    .eq('org_id', orgId)
    .gte('created_at', todayStart.toISOString())
    .limit(5);

  if (newLeads?.length) {
    sections.push({
      title: 'New Leads Today',
      items: newLeads.map((l: { company_name: string; source_channel: string | null }) => ({
        label: l.company_name,
        value: l.source_channel ?? 'Direct',
      })),
    });
  }

  return sections;
}

async function fetchPMSections(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
): Promise<DigestSection[]> {
  const sections: DigestSection[] = [];

  // Tasks due today
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, due_date, project_id')
    .eq('org_id', orgId)
    .lte('due_date', todayEnd.toISOString())
    .neq('status', 'completed')
    .order('due_date', { ascending: true })
    .limit(10);

  if (tasks?.length) {
    sections.push({
      title: 'Tasks Due Today',
      items: tasks.map((t: { title: string; status: string }) => ({
        label: t.title,
        value: t.status,
      })),
    });
  }

  // Active projects summary
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, budget, actual_cost')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .limit(10);

  if (projects?.length) {
    sections.push({
      title: 'Active Projects',
      items: projects.map(
        (p: { name: string; budget: number | null; actual_cost: number | null }) => {
          const pct = p.budget ? Math.round(((p.actual_cost ?? 0) / p.budget) * 100) : 0;
          return { label: p.name, value: `${pct}% of budget used` };
        },
      ),
    });
  }

  return sections;
}

async function fetchExecutiveSections(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
): Promise<DigestSection[]> {
  const sections: DigestSection[] = [];

  // Won/lost this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: won } = await supabase
    .from('opportunities')
    .select('id, name, value')
    .eq('org_id', orgId)
    .eq('stage', 'contracted')
    .gte('updated_at', monthStart.toISOString())
    .limit(10);

  const { data: lost } = await supabase
    .from('opportunities')
    .select('id, name, value')
    .eq('org_id', orgId)
    .eq('stage', 'closed_lost')
    .gte('updated_at', monthStart.toISOString())
    .limit(10);

  const wonTotal = (won ?? []).reduce(
    (s: number, o: { value: number | null }) => s + (o.value ?? 0),
    0,
  );
  const lostTotal = (lost ?? []).reduce(
    (s: number, o: { value: number | null }) => s + (o.value ?? 0),
    0,
  );
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(n);

  sections.push({
    title: 'Month-to-Date',
    items: [
      { label: 'Won', value: `${won?.length ?? 0} deals (${fmt(wonTotal)})` },
      { label: 'Lost', value: `${lost?.length ?? 0} deals (${fmt(lostTotal)})` },
    ],
  });

  // Also include pipeline
  const salesSections = await fetchSalesSections(supabase, orgId);
  sections.push(...salesSections);

  return sections;
}

export async function buildDigest(
  userId: string,
  orgId: string,
  roleKeys: string[],
): Promise<DigestResult> {
  const supabase = createServiceClient();
  const role = categorizeRole(roleKeys);

  logger.info('Building digest', { userId, orgId, role });

  let sections: DigestSection[] = [];

  switch (role) {
    case 'sales':
      sections = await fetchSalesSections(supabase, orgId);
      break;
    case 'pm':
      sections = await fetchPMSections(supabase, orgId);
      break;
    case 'executive':
      sections = await fetchExecutiveSections(supabase, orgId);
      break;
    default:
      // Generic: combine sales + PM
      sections = [
        ...(await fetchSalesSections(supabase, orgId)),
        ...(await fetchPMSections(supabase, orgId)),
      ];
  }

  // Generate 2-sentence summary with Gemini
  const sectionsSummary = sections
    .map((s) => `${s.title}: ${s.items.map((i) => `${i.label} (${i.value})`).join(', ')}`)
    .join('. ');

  let summary: string;
  try {
    summary = await generateWithGemini({
      prompt: `Write a 2-sentence morning briefing summary for a construction company employee. Be concise and action-oriented.\n\nData: ${sectionsSummary}`,
      maxTokens: 100,
      costContext: {
        orgId,
        userId,
        actionType: 'digest_built',
      },
    });
  } catch {
    summary = `You have ${sections.reduce((n, s) => n + s.items.length, 0)} items across ${sections.length} categories to review today.`;
  }

  return { sections, summary };
}
