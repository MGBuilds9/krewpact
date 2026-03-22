# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

KrewPact is a construction operations platform for MDM Group Inc. (Mississauga, Ontario). It follows a **Hybrid ERPNext-first architecture**: ERPNext is finance/procurement/inventory source-of-truth; KrewPact is UX shell, field operations, portals, orchestration, identity, and reporting.

**Domain:** krewpact.com
**Architecture Resolution:** All contradictions resolved in `KrewPact-Architecture-Resolution.md` (Feb 2026).

## Tech Stack (MVP)

- **Frontend:** Next.js 16 (App Router, TypeScript, Server Components) on Vercel
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives for WCAG AA)
- **Forms:** React Hook Form + Zod (shared validation between client and API)
- **Database:** Supabase PostgreSQL managed cloud (Pro tier) — RLS, Realtime, Storage
- **ERP:** ERPNext (GPL v3, any Linux host, exposed via Cloudflare Tunnel)
- **Auth:** Clerk (email + M365 SSO, Third-Party Auth session token for Supabase RLS)
- **E-Sign:** BoldSign (white-label API) — P0 Phase 2 (Week 7+)
- **Email:** Microsoft Graph (user mailbox + calendar) + Resend (transactional email)
- **Queue:** Upstash QStash + Upstash Redis
- **Workers:** Serverless queue processing via `/api/queue/process`
- **Connectivity:** Cloudflare Tunnel (ERPNext ↔ Vercel), Tailscale (SSH admin only)
- **CI/CD:** GitHub Actions
- **Testing:** Vitest (unit), Playwright (E2E), @axe-core/playwright (a11y)
- **Monitoring (MVP):** Vercel Analytics + Supabase Dashboard + BetterStack uptime + Sentry errors

## Architecture

```
User → Vercel (Next.js app + API routes) → Cloudflare Tunnel → ERPNext
                                          → Supabase Cloud (direct HTTPS)
                                          → Upstash Redis (rate limits/cache)
                                          → Upstash QStash (background jobs)

QStash → /api/queue/process → ERPNext / Supabase
```

| Layer           | Technology                              | Responsibility                                             |
| --------------- | --------------------------------------- | ---------------------------------------------------------- |
| Web App         | Next.js + React + TypeScript            | Internal UI, portals, PWA shell                            |
| API/BFF         | Next.js API routes (Vercel serverless)  | Domain APIs, orchestration, validation, rate limits        |
| Background Jobs | QStash + `/api/queue/process`           | ERPNext sync, retries, dead-letter                         |
| Operational DB  | Supabase Postgres (managed cloud)       | Workflows, field ops, audit trails, denormalized reporting |
| ERP Core        | ERPNext (any Linux + cloudflared)       | Accounting, inventory, procurement, invoicing, payments    |
| Object Storage  | Supabase Storage + CDN                  | Documents, photos, signed contracts                        |
| Identity        | Clerk Third-Party Auth                  | Auth, SSO, session claims. JWT claims drive RLS.           |
| Observability   | Vercel Analytics + Sentry + BetterStack | Errors, uptime. Full Prometheus/Grafana deferred.          |

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

## Clerk → Supabase Auth Bridge

Clerk Third-Party Auth session tokens drive Supabase RLS. The canonical claim source is Clerk session `metadata` populated from KrewPact user metadata:

- `metadata.krewpact_user_id`
- `metadata.krewpact_org_id`
- `metadata.division_ids`
- `metadata.role_keys`

RLS policies read those values from `auth.jwt()`; there is no custom JWT template dependency.

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

## Sales AGI Layer (from LeadForge Merge)

KrewPact's CRM now includes an autonomous sales automation layer:

- **Lead scoring:** `lead_scoring_rules` + `lead_score_history` — configurable fit/intent/engagement scoring per division
- **Outreach sequences:** `outreach_sequences` + `sequence_steps` + `sequence_enrollments` — multi-step automation
- **Email templates:** `email_templates` — merge fields, categories (outreach, follow-up, nurture)
- **Outreach tracking:** `outreach_events` — email/call/LinkedIn/SMS with delivery status
- **Enrichment pipeline:** `enrichment_jobs` — Apollo → Clearbit → LinkedIn → Google waterfall
- **Bidding opportunities:** `bidding_opportunities` — Bids & Tenders, MERX import
- **External tools:** Instantly.ai (outreach campaigns), Microsoft Graph, Resend

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
│   ├── queue/               # QStash job definitions and processing
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

### Mar 9, 2026 — Executive Nucleus: Full 4-Phase Build (PR #60 Merged)

- **Executive Nucleus** — restricted C-suite module (`executive`, `platform_admin` roles) for MDM Group operational intelligence. 53 new files, 8,387 lines, 19 commits across 4 phases.
- **Phase 1 (Foundation):** Role-gated layout with `ExecutiveNav`, 3 Supabase migrations (`knowledge_staging`, `executive_subscriptions`, `executive_metrics_cache`, `ai_chat_sessions`, `ai_chat_messages`), RLS policies, Zod validators.
- **Phase 2 (Knowledge):** Document staging pipeline with bulk vault import, review UI. pgvector semantic search (`match_knowledge` RPC, OpenAI ada-002 embeddings). RAG-powered AI chat (GPT-4o-mini with conversation history + source citations).
- **Phase 3 (Command Center):** Alerts API (stalled deals, SaaS renewals, stale projects). Metrics computation + cache with QStash cron. Overview API serving cached KPIs. Subscription CRUD with full table + form. Command center page with AlertsRibbon, MetricsGrid, DivisionScorecard, SubscriptionWidget.
- **Phase 4 (Polish):** Division comparison view (6-division selector with A/B compare mode, on-the-fly filtered metrics). Revenue forecast chart (Recharts stacked area, stage-weighted pipeline). Mobile-responsive layout (stacked widgets, edge-to-edge nav scroll).
- **Decisions:** Used `createServiceClient()` for chat (cross-user session access), `createUserClient()` for RLS-scoped reads. Division-filtered metrics computed on-the-fly (not cached). Forecast uses stage weights: won=100%, negotiation=75%, proposal=50%, qualified=25%, lead=10%.
- **Tests:** 3,478 passing (307 files), 115 new executive tests. 0 type errors in our code.

### Mar 10, 2026 — Production Readiness (14 Stories, Commit 6140711)

- **Security headers:** Added `X-DNS-Prefetch-Control: off`, `X-Permitted-Cross-Domain-Policies: none`, `clerk.mdmgroupinc.ca` to CSP `connect-src`
- **Sentry env validation:** Added `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` to env schema with production warnings. New `sentry-config.test.ts` + `env-validation.test.ts`.
- **Demo mode audit:** Verified production guard. Added 3 data-leak tests (client token, server token, static IDs).
- **ESLint zero warnings:** Fixed all 53 warnings (40+ unused vars, 7 React Compiler, exhaustive-deps, unused-expressions). Down from 53 → 0.
- **E2E smoke suite:** 3 new Playwright specs (`auth-smoke`, `crm-smoke`, `project-smoke`) — 7 tests total.
- **Error boundary UX:** `global-error.tsx` enhanced with "Go to Dashboard" link + error digest. All 11 `error.tsx` already had consistent UX.
- **Bundle analysis:** Largest client chunks ~316KB pre-gzip. Recharts auto-code-split per route. @react-pdf server-only. No action needed.
- **Tests:** 3,488 passing (309 files, +125 new). Lint 0/0. Typecheck clean. Build clean.

### Mar 9, 2026 — Enterprise Phase 2: Ralph Loop (18 Stories, PR #59 Merged)

- Realtime subscriptions, PDF generation, executive/PM dashboards, global search, audit log, bulk ops, keyboard chords, toast system, onboarding wizard, query key factory, Sentry migration. ESLint 10→9 downgrade. 3,363 tests (294 files). PR #59 merged.

- Mar 8: P1 completion + autonomous loop (all 18 PRD tasks). 2,838-3,092 tests.
- Mar 7: Collaboration readiness, first production deploy. 2,780 tests.
- Mar 6: CRM FEATURE COMPLETE. 2,780 tests.
