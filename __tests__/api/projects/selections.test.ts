/**
 * Tests for /api/projects/[id]/selections (GET + POST),
 * /api/projects/[id]/selections/[sheetId] (GET + PATCH),
 * /api/projects/[id]/selections/[sheetId]/choices (GET + POST),
 * /api/projects/[id]/selections/[sheetId]/options (GET + POST).
 * Tables: selection_sheets, selection_choices, selection_options
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET as GET_SHEETS, POST as POST_SHEET } from '@/app/api/projects/[id]/selections/route';
import {
  GET as GET_SHEET_DETAIL,
  PATCH as PATCH_SHEET,
} from '@/app/api/projects/[id]/selections/[sheetId]/route';
import {
  GET as GET_CHOICES,
  POST as POST_CHOICE,
} from '@/app/api/projects/[id]/selections/[sheetId]/choices/route';
import {
  GET as GET_OPTIONS,
  POST as POST_OPTION,
} from '@/app/api/projects/[id]/selections/[sheetId]/options/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  TEST_IDS,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const SHEET_ID = '00000000-0000-4000-a000-000000000601';
const OPTION_ID = '00000000-0000-4000-a000-000000000602';

function projectCtx() {
  return { params: Promise.resolve({ id: TEST_IDS.PROJECT_ID }) };
}

function sheetCtx() {
  return { params: Promise.resolve({ id: TEST_IDS.PROJECT_ID, sheetId: SHEET_ID }) };
}

const sampleSheet = {
  id: SHEET_ID,
  project_id: TEST_IDS.PROJECT_ID,
  sheet_name: 'Kitchen Selections',
  status: 'draft',
  issued_at: null,
  locked_at: null,
  created_by: TEST_IDS.USER_ID,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const sampleChoice = {
  id: '00000000-0000-4000-a000-000000000603',
  selection_sheet_id: SHEET_ID,
  selection_option_id: OPTION_ID,
  chosen_by_user_id: TEST_IDS.USER_ID,
  chosen_at: '2026-01-15T00:00:00Z',
  quantity: 1,
  notes: null,
};

const sampleOption = {
  id: OPTION_ID,
  selection_sheet_id: SHEET_ID,
  option_group: 'Countertops',
  option_name: 'Quartz Standard',
  allowance_amount: 5000,
  upgrade_amount: 0,
  sort_order: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

/* --- LIST SHEETS --- */
describe('GET /api/projects/[id]/selections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_SHEETS(makeRequest('/api/projects/x/selections'), projectCtx());
    expect(res.status).toBe(401);
  });

  it('returns selection sheets list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_sheets: { data: [sampleSheet], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_SHEETS(makeRequest('/api/projects/x/selections'), projectCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].sheet_name).toBe('Kitchen Selections');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_sheets: { data: null, error: { message: 'err' }, count: null } },
      }),
      error: null,
    });
    const res = await GET_SHEETS(makeRequest('/api/projects/x/selections'), projectCtx());
    expect(res.status).toBe(500);
  });
});

/* --- CREATE SHEET --- */
describe('POST /api/projects/[id]/selections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_SHEET(makeJsonRequest('/api/projects/x/selections', {}), projectCtx());
    expect(res.status).toBe(401);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_sheets: { data: sampleSheet, error: null } },
      }),
      error: null,
    });
    const res = await POST_SHEET(
      makeJsonRequest('/api/projects/x/selections', {
        sheet_name: 'Kitchen Selections',
      }),
      projectCtx(),
    );
    expect(res.status).toBe(201);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_sheets: { data: null, error: { message: 'insert err' } } },
      }),
      error: null,
    });
    const res = await POST_SHEET(
      makeJsonRequest('/api/projects/x/selections', {
        sheet_name: 'Kitchen Selections',
      }),
      projectCtx(),
    );
    expect(res.status).toBe(500);
  });
});

/* --- SHEET DETAIL GET --- */
describe('GET /api/projects/[id]/selections/[sheetId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_SHEET_DETAIL(makeRequest('/api/projects/x/selections/y'), sheetCtx());
    expect(res.status).toBe(401);
  });

  it('returns sheet detail on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_sheets: { data: sampleSheet, error: null } },
      }),
      error: null,
    });
    const res = await GET_SHEET_DETAIL(makeRequest('/api/projects/x/selections/y'), sheetCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sheet_name).toBe('Kitchen Selections');
  });

  it('returns 404 on not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_sheets: { data: null, error: { message: 'not found' } } },
      }),
      error: null,
    });
    const res = await GET_SHEET_DETAIL(makeRequest('/api/projects/x/selections/y'), sheetCtx());
    expect(res.status).toBe(404);
  });
});

/* --- SHEET DETAIL PATCH --- */
describe('PATCH /api/projects/[id]/selections/[sheetId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH_SHEET(
      makeJsonRequest('/api/projects/x/selections/y', { sheet_name: 'Updated' }, 'PATCH'),
      sheetCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns updated sheet on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          selection_sheets: { data: { ...sampleSheet, sheet_name: 'Updated' }, error: null },
        },
      }),
      error: null,
    });
    const res = await PATCH_SHEET(
      makeJsonRequest('/api/projects/x/selections/y', { sheet_name: 'Updated' }, 'PATCH'),
      sheetCtx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sheet_name).toBe('Updated');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_sheets: { data: null, error: { message: 'err' } } },
      }),
      error: null,
    });
    const res = await PATCH_SHEET(
      makeJsonRequest('/api/projects/x/selections/y', { sheet_name: 'Updated' }, 'PATCH'),
      sheetCtx(),
    );
    expect(res.status).toBe(500);
  });
});

/* --- CHOICES GET --- */
describe('GET /api/projects/[id]/selections/[sheetId]/choices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_CHOICES(makeRequest('/api/projects/x/selections/y/choices'), sheetCtx());
    expect(res.status).toBe(401);
  });

  it('returns choices list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_choices: { data: [sampleChoice], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_CHOICES(makeRequest('/api/projects/x/selections/y/choices'), sheetCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].quantity).toBe(1);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_choices: { data: null, error: { message: 'err' }, count: null } },
      }),
      error: null,
    });
    const res = await GET_CHOICES(makeRequest('/api/projects/x/selections/y/choices'), sheetCtx());
    expect(res.status).toBe(500);
  });
});

/* --- CHOICES POST --- */
describe('POST /api/projects/[id]/selections/[sheetId]/choices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_CHOICE(
      makeJsonRequest('/api/projects/x/selections/y/choices', {}),
      sheetCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns 201 on valid choice creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_choices: { data: sampleChoice, error: null } },
      }),
      error: null,
    });
    const res = await POST_CHOICE(
      makeJsonRequest('/api/projects/x/selections/y/choices', {
        selection_option_id: OPTION_ID,
        quantity: 1,
      }),
      sheetCtx(),
    );
    expect(res.status).toBe(201);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_choices: { data: null, error: { message: 'upsert err' } } },
      }),
      error: null,
    });
    const res = await POST_CHOICE(
      makeJsonRequest('/api/projects/x/selections/y/choices', {
        selection_option_id: OPTION_ID,
        quantity: 1,
      }),
      sheetCtx(),
    );
    expect(res.status).toBe(500);
  });
});

/* --- OPTIONS GET --- */
describe('GET /api/projects/[id]/selections/[sheetId]/options', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_OPTIONS(makeRequest('/api/projects/x/selections/y/options'), sheetCtx());
    expect(res.status).toBe(401);
  });

  it('returns options list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_options: { data: [sampleOption], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_OPTIONS(makeRequest('/api/projects/x/selections/y/options'), sheetCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].option_name).toBe('Quartz Standard');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_options: { data: null, error: { message: 'err' }, count: null } },
      }),
      error: null,
    });
    const res = await GET_OPTIONS(makeRequest('/api/projects/x/selections/y/options'), sheetCtx());
    expect(res.status).toBe(500);
  });
});

/* --- OPTIONS POST --- */
describe('POST /api/projects/[id]/selections/[sheetId]/options', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_OPTION(
      makeJsonRequest('/api/projects/x/selections/y/options', {}),
      sheetCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns 201 on valid option creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_options: { data: sampleOption, error: null } },
      }),
      error: null,
    });
    const res = await POST_OPTION(
      makeJsonRequest('/api/projects/x/selections/y/options', {
        option_group: 'Countertops',
        option_name: 'Quartz Standard',
        allowance_amount: 5000,
        upgrade_amount: 0,
        sort_order: 1,
      }),
      sheetCtx(),
    );
    expect(res.status).toBe(201);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { selection_options: { data: null, error: { message: 'insert err' } } },
      }),
      error: null,
    });
    const res = await POST_OPTION(
      makeJsonRequest('/api/projects/x/selections/y/options', {
        option_group: 'Countertops',
        option_name: 'Quartz Standard',
        allowance_amount: 5000,
        upgrade_amount: 0,
        sort_order: 1,
      }),
      sheetCtx(),
    );
    expect(res.status).toBe(500);
  });
});
