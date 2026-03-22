import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import {
  buildGraphUrl,
  getMicrosoftToken,
  graphErrorResponse,
  graphFetch,
} from '@/lib/microsoft/graph';
import type { GraphListResponse, GraphMessage } from '@/lib/microsoft/types';
import { emailQuerySchema } from '@/lib/validators/email';

const MESSAGE_SELECT = [
  'id',
  'subject',
  'bodyPreview',
  'from',
  'toRecipients',
  'ccRecipients',
  'receivedDateTime',
  'sentDateTime',
  'isRead',
  'hasAttachments',
  'importance',
  'webLink',
  'conversationId',
].join(',');

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = emailQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mailbox, top, skip, search, folder } = parsed.data;

  try {
    const token = await getMicrosoftToken(userId);

    const queryParams = new URLSearchParams({
      $top: String(top),
      $skip: String(skip),
      $orderby: 'receivedDateTime desc',
      $select: MESSAGE_SELECT,
    });

    if (search) {
      queryParams.set('$search', `"${search}"`);
    }

    const path = `/mailFolders/${folder}/messages?${queryParams.toString()}`;
    const url = buildGraphUrl(path, mailbox);

    const data = await graphFetch<GraphListResponse<GraphMessage>>(token, url);

    return NextResponse.json(data);
  } catch (error) {
    const response = graphErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
