import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { findLeadDuplicates } from '@/lib/crm/duplicate-detector';
import { createUserClientSafe } from '@/lib/supabase/server';

const checkSchema = z.object({
  company_name: z.string().min(1),
  domain: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
});

export const POST = withApiRoute({ bodySchema: checkSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: existingLeads, error } = await supabase
    .from('leads')
    .select('id, company_name, domain, city, lead_score, status, division_id, created_at')
    .is('deleted_at', null)
    .limit(500);

  if (error) throw dbError(error.message);

  const result = findLeadDuplicates(body as z.infer<typeof checkSchema>, existingLeads ?? []);

  return NextResponse.json(result);
});
