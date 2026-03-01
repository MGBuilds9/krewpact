import { vi } from 'vitest';

type MockResponse = { data: unknown; error: unknown };

interface MockSupabaseConfig {
  /** Default response for queries. Override per-table with `tables` */
  defaultResponse?: MockResponse;
  /** Per-table response overrides */
  tables?: Record<string, MockResponse>;
}

/**
 * Creates a chainable mock Supabase client with configurable responses per table.
 *
 * Supports chains:
 *   .from(table).select().eq().order().limit()
 *   .from(table).select().eq().single()
 *   .from(table).insert().select().single()
 *   .from(table).update().eq().select().single()
 *   .from(table).delete().eq()
 *   .from(table).select().ilike().eq().order().limit()
 *   .from(table).select().in_().eq().order()
 *
 * Each chain resolves to the configured {data, error} for the given table.
 */
export function mockSupabaseClient(config: MockSupabaseConfig = {}) {
  const defaultResp: MockResponse = config.defaultResponse ?? {
    data: [],
    error: null,
  };

  function getResponse(table?: string): MockResponse {
    if (table && config.tables?.[table]) {
      return config.tables[table];
    }
    return defaultResp;
  }

  let currentTable: string | undefined;

  function createChain(table?: string): Record<string, unknown> {
    const resp = () => getResponse(table ?? currentTable);

    const chain: Record<string, unknown> = {
      select: vi.fn().mockImplementation(() => createChain(table)),
      insert: vi.fn().mockImplementation(() => createChain(table)),
      update: vi.fn().mockImplementation(() => createChain(table)),
      upsert: vi.fn().mockImplementation(() => createChain(table)),
      delete: vi.fn().mockImplementation(() => createChain(table)),
      eq: vi.fn().mockImplementation(() => createChain(table)),
      neq: vi.fn().mockImplementation(() => createChain(table)),
      gt: vi.fn().mockImplementation(() => createChain(table)),
      gte: vi.fn().mockImplementation(() => createChain(table)),
      lt: vi.fn().mockImplementation(() => createChain(table)),
      lte: vi.fn().mockImplementation(() => createChain(table)),
      in: vi.fn().mockImplementation(() => createChain(table)),
      ilike: vi.fn().mockImplementation(() => createChain(table)),
      is: vi.fn().mockImplementation(() => createChain(table)),
      or: vi.fn().mockImplementation(() => createChain(table)),
      not: vi.fn().mockImplementation(() => createChain(table)),
      contains: vi.fn().mockImplementation(() => createChain(table)),
      containedBy: vi.fn().mockImplementation(() => createChain(table)),
      filter: vi.fn().mockImplementation(() => createChain(table)),
      match: vi.fn().mockImplementation(() => createChain(table)),
      order: vi.fn().mockImplementation(() => createChain(table)),
      limit: vi.fn().mockImplementation(() => createChain(table)),
      range: vi.fn().mockImplementation(() => createChain(table)),
      single: vi.fn().mockImplementation(() => Promise.resolve(resp())),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(resp())),
      then: (resolve: (v: MockResponse) => void) => resolve(resp()),
    };

    return chain;
  }

  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      currentTable = table;
      return createChain(table);
    }),
    rpc: vi.fn().mockImplementation(() => Promise.resolve(defaultResp)),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
  };

  return client as unknown as ReturnType<
    typeof import('@supabase/supabase-js').createClient
  >;
}
