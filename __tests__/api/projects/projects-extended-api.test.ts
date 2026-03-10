import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';

import {
  GET as getDeps,
  POST as postDep,
  DELETE as deleteDep,
} from '@/app/api/tasks/[id]/dependencies/route';
import { GET as getDiary, POST as postDiary } from '@/app/api/projects/[id]/diary/route';
import {
  GET as _getDiaryEntry,
  PATCH as patchDiaryEntry,
  DELETE as deleteDiaryEntry,
} from '@/app/api/projects/[id]/diary/[entryId]/route';
import {
  GET as getDailyLogs,
  POST as postDailyLog,
} from '@/app/api/projects/[id]/daily-logs/route';
import { PATCH as patchDailyLog } from '@/app/api/projects/[id]/daily-logs/[logId]/route';
import { GET as getComments, POST as postComment } from '@/app/api/tasks/[id]/comments/route';
import { GET as getMeetings, POST as postMeeting } from '@/app/api/projects/[id]/meetings/route';

import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  TEST_IDS,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

const TASK_ID = TEST_IDS.TASK_ID ?? 'task-uuid-001';
const PROJECT_ID = TEST_IDS.PROJECT_ID ?? 'proj-uuid-001';
const ENTRY_ID = 'entry-uuid-001';
const LOG_ID = 'log-uuid-001';

const DEP_UUID_1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const DEP_UUID_2 = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

function taskCtx(id: string = TASK_ID) {
  return { params: Promise.resolve({ id }) };
}

function projectCtx(id = PROJECT_ID) {
  return { params: Promise.resolve({ id }) };
}

function projectEntryCtx(id = PROJECT_ID, entryId = ENTRY_ID) {
  return { params: Promise.resolve({ id, entryId }) };
}

function projectLogCtx(id = PROJECT_ID, logId = LOG_ID) {
  return { params: Promise.resolve({ id, logId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClerkAuth(mockAuth);
});

// ============================================================
// Task Dependencies
// ============================================================

describe('GET /api/tasks/[id]/dependencies', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await getDeps(makeRequest('/api/tasks/x/dependencies'), taskCtx());
    expect(res.status).toBe(401);
  });

  it('returns list of dependencies', async () => {
    const deps = [
      {
        id: DEP_UUID_1,
        task_id: TASK_ID,
        depends_on_task_id: DEP_UUID_2,
        dependency_type: 'finish_to_start',
        created_at: '2026-01-01',
      },
    ];
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { task_dependencies: { data: deps, error: null } } }),
    );
    const res = await getDeps(makeRequest('/api/tasks/x/dependencies'), taskCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(deps);
  });

  it('returns 500 on DB error', async () => {
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { task_dependencies: { data: null, error: { message: 'DB error', code: '500' } } },
      }),
    );
    const res = await getDeps(makeRequest('/api/tasks/x/dependencies'), taskCtx());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/tasks/[id]/dependencies', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await postDep(
      makeJsonRequest('/api/tasks/x/dependencies', { depends_on_task_id: DEP_UUID_2 }),
      taskCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    const res = await postDep(
      makeJsonRequest('/api/tasks/x/dependencies', {}),
      taskCtx(DEP_UUID_1),
    );
    expect(res.status).toBe(400);
  });

  it('creates dependency and returns 201', async () => {
    const created = {
      id: 'new-dep',
      task_id: DEP_UUID_1,
      depends_on_task_id: DEP_UUID_2,
      dependency_type: 'finish_to_start',
      created_at: '2026-01-01',
    };
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { task_dependencies: { data: created, error: null } } }),
    );
    const res = await postDep(
      makeJsonRequest('/api/tasks/x/dependencies', { depends_on_task_id: DEP_UUID_2 }),
      taskCtx(DEP_UUID_1),
    );
    expect(res.status).toBe(201);
  });
});

describe('DELETE /api/tasks/[id]/dependencies', () => {
  it('returns 400 without dependency_id param', async () => {
    const res = await deleteDep(makeRequest('/api/tasks/x/dependencies'), taskCtx());
    expect(res.status).toBe(400);
  });

  it('returns 204 on successful delete', async () => {
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ defaultResponse: { data: null, error: null } }),
    );
    const res = await deleteDep(
      makeRequest(`/api/tasks/x/dependencies?dependency_id=${DEP_UUID_1}`),
      taskCtx(),
    );
    expect(res.status).toBe(204);
  });
});

// ============================================================
// Site Diary
// ============================================================

describe('GET /api/projects/[id]/diary', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await getDiary(makeRequest('/api/projects/x/diary'), projectCtx());
    expect(res.status).toBe(401);
  });

  it('returns paginated diary entries', async () => {
    const entries = [
      {
        id: ENTRY_ID,
        project_id: PROJECT_ID,
        entry_at: '2026-02-26',
        entry_type: 'observation',
        entry_text: 'All good',
        created_by: 'user_1',
        created_at: '2026-02-26',
        updated_at: '2026-02-26',
      },
    ];
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { site_diary_entries: { data: entries, error: null } } }),
    );
    const res = await getDiary(makeRequest('/api/projects/x/diary'), projectCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(entries);
  });

  it('returns 400 for invalid query params', async () => {
    const res = await getDiary(makeRequest('/api/projects/x/diary?limit=-1'), projectCtx());
    expect(res.status).toBe(400);
  });
});

describe('POST /api/projects/[id]/diary', () => {
  it('returns 400 for invalid body', async () => {
    const res = await postDiary(makeJsonRequest('/api/projects/x/diary', {}), projectCtx());
    expect(res.status).toBe(400);
  });

  it('creates diary entry and returns 201', async () => {
    const created = {
      id: ENTRY_ID,
      project_id: PROJECT_ID,
      entry_at: '2026-02-26',
      entry_type: 'observation',
      entry_text: 'Noted.',
      created_by: 'user_1',
      created_at: '2026-02-26',
      updated_at: '2026-02-26',
    };
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { site_diary_entries: { data: created, error: null } } }),
    );
    const res = await postDiary(
      makeJsonRequest('/api/projects/x/diary', {
        entry_at: '2026-02-26',
        entry_type: 'observation',
        entry_text: 'Noted.',
      }),
      projectCtx(),
    );
    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/projects/[id]/diary/[entryId]', () => {
  it('returns 400 for empty text', async () => {
    const res = await patchDiaryEntry(
      makeJsonRequest('/api/projects/x/diary/e', { entry_text: '' }, 'PATCH'),
      projectEntryCtx(),
    );
    expect(res.status).toBe(400);
  });

  it('updates diary entry', async () => {
    const updated = {
      id: ENTRY_ID,
      entry_text: 'Updated',
      entry_type: 'observation',
      entry_at: '2026-02-26',
      project_id: PROJECT_ID,
      created_by: 'u',
      created_at: '2026-02-26',
      updated_at: '2026-02-26',
    };
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { site_diary_entries: { data: updated, error: null } } }),
    );
    const res = await patchDiaryEntry(
      makeJsonRequest('/api/projects/x/diary/e', { entry_text: 'Updated' }, 'PATCH'),
      projectEntryCtx(),
    );
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/projects/[id]/diary/[entryId]', () => {
  it('returns 204 on success', async () => {
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ defaultResponse: { data: null, error: null } }),
    );
    const res = await deleteDiaryEntry(makeRequest('/api/projects/x/diary/e'), projectEntryCtx());
    expect(res.status).toBe(204);
  });
});

// ============================================================
// Daily Logs
// ============================================================

describe('GET /api/projects/[id]/daily-logs', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await getDailyLogs(makeRequest('/api/projects/x/daily-logs'), projectCtx());
    expect(res.status).toBe(401);
  });

  it('returns paginated daily logs', async () => {
    const logs = [
      {
        id: LOG_ID,
        project_id: PROJECT_ID,
        log_date: '2026-02-26',
        crew_count: 5,
        work_summary: 'Framing',
        weather: null,
        delays: null,
        safety_notes: null,
        is_offline_origin: false,
        author_user_id: 'u',
        created_at: '2026-02-26',
        updated_at: '2026-02-26',
      },
    ];
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { project_daily_logs: { data: logs, error: null } } }),
    );
    const res = await getDailyLogs(makeRequest('/api/projects/x/daily-logs'), projectCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(logs);
  });
});

describe('POST /api/projects/[id]/daily-logs', () => {
  it('returns 400 when log_date is missing', async () => {
    const res = await postDailyLog(makeJsonRequest('/api/projects/x/daily-logs', {}), projectCtx());
    expect(res.status).toBe(400);
  });

  it('creates daily log and returns 201', async () => {
    const created = {
      id: LOG_ID,
      project_id: PROJECT_ID,
      log_date: '2026-02-26',
      crew_count: 8,
      work_summary: 'Done',
      weather: null,
      delays: null,
      safety_notes: null,
      is_offline_origin: false,
      author_user_id: 'u',
      created_at: '2026-02-26',
      updated_at: '2026-02-26',
    };
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { project_daily_logs: { data: created, error: null } } }),
    );
    const res = await postDailyLog(
      makeJsonRequest('/api/projects/x/daily-logs', { log_date: '2026-02-26', crew_count: 8 }),
      projectCtx(),
    );
    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/projects/[id]/daily-logs/[logId]', () => {
  it('returns 400 for invalid payload', async () => {
    const res = await patchDailyLog(
      makeJsonRequest('/api/projects/x/daily-logs/l', { crew_count: -5 }, 'PATCH'),
      projectLogCtx(),
    );
    expect(res.status).toBe(400);
  });

  it('updates daily log', async () => {
    const updated = {
      id: LOG_ID,
      project_id: PROJECT_ID,
      log_date: '2026-02-26',
      crew_count: 10,
      work_summary: null,
      weather: null,
      delays: null,
      safety_notes: null,
      is_offline_origin: false,
      author_user_id: 'u',
      created_at: '2026-02-26',
      updated_at: '2026-02-26',
    };
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { project_daily_logs: { data: updated, error: null } } }),
    );
    const res = await patchDailyLog(
      makeJsonRequest('/api/projects/x/daily-logs/l', { crew_count: 10 }, 'PATCH'),
      projectLogCtx(),
    );
    expect(res.status).toBe(200);
  });
});

// ============================================================
// Task Comments
// ============================================================

describe('GET /api/tasks/[id]/comments', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await getComments(makeRequest('/api/tasks/x/comments'), taskCtx());
    expect(res.status).toBe(401);
  });

  it('returns paginated comments', async () => {
    const comments = [
      {
        id: 'c-1',
        task_id: TASK_ID,
        author_user_id: 'u',
        comment_text: 'Done',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ];
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { task_comments: { data: comments, error: null } } }),
    );
    const res = await getComments(makeRequest('/api/tasks/x/comments'), taskCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(comments);
  });
});

describe('POST /api/tasks/[id]/comments', () => {
  it('returns 400 for empty comment_text', async () => {
    const res = await postComment(
      makeJsonRequest('/api/tasks/x/comments', { comment_text: '' }),
      taskCtx(),
    );
    expect(res.status).toBe(400);
  });

  it('creates comment and returns 201', async () => {
    const created = {
      id: 'c-2',
      task_id: TASK_ID,
      author_user_id: 'u',
      comment_text: 'LGTM',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { task_comments: { data: created, error: null } } }),
    );
    const res = await postComment(
      makeJsonRequest('/api/tasks/x/comments', { comment_text: 'LGTM' }),
      taskCtx(),
    );
    expect(res.status).toBe(201);
  });
});

// ============================================================
// Meetings
// ============================================================

describe('GET /api/projects/[id]/meetings', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await getMeetings(makeRequest('/api/projects/x/meetings'), projectCtx());
    expect(res.status).toBe(401);
  });

  it('returns paginated meetings', async () => {
    const meetings = [
      {
        id: ENTRY_ID,
        project_id: PROJECT_ID,
        entry_at: '2026-02-26',
        entry_type: 'meeting',
        entry_text: '{"title":"Kickoff","attendees":["Michael"],"notes":"All good."}',
        created_by: 'u',
        created_at: '2026-02-26',
        updated_at: '2026-02-26',
      },
    ];
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { site_diary_entries: { data: meetings, error: null } } }),
    );
    const res = await getMeetings(makeRequest('/api/projects/x/meetings'), projectCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(meetings);
  });
});

describe('POST /api/projects/[id]/meetings', () => {
  it('returns 400 for missing required fields', async () => {
    const res = await postMeeting(
      makeJsonRequest('/api/projects/x/meetings', { title: 'Meeting' }),
      projectCtx(),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty attendees array', async () => {
    const res = await postMeeting(
      makeJsonRequest('/api/projects/x/meetings', {
        meeting_date: '2026-02-26',
        title: 'Meeting',
        attendees: [],
        notes: 'Notes',
      }),
      projectCtx(),
    );
    expect(res.status).toBe(400);
  });

  it('creates meeting and returns 201', async () => {
    const created = {
      id: ENTRY_ID,
      project_id: PROJECT_ID,
      entry_at: '2026-02-26',
      entry_type: 'meeting',
      entry_text: '{}',
      created_by: 'u',
      created_at: '2026-02-26',
      updated_at: '2026-02-26',
    };
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { site_diary_entries: { data: created, error: null } } }),
    );
    const res = await postMeeting(
      makeJsonRequest('/api/projects/x/meetings', {
        meeting_date: '2026-02-26',
        title: 'Kickoff',
        attendees: ['Michael', 'Ehab'],
        notes: 'Discussed scope.',
      }),
      projectCtx(),
    );
    expect(res.status).toBe(201);
  });
});
