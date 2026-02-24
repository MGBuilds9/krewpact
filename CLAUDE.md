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

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| Web App | Next.js + React + TypeScript | Internal UI (online-only for MVP, offline deferred to P2) |
| API/BFF | Next.js API routes (Vercel serverless) | Domain APIs, orchestration, validation, rate limits |
| Sync Workers | Node.js on ERPNext host | BullMQ workers for ERPNext sync, retries, dead-letter |
| Operational DB | Supabase Postgres (managed cloud) | Workflows, field ops, audit trails, denormalized reporting |
| ERP Core | ERPNext (any Linux + cloudflared) | Accounting, inventory, procurement, invoicing, payments |
| Object Storage | Supabase Storage + CDN | Documents, photos, signed contracts |
| Identity | Clerk → Supabase JWT bridge | Auth, SSO, session claims. JWT claims drive RLS. |
| Observability | Vercel Analytics + Sentry + BetterStack | Errors, uptime. Full Prometheus/Grafana deferred. |

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

| Code | Name | Description |
|------|------|-------------|
| `contracting` | MDM Contracting | General contracting |
| `homes` | MDM Homes | Residential construction |
| `wood` | MDM Wood | Wood/lumber |
| `telecom` | MDM Telecom | Telecommunications |
| `group-inc` | MDM Group Inc. | Parent company / corporate |
| `management` | MDM Management | Property management |

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

| Phase | Weeks | Features |
|-------|-------|----------|
| Foundation | 1-2 | Auth, RBAC, Supabase schema, ERPNext client, Cloudflare Tunnel, app shell, CI/CD |
| CRM + Estimating | 3-6 | Leads, opportunities, accounts, contacts, estimate builder, ERPNext sync (Customer, Quotation) |
| Contracting + Projects | 7-9 | Proposals, BoldSign e-sign, project creation, members, milestones, ERPNext sync (Sales Order, Project) |
| Execution + Go-Live | 10-12 | Tasks, daily logs, document upload, invoice snapshots, dashboard, UAT, deploy |

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

### Feb 24, 2026 — Cross-Subdomain SSO (Clerk Shared Auth)
- **Changes:** Configured Clerk API for cross-subdomain session sharing across `*.mdmgroupinc.ca`. Added 6 allowed origins and 6 redirect URLs via Clerk Backend API (`api.clerk.com`). Added `NEXT_PUBLIC_CLERK_DOMAIN=mdmgroupinc.ca` to `.env.local`. Added `authorizedParties` to `middleware.ts` for subdomain cookie leaking protection. Added `allowedRedirectOrigins` to `ClerkProvider` in `app/layout.tsx`. Updated `.env.example` with `NEXT_PUBLIC_CLERK_DOMAIN`.
- **Decisions:** Subdomains of same root domain share sessions automatically in Clerk — no satellite domain setup needed (also requires plan upgrade). `authorizedParties` allowlist protects against subdomain cookie attacks. `allowedRedirectOrigins` on ClerkProvider permits auth redirects from sibling subdomains.
- **Tests:** 650/650 passing, 0 lint errors, typecheck clean.
- **Next steps:** Verify cross-subdomain SSO works in browser (portal → dashboard → hub). Deploy KrewPact to Vercel with `hub.mdmgroupinc.ca` custom domain + Cloudflare CNAME.

### Feb 24, 2026 — Full Service Connection + Microsoft Graph Integration
- **Phase 1 (DB):** Applied RLS helper functions (`krewpact_user_id()`, `krewpact_divisions()`, `krewpact_roles()`, `is_platform_admin()`) + foundation/CRM/Sales AGI RLS policies to live Supabase. Created `ensure_clerk_user` SECURITY DEFINER function. Adapted policies for Sales AGI schema (contacts use `lead_id` not `account_id`, tasks use `lead_id` not `project_id`).
- **Phase 2 (Clerk Bootstrap):** Bootstrapped Michael + David user records in Supabase. Assigned roles/divisions. Set Clerk `public_metadata` (krewpact_user_id, division_ids, role_keys). Updated Clerk JWT template with KrewPact claims.
- **Phase 3 (Code):** Created Clerk webhook handler (`app/api/webhooks/clerk/route.ts`) with svix signature verification. Fixed `NEXT_PUBLIC_APP_URL`. Made `ALLOWED_DOMAINS` configurable. Added `authorizedParties` to middleware.
- **Microsoft Graph Integration:** Full email + calendar via Clerk-brokered M365 OAuth tokens. Graph client library, 5 API routes (inbox, read, send + CRM auto-logging, calendar list/create/detail), shared mailbox support (`info@mdmcontracting.ca`), React Query hooks, dashboard widgets (InboxPreview + CalendarWidget). 53 new tests.
- **Tests:** 650/650 passing, 0 lint errors, typecheck clean, build clean.
- **Pending (manual):** Register Clerk webhook at `hub.mdmgroupinc.ca/api/webhooks/clerk`, add `CLERK_WEBHOOK_SECRET` to Vercel, fix `NEXT_PUBLIC_APP_URL` on Vercel.

### Feb 23, 2026 — LeadForge Pipeline (Phases A-F) + Clerk Auth Unification
- **Changes:** Full LeadForge replacement pipeline. Phases A-E: outreach sequence engine (6 API routes), Apollo integration + enrichment waterfall, division auto-routing, Resend email automation, sequence processor cron, pipeline/reporting dashboards, scoring admin. Phase F: replaced SHA-256 password gate on MDM-Book-Internal dashboard + portal with Clerk JS SDK (`@clerk/clerk-js@5`). Deployed both to Cloudflare Pages.
- **Decisions:** Clerk JS SDK for static sites (no backend needed). Domain restriction via `clerk.user.primaryEmailAddress` check. Safe DOM manipulation (createElement/textContent) to pass security hooks — no innerHTML. Division router uses keyword matching with contracting as default.
- **Tests:** 597/597 passing, 0 lint errors, typecheck clean, build clean.
- **Pushed:** to main (KrewPact + MDM-Book-Internal)
- **Next steps:** Add `dashboard.mdmgroupinc.ca` and `portal.mdmgroupinc.ca` as allowed redirect URIs in Clerk dashboard. Set up n8n workflows (LF-001 through LF-050). Wire mdm-website-v2 contact form to KrewPact lead intake.

### Feb 16, 2026 — Repo Hygiene #15
- **Merged:** 11 Dependabot PRs. Cleaned stale ralph branch. Tests: 554/554.

- Feb 15: Tier 3 Zod validation — all 32 mutating routes covered. 554 tests.
- Feb 13: CRM + Estimating Phase 1 (Ralph Loop) — 23 stories, 549 tests, PR #1.
- Feb 12: MDM Unified Growth Intelligence System (Phase 0) — Sales AGI + pgvector schema.
- Feb 12: Repo Hygiene #1-2 — Verified clean state, fixed UUID fixtures.
- Feb 10: Architecture resolution (23 issues) + /scope skill.

