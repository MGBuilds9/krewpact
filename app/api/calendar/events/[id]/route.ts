import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import {
  buildGraphUrl,
  getMicrosoftToken,
  graphErrorResponse,
  graphFetch,
} from '@/lib/microsoft/graph';
import type { GraphEvent } from '@/lib/microsoft/types';

export const GET = withApiRoute({}, async ({ req, params, userId }) => {
  const { id } = params;
  const mailbox = req.nextUrl.searchParams.get('mailbox') ?? undefined;

  try {
    const token = await getMicrosoftToken(userId);
    const url = buildGraphUrl(`/events/${id}`, mailbox);
    const data = await graphFetch<GraphEvent>(token, url);
    return NextResponse.json(data);
  } catch (error) {
    const response = graphErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
});
