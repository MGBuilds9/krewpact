import { beforeEach, describe, expect, it, vi } from 'vitest';

import { matchSequenceToLead } from '@/lib/crm/industry-sequence-matcher';

/**
 * Build a mock Supabase client that tracks sequential calls to .from('sequences')
 * and returns different results per call.
 */
function buildMockSupabase(responses: Array<{ data: unknown; error: unknown }>) {
  let callIndex = 0;

  function createChain(): Record<string, unknown> {
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => {
        const resp = responses[callIndex] ?? {
          data: null,
          error: { message: 'No more responses' },
        };
        callIndex++;
        return Promise.resolve(resp);
      }),
      maybeSingle: vi.fn().mockImplementation(() => {
        const resp = responses[callIndex] ?? { data: null, error: null };
        callIndex++;
        return Promise.resolve(resp);
      }),
    };
    // Make each method return the chain for chaining
    for (const key of Object.keys(chain)) {
      if (key !== 'single' && key !== 'maybeSingle') {
        (chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
      }
    }
    return chain;
  }

  return {
    from: vi.fn().mockImplementation(() => createChain()),
  };
}

describe('matchSequenceToLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns industry-specific sequence when lead has matching industry', async () => {
    const industrySeq = { id: 'seq-medical' };
    const supabase = buildMockSupabase([
      { data: industrySeq, error: null }, // industry-specific match
    ]);

    const result = await matchSequenceToLead(supabase as never, 'Medical');
    expect(result).toEqual({ id: 'seq-medical' });
  });

  it('falls back to generic sequence when no industry match', async () => {
    const genericSeq = { id: 'seq-generic' };
    const supabase = buildMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'not found' } }, // no industry match
      { data: genericSeq, error: null }, // generic fallback
    ]);

    const result = await matchSequenceToLead(supabase as never, 'Aerospace');
    expect(result).toEqual({ id: 'seq-generic' });
  });

  it('returns null when no sequences are active', async () => {
    const supabase = buildMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'not found' } },
      { data: null, error: { code: 'PGRST116', message: 'not found' } },
    ]);

    const result = await matchSequenceToLead(supabase as never, 'Retail');
    expect(result).toBeNull();
  });

  it('prefers industry-specific over generic when both exist', async () => {
    const industrySeq = { id: 'seq-franchise' };
    // Only one call should be made — industry match succeeds
    const supabase = buildMockSupabase([{ data: industrySeq, error: null }]);

    const result = await matchSequenceToLead(supabase as never, 'Franchise');
    expect(result).toEqual({ id: 'seq-franchise' });
    // Should NOT query for generic since industry-specific was found
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('returns generic when lead has no industry set', async () => {
    const genericSeq = { id: 'seq-generic' };
    // When industry is null, should go straight to generic
    const supabase = buildMockSupabase([{ data: genericSeq, error: null }]);

    const result = await matchSequenceToLead(supabase as never, null);
    expect(result).toEqual({ id: 'seq-generic' });
  });

  it('returns null when lead has no industry and no generic sequence exists', async () => {
    const supabase = buildMockSupabase([
      { data: null, error: { code: 'PGRST116', message: 'not found' } },
    ]);

    const result = await matchSequenceToLead(supabase as never, null);
    expect(result).toBeNull();
  });
});
