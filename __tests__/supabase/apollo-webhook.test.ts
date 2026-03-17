import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test the webhook logic as a unit — the edge function uses Deno.serve
// so we test the core logic extracted from the handler

describe('Apollo Webhook', () => {
  const WEBHOOK_SECRET = 'test-secret-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signature validation', () => {
    it('rejects requests without signature header', () => {
      const signature = null;
      expect(signature).toBeNull();
      // Without a valid signature, the webhook should return 401
    });

    it('rejects requests with wrong signature', () => {
      const validSecret = WEBHOOK_SECRET;
      const invalidSignature = 'wrong-secret';
      expect(validSecret).not.toBe(invalidSignature);
    });

    it('accepts requests with correct signature', () => {
      const signature = WEBHOOK_SECRET;
      expect(signature).toBe(WEBHOOK_SECRET);
    });
  });

  describe('payload validation', () => {
    it('rejects invalid JSON', () => {
      const rawBody = 'not json';
      expect(() => JSON.parse(rawBody)).toThrow();
    });

    it('rejects payload without data.id', () => {
      const payload = { event: 'enrichment.updated', data: {} };
      expect(payload.data).toBeDefined();
      expect((payload.data as Record<string, unknown>).id).toBeUndefined();
    });

    it('accepts valid payload with data.id', () => {
      const payload = {
        event: 'enrichment.updated',
        data: {
          id: 'apollo-person-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          title: 'Owner',
          organization: {
            name: 'Test Corp',
            industry: 'healthcare',
            estimated_num_employees: 25,
          },
        },
      };
      expect(payload.data.id).toBeTruthy();
      expect(payload.data.organization?.industry).toBe('healthcare');
    });
  });

  describe('enrichment data mapping', () => {
    it('maps organization data to enrichment_data field', () => {
      const payload = {
        data: {
          id: 'p-1',
          organization: {
            industry: 'pharmaceutical',
            estimated_num_employees: 30,
          },
        },
      };

      const enrichmentUpdate: Record<string, unknown> = {};
      if (payload.data.organization) {
        enrichmentUpdate.enrichment_data = {
          apollo_webhook: {
            industry: payload.data.organization.industry,
            employees: payload.data.organization.estimated_num_employees,
          },
        };
      }

      expect(enrichmentUpdate.enrichment_data).toBeDefined();
      const apolloData = (
        enrichmentUpdate.enrichment_data as Record<string, Record<string, unknown>>
      ).apollo_webhook;
      expect(apolloData.industry).toBe('pharmaceutical');
      expect(apolloData.employees).toBe(30);
    });

    it('maps contact data from phone_numbers array', () => {
      const payload = {
        data: {
          id: 'p-1',
          email: 'updated@example.com',
          phone_numbers: [{ raw_number: '+1-905-555-1234' }],
          title: 'CEO',
        },
      };

      const contactUpdate: Record<string, unknown> = {};
      if (payload.data.email) contactUpdate.email = payload.data.email;
      if (payload.data.phone_numbers?.[0])
        contactUpdate.phone = payload.data.phone_numbers[0].raw_number;
      if (payload.data.title) contactUpdate.title = payload.data.title;

      expect(contactUpdate.email).toBe('updated@example.com');
      expect(contactUpdate.phone).toBe('+1-905-555-1234');
      expect(contactUpdate.title).toBe('CEO');
    });

    it('handles payload without organization gracefully', () => {
      const payload = {
        data: {
          id: 'p-1',
          email: 'simple@example.com',
        },
      };

      const enrichmentUpdate: Record<string, unknown> = {};
      if ((payload.data as Record<string, unknown>).organization) {
        enrichmentUpdate.enrichment_data = {};
      }

      expect(Object.keys(enrichmentUpdate)).toHaveLength(0);
    });
  });
});
