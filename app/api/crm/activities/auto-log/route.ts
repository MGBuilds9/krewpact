import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { matchEmailToEntities } from '@/lib/crm/email-activity-matcher';
import { createUserClientSafe } from '@/lib/supabase/server';
import { autoLogSchema } from '@/lib/validators/crm';

interface EmailMatches {
  leads: Array<{ id: string }>;
  contacts: Array<{ id: string }>;
  accounts: Array<{ id: string }>;
}

function buildActivityRecords(
  matches: EmailMatches,
  directionLabel: string,
  subject: string,
  details: string,
): Record<string, unknown>[] {
  const activityRecords: Record<string, unknown>[] = [];
  const baseActivity = { activity_type: 'email', title: `${directionLabel}: ${subject}`, details };

  matches.leads.forEach((lead) => activityRecords.push({ ...baseActivity, lead_id: lead.id }));

  matches.contacts.forEach((contact) => {
    const matchedAccount = matches.accounts[0] ?? null;
    activityRecords.push({
      ...baseActivity,
      contact_id: contact.id,
      account_id: matchedAccount?.id ?? null,
    });
  });

  const accountsCoveredByContacts = new Set(
    activityRecords.filter((r) => r.account_id).map((r) => r.account_id as string),
  );
  matches.accounts.forEach((account) => {
    if (!accountsCoveredByContacts.has(account.id)) {
      activityRecords.push({ ...baseActivity, account_id: account.id });
    }
  });

  return activityRecords;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = autoLogSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { email_address, subject, direction, message_preview } = parsed.data;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const matches = await matchEmailToEntities(supabase, email_address);
  const hasMatches =
    matches.leads.length > 0 || matches.contacts.length > 0 || matches.accounts.length > 0;
  if (!hasMatches) return NextResponse.json({ matched: false, activities_created: 0 });

  const directionLabel = direction === 'inbound' ? 'Received' : 'Sent';
  const details = message_preview
    ? `${directionLabel} email: "${subject}"\n\n${message_preview}`
    : `${directionLabel} email: "${subject}"`;

  const activityRecords = buildActivityRecords(matches, directionLabel, subject, details);
  if (activityRecords.length === 0)
    return NextResponse.json({ matched: false, activities_created: 0 });

  const { error } = await supabase.from('activities').insert(activityRecords);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ matched: true, activities_created: activityRecords.length });
}
