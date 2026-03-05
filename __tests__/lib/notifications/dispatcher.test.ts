import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildNotificationEmails, dispatchNotification } from '@/lib/notifications/dispatcher';
import type { NotificationEvent } from '@/lib/notifications/dispatcher';

// Mock sendEmail
vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock-id', success: true }),
}));

import { sendEmail } from '@/lib/email/resend';
const mockSendEmail = vi.mocked(sendEmail);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// buildNotificationEmails — unit tests per event type
// ---------------------------------------------------------------------------

describe('buildNotificationEmails', () => {
  it('lead_assigned: returns 1 email to assignee with correct subject', () => {
    const event: NotificationEvent = {
      type: 'lead_assigned',
      assignee_email: 'alice@mdm.ca',
      assignee_name: 'Alice',
      lead_company: 'Acme Corp',
      lead_id: 'lead-1',
      assigned_by_name: 'Bob',
    };

    const emails = buildNotificationEmails(event);
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe('alice@mdm.ca');
    expect(emails[0].subject).toContain('Acme Corp');
    expect(emails[0].html).toContain('Alice');
    expect(emails[0].html).toContain('Bob');
    expect(emails[0].html).toContain('lead-1');
  });

  it('estimate_approved: returns 1 email to owner', () => {
    const event: NotificationEvent = {
      type: 'estimate_approved',
      owner_email: 'pm@mdm.ca',
      owner_name: 'Charlie',
      estimate_number: 'EST-001',
      estimate_id: 'est-1',
      opportunity_name: 'Big Project',
      approved_by_name: 'Diana',
    };

    const emails = buildNotificationEmails(event);
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe('pm@mdm.ca');
    expect(emails[0].subject).toContain('EST-001');
    expect(emails[0].subject).toContain('approved');
    expect(emails[0].html).toContain('Diana');
    expect(emails[0].html).toContain('Big Project');
  });

  it('contract_signed: returns 1 email per recipient', () => {
    const event: NotificationEvent = {
      type: 'contract_signed',
      recipients: [
        { email: 'pm@mdm.ca', name: 'PM' },
        { email: 'acct@mdm.ca', name: 'Accountant' },
      ],
      contract_id: 'c-1',
      project_name: 'Tower Build',
      client_name: 'Client Co',
      signed_at: '2026-03-05',
    };

    const emails = buildNotificationEmails(event);
    expect(emails).toHaveLength(2);
    expect(emails[0].to).toBe('pm@mdm.ca');
    expect(emails[1].to).toBe('acct@mdm.ca');
    expect(emails[0].subject).toContain('Tower Build');
    expect(emails[0].html).toContain('Client Co');
  });

  it('task_overdue: returns emails for all recipients', () => {
    const event: NotificationEvent = {
      type: 'task_overdue',
      recipients: [
        { email: 'assignee@mdm.ca', name: 'Assignee' },
        { email: 'pm@mdm.ca', name: 'PM' },
      ],
      task_id: 't-1',
      task_title: 'Pour Foundation',
      project_name: 'Site A',
      due_date: '2026-03-01',
    };

    const emails = buildNotificationEmails(event);
    expect(emails).toHaveLength(2);
    expect(emails[0].subject).toContain('Pour Foundation');
    expect(emails[0].html).toContain('2026-03-01');
    expect(emails[1].html).toContain('PM');
  });

  it('daily_log_submitted: returns 1 email to PM', () => {
    const event: NotificationEvent = {
      type: 'daily_log_submitted',
      pm_email: 'pm@mdm.ca',
      pm_name: 'Paul',
      supervisor_name: 'Steve',
      project_name: 'Condo Build',
      log_date: '2026-03-04',
      log_id: 'log-1',
    };

    const emails = buildNotificationEmails(event);
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe('pm@mdm.ca');
    expect(emails[0].subject).toContain('Condo Build');
    expect(emails[0].subject).toContain('2026-03-04');
    expect(emails[0].html).toContain('Steve');
  });

  it('portal_message_received: returns 1 email to recipient', () => {
    const event: NotificationEvent = {
      type: 'portal_message_received',
      recipient_email: 'internal@mdm.ca',
      recipient_name: 'Mike',
      sender_name: 'Client Jane',
      sender_company: 'Jane Corp',
      message_preview: 'We need to discuss the change order for the west wing...',
      thread_id: 'thread-1',
    };

    const emails = buildNotificationEmails(event);
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe('internal@mdm.ca');
    expect(emails[0].subject).toContain('Client Jane');
    expect(emails[0].subject).toContain('Jane Corp');
    expect(emails[0].html).toContain('change order');
  });

  it('portal_message_received: truncates long preview to 120 chars', () => {
    const longMessage = 'A'.repeat(200);
    const event: NotificationEvent = {
      type: 'portal_message_received',
      recipient_email: 'internal@mdm.ca',
      recipient_name: 'Mike',
      sender_name: 'Jane',
      sender_company: 'Corp',
      message_preview: longMessage,
      thread_id: 'thread-2',
    };

    const emails = buildNotificationEmails(event);
    // The html should contain the truncated version (120 chars + ...)
    expect(emails[0].html).toContain('...');
    expect(emails[0].html).not.toContain(longMessage);
  });

  it('throws on unknown event type', () => {
    const badEvent = { type: 'unknown_type' } as unknown as NotificationEvent;
    expect(() => buildNotificationEmails(badEvent)).toThrow('Unknown notification event type');
  });
});

// ---------------------------------------------------------------------------
// dispatchNotification — integration with sendEmail mock
// ---------------------------------------------------------------------------

describe('dispatchNotification', () => {
  it('calls sendEmail for each built email', async () => {
    await dispatchNotification({
      type: 'contract_signed',
      recipients: [
        { email: 'a@mdm.ca', name: 'A' },
        { email: 'b@mdm.ca', name: 'B' },
      ],
      contract_id: 'c-1',
      project_name: 'Proj',
      client_name: 'Client',
      signed_at: '2026-03-05',
    });

    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@mdm.ca' }),
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'b@mdm.ca' }),
    );
  });

  it('calls sendEmail with correct subject for lead_assigned', async () => {
    await dispatchNotification({
      type: 'lead_assigned',
      assignee_email: 'test@mdm.ca',
      assignee_name: 'Test',
      lead_company: 'TestCo',
      lead_id: 'l-1',
      assigned_by_name: 'Admin',
    });

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@mdm.ca',
        subject: expect.stringContaining('TestCo'),
      }),
    );
  });

  it('does not throw when sendEmail fails', async () => {
    mockSendEmail.mockResolvedValueOnce({ id: '', success: false, error: 'API down' });

    await expect(
      dispatchNotification({
        type: 'daily_log_submitted',
        pm_email: 'pm@mdm.ca',
        pm_name: 'PM',
        supervisor_name: 'Super',
        project_name: 'P',
        log_date: '2026-03-05',
        log_id: 'log-1',
      }),
    ).resolves.toBeUndefined();
  });

  it('does not throw when sendEmail rejects', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      dispatchNotification({
        type: 'lead_assigned',
        assignee_email: 'x@mdm.ca',
        assignee_name: 'X',
        lead_company: 'XCo',
        lead_id: 'l-2',
        assigned_by_name: 'Y',
      }),
    ).resolves.toBeUndefined();
  });

  it('sends correct HTML content for estimate_approved', async () => {
    await dispatchNotification({
      type: 'estimate_approved',
      owner_email: 'owner@mdm.ca',
      owner_name: 'Owner',
      estimate_number: 'EST-100',
      estimate_id: 'e-100',
      opportunity_name: 'Big Deal',
      approved_by_name: 'Boss',
    });

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('EST-100'),
      }),
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Big Deal'),
      }),
    );
  });
});
