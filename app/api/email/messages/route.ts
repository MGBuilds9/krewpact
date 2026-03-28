import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
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

export const GET = withApiRoute(
  { querySchema: emailQuerySchema },
  async ({ req: _req, userId, query }) => {
    const { mailbox, top, skip, search, folder } = query as {
      mailbox?: string;
      top: number;
      skip: number;
      search?: string;
      folder: string;
    };

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
  },
);
