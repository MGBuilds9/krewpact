import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type EmailStepParams,executeEmailStep } from '@/lib/crm/sequence-email-executor';

describe('executeEmailStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T12:00:00Z'));
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.krewpact.com');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  function makeSupabaseMock() {
    const insertFn = vi.fn().mockImplementation(() => {
      const chain: Record<string, unknown> = {
        select: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'outreach-generated-id' }, error: null }),
        })),
      };
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: [{ id: 'outreach-generated-id' }], error: null });
      return chain;
    });

    const updateFn = vi.fn().mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const methods = ['eq', 'select', 'single', 'match'];
      for (const m of methods) {
        chain[m] = vi.fn().mockImplementation(() => chain);
      }
      chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
      return chain;
    });

    const fromFn = vi.fn().mockImplementation(() => ({
      insert: insertFn,
      update: updateFn,
      select: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    }));

    return { from: fromFn, _insertFn: insertFn, _updateFn: updateFn };
  }

  function makeBaseParams(overrides?: Partial<EmailStepParams>): EmailStepParams {
    const mock = makeSupabaseMock();
    return {
      supabase: mock as unknown as EmailStepParams['supabase'],
      enrollment: {
        id: 'enroll-1',
        sequence_id: 'seq-1',
        lead_id: 'lead-1',
        contact_id: 'contact-1',
        contacts: {
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          full_name: 'John Doe',
        },
        leads: {
          company_name: 'Acme Corp',
        },
      },
      step: {
        id: 'step-1',
        step_number: 1,
        sequence_id: 'seq-1',
      },
      actionConfig: {
        template_id: 'tpl-1',
        subject: 'Follow up',
        body: '<p>Hello!</p>',
      },
      now: '2026-03-19T12:00:00Z',
      options: {},
      ...overrides,
    };
  }

  it('wraps resolved template HTML in branded email wrapper with #1E3A5F navy', async () => {
    const sentHtml: string[] = [];

    const params = makeBaseParams({
      options: {
        emailSender: {
          async send({ html }) {
            sentHtml.push(html);
            return { success: true };
          },
        },
        templateResolver: {
          async resolve(_templateId, _variables) {
            return {
              subject: 'Hello John',
              html: '<p>Hi John, thanks for your interest.</p>',
              text: 'Hi John',
            };
          },
        },
      },
    });

    await executeEmailStep(params);

    expect(sentHtml).toHaveLength(1);
    // The sent HTML should contain the branded wrapper navy color
    expect(sentHtml[0]).toContain('#1E3A5F');
    // Should contain the EMAIL_HEADER structure
    expect(sentHtml[0]).toContain('MDM Group Inc.');
    // Should contain the inner content
    expect(sentHtml[0]).toContain('Hi John, thanks for your interest.');
    // Should be wrapped in full HTML document
    expect(sentHtml[0]).toContain('<!DOCTYPE html>');
    expect(sentHtml[0]).toContain('</html>');
  });

  it('passes outreachEventId to templateResolver for tracking pixel injection', async () => {
    let receivedOutreachId: string | undefined;

    const params = makeBaseParams({
      options: {
        emailSender: {
          async send() {
            return { success: true };
          },
        },
        templateResolver: {
          async resolve(_templateId, _variables, outreachEventId?) {
            receivedOutreachId = outreachEventId;
            return {
              subject: 'Hello John',
              html: '<p>Content here</p>',
            };
          },
        },
      },
    });

    await executeEmailStep(params);

    // The outreach event ID should be passed to the resolver
    expect(receivedOutreachId).toBeDefined();
    expect(receivedOutreachId).toBe('outreach-generated-id');
  });

  it('creates outreach record BEFORE sending email (create-before-send pattern)', async () => {
    const callOrder: string[] = [];

    const insertFn = vi.fn().mockImplementation(() => {
      callOrder.push('outreach_insert');
      const chain: Record<string, unknown> = {
        select: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'outreach-pre-created' },
            error: null,
          }),
        })),
      };
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: [{ id: 'outreach-pre-created' }], error: null });
      return chain;
    });

    const updateFn = vi.fn().mockImplementation(() => {
      callOrder.push('outreach_update');
      const chain: Record<string, unknown> = {};
      const methods = ['eq', 'select', 'single', 'match'];
      for (const m of methods) {
        chain[m] = vi.fn().mockImplementation(() => chain);
      }
      chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
      return chain;
    });

    const fromFn = vi.fn().mockImplementation(() => ({
      insert: insertFn,
      update: updateFn,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }));

    const params = makeBaseParams({
      supabase: { from: fromFn } as unknown as EmailStepParams['supabase'],
      options: {
        emailSender: {
          async send() {
            callOrder.push('email_send');
            return { success: true };
          },
        },
        templateResolver: {
          async resolve() {
            return {
              subject: 'Test',
              html: '<p>Test</p>',
            };
          },
        },
      },
    });

    await executeEmailStep(params);

    // outreach_insert must come before email_send
    const insertIdx = callOrder.indexOf('outreach_insert');
    const sendIdx = callOrder.indexOf('email_send');
    expect(insertIdx).toBeGreaterThanOrEqual(0);
    expect(sendIdx).toBeGreaterThanOrEqual(0);
    expect(insertIdx).toBeLessThan(sendIdx);

    // The last outreach_update (outcome update) must come after email_send
    const lastUpdateIdx = callOrder.lastIndexOf('outreach_update');
    expect(lastUpdateIdx).toBeGreaterThan(sendIdx);
  });

  it('updates outreach outcome to failed when email send fails', async () => {
    const updateCalls: Record<string, unknown>[] = [];

    const insertFn = vi.fn().mockImplementation(() => {
      const chain: Record<string, unknown> = {
        select: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'outreach-fail-test' },
            error: null,
          }),
        })),
      };
      chain.then = (resolve: (v: unknown) => void) =>
        resolve({ data: [{ id: 'outreach-fail-test' }], error: null });
      return chain;
    });

    const updateFn = vi.fn().mockImplementation((data: Record<string, unknown>) => {
      updateCalls.push(data);
      const chain: Record<string, unknown> = {};
      const methods = ['eq', 'select', 'single', 'match'];
      for (const m of methods) {
        chain[m] = vi.fn().mockImplementation(() => chain);
      }
      chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
      return chain;
    });

    const fromFn = vi.fn().mockImplementation(() => ({
      insert: insertFn,
      update: updateFn,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }));

    const params = makeBaseParams({
      supabase: { from: fromFn } as unknown as EmailStepParams['supabase'],
      options: {
        emailSender: {
          async send() {
            return { success: false, error: 'SMTP timeout' };
          },
        },
        templateResolver: {
          async resolve() {
            return {
              subject: 'Test',
              html: '<p>Test</p>',
            };
          },
        },
      },
    });

    await executeEmailStep(params);

    // Two updates: subject/preview update + outcome update
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    // The last update should set outcome to 'failed'
    const outcomeUpdate = updateCalls.find((c) => c.outcome === 'failed');
    expect(outcomeUpdate).toBeDefined();
    expect(outcomeUpdate).toMatchObject({
      outcome: 'failed',
      outcome_detail: 'SMTP timeout',
    });
  });

  it('wraps plain body HTML in branded template when no templateResolver', async () => {
    const sentHtml: string[] = [];

    const params = makeBaseParams({
      options: {
        emailSender: {
          async send({ html }) {
            sentHtml.push(html);
            return { success: true };
          },
        },
        // No templateResolver — uses actionConfig.body directly
      },
    });

    await executeEmailStep(params);

    expect(sentHtml).toHaveLength(1);
    // Even without template resolver, body should be wrapped in branded template
    expect(sentHtml[0]).toContain('#1E3A5F');
    expect(sentHtml[0]).toContain('<!DOCTYPE html>');
    expect(sentHtml[0]).toContain('Hello!');
  });
});
