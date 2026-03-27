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

import type { EmailPayload } from './email-templates';
import {
  buildContractSigned,
  buildDailyLogSubmitted,
  buildEstimateApproved,
  buildLeadAssigned,
  buildPortalMessageReceived,
  buildSequenceTaskCreated,
  buildTaskOverdue,
} from './email-templates';

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

interface SequenceTaskCreatedEvent {
  type: 'sequence_task_created';
  assignee_email: string;
  assignee_name: string;
  task_title: string;
  lead_company: string;
  lead_id: string;
}

export type NotificationEvent =
  | LeadAssignedEvent
  | EstimateApprovedEvent
  | ContractSignedEvent
  | TaskOverdueEvent
  | DailyLogSubmittedEvent
  | PortalMessageReceivedEvent
  | SequenceTaskCreatedEvent;

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
    case 'sequence_task_created':
      return buildSequenceTaskCreated(event);
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
