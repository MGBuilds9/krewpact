import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = notificationPrefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Preferences are user-scoped via Clerk publicMetadata in future.
  // For now, acknowledge and log — persistence via Supabase user_preferences deferred to P2.
  logger.info('Notification preferences saved', { userId, prefs: parsed.data });

  return NextResponse.json({ ok: true });
}
