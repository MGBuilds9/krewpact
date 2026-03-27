import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';

const notificationPrefsSchema = z.object({
  emailDigest: z.enum(['daily', 'weekly', 'never']),
  crmUpdates: z.boolean(),
  projectUpdates: z.boolean(),
  taskAssignments: z.boolean(),
  systemAlerts: z.boolean(),
  dealWonLost: z.boolean(),
  leadAssignment: z.boolean(),
});

export const POST = withApiRoute(
  { bodySchema: notificationPrefsSchema },
  async ({ body, userId }) => {
    // Preferences are user-scoped via Clerk publicMetadata in future.
    // For now, acknowledge and log — persistence via Supabase user_preferences deferred to P2.
    logger.info('Notification preferences saved', { userId, prefs: body });

    return NextResponse.json({ ok: true });
  },
);
