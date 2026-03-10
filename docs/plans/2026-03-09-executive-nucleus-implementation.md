# Executive Nucleus Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a restricted executive module in KrewPact with a command center dashboard (10 widgets) and an AI-powered knowledge base with verified ingestion pipeline.

**Architecture:** New route group `/org/[orgSlug]/executive/` gated to `platform_admin` and `executive` roles. Knowledge ingestion uses a staging table with human-in-the-loop review before documents are embedded into pgvector. Command center aggregates existing KrewPact + ERPNext data through cached metrics. All follows existing BFF, RLS, and JWT claims patterns.

**Tech Stack:** Next.js 15 App Router, Supabase PostgreSQL + pgvector, Clerk JWT auth, OpenAI ada-002 embeddings, QStash async jobs, TanStack Query, shadcn/ui, Recharts, react-markdown.

**Design Doc:** `docs/plans/2026-03-09-executive-nucleus-design.md`

---

## Phase 1: Foundation (Knowledge Ingestion + Staging)

### Task 1: Database Migration — New Tables + RLS

**Files:**

- Create: `supabase/migrations/20260309_001_executive_nucleus.sql`

**Step 1: Write the migration**

```sql
-- Executive Nucleus — Foundation Tables
BEGIN;

-- 1. Knowledge Staging (ingestion review pipeline)
CREATE TABLE IF NOT EXISTS knowledge_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_path TEXT,
    source_type TEXT NOT NULL DEFAULT 'vault_import',
    title TEXT NOT NULL,
    raw_content TEXT NOT NULL,
    edited_content TEXT,
    category TEXT,
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending_review',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    content_checksum TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_staging_org_status ON knowledge_staging(org_id, status);
CREATE INDEX idx_knowledge_staging_category ON knowledge_staging(category);

-- 2. Executive Subscriptions (SaaS cost tracking)
CREATE TABLE IF NOT EXISTS executive_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    vendor TEXT,
    monthly_cost NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'CAD',
    billing_cycle TEXT DEFAULT 'monthly',
    renewal_date DATE,
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exec_subs_org_active ON executive_subscriptions(org_id, is_active);

-- 3. Executive Metrics Cache
CREATE TABLE IF NOT EXISTS executive_metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_key TEXT NOT NULL,
    metric_value JSONB NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, metric_key)
);

-- RLS Policies
ALTER TABLE knowledge_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_metrics_cache ENABLE ROW LEVEL SECURITY;

-- knowledge_staging: executive read, admin write
CREATE POLICY "executive_read_staging" ON knowledge_staging
    FOR SELECT USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ?| ARRAY['platform_admin', 'executive']
    );
CREATE POLICY "admin_write_staging" ON knowledge_staging
    FOR INSERT WITH CHECK (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );
CREATE POLICY "admin_update_staging" ON knowledge_staging
    FOR UPDATE USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );
CREATE POLICY "admin_delete_staging" ON knowledge_staging
    FOR DELETE USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );

-- executive_subscriptions: executive read, admin write
CREATE POLICY "executive_read_subs" ON executive_subscriptions
    FOR SELECT USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ?| ARRAY['platform_admin', 'executive']
    );
CREATE POLICY "admin_write_subs" ON executive_subscriptions
    FOR INSERT WITH CHECK (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );
CREATE POLICY "admin_update_subs" ON executive_subscriptions
    FOR UPDATE USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );
CREATE POLICY "admin_delete_subs" ON executive_subscriptions
    FOR DELETE USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );

-- executive_metrics_cache: executive read, service role write (QStash cron)
CREATE POLICY "executive_read_cache" ON executive_metrics_cache
    FOR SELECT USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ?| ARRAY['platform_admin', 'executive']
    );

COMMIT;
```

**Step 2: Apply migration**

Run: `cd /Users/mkgbuilds/obsidian-mkg/Github/MDM-Projects/krewpact && npx supabase db push` (or apply via Supabase dashboard)

**Step 3: Commit**

```bash
git add supabase/migrations/20260309_001_executive_nucleus.sql
git commit -m "feat(executive): add knowledge_staging, executive_subscriptions, executive_metrics_cache tables with RLS"
```

---

### Task 2: Zod Validators — Executive Module Schemas

**Files:**

- Create: `lib/validators/executive.ts`
- Test: `__tests__/lib/validators/executive.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/validators/executive.test.ts
import { describe, it, expect } from 'vitest';
import {
  stagingCreateSchema,
  stagingUpdateSchema,
  stagingBulkImportSchema,
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
} from '@/lib/validators/executive';

describe('executive validators', () => {
  describe('stagingCreateSchema', () => {
    it('accepts valid staging document', () => {
      const result = stagingCreateSchema.safeParse({
        title: 'Test SOP',
        raw_content: '# Test\n\nContent here',
        source_type: 'vault_import',
        category: 'sop',
        tags: ['governance', 'hr'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty title', () => {
      const result = stagingCreateSchema.safeParse({
        title: '',
        raw_content: 'content',
        source_type: 'vault_import',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid source_type', () => {
      const result = stagingCreateSchema.safeParse({
        title: 'Test',
        raw_content: 'content',
        source_type: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('stagingUpdateSchema', () => {
    it('accepts status transition to approved', () => {
      const result = stagingUpdateSchema.safeParse({
        status: 'approved',
        review_notes: 'Looks good',
      });
      expect(result.success).toBe(true);
    });

    it('accepts edited_content update', () => {
      const result = stagingUpdateSchema.safeParse({
        edited_content: '# Updated content',
        status: 'needs_edit',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('stagingBulkImportSchema', () => {
    it('accepts array of file paths', () => {
      const result = stagingBulkImportSchema.safeParse({
        files: [
          { path: '/vault/_mdm/research/market.md', category: 'market' },
          { path: '/vault/_mdm/operations/sop.md', category: 'sop' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty files array', () => {
      const result = stagingBulkImportSchema.safeParse({ files: [] });
      expect(result.success).toBe(false);
    });
  });

  describe('subscriptionCreateSchema', () => {
    it('accepts valid subscription', () => {
      const result = subscriptionCreateSchema.safeParse({
        name: 'Vercel',
        category: 'platform',
        monthly_cost: 20.0,
        billing_cycle: 'monthly',
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative cost', () => {
      const result = subscriptionCreateSchema.safeParse({
        name: 'Vercel',
        category: 'platform',
        monthly_cost: -5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('subscriptionUpdateSchema', () => {
    it('accepts partial update', () => {
      const result = subscriptionUpdateSchema.safeParse({
        monthly_cost: 25.0,
        is_active: false,
      });
      expect(result.success).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/mkgbuilds/obsidian-mkg/Github/MDM-Projects/krewpact && npx vitest run __tests__/lib/validators/executive.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// lib/validators/executive.ts
import { z } from 'zod';

const SOURCE_TYPES = ['vault_import', 'upload', 'url_scrape'] as const;
const STAGING_STATUSES = [
  'pending_review',
  'approved',
  'rejected',
  'needs_edit',
  'ingested',
] as const;
const CATEGORIES = [
  'sop',
  'strategy',
  'market',
  'infrastructure',
  'marketing',
  'architecture',
  'analysis',
  'reference',
] as const;
const SUB_CATEGORIES = [
  'platform',
  'dev_tools',
  'marketing',
  'operations',
  'communications',
  'infrastructure',
] as const;
const BILLING_CYCLES = ['monthly', 'annual'] as const;

// --- Knowledge Staging ---

export const stagingCreateSchema = z.object({
  title: z.string().min(1).max(500),
  raw_content: z.string().min(1),
  source_type: z.enum(SOURCE_TYPES),
  source_path: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  division_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

export const stagingUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  edited_content: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  division_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(STAGING_STATUSES).optional(),
  review_notes: z.string().optional(),
});

export const stagingBulkImportSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        category: z.enum(CATEGORIES).optional(),
        division_id: z.string().uuid().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .min(1)
    .max(100),
});

export type StagingCreate = z.infer<typeof stagingCreateSchema>;
export type StagingUpdate = z.infer<typeof stagingUpdateSchema>;
export type StagingBulkImport = z.infer<typeof stagingBulkImportSchema>;

// --- Executive Subscriptions ---

export const subscriptionCreateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(SUB_CATEGORIES),
  vendor: z.string().max(200).optional(),
  monthly_cost: z.number().min(0),
  currency: z.string().length(3).default('CAD'),
  billing_cycle: z.enum(BILLING_CYCLES).default('monthly'),
  renewal_date: z.string().optional(), // ISO date string
  division_id: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
});

export const subscriptionUpdateSchema = subscriptionCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export type SubscriptionCreate = z.infer<typeof subscriptionCreateSchema>;
export type SubscriptionUpdate = z.infer<typeof subscriptionUpdateSchema>;
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/validators/executive.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/validators/executive.ts __tests__/lib/validators/executive.test.ts
git commit -m "feat(executive): add Zod validators for staging and subscription schemas"
```

---

### Task 3: Executive Layout + Role Gate

**Files:**

- Create: `app/(dashboard)/org/[orgSlug]/executive/layout.tsx`
- Create: `components/Executive/ExecutiveNav.tsx`
- Modify: `lib/query-keys.ts` — add executive keys

**Step 1: Add query keys**

Add to `lib/query-keys.ts`:

```typescript
executive: {
  all: ['executive'] as const,
  overview: () => [...queryKeys.executive.all, 'overview'] as const,
  alerts: () => [...queryKeys.executive.all, 'alerts'] as const,
  staging: {
    all: [...['executive'], 'staging'] as const,
    lists: () => [...queryKeys.executive.staging.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.executive.staging.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.executive.staging.all, 'detail', id] as const,
  },
  subscriptions: {
    all: [...['executive'], 'subscriptions'] as const,
    lists: () => [...queryKeys.executive.subscriptions.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.executive.subscriptions.lists(), filters] as const,
  },
  knowledge: {
    all: [...['executive'], 'knowledge'] as const,
    search: (query: string) => [...queryKeys.executive.knowledge.all, 'search', query] as const,
    chat: (sessionId: string) => [...queryKeys.executive.knowledge.all, 'chat', sessionId] as const,
  },
},
```

**Step 2: Create ExecutiveNav component**

```tsx
// components/Executive/ExecutiveNav.tsx
'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, BookOpen, Upload, MessageSquare, CreditCard } from 'lucide-react';

const NAV_ITEMS = [
  { href: '', label: 'Command Center', icon: LayoutDashboard },
  { href: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { href: '/knowledge/ingest', label: 'Ingestion', icon: Upload },
  { href: '/knowledge/chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
] as const;

export function ExecutiveNav() {
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const basePath = `/org/${orgSlug}/executive`;

  return (
    <nav className="flex gap-1 overflow-x-auto pb-2" aria-label="Executive navigation">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const fullHref = `${basePath}${href}`;
        const isActive =
          href === ''
            ? pathname === basePath || pathname === `${basePath}/`
            : pathname.startsWith(fullHref);

        return (
          <Link
            key={href}
            href={fullHref}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

**Step 3: Create executive layout**

```tsx
// app/(dashboard)/org/[orgSlug]/executive/layout.tsx
'use client';

import { useUserRBAC } from '@/hooks/useRBAC';
import { ExecutiveNav } from '@/components/Executive/ExecutiveNav';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';

const EXECUTIVE_ROLES = ['executive', 'platform_admin', 'CEO', 'CFO', 'COO', 'IT_ADMIN'];

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  const { hasRole, isLoading } = useUserRBAC();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const canAccess = EXECUTIVE_ROLES.some((role) => hasRole(role));

  if (!canAccess) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
        <p className="text-muted-foreground">
          The Executive Nucleus is restricted to C-suite and IT leadership.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Executive Nucleus</h1>
        <p className="text-sm text-muted-foreground mt-1">MDM Group operational intelligence</p>
      </div>
      <ExecutiveNav />
      {children}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add lib/query-keys.ts components/Executive/ExecutiveNav.tsx "app/(dashboard)/org/[orgSlug]/executive/layout.tsx"
git commit -m "feat(executive): add executive layout with role gate and navigation"
```

---

### Task 4: Knowledge Staging API — CRUD

**Files:**

- Create: `app/api/executive/staging/route.ts` (GET list, POST create)
- Create: `app/api/executive/staging/[id]/route.ts` (GET detail, PATCH update, DELETE)
- Create: `app/api/executive/staging/bulk-import/route.ts` (POST)
- Test: `__tests__/api/executive/staging.test.ts`
- Test: `__tests__/api/executive/staging-detail.test.ts`

**Step 1: Write the failing tests**

```typescript
// __tests__/api/executive/staging.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/executive/staging/route';

const mockAuth = vi.mocked(auth);
const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeRequest(method: string, body?: unknown, params?: Record<string, string>) {
  const url = new URL('http://localhost/api/executive/staging');
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockExecAuth() {
  mockAuth.mockResolvedValue({
    userId: 'user_admin',
    sessionClaims: { krewpact_roles: ['platform_admin'], krewpact_org_id: 'org-1' },
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

describe('GET /api/executive/staging', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null, sessionClaims: null } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    const res = await GET(makeRequest('GET'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks executive role', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_pm',
      sessionClaims: { krewpact_roles: ['project_manager'] },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    const res = await GET(makeRequest('GET'));
    expect(res.status).toBe(403);
  });

  it('returns 200 with staging documents', async () => {
    mockExecAuth();
    const docs = [{ id: '1', title: 'Test', status: 'pending_review' }];
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockReturnValue({ data: docs, count: 1, error: null }),
          }),
        }),
      }),
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof createServiceClient
    >);

    const res = await GET(makeRequest('GET', undefined, { status: 'pending_review' }));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/executive/staging', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when non-admin tries to create', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: { krewpact_roles: ['executive'] },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    const res = await POST(
      makeRequest('POST', {
        title: 'Test',
        raw_content: 'content',
        source_type: 'upload',
      }),
    );
    expect(res.status).toBe(403);
  });

  it('returns 201 when admin creates staging doc', async () => {
    mockExecAuth();
    const created = { id: '1', title: 'Test', status: 'pending_review' };
    const mockFrom = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue({ data: created, error: null }),
        }),
      }),
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof createServiceClient
    >);

    const res = await POST(
      makeRequest('POST', {
        title: 'Test',
        raw_content: 'content',
        source_type: 'upload',
      }),
    );
    expect(res.status).toBe(201);
  });

  it('returns 400 on invalid input', async () => {
    mockExecAuth();
    const res = await POST(makeRequest('POST', { title: '', raw_content: '' }));
    expect(res.status).toBe(400);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/api/executive/staging.test.ts`
Expected: FAIL — modules not found

**Step 3: Write the API route implementation**

```typescript
// app/api/executive/staging/route.ts
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { stagingCreateSchema } from '@/lib/validators/executive';
import { createHash } from 'crypto';

const EXECUTIVE_ROLES = ['executive', 'platform_admin'];
const ADMIN_ROLES = ['platform_admin'];

function checkRoles(claims: Record<string, unknown>, allowed: string[]): boolean {
  const roles = Array.isArray(claims?.krewpact_roles) ? claims.krewpact_roles : [];
  return roles.some((r: unknown) => allowed.includes(String(r)));
}

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  if (!checkRoles(claims, EXECUTIVE_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const supabase = createServiceClient();
  const status = req.nextUrl.searchParams.get('status') || 'pending_review';
  const category = req.nextUrl.searchParams.get('category');
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  const orgId = (claims.krewpact_org_id as string) || 'mdm-group';

  let query = supabase
    .from('knowledge_staging')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId);

  if (status !== 'all') query = query.eq('status', status);
  if (category) query = query.eq('category', category);

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch staging documents' }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  if (!checkRoles(claims, ADMIN_ROLES)) {
    return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 });
  }

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const body = await req.json();
  const parsed = stagingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const orgId = (claims.krewpact_org_id as string) || 'mdm-group';
  const checksum = createHash('sha256').update(parsed.data.raw_content).digest('hex');

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('knowledge_staging')
    .insert({
      ...parsed.data,
      org_id: orgId,
      content_checksum: checksum,
      status: 'pending_review',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create staging document' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/api/executive/staging.test.ts`
Expected: PASS

**Step 5: Write staging detail route**

```typescript
// app/api/executive/staging/[id]/route.ts
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { stagingUpdateSchema } from '@/lib/validators/executive';

const EXECUTIVE_ROLES = ['executive', 'platform_admin'];
const ADMIN_ROLES = ['platform_admin'];

function checkRoles(claims: Record<string, unknown>, allowed: string[]): boolean {
  const roles = Array.isArray(claims?.krewpact_roles) ? claims.krewpact_roles : [];
  return roles.some((r: unknown) => allowed.includes(String(r)));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  if (!checkRoles(claims, EXECUTIVE_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('knowledge_staging')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  if (!checkRoles(claims, ADMIN_ROLES)) {
    return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 });
  }

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const body = await req.json();
  const parsed = stagingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const supabase = createServiceClient();

  // If approving, set reviewed_by and reviewed_at
  const updates: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
  if (parsed.data.status === 'approved' || parsed.data.status === 'rejected') {
    // Look up krewpact_user_id from claims
    const krewpactUserId = claims.krewpact_user_id as string | undefined;
    if (krewpactUserId) updates.reviewed_by = krewpactUserId;
    updates.reviewed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('knowledge_staging')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  if (!checkRoles(claims, ADMIN_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from('knowledge_staging').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 6: Write and run tests for staging detail, then commit**

Run: `npx vitest run __tests__/api/executive/`
Expected: PASS

```bash
git add app/api/executive/ __tests__/api/executive/
git commit -m "feat(executive): add knowledge staging CRUD API with tests"
```

---

### Task 5: Bulk Vault Import API

**Files:**

- Create: `app/api/executive/staging/bulk-import/route.ts`
- Test: `__tests__/api/executive/bulk-import.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/api/executive/bulk-import.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { readFile, stat } from 'fs/promises';
import { POST } from '@/app/api/executive/staging/bulk-import/route';

const mockAuth = vi.mocked(auth);
const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockReadFile = vi.mocked(readFile);
const mockStat = vi.mocked(stat);

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/executive/staging/bulk-import', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/executive/staging/bulk-import', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-admin', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_1',
      sessionClaims: { krewpact_roles: ['executive'] },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await POST(makeRequest({ files: [{ path: '/test.md' }] }));
    expect(res.status).toBe(403);
  });

  it('returns 200 with import results for valid files', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: { krewpact_roles: ['platform_admin'], krewpact_org_id: 'org-1' },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    mockStat.mockResolvedValue({ isFile: () => true } as unknown as Awaited<
      ReturnType<typeof stat>
    >);
    mockReadFile.mockResolvedValue('# Test Doc\n\nContent here');

    const insertedDocs = [{ id: '1', title: 'Test Doc', status: 'pending_review' }];
    const mockFrom = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ data: insertedDocs, error: null }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: [], // no existing docs with same checksum
          error: null,
        }),
      }),
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof createServiceClient
    >);

    const res = await POST(
      makeRequest({
        files: [
          { path: '/Users/mkgbuilds/obsidian-mkg/_mdm/research/test.md', category: 'market' },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBeGreaterThanOrEqual(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/api/executive/bulk-import.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// app/api/executive/staging/bulk-import/route.ts
import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { stagingBulkImportSchema } from '@/lib/validators/executive';
import { readFile, stat } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  const roles = Array.isArray(claims?.krewpact_roles) ? claims.krewpact_roles : [];
  if (!roles.includes('platform_admin')) {
    return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 });
  }

  const rl = await rateLimit(req, { limit: 5, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const body = await req.json();
  const parsed = stagingBulkImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const orgId = (claims.krewpact_org_id as string) || 'mdm-group';
  const supabase = createServiceClient();
  const results: { path: string; status: 'imported' | 'skipped' | 'error'; reason?: string }[] = [];

  for (const file of parsed.data.files) {
    try {
      // Validate file exists and is a file
      const fileStat = await stat(file.path);
      if (!fileStat.isFile()) {
        results.push({ path: file.path, status: 'skipped', reason: 'Not a file' });
        continue;
      }

      // Read file content
      const content = await readFile(file.path, 'utf-8');
      if (!content.trim()) {
        results.push({ path: file.path, status: 'skipped', reason: 'Empty file' });
        continue;
      }

      // Extract title from first heading or filename
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1] || path.basename(file.path, path.extname(file.path));

      // Compute checksum for dedup
      const checksum = createHash('sha256').update(content).digest('hex');

      // Check if already imported with same checksum
      const { data: existing } = await supabase
        .from('knowledge_staging')
        .select('id')
        .eq('content_checksum', checksum)
        .eq('org_id', orgId);

      if (existing && existing.length > 0) {
        results.push({
          path: file.path,
          status: 'skipped',
          reason: 'Already imported (same content)',
        });
        continue;
      }

      // Strip frontmatter before storing
      const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n*/m, '');

      // Insert into staging
      const { error } = await supabase.from('knowledge_staging').insert({
        org_id: orgId,
        source_path: file.path,
        source_type: 'vault_import',
        title,
        raw_content: contentWithoutFrontmatter.trim(),
        category: file.category || null,
        division_id: file.division_id || null,
        tags: file.tags || [],
        content_checksum: checksum,
        status: 'pending_review',
      });

      if (error) {
        results.push({ path: file.path, status: 'error', reason: error.message });
      } else {
        results.push({ path: file.path, status: 'imported' });
      }
    } catch (err) {
      results.push({
        path: file.path,
        status: 'error',
        reason: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  const imported = results.filter((r) => r.status === 'imported').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errors = results.filter((r) => r.status === 'error').length;

  return NextResponse.json({ imported, skipped, errors, details: results });
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/api/executive/bulk-import.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/executive/staging/bulk-import/ __tests__/api/executive/bulk-import.test.ts
git commit -m "feat(executive): add bulk vault import API for knowledge staging"
```

---

### Task 6: Knowledge Ingestion UI — Review Interface

**Files:**

- Create: `app/(dashboard)/org/[orgSlug]/executive/knowledge/ingest/page.tsx`
- Create: `components/Executive/StagingTable.tsx`
- Create: `components/Executive/StagingReviewPanel.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/executive/page.tsx` (placeholder command center)
- Create: `app/(dashboard)/org/[orgSlug]/executive/knowledge/page.tsx` (placeholder)
- Create: `app/(dashboard)/org/[orgSlug]/executive/knowledge/chat/page.tsx` (placeholder)
- Create: `app/(dashboard)/org/[orgSlug]/executive/subscriptions/page.tsx` (placeholder)

**Step 1: Create placeholder pages for all routes**

Each placeholder follows the same pattern — a simple page with title and "Coming soon" message. This ensures navigation works immediately.

```tsx
// app/(dashboard)/org/[orgSlug]/executive/page.tsx
export default function ExecutiveOverviewPage() {
  return (
    <>
      <title>Command Center — KrewPact</title>
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Command Center</h2>
        <p className="text-muted-foreground">Phase 3 — coming after knowledge base is live.</p>
      </div>
    </>
  );
}
```

Create similar placeholders for:

- `executive/knowledge/page.tsx` — "Document Library — Phase 2"
- `executive/knowledge/chat/page.tsx` — "AI Chat — Phase 2"
- `executive/subscriptions/page.tsx` — "Subscriptions — Phase 3"

**Step 2: Build the StagingTable component**

```tsx
// components/Executive/StagingTable.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface StagingDoc {
  id: string;
  title: string;
  source_path: string | null;
  source_type: string;
  category: string | null;
  status: string;
  tags: string[];
  created_at: string;
  reviewed_at: string | null;
}

interface StagingListResponse {
  data: StagingDoc[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  needs_edit: 'bg-orange-100 text-orange-800',
  ingested: 'bg-blue-100 text-blue-800',
};

interface StagingTableProps {
  onSelect: (doc: StagingDoc) => void;
  selectedId?: string;
}

export function StagingTable({ onSelect, selectedId }: StagingTableProps) {
  const [status, setStatus] = useState('pending_review');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.executive.staging.list({ status, page }),
    queryFn: () =>
      apiFetch<StagingListResponse>('/api/executive/staging', {
        params: { status, page, limit: 25 },
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  const docs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="needs_edit">Needs Edit</SelectItem>
            <SelectItem value="ingested">Ingested</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{total} documents</span>
      </div>

      <div className="border rounded-lg divide-y">
        {docs.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No documents found.</div>
        )}
        {docs.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onSelect(doc)}
            className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
              selectedId === doc.id ? 'bg-muted' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {doc.source_path ? doc.source_path.split('/').pop() : doc.source_type}
                  {' · '}
                  {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {doc.category && (
                  <Badge variant="outline" className="text-xs">
                    {doc.category}
                  </Badge>
                )}
                <Badge className={STATUS_COLORS[doc.status] || ''}>
                  {doc.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm py-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Build the StagingReviewPanel component**

```tsx
// components/Executive/StagingReviewPanel.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { CheckCircle, XCircle, Pencil } from 'lucide-react';
import { toast } from '@/lib/toast';

interface StagingDetail {
  id: string;
  title: string;
  raw_content: string;
  edited_content: string | null;
  source_path: string | null;
  source_type: string;
  category: string | null;
  division_id: string | null;
  tags: string[];
  status: string;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface StagingReviewPanelProps {
  docId: string;
}

export function StagingReviewPanel({ docId }: StagingReviewPanelProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [category, setCategory] = useState('');

  const { data: doc, isLoading } = useQuery({
    queryKey: queryKeys.executive.staging.detail(docId),
    queryFn: () => apiFetch<StagingDetail>(`/api/executive/staging/${docId}`),
    enabled: !!docId,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      apiFetch(`/api/executive/staging/${docId}`, { method: 'PATCH', body: updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.executive.staging.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.executive.staging.detail(docId) });
    },
  });

  if (isLoading || !doc) {
    return <Skeleton className="h-96" />;
  }

  const displayContent = doc.edited_content || doc.raw_content;

  const handleApprove = () => {
    updateMutation.mutate(
      {
        status: 'approved',
        review_notes: reviewNotes || 'Approved',
        category: category || doc.category,
      },
      { onSuccess: () => toast.success('Document approved') },
    );
  };

  const handleReject = () => {
    updateMutation.mutate(
      { status: 'rejected', review_notes: reviewNotes || 'Rejected' },
      { onSuccess: () => toast.success('Document rejected') },
    );
  };

  const handleSaveEdit = () => {
    updateMutation.mutate(
      { edited_content: editedContent, status: 'needs_edit', review_notes: reviewNotes },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success('Edits saved');
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{doc.title}</h3>
        <Badge variant="outline">{doc.status.replace('_', ' ')}</Badge>
      </div>

      {doc.source_path && (
        <p className="text-xs text-muted-foreground font-mono">{doc.source_path}</p>
      )}

      <div className="flex gap-3">
        <Select value={category || doc.category || ''} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {[
              'sop',
              'strategy',
              'market',
              'infrastructure',
              'marketing',
              'architecture',
              'analysis',
              'reference',
            ].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {editing ? (
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          rows={20}
          className="font-mono text-sm"
        />
      ) : (
        <div className="border rounded-lg p-4 max-h-[500px] overflow-y-auto bg-muted/30">
          <pre className="whitespace-pre-wrap text-sm">{displayContent}</pre>
        </div>
      )}

      <Textarea
        placeholder="Review notes (optional)"
        value={reviewNotes}
        onChange={(e) => setReviewNotes(e.target.value)}
        rows={2}
      />

      {doc.status === 'pending_review' || doc.status === 'needs_edit' ? (
        <div className="flex gap-2">
          <Button onClick={handleApprove} className="gap-2" disabled={updateMutation.isPending}>
            <CheckCircle className="h-4 w-4" /> Approve
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            className="gap-2"
            disabled={updateMutation.isPending}
          >
            <XCircle className="h-4 w-4" /> Reject
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(!editing);
              setEditedContent(displayContent);
            }}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" /> {editing ? 'Cancel Edit' : 'Edit'}
          </Button>
          {editing && (
            <Button
              variant="secondary"
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              Save Edits
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
```

**Step 4: Build the ingest page**

```tsx
// app/(dashboard)/org/[orgSlug]/executive/knowledge/ingest/page.tsx
'use client';

import { useState } from 'react';
import { StagingTable } from '@/components/Executive/StagingTable';
import { StagingReviewPanel } from '@/components/Executive/StagingReviewPanel';

export default function KnowledgeIngestPage() {
  const [selectedId, setSelectedId] = useState<string | undefined>();

  return (
    <>
      <title>Knowledge Ingestion — KrewPact</title>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Document Queue</h2>
          <StagingTable onSelect={(doc) => setSelectedId(doc.id)} selectedId={selectedId} />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Review</h2>
          {selectedId ? (
            <StagingReviewPanel docId={selectedId} />
          ) : (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
              Select a document to review
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

**Step 5: Commit**

```bash
git add "app/(dashboard)/org/[orgSlug]/executive/" components/Executive/
git commit -m "feat(executive): add knowledge ingestion review UI with staging table and review panel"
```

---

## Phase 2: Knowledge Base Live

### Task 7: Embedding Pipeline — Chunk + Embed on Approval

**Files:**

- Create: `lib/knowledge/embeddings.ts` (chunking + embedding logic)
- Create: `app/api/executive/knowledge/embed/route.ts` (QStash target)
- Test: `__tests__/lib/knowledge/embeddings.test.ts`

**Step 1: Write the failing test**

Test the chunking logic (pure function, no OpenAI call needed):

```typescript
// __tests__/lib/knowledge/embeddings.test.ts
import { describe, it, expect } from 'vitest';
import { chunkDocument } from '@/lib/knowledge/embeddings';

describe('chunkDocument', () => {
  it('returns a single chunk for short documents', () => {
    const chunks = chunkDocument('Short document content.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('Short document content.');
  });

  it('splits long documents into overlapping chunks', () => {
    const longContent = Array(200).fill('word').join(' '); // ~200 words
    const chunks = chunkDocument(longContent, { maxTokens: 50, overlapTokens: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    // Check overlap: last words of chunk N should appear at start of chunk N+1
  });

  it('preserves paragraph boundaries when possible', () => {
    const content = 'Paragraph one content.\n\nParagraph two content.\n\nParagraph three content.';
    const chunks = chunkDocument(content, { maxTokens: 10, overlapTokens: 2 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array for empty content', () => {
    const chunks = chunkDocument('');
    expect(chunks).toHaveLength(0);
  });
});
```

**Step 2: Implement chunking + embedding module**

```typescript
// lib/knowledge/embeddings.ts
interface ChunkOptions {
  maxTokens?: number;
  overlapTokens?: number;
}

// Rough token estimation: ~4 chars per token for English
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkDocument(content: string, options: ChunkOptions = {}): string[] {
  const { maxTokens = 500, overlapTokens = 100 } = options;

  if (!content.trim()) return [];

  const totalTokens = estimateTokens(content);
  if (totalTokens <= maxTokens) return [content.trim()];

  // Split by paragraphs first
  const paragraphs = content.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const combined = currentChunk ? `${currentChunk}\n\n${para}` : para;
    if (estimateTokens(combined) > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      // Overlap: take the last N tokens worth of text
      const overlapChars = overlapTokens * 4;
      const overlap = currentChunk.slice(-overlapChars);
      currentChunk = overlap ? `${overlap}\n\n${para}` : para;
    } else {
      currentChunk = combined;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export async function embedChunks(chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: chunks,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding failed: ${error}`);
  }

  const result = await response.json();
  return result.data.map((d: { embedding: number[] }) => d.embedding);
}
```

**Step 3: Implement the embed API route (QStash target)**

```typescript
// app/api/executive/knowledge/embed/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { chunkDocument, embedChunks } from '@/lib/knowledge/embeddings';
import { verifyCronAuth } from '@/lib/api/cron-auth';

export async function POST(req: NextRequest) {
  // Verify QStash signature or admin auth
  const authResult = await verifyCronAuth(req);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { stagingId } = await req.json();
  if (!stagingId) {
    return NextResponse.json({ error: 'stagingId required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get the staging doc
  const { data: staging, error: fetchError } = await supabase
    .from('knowledge_staging')
    .select('*')
    .eq('id', stagingId)
    .eq('status', 'approved')
    .single();

  if (fetchError || !staging) {
    return NextResponse.json(
      { error: 'Staging document not found or not approved' },
      { status: 404 },
    );
  }

  const content = staging.edited_content || staging.raw_content;

  // Upsert into knowledge_docs
  const { data: doc, error: docError } = await supabase
    .from('knowledge_docs')
    .upsert(
      {
        file_path: staging.source_path || `staging/${staging.id}`,
        title: staging.title,
        category: staging.category,
        division_id: staging.division_id,
        checksum: staging.content_checksum,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'file_path' },
    )
    .select()
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Failed to create knowledge doc' }, { status: 500 });
  }

  // Delete old embeddings for this doc
  await supabase.from('knowledge_embeddings').delete().eq('doc_id', doc.id);

  // Chunk and embed
  const chunks = chunkDocument(content);
  if (chunks.length === 0) {
    // Update staging status
    await supabase.from('knowledge_staging').update({ status: 'ingested' }).eq('id', stagingId);
    return NextResponse.json({ doc_id: doc.id, chunks: 0 });
  }

  const embeddings = await embedChunks(chunks);

  // Insert embeddings
  const rows = chunks.map((chunk, i) => ({
    doc_id: doc.id,
    chunk_index: i,
    content: chunk,
    embedding: `[${embeddings[i].join(',')}]`,
  }));

  const { error: insertError } = await supabase.from('knowledge_embeddings').insert(rows);
  if (insertError) {
    return NextResponse.json({ error: 'Failed to store embeddings' }, { status: 500 });
  }

  // Update staging status
  await supabase.from('knowledge_staging').update({ status: 'ingested' }).eq('id', stagingId);

  return NextResponse.json({ doc_id: doc.id, chunks: chunks.length });
}
```

**Step 4: Run tests, commit**

```bash
npx vitest run __tests__/lib/knowledge/
git add lib/knowledge/ app/api/executive/knowledge/ __tests__/lib/knowledge/
git commit -m "feat(executive): add document chunking, embedding pipeline, and QStash embed endpoint"
```

---

### Task 8: Semantic Search API

**Files:**

- Create: `app/api/executive/knowledge/search/route.ts`
- Test: `__tests__/api/executive/knowledge-search.test.ts`

The search endpoint accepts a text query, embeds it, then does a pgvector similarity search against `knowledge_embeddings`, returning the top-K matching documents with relevance scores.

**Key implementation details:**

- Embed the query using the same ada-002 model
- Use Supabase RPC function `match_knowledge` (create via migration) or raw SQL via `.rpc()`
- Return `{ results: [{ doc_id, title, category, chunk_content, similarity }] }`
- Rate limit: 10/min per user

**Migration addition (add to existing migration or new one):**

```sql
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
) RETURNS TABLE (
  id uuid,
  doc_id uuid,
  content text,
  chunk_index int,
  similarity float
) LANGUAGE sql STABLE AS $$
  SELECT
    ke.id,
    ke.doc_id,
    ke.content,
    ke.chunk_index,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings ke
  WHERE 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

**Commit after implementation + tests pass.**

---

### Task 9: Knowledge Document Library UI

**Files:**

- Update: `app/(dashboard)/org/[orgSlug]/executive/knowledge/page.tsx`
- Create: `components/Executive/KnowledgeSearch.tsx`
- Create: `components/Executive/DocumentViewer.tsx`

Build the searchable document library:

- Search bar that calls `/api/executive/knowledge/search`
- Category/division filter sidebar
- Document list with markdown preview
- Click into a full document viewer (rendered markdown via `react-markdown`)

**Commit after implementation.**

---

### Task 10: AI Chat Interface

**Files:**

- Create: `app/api/executive/knowledge/chat/route.ts`
- Update: `app/(dashboard)/org/[orgSlug]/executive/knowledge/chat/page.tsx`
- Create: `components/Executive/ChatInterface.tsx`

The chat endpoint:

1. Takes user message
2. Embeds it, searches knowledge base for relevant chunks
3. Builds a prompt with retrieved context + conversation history
4. Calls OpenAI (or Google AI SDK per project stack) for response
5. Stores message + response in `ai_chat_sessions` / `ai_chat_messages`
6. Returns response with source citations

**Commit after implementation + tests pass.**

---

## Phase 3: Command Center

### Task 11: Executive Alerts API

**Files:**

- Create: `app/api/executive/alerts/route.ts`
- Test: `__tests__/api/executive/alerts.test.ts`

Queries across existing tables with threshold logic:

- Opportunities with no activity > 14 days
- Projects with health score < 40%
- Staging docs pending > threshold
- Subscriptions renewing within 7 days

Returns `{ alerts: [{ type, severity, title, description, link, created_at }] }`

**Commit after implementation + tests pass.**

---

### Task 12: Metrics Cache + QStash Refresh

**Files:**

- Create: `app/api/executive/metrics/refresh/route.ts` (QStash cron target)
- Create: `app/api/executive/overview/route.ts` (serves cached metrics)
- Create: `lib/executive/metrics.ts` (computation logic)
- Test: `__tests__/lib/executive/metrics.test.ts`

Computes and caches:

- `pipeline_summary` — total value, stage counts, velocity
- `project_portfolio` — active count, health distribution, division breakdown
- `estimating_velocity` — open bids, hit rate, avg margin
- `division_scorecards` — per-division aggregation
- `backlog_forecast` — contracted value minus invoiced (requires ERPNext data)

**Commit after implementation + tests pass.**

---

### Task 13: Subscriptions CRUD API

**Files:**

- Create: `app/api/executive/subscriptions/route.ts` (GET list, POST create)
- Create: `app/api/executive/subscriptions/[id]/route.ts` (PATCH, DELETE)
- Test: `__tests__/api/executive/subscriptions.test.ts`

Standard CRUD following the same auth/RLS pattern as staging API.

**Commit after implementation + tests pass.**

---

### Task 14: Command Center Overview UI

**Files:**

- Update: `app/(dashboard)/org/[orgSlug]/executive/page.tsx`
- Create: `components/Executive/AlertsRibbon.tsx`
- Create: `components/Executive/FinancialPulse.tsx`
- Create: `components/Executive/BacklogForecast.tsx`
- Create: `components/Executive/DivisionScorecard.tsx`
- Create: `components/Executive/SubscriptionTracker.tsx`
- Create: `components/Executive/MarketIntelWidget.tsx`

Build the 10-widget overview page. Reuse existing `KPICard`, `PipelineChart`, `ProjectHealthCard` from `components/Dashboard/`.

Layout:

```
┌─────────────────────────────────────────────┐
│ [Alerts Ribbon — full width, scrollable]    │
├──────────┬──────────┬──────────┬────────────┤
│ Pipeline │ Active   │ Win Rate │ Avg Deal   │
│ Value    │ Projects │          │ Size       │
├──────────┴──────────┴──────────┴────────────┤
│ [Pipeline Chart]     │ [Backlog Forecast]   │
├──────────────────────┼──────────────────────┤
│ [Division Scorecards — 6 cards, 3x2 grid]  │
├──────────────────────┼──────────────────────┤
│ [Subscription Tracker] │ [Market Intel]     │
└──────────────────────┴──────────────────────┘
```

**Commit after implementation.**

---

### Task 15: Executive Sub-Pages

**Files:**

- Update: `app/(dashboard)/org/[orgSlug]/executive/subscriptions/page.tsx`
- Create: `components/Executive/SubscriptionTable.tsx`
- Create: `components/Executive/SubscriptionForm.tsx`

Build the subscriptions management page with add/edit/deactivate. TanStack Table with sorting/filtering.

**Commit after implementation.**

---

## Phase 4: Polish

### Task 16: Division Comparison View

Add a division selector/comparison toggle to the command center layout. When two divisions are selected, show metrics side-by-side.

### Task 17: Mobile Responsive Executive Layout

Ensure all executive pages work well on tablet/mobile. Stack widgets vertically, collapsible nav.

### Task 18: Backlog Forecast Charting

Add Recharts area chart showing projected revenue by quarter based on signed contracts + weighted pipeline.

---

## Migration to Existing Executive Dashboard

The current `/dashboard/executive` page should redirect to `/executive` once Phase 3 is complete. Add a redirect in the existing page:

```typescript
// app/(dashboard)/org/[orgSlug]/dashboard/executive/page.tsx
import { redirect } from 'next/navigation';
export default function LegacyExecutiveDashboard({ params }: { params: { orgSlug: string } }) {
  redirect(`/org/${params.orgSlug}/executive`);
}
```

---

## Environment Variables Required

Add to `.env.local`:

```
OPENAI_API_KEY=sk-...          # For ada-002 embeddings
QSTASH_TOKEN=...               # Already configured
QSTASH_CURRENT_SIGNING_KEY=... # Already configured
```

## Summary

| Phase                   | Tasks  | New Files | Tests              |
| ----------------------- | ------ | --------- | ------------------ |
| Phase 1: Foundation     | 1-6    | ~15       | ~4 test files      |
| Phase 2: Knowledge      | 7-10   | ~8        | ~3 test files      |
| Phase 3: Command Center | 11-15  | ~12       | ~4 test files      |
| Phase 4: Polish         | 16-18  | ~4        | ~1 test file       |
| **Total**               | **18** | **~39**   | **~12 test files** |
