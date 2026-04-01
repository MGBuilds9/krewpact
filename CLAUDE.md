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
npm run build          # Production build
npm run lint           # ESLint (flat config)
npm run typecheck      # tsc --noEmit (strict mode)
npm run test           # Vitest unit tests
npm run test:coverage  # Unit tests with coverage
npm run test:e2e       # Playwright E2E (chromium)
npm run format:check   # Prettier check (CI-safe)
npm run health         # Health check script
npm run health:deep    # Deep health check (all services)
```

Seed scripts: `npm run seed:org`, `seed:admin`, `seed:test-users`, `seed:scoring`, `seed:reference`, `seed:demo`

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

43 mappings complete: MVP 12 (Customer, Contact, Opportunity, Quotation, Sales Order, Project, Task, Sales Invoice read, Purchase Invoice read, Supplier, Expense Claim, Timesheet) + P2 Batch 2A (Purchase Order, Purchase Receipt, Supplier Quotation, RFQ, Material Request, Stock Entry, Warehouse, Item) + 2B (Payment Entry, Journal Entry, GL Entry read, Bank Account, Mode of Payment, Cost Center, Budget) + 2C (BOM, Work Order, Quality Inspection, Serial No, Batch, UOM, Item Price, Price List) + 2D (Employee, Attendance, Leave Application, Holiday List, Designation, Department, HR Settings, Company).

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

### Apr 1, 2026 — Multi-Tenancy Polish + Tech Debt

- **Changes:** (1) **Branding UI:** Added 4 missing fields (company_description, erp_company, footer_text, support_url) + live preview card to settings/branding page. (2) **Portal RLS:** Added RESTRICTIVE INSERT/UPDATE policies to portal_accounts, portal_permissions, portal_messages, portal_view_logs — closes write-path cross-org gap. Applied to Supabase. (3) **BoldSign tenant:** Added `boldsign_brand_id` to branding schema + OrgBrandingInfo for per-tenant e-sign sender identity. (4) **Drop lead_stage:** Dropped orphaned `lead_stage` enum type (leads.stage column already gone, leads.status is active). Regenerated types/supabase.ts. Fixed enum count test. (5) **DESIGN.md:** Documented actual running design system (colors, fonts, components, patterns) — replaces stale MASTER.md.
- **Decisions:** Portal reads already org-scoped via RLS RESTRICTIVE SELECT (from Phase 0). Only write-path needed migration. leads.stage column was already absent from remote DB — only the orphaned enum type remained. `boldsign_brand_id` stored in branding JSONB (no migration needed).
- **Migrations applied:** `drop_lead_stage_enum`, `portal_rls_write_org_scope`. Both confirmed on Supabase.
- **Tests:** 5,274+ passing. 15 new tests. 5 pre-existing TS errors in payroll-export.ts (adp_employee_code not yet migrated).
- **Next:** Apply adp_employee_code migration. Branding settings UI for boldsign_brand_id (admin-only). Portal multi-tenant E2E verification.

### Mar 31, 2026 — Multi-Tenancy Phase 0-1.5 + Phase 2-3

- Mar 31 (session 2): Phase 1.5 executive org scoping + Phase 2 tenant provisioning + Phase 3 docs + knowledge org_id migration + nav flag gating + welcome checklist. 5,266 tests.
- Mar 31 (session 1): P0 RLS fix + users.org_id + withApiRoute orgId + root redirect + branding schema + MDM string removal. 5,230 tests.
- Mar 30: Repo cleanup + multi-tenant strategy + codex review. CRM pipeline reorder + gap-hunter. CSO audit. 5,223 tests.
- Mar 29: P2 buildout (ADP, ERPNext, Offline/PWA, Mobile). 5,198 tests.
- Mar 28: Cleanup (-10K lines) + DB hardening. 4,799 tests.
- Mar 27: RBAC overhaul + A-Z audit. 4,851 tests.
- Mar 25-26: Production hardening, go-live. 4,715 tests.

@AGENTS.md
