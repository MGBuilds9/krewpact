import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const bulkSchema = z.object({
  action: z.enum(['tag', 'untag', 'delete']),
  ids: z.array(z.string().uuid()).min(1).max(200),
  params: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { action, ids, params: actionParams } = parsed.data;
  const supabase = await createUserClient();
  const results = { success: 0, failed: 0, errors: [] as string[] };

  switch (action) {
    case 'tag': {
      const tagId = (actionParams?.tag_id as string) ?? null;
      if (!tagId) {
        return NextResponse.json({ error: 'tag_id required' }, { status: 400 });
      }
      for (const id of ids) {
        const { error } = await supabase.from('entity_tags').insert({
          entity_type: 'contact',
          entity_id: id,
          tag_id: tagId,
        });
        if (error) {
          results.failed++;
          results.errors.push(`${id}: ${error.message}`);
        } else {
          results.success++;
        }
      }
      break;
    }
    case 'untag': {
      const tagId = (actionParams?.tag_id as string) ?? null;
      if (!tagId) {
        return NextResponse.json({ error: 'tag_id required' }, { status: 400 });
      }
      for (const id of ids) {
        const { error } = await supabase
          .from('entity_tags')
          .delete()
          .eq('entity_type', 'contact')
          .eq('entity_id', id)
          .eq('tag_id', tagId);
        if (error) {
          results.failed++;
        } else {
          results.success++;
        }
      }
      break;
    }
    case 'delete': {
      const { error } = await supabase.from('contacts').delete().in('id', ids);
      if (error) {
        results.failed = ids.length;
        results.errors.push(error.message);
      } else {
        results.success = ids.length;
      }
      break;
    }
  }

  return NextResponse.json({ data: results });
}
