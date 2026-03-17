import { z } from 'zod';

import { safeString } from '@/lib/sanitize';

export const entityTypes = ['lead', 'contact', 'account', 'opportunity'] as const;

export const tagCreateSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  division_id: z.string().uuid().optional(),
});
export type TagCreate = z.infer<typeof tagCreateSchema>;

export const tagUpdateSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});
export type TagUpdate = z.infer<typeof tagUpdateSchema>;

export const entityTagSchema = z.object({
  entity_type: z.enum(entityTypes),
  entity_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});
export type EntityTag = z.infer<typeof entityTagSchema>;

export const noteCreateSchema = z.object({
  entity_type: z.enum(entityTypes),
  entity_id: z.string().uuid(),
  content: safeString().pipe(z.string().min(1).max(10000)),
  is_pinned: z.boolean().optional(),
});
export type NoteCreate = z.infer<typeof noteCreateSchema>;

export const noteUpdateSchema = z.object({
  content: safeString().pipe(z.string().min(1).max(10000)).optional(),
  is_pinned: z.boolean().optional(),
});
export type NoteUpdate = z.infer<typeof noteUpdateSchema>;
