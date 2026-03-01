import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';
import type { GraphMessage } from '@/lib/microsoft/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const mailbox = req.nextUrl.searchParams.get('mailbox') || undefined;

  const token = await getMicrosoftToken(userId);
  const url = buildGraphUrl(`/messages/${id}`, mailbox);

  const message = await graphFetch<GraphMessage>(token, url);

  return NextResponse.json(message);
}
