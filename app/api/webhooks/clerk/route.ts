import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { syncRolesToBothStores } from '@/lib/rbac/sync-roles';
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

const INTERNAL_DOMAINS = (
  process.env.ALLOWED_DOMAINS || ''
).split(',');

const DEFAULT_INTERNAL_ROLE = 'project_coordinator';

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
  const { data: userRow, error } = await supabase.rpc('ensure_clerk_user', {
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

  const user = Array.isArray(userRow) ? userRow[0] : userRow;

  // Portal account linking (existing logic)
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

  // Assign default role + write publicMetadata for new users without roles
  if (user?.id) {
    await assignDefaultRoleIfNeeded(supabase, user.id, data.id, email);
  }

  return null;
}

async function assignDefaultRoleIfNeeded(
  supabase: ServiceClient,
  supabaseUserId: string,
  clerkUserId: string,
  email: string,
): Promise<void> {
  // Check if user already has roles in the DB
  const { data: existingRoles } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', supabaseUserId)
    .limit(1);

  if (existingRoles && existingRoles.length > 0) {
    // User has DB roles — ensure Clerk metadata is in sync
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('roles(role_key)')
      .eq('user_id', supabaseUserId);

    const roleKeys = (roleRows ?? [])
      .map((r) => (r.roles as unknown as { role_key: string })?.role_key)
      .filter(Boolean);

    if (roleKeys.length > 0) {
      await syncRolesToBothStores({
        supabaseUserId,
        clerkUserId,
        roleKeys,
      });
    }
    return;
  }

  // No roles — assign default if internal domain
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || !INTERNAL_DOMAINS.includes(domain)) {
    // External user — just write krewpact_user_id to Clerk so getKrewpactUserId() works
    await syncRolesToBothStores({
      supabaseUserId,
      clerkUserId,
      roleKeys: [],
    });
    return;
  }

  logger.info('Assigning default role to new internal user', {
    supabaseUserId,
    clerkUserId,
    email: email.split('@')[0] + '@***',
    defaultRole: DEFAULT_INTERNAL_ROLE,
  });

  await syncRolesToBothStores({
    supabaseUserId,
    clerkUserId,
    roleKeys: [DEFAULT_INTERNAL_ROLE],
  });
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
