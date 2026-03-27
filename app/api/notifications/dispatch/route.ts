import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withApiRoute } from '@/lib/api/with-api-route';
import type { NotificationEvent } from '@/lib/notifications/dispatcher';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

// Require `type` — the dispatcher validates the full shape internally
const dispatchBodySchema = z.object({ type: z.string() }).passthrough();

/**
 * POST /api/notifications/dispatch
 *
 * Internal endpoint to trigger notification emails.
 * Called by other API routes after mutations.
 *
 * Body: { type, ...context }
 * The body must match one of the NotificationEvent shapes.
 */
export const POST = withApiRoute({ bodySchema: dispatchBodySchema }, async ({ body, logger }) => {
  try {
    await dispatchNotification(body as unknown as NotificationEvent);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logger.error('Notification dispatch failed:', { error: err });
    const message = err instanceof Error ? err.message : 'Dispatch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
