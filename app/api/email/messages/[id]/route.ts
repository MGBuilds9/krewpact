import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import {
  buildGraphUrl,
  getMicrosoftToken,
  graphErrorResponse,
  graphFetch,
} from '@/lib/microsoft/graph';
import type { GraphMessage } from '@/lib/microsoft/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const mailbox = req.nextUrl.searchParams.get('mailbox') || undefined;

  try {
    const token = await getMicrosoftToken(userId);
    const url = buildGraphUrl(`/messages/${id}`, mailbox);

    const message = await graphFetch<GraphMessage>(token, url);

    return NextResponse.json(message);
  } catch (error) {
    const response = graphErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
