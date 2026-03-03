import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';
import type { GraphEvent } from '@/lib/microsoft/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const mailbox = _req.nextUrl.searchParams.get('mailbox') ?? undefined;

  const token = await getMicrosoftToken(userId);
  const url = buildGraphUrl(`/events/${id}`, mailbox);
  const data = await graphFetch<GraphEvent>(token, url);

  return NextResponse.json(data);
}
