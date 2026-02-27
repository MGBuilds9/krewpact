import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const submittalSchema = z.object({
  project_id: z.string().uuid(),
  submittal_type: z.enum(['shop_drawing', 'product_data', 'sample', 'rfi', 'other']),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  file_ids: z.array(z.string().uuid()).optional(),
});

async function resolveActiveTradePartner(userId: string, supabase: Awaited<ReturnType<typeof createUserClient>>) {
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id, status, actor_type')
    .eq('clerk_user_id', userId)
    .single();
  if (!pa || pa.actor_type !== 'trade_partner' || pa.status !== 'active') return null;
  return pa;
}

/**
 * GET /api/portal/trade/submittals
 * Returns submittals submitted by this trade partner.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createUserClient();
  const pa = await resolveActiveTradePartner(userId, supabase);
  if (!pa) return NextResponse.json({ error: 'Trade partner access only' }, { status: 403 });

  const projectId = req.nextUrl.searchParams.get('project_id');

  let query = supabase
    .from('submittals')
    .select('id, project_id, submittal_type, title, description, status, revision_no, submitted_at, reviewed_at, reviewer_id, metadata, created_at')
    .contains('metadata', { trade_portal_id: pa.id })
    .order('submitted_at', { ascending: false });

  if (projectId) query = (query as any).eq('project_id', projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ submittals: data ?? [] });
}

/**
 * POST /api/portal/trade/submittals
 * Creates a new submittal. Submittal revisions are immutable once submitted.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = submittalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();
  const pa = await resolveActiveTradePartner(userId, supabase);
  if (!pa) return NextResponse.json({ error: 'Trade partner access only' }, { status: 403 });

  // Verify portal has permission on this project
  const { data: perm } = await supabase
    .from('portal_permissions')
    .select('id')
    .eq('portal_account_id', pa.id)
    .eq('project_id', parsed.data.project_id)
    .single();

  if (!perm) return NextResponse.json({ error: 'No access to this project' }, { status: 403 });

  // Create the submittal
  const { data, error } = await supabase
    .from('submittals')
    .insert({
      project_id: parsed.data.project_id,
      submittal_type: parsed.data.submittal_type,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: 'submitted',
      revision_no: 1,
      submitted_at: new Date().toISOString(),
      metadata: {
        trade_portal_id: pa.id,
        file_ids: parsed.data.file_ids ?? [],
        source: 'trade_portal',
      },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
