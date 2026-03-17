# KrewPact Blueprint Audit — 2026-03-16

## Executive Summary

**Alignment Score:** 94/100 _(up from 92 on Mar 8)_
**Critical Issues:** 0
**Architecture Drift:**

- Codebase continues to exceed P0 MVP scope — all P1 and most P2 features built (portals, safety, procurement, closeout, selections, warranty, RFQs, photos, meetings)
- ERPNext mappers expanded to 14 (up from 11) — now includes payment-entry and purchase-invoice
- Smoke test email flooding fixed (was sending 70+ emails/day from every-15-min cron with no dedup)
- Lint warnings reduced to 1 (from 42)
- 3,876 tests passing (up from 2,838)

## Previous Audit Delta (Mar 8 → Mar 16)

| Metric          | Mar 8             | Mar 16            | Change                                     |
| --------------- | ----------------- | ----------------- | ------------------------------------------ |
| Alignment Score | 92/100            | 94/100            | +2                                         |
| Critical Issues | 0                 | 0                 | Stable ✅                                  |
| Tests           | 2,838 (255 files) | 3,876 (343 files) | +1,038 tests, +88 files                    |
| API Routes      | 270               | 314               | +44                                        |
| Migrations      | 37                | 52                | +15                                        |
| Lint Warnings   | 42                | 1                 | -41 ✅                                     |
| Lint Errors     | 0                 | 0                 | Stable ✅                                  |
| Typecheck       | Clean             | Clean             | Stable ✅                                  |
| ERPNext Mappers | 11                | 14                | +3 (payment-entry, purchase-invoice, mock) |
| Components      | 228               | 259               | +31                                        |
| E2E Specs       | 8                 | 18                | +10                                        |
| Validators      | 18                | 20                | +2                                         |
| Lib services    | 84                | 117               | +33                                        |

### Previous Warnings — Resolved

| Issue                                       | Mar 8 Status | Mar 16 Resolution                            |
| ------------------------------------------- | ------------ | -------------------------------------------- |
| 42 lint warnings (no-console + unused vars) | ⚠️ Drift     | ✅ Down to 1 warning (unused eslint-disable) |
| ERPNext live testing not done               | ⚠️           | ⚠️ Still not tested against live instance    |

### New Issues Found

| Issue                                       | Severity | Details                                             |
| ------------------------------------------- | -------- | --------------------------------------------------- |
| Smoke test email flooding                   | Fixed    | Was sending 70+/day; now has cooldown + hourly cron |
| Husky pre-commit hook had Windows CR (`\r`) | Low      | Caused commit failures via npx; fixed locally       |

## Code Health

| Check         | Result                   |
| ------------- | ------------------------ |
| Lint          | 0 errors, 1 warning      |
| Typecheck     | Clean (0 errors)         |
| Tests         | 3,876 passed / 343 files |
| Build         | Clean (verified via CI)  |
| E2E           | 18 spec files            |
| Migrations    | 52 SQL files             |
| API Routes    | 314 route.ts files       |
| Components    | 259 .tsx files           |
| Pages/Layouts | 116 .tsx files           |
| Lib services  | 117 .ts files            |
| Validators    | 20 Zod schema files      |
| Hooks         | 39 hook files            |
| Cron Jobs     | 14 (vercel.json)         |

## Blueprint vs Implementation

### Epic 1: Identity & Access (P0) — ✅ COMPLIANT

| Area         | Blueprint Says                                   | Actual (evidence)                                       | Status |
| ------------ | ------------------------------------------------ | ------------------------------------------------------- | ------ |
| Auth (Clerk) | Clerk with email + M365 SSO                      | `@clerk/nextjs`, middleware.ts, org-scoped routes       | ✅     |
| RBAC         | 9 internal + 4 external roles, division-scoped   | `app/api/rbac/`, `app/api/org/roles/`, validators       | ✅     |
| Divisions    | 6 MDM divisions                                  | `app/api/org/divisions/`, seed data                     | ✅     |
| JWT Bridge   | Clerk JWT → Supabase RLS with `krewpact_user_id` | RLS policies in 52 migrations, `lib/supabase/server.ts` | ✅     |
| RLS Policies | Deny-by-default, division isolation              | 52 migrations with RLS                                  | ✅     |
| Org routing  | Multi-org support                                | `app/(dashboard)/org/[orgSlug]/` route group            | ✅     |

### Epic 2: CRM (P0) — ✅ COMPLIANT + EXTENSIVE EXTRAS

| Area            | Blueprint Says      | Actual                                                              | Status        |
| --------------- | ------------------- | ------------------------------------------------------------------- | ------------- |
| Leads CRUD      | Full lifecycle      | 12 sub-routes under `/crm/leads/`                                   | ✅            |
| Opportunities   | Pipeline + stages   | 8 sub-routes under `/crm/opportunities/`                            | ✅            |
| Accounts        | CRUD                | 5 sub-routes + merge + health + revenue                             | ✅            |
| Contacts        | CRUD                | 7 sub-routes + bulk + merge + duplicates                            | ✅            |
| Activities      | Logging             | 6 sub-routes + timeline + overdue + auto-log                        | ✅            |
| Lead scoring    | Configurable rules  | `lib/crm/scoring-engine.ts`, 15 aligned scoring rules               | ✅            |
| Sequences       | Multi-step outreach | `lib/crm/sequence-processor.ts`, 12+ routes, DLQ                    | ✅            |
| Email templates | Merge fields        | `lib/email/template-renderer.ts`, branded-templates                 | ✅            |
| Dashboard       | Metrics             | 3 dashboard sub-routes (metrics, intelligence, division comparison) | ✅            |
| ICP profiles    | Not in blueprint    | `app/api/crm/icp/` (4 routes + generate, match)                     | 🔄 Extra      |
| Saved views     | Not in blueprint    | `app/api/crm/saved-views/`                                          | 🔄 Extra      |
| SLA alerts      | P1                  | `app/api/crm/sla/`, cron job                                        | 🔄 Extra (P1) |
| Import/Export   | Not in blueprint    | `app/api/crm/import/`, `/export/`                                   | 🔄 Extra      |
| Bidding         | Not in P0           | `app/api/crm/bidding/` (4 routes)                                   | 🔄 Extra      |
| Enrichment      | Not in P0           | `app/api/crm/enrichment/` (4 routes), Apollo pump cron              | 🔄 Extra      |
| Notes/Tags      | Not in blueprint    | `app/api/crm/notes/`, `/tags/`                                      | 🔄 Extra      |
| Outreach/Search | Not in blueprint    | `app/api/crm/outreach/`, `/search/`                                 | 🔄 Extra      |

### Epic 3: Estimating (P0) — ✅ COMPLIANT + EXTRAS

| Area                  | Blueprint Says        | Actual                                               | Status   |
| --------------------- | --------------------- | ---------------------------------------------------- | -------- |
| Estimate builder      | Line items, templates | `app/api/estimates/` + `/lines/` + `/versions/`      | ✅       |
| Templates             | Reusable              | `app/api/estimate-templates/`                        | ✅       |
| Assemblies            | P2 per Resolution     | `app/api/assemblies/` (3 routes)                     | 🔄 Extra |
| Cost catalog          | P2                    | `app/api/cost-catalog/` (2 routes)                   | 🔄 Extra |
| Alternates/Allowances | P2                    | `app/api/estimates/[id]/alternates/`, `/allowances/` | 🔄 Extra |

### Epic 4: Contracting (P0) — ✅ COMPLIANT

| Area              | Blueprint Says      | Actual                                                                 | Status |
| ----------------- | ------------------- | ---------------------------------------------------------------------- | ------ |
| Proposals         | Proposal generation | `app/api/proposals/` (3 routes)                                        | ✅     |
| E-sign (BoldSign) | White-label API     | `lib/esign/boldsign-client.ts` (raw fetch, mock mode), webhook handler | ✅     |
| Contracts         | Contract tracking   | `app/api/contracts/` (2 routes)                                        | ✅     |

### Epic 5: Project Setup (P0) — ✅ COMPLIANT

| Area             | Blueprint Says  | Actual                                          | Status |
| ---------------- | --------------- | ----------------------------------------------- | ------ |
| Project creation | From contract   | `app/api/projects/` (extensive sub-routes)      | ✅     |
| Members          | Team assignment | `app/api/projects/[id]/members/`                | ✅     |
| Milestones       | Tracking        | `app/api/projects/[id]/milestones/` + `[msId]/` | ✅     |

### Epic 6: Project Execution (P0) — ✅ COMPLIANT + EXTENSIVE EXTRAS

| Area              | Blueprint Says      | Actual                                                                                    | Status   |
| ----------------- | ------------------- | ----------------------------------------------------------------------------------------- | -------- |
| Tasks             | CRUD + comments     | `app/api/tasks/` (4 routes) + `/projects/[id]/tasks/` (3 routes)                          | ✅       |
| Task dependencies | DAG dependencies    | `app/api/tasks/[id]/dependencies/` + project-level deps                                   | ✅       |
| Daily logs        | Online-only for MVP | `app/api/projects/[id]/daily-logs/` + diary                                               | ✅       |
| Document upload   | Basic               | `app/api/projects/[id]/files/` + versions + sharing + folders                             | ✅       |
| Safety            | P2                  | `app/api/projects/[id]/safety/` (forms, incidents, inspections, toolbox talks — 8 routes) | 🔄 Extra |
| RFIs              | P1                  | `app/api/projects/[id]/rfis/` (3 routes + threads)                                        | 🔄 Extra |
| Submittals        | P1                  | `app/api/projects/[id]/submittals/` (3 routes + reviews)                                  | 🔄 Extra |
| Change orders     | P1                  | `app/api/projects/[id]/change-orders/` (2 routes)                                         | 🔄 Extra |
| Change requests   | P1                  | `app/api/projects/[id]/change-requests/` (2 routes)                                       | 🔄 Extra |
| Closeout          | P2                  | `app/api/projects/[id]/closeout/` (2 routes)                                              | 🔄 Extra |
| Warranty          | P2                  | `app/api/projects/[id]/warranty/` (2 routes)                                              | 🔄 Extra |
| Selections        | P2                  | `app/api/projects/[id]/selections/` (4 routes)                                            | 🔄 Extra |
| Deficiencies      | P2                  | `app/api/projects/[id]/deficiencies/` (2 routes)                                          | 🔄 Extra |
| Service calls     | P2                  | `app/api/projects/[id]/service-calls/` (3 routes)                                         | 🔄 Extra |
| RFQs/Procurement  | P2                  | `app/api/projects/[id]/rfqs/` (5 routes + bids, invites, leveling)                        | 🔄 Extra |
| Photos            | Not in blueprint    | `app/api/projects/[id]/photos/` (3 routes + annotations)                                  | 🔄 Extra |
| Meetings          | Not in blueprint    | `app/api/projects/[id]/meetings/`                                                         | 🔄 Extra |
| Reports           | Not in blueprint    | `app/api/projects/[id]/reports/`                                                          | 🔄 Extra |

### Epic 7: ERPNext Sync (P0) — ✅ COMPLIANT

| Area            | Blueprint Says          | Actual                                                            | Status |
| --------------- | ----------------------- | ----------------------------------------------------------------- | ------ |
| ERP client      | `lib/erp/client.ts`     | Exists with env var config, mock mode                             | ✅     |
| Entity mappers  | 12 MVP mappings         | 14 mapper files (+ payment-entry, purchase-invoice vs Mar 8's 11) | ✅     |
| Sync service    | Outbox + retry          | `lib/erp/sync-service.ts` with all entity types                   | ✅     |
| Sync API        | Job trigger + status    | `app/api/erp/sync/` + `[jobId]/`                                  | ✅     |
| Webhook handler | ERPNext events          | `app/api/webhooks/erpnext/`                                       | ✅     |
| Cron sync       | Scheduled snapshots     | `app/api/cron/erp-sync/` (every 30min)                            | ✅     |
| Queue           | Job processing          | `@upstash/qstash`, `lib/queue/`, `app/api/queue/process/`         | ✅     |
| Live testing    | Against running ERPNext | **Not yet tested against live instance**                          | ⚠️     |

### Beyond P0: Additional Systems Built

| System              | Routes/Files                                                              | Blueprint Phase  | Status   |
| ------------------- | ------------------------------------------------------------------------- | ---------------- | -------- |
| AI Agentic Layer    | 8 agents, `app/api/ai/` (8 routes), `lib/ai/` (agents, providers)         | Not in blueprint | 🔄 Extra |
| Executive Dashboard | `app/api/executive/` (8 routes), `app/api/dashboard/executive/`           | Not in blueprint | 🔄 Extra |
| Knowledge/RAG       | `app/api/executive/knowledge/` (chat, embed, search)                      | P2               | 🔄 Extra |
| Client Portal       | `app/api/portal/projects/` (7 routes), `app/api/portal/trade/` (5 routes) | P1               | 🔄 Extra |
| Portal Management   | `app/api/portals/` (accounts, messages, permissions, announcements)       | P1               | 🔄 Extra |
| Finance             | `app/api/finance/` (invoices, job-costs, purchase-orders — 6 routes)      | P1               | 🔄 Extra |
| Expenses            | `app/api/expenses/` (5 routes + receipts + approval)                      | P1               | 🔄 Extra |
| Time Entries        | `app/api/projects/[id]/time-entries/`, `app/api/timesheet-batches/`       | P1               | 🔄 Extra |
| Notifications       | `app/api/notifications/` (4 routes + preferences + dispatch)              | Not in blueprint | 🔄 Extra |
| Governance          | `app/api/governance/reference-data/`                                      | Not in blueprint | 🔄 Extra |
| BCP/Privacy         | `app/api/bcp/`, `app/api/privacy/requests/`                               | Not in blueprint | 🔄 Extra |
| Migration           | `app/api/migration/batches/`                                              | P2               | 🔄 Extra |
| Cost Codes          | `app/api/cost-codes/` (3 routes + mappings)                               | Not in blueprint | 🔄 Extra |
| Calendar            | `app/api/calendar/events/`                                                | P2               | 🔄 Extra |
| Global Search       | `app/api/search/global/`                                                  | Not in blueprint | 🔄 Extra |
| Compliance          | `app/api/compliance/`                                                     | Not in blueprint | 🔄 Extra |
| PDF Generation      | `app/api/pdf/generate/`                                                   | Not in blueprint | 🔄 Extra |
| Email Tracking      | `app/api/email/track/open/`, `/click/`                                    | Not in blueprint | 🔄 Extra |
| Onboarding          | `app/api/onboarding/status/`                                              | Not in blueprint | 🔄 Extra |

### Non-Functional Requirements

| Area               | Blueprint Says                   | Actual                                                   | Status |
| ------------------ | -------------------------------- | -------------------------------------------------------- | ------ |
| Rate limiting      | All public endpoints             | `@upstash/ratelimit` across routes                       | ✅     |
| Sentry errors      | Error monitoring                 | `@sentry/nextjs` installed, config files                 | ✅     |
| a11y testing       | @axe-core/playwright in CI       | `@axe-core/playwright` installed, 18 E2E specs           | ✅     |
| Structured logging | Logger over console.log          | `lib/logger.ts`, only 1 lint warning remaining           | ✅     |
| PIPEDA compliance  | Privacy policy, field encryption | `app/api/privacy/requests/` (3 routes)                   | ✅     |
| Audit logs         | System audit trail               | `app/api/system/audit-logs/`                             | ✅     |
| Webhook management | Replay + monitoring              | `app/api/system/webhooks/` (2 routes)                    | ✅     |
| Smoke test         | Health monitoring                | Hourly cron with alert cooldown (fixed from 15min flood) | ✅     |
| Cron watchdog      | Overdue detection                | Hourly with dedup (fixed from repeated alerts)           | ✅     |

## Architecture Compliance Summary

| Architectural Decision                              | Status                                          |
| --------------------------------------------------- | ----------------------------------------------- |
| D1: Supabase managed cloud                          | ✅ Compliant                                    |
| D2: `krewpact.com` domain                           | ✅ Compliant                                    |
| D3: Hybrid BFF architecture                         | ✅ Compliant — 314 API routes on Vercel         |
| D4: Upstash for queue                               | ✅ Compliant — QStash + Redis                   |
| D5: PRD canonical role model                        | ✅ Compliant                                    |
| D6: ERPNext via Cloudflare Tunnel                   | ✅ Compliant — env var configurable             |
| D7: US-hosted with PIPEDA disclosure                | ✅ Compliant — privacy API exists               |
| D8: Eventual consistency (no 2PC)                   | ✅ Compliant — outbox/inbox/retry/DLQ pattern   |
| D9: No n8n                                          | ✅ Compliant — removed from architecture        |
| D10: MVP monitoring (Vercel + Sentry + BetterStack) | ✅ Compliant — plus smoke test + watchdog crons |
| D11: Microsoft Graph deferred                       | ✅ Compliant — Resend for email                 |
| D12: 99.5% SLA for MVP                              | ✅ Compliant                                    |

## Linting Results

**Errors:** 0
**Warnings:** 1

| Pattern                         | Count | Notes                                                 |
| ------------------------------- | ----- | ----------------------------------------------------- |
| Unused eslint-disable directive | 1     | Residual disable comment no longer needed in one file |

## Key Changes Since Last Audit (Mar 8 → Mar 16)

### Features Added

- AI Agentic Layer: 8 agents (bid-matcher, budget-anomaly, digest-builder, email-drafter, insight-engine, next-action-suggester, nl-query, stale-deal-detector)
- Apollo pump with division-aware auto-rotation profiles
- Enhanced scoring engine (in_set, contains_any operators, score caps)
- Full confidence verification (deep health, cron monitoring, E2E flows)
- RBAC unification (Clerk JWT + Supabase DB permissions merged)
- Mobile scaffold started
- Payment entry and purchase invoice ERPNext mappers
- 15 new scoring rules migration

### Operational Fixes

- **Fixed:** Smoke test email flooding (70+/day → 1 per incident with cooldown)
- **Fixed:** Watchdog alert deduplication
- **Fixed:** Cron frequency reduced (smoke test: 15min → hourly)
- **Fixed:** Lint warnings reduced from 42 → 1
- **Fixed:** Husky pre-commit hook Windows CR issue (local)

### Dependency Updates

- @sentry/nextjs 10.42.0 → 10.43.0
- @supabase/supabase-js 2.98.0 → 2.99.1
- @upstash/redis 1.36.3 → 1.37.0
- lint-staged 16.3.1 → 16.4.0
- openai 6.27.0 → 6.29.0
- react-resizable-panels 4.7.0 → 4.7.2
- svix 1.86.0 → 1.88.0

## Action List

**Immediate (blocking):**

- None

**Short-term (tech debt):**

- [ ] Fix 1 remaining lint warning (unused eslint-disable directive)
- [ ] Test ERPNext sync against a live instance — all 14 mappers + sync service exist but remain untested
- [ ] Fix `.husky/pre-commit` Windows CR issue in repo (currently fixed locally only)

**Documentation (blueprint updates):**

- [ ] Add AI Agentic Layer to blueprint (8 agents, Gemini Flash, killswitch, cost tracking)
- [ ] Add Executive Dashboard + Knowledge/RAG to architecture docs
- [ ] Add Apollo pump + enrichment pipeline to architecture docs
- [ ] Add cron monitoring infrastructure (smoke test, watchdog, cron logger) to monitoring docs
- [ ] Update ERPNext mapper count: 12 → 14 in Architecture Resolution doc
- [ ] Document alert cooldown pattern for operational crons

---

**Audit performed:** 2026-03-16
**Previous audit:** 2026-03-08 (score: 92/100)
**Auditor:** Claude Code (Opus 4.6)
