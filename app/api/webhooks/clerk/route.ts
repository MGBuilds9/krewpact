import { Webhook } from 'svix';
import { logger } from '@/lib/logger';
import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

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

export async function POST(req: Request) {
  const rl = await rateLimit(req, { limit: 100, window: '1 m', identifier: 'webhook:clerk' });
  if (!rl.success) return rateLimitResponse(rl);

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'CLERK_WEBHOOK_SECRET not configured' }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text();

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { type, data } = event;

  if (type === 'user.created' || type === 'user.updated') {
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

    // If the user was created via a portal invite, link their Clerk ID to the portal_accounts row
    if (type === 'user.created') {
      const portalAccountId = data.public_metadata?.krewpact_user_id as string | undefined;
      if (portalAccountId) {
        const { error: portalError } = await supabase
          .from('portal_accounts')
          .update({ clerk_user_id: data.id })
          .eq('id', portalAccountId)
          .is('clerk_user_id', null); // Only update if not already linked

        if (portalError) {
          // Non-fatal — log and continue. The account can be linked manually later.
          logger.error('Failed to link clerk_user_id to portal_account:', { error: portalError.message });
        }
      }
    }
  }

  if (type === 'user.deleted') {
    const { error } = await supabase
      .from('users')
      .update({ status: 'archived' })
      .eq('clerk_user_id', data.id);

    if (error) {
      logger.error('Clerk webhook user.deleted failed:', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
