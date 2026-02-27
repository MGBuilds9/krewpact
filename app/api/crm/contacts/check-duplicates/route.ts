import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { findContactDuplicates } from '@/lib/crm/duplicate-detector';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const checkSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();

  const { data: existingContacts, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, account_id, lead_id, is_primary, created_at')
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = findContactDuplicates(parsed.data, existingContacts ?? []);

  return NextResponse.json(result);
}
