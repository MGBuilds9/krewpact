# KrewPact

Construction operations platform for MDM Group Inc. (Mississauga, Ontario). Hybrid ERPNext-first architecture: ERPNext owns finance/procurement; KrewPact owns UX, field ops, portals, identity, inventory, and reporting.

## Stack

- **Framework:** Next.js 16 (App Router, React 19, Server Components) on Vercel
- **Database:** Supabase PostgreSQL (Pro tier) — RLS, Realtime, Storage
- **Auth:** Clerk (Third-Party Auth session tokens → Supabase RLS)
- **Styling:** Tailwind CSS + shadcn/ui (New York style, Radix primitives for WCAG AA)
- **Validation:** Zod + React Hook Form + @hookform/resolvers
- **ERP:** ERPNext (GPL v3, exposed via Cloudflare Tunnel)
- **Queue:** QStash (Upstash) — serverless job queue via HTTP
- **Email:** Microsoft Graph (user mailbox) + Resend (transactional)
- **Testing:** Vitest (unit), Playwright (E2E), @axe-core/playwright (a11y)
- **Monitoring:** Sentry + Vercel Analytics + BetterStack uptime
- **Mobile:** Expo SDK 54 (React Native, field-worker UX)

## Build / Test / Lint

```bash
npm run dev            # Next.js dev server (Turbopack)
npm run validate       # Canonical local validation pass
npm run build          # Production build
npm run lint           # ESLint (flat config)
npm run typecheck      # tsc --noEmit (strict mode)
npm run test           # Vitest unit tests
npm run test:coverage  # Unit tests with coverage
npm run test:e2e       # Playwright E2E (chromium, local dev server)
npm run qa:e2e         # Authenticated production QA via @clerk/testing — see "Authenticated Production QA" section
npm run format:check   # Prettier check (CI-safe)
npm run health         # Health check script
npm run health:deep    # Deep health check (all services)
```

Seed scripts: `npm run seed:org`, `npm run seed:admin`, `npm run seed:test-users`, `npm run seed:scoring`, `npm run seed:reference`

After Supabase schema changes:

```bash
supabase gen types typescript --local > types/supabase.ts 2>/dev/null
```

Setup details: `docs/local-dev.md`

## Architecture Rules

### Server Components (default)

- Every component is a Server Component unless it needs interactivity
- Only add `'use client'` when genuinely needed; push it as far down the tree as possible
- Never import server-only code in client components

### Data Fetching & Mutations

- **Reads:** Server Components directly, or `_lib/*.loader.ts` co-located with routes
- **Writes:** Server Actions for form submissions and mutations
- **Webhooks / external integrations:** API Route Handlers (`route.ts`)
- **Realtime:** Supabase Realtime subscriptions on the client side

### Project Structure

```
app/
  (auth)/                          # Login via Clerk
  (dashboard)/
    org/[orgSlug]/                 # All authenticated routes scoped by org
      crm/                         # Leads, opportunities, accounts, contacts
      estimates/                   # Estimate builder + templates
      projects/                    # Project execution, milestones, daily logs
      inventory/                   # Inventory management (replaces Almyta)
      executive/                   # C-suite intelligence (role-gated)
      finance/                     # Invoice snapshots, expenses
      settings/                    # Org settings, team management
      ...
  (portal)/                        # External client/trade partner portal
  api/                             # ~50 route groups (BFF pattern)
    webhooks/                      # Clerk, BoldSign receivers
    erp/                           # ERPNext proxy endpoints
    queue/                         # QStash job processing
    health/                        # Health check endpoint
components/
  ui/                              # shadcn/ui output — NEVER modify directly
  shared/                          # Composed components (DataTable, ConfirmDialog,
                                   # PageHeader, StatusBadge, StatsCard, PageSkeleton,
                                   # DataTableSkeleton, EmptyState, FormSection)
  [Domain]/                        # Domain-grouped (CRM/, Projects/, Layout/)
hooks/
  use-[domain].ts                  # React Query hooks
lib/
  erp/client.ts                    # ERPNext API client (sole ERPNext access point)
  supabase/server.ts               # Server client (Clerk JWT → RLS)
  supabase/client.ts               # Browser client
  queue/                           # QStash job definitions
  validators/                      # Shared Zod schemas (one per domain)
  logger.ts                        # Structured logger (never console.log)
  env.ts                           # Environment variable validation
types/
  supabase.ts                      # Generated types (never edit manually)
```

### File Placement Rules

| What                          | Where                              |
| ----------------------------- | ---------------------------------- |
| Route-specific components     | `_components/` under their route   |
| Route-specific data fetching  | `_lib/` under their route          |
| Shared components (2+ routes) | `components/shared/`               |
| shadcn/ui primitives          | `components/ui/` (CLI-managed)     |
| Domain components             | `components/[Domain]/`             |
| Business logic                | `lib/services/` or `lib/<domain>/` |
| Zod schemas                   | `lib/validators/`                  |
| React Query hooks             | `hooks/use-[domain].ts`            |

### API Routes as BFF

API routes act as Backend-For-Frontend: authenticate (Clerk `auth()`), validate (Zod), call `lib/` for business logic, aggregate/transform, return typed responses. Routes are thin orchestrators.

## Security

### Server Actions Are PUBLIC HTTP Endpoints

Every `'use server'` function MUST: (1) validate all input with Zod, (2) authenticate via Clerk `auth()`, (3) authorize resource access, (4) never expose raw DB errors.

### Headers

Security headers (CSP, HSTS, X-Frame-Options, etc.) are configured in `next.config.ts`. CSP includes Clerk, Supabase, and Sentry domains.

### Rate Limiting

Upstash Redis with `@upstash/ratelimit`. Circuit breaker pattern — fails open if Redis is down.

### Webhook Verification

Always verify webhook signatures (svix for Clerk, BoldSign SDK). Never trust unverified payloads.

## Auth Pattern (Clerk Third-Party Auth)

Clerk session tokens drive Supabase RLS via Third-Party Auth integration. **No custom JWT template** — Clerk's native session token is passed directly.

```typescript
// lib/supabase/server.ts — the canonical pattern
const { getToken } = await auth();
const token = await getToken(); // Clerk session token (Third-Party Auth)
// Creates Supabase client with Authorization: Bearer <token>
```

### Custom Claims (in Clerk publicMetadata)

- `krewpact_user_id` — maps to Supabase user record
- `krewpact_org_id` — organization scope
- `division_ids` — JSONB array for multi-division access
- `role_keys` — role-based access control

### RLS Rules

- **Deny by default** — every table has RLS enabled
- **Never use `auth.uid()`** — use `auth.jwt() ->> 'krewpact_user_id'` (Clerk UUIDs differ from Supabase)
- **Division filtering:** `auth.jwt() -> 'division_ids'`
- **Index every column referenced in RLS policies**
- Three client types: `createUserClient()` (RLS-scoped), `createUserClientSafe()` (returns error instead of throwing), `createServiceClient()` (bypasses RLS, server-only)

### Canonical Role Model

**Internal (9):** `platform_admin`, `executive`, `operations_manager`, `project_manager`, `project_coordinator`, `estimator`, `field_supervisor`, `accounting`, `payroll_admin`
**External (4):** `client_owner`, `client_delegate`, `trade_partner_admin`, `trade_partner_user`

## Quality Gates

### ESLint (flat config)

Key rules enforced: `no-console` (error, allow warn/error), `@typescript-eslint/no-explicit-any` (error), `max-lines` (300), `max-lines-per-function` (80), `complexity` (15), `max-depth` (4), `max-params` (4), `simple-import-sort`. Exemptions: `components/ui/**`, `__tests__/**`, `scripts/**`, `types/supabase.ts`.

### Testing (Vitest)

- Tests in `__tests__/` mirroring source structure
- Coverage: v8 provider, thresholds: 60% lines, 50% branches
- Environment: jsdom, setup file: `__tests__/setup.ts`
- Mock helpers in `__tests__/helpers/`
- Mocks ONLY in `__tests__/` and `e2e/` — never in production code

### E2E (Playwright)

Two separate suites with different configs:

**`npm run test:e2e`** — Dev/CI suite. `playwright.config.ts`. Spins up `npm run dev` as a `webServer`, runs `e2e/*.spec.ts` against `http://localhost:3000`. Auth via `e2e/auth.setup.ts` (UI form-fill flow against dev Clerk instance). Used by CI on PRs.

**`npm run qa:e2e`** — Authenticated production QA. `playwright-qa.config.ts`. NO webServer — hits `https://krewpact.ca` (or `QA_BASE_URL` env override) directly. Auth via `e2e/qa/qa-auth.setup.ts` which uses `@clerk/testing` `clerk.signIn()` to bypass Clerk's bot detection. Runs `e2e/qa/*.spec.ts`. Used by `gstack /qa` skill for ad-hoc verification of shipped work.

The two suites are isolated:

- Different testDir (`e2e/` vs `e2e/qa/`)
- Different storage state (`e2e/.auth/user.json` vs `e2e/qa/.auth/qa-user.json`)
- Different auth path (UI form-fill vs Clerk Testing Token API)
- The qa suite captures screenshots, page text, and console errors to `.gstack/qa-reports/playwright-captures/` for the /qa skill to parse into a report

## Authenticated Production QA

The `npm run qa:e2e` pipeline is the canonical way to run authenticated browser QA against production. Built 2026-04-07 to replace the failing browse + cookie-export workflow that hit Clerk's WAF bot detection.

**Why `@clerk/testing`:** Clerk's WAF actively blocks Playwright/Puppeteer/automated browsers from completing sign-in (the `Failed to sign in: bot detected` error). `@clerk/testing` is Clerk's official solution: `clerkSetup()` fetches a Testing Token from the Backend API, and `clerk.signIn()` calls Clerk's API directly (not via UI form-fill), bypassing every bot detection check. Documented at https://clerk.com/docs/guides/development/testing/playwright/overview.

**Required env vars in `.env.local` (gitignored):**

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — auto-bridged to `CLERK_PUBLISHABLE_KEY` by `playwright-qa.config.ts`
- `CLERK_SECRET_KEY` — required by `clerkSetup()` to mint Testing Tokens
- `QA_TEST_EMAIL` — test user email (production: `ci-test@mdmgroupinc.ca`)
- `QA_TEST_PASSWORD` — test user password

**Test user requirement:** must have **password authentication enabled** in Clerk. `clerk.signIn()` in production only supports `strategy: 'password'` (not magic-link or email-code). The ci-test user is pre-configured with this. To use a different user, either set a password on it via Clerk dashboard, OR use a `+clerk_test` subaddress test user (Clerk Test Mode must be enabled in the dashboard).

**To target a non-prod environment:**

```bash
QA_BASE_URL=https://krewpact-git-feature.vercel.app npm run qa:e2e
```

**Files:**

- `playwright-qa.config.ts` — config (separate from `playwright.config.ts`)
- `e2e/qa/qa-auth.setup.ts` — auth setup using `@clerk/testing`
- `e2e/qa/qa-verification.spec.ts` — the QA spec; assert one ISSUE-### per test
- `e2e/qa/.auth/` — gitignored storage state
- `.gstack/qa-reports/playwright-captures/` — gitignored captures (text + console + screenshots) for the /qa skill to parse
- `.gstack/qa-reports/playwright-html/` — gitignored Playwright HTML report (open with `npx playwright show-report`)

## Feature Flags

Feature flags are stored in the `org_settings.feature_flags` JSONB column (Supabase) and served via `GET /api/org/[slug]` → `OrgContext`. Client reads: `useOrg().currentOrg?.feature_flags`. Management UI: `components/System/FeatureFlagForm.tsx`. Flags default to `{}` (empty = all disabled) until explicitly set per org.

## Production Hardening

- **No raw IDs/UUIDs in UI** — always display human-readable names
- **No `window.prompt()` or `window.confirm()`** — use shadcn `Dialog` or `AlertDialog`
- **Loading skeletons everywhere** — never "Loading..." text or zeros-while-loading
- **Error boundaries** — `error.tsx` in each route group + `global-error.tsx`
- **Structured logger** — `lib/logger.ts`, never `console.log` (ESLint enforced)
- **Structured error responses** — `{ error: string, code?: string }`
- **"Would a non-technical construction manager understand this screen?"** — always ask this

## CI/CD

Pipeline: Lint → Type Check → Unit Tests (coverage) → Build → E2E Smoke → Security Audit (parallel)

Three parallel jobs in `.github/workflows/ci.yml`:

1. **quality** — lint, typecheck, test, build, Playwright E2E
2. **security** — `npm audit --audit-level=high --omit=dev`
3. **mobile** — mobile typecheck + Expo config validation

Node 20. Runs on push to main, PRs to main, and manual dispatch. Vercel auto-deploys on merge.

## Agent Rules

### Session Protocol

1. Read this `CLAUDE.md`
2. Check `.env.local` for required environment variables — ask if missing
3. Review feature flags — query `org_settings.feature_flags` or check `OrgContext` for current state
4. Log issues to `docs/issues-log.md` with date, file, description

### Before Touching UI

- Read the existing page first
- Verify: Does the nav make sense? Is the data real? Is the UX coherent?
- No mock data in production code
- No placeholder text unless gated by a feature flag check
- NEVER add a feature to nav without adding a corresponding feature flag in `org_settings.feature_flags`

### Research Protocol

1. Next.js docs: `node_modules/next/dist/docs/` (bundled)
2. Use `think hard` before architectural decisions affecting multiple files
3. Use `ultrathink` for complex debugging or design tradeoffs

## Conventions

- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- **Named exports** over default exports (except `page.tsx`, `layout.tsx`)
- **Import order** (ESLint enforced): react/next → external → `@/` aliases → relative → styles
- **No barrel files** — import directly: `import { Button } from '@/components/ui/button'`
- **No `any`** — use `unknown` with type guards or Zod
- **No async waterfalls** — `Promise.all()` for independent fetches
- **Lazy load heavy components** — `next/dynamic` for charts, editors, modals
- **Suspense boundaries** — wrap async Server Components with skeleton fallbacks
- **One exported component per file** — never define components inside other components

## What NOT To Do

- Never modify `components/ui/` directly — update via shadcn CLI only
- Never use `service_role` key in client code — server-side only
- Never create tables without RLS policies in the same migration
- Never hardcode secrets or API keys
- Never skip auth in any API route or Server Action
- Never commit `console.log` — use `lib/logger.ts`
- Never create barrel index files — they break tree-shaking
- Never use `getServerSideProps` — App Router only
- Never use `auth.uid()` in Supabase RLS with Clerk — use custom JWT claims
- Never leave a nav item pointing to a non-functional page
- Never skip Server Action input validation — TypeScript types are NOT runtime-enforced
- Never enable `productionBrowserSourceMaps` in `next.config`

---

## MDM Group Divisions

| Code          | Name            | Description                |
| ------------- | --------------- | -------------------------- |
| `contracting` | MDM Contracting | General contracting        |
| `homes`       | MDM Homes       | Residential construction   |
| `wood`        | MDM Wood        | Wood/lumber                |
| `telecom`     | MDM Telecom     | Telecommunications         |
| `group-inc`   | MDM Group Inc.  | Parent company / corporate |
| `management`  | MDM Management  | Property management        |

### Unified Architecture (MDM Growth Intelligence System)

KrewPact is the **nucleus**. ERPNext = Financial Brain (replacing Sage). LeadForge merged into CRM tables. mdm-website-v2 reads KrewPact API. MDM-Book vectorized into pgvector. MDM-Hub archived. One Supabase, one Clerk auth, one event bus.

## Data Authority Rules

- **ERPNext authoritative for:** GL, invoices, payments, purchase orders, accounting
- **Supabase authoritative for:** workflows, field ops, portals, audit trails, user/RBAC, lead scoring, outreach, knowledge embeddings, inventory (Mar 2026 — replaces Almyta)
- **Cross-system link:** `krewpact_id` field on ERPNext doctypes
- **Sync:** Eventual consistency. Outbox/inbox, idempotent upsert, retry with backoff, dead-letter. No 2PC.
- **Event bus:** Planned `unified_events` table for cross-system communication (not yet created — using QStash for async jobs)

## ERPNext Integration

47 mappings complete: MVP 12 (Customer, Contact, Opportunity, Quotation, Sales Order, Project, Task, Sales Invoice read, Purchase Invoice read, Supplier, Expense Claim, Timesheet) + P2 Batch 2A (Purchase Order, Purchase Receipt, Supplier Quotation, RFQ, Material Request, Stock Entry, Warehouse, Item) + 2B (Payment Entry, Journal Entry, GL Entry read, Bank Account, Mode of Payment, Cost Center, Budget) + 2C (BOM, Work Order, Quality Inspection, Serial No, Batch, UOM, Item Price, Price List) + 2D (Employee, Attendance, Leave Application, Holiday List, Designation, Department, HR Settings, Company) + Extensions (Award, Bid, Compliance Doc, Goods Receipt, Selection Sheet).

- All calls through `lib/erp/client.ts` — sole ERPNext access point
- Auth: `Authorization: token {key}:{secret}` header
- Rate limit: 300 req/min (configurable)
- Always `encodeURIComponent()` for document names
- Custom fields prefixed `krewpact_*`
- **GPL v3 boundary:** Strict API-only communication via Cloudflare Tunnel. No shared code. Prevents GPL propagation.

## Sales AGI Layer

CRM includes autonomous sales automation: lead scoring (`lead_scoring_rules`), outreach sequences, email templates, enrichment pipeline (Apollo → Clearbit → LinkedIn → Google), bidding opportunities (MERX import). External tools: Instantly.ai, Microsoft Graph, Resend. Details: `docs/crm-workflows.md`.

## RAG / Knowledge Layer

pgvector-powered semantic search: `knowledge_embeddings` (OpenAI ada-002, 1536 dims, IVFFlat index), `ai_chat_sessions` + `ai_chat_messages` for context-aware AI chat. Project-view queries auto-include project context.

## Inventory System

Append-only double-entry ledger replacing Almyta. ~1,700 items across 3 divisions (Telecom, Wood, Contracting). ERPNext gets cost journal entries only. Fleet vehicles are source of truth for vehicle locations. Design spec: `docs/superpowers/specs/2026-03-20-inventory-system-design.md`.

## Compliance

- **PIPEDA** — Auth (Clerk) and DB (Supabase) in US. Disclosed in privacy policy. Field-level encryption for SIN/banking.
- **Construction Act 2026** — Ontario; lien/holdback/notice in P1
- **AODA/WCAG** — @axe-core/playwright in CI. Radix primitives for ARIA.

## Scale & SLO

- 300 internal users max
- 99.5% SLO (MVP). Error budget: 3.6h/month
- RPO 15min, RTO 2h
- CAD + GST/HST/PST tax handling (Canada-first)
- DB: Supabase Supavisor pooler (port 6543, transaction mode) from serverless

## Required Environment Variables

- **ERPNext:** `ERPNEXT_BASE_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- **Clerk:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
- **Upstash:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **App:** `NEXT_PUBLIC_APP_URL`, `WEBHOOK_SIGNING_SECRET`

Deferred: Azure/M365, ADP, BoldSign (Week 7+). Full template: `docs/local-dev.md`.

## Planning Documents

Architecture docs in `docs/architecture/`: `Master-Plan.md` (scope), `Technology-Stack-ADRs.md` (25 ADRs), `Feature-Function-PRD-Checklist.md` (16 epics), `Integration-Contracts.md` (ERPNext mappings). Internal planning docs (decisions register, cost analysis, strategy brief) archived to OneDrive.

## Session Log

### April 8-9, 2026 — Plan v2: Unified Gateway (scope shrink + /autoplan dual-voice review)

- **Changes:** No code changes in the krewpact repo beyond a single `TODOS.md` edit (BoldSign Sender Email entry expanded with the UI-configurable design spec + prettier autofix). The rest of the session was strategic: ran `/autoplan` which dispatched both Codex (via `codex exec`) and an independent Claude subagent for dual-voice CEO review. Both voices converged INDEPENDENTLY on the same critical finding: the original 373-route KrewPact platform was too broad for 22 daily users + solo+AI dev. Codex specifically recommended a "Phase -1 kill-or-commit evaluation" and shrinking KrewPact to a narrow operating layer over ERPNext. After working through alternatives (Xero, Procore, Buildertrend, Odoo SaaS, NetSuite, Frappe Cloud — all ruled out by the user's flat-cost-at-scale constraint), locked in a new architecture: **Unified Gateway** where KrewPact is the single URL users touch, Clerk acts as OIDC Identity Provider to ERPNext (confirmed via research — free tier 50K MAU, `frappe-oidc-extended` plugin v0.4.0 active), and workflows render via one of three patterns: A (KrewPact native), B (KrewPact shell over ERPNext REST), or C (SSO deep-link to ERPNext native UI). Wrote the full plan v2 to `~/.claude/plans/polymorphic-conjuring-stream.md` (~800 lines). Designed the AI agent layer as first-class scope: Vercel AI SDK v6 + AI Gateway + MCP (both client and server), role-aware tool sets (field/pm/estimator/accounting/exec), in-app Cmd-K chat, Daily Log Summarizer as the first live agent in Phase 4. Made explicit per-domain decisions for estimating (Pattern B), procurement (hybrid B+C), and inventory (KP stays source of truth — the one place custom wins). Saved `project_plan_v2_unified_gateway.md` to project memory + updated `MEMORY.md` index. TODOS.md "BoldSign Sender Email" entry expanded to reflect the user's answer ("`contracts@krewpact.ca` doesn't exist, domain not in M365 tenant") with a full UI-configurable design spec deferred to Phase 6 (schema, UI location, per-division overrides, DNS verification, wire-in strategy). Plan file updated to move BoldSign DNS out of Phase 0 blockers into Phase 6 prerequisites.
- **Key decisions locked (plan v2):** (1) ERPNext stays as financial backbone — premise challenged and re-confirmed via user's flat-cost-at-scale constraint. SaaS alternatives (Xero, QBO, Procore, Buildertrend) ruled out because per-user pricing punishes growth. Self-hosted ERPNext + Vercel + Supabase = ~$100-500/mo flat from 22 → 100+ users. (2) Scope shrunk per dual-voice convergence — dormant code stays in repo, feature-flagged off, active surface ~200 routes instead of 373. (3) Takeoff deferred to Phase 7 — no good open-source AI takeoff exists in 2026, will integrate Togal/Kreo API or build custom vision-model tool later. (4) AI agent layer is first-class Phase 4 scope — not a bolt-on. (5) Per-phase review team pattern: each phase dispatches 4-5 named review agents after implementation, before gate. No phase advances without green review. (6) Pilot will be workflow-balanced, NOT role-balanced (per Codex) — one division, one end-to-end revenue path, not 5-8 people across all roles.
- **Files touched:** `TODOS.md` (BoldSign entry rewrite + prettier), `~/.claude/plans/polymorphic-conjuring-stream.md` (full v2 rewrite), `~/.claude/projects/.../memory/project_plan_v2_unified_gateway.md` (new), `~/.claude/projects/.../memory/MEMORY.md` (index update). Restore point at `~/.gstack/projects/MGBuilds9-krewpact/main-autoplan-restore-20260407-220103.md`.
- **Tests:** 5,404/5,404 vitest passing. Zero TypeScript errors. Format clean after prettier autofix on TODOS.md. Build ✓ 170 static pages. Lint 29 warnings (all pre-existing). `npm run validate` green end-to-end.
- **Follow-ups in TODOS.md:** Matview RLS gap (Phase 0 item #1), F2 slow inventory (Phase 0 item #2), Checkly synthetic filter, FeatureGate new-org default, apiFetchList total-count discard, BoldSign UI-configurable sender (Phase 6), MDM needs to confirm contract sender domain before Phase 6 (recommended: `mdmgroupinc.ca`).
- **Next session:** Start Phase 0 from `~/.claude/plans/polymorphic-conjuring-stream.md`. Use the review team dispatch pattern (4-5 named agents) at the phase gate. Don't re-litigate ERPNext or scope — both locked in plan v2. Auto-memory will load `project_plan_v2_unified_gateway.md` for context. Phase 0 work: close 5 known gaps + 7 critical error/rescue gaps + SSO unlock (Clerk OIDC → ERPNext via `frappe-oidc-extended`) + webhook timing regression tests + cherry-picks (C3 backup drill, C7 tests, dead lead_stage cleanup, service client audit). Target: ~1 week focused work.

### April 8, 2026 - Repo Hygiene #47

- **Changes:** Processed 4 open Sentinel PRs. Merged PR #135 (HIGH: `framer-webhook` custom `timingSafeEqual` replaced with `deno.land/std@0.208.0/crypto/timing_safe_equal.ts`; adds explicit length check before comparison), PR #134 (MEDIUM: verbose error message leakage in `app/api/privacy/requests/route.ts` + `app/api/team/route.ts` — now logs `error.message` server-side via `lib/logger` and returns generic `'Database query failed'` to client), PR #133 (CRITICAL: path traversal in `app/api/executive/staging/bulk-import/route.ts` — resolves `file.path` against `IMPORT_BASE_DIR = path.resolve(process.cwd(), process.env.STAGING_IMPORT_DIR || 'data/imports')` and rejects anything that escapes the base dir; updates 3 test fixtures to use relative paths). Closed PR #132 as duplicate of #133 — same vulnerability, but #132's approach allowed `os.tmpdir()` as a valid base (dangerous, since other host processes can plant files there) and didn't update the test fixtures. Also rebased local `c50a051f` session log commit onto the 8 Dependabot merges that landed overnight (actions/checkout 4→6, actions/setup-node 4→6, eslint-plugin-simple-import-sort, dotenv 17.4.0→17.4.1, @react-pdf/renderer 4.3.2→4.4.0, @supabase/supabase-js 2.101.1→2.102.1, testing group, ai-sdk group). Post-merge prettier drift on `bulk-import/route.ts` autofixed in a separate style commit. fsevents lockfile: `"dev": true` intact, no Jules drift.
- **Tests:** 5,404/5,404 vitest passing (matches baseline). TypeScript clean. Format clean. Build ✓ 170 static pages. Lint 29 warnings (26 baseline + 3 from the new sentinel code's logger imports + path-resolution logic — all under `max-lines-per-function`/`complexity` thresholds, zero errors). `npm run validate` green end-to-end.
- **Branches deleted:** 4 (after push: sentinel/fix-framer-webhook-timing-safe-equal-_, sentinel/fix-verbose-errors-_, sentinel-fix-path-traversal-bulk-import-_, sentinel/path-traversal-staging-bulk-import-_).
- **Follow-ups untouched (reserved for dedicated sessions):** matview RLS gap migration (`SECURITY INVOKER` wrapper on `inventory_stock_summary`), F2 production browser profiling for slow inventory page.
- **Next:** Watch Vercel auto-deploy for the 3 merged Sentinel fixes. Re-run `npm run qa:e2e` against prod once deployed to verify no regressions on the bulk-import route.

### Apr 7, 2026 (late evening) — F1 verified live in production via npm run qa:e2e

- **Changes:** Re-ran `npm run qa:e2e` against production after Repo Hygiene #46 pushed the 9 evening commits + Sentinel webhook timing fix. **All 12 tests passing in 19.4s.** F1 fix verified live by inspecting `.gstack/qa-reports/playwright-captures/08-inventory.txt`: **0 occurrences of 'Unknown'**. Recent Stock Positions section now renders the existing "No stock data available" empty state for the ci-test user (Project Coordinator, zero division access) — correct UX. The application-layer RLS filter from commit `541a6559` is working as designed. Underlying matview RLS bypass remains as a follow-up in TODOS.md.
- **Tests:** `npm run validate` green end-to-end (5,404/5,404 vitest, 0 TS errors, format clean, build ✓ 170 static pages). Authenticated E2E 12/12 in 19.4s.
- **Next:** F2 (slow inventory page) still needs production browser DevTools profiling. Matview RLS gap migration. Checkly synthetic-leads source filter. FeatureGate forward compatibility seed step.

### Apr 7, 2026 (late evening) — Repo Hygiene #46

- **Changes:** Merged PR #123 (Sentinel HIGH — timingSafeEqual across webhooks: `health/route.ts` cron auth, `web/leads/route.ts` webhook signing, `webhooks/boldsign/route.ts`, `webhooks/erpnext/route.ts`, `webhooks/takeoff/route.ts`, `lib/api/cron-auth.ts`). All changes use proper pattern: early return on missing signature/secret, length check before `timingSafeEqual`, buffer comparison. Also pushed 9 previously-unpushed local commits from the evening session (F1 fix, rbac feature-gate, prettier drift, migrations idempotent, Checkly monitoring, session log, deferred-task docs).
- **Tests:** 5404/5404 vitest passing. Typecheck clean.
- **Branches deleted:** 1.
- **Open PRs:** 0.

### Apr 7, 2026 (evening) — Working tree cleanup + F1 (inventory "Unknown") fix + F2 deferred

- **Changes:** /qa pickup session. Started with 16 dirty files (FeatureGate stash, migration idempotency patches, Checkly setup, Apr 4-5 doc artifacts, load test result, tsconfig excludes) accumulated over multiple days but never committed. Sorted into 5 atomic commits in this order:
  1. `f3a86e6d` chore: gitignore `load-tests/results.json` (k6 run output)
  2. `24aff50c` chore(db): make 4 migrations idempotent (`IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION` guards) so `supabase db reset` works on a fresh local DB. Schema unchanged, prod unaffected.
  3. `821329cd` chore(monitoring): Checkly synthetic monitoring config (4 endpoints: health API 1m, auth/web-leads/homepage 5m). Not activated. Note: web-leads check posts a synthetic lead per run that needs source filter before activation.
  4. `7119039d` docs: archive Apr 4-5 production-readiness plans + audit + arch HTML
  5. `b23464dc` feat(rbac): FeatureGate enforcement on 10 route-group layouts (crm, estimates, executive, finance, inventory, projects, reports, documents, payroll, schedule). Verified all 10 flags set to true on mdm-group via Supabase MCP **before** committing — no production user gets locked out. Admins always bypass via `useUserRBAC().isAdmin`. 6 unit tests for FeatureGate, mocked OrgContext + useRBAC in CRMLayout test. Follow-up: future new orgs default `feature_flags = '{}'` so they'll see all gated routes locked — needs seed step or migration default.
  6. `3c64b8d9` chore: prettier autofix codebase-wide drift (243 files, pure whitespace/quote/comma changes — `npm run validate` had been broken by accumulated drift for an unknown duration). Extended `.prettierignore` to cover generated artifacts (`docs/architecture/krewpact-architecture.html`, `load-tests/results.json`, `e2e/qa/.auth/qa-user.json`, `.gstack/`).
  7. `541a6559` fix(inventory): F1 — root-caused via Supabase MCP. The ci-test user is `Project Coordinator` with **zero division assignments**. `inventory_stock_summary` is a MATERIALIZED VIEW that aggregates from `inventory_ledger` directly with **no row-level security**, so it returns rows for items in divisions the caller can't see. The companion SELECT on `inventory_items` IS RLS-gated, so the join lookup returned 0 rows for those items, and `getStockSummary` fell back to displaying `'Unknown'`. All 10 items DO exist with valid names — wood + telecom divisions, properly named. Fix filters out RLS-restricted rows in `lib/inventory/stock-summary.ts` instead of the silent `'Unknown'` fallback. UI falls through to existing "No stock data available" empty state. 3 new regression tests covering item-RLS, location-RLS, and full-RLS-gap scenarios.
  8. `7e87977e` docs(todos): F2 deferred + matview RLS gap follow-up. F2 (inventory page never reaches networkidle) ruled out React Query refetchInterval, setInterval, Realtime, api-client retry — most likely cause is Next.js Link prefetch fan-out from the 8-tab `InventoryLayout` nav (each Link auto-prefetches RSC payload). Definitive diagnosis needs production browser DevTools recording. Captured remaining suspects + 3 mitigation strategies.
- **Tests:** **5,404 / 5,404 vitest passing** (5,401 + 3 new F1 regression tests). 0 TS errors. **`npm run validate` is now green end-to-end** (lint warnings only, typecheck clean, format clean, tests pass, build succeeds, 170 static pages generated). Was broken by 245 prettier-drift files before this session.
- **Next:** F2 needs production browser profiling (cannot diagnose from code alone). The matview RLS gap is captured in TODOS.md as a follow-up — code-level filter closes the visible bug but the security hole at the data layer is open until a `SECURITY INVOKER` wrapper view/RPC ships. Re-run `npm run qa:e2e` after Vercel auto-deploys `541a6559` to verify F1 fix is live.

- Apr 7 (afternoon): PR 2 (`76c15dc4` title sweep + currency formatters) + PR 3 (`bd0565df` 8-item polish + closed_won unification via 2 migrations applied to prod) + `a5145aab` (two leftover misses) + new `npm run qa:e2e` pipeline (`10a0c59b`) via `@clerk/testing` — bypasses Clerk WAF bot detection. 12/12 E2E in 17.3s. Health 72→92. F1/F2 surfaced. 5,401 tests. See [[2026-04-07-krewpact-pr2-pr3-qa-pipeline]].
- Apr 7 (morning): /qa → /autoplan → PR 1 (`b117e504`) — DivisionContext sentinel + helpers + active projects filter + ISSUE-016 pipeline pagination fix. Codex caught 8 errors in plan v1. 5,364 tests. See [[2026-04-07-krewpact-crm-polish-qa-autoplan-pr1]].
- Apr 6: Repo Hygiene — Sentinel webhook timing fix (`timingSafeEqual` for HMAC). 5,341 tests.
- Apr 6: Console Error Stabilization + Org Data Fix — 6 categories fixed (CSP, Supabase singleton, org route, digest, dialog a11y), org slug renamed `default` → `mdm-group`. 5,341 tests.
- Apr 5: Deferred Gap Fixes (4/4). 5,343 tests.
- Apr 5: KrewPact Production Hardening + User Gap Fixes. 5,336 tests.
- Apr 4: Production readiness audit + hardening (85/100). 5,310 tests.
- Apr 3: Blueprint audit (93/100). 5,304 tests.

@AGENTS.md
