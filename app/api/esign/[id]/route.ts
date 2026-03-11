import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { esignEnvelopeUpdateSchema } from '@/lib/validators/contracting';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('esign_envelopes')
    .select(
      'id, contract_id, provider, provider_envelope_id, status, signer_count, payload, webhook_last_event_at, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === 'PGRST116' ? 404 : 500 },
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = esignEnvelopeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const { data, error } = await supabase
    .from('esign_envelopes')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === 'PGRST116' ? 404 : 500 },
    );
  }

  return NextResponse.json(data);
}
