import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    public_metadata?: Record<string, unknown>;
  };
};

type ServiceClient = ReturnType<typeof createServiceClient>;

async function verifyWebhook(
  req: Request,
  secret: string,
): Promise<ClerkWebhookEvent | NextResponse> {
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text();
  try {
    const wh = new Webhook(secret);
    return wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }
}

async function handleUserUpsert(
  supabase: ServiceClient,
  data: ClerkWebhookEvent['data'],
  type: string,
): Promise<NextResponse | null> {
  const email = data.email_addresses?.[0]?.email_address || '';
  const { error } = await supabase.rpc('ensure_clerk_user', {
    p_clerk_id: data.id,
    p_email: email,
    p_first_name: data.first_name || '',
    p_last_name: data.last_name || '',
    p_avatar_url: data.image_url || null,
  });

  if (error) {
    logger.error(`Clerk webhook ${type} failed:`, { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (type === 'user.created') {
    const portalAccountId = data.public_metadata?.krewpact_user_id as string | undefined;
    if (portalAccountId) {
      const { error: portalError } = await supabase
        .from('portal_accounts')
        .update({ clerk_user_id: data.id })
        .eq('id', portalAccountId)
        .is('clerk_user_id', null);
      if (portalError) {
        logger.error('Failed to link clerk_user_id to portal_account:', {
          error: portalError.message,
        });
      }
    }
  }

  return null;
}

async function handleUserDeleted(
  supabase: ServiceClient,
  data: ClerkWebhookEvent['data'],
): Promise<NextResponse | null> {
  const { error } = await supabase
    .from('users')
    .update({ status: 'archived' })
    .eq('clerk_user_id', data.id);

  if (error) {
    logger.error('Clerk webhook user.deleted failed:', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return null;
}

export const POST = withApiRoute({ auth: 'public', rateLimit: false }, async ({ req }) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'CLERK_WEBHOOK_SECRET not configured' }, { status: 500 });
  }

  const eventOrResponse = await verifyWebhook(req, WEBHOOK_SECRET);
  if (eventOrResponse instanceof NextResponse) return eventOrResponse;

  const event = eventOrResponse;
  const supabase = createServiceClient();
  const { type, data } = event;

  if (type === 'user.created' || type === 'user.updated') {
    const errResponse = await handleUserUpsert(supabase, data, type);
    if (errResponse) return errResponse;
  }

  if (type === 'user.deleted') {
    const errResponse = await handleUserDeleted(supabase, data);
    if (errResponse) return errResponse;
  }

  return NextResponse.json({ received: true });
});
