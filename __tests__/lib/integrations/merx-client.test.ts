import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchMerxTenders,
  generateDedupHash,
  type MerxTender,
  toBiddingOpportunity,
} from '@/lib/integrations/merx-client';

const mockTender: MerxTender = {
  tender_number: 'ON-2026-00123',
  title: 'City of Toronto — Road Rehabilitation Phase 4',
  description: 'Annual road rehabilitation works including milling and repaving.',
  organization: 'City of Toronto',
  closing_date: '2026-04-15',
  location: 'Toronto, ON',
  category: 'construction',
  source_url: 'https://www.merx.com/tenders/ON-2026-00123',
  estimated_value: 2500000,
};

describe('generateDedupHash', () => {
  it('returns a string prefixed with merx:', () => {
    const hash = generateDedupHash('ON-2026-00123', '2026-04-15');
    expect(hash).toMatch(/^merx:/);
  });

  it('produces the same hash for the same inputs', () => {
    const a = generateDedupHash('ON-2026-00123', '2026-04-15');
    const b = generateDedupHash('ON-2026-00123', '2026-04-15');
    expect(a).toBe(b);
  });

  it('produces different hashes for different tender numbers', () => {
    const a = generateDedupHash('ON-2026-00123', '2026-04-15');
    const b = generateDedupHash('ON-2026-00999', '2026-04-15');
    expect(a).not.toBe(b);
  });

  it('handles null closing date without throwing', () => {
    const hash = generateDedupHash('ON-2026-00123', null);
    expect(hash).toMatch(/^merx:/);
  });

  it('produces different hashes when only closing date differs', () => {
    const a = generateDedupHash('ON-2026-00123', '2026-04-15');
    const b = generateDedupHash('ON-2026-00123', '2026-05-01');
    expect(a).not.toBe(b);
  });
});

describe('toBiddingOpportunity', () => {
  it('maps all tender fields to the expected schema shape', () => {
    const opp = toBiddingOpportunity(mockTender, 'org-abc');
    expect(opp).toMatchObject({
      org_id: 'org-abc',
      title: mockTender.title,
      description: mockTender.description,
      source: 'merx',
      source_reference: mockTender.tender_number,
      owner_organization: mockTender.organization,
      closing_date: mockTender.closing_date,
      location: mockTender.location,
      category: mockTender.category,
      source_url: mockTender.source_url,
      estimated_value: mockTender.estimated_value,
      status: 'new',
    });
  });

  it('sets status to "new" for all imported tenders', () => {
    const opp = toBiddingOpportunity(mockTender, 'org-abc');
    expect(opp.status).toBe('new');
  });

  it('includes a dedup_hash that matches generateDedupHash output', () => {
    const opp = toBiddingOpportunity(mockTender, 'org-abc');
    const expected = generateDedupHash(mockTender.tender_number, mockTender.closing_date);
    expect(opp.dedup_hash).toBe(expected);
  });

  it('propagates null fields from the tender without error', () => {
    const spareTender: MerxTender = {
      ...mockTender,
      description: null,
      organization: null,
      estimated_value: null,
    };
    const opp = toBiddingOpportunity(spareTender, 'org-xyz');
    expect(opp.description).toBeNull();
    expect(opp.owner_organization).toBeNull();
    expect(opp.estimated_value).toBeNull();
  });
});

describe('fetchMerxTenders', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns an empty array when MERX_API_URL is not set', async () => {
    vi.stubEnv('MERX_API_URL', '');
    vi.stubEnv('MERX_API_KEY', 'some-key');
    const result = await fetchMerxTenders();
    expect(result).toEqual([]);
  });

  it('returns an empty array when MERX_API_KEY is not set', async () => {
    vi.stubEnv('MERX_API_URL', 'https://api.merx.com');
    vi.stubEnv('MERX_API_KEY', '');
    const result = await fetchMerxTenders();
    expect(result).toEqual([]);
  });

  it('returns an empty array when neither env var is set', async () => {
    vi.stubEnv('MERX_API_URL', '');
    vi.stubEnv('MERX_API_KEY', '');
    const result = await fetchMerxTenders();
    expect(result).toEqual([]);
  });
});
