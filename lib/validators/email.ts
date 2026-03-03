import { z } from 'zod';

export const emailQuerySchema = z.object({
  mailbox: z.string().email().optional(),
  top: z.coerce.number().int().positive().max(50).optional().default(25),
  skip: z.coerce.number().int().min(0).optional().default(0),
  search: z.string().optional(),
  folder: z.enum(['inbox', 'sentitems', 'drafts']).optional().default('inbox'),
});

export type EmailQuery = z.infer<typeof emailQuerySchema>;

export const sendEmailSchema = z.object({
  to: z
    .array(
      z.object({
        name: z.string().optional(),
        address: z.string().email(),
      }),
    )
    .min(1),
  cc: z
    .array(
      z.object({
        name: z.string().optional(),
        address: z.string().email(),
      }),
    )
    .optional(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  bodyType: z.enum(['Text', 'HTML']).optional().default('HTML'),
  leadId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  mailbox: z.string().email().optional(),
});

export type SendEmail = z.infer<typeof sendEmailSchema>;
