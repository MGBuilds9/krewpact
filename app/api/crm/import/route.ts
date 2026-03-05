import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const importRowSchema = z.object({
  company_name: z.string().min(1),
  stage: z.string().optional(),
  source_channel: z.string().optional(),
  estimated_value: z.number().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const importSchema = z.object({
  entity_type: z.enum(['lead', 'contact']),
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(1000),
  column_mapping: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { entity_type, rows, column_mapping } = parsed.data;
  const supabase = await createUserClient();
  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    // Apply column mapping
    const mapped: Record<string, unknown> = {};
    if (column_mapping) {
      for (const [csvCol, dbCol] of Object.entries(column_mapping)) {
        mapped[dbCol] = raw[csvCol];
      }
    } else {
      Object.assign(mapped, raw);
    }

    if (entity_type === 'lead') {
      const validated = importRowSchema.safeParse(mapped);
      if (!validated.success) {
        results.skipped++;
        results.errors.push(
          `Row ${i + 1}: ${validated.error.issues[0]?.message ?? 'Invalid data'}`,
        );
        continue;
      }

      const { error } = await supabase.from('leads').insert({
        ...validated.data,
        status: 'new',
      });

      if (error) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      } else {
        results.imported++;
      }
    } else {
      // Contact import
      const { error } = await supabase.from('contacts').insert(mapped);
      if (error) {
        results.skipped++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      } else {
        results.imported++;
      }
    }
  }

  return NextResponse.json({ data: results });
}
