/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/ai/providers/gemini', () => ({
  generateWithGemini: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { createServiceClient } from '@/lib/supabase/server';
import { generateWithGemini } from '@/lib/ai/providers/gemini';
import { draftEmail } from '@/lib/ai/agents/email-drafter';

const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockGenerateWithGemini = vi.mocked(generateWithGemini);

const ORG_ID = '00000000-0000-4000-a000-000000000001';
const USER_ID = 'user_test_drafter';

function mockChain(data: unknown, error: unknown = null) {
  const chain: any = {};
  const methods = ['select', 'eq', 'not', 'is', 'ilike', 'order', 'limit'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockImplementation(() => Promise.resolve({ data, error }));
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

describe('draftEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateWithGemini.mockResolvedValue(
      'SUBJECT: Follow Up on Your Project\nBODY:\nHi there,\n\nJust checking in on next steps.\n\nBest,\nMDM Group',
    );
  });

  it('generates draft for lead with correct subject/body format', async () => {
    const leadChain = mockChain({
      id: 'lead-1',
      company_name: 'Test Co',
      contact_name: 'Jane Doe',
      contact_email: 'jane@testco.com',
      industry: 'Construction',
      city: 'Mississauga',
      province: 'ON',
      status: 'qualified',
      enrichment_data: null,
    });
    const activitiesChain = mockChain([
      { title: 'Initial call', activity_type: 'call', completed_at: '2026-03-01T10:00:00Z' },
    ]);

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leads') return leadChain;
      if (table === 'activities') return activitiesChain;
      return mockChain(null);
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any);

    const result = await draftEmail({
      entityType: 'lead',
      entityId: 'lead-1',
      orgId: ORG_ID,
      userId: USER_ID,
      draftType: 'follow_up',
    });

    expect(result.subject).toBe('Follow Up on Your Project');
    expect(result.body).toContain('Just checking in');
    expect(result.to).toEqual(['jane@testco.com']);
  });

  it('generates draft for opportunity and fetches account contacts', async () => {
    const oppChain = mockChain({
      id: 'opp-1',
      name: 'Office Reno',
      stage: 'proposal',
      value: 75000,
      expected_close_date: '2026-04-30',
      account_id: 'acct-1',
      lead_id: null,
    });
    const contactsChain = mockChain([{ email: 'buyer@corp.com', first_name: 'Bob', last_name: 'Smith' }]);
    const activitiesChain = mockChain([]);

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'opportunities') return oppChain;
      if (table === 'contacts') return contactsChain;
      if (table === 'activities') return activitiesChain;
      return mockChain(null);
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any);

    const result = await draftEmail({
      entityType: 'opportunity',
      entityId: 'opp-1',
      orgId: ORG_ID,
      userId: USER_ID,
      draftType: 'proposal',
    });

    expect(result.to).toEqual(['buyer@corp.com']);
    expect(mockFrom).toHaveBeenCalledWith('contacts');
  });

  it('generates draft for account entity', async () => {
    const accountChain = mockChain({
      id: 'acct-2',
      name: 'BigBuild Corp',
      industry: 'Real Estate',
      city: 'Toronto',
      province: 'ON',
      website: 'https://bigbuild.com',
    });
    const contactsChain = mockChain([{ email: 'ceo@bigbuild.com', first_name: 'Alice', last_name: 'Brown' }]);

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'accounts') return accountChain;
      if (table === 'contacts') return contactsChain;
      return mockChain(null);
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any);

    const result = await draftEmail({
      entityType: 'account',
      entityId: 'acct-2',
      orgId: ORG_ID,
      userId: USER_ID,
      draftType: 'introduction',
    });

    expect(result.to).toEqual(['ceo@bigbuild.com']);
    expect(mockFrom).toHaveBeenCalledWith('accounts');
    expect(mockFrom).toHaveBeenCalledWith('contacts');
  });

  it('throws when entity not found', async () => {
    const emptyChain = mockChain(null);
    const mockFrom = vi.fn().mockReturnValue(emptyChain);
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any);

    await expect(
      draftEmail({
        entityType: 'lead',
        entityId: 'nonexistent-lead',
        orgId: ORG_ID,
        userId: USER_ID,
        draftType: 'follow_up',
      }),
    ).rejects.toThrow('lead/nonexistent-lead not found');
  });

  it('uses custom instructions for custom draft type', async () => {
    const leadChain = mockChain({
      id: 'lead-3',
      company_name: 'Custom Co',
      contact_name: 'Dave',
      contact_email: 'dave@custom.com',
      industry: 'Telecom',
      city: 'Brampton',
      province: 'ON',
      status: 'new',
      enrichment_data: null,
    });
    const activitiesChain = mockChain([]);
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leads') return leadChain;
      if (table === 'activities') return activitiesChain;
      return mockChain(null);
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any);

    await draftEmail({
      entityType: 'lead',
      entityId: 'lead-3',
      orgId: ORG_ID,
      userId: USER_ID,
      draftType: 'custom',
      customInstructions: 'Write in French, very formal tone.',
    });

    const callArg = mockGenerateWithGemini.mock.calls[0][0];
    expect(callArg.prompt).toContain('Write in French, very formal tone.');
  });

  it('returns recipient email from entity context', async () => {
    const leadChain = mockChain({
      id: 'lead-4',
      company_name: 'Email Co',
      contact_name: 'Sam',
      contact_email: 'sam@emailco.com',
      industry: 'Construction',
      city: 'Oakville',
      province: 'ON',
      status: 'new',
      enrichment_data: null,
    });
    const activitiesChain = mockChain([]);
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leads') return leadChain;
      if (table === 'activities') return activitiesChain;
      return mockChain(null);
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any);

    const result = await draftEmail({
      entityType: 'lead',
      entityId: 'lead-4',
      orgId: ORG_ID,
      userId: USER_ID,
      draftType: 'follow_up',
    });

    expect(result.to).toEqual(['sam@emailco.com']);
  });

  it('falls back to default subject when parsing fails', async () => {
    // Gemini returns malformed response (no SUBJECT: line)
    mockGenerateWithGemini.mockResolvedValue('Just a plain response with no expected format.');

    const leadChain = mockChain({
      id: 'lead-5',
      company_name: 'Fallback Co',
      contact_name: 'Pat',
      contact_email: 'pat@fallback.com',
      industry: 'Homes',
      city: 'Burlington',
      province: 'ON',
      status: 'qualified',
      enrichment_data: null,
    });
    const activitiesChain = mockChain([]);
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'leads') return leadChain;
      if (table === 'activities') return activitiesChain;
      return mockChain(null);
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any);

    const result = await draftEmail({
      entityType: 'lead',
      entityId: 'lead-5',
      orgId: ORG_ID,
      userId: USER_ID,
      draftType: 'follow_up',
    });

    expect(result.subject).toBe('Follow Up — MDM Group');
    expect(result.body).toBe('Just a plain response with no expected format.');
  });
});
