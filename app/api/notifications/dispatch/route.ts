import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import type { NotificationEvent } from '@/lib/notifications/dispatcher';

/**
 * POST /api/notifications/dispatch
 *
 * Internal endpoint to trigger notification emails.
 * Called by other API routes after mutations.
 *
 * Body: { event_type, ...context }
 * The body must match one of the NotificationEvent shapes.
 */
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

  if (!body || typeof body !== 'object' || !('type' in body)) {
    return NextResponse.json({ error: 'Missing required field: type' }, { status: 400 });
  }

  try {
    await dispatchNotification(body as NotificationEvent);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logger.error('Notification dispatch failed:', { error: err });
    const message = err instanceof Error ? err.message : 'Dispatch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
