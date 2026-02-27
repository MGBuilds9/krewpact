import { describe, it, expect } from 'vitest';
import {
  taskDependencyCreateSchema,
  siteDiaryEntryCreateSchema,
  siteDiaryEntryUpdateSchema,
  taskCommentCreateSchema,
  dailyLogCreateSchema,
  dailyLogUpdateSchema,
  meetingMinutesSchema,
} from '@/lib/validators/projects';

const VALID_UUID_1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_UUID_2 = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

// ============================================================
// taskDependencyCreateSchema
// ============================================================

describe('taskDependencyCreateSchema', () => {
  it('accepts valid dependency with required fields', () => {
    const result = taskDependencyCreateSchema.safeParse({
      task_id: VALID_UUID_1,
      depends_on_task_id: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it('defaults dependency_type to finish_to_start', () => {
    const result = taskDependencyCreateSchema.safeParse({
      task_id: VALID_UUID_1,
      depends_on_task_id: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dependency_type).toBe('finish_to_start');
    }
  });

  it('accepts all valid dependency types', () => {
    const types = ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'] as const;
    for (const dep_type of types) {
      const result = taskDependencyCreateSchema.safeParse({
        task_id: VALID_UUID_1,
        depends_on_task_id: VALID_UUID_2,
        dependency_type: dep_type,
      });
      expect(result.success).toBe(true);
    }
  });

  it('fails when task_id equals depends_on_task_id (self-dependency)', () => {
    const result = taskDependencyCreateSchema.safeParse({
      task_id: VALID_UUID_1,
      depends_on_task_id: VALID_UUID_1,
    });
    expect(result.success).toBe(false);
  });

  it('fails with invalid UUIDs', () => {
    const result = taskDependencyCreateSchema.safeParse({
      task_id: 'not-a-uuid',
      depends_on_task_id: VALID_UUID_2,
    });
    expect(result.success).toBe(false);
  });

  it('fails with invalid dependency_type', () => {
    const result = taskDependencyCreateSchema.safeParse({
      task_id: VALID_UUID_1,
      depends_on_task_id: VALID_UUID_2,
      dependency_type: 'invalid_type',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// siteDiaryEntryCreateSchema
// ============================================================

describe('siteDiaryEntryCreateSchema', () => {
  it('accepts valid entry', () => {
    const result = siteDiaryEntryCreateSchema.safeParse({
      entry_at: '2026-02-26',
      entry_type: 'observation',
      entry_text: 'Concrete pour completed on 3rd floor.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid entry types', () => {
    const types = ['observation', 'visitor', 'delivery', 'weather', 'safety', 'progress', 'other'] as const;
    for (const entry_type of types) {
      const result = siteDiaryEntryCreateSchema.safeParse({
        entry_at: '2026-02-26',
        entry_type,
        entry_text: 'Some text',
      });
      expect(result.success).toBe(true);
    }
  });

  it('fails when entry_at is empty', () => {
    const result = siteDiaryEntryCreateSchema.safeParse({
      entry_at: '',
      entry_type: 'observation',
      entry_text: 'Text',
    });
    expect(result.success).toBe(false);
  });

  it('fails when entry_text is empty', () => {
    const result = siteDiaryEntryCreateSchema.safeParse({
      entry_at: '2026-02-26',
      entry_type: 'observation',
      entry_text: '',
    });
    expect(result.success).toBe(false);
  });

  it('fails when entry_text exceeds 2000 chars', () => {
    const result = siteDiaryEntryCreateSchema.safeParse({
      entry_at: '2026-02-26',
      entry_type: 'observation',
      entry_text: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('fails with invalid entry_type', () => {
    const result = siteDiaryEntryCreateSchema.safeParse({
      entry_at: '2026-02-26',
      entry_type: 'invalid',
      entry_text: 'Text',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// siteDiaryEntryUpdateSchema
// ============================================================

describe('siteDiaryEntryUpdateSchema', () => {
  it('accepts partial update with only entry_text', () => {
    const result = siteDiaryEntryUpdateSchema.safeParse({
      entry_text: 'Updated text',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (no-op patch)', () => {
    const result = siteDiaryEntryUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('fails if entry_text exceeds 2000 chars', () => {
    const result = siteDiaryEntryUpdateSchema.safeParse({
      entry_text: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// taskCommentCreateSchema
// ============================================================

describe('taskCommentCreateSchema', () => {
  it('accepts valid comment', () => {
    const result = taskCommentCreateSchema.safeParse({
      comment_text: 'This looks good.',
    });
    expect(result.success).toBe(true);
  });

  it('fails when comment_text is empty', () => {
    const result = taskCommentCreateSchema.safeParse({ comment_text: '' });
    expect(result.success).toBe(false);
  });

  it('fails when comment_text exceeds 2000 chars', () => {
    const result = taskCommentCreateSchema.safeParse({
      comment_text: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('fails when comment_text is missing', () => {
    const result = taskCommentCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================
// dailyLogCreateSchema
// ============================================================

describe('dailyLogCreateSchema', () => {
  it('accepts valid log with required fields only', () => {
    const result = dailyLogCreateSchema.safeParse({ log_date: '2026-02-26' });
    expect(result.success).toBe(true);
  });

  it('accepts valid log with all fields', () => {
    const result = dailyLogCreateSchema.safeParse({
      log_date: '2026-02-26',
      crew_count: 8,
      work_summary: 'Framing on 2nd floor',
      delays: 'Material delay - 2hrs',
      safety_notes: 'Toolbox talk conducted',
      weather: { condition: 'sunny', temp: 15 },
      is_offline_origin: false,
    });
    expect(result.success).toBe(true);
  });

  it('fails when log_date is empty', () => {
    const result = dailyLogCreateSchema.safeParse({ log_date: '' });
    expect(result.success).toBe(false);
  });

  it('fails when crew_count is negative', () => {
    const result = dailyLogCreateSchema.safeParse({
      log_date: '2026-02-26',
      crew_count: -1,
    });
    expect(result.success).toBe(false);
  });

  it('fails when crew_count is not an integer', () => {
    const result = dailyLogCreateSchema.safeParse({
      log_date: '2026-02-26',
      crew_count: 3.5,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// dailyLogUpdateSchema
// ============================================================

describe('dailyLogUpdateSchema', () => {
  it('accepts empty object (no-op patch)', () => {
    const result = dailyLogUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts null values for nullable fields', () => {
    const result = dailyLogUpdateSchema.safeParse({
      crew_count: null,
      work_summary: null,
      delays: null,
      safety_notes: null,
      weather: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial update', () => {
    const result = dailyLogUpdateSchema.safeParse({ crew_count: 10 });
    expect(result.success).toBe(true);
  });

  it('fails when crew_count is negative', () => {
    const result = dailyLogUpdateSchema.safeParse({ crew_count: -3 });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// meetingMinutesSchema
// ============================================================

describe('meetingMinutesSchema', () => {
  it('accepts valid meeting with required fields', () => {
    const result = meetingMinutesSchema.safeParse({
      meeting_date: '2026-02-26',
      title: 'Site Progress Meeting',
      attendees: ['David G.', 'Mina T.'],
      notes: 'Discussed framing progress.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts full meeting with all fields', () => {
    const result = meetingMinutesSchema.safeParse({
      meeting_date: '2026-02-26',
      title: 'Kickoff',
      attendees: ['Michael', 'Ehab'],
      agenda: 'Review scope and timeline',
      notes: 'All systems go.',
      action_items: [
        { description: 'Order lumber', assignee: 'Atef', due_date: '2026-03-01' },
        { description: 'Book inspection' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('fails when attendees is empty array', () => {
    const result = meetingMinutesSchema.safeParse({
      meeting_date: '2026-02-26',
      title: 'Meeting',
      attendees: [],
      notes: 'Some notes.',
    });
    expect(result.success).toBe(false);
  });

  it('fails when title is empty', () => {
    const result = meetingMinutesSchema.safeParse({
      meeting_date: '2026-02-26',
      title: '',
      attendees: ['Michael'],
      notes: 'Notes.',
    });
    expect(result.success).toBe(false);
  });

  it('fails when notes is missing', () => {
    const result = meetingMinutesSchema.safeParse({
      meeting_date: '2026-02-26',
      title: 'Meeting',
      attendees: ['Michael'],
    });
    expect(result.success).toBe(false);
  });

  it('fails when meeting_date is empty', () => {
    const result = meetingMinutesSchema.safeParse({
      meeting_date: '',
      title: 'Meeting',
      attendees: ['Michael'],
      notes: 'Notes.',
    });
    expect(result.success).toBe(false);
  });

  it('fails when title exceeds 200 chars', () => {
    const result = meetingMinutesSchema.safeParse({
      meeting_date: '2026-02-26',
      title: 'x'.repeat(201),
      attendees: ['Michael'],
      notes: 'Notes.',
    });
    expect(result.success).toBe(false);
  });

  it('fails when action_item description is empty', () => {
    const result = meetingMinutesSchema.safeParse({
      meeting_date: '2026-02-26',
      title: 'Meeting',
      attendees: ['Michael'],
      notes: 'Notes.',
      action_items: [{ description: '' }],
    });
    expect(result.success).toBe(false);
  });
});
