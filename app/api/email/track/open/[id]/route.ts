import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

/**
 * Email open tracking pixel.
 * GET /api/email/track/open/:outreachEventId
 * Returns a 1x1 transparent GIF and updates outreach_events.opened_at.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  // Fire-and-forget: update opened_at (don't block the pixel response)
  try {
    const supabase = createServiceClient();
    await supabase
      .from('outreach_events')
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
}
