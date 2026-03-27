import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { createServiceClient } from '@/lib/supabase/server';

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

/**
 * Email open tracking pixel.
 * GET /api/email/track/open/:outreachEventId
 * Returns a 1x1 transparent GIF and updates outreach.opened_at.
 */
export const GET = withApiRoute(
  { auth: 'public', rateLimit: { limit: 30, window: '1 m' } },
  async ({ params }) => {
    const { id } = params;

    // Fire-and-forget: update opened_at (don't block the pixel response)
    try {
      const supabase = createServiceClient();
      await supabase
        .from('outreach')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', id)
        .is('opened_at', null); // Only set on first open
    } catch {
      // Never fail the pixel response
    }

    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': String(TRACKING_PIXEL.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  },
);
