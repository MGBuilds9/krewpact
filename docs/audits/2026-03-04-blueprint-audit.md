# KrewPact Blueprint Audit — 2026-03-04

## Executive Summary

**Alignment Score:** 78/100
**Critical Issues:** 2
**Architecture Drift:**
- Codebase has significantly outpaced P0 MVP scope — P1/P2 features built ahead of schedule (portals, safety, procurement, closeout, selections, warranty)
- Core MVP dependencies (Resend, BoldSign, BullMQ/Upstash, Sentry, axe-core) are NOT installed as npm packages — code references them but they're mocked/stubbed
- ERPNext mappers exist (11 files) but no real sync has been tested against a live instance

## Code Health

| Check | Result |
|-------|--------|
| Lint | 0 errors, 210 warnings (all `no-console`) |
| Typecheck | Clean (0 errors) |
| Tests | 2,061 passed / 168 files |
| E2E | 8 spec files |
| Migrations | 34 SQL files |
| Total TS/TSX files | 832 |

## Blueprint vs Implementation

### Epic 1: Identity & Access (P0)

| Area | Blueprint Says | Actual | Status | Priority |
|------|----------------|--------|--------|----------|
| Auth (Clerk) | Clerk with email + M365 SSO | `@clerk/nextjs` installed, auth routes exist at `app/auth/` | Compliant | - |
| RBAC | 9 internal + 4 external roles, division-scoped | `app/api/rbac/`, `app/api/org/roles/`, `lib/validators/org.ts` | Compliant | - |
| Divisions | 6 MDM divisions | `app/api/org/divisions/`, seed data exists | Compliant | - |
| JWT Bridge | Clerk JWT -> Supabase RLS with `krewpact_user_id` | RLS policies in 2+ migrations use `auth.jwt()` claims | Compliant | - |
| RLS Policies | Deny-by-default, division isolation | 34 migrations with RLS, dedicated RLS test files | Compliant | - |

### Epic 2: CRM (P0)

| Area | Blueprint Says | Actual | Status | Priority |
|------|----------------|--------|--------|----------|
| Leads CRUD | Full lifecycle | `app/api/crm/leads/` (7 sub-routes), `app/(dashboard)/.../crm/leads/` | Compliant | - |
| Opportunities | Pipeline + stages | `app/api/crm/opportunities/` (7 sub-routes) | Compliant | - |
| Accounts | CRUD | `app/api/crm/accounts/`, UI pages | Compliant | - |
| Contacts | CRUD | `app/api/crm/contacts/` (5 sub-routes) | Compliant | - |
| Activities | Logging | `app/api/crm/activities/` (3 routes) | Compliant | - |
| Lead scoring | Configurable rules | `lib/crm/scoring-engine.ts`, `app/api/crm/scoring-rules/` | Compliant | - |
| Sequences | Multi-step outreach | `lib/crm/sequence-processor.ts`, `app/api/crm/sequences/` (10+ routes) | Compliant | - |
| Email templates | Merge fields | `lib/email/template-renderer.ts`, `app/api/crm/email-templates/` | Compliant | - |
| CRM Dashboard | Metrics, ownership | `app/(dashboard)/.../crm/dashboard/`, `app/api/crm/dashboard/` | Compliant | - |
| Saved views | User-configurable | `app/api/crm/saved-views/` | Extra (not in P0) | L |
| SLA alerts | Overdue tracking | `app/api/crm/sla/`, `lib/crm/sla-config.ts` | Extra (P1) | L |
| Import/Export | Bulk ops | `app/api/crm/import/`, `app/api/crm/export/` | Extra | L |

### Epic 3: Estimating (P0)

| Area | Blueprint Says | Actual | Status | Priority |
|------|----------------|--------|--------|----------|
| Estimate builder | Line items, templates | `app/api/estimates/` (7 sub-routes), `lib/estimating/` | Compliant | - |
| Estimate versioning | Version history | `app/api/estimates/[id]/versions/` | Compliant | - |
| Templates | Reusable | `app/api/estimate-templates/` | Compliant | - |
| Assemblies | Grouped items | `app/api/assemblies/` | Extra (P2 per Resolution) | L |
| Cost catalog | Item library | `app/api/cost-catalog/` | Extra (P2) | L |
| Alternates/Allowances | Bid alternates | `app/api/estimates/[id]/alternates/`, `/allowances/` | Extra (P2) | L |

### Epic 4: Contracting (P0)

| Area | Blueprint Says | Actual | Status | Priority |
|------|----------------|--------|--------|----------|
| Proposals | Proposal generation | `app/api/proposals/`, `lib/crm/proposal-generator.ts` | Compliant | - |
| E-sign (BoldSign) | White-label API | `app/api/esign/`, `app/api/webhooks/boldsign/`, validators exist | Drift — boldsign NOT in package.json | H |
| Contracts | Contract tracking | `app/api/contracts/` | Compliant | - |

### Epic 5: Project Setup (P0)

| Area | Blueprint Says | Actual | Status | Priority |
|------|----------------|--------|--------|----------|
| Project creation | From contract | `app/api/projects/` (30+ sub-route dirs) | Compliant | - |
| Members | Team assignment | `app/api/projects/[id]/members/` | Compliant | - |
| Milestones | Not explicitly in API | No standalone milestones route found | Drift | M |

### Epic 6: Project Execution (P0)

| Area | Blueprint Says | Actual | Status | Priority |
|------|----------------|--------|--------|----------|
| Tasks | CRUD + comments | `app/api/tasks/` (3 sub-routes) | Compliant | - |
| Daily logs | Online-only for MVP | `app/api/projects/[id]/daily-logs/`, `app/(dashboard)/.../diary/` | Compliant | - |
| Document upload | Basic | `app/api/projects/[id]/files/` (versions, sharing) | Compliant | - |

### Epic 7: ERPNext Sync (P0)

| Area | Blueprint Says | Actual | Status | Priority |
|------|----------------|--------|--------|----------|
| ERP client | `lib/erp/client.ts` | Exists with env var config | Compliant | - |
| Entity mappers | 12 MVP mappings | 9 mappers: contact, expense, opportunity, project, sales-order, supplier, task, timesheet + mock-responses | Drift — missing Customer, Quotation, Sales Invoice mappers | M |
| Sync service | Outbox + retry | `lib/erp/sync-service.ts` | Compliant | - |
| Sync API | Job trigger + status | `app/api/erp/sync/` + `[jobId]/` | Compliant | - |
| BullMQ/Upstash | Queue for workers | `lib/queue/` (4 files: client, index, processor, types) | Drift — bullmq + @upstash/redis NOT in package.json | H |

### Non-Functional Requirements

| Area | Blueprint Says | Actual | Status | Priority |
|------|----------------|--------|--------|----------|
| Email (Resend) | Transactional email | `lib/email/resend.ts` exists but `resend` NOT in package.json | Missing dep | H |
| Monitoring (Sentry) | Error tracking | Not installed, no Sentry config | Missing | M |
| Monitoring (BetterStack) | Uptime | Not installed | Missing | M |
| A11y (axe-core) | CI pipeline | `@axe-core/playwright` NOT in package.json | Missing dep | M |
| Forms | React Hook Form + Zod | Both installed (rhf ^7.71.2, zod ^4.3.6) | Compliant | - |
| Supabase types | Generated types | `types/supabase.ts` exists | Compliant | - |

### Features Built Beyond P0 (Extra)

| Feature | Blueprint Phase | Evidence | Status |
|---------|----------------|----------|--------|
| Client Portal | P1 | `app/(portal)/client/`, `app/api/portal/` | Extra |
| Trade Portal | P2 | `app/(portal)/trade/`, `app/api/portal/trade/` | Extra |
| Change Orders/RFIs | P1 | `app/api/projects/[id]/change-orders/`, `/rfis/` | Extra |
| Safety Module | P2 | `app/api/projects/[id]/safety/` (5 sub-modules) | Extra |
| Procurement/RFQs | P2 | `app/api/projects/[id]/rfqs/` | Extra |
| Closeout & Warranty | P2 | `app/api/projects/[id]/closeout/`, `/warranty/` | Extra |
| Selections & Allowances | P2 | `app/api/projects/[id]/selections/` | Extra |
| Finance Module | P1 | `app/api/finance/` (invoices, job-costs, POs) | Extra |
| Timesheets | P1 | `app/api/timesheet-batches/`, `/time-entries/` | Extra |
| Expenses | P1 | `app/api/expenses/` | Extra |
| Calendar | P2 | `app/api/calendar/` | Extra |
| Notifications | P1 | `app/api/notifications/` | Extra |
| Reports | P1 | `app/api/reports/` | Extra |
| BCP/Incidents | Extra | `app/api/bcp/` | Extra (not in blueprint) |
| Governance | Extra | `app/api/governance/` | Extra (not in blueprint) |
| Migration | Extra | `app/api/migration/` | Extra (not in blueprint) |
| Privacy/PIPEDA | Extra | `app/api/privacy/` | Extra (not in blueprint) |
| Data Enrichment | Extra | `lib/integrations/` (apollo, enrichment, deep-research) | Extra |
| RAG/pgvector | Extra | `types/supabase.ts` has types, `scripts/ingest-book.ts` | Extra |
| Email tracking | Extra | `app/api/email/track/` (open/click) | Extra |
| Cron jobs | Extra | `app/api/cron/` (6 endpoints) | Extra |

### File Structure vs Blueprint

| Blueprint Expects | Actual | Status |
|-------------------|--------|--------|
| `src/app/` | `app/` (no src prefix) | Drift — minor, Next.js standard |
| `src/lib/` | `lib/` | Drift — same |
| `src/components/` | `components/` | Drift — same |
| `src/types/` | `types/` | Drift — same |
| Feature dirs: `(auth)/`, `(dashboard)/` | `auth/`, `(dashboard)/` — correct | Compliant |
| `components/ui/` | Exists | Compliant |
| `components/layout/` | `components/Layout/` (capitalized) | Drift — minor |

## Action List

### Immediate (Critical — blocks real deployment)

- [ ] **Install core NPM packages**: `resend`, `bullmq`, `@upstash/redis` (or `@upstash/qstash`), `@sentry/nextjs`, `@axe-core/playwright` — code references these but they're not installed. Currently everything works because of mocking/stubbing.
- [ ] **BoldSign SDK**: Determine correct npm package name and install. E-sign is P0 Phase 2 (Week 7+).

### Short-term (before go-live)

- [ ] Add missing ERPNext mappers: Customer mapper, Quotation mapper, Sales Invoice (read) mapper — 3 of 12 MVP mappings missing
- [ ] Milestones API route: Blueprint specifies milestones as P0 but no standalone API endpoint found
- [ ] Configure Sentry project and add `@sentry/nextjs` with error boundary
- [ ] Set up BetterStack uptime monitoring for `app.krewpact.com`
- [ ] Add `@axe-core/playwright` to E2E tests for WCAG compliance
- [ ] Clean up 210 `no-console` lint warnings (use structured logger)
- [ ] Dashboard page: `app/(dashboard)/org/[orgSlug]/dashboard/page.tsx` exists but verify it's wired up

### Documentation (blueprint updates)

- [ ] Update Architecture Resolution to acknowledge P1/P2 features already built (portals, safety, procurement, closeout, selections, warranty, finance, timesheets, expenses, calendar, notifications, reports)
- [ ] Add new epics not in original blueprint: BCP/Incidents, Governance/Reference Data, Migration/Data Import, Privacy/PIPEDA compliance, Email Tracking, Cron Infrastructure
- [ ] Document `lib/integrations/` (Apollo, enrichment pipeline) in architecture docs
- [ ] Note file structure uses root-level dirs (no `src/` prefix) — update blueprint Expected File Structure
- [ ] Update ERPNext mapper inventory (9 built out of 12 MVP target)

---

**Summary:** KrewPact's implementation substantially exceeds the P0 MVP scope with 40+ API route groups, 25+ component modules, and 832 TS files. Core P0 epics (Auth, CRM, Estimating, Contracting, Projects, Execution) are implemented. The main gap is **missing npm dependencies for external services** (Resend, BullMQ, Upstash, Sentry, axe-core, BoldSign) — the code architecture is in place but the actual packages aren't installed, meaning real integrations haven't been wired up yet. Three ERPNext mappers are also missing. The scope creep into P1/P2 territory is impressive but should be documented to keep the blueprint accurate.
