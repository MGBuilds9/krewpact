import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifyCronAuth = vi.fn();
vi.mock('@/lib/api/cron-auth', () => ({
  verifyCronAuth: (...args: unknown[]) => mockVerifyCronAuth(...args),
}));

const mockProcessSequences = vi.fn();
vi.mock('@/lib/crm/sequence-processor', () => ({
  processSequences: (...args: unknown[]) => mockProcessSequences(...args),
}));

const mockSendEmail = vi.fn();
vi.mock('@/lib/email/resend', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockRenderEmailTemplate = vi.fn();
vi.mock('@/lib/email/template-renderer', () => ({
  renderEmailTemplate: (...args: unknown[]) => mockRenderEmailTemplate(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

import { makeRequest, mockSupabaseClient } from '@/__tests__/helpers';
import { GET } from '@/app/api/cron/sequence-processor/route';
import { createServiceClient } from '@/lib/supabase/server';

const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeCronRequest() {
  return makeRequest('/api/cron/sequence-processor', { method: 'POST' });
}

describe('POST /api/cron/sequence-processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyCronAuth.mockResolvedValue({ authorized: true });
  });

  it('returns 401 when cron auth fails', async () => {
    mockVerifyCronAuth.mockResolvedValue({ authorized: false });
    const res = await GET(makeCronRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('processes sequences and returns results', async () => {
    const supabase = mockSupabaseClient({});
    mockCreateServiceClient.mockReturnValue(supabase);

    mockProcessSequences.mockResolvedValue({
      processed: 5,
      completed: 2,
      errors: [],
      deadLettered: 1,
    });

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(5);
    expect(body.completed).toBe(2);
    expect(body.deadLettered).toBe(1);
    expect(body.errors).toBe(0);
  });

  it('passes emailSender and templateResolver to processSequences', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        email_templates: {
          data: {
            id: 'tpl-1',
            name: 'test',
            subject: 'Hello {{first_name}}',
            body_html: '<p>Hi</p>',
            body_text: 'Hi',
            category: 'outreach',
            division_id: null,
            is_active: true,
            variables: [],
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          },
          error: null,
        },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockProcessSequences.mockResolvedValue({
      processed: 0,
      completed: 0,
      errors: [],
      deadLettered: 0,
    });

    await GET(makeCronRequest());

    expect(mockProcessSequences).toHaveBeenCalledTimes(1);
    const [client, options] = mockProcessSequences.mock.calls[0];
    expect(client).toBe(supabase);
    expect(options).toHaveProperty('emailSender');
    expect(options).toHaveProperty('templateResolver');
  });

  it('emailSender delegates to sendEmail', async () => {
    const supabase = mockSupabaseClient({});
    mockCreateServiceClient.mockReturnValue(supabase);

    mockSendEmail.mockResolvedValue({ success: true });

    mockProcessSequences.mockImplementation(
      async (
        _client: unknown,
        options: {
          emailSender: { send: (params: Record<string, string>) => Promise<{ success: boolean }> };
        },
      ) => {
        const result = await options.emailSender.send({
          to: 'test@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
          enrollmentId: 'e-1',
          leadId: 'l-1',
        });
        expect(result.success).toBe(true);
        return { processed: 1, completed: 0, errors: [], deadLettered: 0 };
      },
    );

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Test',
      }),
    );
  });

  it('templateResolver fetches from email_templates table', async () => {
    const templateData = {
      id: 'tpl-1',
      name: 'test-template',
      subject: 'Hello {{first_name}}',
      body_html: '<p>Hi {{first_name}}</p>',
      body_text: 'Hi {{first_name}}',
      category: 'outreach',
      division_id: null,
      is_active: true,
      variables: ['first_name'],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    const supabase = mockSupabaseClient({
      tables: {
        email_templates: { data: templateData, error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockRenderEmailTemplate.mockReturnValue({
      subject: 'Hello John',
      html: '<p>Hi John</p>',
      text: 'Hi John',
    });

    mockProcessSequences.mockImplementation(
      async (
        _client: unknown,
        options: {
          templateResolver: {
            resolve: (
              id: string,
              vars: Record<string, string>,
            ) => Promise<{ subject: string; html: string; text: string } | null>;
          };
        },
      ) => {
        const rendered = await options.templateResolver.resolve('tpl-1', { first_name: 'John' });
        expect(rendered).toBeTruthy();
        expect(rendered!.subject).toBe('Hello John');
        return { processed: 1, completed: 0, errors: [], deadLettered: 0 };
      },
    );

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
  });

  it('templateResolver returns null for missing template', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        email_templates: { data: null, error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    mockProcessSequences.mockImplementation(
      async (
        _client: unknown,
        options: {
          templateResolver: {
            resolve: (id: string, vars: Record<string, string>) => Promise<null>;
          };
        },
      ) => {
        const rendered = await options.templateResolver.resolve('nonexistent', {});
        expect(rendered).toBeNull();
        return { processed: 0, completed: 0, errors: [], deadLettered: 0 };
      },
    );

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
  });

  it('reports error count from processSequences', async () => {
    const supabase = mockSupabaseClient({});
    mockCreateServiceClient.mockReturnValue(supabase);

    mockProcessSequences.mockResolvedValue({
      processed: 3,
      completed: 1,
      errors: ['Failed to send email for enrollment e-1', 'Template not found for step s-2'],
      deadLettered: 1,
    });

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toBe(2);
    expect(body.deadLettered).toBe(1);
  });
});
