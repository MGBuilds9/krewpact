# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KrewPact is a construction operations platform for MDM Group Inc. (Mississauga, Ontario). It follows a **Hybrid ERPNext-first architecture**: ERPNext is finance/procurement source-of-truth; KrewPact is UX shell, field operations, portals, orchestration, identity, inventory, and reporting. **Inventory authority shifted to KrewPact** (Mar 2026) — replaces Almyta, ERPNext gets cost journal summaries only.

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
- **Queue:** QStash (Upstash) — serverless job queue via HTTP, no persistent workers
- **Workers:** Vercel serverless `/api/queue/process` — QStash pushes jobs via webhook
- **Connectivity:** Cloudflare Tunnel (ERPNext ↔ Vercel), Tailscale (SSH admin only)
- **CI/CD:** GitHub Actions
- **Testing:** Vitest (unit), Playwright (E2E), @axe-core/playwright (a11y)
- **Monitoring (MVP):** Vercel Analytics + Supabase Dashboard + BetterStack uptime + Sentry errors

## Architecture

```
User → Vercel (Next.js app + API routes) → Cloudflare Tunnel → ERPNext
                                          → Supabase Cloud (direct HTTPS)
                                          → Upstash Redis (enqueue jobs)

QStash → Vercel /api/queue/process → ERPNext (via Cloudflare Tunnel)
                                    → Supabase Cloud (direct HTTPS)
```

| Layer          | Technology                              | Responsibility                                             |
| -------------- | --------------------------------------- | ---------------------------------------------------------- |
| Web App        | Next.js + React + TypeScript            | Internal UI (online-only for MVP, offline deferred to P2)  |
| API/BFF        | Next.js API routes (Vercel serverless)  | Domain APIs, orchestration, validation, rate limits        |
| Job Processing | Vercel serverless + QStash              | QStash pushes jobs to /api/queue/process, retries, DLQ     |
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

## Production Quality Rules (ENFORCED)

### UI Rules

- NEVER ship a page that shows raw IDs, UUIDs, or technical jargon to end users
- NEVER use `window.prompt()` or `window.confirm()` — always use `ConfirmReasonDialog` or shadcn `Dialog`
- NEVER leave "Coming Soon", "TODO", or placeholder text in user-visible UI
- NEVER add a nav item for a feature that isn't fully functional
- ALWAYS check: "Would a non-technical construction manager understand this screen?"
- ALWAYS add loading skeletons, never show "Loading..." text or zeros-while-loading

### Feature Gating Rules

- Every new feature MUST be added to `lib/feature-flags.ts` as `false` by default
- Features are only enabled after: (1) code complete, (2) tested with real data, (3) UX reviewed
- Navigation items check feature flags — hidden features = invisible nav
- Pages behind disabled flags show `<FeatureGate>` / `<ComingSoon>` component, not broken UI

### Agent Session Rules

- Before adding ANY UI element, read the existing page to understand context
- Before wiring a new page, verify: Does the nav make sense? Is the data real? Is the UX coherent?
- Log all issues found during a session to `docs/issues-log.md` with date, file, description
- At session end, update `docs/issues-log.md` with resolved/unresolved status
- NEVER add a feature to the nav without also adding it to `lib/feature-flags.ts`

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
│   ├── queue/               # QStash job definitions
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

**~25 features | ~314 endpoints | ~30 forms | ~13 ERPNext mappings**

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

## Inventory System (Design Spec: `docs/superpowers/specs/2026-03-20-inventory-system-design.md`)

- **Authority:** KrewPact/Supabase owns inventory (replaces Almyta). ERPNext gets cost journal entries only.
- **Architecture:** Append-only double-entry ledger. No UPDATE/DELETE on `inventory_ledger`.
- **Data source:** Almyta Access databases on OneDrive (~1,700 items across 3 divisions: Telecom 221, Wood 1,063, Contracting 414). Original "374K" estimate was inflated by binary PartImage blobs in CSV line counts.
- **Key tables:** `inventory_items`, `inventory_ledger`, `inventory_locations`, `inventory_serials`, `inventory_lots`, `inventory_purchase_orders`, `inventory_goods_receipts`, `inventory_bom`, `fleet_vehicles`.
- **Fleet vehicles** are the source of truth for vehicles; inventory locations of type `vehicle` can only exist when linked to a `fleet_vehicles` record.
- **Migration:** `mdb-export` from `.data` Access files → CSV → transform → Supabase COPY. Per-division tagged.
- **Feature flag:** `inventory_management: false` until migration + UAT complete.

## Session Log

### Mar 20, 2026 — Almyta Migration Execution + Doc Cleanup

- **Changes:** Ran full Almyta → Supabase migration pipeline. Discovered "374K items" was inflated by binary PartImage blobs — actual count is 1,698 items (221 Telecom, 1,063 Wood, 414 Contracting). Fixed extraction with `mdb-export -b strip`. Created 6 warehouse/showroom locations (Timberlea Blvd warehouse + Queen St S showroom, one per division for RLS). All items, categories (11), and initial stock entries (276) loaded successfully. Verification passed within rounding tolerance. Doc cleanup: removed obsolete BullMQ plan, fixed stale BullMQ→QStash refs in lib/CLAUDE.md, updated session-log.md through Mar 20.
- **Files modified:** `transform.ts`, `verify.ts`, `extract-almyta.sh` (real UUIDs + `-b strip`), `lib/CLAUDE.md`, `docs/session-log.md`, `CLAUDE.md`
- **Files deleted:** `docs/plans/bullmq-queue-infrastructure.md`
- **Locations in Supabase:** Timberlea Blvd warehouse (×3 divisions) + Queen St S showroom (×3 divisions) + 3 pre-existing

### Mar 20, 2026 — Estimate Builder Phase 2 (P0 Fixes)

- **Changes:** Fixed 3 critical gaps preventing end-to-end estimate builder usage. (1) Fixed inline line editing — `onUpdateLine` was ignoring `lineId`/`field`/`value` and calling `updateEstimate.mutate()` instead of line PATCH; added `useUpdateEstimateLine` hook. (2) Created `/estimates/new` page with form (division auto-fill, opportunity/account selects, currency). (3) Added estimates sub-navigation layout with tabs (Estimates | Assemblies | Catalog | Templates) that auto-hides on detail/creation pages.
- **Files created:** `estimates/new/page.tsx`, `estimates/new/_page-content.tsx`, `components/Estimates/EstimatesNav.tsx`
- **Files modified:** `hooks/useEstimates.ts`, `estimates/[id]/_page-content.tsx`, `estimates/layout.tsx`, test mock
- **Tests:** 4,029/4,029 passing (356 files). 0 type errors. Build clean.
- **Next steps:** P1 — cost catalog picker in LineItemEditor, ERPNext Quotation sync on status→sent. P2 — assembly insertion, create-from-template flow.

### Mar 20, 2026 — Inventory System Design (Almyta Replacement)

- **Changes:** Designed full inventory system to replace Almyta Control System. Append-only double-entry ledger, 11 new tables, fleet vehicles, serial/lot tracking, PO lifecycle with partial receiving, job costing integration. Verified all FKs and RLS patterns against live Supabase. Discovered Almyta data export was schema-only — located real data in per-company Access `.data` files (~1,700 parts total; original 374K was inflated by binary PartImage blobs). Installed `mdbtools` for extraction.
- **Architecture decision:** Inventory authority moved from ERPNext to KrewPact. ERPNext retains finance/procurement authority but inventory operations (items, stock, POs, receiving, tool checkout) live in Supabase.
- **Key integration:** Ledger `project_id` feeds job costing alongside `time_entries` + `expense_claims`. POs reference `portal_accounts` (trade partners). Items link to `cost_catalog_items` (estimating rates).
- **Spec:** `docs/superpowers/specs/2026-03-20-inventory-system-design.md`
- **Next steps:** Write implementation plan. Extract Almyta data via mdbtools. Build migration script. Schema migration to Supabase. UI (items list, PO creation, receiving, stock views).

### Mar 20, 2026 — Enrollment Approval Gate + Email Template Cleanup

- **Changes:** All sequence enrollments now require `pending_review` approval (inbound leads no longer bypass). Rewrote Initial Outreach and Follow-Up email templates: removed `{{city}}` references, fabricated claims ("active projects in your area"), and personal name signatures — company identity only. Fixed variable resolver to compute `full_name` from first+last and added `city`/`province` vars. Built enrollment approvals UI (CRM Settings → Enrollment Approvals) with approve/reject buttons using existing API endpoints. Updated DB templates via Supabase SQL.
- **Tests:** 4,029/4,029 passing (356 files). 0 type errors. Build clean.
- **Next steps:** E2E verification of full loop (score → enroll → approve → send). Estimate builder if CRM automation is stable. Week 7+ contracting features (proposals, BoldSign e-sign) after estimating.

- Mar 19: Header & Dashboard UI Polish — Nav overflow dropdown, clean dashboard cards. 3,986 tests.
- Mar 17: Fix Email Pipeline, Smoke Test Spam, ERPNext Auth — 5 compounding issues. 3,981 tests.
- Mar 17: Production Hardening — Feature gating (16 flags), UX fixes (8 broken UI items), AI guardrails. 3,871 tests.
- Mar 16: Production Hardening — Demo removal, coding standards (10 ESLint rules), 8 file splits. 3,871 tests.
- Mar 14: Scoring alignment + RBAC Unification + Platform Hardening + Mobile scaffold. 3,866 tests.
- Mar 13: David's Sales Deliverables + CEO Sales Book v2 + Leads folder optimization.
- Mar 12: AI Agentic Layer (8 agents, Gemini Flash, killswitch) + Lusha Integration. 3,750 tests.
- Mar 11: Closed-Loop CRM + 7-agent audit (79 files fixed). 3,489 tests.
- Mar 10: Production Readiness (14 stories). 3,488 tests.
- Mar 9: Executive Nucleus + Enterprise Phase 2. 3,478 tests.
- Mar 8: P1 completion + autonomous loop (all 18 PRD tasks). 3,092 tests.
