import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import {
  buildGraphUrl,
  getMicrosoftToken,
  graphErrorResponse,
  graphFetch,
} from '@/lib/microsoft/graph';
import type { CreateEventPayload, GraphEvent, GraphListResponse } from '@/lib/microsoft/types';
import { calendarQuerySchema, createEventSchema } from '@/lib/validators/calendar';

const EVENT_SELECT = [
  'id',
  'subject',
  'bodyPreview',
  'start',
  'end',
  'location',
  'organizer',
  'attendees',
  'isAllDay',
  'webLink',
  'onlineMeetingUrl',
].join(',');

export const GET = withApiRoute({ querySchema: calendarQuerySchema }, async ({ userId, query }) => {
  const { mailbox, startDateTime, endDateTime, top } = query as {
    mailbox?: string;
    startDateTime?: string;
    endDateTime?: string;
    top: number;
  };

  try {
    const token = await getMicrosoftToken(userId);
    const queryParams = new URLSearchParams({
      $top: String(top),
      $orderby: 'start/dateTime asc',
      $select: EVENT_SELECT,
    });

    if (startDateTime && endDateTime) {
      queryParams.set(
        '$filter',
        `start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'`,
      );
    }

    const url = buildGraphUrl('/events', mailbox);
    const data = await graphFetch<GraphListResponse<GraphEvent>>(
      token,
      `${url}?${queryParams.toString()}`,
    );

    return NextResponse.json(data);
  } catch (error) {
    const response = graphErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
});

export const POST = withApiRoute({ bodySchema: createEventSchema }, async ({ userId, body }) => {
  const {
    subject,
    body: eventBody,
    bodyType,
    startDateTime,
    endDateTime,
    timeZone,
    location,
    mailbox,
  } = body as {
    subject: string;
    body?: string;
    bodyType?: string;
    startDateTime: string;
    endDateTime: string;
    timeZone: string;
    location?: string;
    mailbox?: string;
  };

  try {
    const token = await getMicrosoftToken(userId);

    const payload: CreateEventPayload = {
      subject,
      start: { dateTime: startDateTime, timeZone },
      end: { dateTime: endDateTime, timeZone },
    };

    if (eventBody) {
      payload.body = { contentType: (bodyType ?? 'Text') as 'Text' | 'HTML', content: eventBody };
    }

    if (location) {
      payload.location = { displayName: location };
    }

    const url = buildGraphUrl('/events', mailbox);
    const data = await graphFetch<GraphEvent>(token, url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const response = graphErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
});
