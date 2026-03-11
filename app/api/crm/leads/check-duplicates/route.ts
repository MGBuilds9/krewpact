import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { findLeadDuplicates } from '@/lib/crm/duplicate-detector';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const checkSchema = z.object({
  company_name: z.string().min(1),
  domain: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
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

  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // Fetch existing leads for comparison (limit to 500 for performance)
  const { data: existingLeads, error } = await supabase
    .from('leads')
    .select('id, company_name, domain, city, lead_score, status, division_id, created_at')
    .is('deleted_at', null)
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = findLeadDuplicates(parsed.data, existingLeads ?? []);

  return NextResponse.json(result);
}
