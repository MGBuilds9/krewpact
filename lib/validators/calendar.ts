import { z } from 'zod';

export const calendarQuerySchema = z.object({
  mailbox: z.string().email().optional(),
  startDateTime: z.string().optional(),
  endDateTime: z.string().optional(),
  top: z.coerce.number().int().positive().max(50).optional().default(25),
});

export const createEventSchema = z.object({
  subject: z.string().min(1).max(500),
  body: z.string().optional(),
  bodyType: z.enum(['Text', 'HTML']).optional().default('Text'),
  startDateTime: z.string(),
  endDateTime: z.string(),
  timeZone: z.string().optional().default('America/Toronto'),
  location: z.string().optional(),
  mailbox: z.string().email().optional(),
});
