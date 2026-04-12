# AGENTS.md

This file provides guidance to non-Claude AI agents (Codex, Gemini, Cursor) when working in this repository. For Claude-specific instructions, see `CLAUDE.md`.

## Code Discovery

This project uses `codebase-memory-mcp` to maintain a knowledge graph of the codebase.
Prefer MCP graph tools over grep/glob/file-search for code discovery.

Priority order:

1. `search_graph` — find functions, classes, routes, variables by pattern
2. `trace_call_path` — trace who calls a function or what it calls
3. `get_code_snippet` — read specific function/class source code
4. `query_graph` — run Cypher queries for complex patterns
5. `get_architecture` — high-level project summary

Fall back to grep/glob only for:

- String literals, error messages, config values
- Non-code files such as Markdown, YAML, shell scripts, Dockerfiles, and generated outputs
- Cases where MCP graph tools are insufficient

## Agent Workflow

1. Read this `AGENTS.md` and review `CLAUDE.md` for repo-specific nuance when needed.
2. Check `.env.local` for required environment variables before attempting integrations.
3. Review feature flags before touching gated UI or navigation.
4. Log discovered issues or architecture drift in `docs/issues-log.md` when the task calls for ongoing audit work.

## Blueprint Audit

`blueprint-audit` is an available workspace skill and should be used for milestone drift checks, architecture reviews, and "did we build what we planned" validation.

Repo-specific blueprint sources:

- `docs/architecture/KrewPact-Master-Plan.md`
- `docs/architecture/KrewPact-Technology-Stack-ADRs.md`
- `docs/architecture/KrewPact-Feature-Function-PRD-Checklist.md`
- `docs/architecture/KrewPact-Integration-Contracts.md`
- `docs/architecture/KrewPact-Architecture-Overview.md`
- `docs/plans/*.md`
- `docs/superpowers/specs/*.md`
- `docs/audits/*.md`

Blueprint audit protocol for this repo:

1. Treat code as the source of truth.
2. Compare implementation against the blueprint and ADRs.
3. Record drift as one of: missing, unexpected, naming drift, or behavior drift.
4. Verify critical integration seams explicitly: Clerk → Supabase RLS, Next.js BFF routes, ERPNext via `lib/erp/client.ts`, QStash jobs, and feature-flag gating.
5. If implementation is better or more current than the blueprint, update the blueprint rather than forcing the code backward.

When auditing, always check:

- Architectural alignment
- Security and auth assumptions
- Data authority boundaries between Supabase and ERPNext
- Feature-flag coverage for gated surfaces
- Test and validation status

## Project Overview

KrewPact is a construction operations platform for MDM Group Inc. (Mississauga, Ontario). It follows a hybrid ERPNext-first architecture: ERPNext owns finance, accounting, and procurement; KrewPact owns UX, field operations, portals, identity, inventory (Mar 2026 — replaces Almyta), and reporting. One Supabase instance. One Clerk auth. One event bus.

**Domain:** krewpact.com

## Tech Stack

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

## Architecture

```
User → Vercel (Next.js app + API routes) → Cloudflare Tunnel → ERPNext
                                          → Supabase Cloud (direct HTTPS)
                                          → Upstash Redis (rate limits/cache)
                                          → Upstash QStash (background jobs)

QStash → /api/queue/process → ERPNext / Supabase
```

| Layer           | Technology                                                 | Responsibility                                             |
| --------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| Web App         | Next.js + React + TypeScript                               | Internal UI, portals, PWA shell                            |
| API/BFF         | Next.js API routes (Vercel serverless)                     | Domain APIs, orchestration, validation, rate limits        |
| Background Jobs | QStash + `/api/queue/process`                              | ERPNext sync, retries, dead-letter                         |
| Operational DB  | Supabase Postgres (managed cloud)                          | Workflows, field ops, audit trails, denormalized reporting |
| ERP Core        | ERPNext (any Linux + cloudflared)                          | Accounting, procurement, invoicing, payments               |
| Inventory       | Supabase (KrewPact owns) / ERPNext gets cost journals only |                                                            |
| Object Storage  | Supabase Storage + CDN                                     | Documents, photos, signed contracts                        |
| Identity        | Clerk Third-Party Auth                                     | Auth, SSO, session claims. JWT claims drive RLS.           |
| Observability   | Vercel Analytics + Sentry + BetterStack                    | Errors, uptime.                                            |

## MDM Group Divisions

| Code          | Name            | Description                |
| ------------- | --------------- | -------------------------- |
| `contracting` | MDM Contracting | General contracting        |
| `homes`       | MDM Homes       | Residential construction   |
| `wood`        | MDM Wood        | Wood/lumber                |
| `telecom`     | MDM Telecom     | Telecommunications         |
| `group-inc`   | MDM Group Inc.  | Parent company / corporate |
| `management`  | MDM Management  | Property management        |

## Data Authority Rules

- **ERPNext authoritative for:** GL, invoices, payments, purchase orders, accounting
- **Supabase authoritative for:** workflows, field ops, portals, audit trails, user/RBAC, lead scoring, outreach, knowledge embeddings, inventory (Mar 2026)
- **Cross-system link:** `krewpact_id` field on ERPNext doctypes maps to Supabase records
- **Sync:** Eventual consistency. Outbox/inbox, idempotent upsert, retry with backoff, dead-letter. No 2PC.
- **GPL v3 boundary:** KrewPact communicates with ERPNext exclusively through REST API via Cloudflare Tunnel. No shared code.

## Auth: Clerk Third-Party Auth → Supabase RLS

Clerk session tokens drive Supabase RLS via Third-Party Auth (no custom JWT template). Claims sourced from Clerk `publicMetadata`:

- `krewpact_user_id` — maps to Supabase user record
- `krewpact_org_id` — organization scope
- `division_ids` — JSONB array for multi-division access
- `role_keys` — role-based access control

RLS rules: deny by default. Never use `auth.uid()` — use `auth.jwt() ->> 'krewpact_user_id'`. Index every column referenced in RLS policies.

## Canonical Role Model

**Internal (9):** `platform_admin`, `executive`, `operations_manager`, `project_manager`, `project_coordinator`, `estimator`, `field_supervisor`, `accounting`, `payroll_admin`

**External (4):** `client_owner`, `client_delegate`, `trade_partner_admin`, `trade_partner_user`

## File Structure

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
  (portal)/                        # External client/trade partner portal
  api/                             # Route groups (BFF pattern)
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
  supabase/server.ts               # Server client (Clerk session token → RLS)
  supabase/client.ts               # Browser client
  queue/                           # QStash job definitions
  validators/                      # Shared Zod schemas (one per domain)
  logger.ts                        # Structured logger (never console.log)
  env.ts                           # Environment variable validation
types/
  supabase.ts                      # Generated types (never edit manually)
mobile/                            # Expo SDK 54 app
```

For current route and feature counts, see `docs/audits/`. As of Mar 28, 2026: 127 pages, 365 API routes, 4,799 tests (435 files), 17/17 feature flags enabled, 5/5 P1 epics complete.

## Key Conventions

- All ERPNext calls go through `lib/erp/client.ts` — sole access point
- ERPNext auth: `Authorization: token {key}:{secret}` header
- Supabase generated types: `supabase gen types typescript --local > types/supabase.ts 2>/dev/null`
- API routes are thin BFF orchestrators — auth, validate (Zod), call `lib/`, return typed response
- Server Actions are public HTTP endpoints — always validate input, authenticate, authorize, and avoid exposing raw DB errors
- DB from serverless: use Supabase Supavisor pooler (port 6543, transaction mode), not direct (port 5432)
- Server Components by default; `'use client'` only when genuinely needed
- No barrel files — import directly: `import { Button } from '@/components/ui/button'`
- No `any` — use `unknown` with type guards or Zod
- No `console.log` — use `lib/logger.ts`
- Feature flags in `org_settings.feature_flags` (JSONB, per-org) — served via `OrgContext`; never add nav items without a flag
- Never modify `components/ui/` directly — update via shadcn CLI only
- Never use `service_role` in client code
- Never use `auth.uid()` in Supabase RLS with Clerk — use `auth.jwt()` claims
- No mock data in production code
- No `window.prompt()` or `window.confirm()` — use dialogs
- No raw IDs or UUIDs in end-user UI

## Build Commands

```bash
npm run dev            # Next.js dev server (Turbopack)
npm run validate       # Canonical local validation pass
npm run build          # Production build
npm run lint           # ESLint (flat config)
npm run typecheck      # tsc --noEmit (strict mode)
npm run test           # Vitest unit tests
npm run test:coverage  # Unit tests with coverage
npm run test:e2e       # Playwright E2E (chromium)
npm run qa:e2e         # Authenticated production QA against deployed app
npm run format:check   # Prettier check
npm run health         # Health check script
npm run health:deep    # Deep health check
```

After Supabase schema changes: `supabase gen types typescript --local > types/supabase.ts 2>/dev/null`

## Required Environment Variables

- **ERPNext:** `ERPNEXT_BASE_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- **Clerk:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
- **Upstash:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **App:** `NEXT_PUBLIC_APP_URL`, `WEBHOOK_SIGNING_SECRET`

Full template and setup: `docs/local-dev.md`

## Planning And Audit Documents

- Core planning docs live in `docs/architecture/`
- Active implementation plans live in `docs/plans/` and `docs/superpowers/plans/`
- Detailed specs live in `docs/superpowers/specs/`
- Historical blueprint and production-readiness audits live in `docs/audits/`

Before large refactors or audit work, read the relevant plan or ADR first.

## Compliance

- **PIPEDA** — Auth (Clerk) and DB (Supabase) in US. Disclosed in privacy policy. Field-level encryption for SIN/banking.
- **Construction Act 2026** — Ontario; lien/holdback/notice requirements in P1
- **AODA/WCAG** — @axe-core/playwright in CI. Radix primitives for ARIA.

## Scale & SLO

- 300 internal users max
- 99.5% SLO (MVP). RPO 15min, RTO 2h
- CAD + GST/HST/PST (Canada-first)

---

> **Note:** This file is for non-Claude AI agents. Claude Code reads `CLAUDE.md` for agent-specific protocol, session rules, and extended architectural context.
