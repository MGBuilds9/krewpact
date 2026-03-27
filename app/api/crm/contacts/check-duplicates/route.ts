import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { findContactDuplicates } from '@/lib/crm/duplicate-detector';
import { createUserClientSafe } from '@/lib/supabase/server';

const checkSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const POST = withApiRoute({ bodySchema: checkSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: existingContacts, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, account_id, lead_id, is_primary, created_at')
    .limit(500);

  if (error) throw dbError(error.message);

  const result = findContactDuplicates(body as z.infer<typeof checkSchema>, existingContacts ?? []);

  return NextResponse.json(result);
});
