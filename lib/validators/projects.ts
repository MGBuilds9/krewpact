import { z } from 'zod';

// ============================================================
// Task dependency schemas
// ============================================================

const dependencyTypes = ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'] as const;

export const taskDependencyCreateSchema = z.object({
  task_id: z.string().uuid(),
  depends_on_task_id: z.string().uuid(),
  dependency_type: z.enum(dependencyTypes).default('finish_to_start'),
}).refine(
  (data) => data.task_id !== data.depends_on_task_id,
  { message: 'A task cannot depend on itself' },
);

// ============================================================
// Site diary schemas
// ============================================================

const diaryEntryTypes = ['observation', 'visitor', 'delivery', 'weather', 'safety', 'progress', 'other'] as const;

export const siteDiaryEntryCreateSchema = z.object({
  entry_at: z.string().min(1),
  entry_type: z.enum(diaryEntryTypes),
  entry_text: z.string().min(1).max(2000),
});

export const siteDiaryEntryUpdateSchema = z.object({
  entry_at: z.string().optional(),
  entry_type: z.enum(diaryEntryTypes).optional(),
  entry_text: z.string().min(1).max(2000).optional(),
});

// ============================================================
// Task comment schemas
// ============================================================

export const taskCommentCreateSchema = z.object({
  comment_text: z.string().min(1).max(2000),
});

// ============================================================
// Daily log schemas
// ============================================================

export const dailyLogCreateSchema = z.object({
  log_date: z.string().min(1),
  weather: z.record(z.string(), z.unknown()).optional(),
  crew_count: z.number().int().min(0).optional(),
  work_summary: z.string().optional(),
  delays: z.string().optional(),
  safety_notes: z.string().optional(),
  is_offline_origin: z.boolean().optional(),
});

export const dailyLogUpdateSchema = z.object({
  weather: z.record(z.string(), z.unknown()).optional().nullable(),
  crew_count: z.number().int().min(0).optional().nullable(),
  work_summary: z.string().optional().nullable(),
  delays: z.string().optional().nullable(),
  safety_notes: z.string().optional().nullable(),
});

// ============================================================
// Meeting minutes schemas
// ============================================================

export const meetingMinutesSchema = z.object({
  meeting_date: z.string().min(1),
  title: z.string().min(1).max(200),
  attendees: z.array(z.string()).min(1),
  agenda: z.string().optional(),
  notes: z.string().min(1),
  action_items: z.array(z.object({
    description: z.string().min(1),
    assignee: z.string().optional(),
    due_date: z.string().optional(),
  })).optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type TaskDependencyCreate = z.infer<typeof taskDependencyCreateSchema>;
export type SiteDiaryEntryCreate = z.infer<typeof siteDiaryEntryCreateSchema>;
export type SiteDiaryEntryUpdate = z.infer<typeof siteDiaryEntryUpdateSchema>;
export type TaskCommentCreate = z.infer<typeof taskCommentCreateSchema>;
export type DailyLogCreate = z.infer<typeof dailyLogCreateSchema>;
export type DailyLogUpdate = z.infer<typeof dailyLogUpdateSchema>;
export type MeetingMinutes = z.infer<typeof meetingMinutesSchema>;
