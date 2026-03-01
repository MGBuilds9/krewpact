import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string; receiptId: string }> };

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, receiptId } = await context.params;
  const supabase = await createUserClient();

  const { error } = await supabase
    .from('expense_receipts')
    .delete()
    .eq('id', receiptId)
    .eq('expense_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
