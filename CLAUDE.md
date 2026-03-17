# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KrewPact is a construction operations platform for MDM Group Inc. (Mississauga, Ontario). It follows a **Hybrid ERPNext-first architecture**: ERPNext is finance/procurement/inventory source-of-truth; KrewPact is UX shell, field operations, portals, orchestration, identity, and reporting.

**Domain:** krewpact.com
**Architecture Resolution:** All contradictions resolved in `KrewPact-Architecture-Resolution.md` (Feb 2026).

## Tech Stack (MVP)

- **Frontend:** Next.js 15 (App Router, TypeScript, Server Components) on Vercel
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives for WCAG AA)
- **Forms:** React Hook Form + Zod (shared validation between client and API)
- **Database:** Supabase PostgreSQL managed cloud (Pro tier) — RLS, Realtime, Storage
- **ERP:** ERPNext (GPL v3, any Linux host, exposed via Cloudflare Tunnel)
- **Auth:** Clerk (email + M365 SSO, custom JWT template for Supabase RLS)
- **E-Sign:** BoldSign (white-label API) — P0 Phase 2 (Week 7+)
- **Email:** Resend (transactional email) — Microsoft Graph deferred to P2
- **Queue:** BullMQ + Upstash Redis (REST API, reachable from Vercel serverless)
- **Workers:** Node.js BullMQ workers co-located on ERPNext host
- **Connectivity:** Cloudflare Tunnel (ERPNext ↔ Vercel), Tailscale (SSH admin only)
- **CI/CD:** GitHub Actions
- **Testing:** Vitest (unit), Playwright (E2E), @axe-core/playwright (a11y)
- **Monitoring (MVP):** Vercel Analytics + Supabase Dashboard + BetterStack uptime + Sentry errors

## Architecture

```
User → Vercel (Next.js app + API routes) → Cloudflare Tunnel → ERPNext
                                          → Supabase Cloud (direct HTTPS)
                                          → Upstash Redis (enqueue jobs)

ERPNext Host → BullMQ Workers → Upstash Redis (dequeue jobs)
                               → ERPNext (localhost, direct)
                               → Supabase Cloud (direct HTTPS)
```

| Layer          | Technology                              | Responsibility                                             |
| -------------- | --------------------------------------- | ---------------------------------------------------------- |
| Web App        | Next.js + React + TypeScript            | Internal UI (online-only for MVP, offline deferred to P2)  |
| API/BFF        | Next.js API routes (Vercel serverless)  | Domain APIs, orchestration, validation, rate limits        |
| Sync Workers   | Node.js on ERPNext host                 | BullMQ workers for ERPNext sync, retries, dead-letter      |
| Operational DB | Supabase Postgres (managed cloud)       | Workflows, field ops, audit trails, denormalized reporting |
| ERP Core       | ERPNext (any Linux + cloudflared)       | Accounting, inventory, procurement, invoicing, payments    |
| Object Storage | Supabase Storage + CDN                  | Documents, photos, signed contracts                        |
| Identity       | Clerk → Supabase JWT bridge             | Auth, SSO, session claims. JWT claims drive RLS.           |
| Observability  | Vercel Analytics + Sentry + BetterStack | Errors, uptime. Full Prometheus/Grafana deferred.          |

## Unified Architecture (MDM Growth Intelligence System)

KrewPact is the **nucleus** of MDM Group's unified platform. All services converge here:

- **KrewPact** = The Nucleus (operations, CRM, project execution, portals)
- **ERPNext** = The Financial Brain (replacing Sage Construction Mgmt + Sage50)
- **LeadForge** → Sales AGI layer (merged INTO KrewPact's CRM + automation tables)
- **mdm-website-v2** = The Conversion Engine (reads from KrewPact API)
- **MDM-Book** = Intelligence Layer (vectorized into KrewPact's pgvector)
- **MDM-Hub** → Archived. Superseded by KrewPact.

**One Supabase. One Clerk auth. One event bus. ERPNext for finance. Sage migrated out.**

### MDM Group Divisions

| Code          | Name            | Description                |
| ------------- | --------------- | -------------------------- |
| `contracting` | MDM Contracting | General contracting        |
| `homes`       | MDM Homes       | Residential construction   |
| `wood`        | MDM Wood        | Wood/lumber                |
| `telecom`     | MDM Telecom     | Telecommunications         |
| `group-inc`   | MDM Group Inc.  | Parent company / corporate |
| `management`  | MDM Management  | Property management        |

## Data Authority Rules

- **ERPNext authoritative for:** GL, invoices, payments, inventory, purchase orders, accounting
- **Supabase authoritative for:** workflows, field ops, portals, audit trails, user/RBAC, lead scoring, outreach automation, knowledge embeddings
- **Cross-system link:** `krewpact_id` field on ERPNext doctypes maps to Supabase records
- **Sync pattern:** Eventual consistency. Outbox/inbox with idempotent upsert, retry, dead-letter. No 2PC.
- **Event bus:** `unified_events` table for cross-system communication (website → CRM, project completion → case study, etc.)

## Clerk → Supabase JWT Bridge

Clerk JWTs drive Supabase RLS. Configured via Clerk JWT template:

```json
{
  "sub": "{{user.id}}",
  "role": "authenticated",
  "krewpact_user_id": "{{user.public_metadata.krewpact_user_id}}",
  "krewpact_divisions": "{{user.public_metadata.division_ids}}",
  "krewpact_roles": "{{user.public_metadata.role_keys}}"
}
```

- RLS policies use `auth.jwt() ->> 'krewpact_user_id'` (not `auth.uid()`)
- Division filtering: `auth.jwt() -> 'krewpact_divisions'` (JSONB array in JWT)
- No per-row subqueries — claims evaluated once per request from JWT

## Canonical Role Model (PRD is source of truth)

**Internal (9):** `platform_admin`, `executive`, `operations_manager`, `project_manager`, `project_coordinator`, `estimator`, `field_supervisor`, `accounting`, `payroll_admin`
**External (4):** `client_owner`, `client_delegate`, `trade_partner_admin`, `trade_partner_user`

## Key Conventions

- All server-side ERPNext calls go through `lib/erp/client.ts`
- ERPNext API auth: `Authorization: token {key}:{secret}` header
- ERPNext URL is env var `ERPNEXT_BASE_URL` (Cloudflare Tunnel endpoint, configurable per deployment)
- All Supabase calls use generated types from `supabase gen types` (pipe stderr: `2>/dev/null`)
- API routes in `app/api/` — BFF pattern (aggregate, transform, authorize)
- File structure: feature-based (`app/(dashboard)/projects/`, `app/(dashboard)/crm/`)
- Error handling: all external calls wrapped in try/catch with structured error responses
- RLS with deny-by-default; all policies must have tests
- Forms: React Hook Form + Zod. Schemas shared between client and API route validation.
- DB connections from Vercel: use Supabase pooler (port 6543, transaction mode), NOT direct (port 5432)
- Environment variables: NEVER hardcode secrets; see `.env.local` template in Access-and-Workflow-Plan.md

## Coding Standards (Enforced)

### File Size Limits (ESLint enforced)

- **Components:** Max 150 lines (extract sub-components, hooks, or utils)
- **Page files (page.tsx):** Max 200 lines (extract sections into components)
- **API routes (route.ts):** Max 200 lines (extract business logic to lib/)
- **Lib files:** Max 300 lines (split into focused modules)
- **Validators:** Max 300 lines (split by domain)
- **Exception:** `components/ui/` (shadcn/ui generated), `types/supabase.ts` (generated)

### When a file is too large, split it:

- Extract custom hooks -> `hooks/use<Feature>.ts`
- Extract sub-components -> same directory as `<Component>/<SubComponent>.tsx`
- Extract business logic -> `lib/<domain>/<function>.ts`
- Extract types -> `types/<domain>.ts`
- Extract constants -> co-locate or `lib/constants/<domain>.ts`

### Component Rules

- One exported component per file (internal helpers OK)
- Server Components by default -- only add 'use client' when needed for interactivity
- Never define components inside other components (causes re-mount on every render)
- Use `React.memo()` only when profiling shows re-render issues, not preemptively
- Prefer composition (children prop) over deep prop drilling

### Performance Rules

- **CRITICAL: No async waterfalls** -- use Promise.all() for independent fetches
- **CRITICAL: No barrel imports** -- import directly: `import { Button } from '@/components/ui/button'` not `from '@/components/ui'`
- **CRITICAL: Lazy load heavy components** -- use `next/dynamic` for charts, editors, modals
- **HIGH: Use React.cache()** for deduplicating server-side data fetches
- **HIGH: Minimize Server->Client serialization** -- only pass what the client needs
- **MEDIUM: Use Suspense boundaries** -- wrap async Server Components in `<Suspense>`

### Import Order (ESLint enforced via simple-import-sort)

1. React/Next.js imports
2. External packages
3. Internal aliases (@/lib, @/components, @/hooks, @/types)
4. Relative imports
5. Style imports

### API Route Rules

- Always start with auth check (Clerk `auth()`)
- Always validate input with Zod on mutating routes
- Never expose raw DB errors to clients
- Use `lib/logger.ts` -- never `console.log` (ESLint error)
- Extract business logic to `lib/` -- routes are thin orchestrators

### Testing Rules

- Mocks belong ONLY in **tests**/ and e2e/ directories
- No mock data, fake users, or demo mode in production code
- Test files mirror source structure: `__tests__/lib/crm/scoring.test.ts` -> `lib/crm/scoring-engine.ts`

### What NOT to Do

- NEVER use `any` type -- use `unknown` with type guards or define interfaces
- NEVER hardcode secrets, API keys, or user data
- NEVER use `getServerSideProps` -- App Router only
- NEVER skip Clerk auth in any API route or page
- NEVER commit `console.log` -- use `logger.info/warn/error`
- NEVER create barrel index files (re-export files) -- they break tree-shaking

## Sales AGI Layer (from LeadForge Merge)

KrewPact's CRM now includes an autonomous sales automation layer:

- **Lead scoring:** `lead_scoring_rules` + `lead_score_history` — configurable fit/intent/engagement scoring per division
- **Outreach sequences:** `outreach_sequences` + `sequence_steps` + `sequence_enrollments` — multi-step automation
- **Email templates:** `email_templates` — merge fields, categories (outreach, follow-up, nurture)
- **Outreach tracking:** `outreach_events` — email/call/LinkedIn/SMS with delivery status
- **Enrichment pipeline:** `enrichment_jobs` — Apollo → Clearbit → LinkedIn → Google waterfall
- **Bidding opportunities:** `bidding_opportunities` — Bids & Tenders, MERX import
- **External tools:** Instantly.ai (outreach campaigns), Resend (transactional email)

## RAG / Knowledge Layer (pgvector)

- **`knowledge_embeddings`** — vectorized content from MDM-Book (SOPs, market data, competitor intel), project lessons, strategy docs
- **`ai_chat_sessions` + `ai_chat_messages`** — context-aware AI chat within dashboard
- **Embedding model:** OpenAI ada-002 (1536 dimensions), IVFFlat index with 100 lists
- **Context-awareness:** queries from project view automatically include project context

## Expected File Structure

```
src/
├── app/
│   ├── (auth)/              # Login, signup routes
│   ├── (dashboard)/         # Authenticated routes
│   │   ├── crm/
│   │   ├── estimates/
│   │   ├── projects/
│   │   └── settings/
│   ├── api/
│   │   ├── webhooks/        # Clerk, BoldSign webhook receivers
│   │   └── erp/             # ERPNext proxy endpoints
│   └── layout.tsx
├── lib/
│   ├── erp/
│   │   └── client.ts        # ERPNext API client
│   ├── supabase/
│   │   ├── client.ts        # Browser client
│   │   └── server.ts        # Server client (uses pooler port)
│   ├── queue/               # BullMQ job definitions
│   └── validators/          # Shared Zod schemas
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── layout/              # App shell components
└── types/                   # Shared TypeScript types
```

## Required Environment Variables (MVP)

Five services for MVP (full template in `KrewPact-Access-and-Workflow-Plan.md` §1):

- **ERPNext:** `ERPNEXT_BASE_URL` (Cloudflare Tunnel URL), `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- **Clerk:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
- **Upstash:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **App:** `NEXT_PUBLIC_APP_URL=https://app.krewpact.com`, `WEBHOOK_SIGNING_SECRET`

Deferred (not needed for MVP): Azure/M365, ADP, BoldSign (needed Week 7+)

## Build Commands

```bash
npm run dev          # Local dev server
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E
```

## CI Pipeline Order

Lint → Type Check → Unit Test → Build → Integration Test → Deploy

## MVP Scope (P0 — 12 weeks)

**Goal: Replace fragmented manual workflows with a unified platform. Nothing more.**

| Phase                  | Weeks | Features                                                                                               |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| Foundation             | 1-2   | Auth, RBAC, Supabase schema, ERPNext client, Cloudflare Tunnel, app shell, CI/CD                       |
| CRM + Estimating       | 3-6   | Leads, opportunities, accounts, contacts, estimate builder, ERPNext sync (Customer, Quotation)         |
| Contracting + Projects | 7-9   | Proposals, BoldSign e-sign, project creation, members, milestones, ERPNext sync (Sales Order, Project) |
| Execution + Go-Live    | 10-12 | Tasks, daily logs, document upload, invoice snapshots, dashboard, UAT, deploy                          |

**~25 features | ~40 endpoints | ~30 forms | ~12 ERPNext mappings**

P1 (weeks 13-20): Change orders, RFIs, time/expense, client portal, extended ERPNext sync
P2 (future): Trade portal, procurement, offline, ADP, closeout, migration, M365, full monitoring

## Planning Documents

Key reference order:

1. `KrewPact-Architecture-Resolution.md` — **START HERE.** All contradictions resolved, MVP scope, locked decisions.
2. `KrewPact-Master-Plan.md` — locked decisions, architecture, scope (updated with P0/P1/P2)
3. `KrewPact-Technology-Stack-ADRs.md` — 25 ADRs for every tech choice
4. `KrewPact-Backend-SQL-Schema-Draft.sql` — PostgreSQL schema (28 enums, 19+ table groups)
5. `KrewPact-Feature-Function-PRD-Checklist.md` — 16 epics, 70+ features (P0 subset = 25 features)
6. `KrewPact-Access-and-Workflow-Plan.md` — env var template, setup checklists, build sequence (resolved)
7. `KrewPact-Integration-Contracts.md` — ERPNext entity mappings, webhook specs

## ERPNext Integration (MVP = 12 mappings)

MVP mappings: Customer, Contact, Opportunity, Quotation, Sales Order, Project, Task, Sales Invoice (read), Purchase Invoice (read), Supplier, Expense Claim, Timesheet
Full 43 mappings deferred to P1/P2.

- Sync: eventual consistency, outbox/inbox, idempotent upsert, retry with backoff, dead-letter
- All custom fields prefixed `krewpact_*`
- ERPNext rate limit: 300 req/min (configurable)
- Always `encodeURIComponent()` for document names in API calls

## GPL v3 Boundary

ERPNext is GPL v3. **Critical:** maintain strict API boundary. No shared code, separate repos. KrewPact communicates with ERPNext exclusively through REST API via Cloudflare Tunnel. This prevents GPL propagation to proprietary frontend code.

## Compliance Context

- **PIPEDA** — Auth (Clerk) and DB (Supabase) in US. Disclosed in privacy policy. Field-level encryption for SIN/banking.
- **Construction Act 2026** — Ontario; lien/holdback/notice requirements in P1 (Epics 4/5)
- **AODA/WCAG** — @axe-core/playwright in CI. shadcn/ui Radix primitives for ARIA.
- **Data residency** — See Resolution doc §C5 for full data residency map.

## Scale Targets

- Up to 300 internal users
- 99.5% uptime (MVP, single-node). 99.9% target post-HA upgrade.
- RPO 15min, RTO 2h
- CAD + GST/HST/PST tax handling (Canada-first)
- DB connections: use Supabase Supavisor pooler (transaction mode) from serverless

## Kickoff

Run `/scope` to initialize the project. This reads the Resolution doc, confirms pending decisions, scaffolds Next.js, and creates the Phase 0 task list.

## Session Log

### Mar 16, 2026 — Production Hardening: Demo Removal, Coding Standards, File Splits

- **Phase 1 — Demo Mode Removal:** Deleted 5 files (`demo-mode.ts`, `clerk-demo-server.ts`, `clerk-demo-client.tsx`, `seed-demo.ts`, `demo-mode-guard.test.ts`). Edited 5 production files to remove demo bypasses (`next.config.ts`, `supabase/server.ts`, `org/[slug]/route.ts`, `playwright.config.ts`, `ci.yml`). Rewrote 3 E2E tests to use real Clerk auth (`auth-smoke.spec.ts`, `auth.spec.ts`, `dashboard-ui.spec.ts`). Updated 5 docs (`local-dev.md`, `runbook.md`, `CONTRIBUTING.md`, `.env.example`, `lib/CLAUDE.md`). ERPNext mock mode (`isMockMode`) kept — separate concern with Sentry alerts.
- **Phase 2 — Coding Standards:** Installed `eslint-plugin-simple-import-sort`. Added 10 new ESLint rules (`max-lines:300`, `max-lines-per-function:80`, `complexity:15`, `max-depth:4`, `max-params:4`, `simple-import-sort/imports+exports`, `no-explicit-any:error`, `no-console:error`, `react/no-array-index-key`). Auto-fixed 1365 import ordering issues. Added file-specific overrides for `components/ui/`, tests, scripts, generated types. Created `components/CLAUDE.md` with component conventions. Updated `app/api/CLAUDE.md` with size limits and waterfall patterns. Added `## Coding Standards (Enforced)` section to root CLAUDE.md.
- **Phase 3 — File Splits (8 files):** `hooks/useCRM.ts` (1666L -> 10 files in `hooks/crm/`), `lib/erp/sync-service.ts` (1167L -> 11 handlers in `lib/erp/sync-handlers/`), `lib/email/branded-templates.ts` (802L -> 7 files in `lib/email/templates/`), `components/Layout/CommandPalette.tsx` (583L -> 6 files + hook), `components/Projects/ProjectCreationForm.tsx` (486L -> 9 files + hook), `lib/validators/crm.ts` (482L -> 8 domain files), `hooks/useEstimating.ts` (463L -> 5 files in `hooks/estimating/`), `lib/crm/sequence-processor.ts` (447L -> 3 files).
- **Phase 4 — Production Checklist:** Verified: `global-error.tsx`, `not-found.tsx`, `next/font`, `.env.local` in `.gitignore`, CSP headers, no raw `<img>` tags, no secret leaks in `NEXT_PUBLIC_` vars. All pass.
- **Tests:** 3,871/3,871 passing (342 files). 0 type errors. 0 lint errors. 469 lint warnings (from warn-level rules). Build clean.

### Mar 14, 2026 — Scoring Alignment + Full Env Setup + Service Health Check

- **Changes:** Aligned KrewPact scoring engine with lead-workstation.html. Added `in_set` and `contains_any` operators to scoring engine for multi-value matching. Added score caps (fit:40, intent:35, engagement:25, max total:100). Created migration with 15 new scoring rules (GTA city match, core industry match, source channel scoring, project signals, engagement signals). Re-scored all 275 enriched leads via cron. Created `.env.local` with all 35 env vars. Added 11 missing vars to Vercel (QStash, Resend, Sentry, Redis, Clerk domain). Updated ERPNext and Redis credentials. Created `scripts/health-check.ts` — pings all 12 external services. Created `reference/krewpact-architecture-costs.html` — interactive architecture map + monthly cost breakdown ($153-193/mo).
- **Decisions:** Pipe `|` separator for `in_set`/`contains_any` operators (not comma, since city names might contain commas). Score caps clamp negatives to 0 per dimension. Separate Upstash Redis instance (`present-whale`) for KrewPact vs shared KV (`tender-poodle`).
- **Services verified:** 12/12 — Supabase, Clerk, Upstash Redis, QStash, ERPNext, Resend, Sentry, Apollo, Brave, Google Maps, Tavily all connected.
- **New files:** `supabase/migrations/20260314_001_align_scoring_rules.sql`, `scripts/health-check.ts`, `reference/krewpact-architecture-costs.html`
- **Tests:** 3,866/3,866 passing (340 files). 15 new tests (in_set, contains_any operators + cap behavior). 0 lint. 0 type errors. Build clean.

### Mar 14, 2026 — RBAC Unification: Fix Access Denied for platform_admin

- **Changes:** Fixed Access Denied for platform_admin. Unified RBAC: merged Clerk JWT + Supabase DB permissions. Fixed field name mismatches (`role_keys`/`division_ids` vs `krewpact_roles`/`krewpact_divisions`). Updated 12 test files.
- **Tests:** 3,866/3,866 passing (340 files).

- Mar 14: Platform Hardening & Mobile Scaffold (4 phases, 418 files). 3,851 tests.
- Mar 13: David's Sales Deliverables + CEO Sales Book v2 + Leads folder optimization.
- Mar 12: AI Agentic Layer (8 agents, Gemini Flash, killswitch). 3,750 tests.
- Mar 12: Lusha API Integration + Lead Enrichment. 3,750 tests.
- Mar 11: Closed-Loop CRM + 7-agent audit (79 files fixed). 3,489 tests.
- Mar 10: Production Readiness (14 stories). 3,488 tests.
- Mar 9: Executive Nucleus + Enterprise Phase 2. 3,478 tests.
- Mar 8: P1 completion + autonomous loop (all 18 PRD tasks). 3,092 tests.
