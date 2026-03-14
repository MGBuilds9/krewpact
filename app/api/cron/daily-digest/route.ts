import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyCronAuth } from '@/lib/api/cron-auth';
import { buildDigest } from '@/lib/ai/agents/digest-builder';
import { sendEmail } from '@/lib/email/resend';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.AI_ENABLED !== 'true') {
    return NextResponse.json({ error: 'AI features are not enabled', disabled: true }, { status: 503 });
  }

  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Get all active users with email
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, first_name, org_id, role_keys')
    .not('email', 'is', null)
    .limit(300);

  if (usersError) {
    logger.error('Failed to fetch users for digest', { error: usersError.message });
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  if (!users?.length) {
    return NextResponse.json({ success: true, message: 'No users found' });
  }

  let sent = 0;
  let errors = 0;

  for (const user of users) {
    try {
      // Check if digest already exists for today
      const { data: existing } = await supabase
        .from('user_digests')
        .select('id')
        .eq('user_id', user.id)
        .eq('digest_date', today)
        .single();

      if (existing) continue; // Already generated

      const roleKeys = Array.isArray(user.role_keys) ? user.role_keys : [];
      const digest = await buildDigest(user.id, user.org_id, roleKeys);

      // Store digest
      await supabase.from('user_digests').insert({
        user_id: user.id,
        org_id: user.org_id,
        digest_date: today,
        sections: digest.sections,
        summary: digest.summary,
      });

      // Send email
      if (user.email) {
        const sectionsHtml = digest.sections.map(s =>
          `<h3 style="margin:16px 0 8px;color:#1a1a1a;">${s.title}</h3>
          <ul style="margin:0;padding-left:20px;">
            ${s.items.map(i => `<li style="margin:4px 0;"><strong>${i.label}</strong>: ${i.value}</li>`).join('')}
          </ul>`
        ).join('');

        const html = `
          <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#1a1a1a;">Good morning${user.first_name ? ', ' + user.first_name : ''}!</h2>
            <p style="color:#555;font-size:15px;line-height:1.5;">${digest.summary}</p>
            <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;" />
            ${sectionsHtml}
            <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;" />
            <p style="color:#999;font-size:12px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.krewpact.com'}" style="color:#2563eb;">Open KrewPact</a>
              for details.
            </p>
          </div>`;

        const result = await sendEmail({
          to: user.email,
          subject: `Your Daily Brief — ${new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`,
          html,
        });

        if (result.success) {
          await supabase
            .from('user_digests')
            .update({ email_sent_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('digest_date', today);
          sent++;
        } else {
          logger.warn(`Digest email failed for ${user.id}`, { error: result.error });
          errors++;
        }
      }
    } catch (err) {
      errors++;
      logger.error(`Digest build failed for ${user.id}`, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    errors,
    users_processed: users.length,
    timestamp: new Date().toISOString(),
  });
}

export { POST as GET };
