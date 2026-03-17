import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { buildGraphUrl, getMicrosoftToken, graphFetch } from '@/lib/microsoft/graph';
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = calendarQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mailbox, startDateTime, endDateTime, top } = parsed.data;

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
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    subject,
    body: eventBody,
    bodyType,
    startDateTime,
    endDateTime,
    timeZone,
    location,
    mailbox,
  } = parsed.data;

  const token = await getMicrosoftToken(userId);

  const payload: CreateEventPayload = {
    subject,
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
  };

  if (eventBody) {
    payload.body = { contentType: bodyType, content: eventBody };
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
}
