import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

/**
 * Email click tracking redirect.
 * GET /api/email/track/click/:outreachEventId?url=<encoded_destination>
 * Records the click and redirects to the destination URL.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const rl = await rateLimit(req, { limit: 30, window: '1 m' });
  if (!rl.success) return rateLimitResponse(rl);
  const { id } = await params;
  const destinationUrl = req.nextUrl.searchParams.get('url');

  if (!destinationUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate the URL is a real URL (prevent open redirect)
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(destinationUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 });
  }

  // Fire-and-forget: update clicked_at
  try {
    const supabase = createServiceClient();
    await supabase
      .from('outreach_events')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', id)
      .is('clicked_at', null); // Only set on first click
  } catch {
    // Never block the redirect
  }

  return NextResponse.redirect(parsedUrl.toString(), 302);
}
