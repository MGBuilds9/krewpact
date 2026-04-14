import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { queue } from '@/lib/queue/client';
import { JobType } from '@/lib/queue/types';
import { createUserClientSafe } from '@/lib/supabase/server';
import { contactUpdateSchema } from '@/lib/validators/crm';

const CONTACT_SELECT =
  'id, first_name, last_name, full_name, email, phone, mobile, title, role, linkedin_url, is_primary, is_decision_maker, lead_id, preferred_channel, email_opted_in, phone_opted_in, last_contacted_at, total_touches, created_at, updated_at';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('contacts')
    .select(CONTACT_SELECT)
    .eq('id', id)
    .single();

  if (error) throw error.code === 'PGRST116' ? notFound('Contact') : dbError(error.message);

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: contactUpdateSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('contacts')
      .update(body as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error.code === 'PGRST116' ? notFound('Contact') : dbError(error.message);

    queue
      .enqueue(JobType.ERPSyncContact, {
        entityId: data.id,
        userId,
        meta: { operation: 'update' },
      })
      .catch((err) => {
        logger.error('Failed to enqueue ERPNext contact update sync', {
          contactId: data.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params, userId }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw dbError(error.message);

  queue
    .enqueue(JobType.ERPSyncContact, {
      entityId: id,
      userId,
      meta: { operation: 'delete' },
    })
    .catch((err) => {
      logger.error('Failed to enqueue ERPNext contact delete sync', {
        contactId: id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  return NextResponse.json({ success: true });
});
