/**
 * lib/jobs/portalReminders.ts
 * Approval reminder cron job logic.
 * Called by: GET /api/cron/portal-reminders (Vercel Cron)
 *
 * Finds change orders in 'pending_client_approval' older than 3 days,
 * inserts a reminder portal_message and a notification row (once per day).
 * Idempotency: uses idempotency_keys table to prevent double-sends.
 */

import { createServiceClient } from '@/lib/supabase/server';

const REMINDER_DAYS_THRESHOLD = 3;
const IDEMPOTENCY_TTL_HOURS = 23;

export async function runPortalReminderJob(): Promise<{ sent: number; skipped: number; errors: string[] }> {
  const supabase = createServiceClient();
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - REMINDER_DAYS_THRESHOLD * 24 * 60 * 60 * 1000);
  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;

  // 1. Find pending COs older than threshold
  const { data: pendingCOs, error: coError } = await supabase
    .from('change_orders')
    .select('id, project_id, co_number, title, total_amount, submitted_at')
    .eq('status', 'pending_client_approval')
    .lt('submitted_at', thresholdDate.toISOString());

  if (coError) {
    return { sent: 0, skipped: 0, errors: [coError.message] };
  }

  for (const co of pendingCOs ?? []) {
    // 2. Find portal accounts with approve_change_orders on this project
    const { data: permissions } = await supabase
      .from('portal_permissions')
      .select('portal_account_id, permission_set')
      .eq('project_id', co.project_id);

    const approvingAccounts = (permissions ?? []).filter((p) => {
      const ps = (p.permission_set as Record<string, boolean>) ?? {};
      return ps.approve_change_orders === true;
    });

    for (const perm of approvingAccounts) {
      const idempotencyKey = `portal_reminder:co:${co.id}:pa:${perm.portal_account_id}:${now.toISOString().slice(0, 10)}`;

      // 3. Check idempotency
      const { data: existing } = await supabase
        .from('idempotency_keys')
        .select('id')
        .eq('key_value', idempotencyKey)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // 4. Insert the reminder message
      const reminderBody = `Reminder: Change Order ${co.co_number} — "${co.title}" ($${Number(co.total_amount).toLocaleString('en-CA')} CAD) is awaiting your approval. Please log in to review.`;

      const { error: msgError } = await supabase.from('portal_messages').insert({
        project_id: co.project_id,
        portal_account_id: perm.portal_account_id,
        sender_user_id: null,
        direction: 'outbound',
        subject: `Action Required: CO ${co.co_number} awaiting approval`,
        body: reminderBody,
      });

      if (msgError) {
        errors.push(`CO ${co.id} / PA ${perm.portal_account_id}: ${msgError.message}`);
        continue;
      }

      // 5. Insert notification
      await supabase.from('notifications').insert({
        portal_account_id: perm.portal_account_id,
        channel: 'in_app',
        state: 'queued',
        title: `CO ${co.co_number} awaiting your approval`,
        message: reminderBody,
        payload: { co_id: co.id, project_id: co.project_id },
      });

      // 6. Record idempotency key
      const expiresAt = new Date(now.getTime() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000).toISOString();
      await supabase.from('idempotency_keys').insert({
        key_value: idempotencyKey,
        endpoint: 'cron/portal-reminders',
        request_hash: idempotencyKey,
        expires_at: expiresAt,
      });

      sent++;
    }
  }

  return { sent, skipped, errors };
}
