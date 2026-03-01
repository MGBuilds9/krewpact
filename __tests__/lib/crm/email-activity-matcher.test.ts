import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchEmailToEntities } from '@/lib/crm/email-activity-matcher';
import { mockSupabaseClient } from '@/__tests__/helpers';

describe('matchEmailToEntities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty results when no matches found', async () => {
    const client = mockSupabaseClient({
      defaultResponse: { data: [], error: null },
    });

    const result = await matchEmailToEntities(client, 'nobody@example.com');

    expect(result.leads).toEqual([]);
    expect(result.contacts).toEqual([]);
    expect(result.accounts).toEqual([]);
  });

  it('matches leads by email', async () => {
    const client = mockSupabaseClient({
      tables: {
        leads: {
          data: [{ id: 'lead-1', lead_name: 'Test Lead' }],
          error: null,
        },
        contacts: { data: [], error: null },
      },
    });

    const result = await matchEmailToEntities(client, 'test@example.com');

    expect(result.leads).toEqual([{ id: 'lead-1', lead_name: 'Test Lead' }]);
    expect(result.contacts).toEqual([]);
    expect(result.accounts).toEqual([]);
  });

  it('matches contacts by email', async () => {
    const client = mockSupabaseClient({
      tables: {
        leads: { data: [], error: null },
        contacts: {
          data: [
            { id: 'contact-1', first_name: 'Jane', last_name: 'Doe', account_id: null },
          ],
          error: null,
        },
      },
    });

    const result = await matchEmailToEntities(client, 'jane@example.com');

    expect(result.contacts).toEqual([
      { id: 'contact-1', first_name: 'Jane', last_name: 'Doe' },
    ]);
    expect(result.accounts).toEqual([]);
  });

  it('includes accounts linked to matched contacts', async () => {
    const client = mockSupabaseClient({
      tables: {
        leads: { data: [], error: null },
        contacts: {
          data: [
            { id: 'contact-1', first_name: 'Jane', last_name: 'Doe', account_id: 'acct-1' },
          ],
          error: null,
        },
        accounts: {
          data: [{ id: 'acct-1', account_name: 'Acme Corp' }],
          error: null,
        },
      },
    });

    const result = await matchEmailToEntities(client, 'jane@acme.com');

    expect(result.contacts).toHaveLength(1);
    expect(result.accounts).toEqual([{ id: 'acct-1', account_name: 'Acme Corp' }]);
  });

  it('normalizes email address to lowercase', async () => {
    const client = mockSupabaseClient({
      tables: {
        leads: {
          data: [{ id: 'lead-1', lead_name: 'Test Lead' }],
          error: null,
        },
        contacts: { data: [], error: null },
      },
    });

    const result = await matchEmailToEntities(client, '  Test@EXAMPLE.com  ');

    expect(result.leads).toHaveLength(1);
    expect(client.from).toHaveBeenCalledWith('leads');
  });

  it('handles multiple leads and contacts matching', async () => {
    const client = mockSupabaseClient({
      tables: {
        leads: {
          data: [
            { id: 'lead-1', lead_name: 'Lead A' },
            { id: 'lead-2', lead_name: 'Lead B' },
          ],
          error: null,
        },
        contacts: {
          data: [
            { id: 'contact-1', first_name: 'Jane', last_name: 'Doe', account_id: null },
          ],
          error: null,
        },
      },
    });

    const result = await matchEmailToEntities(client, 'shared@example.com');

    expect(result.leads).toHaveLength(2);
    expect(result.contacts).toHaveLength(1);
  });
});
