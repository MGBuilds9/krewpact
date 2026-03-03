# MDM Ecosystem Consolidation & KrewPact Foundation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate the MDM ecosystem from 6+ scattered repos into a clean 3-system architecture, then scaffold KrewPact properly as a git-tracked Next.js project ready for Phase 1 development.

**Architecture:** Three systems: KrewPact (operations nucleus), MDM-Website-V2 (public marketing), MDM-Book-Internal (strategic intelligence). LeadForge merges into KrewPact. Hub, old Website, and strategy-2026 get archived. KrewPact app shell already exists with Next.js 16, Clerk, Supabase, shadcn/ui — needs git init and proper structure.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Clerk auth, Supabase (Postgres + RLS), shadcn/ui, Tailwind CSS, Vitest, Playwright

---

## Part 1: MDM Ecosystem Consolidation (Repo Cleanup)

### Task 1: Archive MDM-LeadForge

**Files:**

- Modify: `/Users/mkgbuilds/Sites/Local Development/MDM-LeadForge/README.md`

**Step 1: Read current README**

Read `/Users/mkgbuilds/Sites/Local Development/MDM-LeadForge/README.md` to confirm current content.

**Step 2: Add archive header to README**

Prepend to `README.md`:

```markdown
# [ARCHIVED] MDM LeadForge

> **This repository has been archived.** LeadForge functionality has been fully merged into [KrewPact](../krewpact/krewpact/). All CRM, lead scoring, outreach automation, and enrichment features now live in KrewPact's unified schema.
>
> **Archive date:** February 12, 2026
> **Successor:** KrewPact — `KrewPact-Backend-SQL-Schema-Draft.sql` contains all LeadForge tables (lead_scoring_rules, outreach_sequences, enrichment_jobs, etc.)

---
```

Keep the rest of the existing README intact below the header.

**Step 3: Commit the archive marker**

```bash
cd "/Users/mkgbuilds/Sites/Local Development/MDM-LeadForge"
git add README.md
git commit -m "docs: mark LeadForge as archived — merged into KrewPact

LeadForge CRM, lead scoring, outreach automation, and enrichment
features are now part of KrewPact's unified schema.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Move mdm-strategy-2026 Content to Book-Internal

**Files:**

- Read: `/Users/mkgbuilds/Sites/Local Development/mdm-strategy-2026/index.html`
- Create: `/Users/mkgbuilds/Sites/Local Development/MDM-Book-Internal/assets/strategy/index.html`

**Step 1: Copy strategy HTML to Book-Internal**

```bash
mkdir -p "/Users/mkgbuilds/Sites/Local Development/MDM-Book-Internal/assets/strategy"
cp "/Users/mkgbuilds/Sites/Local Development/mdm-strategy-2026/index.html" \
   "/Users/mkgbuilds/Sites/Local Development/MDM-Book-Internal/assets/strategy/index.html"
```

**Step 2: Commit in Book-Internal**

```bash
cd "/Users/mkgbuilds/Sites/Local Development/MDM-Book-Internal"
git add assets/strategy/index.html
git commit -m "docs: absorb mdm-strategy-2026 into strategic intelligence

Moved the 2026 growth strategy HTML into assets/strategy/.
Source repo (mdm-strategy-2026) was a single-file, non-git directory.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**Step 3: Rename the source directory to mark it archived**

```bash
mv "/Users/mkgbuilds/Sites/Local Development/mdm-strategy-2026" \
   "/Users/mkgbuilds/Sites/Local Development/mdm-strategy-2026-ARCHIVED"
```

---

### Task 3: Verify MDM-Website Status & Archive

**Files:**

- Read: `/Users/mkgbuilds/Sites/Local Development/MDM-Website/MDM-Website/` contents

**Step 1: Inspect the nested directory**

```bash
ls -la "/Users/mkgbuilds/Sites/Local Development/MDM-Website/MDM-Website/"
```

This is the original Payload CMS site, superseded by mdm-website-v2.

**Step 2: If it's the old site, rename directory to mark archived**

```bash
mv "/Users/mkgbuilds/Sites/Local Development/MDM-Website" \
   "/Users/mkgbuilds/Sites/Local Development/MDM-Website-ARCHIVED"
```

---

### Task 4: Update INDEX.md

**Files:**

- Modify: `/Users/mkgbuilds/Sites/Local Development/INDEX.md`

**Step 1: Read current INDEX.md**

Read `/Users/mkgbuilds/Sites/Local Development/INDEX.md`.

**Step 2: Replace with consolidated architecture**

```markdown
# Local Development - Index

Purpose: Quick map of local projects. Updated Feb 12, 2026.

Workspace file: Blueprint-Architect.code-workspace

---

## MDM Ecosystem (3 Active Systems)

- **krewpact/** — Operations nucleus. CRM, projects, portals, AI, RBAC dashboards. (Next.js + Supabase + Clerk + ERPNext)
- **mdm-website-v2/** — Public marketing site at mdmcontracting.ca. (Payload CMS + Neon Postgres + Vercel)
- **MDM-Book-Internal/** — Admin strategic intelligence. Dashboard + Portal on Cloudflare Pages. 100+ markdown docs.

## MDM Archived

- MDM-Hub/ — [ARCHIVED] Superseded by KrewPact (Feb 12, 2026)
- MDM-LeadForge/ — [ARCHIVED] Merged into KrewPact CRM (Feb 12, 2026)
- MDM-Website-ARCHIVED/ — [ARCHIVED] Replaced by mdm-website-v2
- mdm-strategy-2026-ARCHIVED/ — [ARCHIVED] Moved to MDM-Book-Internal/assets/strategy/

## MKG Builds

- mkg-builds-dash/ — Personal command center (Next.js + Supabase + Vercel)
- mkg-builds-website/ — MKG Builds business site
- synthesis-by-mkg/ — AI knowledge assistant

## Client Projects

- certusrx/ — PEBC pharmacy exam prep (Next.js + Supabase)
- DGTL-diet-tracker/ — Diet tracking app (Next.js + SQLite)
- art-by-natalienicola/ — Art portfolio site
- dgtl-studios-website/ — DGTL Studios website
- michael-guirguis-portfolio/ — Personal portfolio site

## Infrastructure & Tools

- n8n/ — Local n8n automation workflows
- n8n-chat-interface-kimi2.5/ — n8n chat UI
- claude-code-setup/ — Claude Code configuration
- skills/ — Claude Code skills library
- ralph-setup/ — Ralph automation setup

## Reference

- tech-stacks-2026/ — Technology stack reference docs
- plans/ — Planning documents
- sources/ — Source materials
- Idea-Refinery/ — Knowledge management system
- MKG-Subs/ — Subsy subscriptions app (Supabase)
```

**Step 3: Commit INDEX.md**

```bash
cd "/Users/mkgbuilds/Sites/Local Development"
# INDEX.md is not in a git repo (parent dir), so this is just a local file update.
# No git commit needed — it's a local reference file.
```

---

### Task 5: Update Root CLAUDE.md Pending Section

**Files:**

- Modify: `/Users/mkgbuilds/CLAUDE.md`

**Step 1: Read current CLAUDE.md**

Read the Pending section of `/Users/mkgbuilds/CLAUDE.md`.

**Step 2: Update Pending section**

Replace the current Pending section with:

```markdown
## Pending

- [ ] **KrewPact Phase 1:** Git init app shell, Supabase schema migration, Clerk JWT bridge, RBAC, app shell with tests, CI/CD
- [ ] **KrewPact Phase 2:** CRM module (LeadForge replacement) + Estimating
- [ ] Synthesis: Phase 1 — strip app, new schema, chat UI, wire Craft MCPs
- [ ] Synthesis: Set Vercel env vars + wire auth
- [ ] MKG Dashboard: n8n webhooks + API tokens (deployed on Vercel, clean Vercel env var trailing newline)
- [ ] Certus Rx: Deploy to Vercel
- [ ] MDM Website v2: Set Vercel env vars (PAYLOAD_SECRET, RESEND_API_KEY, RECAPTCHA keys, CONTACT_EMAIL)
- [ ] MDM Hub: Test SSO users, OG image, ERPNext planning
```

**Step 3: Commit**

```bash
cd /Users/mkgbuilds
git add CLAUDE.md
git commit -m "docs: update pending items — consolidate MDM under KrewPact

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Part 2: KrewPact Git Init & Project Structure

### Task 6: Consolidate KrewPact Directory Structure

The current layout has a problem:

- `.../krewpact/` = app shell (NOT in git)
- `.../krewpact/krewpact/` = planning pack (IS in git)

We need ONE git repo with both app code and planning docs.

**Files:**

- Move planning docs into app shell
- Git init the app shell

**Step 1: Move planning docs into app shell's docs/ directory**

```bash
cd "/Users/mkgbuilds/Sites/Local Development/krewpact"

# Create docs directory in the app shell
mkdir -p docs/plans docs/architecture

# Move planning documents from nested krewpact/ to docs/
cp krewpact/KrewPact-Architecture-Resolution.md docs/architecture/
cp krewpact/KrewPact-Master-Plan.md docs/architecture/
cp krewpact/KrewPact-Backend-SQL-Schema-Draft.sql docs/architecture/
cp krewpact/KrewPact-Technology-Stack-ADRs.md docs/architecture/
cp krewpact/KrewPact-Feature-Function-PRD-Checklist.md docs/architecture/
cp krewpact/KrewPact-Access-and-Workflow-Plan.md docs/architecture/
cp krewpact/KrewPact-Integration-Contracts.md docs/architecture/
cp krewpact/KrewPact-Infrastructure-and-Deployment.md docs/architecture/
cp krewpact/KrewPact-Product-Vision-and-Strategy.md docs/architecture/
cp krewpact/KrewPact-Security-and-Compliance-Framework.md docs/architecture/
cp krewpact/KrewPact-Licensing-and-Legal-Audit.md docs/architecture/
cp krewpact/KrewPact-Cost-and-Vendor-Analysis.md docs/architecture/
cp krewpact/KrewPact-DevOps-and-CI-CD.md docs/architecture/
cp krewpact/KrewPact-Monitoring-and-Observability.md docs/architecture/
cp krewpact/KrewPact-Execution-Board.md docs/architecture/
cp krewpact/KrewPact-Forms-Registry.md docs/architecture/
cp krewpact/KrewPact-ERPNext-Doctype-Field-Mapping.md docs/architecture/
cp krewpact/KrewPact-API-Acceptance-and-Test-Matrix.md docs/architecture/
cp krewpact/ANALYSIS-MANIFEST.txt docs/architecture/

# Copy this plan
cp krewpact/docs/plans/2026-02-12-mdm-consolidation-and-krewpact-foundation.md docs/plans/
```

**Step 2: Copy CLAUDE.md from planning pack to app root**

```bash
cp krewpact/CLAUDE.md ./CLAUDE.md
```

**Step 3: Copy README from planning pack to app root**

```bash
cp krewpact/README.md ./README.md
```

---

### Task 7: Git Init KrewPact App Shell

**Files:**

- Create: `/Users/mkgbuilds/Sites/Local Development/krewpact/.gitignore`
- Init git repo

**Step 1: Create .gitignore**

If one doesn't exist, create it with standard Next.js entries. Check first:

```bash
cat "/Users/mkgbuilds/Sites/Local Development/krewpact/.gitignore" 2>/dev/null || echo "MISSING"
```

If missing, create with:

```
# dependencies
node_modules/
.pnp/
.pnp.js

# next.js
.next/
out/

# testing
coverage/

# env files
.env
.env.local
.env.*.local

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# turbo
.turbo

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# old planning pack (now in docs/)
/krewpact/

# legacy
/dashboard.html
```

**Step 2: Init git and create initial commit**

```bash
cd "/Users/mkgbuilds/Sites/Local Development/krewpact"
git init
git add .gitignore CLAUDE.md README.md
git add package.json package-lock.json
git add tsconfig.json next.config.ts postcss.config.mjs tailwind.config.ts eslint.config.mjs
git add components.json middleware.ts
git add app/ components/ contexts/ hooks/ lib/ __tests__/ public/
git add docs/
git commit -m "feat: initial commit — KrewPact app shell + architecture docs

Next.js 16 + React 19 + TypeScript + Clerk + Supabase + shadcn/ui.
Includes all planning docs from architecture review (Feb 2026).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**Step 3: Create GitHub repo and push**

```bash
cd "/Users/mkgbuilds/Sites/Local Development/krewpact"
gh repo create krewpact --private --source=. --push
```

---

### Task 8: Create KrewPact .env.local Template

**Files:**

- Create: `/Users/mkgbuilds/Sites/Local Development/krewpact/.env.example`

**Step 1: Create .env.example with all required vars**

```env
# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=

# === Clerk ===
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# === ERPNext (via Cloudflare Tunnel) ===
ERPNEXT_BASE_URL=
ERPNEXT_API_KEY=
ERPNEXT_API_SECRET=

# === Upstash Redis ===
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# === App ===
NEXT_PUBLIC_APP_URL=http://localhost:3000
WEBHOOK_SIGNING_SECRET=
```

**Step 2: Commit**

```bash
cd "/Users/mkgbuilds/Sites/Local Development/krewpact"
git add .env.example
git commit -m "chore: add .env.example with all MVP service vars

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Verify App Shell Builds & Tests Pass

**Step 1: Run typecheck**

```bash
cd "/Users/mkgbuilds/Sites/Local Development/krewpact"
npm run typecheck
```

Expected: PASS (or known issues to fix)

**Step 2: Run lint**

```bash
npm run lint
```

Expected: PASS (or known issues to fix)

**Step 3: Run existing tests**

```bash
npm run test
```

Expected: PASS. If tests fail, fix them before proceeding.

**Step 4: Run build**

```bash
npm run build
```

Expected: PASS. Note any env var warnings — those are expected without `.env.local`.

---

### Task 10: Write Supabase Client Library Tests

**Files:**

- Create: `/Users/mkgbuilds/Sites/Local Development/krewpact/__tests__/lib/supabase/client.test.ts`
- Verify: `/Users/mkgbuilds/Sites/Local Development/krewpact/lib/supabase/` exists or needs creation

**Step 1: Check what exists in lib/**

```bash
ls -la "/Users/mkgbuilds/Sites/Local Development/krewpact/lib/"
```

**Step 2: Write failing test for Supabase browser client**

```typescript
// __tests__/lib/supabase/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env vars
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

describe('Supabase browser client', () => {
  it('exports createBrowserClient function', async () => {
    const mod = await import('@/lib/supabase/client');
    expect(mod.createBrowserClient).toBeDefined();
    expect(typeof mod.createBrowserClient).toBe('function');
  });

  it('returns a Supabase client instance', async () => {
    const { createBrowserClient } = await import('@/lib/supabase/client');
    const client = createBrowserClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npm run test -- __tests__/lib/supabase/client.test.ts
```

Expected: FAIL — module not found.

**Step 4: Implement browser client**

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseAnonKey);
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test -- __tests__/lib/supabase/client.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add lib/supabase/client.ts __tests__/lib/supabase/client.test.ts
git commit -m "feat: add Supabase browser client with tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Write ERPNext Client Library Tests

**Files:**

- Create: `/Users/mkgbuilds/Sites/Local Development/krewpact/__tests__/lib/erp/client.test.ts`
- Create: `/Users/mkgbuilds/Sites/Local Development/krewpact/lib/erp/client.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/erp/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubEnv('ERPNEXT_BASE_URL', 'https://erp.test.com');
vi.stubEnv('ERPNEXT_API_KEY', 'test-key');
vi.stubEnv('ERPNEXT_API_SECRET', 'test-secret');

describe('ERPNext client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exports ErpClient class', async () => {
    const mod = await import('@/lib/erp/client');
    expect(mod.ErpClient).toBeDefined();
  });

  it('constructs with env vars', async () => {
    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    expect(client).toBeDefined();
  });

  it('builds correct auth header', async () => {
    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    const headers = client.getAuthHeaders();
    expect(headers['Authorization']).toBe('token test-key:test-secret');
  });

  it('builds correct URL for doctype', async () => {
    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    const url = client.getResourceUrl('Customer', 'CUST-001');
    expect(url).toBe('https://erp.test.com/api/resource/Customer/CUST-001');
  });

  it('encodes document names with special characters', async () => {
    const { ErpClient } = await import('@/lib/erp/client');
    const client = new ErpClient();
    const url = client.getResourceUrl('Customer', 'MDM Group / Inc');
    expect(url).toContain(encodeURIComponent('MDM Group / Inc'));
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- __tests__/lib/erp/client.test.ts
```

Expected: FAIL

**Step 3: Implement ERPNext client**

```typescript
// lib/erp/client.ts

export class ErpClient {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.baseUrl = process.env.ERPNEXT_BASE_URL!;
    this.apiKey = process.env.ERPNEXT_API_KEY!;
    this.apiSecret = process.env.ERPNEXT_API_SECRET!;
  }

  getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `token ${this.apiKey}:${this.apiSecret}`,
      'Content-Type': 'application/json',
    };
  }

  getResourceUrl(doctype: string, name?: string): string {
    const base = `${this.baseUrl}/api/resource/${doctype}`;
    if (name) {
      return `${base}/${encodeURIComponent(name)}`;
    }
    return base;
  }

  async get<T>(doctype: string, name: string): Promise<T> {
    const url = this.getResourceUrl(doctype, name);
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`ERPNext API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return json.data as T;
  }

  async list<T>(
    doctype: string,
    filters?: Record<string, unknown>,
    fields?: string[],
    limit?: number,
  ): Promise<T[]> {
    const params = new URLSearchParams();
    if (filters) params.set('filters', JSON.stringify(filters));
    if (fields) params.set('fields', JSON.stringify(fields));
    if (limit) params.set('limit_page_length', String(limit));

    const url = `${this.getResourceUrl(doctype)}?${params.toString()}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`ERPNext API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return json.data as T[];
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test -- __tests__/lib/erp/client.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add lib/erp/client.ts __tests__/lib/erp/client.test.ts
git commit -m "feat: add ERPNext API client with auth and URL building

Token auth, resource URL builder with encoding,
get/list methods with filters.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 12: Write Supabase Server Client (with Clerk JWT)

**Files:**

- Create: `/Users/mkgbuilds/Sites/Local Development/krewpact/__tests__/lib/supabase/server.test.ts`
- Create: `/Users/mkgbuilds/Sites/Local Development/krewpact/lib/supabase/server.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/supabase/server.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');

describe('Supabase server client', () => {
  it('exports createServerClient function', async () => {
    const mod = await import('@/lib/supabase/server');
    expect(mod.createServerClient).toBeDefined();
    expect(typeof mod.createServerClient).toBe('function');
  });

  it('exports createServiceClient function', async () => {
    const mod = await import('@/lib/supabase/server');
    expect(mod.createServiceClient).toBeDefined();
    expect(typeof mod.createServiceClient).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- __tests__/lib/supabase/server.test.ts
```

Expected: FAIL

**Step 3: Implement server clients**

```typescript
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

/**
 * Creates a Supabase client authenticated with the current Clerk user's JWT.
 * RLS policies see the krewpact_user_id, divisions, and roles from JWT claims.
 */
export async function createServerClient() {
  const { getToken } = await auth();
  const token = await getToken({ template: 'supabase' });

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );
}

/**
 * Creates a Supabase client with service role key.
 * Bypasses RLS — use only for admin/system operations.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    },
  );
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test -- __tests__/lib/supabase/server.test.ts
```

Expected: PASS (may need to mock @clerk/nextjs/server)

**Step 5: Commit**

```bash
git add lib/supabase/server.ts __tests__/lib/supabase/server.test.ts
git commit -m "feat: add Supabase server clients — Clerk JWT bridge + service role

createServerClient() uses Clerk JWT for RLS.
createServiceClient() uses service role for admin ops.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 13: Create Supabase Migration — Foundation Tables

**Files:**

- Create: `/Users/mkgbuilds/Sites/Local Development/krewpact/supabase/migrations/00001_foundation.sql`

This creates ONLY the Phase 1 foundation tables (not the full 1800-line schema). Start minimal.

**Step 1: Create supabase migrations directory**

```bash
mkdir -p "/Users/mkgbuilds/Sites/Local Development/krewpact/supabase/migrations"
```

**Step 2: Write foundation migration**

Extract from `KrewPact-Backend-SQL-Schema-Draft.sql` only:

- Enums needed for foundation (division_code, role_key, etc.)
- `divisions` table + seed data
- `users` table
- `roles` table + seed data
- `user_roles` table
- `user_divisions` table
- `audit_logs` table
- Required functions (set_updated_at, write_audit_log)
- Indexes and triggers for these tables only

This is approximately the first 200 lines of the full schema.

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add foundation migration — users, roles, divisions, audit

Phase 1 tables only. Full schema applied incrementally per phase.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 14: Set Up Vitest Configuration

**Files:**

- Verify/Create: `/Users/mkgbuilds/Sites/Local Development/krewpact/vitest.config.ts`

**Step 1: Check if vitest config exists**

```bash
cat "/Users/mkgbuilds/Sites/Local Development/krewpact/vitest.config.ts" 2>/dev/null || echo "MISSING"
```

**Step 2: Create vitest config if missing**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

**Step 3: Create test setup file**

```typescript
// __tests__/setup.ts
import '@testing-library/jest-dom/vitest';
```

**Step 4: Run all tests**

```bash
npm run test
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add vitest.config.ts __tests__/setup.ts
git commit -m "chore: configure Vitest with jsdom, path aliases, and setup

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 15: Set Up GitHub Actions CI

**Files:**

- Create: `/Users/mkgbuilds/Sites/Local Development/krewpact/.github/workflows/ci.yml`

**Step 1: Create CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type Check
        run: npm run typecheck

      - name: Unit Tests
        run: npm run test

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_placeholder
          NEXT_PUBLIC_APP_URL: http://localhost:3000
```

**Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions pipeline — lint, typecheck, test, build

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 16: Push Everything & Verify

**Step 1: Run pre-push-gate**

Use `/pre-push-gate` to verify everything is clean.

**Step 2: Push to GitHub**

```bash
cd "/Users/mkgbuilds/Sites/Local Development/krewpact"
git push -u origin main
```

**Step 3: Verify CI passes on GitHub**

```bash
gh run list --limit 1
```

---

## Verification Checklist

After all tasks complete:

1. [ ] MDM-LeadForge README has `[ARCHIVED]` header
2. [ ] mdm-strategy-2026 content moved to Book-Internal, source renamed
3. [ ] MDM-Website renamed to MDM-Website-ARCHIVED
4. [ ] INDEX.md reflects 3-system architecture
5. [ ] Root CLAUDE.md Pending section updated
6. [ ] KrewPact is a git repo with all planning docs in `docs/`
7. [ ] KrewPact has .env.example with all MVP vars
8. [ ] KrewPact typecheck, lint, and tests pass
9. [ ] Supabase browser + server clients exist with tests
10. [ ] ERPNext client exists with tests
11. [ ] Foundation migration exists (users, roles, divisions)
12. [ ] Vitest configured with jsdom and path aliases
13. [ ] GitHub Actions CI pipeline created
14. [ ] Pushed to GitHub, CI green
