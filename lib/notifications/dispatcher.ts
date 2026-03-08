/**
 * Notification dispatcher — sends emails on key business events.
 *
 * Each event type defines:
 * - Who gets notified (recipient logic via context)
 * - Email subject line
 * - HTML body content
 *
 * Callers provide pre-resolved recipient emails and names in the event context
 * so the dispatcher stays pure (no DB queries). API routes resolve user info
 * before calling dispatchNotification().
 */

import { sendEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Event types — discriminated union
// ---------------------------------------------------------------------------

interface LeadAssignedEvent {
  type: 'lead_assigned';
  assignee_email: string;
  assignee_name: string;
  lead_company: string;
  lead_id: string;
  assigned_by_name: string;
}

interface EstimateApprovedEvent {
  type: 'estimate_approved';
  owner_email: string;
  owner_name: string;
  estimate_number: string;
  estimate_id: string;
  opportunity_name: string;
  approved_by_name: string;
}

interface ContractSignedEvent {
  type: 'contract_signed';
  recipients: Array<{ email: string; name: string }>;
  contract_id: string;
  project_name: string;
  client_name: string;
  signed_at: string;
}

interface TaskOverdueEvent {
  type: 'task_overdue';
  recipients: Array<{ email: string; name: string }>;
  task_id: string;
  task_title: string;
  project_name: string;
  due_date: string;
}

interface DailyLogSubmittedEvent {
  type: 'daily_log_submitted';
  pm_email: string;
  pm_name: string;
  supervisor_name: string;
  project_name: string;
  log_date: string;
  log_id: string;
}

interface PortalMessageReceivedEvent {
  type: 'portal_message_received';
  recipient_email: string;
  recipient_name: string;
  sender_name: string;
  sender_company: string;
  message_preview: string;
  thread_id: string;
}

export type NotificationEvent =
  | LeadAssignedEvent
  | EstimateApprovedEvent
  | ContractSignedEvent
  | TaskOverdueEvent
  | DailyLogSubmittedEvent
  | PortalMessageReceivedEvent;

// ---------------------------------------------------------------------------
// Shared email wrapper
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.krewpact.com';

function notificationHtml(
  heading: string,
  bodyLines: string[],
  ctaUrl?: string,
  ctaText?: string,
): string {
  const bodyHtml = bodyLines
    .map(
      (line) =>
        `<p style="margin:0 0 12px 0;font-size:15px;color:#444;line-height:1.6;">${line}</p>`,
    )
    .join('\n');
  const ctaHtml =
    ctaUrl && ctaText
      ? `<p style="margin:24px 0 0 0;"><a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;background-color:#1E3A5F;color:#fff;text-decoration:none;border-radius:4px;font-weight:600;font-size:14px;">${ctaText}</a></p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#F5F5F5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background-color:#1E3A5F;padding:20px 32px;">
          <h1 style="margin:0;font-size:20px;color:#fff;font-weight:700;">${heading}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          ${bodyHtml}
          ${ctaHtml}
        </td></tr>
        <tr><td style="padding:16px 32px;background-color:#F5F5F5;font-size:12px;color:#888;text-align:center;">
          KrewPact by MDM Group Inc. | Mississauga, Ontario
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

function buildLeadAssigned(event: LeadAssignedEvent): EmailPayload[] {
  return [
    {
      to: event.assignee_email,
      subject: `New lead assigned to you: ${event.lead_company}`,
      html: notificationHtml(
        'Lead Assigned to You',
        [
          `Hi ${event.assignee_name},`,
          `<strong>${event.assigned_by_name}</strong> assigned the lead <strong>${event.lead_company}</strong> to you.`,
          'Please review and follow up at your earliest convenience.',
        ],
        `${APP_URL}/crm/leads/${event.lead_id}`,
        'View Lead',
      ),
    },
  ];
}

function buildEstimateApproved(event: EstimateApprovedEvent): EmailPayload[] {
  return [
    {
      to: event.owner_email,
      subject: `Estimate ${event.estimate_number} approved`,
      html: notificationHtml(
        'Estimate Approved',
        [
          `Hi ${event.owner_name},`,
          `Estimate <strong>${event.estimate_number}</strong> for <strong>${event.opportunity_name}</strong> has been approved by <strong>${event.approved_by_name}</strong>.`,
          'You can now proceed with the proposal.',
        ],
        `${APP_URL}/estimates/${event.estimate_id}`,
        'View Estimate',
      ),
    },
  ];
}

function buildContractSigned(event: ContractSignedEvent): EmailPayload[] {
  return event.recipients.map((r) => ({
    to: r.email,
    subject: `Contract signed: ${event.project_name}`,
    html: notificationHtml(
      'Contract Signed',
      [
        `Hi ${r.name},`,
        `The contract for <strong>${event.project_name}</strong> with <strong>${event.client_name}</strong> has been signed on ${event.signed_at}.`,
        'The project is now ready for kickoff.',
      ],
      `${APP_URL}/contracts/${event.contract_id}`,
      'View Contract',
    ),
  }));
}

function buildTaskOverdue(event: TaskOverdueEvent): EmailPayload[] {
  return event.recipients.map((r) => ({
    to: r.email,
    subject: `Task overdue: ${event.task_title}`,
    html: notificationHtml(
      'Task Overdue',
      [
        `Hi ${r.name},`,
        `The task <strong>${event.task_title}</strong> on project <strong>${event.project_name}</strong> was due on <strong>${event.due_date}</strong> and is now overdue.`,
        'Please update the task status or adjust the timeline.',
      ],
      `${APP_URL}/projects/tasks/${event.task_id}`,
      'View Task',
    ),
  }));
}

function buildDailyLogSubmitted(event: DailyLogSubmittedEvent): EmailPayload[] {
  return [
    {
      to: event.pm_email,
      subject: `Daily log submitted: ${event.project_name} (${event.log_date})`,
      html: notificationHtml(
        'Daily Log Submitted',
        [
          `Hi ${event.pm_name},`,
          `<strong>${event.supervisor_name}</strong> submitted a daily log for <strong>${event.project_name}</strong> on ${event.log_date}.`,
          'Review the log for any issues or updates.',
        ],
        `${APP_URL}/projects/daily-logs/${event.log_id}`,
        'View Daily Log',
      ),
    },
  ];
}

function buildPortalMessageReceived(event: PortalMessageReceivedEvent): EmailPayload[] {
  const preview =
    event.message_preview.length > 120
      ? event.message_preview.slice(0, 120) + '...'
      : event.message_preview;

  return [
    {
      to: event.recipient_email,
      subject: `New message from ${event.sender_name} (${event.sender_company})`,
      html: notificationHtml(
        'New Portal Message',
        [
          `Hi ${event.recipient_name},`,
          `<strong>${event.sender_name}</strong> from <strong>${event.sender_company}</strong> sent you a message:`,
          `<blockquote style="margin:12px 0;padding:12px 16px;background:#F5F5F5;border-left:4px solid #1E3A5F;border-radius:2px;font-style:italic;color:#555;">${preview}</blockquote>`,
        ],
        `${APP_URL}/portal/messages/${event.thread_id}`,
        'View Message',
      ),
    },
  ];
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function buildNotificationEmails(event: NotificationEvent): EmailPayload[] {
  switch (event.type) {
    case 'lead_assigned':
      return buildLeadAssigned(event);
    case 'estimate_approved':
      return buildEstimateApproved(event);
    case 'contract_signed':
      return buildContractSigned(event);
    case 'task_overdue':
      return buildTaskOverdue(event);
    case 'daily_log_submitted':
      return buildDailyLogSubmitted(event);
    case 'portal_message_received':
      return buildPortalMessageReceived(event);
    default: {
      const _exhaustive: never = event;
      throw new Error(
        `Unknown notification event type: ${(_exhaustive as NotificationEvent).type}`,
      );
    }
  }
}

export async function dispatchNotification(event: NotificationEvent): Promise<void> {
  const emails = buildNotificationEmails(event);

  const results = await Promise.allSettled(
    emails.map((email) => sendEmail({ to: email.to, subject: email.subject, html: email.html })),
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error('Notification email send failed', {
        error: result.reason instanceof Error ? result.reason : undefined,
        reason: String(result.reason),
      });
    } else if (!result.value.success) {
      logger.error('Notification email send error', { errorMessage: result.value.error });
    }
  }
}
