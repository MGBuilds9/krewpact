import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import {
  UNAUTHORIZED,
  INVALID_JSON,
  validationError,
  dbError,
  errorResponse,
} from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const savedViewUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  sort_by: z.string().optional().nullable(),
  sort_dir: z.enum(['asc', 'desc']).optional().nullable(),
  columns: z.array(z.string()).optional().nullable(),
  is_default: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const rl = await rateLimit(_req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('crm_saved_views')
    .select(
      'id, name, entity_type, filters, sort_by, sort_dir, columns, is_default, created_by, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error) return errorResponse(dbError(error.message));

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(INVALID_JSON);
  }

  const parsed = savedViewUpdateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // If setting as default, unset others first
  if (parsed.data.is_default) {
    // Need to know entity_type to scope the unset
    const { data: existing } = await supabase
      .from('crm_saved_views')
      .select('entity_type')
      .eq('id', id)
      .single();

    if (existing) {
      await supabase
        .from('crm_saved_views')
        .update({ is_default: false })
        .eq('entity_type', existing.entity_type)
        .neq('id', id);
    }
  }

  const { data, error } = await supabase
    .from('crm_saved_views')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) return errorResponse(dbError(error.message));

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const { id } = await params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('crm_saved_views').delete().eq('id', id);

  if (error) return errorResponse(dbError(error.message));

  return NextResponse.json({ success: true });
}
