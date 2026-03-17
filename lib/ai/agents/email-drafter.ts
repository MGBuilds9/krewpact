import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

import { generateWithGemini } from '../providers/gemini';
import type { EntityType } from '../types';

export type DraftType = 'follow_up' | 'introduction' | 'proposal' | 'custom';

interface DraftEmailInput {
  entityType: EntityType;
  entityId: string;
  orgId: string;
  userId: string;
  draftType: DraftType;
  customInstructions?: string;
}

interface DraftEmailOutput {
  subject: string;
  body: string;
  to: string[];
}

async function fetchEntityContext(entityType: EntityType, entityId: string) {
  const supabase = createServiceClient();

  if (entityType === 'lead') {
    const { data: lead } = await supabase
      .from('leads')
      .select(
        'id, company_name, contact_name, contact_email, industry, city, province, status, enrichment_data',
      )
      .eq('id', entityId)
      .single();

    const { data: activities } = await supabase
      .from('activities')
      .select('title, activity_type, details, completed_at')
      .eq('lead_id', entityId)
      .order('completed_at', { ascending: false })
      .limit(5);

    return { entity: lead, activities: activities ?? [], email: lead?.contact_email };
  }

  if (entityType === 'opportunity') {
    const { data: opp } = await supabase
      .from('opportunities')
      .select('id, name, stage, value, expected_close_date, account_id, lead_id')
      .eq('id', entityId)
      .single();

    let email: string | null = null;
    if (opp?.account_id) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('email, first_name, last_name')
        .eq('account_id', opp.account_id)
        .not('email', 'is', null)
        .limit(1);
      email = contacts?.[0]?.email ?? null;
    }

    const { data: activities } = await supabase
      .from('activities')
      .select('title, activity_type, details, completed_at')
      .eq('opportunity_id', entityId)
      .order('completed_at', { ascending: false })
      .limit(5);

    return { entity: opp, activities: activities ?? [], email };
  }

  if (entityType === 'account') {
    const { data: account } = await supabase
      .from('accounts')
      .select('id, name, industry, city, province, website')
      .eq('id', entityId)
      .single();

    const { data: contacts } = await supabase
      .from('contacts')
      .select('email, first_name, last_name')
      .eq('account_id', entityId)
      .not('email', 'is', null)
      .limit(3);

    return { entity: account, activities: [], email: contacts?.[0]?.email ?? null };
  }

  return { entity: null, activities: [], email: null };
}

const DRAFT_PROMPTS: Record<DraftType, string> = {
  follow_up:
    'Write a professional follow-up email. Reference the most recent interaction if available. Keep it brief (3-5 sentences) and include a clear call to action.',
  introduction:
    "Write a professional introduction email from MDM Group Inc., a construction company in the Greater Toronto Area. Mention what MDM can offer based on the recipient's industry. Keep it warm but professional, 3-5 sentences.",
  proposal:
    'Write a professional email presenting a proposal or estimate. Reference the project scope and value if available. Include a request to schedule a review meeting. 4-6 sentences.',
  custom: '', // Will be replaced with customInstructions
};

export async function draftEmail(input: DraftEmailInput): Promise<DraftEmailOutput> {
  const context = await fetchEntityContext(input.entityType, input.entityId);

  if (!context.entity) {
    throw new Error(`Entity ${input.entityType}/${input.entityId} not found`);
  }

  const entitySummary = JSON.stringify(context.entity, null, 2);
  const activitySummary =
    context.activities.length > 0
      ? `Recent activities:\n${context.activities.map((a: { title: string; activity_type: string; completed_at: string }) => `- ${a.activity_type}: ${a.title} (${a.completed_at})`).join('\n')}`
      : 'No recent activity recorded.';

  const instructions =
    input.draftType === 'custom' && input.customInstructions
      ? input.customInstructions
      : DRAFT_PROMPTS[input.draftType];

  const prompt = `You are writing an email on behalf of an employee at MDM Group Inc., a construction conglomerate in the Greater Toronto Area (GTA), Ontario, Canada.

Context about the recipient:
${entitySummary}

${activitySummary}

Instructions: ${instructions}

Respond in EXACTLY this format (no extra text):
SUBJECT: [email subject line]
BODY:
[email body - plain text, no HTML]`;

  const raw = await generateWithGemini({
    prompt,
    maxTokens: 400,
    costContext: {
      orgId: input.orgId,
      userId: input.userId,
      actionType: 'email_drafted',
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });

  // Parse the response
  const subjectMatch = raw.match(/SUBJECT:\s*(.+)/);
  const bodyMatch = raw.match(/BODY:\s*([\s\S]+)/);

  const subject = subjectMatch?.[1]?.trim() ?? 'Follow Up — MDM Group';
  const body = bodyMatch?.[1]?.trim() ?? raw;

  logger.info('Email draft generated', {
    entityType: input.entityType,
    entityId: input.entityId,
    draftType: input.draftType,
    hasRecipient: context.email !== null,
  });

  return {
    subject,
    body,
    to: context.email ? [context.email] : [],
  };
}
