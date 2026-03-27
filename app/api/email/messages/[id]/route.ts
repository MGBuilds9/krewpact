import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import {
  buildGraphUrl,
  getMicrosoftToken,
  graphErrorResponse,
  graphFetch,
} from '@/lib/microsoft/graph';
import type { GraphMessage } from '@/lib/microsoft/types';

export const GET = withApiRoute({}, async ({ req, params, userId }) => {
  const { id } = params;
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
});
