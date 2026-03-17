import { NextRequest, NextResponse } from 'next/server';

import { buildDigest } from '@/lib/ai/agents/digest-builder';
import { verifyCronAuth } from '@/lib/api/cron-auth';
import { createCronLogger } from '@/lib/api/cron-logger';
import { sendEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createServiceClient>>;

interface DigestUser {
  id: string;
  email: string | null;
  first_name: string | null;
  org_id: string;
  role_keys: unknown;
}

function buildDigestHtml(
  digest: Awaited<ReturnType<typeof buildDigest>>,
  firstName: string | null,
): string {
  const sectionsHtml = digest.sections
    .map(
      (s) =>
        `<h3 style="margin:16px 0 8px;color:#1a1a1a;">${s.title}</h3>
    <ul style="margin:0;padding-left:20px;">
      ${s.items.map((i) => `<li style="margin:4px 0;"><strong>${i.label}</strong>: ${i.value}</li>`).join('')}
    </ul>`,
    )
    .join('');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.krewpact.com';
  return `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
    <h2 style="color:#1a1a1a;">Good morning${firstName ? ', ' + firstName : ''}!</h2>
    <p style="color:#555;font-size:15px;line-height:1.5;">${digest.summary}</p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;" />
    ${sectionsHtml}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;" />
    <p style="color:#999;font-size:12px;"><a href="${appUrl}" style="color:#2563eb;">Open KrewPact</a> for details.</p>
  </div>`;
}

async function processUser(
  supabase: SupabaseClient,
  user: DigestUser,
  today: string,
): Promise<'sent' | 'skipped' | 'error'> {
  const { data: existing } = await supabase
    .from('user_digests')
    .select('id')
    .eq('user_id', user.id)
    .eq('digest_date', today)
    .single();

  if (existing) return 'skipped';

  const roleKeys = Array.isArray(user.role_keys) ? user.role_keys : [];
  const digest = await buildDigest(user.id, user.org_id, roleKeys);

  await supabase.from('user_digests').insert({
    user_id: user.id,
    org_id: user.org_id,
    digest_date: today,
    sections: digest.sections,
    summary: digest.summary,
  });

  if (!user.email) return 'skipped';

  const result = await sendEmail({
    to: user.email,
    subject: `Your Daily Brief — ${new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`,
    html: buildDigestHtml(digest, user.first_name),
  });

  if (result.success) {
    await supabase
      .from('user_digests')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('digest_date', today);
    return 'sent';
  }

  logger.warn(`Digest email failed for ${user.id}`, { error: result.error });
  return 'error';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.AI_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'AI features are not enabled', disabled: true },
      { status: 503 },
    );
  }

  const { authorized } = await verifyCronAuth(req);
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cronLog = createCronLogger('daily-digest');
  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, first_name, org_id, role_keys')
    .not('email', 'is', null)
    .limit(300);

  if (usersError) {
    logger.error('Failed to fetch users for digest', { error: usersError.message });
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  if (!users?.length) return NextResponse.json({ success: true, message: 'No users found' });

  let sent = 0;
  let errors = 0;

  for (const user of users) {
    try {
      const outcome = await processUser(supabase, user as DigestUser, today);
      if (outcome === 'sent') sent++;
      else if (outcome === 'error') errors++;
    } catch (err) {
      errors++;
      logger.error(`Digest build failed for ${user.id}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const result = {
    success: true,
    sent,
    errors,
    users_processed: users.length,
    timestamp: new Date().toISOString(),
  };
  await cronLog.success({ sent, errors, users_processed: users.length });
  return NextResponse.json(result);
}

export { POST as GET };
