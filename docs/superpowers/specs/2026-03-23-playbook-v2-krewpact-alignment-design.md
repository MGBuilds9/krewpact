# Design Spec: MKG Builds Playbook v2 + KrewPact Alignment

**Date:** 2026-03-23
**Status:** Draft
**Scope:** Two-phase project — generic playbook upgrade, then KrewPact alignment

---

## Context

The MKG-Builds-Dev-Playbook is a reusable CLAUDE.md template for all MKG Builds projects. KrewPact (construction ops platform, 344 API routes, 4,306 tests, 118 pages) is the most mature project and has battle-tested patterns not captured in the playbook. The playbook also has gaps vs. 2026 best practices.

**Goals:**

1. Upgrade the playbook to a gold-standard template incorporating KrewPact learnings + 2026 research
2. Align KrewPact's docs, dev environment, and production readiness to the new standard
3. Get KrewPact to a state where real MDM Group users can join and use the app

---

## Phase 1: Playbook v2

### Deliverable

Rewrite `MKG-Builds-Dev-Playbook/CLAUDE.md` with the following structure:

### 1.1 — Section: Project Identity (customize per project)

```markdown
# Project: [APP_NAME]

> Auto-generated from MKG Production App Playbook v2. Customize per-project.

## Stack

- **Framework**: Next.js 16+ (App Router, React 19, Server Components)
- **Database**: Supabase (Postgres + RLS + Realtime)
- **Auth**: Clerk (Third-Party Auth → Supabase RLS)
- **Styling**: Tailwind CSS + shadcn/ui (New York style)
- **Validation**: Zod 4 (shared client + server schemas)
- **Forms**: React Hook Form + @hookform/resolvers
- **Testing**: Vitest + Testing Library
- **Monitoring**: Sentry (@sentry/nextjs)
- **Deploy**: Vercel (client-facing) or Docker + Coolify (internal tools)
```

### 1.2 — Section: Build / Test / Lint

Same as v1 — these commands are proven. Add:

- `npm run test:coverage` for coverage report
- `npm run health` for production health check script
- `npm run format:check` for CI

### 1.3 — Section: Architecture Rules

**Keep from v1:**

- Server Components default, `'use client'` only when needed
- Project structure with `_components/` and `_lib/` co-location
- Data fetching reads in Server Components, writes via Server Actions
- Webhooks via Route Handlers

**Add from KrewPact:**

- Feature-based route grouping: `app/(dashboard)/`, `app/(auth)/`, `app/(portal)/`
- API routes as BFF layer — aggregate, transform, authorize
- Queue processing pattern (QStash → serverless webhook endpoint)
- `lib/` structure: `erp/`, `supabase/`, `validators/`, `queue/`, services per domain
- `hooks/` for all React Query hooks, domain-grouped
- `components/` organized by domain (CRM/, Projects/, Layout/) not by type

**Add from research:**

- `proxy.ts` replaces `middleware.ts` (Next.js 16)
- All `params`, `searchParams`, `cookies()`, `headers()` must be `await`ed
- `'use cache'` directive for explicit caching (no implicit fetch cache)
- `src/` prefix is optional — document which convention the project uses

### 1.4 — Section: Security

**Keep from v1:**

- Server Actions as public HTTP endpoints — Zod validate, auth check, authz check
- Server Action pattern template with full example

**Add from KrewPact:**

- Security headers in `next.config.ts`: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy
- Rate limiting pattern (Upstash Redis with circuit breaker fail-open)
- Never expose raw DB errors to clients
- Webhook signature verification pattern

**Add from research:**

- CSP nonces via proxy.ts for SSR pages
- Minimum safe Next.js version tracking (CVE-2025-55184, CVE-2025-66478)
- Node.js 24 OpenSSL 3.5 — sub-2048-bit RSA keys rejected

### 1.5 — Section: Auth Pattern (Clerk + Supabase)

**Replace v1's Supabase Auth pattern with:**

```typescript
// Server-side: lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

export async function createUserClient() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) throw new Error('No Clerk session');

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

**Recommended for new projects** — use the `accessToken()` pattern (requires Supabase configured as Clerk Third-Party Auth provider):

```typescript
// Cleaner pattern (new projects)
export async function createUserClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    async accessToken() {
      const { getToken } = await auth();
      return (await getToken()) ?? undefined;
    },
  });
}
```

Both patterns work identically for RLS. Existing projects using the manual header pattern don't need to migrate — it's a cosmetic improvement, not a security fix.

**RLS pattern:**

- Custom claims in Clerk `public_metadata` → surfaced in session `metadata`
- RLS reads `auth.jwt() -> 'metadata' ->> 'claim_name'`
- Never use `auth.uid()` — use Clerk user ID from metadata
- Service client bypasses RLS — server-only, never in client code
- Deny-by-default: tables with no policies block all access

### 1.6 — Section: Quality Gates (ESLint + Testing)

**Extract from KrewPact's proven config:**

```javascript
// ESLint flat config pattern
rules: {
  'no-console': ['error', { allow: ['warn', 'error'] }],
  '@typescript-eslint/no-explicit-any': 'error',
  'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['warn', { max: 80 }],
  complexity: ['warn', { max: 15 }],
  'max-depth': ['warn', { max: 4 }],
  'max-params': ['warn', { max: 4 }],
  'simple-import-sort/imports': 'warn',
}
// Exemptions: components/ui/**, __tests__/**, scripts/**
```

**Testing:**

- Vitest with jsdom environment
- Coverage thresholds: lines 60%, branches 50% (adjust per project maturity)
- Tests in `__tests__/` mirroring source structure
- Mock helpers for auth (Clerk) and DB (Supabase)
- RLS tests as a separate category

### 1.7 — Section: Feature Flags

**Extract from KrewPact's pattern:**

```typescript
// lib/feature-flags.ts
export const features = {
  new_feature: false, // runbook: docs/runbooks/new-feature.md
} as const;

// Usage: isFeatureEnabled('new_feature')
// Nav items check flags — hidden features = invisible nav
// Pages behind disabled flags show <FeatureGate> component
```

**Rules:**

- Every new feature added as `false` by default
- Enabled only after: code complete + tested with real data + UX reviewed
- Feature flag checked in nav, page, AND API route
- No "Coming Soon" or placeholder text in user-facing UI

### 1.8 — Section: Production Hardening

**Extract from KrewPact's rules:**

- Never show raw IDs, UUIDs, or technical jargon to users
- Never use `window.prompt()` or `window.confirm()` — use Dialog components
- Always add loading skeletons, never "Loading..." text
- Error boundaries on every route segment
- Structured error responses from all API routes
- Log with structured logger, never `console.log`
- Service health check endpoint (`/api/health`)

### 1.9 — Section: CI/CD Template

**Extract from KrewPact + upgrade:**

```yaml
# .github/workflows/ci.yml
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: 24, cache: npm } # Node 24 LTS
      - run: npm ci
      - name: Lint
        run: npm run lint
      - name: Type Check
        run: npm run typecheck
      - name: Format Check
        run: npm run format:check
      - name: Unit Tests with Coverage
        run: npm run test -- --coverage
      - name: Build
        run: npm run build
  security:
    runs-on: ubuntu-latest
    steps:
      - run: npm audit --audit-level=high --omit=dev
```

**Upgrades from KrewPact's current CI:**

- Node 24 (currently 20)
- Add `format:check` step
- Coverage report posted to PR (optional)

### 1.10 — Section: Agent Rules

**Keep from v1:**

- Agent Research Protocol (check bundled docs, then Supabase/React/shadcn docs)
- `@AGENTS.md` import reference

**Add from KrewPact:**

- Session protocol: read CLAUDE.md → check env vars → verify feature flags
- Before adding ANY UI element, read the existing page
- Before wiring a new page: Does the nav make sense? Is the data real?
- No mock data in production code (mocks in `__tests__/` only)
- Log issues found during session to `docs/issues-log.md`

**Add from research:**

- Subagent output contracts: "Final response under 2000 chars. List outcomes, not process."
- SLO awareness: "Error budget is X%. When >50% consumed, freeze features."

### 1.11 — Section: Conventions

**Merge v1 + KrewPact:**

- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- Named exports (except page.tsx, layout.tsx)
- Import order enforced by eslint-plugin-simple-import-sort
- No barrel files (breaks tree-shaking)
- No `any` — use `unknown` with type guards
- Error messages user-friendly; log technical details server-side

### 1.12 — Section: What NOT To Do

**Merge v1 + KrewPact (deduplicated):**

- Never modify `components/ui/` directly
- Never use service_role key in client code
- Never create tables without RLS policies
- Never hardcode secrets
- Never skip Clerk auth in any API route
- Never commit `console.log`
- Never create barrel index files
- Never use `getServerSideProps` (App Router only)
- Never enable `productionBrowserSourceMaps`
- Never skip input validation on Server Actions

### 1.13 — SOURCES.md Updates

Add these 2026 sources:

- Next.js 16 upgrade guide
- Clerk Third-Party Auth + Supabase integration
- Vercel production checklist
- Next.js security advisories: CVE-2025-55184 (RSC deserialization RCE), CVE-2025-66478 (Server Component data leak)
- ESLint flat config for Next.js
- Vitest coverage gating patterns

---

## Phase 2: KrewPact Alignment

### Step 2.1 — Rewrite CLAUDE.md

**Problem:** CLAUDE.md is 280+ lines with 6 weeks of session log entries consuming ~40% of the file. AGENTS.md duplicates ~70% but has stale numbers (40 endpoints vs 344 actual). Both reference `src/` prefix that doesn't exist.

**Action:**

- Rewrite CLAUDE.md from the Playbook v2 template, customized for KrewPact
- Move session log to `docs/session-log.md` (keep last 2 entries in CLAUDE.md)
- Remove all stale counts — reference the audit reports for current numbers
- Remove `src/` prefix from file structure diagram
- Keep KrewPact-specific sections: ERPNext integration, GPL boundary, MDM divisions, unified architecture, compliance context, inventory system, Sales AGI layer
- Add: SLO target (99.5% MVP → 99.9% post-HA), error budget awareness

### Step 2.2 — Rewrite AGENTS.md

**Action:**

- Regenerate from the Playbook v2 template (AGENTS.md = slimmer version for non-Claude agents)
- Fix stale numbers: 344 routes, 118 pages, 4,306 tests, 60 migrations
- Remove `src/` prefix
- Keep all KrewPact-specific architecture context
- Remove session log (doesn't belong in AGENTS.md)

### Step 2.3 — Consolidate docs/

**Problem:** `docs/contributing.md` is a 4-line stub. `docs/local-dev.md` duplicates build commands from CLAUDE.md. Architecture docs have stale planning numbers.

**Action:**

- Expand `docs/contributing.md` with workflow, PR conventions, testing expectations
- Keep `docs/local-dev.md` as the canonical setup guide (remove duplicated content from CLAUDE.md — CLAUDE.md references it, doesn't duplicate it)
- Update `docs/architecture/KrewPact-Architecture-Resolution.md` with current counts from the Mar 23 audit

### Step 2.4 — Fix Dev Environment

| Item               | Current                                      | Target                     | Validation                                                                                                | Impact                                |
| ------------------ | -------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| CI Node version    | 20                                           | 24                         | Run full test suite on Node 24 locally first; check OpenSSL 3.5 compat with ERPNext/Cloudflare Tunnel TLS | Matches Vercel runtime                |
| CI format check    | Missing                                      | Add `npm run format:check` | CI catches formatting drift                                                                               | Catches formatting drift              |
| CI coverage gate   | Report only                                  | Fail on regression         | Set negative threshold (`-10` uncovered lines)                                                            | Prevents coverage erosion             |
| tsconfig target    | ES2017                                       | ES2022                     | Verify `lib` includes ES2022; run build + test                                                            | Modern syntax (top-level await, etc.) |
| Unused import      | `nullableSafeString` in inventory validators | Remove                     | Lint passes clean                                                                                         | Clean lint                            |
| queue/processor.ts | Complexity 27                                | Refactor below 15          | Lint warning removed                                                                                      | Only non-script lint warning          |

**Note:** Supabase `accessToken()` migration is NOT a dev environment fix. It's a production code refactor that touches all 344 API routes via `lib/supabase/server.ts`. Deferred to a future session — current `getToken()` + manual header pattern works correctly.

**Dependency:** Steps 2.1-2.3 (docs) can run in parallel. Step 2.4 (dev env) is independent. Step 2.5 depends on 2.4 completing (Node 24 must be validated before production push).

### Step 2.5a — Production Auth & Onboarding (MDM Users)

**Critical path to real users. This is a one-way door for Clerk — plan carefully.**

**Pre-flight:**

- Back up Clerk dev instance user data (export via Clerk API)
- Ensure feature flag `onboarding_gate` exists to control new-user flow
- Prepare smoke test checklist before DNS cutover

**Steps:**

1. **Clerk production instance** — Switch from development to production Clerk app. Configure M365 SSO for `@mdmgroupinc.ca` domain. Set up webhook endpoints.
2. **Auth flow verification** — Clerk org creation → user metadata populated (`krewpact_user_id`, `division_ids`, `role_keys`, `krewpact_org_id`) → Supabase RLS grants access. Test with a real MDM email address using `operations_manager` role.
3. **Onboarding wizard** — Verify `OnboardingWizard.tsx` works end-to-end for first-time `operations_manager` user.
4. **End-to-end smoke test** — An `operations_manager` can: sign in → see dashboard → navigate CRM → create a lead → see it persisted → sign out → sign back in → lead still visible.
5. **DNS/domain** — Verify `app.krewpact.com` resolves to Vercel production deployment.

### Step 2.5b — Feature Flags & Monitoring

1. **Feature flag audit** — Review which 6 enabled flags are production-ready:
   - `ai_suggestions` — verify AI provider keys (Gemini) are set in Vercel env
   - `ai_insights` — same
   - `ai_daily_digest` — verify cron job runs and Resend delivers
   - `sequences` — verify email sending works (Resend API key in prod)
   - `inventory_management` — verify Almyta data loaded in prod Supabase
   - `ai_takeoff` — verify external takeoff service connected
2. **Enable more flags** — Determine which disabled features are code-complete and ready for UAT:
   - `finance` — code complete, needs UAT with real data
   - `portals` — code complete, needs UAT
   - `bidding` — code complete, needs UAT
3. **Monitoring** — Verify Sentry DSN, BetterStack uptime monitors, and Vercel Analytics are receiving production data.

---

## Out of Scope

- React 19 hooks migration (`useActionState`, `useFormStatus`, `useOptimistic`) — forms work correctly with current patterns. Adopt incrementally on new forms, don't rewrite existing ones.
- `vercel.ts` migration from `vercel.json` — defer until next infra sprint. Current JSON works fine.
- Zod 4 migration concerns — already on Zod 4.3.6 with compatible resolvers. No action needed.
- Mobile app (Expo) testing setup — separate sprint.
- Next.js `'use cache'` adoption — KrewPact uses React Query for client caching and server-side data fetching patterns. Adopt cache components incrementally, not as a rewrite.

---

## Success Criteria

**Phase 1 (Playbook v2):**

- [ ] CLAUDE.md template covers all 13 sections listed above
- [ ] SOURCES.md updated with 2026 references
- [ ] Template is project-agnostic — no KrewPact-specific content
- [ ] README.md explains how to adopt

**Phase 2 (KrewPact Alignment):**

- [ ] CLAUDE.md rewritten, session logs moved to docs/session-log.md, no stale data
- [ ] AGENTS.md rewritten with accurate counts (344 routes, 118 pages, 4,306 tests)
- [ ] CI runs on Node 24 with format check and coverage gate
- [ ] An `operations_manager` user with `@mdmgroupinc.ca` email can: sign in → see dashboard → navigate CRM → create a lead → see it persisted
- [ ] Sentry DSN receiving errors, BetterStack monitoring uptime, Vercel Analytics tracking pageviews
- [ ] 0 lint errors, 0 type errors, all tests passing on Node 24

---

## Estimated Effort

| Step                                                        | Effort    | Parallelizable |
| ----------------------------------------------------------- | --------- | -------------- |
| Phase 1: Playbook v2 CLAUDE.md + SOURCES.md                 | 1 session | -              |
| Phase 2.1-2.3: Docs rewrite (CLAUDE.md + AGENTS.md + docs/) | 1 session | Yes (all docs) |
| Phase 2.4: Dev environment fixes                            | 1 session | Independent    |
| Phase 2.5a: Production auth & onboarding                    | 1 session | After 2.4      |
| Phase 2.5b: Feature flags & monitoring                      | 1 session | After 2.5a     |
