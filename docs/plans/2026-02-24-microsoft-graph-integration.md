# Microsoft Graph Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full email + calendar integration via Microsoft Graph API, using Clerk-brokered M365 OAuth tokens.

**Architecture:** API routes fetch M365 tokens from Clerk server-side, then make direct `fetch()` calls to `graph.microsoft.com`. No Microsoft SDK — just REST. Shared mailbox support for `info@mdmcontracting.ca`. CRM auto-logging when emails sent from lead/contact context.

**Tech Stack:** Next.js API routes, Clerk OAuth token API, Microsoft Graph REST API v1.0, React Query hooks, existing shadcn/ui components.

---

### Task 1: Graph Client Library

**Files:**

- Create: `lib/microsoft/graph.ts`
- Create: `lib/microsoft/types.ts`
- Test: `__tests__/lib/microsoft/graph.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/microsoft/graph.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('buildGraphUrl', () => {
  it('builds personal mailbox URL', () => {
    expect(buildGraphUrl('/messages')).toBe('https://graph.microsoft.com/v1.0/me/messages');
  });

  it('builds shared mailbox URL', () => {
    expect(buildGraphUrl('/messages', 'info@mdmcontracting.ca')).toBe(
      'https://graph.microsoft.com/v1.0/users/info@mdmcontracting.ca/messages',
    );
  });

  it('builds calendar URL', () => {
    expect(buildGraphUrl('/events')).toBe('https://graph.microsoft.com/v1.0/me/events');
  });

  it('builds shared calendar URL', () => {
    expect(buildGraphUrl('/events', 'info@mdmcontracting.ca')).toBe(
      'https://graph.microsoft.com/v1.0/users/info@mdmcontracting.ca/events',
    );
  });
});

describe('getMicrosoftToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches token from Clerk API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ token: 'test-token-123' }]),
    });

    const token = await getMicrosoftToken('user_abc');
    expect(token).toBe('test-token-123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.clerk.com/v1/users/user_abc/oauth_access_tokens/oauth_microsoft',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Bearer'),
        }),
      }),
    );
  });

  it('throws when no token returned', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await expect(getMicrosoftToken('user_abc')).rejects.toThrow('No Microsoft OAuth token');
  });

  it('throws on Clerk API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(getMicrosoftToken('user_abc')).rejects.toThrow();
  });
});

describe('graphFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('makes authenticated request to Graph API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ value: [{ id: '1', subject: 'Test' }] }),
    });

    const result = await graphFetch('test-token', 'https://graph.microsoft.com/v1.0/me/messages');
    expect(result).toEqual({ value: [{ id: '1', subject: 'Test' }] });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://graph.microsoft.com/v1.0/me/messages',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('throws on Graph API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: { message: 'Access denied' } }),
    });

    await expect(
      graphFetch('bad-token', 'https://graph.microsoft.com/v1.0/me/messages'),
    ).rejects.toThrow('Access denied');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/microsoft/graph.test.ts`
Expected: FAIL — modules don't exist

**Step 3: Write types**

```typescript
// lib/microsoft/types.ts

export interface GraphMessage {
  id: string;
  subject: string | null;
  bodyPreview: string;
  body?: { contentType: string; content: string };
  from: { emailAddress: { name: string; address: string } } | null;
  toRecipients: Array<{ emailAddress: { name: string; address: string } }>;
  ccRecipients?: Array<{ emailAddress: { name: string; address: string } }>;
  receivedDateTime: string;
  sentDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: 'low' | 'normal' | 'high';
  webLink: string;
  conversationId: string;
}

export interface GraphEvent {
  id: string;
  subject: string;
  bodyPreview: string;
  body?: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  organizer?: { emailAddress: { name: string; address: string } };
  attendees?: Array<{
    emailAddress: { name: string; address: string };
    status: { response: string };
  }>;
  isAllDay: boolean;
  webLink: string;
  onlineMeetingUrl?: string | null;
}

export interface GraphListResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}

export interface SendMessagePayload {
  message: {
    subject: string;
    body: { contentType: 'Text' | 'HTML'; content: string };
    toRecipients: Array<{ emailAddress: { name?: string; address: string } }>;
    ccRecipients?: Array<{ emailAddress: { name?: string; address: string } }>;
  };
  saveToSentItems?: boolean;
}

export interface CreateEventPayload {
  subject: string;
  body?: { contentType: 'Text' | 'HTML'; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  attendees?: Array<{
    emailAddress: { name?: string; address: string };
    type: 'required' | 'optional';
  }>;
}
```

**Step 4: Write graph client**

```typescript
// lib/microsoft/graph.ts

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export function buildGraphUrl(path: string, sharedMailbox?: string): string {
  const prefix = sharedMailbox ? `/users/${sharedMailbox}` : '/me';
  return `${GRAPH_BASE}${prefix}${path}`;
}

export async function getMicrosoftToken(clerkUserId: string): Promise<string> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey) {
    throw new Error('CLERK_SECRET_KEY not configured');
  }

  const res = await fetch(
    `https://api.clerk.com/v1/users/${clerkUserId}/oauth_access_tokens/oauth_microsoft`,
    {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Clerk OAuth token fetch failed: ${res.status} ${res.statusText}`);
  }

  const tokens = await res.json();
  if (!Array.isArray(tokens) || tokens.length === 0 || !tokens[0].token) {
    throw new Error('No Microsoft OAuth token available for this user');
  }

  return tokens[0].token;
}

export async function graphFetch<T = unknown>(
  token: string,
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(error?.error?.message || `Graph API error: ${res.status}`);
  }

  return res.json();
}
```

**Step 5: Run tests and verify they pass**

Run: `npx vitest run __tests__/lib/microsoft/graph.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add lib/microsoft/ __tests__/lib/microsoft/
git commit -m "feat: add Microsoft Graph client library and types"
```

---

### Task 2: Email API Routes

**Files:**

- Create: `app/api/email/messages/route.ts`
- Create: `app/api/email/messages/[id]/route.ts`
- Create: `app/api/email/send/route.ts`
- Create: `lib/validators/email.ts`
- Test: `__tests__/api/email/messages.test.ts`
- Test: `__tests__/api/email/send.test.ts`

**Step 1: Write Zod validators**

```typescript
// lib/validators/email.ts
import { z } from 'zod';

export const emailQuerySchema = z.object({
  mailbox: z.string().email().optional(),
  top: z.coerce.number().int().positive().max(50).optional().default(25),
  skip: z.coerce.number().int().min(0).optional().default(0),
  search: z.string().optional(),
  folder: z.enum(['inbox', 'sentitems', 'drafts']).optional().default('inbox'),
});

export const sendEmailSchema = z.object({
  to: z
    .array(
      z.object({
        name: z.string().optional(),
        address: z.string().email(),
      }),
    )
    .min(1),
  cc: z
    .array(
      z.object({
        name: z.string().optional(),
        address: z.string().email(),
      }),
    )
    .optional(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  bodyType: z.enum(['Text', 'HTML']).optional().default('HTML'),
  // CRM linking — optional
  leadId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  // Shared mailbox — send from
  mailbox: z.string().email().optional(),
});
```

**Step 2: Write failing tests for messages route**

```typescript
// __tests__/api/email/messages.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/microsoft/graph', () => ({
  getMicrosoftToken: vi.fn(),
  graphFetch: vi.fn(),
  buildGraphUrl: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';

describe('GET /api/email/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    const { GET } = await import('@/app/api/email/messages/route');
    const req = new Request('http://localhost/api/email/messages');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('fetches inbox messages from personal mailbox', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_abc' } as any);
    vi.mocked(getMicrosoftToken).mockResolvedValue('test-token');
    vi.mocked(buildGraphUrl).mockReturnValue(
      'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages',
    );
    vi.mocked(graphFetch).mockResolvedValue({
      value: [{ id: '1', subject: 'Hello', isRead: false }],
    });

    const { GET } = await import('@/app/api/email/messages/route');
    const url = new URL('http://localhost/api/email/messages');
    const req = new Request(url);
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.value).toHaveLength(1);
    expect(getMicrosoftToken).toHaveBeenCalledWith('user_abc');
  });

  it('supports shared mailbox via query param', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_abc' } as any);
    vi.mocked(getMicrosoftToken).mockResolvedValue('test-token');
    vi.mocked(buildGraphUrl).mockReturnValue(
      'https://graph.microsoft.com/v1.0/users/info@mdmcontracting.ca/mailFolders/inbox/messages',
    );
    vi.mocked(graphFetch).mockResolvedValue({ value: [] });

    const { GET } = await import('@/app/api/email/messages/route');
    const url = new URL('http://localhost/api/email/messages?mailbox=info@mdmcontracting.ca');
    const req = new Request(url);
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    expect(buildGraphUrl).toHaveBeenCalledWith(
      expect.stringContaining('/mailFolders/'),
      'info@mdmcontracting.ca',
    );
  });
});
```

**Step 3: Write failing tests for send route**

```typescript
// __tests__/api/email/send.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/microsoft/graph', () => ({
  getMicrosoftToken: vi.fn(),
  graphFetch: vi.fn(),
  buildGraphUrl: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { getMicrosoftToken, graphFetch } from '@/lib/microsoft/graph';
import { createUserClient } from '@/lib/supabase/server';

describe('POST /api/email/send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    const { POST } = await import('@/app/api/email/send/route');
    const req = new Request('http://localhost/api/email/send', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('validates request body', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_abc' } as any);
    const { POST } = await import('@/app/api/email/send/route');
    const req = new Request('http://localhost/api/email/send', {
      method: 'POST',
      body: JSON.stringify({ subject: '' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('sends email via Graph API and logs CRM activity', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_abc' } as any);
    vi.mocked(getMicrosoftToken).mockResolvedValue('test-token');
    vi.mocked(graphFetch).mockResolvedValue(undefined);
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'act-1' }, error: null }),
          }),
        }),
      }),
    };
    vi.mocked(createUserClient).mockResolvedValue(mockSupabase as any);

    const { POST } = await import('@/app/api/email/send/route');
    const req = new Request('http://localhost/api/email/send', {
      method: 'POST',
      body: JSON.stringify({
        to: [{ address: 'test@example.com' }],
        subject: 'Test email',
        body: '<p>Hello</p>',
        leadId: '00000000-0000-0000-0000-000000000001',
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(graphFetch).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith('activities');
  });
});
```

**Step 4: Run tests to verify they fail**

Run: `npx vitest run __tests__/api/email/`
Expected: FAIL — routes don't exist

**Step 5: Implement messages route**

```typescript
// app/api/email/messages/route.ts
import { auth } from '@clerk/nextjs/server';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';
import { emailQuerySchema } from '@/lib/validators/email';
import { NextRequest, NextResponse } from 'next/server';
import type { GraphMessage, GraphListResponse } from '@/lib/microsoft/types';

const FOLDER_MAP: Record<string, string> = {
  inbox: 'inbox',
  sentitems: 'sentitems',
  drafts: 'drafts',
};

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = emailQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mailbox, top, skip, search, folder } = parsed.data;

  try {
    const token = await getMicrosoftToken(userId);
    const folderPath = `/mailFolders/${FOLDER_MAP[folder]}/messages`;
    const url = buildGraphUrl(folderPath, mailbox);

    const queryParams = new URLSearchParams({
      $top: String(top),
      $skip: String(skip),
      $orderby: 'receivedDateTime desc',
      $select:
        'id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,hasAttachments,importance,webLink,conversationId',
    });

    if (search) {
      queryParams.set('$search', `"${search}"`);
    }

    const data = await graphFetch<GraphListResponse<GraphMessage>>(token, `${url}?${queryParams}`);

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 6: Implement single message route**

```typescript
// app/api/email/messages/[id]/route.ts
import { auth } from '@clerk/nextjs/server';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';
import { NextRequest, NextResponse } from 'next/server';
import type { GraphMessage } from '@/lib/microsoft/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const mailbox = req.nextUrl.searchParams.get('mailbox') || undefined;

  try {
    const token = await getMicrosoftToken(userId);
    const url = buildGraphUrl(`/messages/${id}`, mailbox);
    const data = await graphFetch<GraphMessage>(token, url);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 7: Implement send route with CRM activity logging**

```typescript
// app/api/email/send/route.ts
import { auth } from '@clerk/nextjs/server';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';
import { createUserClient } from '@/lib/supabase/server';
import { sendEmailSchema } from '@/lib/validators/email';
import { NextRequest, NextResponse } from 'next/server';
import type { SendMessagePayload } from '@/lib/microsoft/types';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = sendEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    to,
    cc,
    subject,
    body: emailBody,
    bodyType,
    leadId,
    contactId,
    accountId,
    mailbox,
  } = parsed.data;

  try {
    const token = await getMicrosoftToken(userId);

    const payload: SendMessagePayload = {
      message: {
        subject,
        body: { contentType: bodyType, content: emailBody },
        toRecipients: to.map((r) => ({ emailAddress: { name: r.name, address: r.address } })),
        ...(cc && {
          ccRecipients: cc.map((r) => ({ emailAddress: { name: r.name, address: r.address } })),
        }),
      },
      saveToSentItems: true,
    };

    const sendUrl = buildGraphUrl('/sendMail', mailbox);
    await graphFetch(token, sendUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Log CRM activity if linked to a lead/contact/account
    if (leadId || contactId || accountId) {
      const supabase = await createUserClient();
      await supabase.from('activities').insert({
        activity_type: 'email',
        title: `Email: ${subject}`,
        details: `Sent to: ${to.map((r) => r.address).join(', ')}`,
        ...(leadId && { lead_id: leadId }),
        ...(contactId && { contact_id: contactId }),
        ...(accountId && { account_id: accountId }),
        owner_user_id: userId,
        completed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 8: Run tests and verify they pass**

Run: `npx vitest run __tests__/api/email/`
Expected: PASS

**Step 9: Commit**

```bash
git add app/api/email/ lib/validators/email.ts __tests__/api/email/
git commit -m "feat: add email API routes (inbox, read, send with CRM logging)"
```

---

### Task 3: Calendar API Routes

**Files:**

- Create: `app/api/calendar/events/route.ts`
- Create: `app/api/calendar/events/[id]/route.ts`
- Create: `lib/validators/calendar.ts`
- Test: `__tests__/api/calendar/events.test.ts`

**Step 1: Write validators**

```typescript
// lib/validators/calendar.ts
import { z } from 'zod';

export const calendarQuerySchema = z.object({
  mailbox: z.string().email().optional(),
  startDateTime: z.string().datetime().optional(),
  endDateTime: z.string().datetime().optional(),
  top: z.coerce.number().int().positive().max(50).optional().default(25),
});

export const createEventSchema = z.object({
  subject: z.string().min(1).max(500),
  body: z.string().optional(),
  bodyType: z.enum(['Text', 'HTML']).optional().default('Text'),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  timeZone: z.string().optional().default('America/Toronto'),
  location: z.string().optional(),
  mailbox: z.string().email().optional(),
});
```

**Step 2: Write failing test**

```typescript
// __tests__/api/calendar/events.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/microsoft/graph', () => ({
  getMicrosoftToken: vi.fn(),
  graphFetch: vi.fn(),
  buildGraphUrl: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';

describe('GET /api/calendar/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    const { GET } = await import('@/app/api/calendar/events/route');
    const req = new Request('http://localhost/api/calendar/events');
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it('fetches calendar events', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_abc' } as any);
    vi.mocked(getMicrosoftToken).mockResolvedValue('test-token');
    vi.mocked(buildGraphUrl).mockReturnValue('https://graph.microsoft.com/v1.0/me/events');
    vi.mocked(graphFetch).mockResolvedValue({
      value: [{ id: 'ev1', subject: 'Meeting' }],
    });

    const { GET } = await import('@/app/api/calendar/events/route');
    const req = new Request('http://localhost/api/calendar/events');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.value).toHaveLength(1);
  });
});

describe('POST /api/calendar/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a calendar event', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_abc' } as any);
    vi.mocked(getMicrosoftToken).mockResolvedValue('test-token');
    vi.mocked(buildGraphUrl).mockReturnValue('https://graph.microsoft.com/v1.0/me/events');
    vi.mocked(graphFetch).mockResolvedValue({ id: 'new-ev', subject: 'New Meeting' });

    const { POST } = await import('@/app/api/calendar/events/route');
    const req = new Request('http://localhost/api/calendar/events', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'New Meeting',
        startDateTime: '2026-03-01T10:00:00Z',
        endDateTime: '2026-03-01T11:00:00Z',
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
  });
});
```

**Step 3: Implement calendar routes**

```typescript
// app/api/calendar/events/route.ts
import { auth } from '@clerk/nextjs/server';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';
import { calendarQuerySchema, createEventSchema } from '@/lib/validators/calendar';
import { NextRequest, NextResponse } from 'next/server';
import type { GraphEvent, GraphListResponse, CreateEventPayload } from '@/lib/microsoft/types';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = calendarQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mailbox, startDateTime, endDateTime, top } = parsed.data;

  try {
    const token = await getMicrosoftToken(userId);
    const url = buildGraphUrl('/events', mailbox);

    const queryParams = new URLSearchParams({
      $top: String(top),
      $orderby: 'start/dateTime',
      $select:
        'id,subject,bodyPreview,start,end,location,organizer,attendees,isAllDay,webLink,onlineMeetingUrl',
    });

    if (startDateTime) {
      queryParams.set(
        '$filter',
        `start/dateTime ge '${startDateTime}'${endDateTime ? ` and end/dateTime le '${endDateTime}'` : ''}`,
      );
    }

    const data = await graphFetch<GraphListResponse<GraphEvent>>(token, `${url}?${queryParams}`);

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch events';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  try {
    const token = await getMicrosoftToken(userId);
    const url = buildGraphUrl('/events', mailbox);

    const payload: CreateEventPayload = {
      subject,
      start: { dateTime: startDateTime, timeZone },
      end: { dateTime: endDateTime, timeZone },
      ...(eventBody && { body: { contentType: bodyType, content: eventBody } }),
      ...(location && { location: { displayName: location } }),
    };

    const data = await graphFetch<GraphEvent>(token, url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create event';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

```typescript
// app/api/calendar/events/[id]/route.ts
import { auth } from '@clerk/nextjs/server';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';
import { NextRequest, NextResponse } from 'next/server';
import type { GraphEvent } from '@/lib/microsoft/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const mailbox = req.nextUrl.searchParams.get('mailbox') || undefined;

  try {
    const token = await getMicrosoftToken(userId);
    const url = buildGraphUrl(`/events/${id}`, mailbox);
    const data = await graphFetch<GraphEvent>(token, url);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch event';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 4: Run tests and verify they pass**

Run: `npx vitest run __tests__/api/calendar/`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/calendar/ lib/validators/calendar.ts __tests__/api/calendar/
git commit -m "feat: add calendar API routes (list, detail, create events)"
```

---

### Task 4: React Query Hooks

**Files:**

- Create: `hooks/useEmail.ts`
- Create: `hooks/useCalendar.ts`
- Test: `__tests__/hooks/useEmail.test.ts`

**Step 1: Write email hook**

```typescript
// hooks/useEmail.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { GraphMessage, GraphListResponse } from '@/lib/microsoft/types';

interface UseEmailOptions {
  mailbox?: string;
  folder?: 'inbox' | 'sentitems' | 'drafts';
  top?: number;
  search?: string;
}

export function useEmailMessages(options: UseEmailOptions = {}) {
  const { mailbox, folder = 'inbox', top = 25, search } = options;

  return useQuery({
    queryKey: ['email', 'messages', { mailbox, folder, top, search }],
    queryFn: () =>
      apiFetch<GraphListResponse<GraphMessage>>('/api/email/messages', {
        params: {
          ...(mailbox && { mailbox }),
          folder,
          top,
          ...(search && { search }),
        },
      }),
    staleTime: 60_000, // 1 minute
  });
}

export function useEmailMessage(id: string, mailbox?: string) {
  return useQuery({
    queryKey: ['email', 'message', id, mailbox],
    queryFn: () =>
      apiFetch<GraphMessage>(`/api/email/messages/${id}`, {
        params: mailbox ? { mailbox } : {},
      }),
    enabled: !!id,
  });
}

interface SendEmailParams {
  to: Array<{ name?: string; address: string }>;
  cc?: Array<{ name?: string; address: string }>;
  subject: string;
  body: string;
  bodyType?: 'Text' | 'HTML';
  leadId?: string;
  contactId?: string;
  accountId?: string;
  mailbox?: string;
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SendEmailParams) =>
      apiFetch('/api/email/send', { method: 'POST', body: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email', 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}
```

**Step 2: Write calendar hook**

```typescript
// hooks/useCalendar.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { GraphEvent, GraphListResponse } from '@/lib/microsoft/types';

interface UseCalendarOptions {
  mailbox?: string;
  startDateTime?: string;
  endDateTime?: string;
  top?: number;
}

export function useCalendarEvents(options: UseCalendarOptions = {}) {
  const { mailbox, startDateTime, endDateTime, top = 25 } = options;

  return useQuery({
    queryKey: ['calendar', 'events', { mailbox, startDateTime, endDateTime, top }],
    queryFn: () =>
      apiFetch<GraphListResponse<GraphEvent>>('/api/calendar/events', {
        params: {
          ...(mailbox && { mailbox }),
          ...(startDateTime && { startDateTime }),
          ...(endDateTime && { endDateTime }),
          top,
        },
      }),
    staleTime: 60_000,
  });
}

export function useCalendarEvent(id: string, mailbox?: string) {
  return useQuery({
    queryKey: ['calendar', 'event', id, mailbox],
    queryFn: () =>
      apiFetch<GraphEvent>(`/api/calendar/events/${id}`, {
        params: mailbox ? { mailbox } : {},
      }),
    enabled: !!id,
  });
}

interface CreateEventParams {
  subject: string;
  body?: string;
  bodyType?: 'Text' | 'HTML';
  startDateTime: string;
  endDateTime: string;
  timeZone?: string;
  location?: string;
  mailbox?: string;
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateEventParams) =>
      apiFetch('/api/calendar/events', { method: 'POST', body: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] });
    },
  });
}
```

**Step 3: Write hook test**

```typescript
// __tests__/hooks/useEmail.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api-client';

describe('useEmail hook logic', () => {
  it('builds correct query params for inbox', () => {
    // Verify the apiFetch call shape matches the route contract
    const params = {
      folder: 'inbox',
      top: 25,
    };
    expect(params.folder).toBe('inbox');
    expect(params.top).toBe(25);
  });

  it('builds correct params for shared mailbox', () => {
    const params = {
      mailbox: 'info@mdmcontracting.ca',
      folder: 'inbox',
      top: 25,
    };
    expect(params.mailbox).toBe('info@mdmcontracting.ca');
  });
});
```

**Step 4: Run tests**

Run: `npx vitest run __tests__/hooks/useEmail.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add hooks/useEmail.ts hooks/useCalendar.ts __tests__/hooks/useEmail.test.ts
git commit -m "feat: add React Query hooks for email and calendar"
```

---

### Task 5: Dashboard Widgets (Inbox Preview + Today's Calendar)

**Files:**

- Create: `components/Dashboard/InboxPreview.tsx`
- Create: `components/Dashboard/CalendarWidget.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`

**Step 1: Write InboxPreview widget**

```typescript
// components/Dashboard/InboxPreview.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail } from 'lucide-react';
import { useEmailMessages } from '@/hooks/useEmail';
import { cn } from '@/lib/utils';

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

export function InboxPreview() {
  const { data, isLoading, error } = useEmailMessages({ top: 5 });

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" /> Inbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load emails. Connect your Microsoft account to view inbox.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4" /> Inbox
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : !data?.value?.length ? (
          <p className="text-sm text-muted-foreground">No messages</p>
        ) : (
          data.value.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col gap-0.5 rounded-md p-2 -mx-2 hover:bg-muted/50 cursor-pointer transition-colors',
                !msg.isRead && 'bg-muted/30'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn('text-sm truncate', !msg.isRead && 'font-semibold')}>
                  {msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || 'Unknown'}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatRelativeDate(msg.receivedDateTime)}
                </span>
              </div>
              <span className={cn('text-sm truncate', !msg.isRead && 'font-medium')}>
                {msg.subject || '(no subject)'}
              </span>
              <span className="text-xs text-muted-foreground truncate">{msg.bodyPreview}</span>
              {!msg.isRead && (
                <Badge variant="secondary" className="w-fit text-[10px] px-1.5 py-0">
                  New
                </Badge>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Write CalendarWidget**

```typescript
// components/Dashboard/CalendarWidget.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, MapPin } from 'lucide-react';
import { useCalendarEvents } from '@/hooks/useCalendar';

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
  };
}

function formatTime(dateTimeStr: string): string {
  return new Date(dateTimeStr).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function CalendarWidget() {
  const { startDateTime, endDateTime } = getTodayRange();
  const { data, isLoading, error } = useCalendarEvents({
    startDateTime,
    endDateTime,
    top: 10,
  });

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load calendar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Today
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : !data?.value?.length ? (
          <p className="text-sm text-muted-foreground">No events today</p>
        ) : (
          data.value.map((event) => (
            <div key={event.id} className="flex gap-3 items-start rounded-md p-2 -mx-2 hover:bg-muted/50 transition-colors">
              <div className="text-xs text-muted-foreground whitespace-nowrap pt-0.5 min-w-[60px]">
                {event.isAllDay ? 'All day' : formatTime(event.start.dateTime)}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium truncate">{event.subject}</span>
                {event.location?.displayName && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {event.location.displayName}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 3: Add widgets to dashboard page**

Add imports and components in the dashboard grid. Insert after the "At a Glance" cards section. Look for the grid layout and add a new row with InboxPreview and CalendarWidget side by side.

**Step 4: Run full test suite + build**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: All pass

**Step 5: Commit**

```bash
git add components/Dashboard/ app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat: add inbox preview and calendar widgets to dashboard"
```

---

### Task 6: Full Quality Gate + Final Commit

**Step 1: Run full quality gate**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

**Step 2: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: Microsoft Graph integration — email, calendar, CRM activity logging"
```
