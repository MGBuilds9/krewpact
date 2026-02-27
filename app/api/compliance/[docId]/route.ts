import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { complianceDocUpdateSchema } from '@/lib/validators/procurement';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { docId } = await params;
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('trade_partner_compliance_docs')
    .select('*')
    .eq('id', docId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { docId } = await params;
  const body = await req.json();
  const parsed = complianceDocUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.status === 'valid') {
    updateData.verified_by = userId;
    updateData.verified_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('trade_partner_compliance_docs')
    .update(updateData)
    .eq('id', docId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
