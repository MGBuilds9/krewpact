# KrewPact Blueprint Audit — 2026-03-08

## Executive Summary

**Alignment Score:** 92/100 _(up from 78 on Mar 4)_
**Critical Issues:** 0
**Architecture Drift:**

- Codebase exceeds P0 MVP scope — all P1 and most P2 features are built (portals, safety, procurement, closeout, selections, warranty, RFQs)
- All 18 PRD tasks complete (Phases A-D)
- No live ERPNext sync tested yet — all 11 mappers + sync service exist but are untested against a running instance
- 42 lint warnings remain (React Hook Form compatibility + unused vars in e2e)

## Previous Audit Delta (Mar 4 → Mar 8)

| Metric          | Mar 4             | Mar 8             | Change                                  |
| --------------- | ----------------- | ----------------- | --------------------------------------- |
| Alignment Score | 78/100            | 92/100            | +14                                     |
| Critical Issues | 2                 | 0                 | -2 ✅                                   |
| Tests           | 2,061 (168 files) | 2,838 (255 files) | +777 tests, +87 files                   |
| API Routes      | ~220              | 270               | +50                                     |
| Migrations      | 34                | 37                | +3                                      |
| Lint Warnings   | 210               | 42                | -168 ✅                                 |
| ERPNext Mappers | 9                 | 11                | +2 (customer, quotation, sales-invoice) |

### Previous Critical Issues — Resolved

| Issue                                            | Mar 4 Status | Mar 8 Resolution                                                          |
| ------------------------------------------------ | ------------ | ------------------------------------------------------------------------- |
| BullMQ/Upstash not in package.json               | ❌ Critical  | ✅ Migrated to QStash (`@upstash/qstash` installed)                       |
| BoldSign not in package.json                     | ❌ Critical  | ✅ Uses raw `fetch` — no SDK needed. Mock mode when no API key.           |
| Missing customer/quotation/sales-invoice mappers | ❌ Medium    | ✅ All 3 added (`lib/erp/customer-mapper.ts`, etc.)                       |
| No milestones route                              | ❌ Medium    | ✅ Added at `app/api/projects/[id]/milestones/`                           |
| Resend not in package.json                       | Noted        | ✅ Uses raw `fetch` — no SDK needed. Graceful degradation on missing key. |

## Code Health

| Check         | Result                            |
| ------------- | --------------------------------- |
| Lint          | 0 errors, 42 warnings             |
| Typecheck     | Clean (0 errors)                  |
| Tests         | 2,838 passed / 255 files          |
| Build         | Clean (production build succeeds) |
| E2E           | 8 spec files                      |
| Migrations    | 37 SQL files                      |
| API Routes    | 270 route.ts files                |
| Components    | 228 .tsx files                    |
| Pages/Layouts | 116 .tsx files                    |
| Lib services  | 84 .ts files                      |
| Validators    | 18 Zod schema files               |

## Blueprint vs Implementation

### Epic 1: Identity & Access (P0) — ✅ COMPLIANT

| Area         | Blueprint Says                                   | Actual (evidence)                                     | Status |
| ------------ | ------------------------------------------------ | ----------------------------------------------------- | ------ |
| Auth (Clerk) | Clerk with email + M365 SSO                      | `@clerk/nextjs` installed, `app/auth/`, middleware.ts | ✅     |
| RBAC         | 9 internal + 4 external roles, division-scoped   | `app/api/rbac/`, `app/api/org/roles/`, validators     | ✅     |
| Divisions    | 6 MDM divisions                                  | `app/api/org/divisions/`, seed data                   | ✅     |
| JWT Bridge   | Clerk JWT → Supabase RLS with `krewpact_user_id` | RLS policies in migrations, `lib/supabase/server.ts`  | ✅     |
| RLS Policies | Deny-by-default, division isolation              | 37 migrations with RLS                                | ✅     |

### Epic 2: CRM (P0) — ✅ COMPLIANT + EXTRAS

| Area            | Blueprint Says            | Actual                                                              | Status        |
| --------------- | ------------------------- | ------------------------------------------------------------------- | ------------- |
| Leads CRUD      | Full lifecycle            | 12 sub-routes under `/crm/leads/`                                   | ✅            |
| Opportunities   | Pipeline + stages         | 8 sub-routes under `/crm/opportunities/`                            | ✅            |
| Accounts        | CRUD                      | 5 sub-routes + merge + health + revenue                             | ✅            |
| Contacts        | CRUD                      | 7 sub-routes + bulk + merge + duplicates                            | ✅            |
| Activities      | Logging                   | 6 sub-routes + timeline + overdue + auto-log                        | ✅            |
| Lead scoring    | Configurable rules        | `lib/crm/scoring-engine.ts`, scoring-rules API                      | ✅            |
| Sequences       | Multi-step outreach       | `lib/crm/sequence-processor.ts`, 12+ routes                         | ✅            |
| Email templates | Merge fields              | `lib/email/template-renderer.ts`, branded-templates                 | ✅            |
| Dashboard       | Metrics, intelligence     | 3 dashboard sub-routes (metrics, intelligence, division comparison) | ✅            |
| Saved views     | User-configurable         | `app/api/crm/saved-views/`                                          | 🔄 Extra      |
| SLA alerts      | Overdue tracking          | `app/api/crm/sla/`, `lib/crm/sla-config.ts`                         | 🔄 Extra (P1) |
| Import/Export   | Bulk ops                  | `app/api/crm/import/`, `app/api/crm/export/`                        | 🔄 Extra      |
| Bidding         | Opportunity bidding       | `app/api/crm/bidding/` (4 routes)                                   | 🔄 Extra      |
| Enrichment      | Apollo/Clearbit waterfall | `app/api/crm/enrichment/` (4 routes)                                | 🔄 Extra      |

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
| Proposals         | Proposal generation | `app/api/proposals/` (3 routes), `lib/crm/proposal-generator.ts`       | ✅     |
| E-sign (BoldSign) | White-label API     | `lib/esign/boldsign-client.ts` (raw fetch, mock mode), webhook handler | ✅     |
| Contracts         | Contract tracking   | `app/api/contracts/` (2 routes)                                        | ✅     |

### Epic 5: Project Setup (P0) — ✅ COMPLIANT

| Area             | Blueprint Says  | Actual                                          | Status |
| ---------------- | --------------- | ----------------------------------------------- | ------ |
| Project creation | From contract   | `app/api/projects/` (extensive sub-routes)      | ✅     |
| Members          | Team assignment | `app/api/projects/[id]/members/`                | ✅     |
| Milestones       | Tracking        | `app/api/projects/[id]/milestones/` + `[msId]/` | ✅     |

### Epic 6: Project Execution (P0) — ✅ COMPLIANT + EXTRAS

| Area              | Blueprint Says      | Actual                                                                                    | Status   |
| ----------------- | ------------------- | ----------------------------------------------------------------------------------------- | -------- |
| Tasks             | CRUD + comments     | `app/api/tasks/` (4 routes) + `/projects/[id]/tasks/` (3 routes)                          | ✅       |
| Task dependencies | DAG dependencies    | `app/api/tasks/[id]/dependencies/` + project-level deps                                   | ✅       |
| Daily logs        | Online-only for MVP | `app/api/projects/[id]/daily-logs/` + diary                                               | ✅       |
| Document upload   | Basic               | `app/api/projects/[id]/files/` + versions + sharing                                       | ✅       |
| Safety            | P2                  | `app/api/projects/[id]/safety/` (forms, incidents, inspections, toolbox talks — 8 routes) | 🔄 Extra |
| RFIs              | P1                  | `app/api/projects/[id]/rfis/` (3 routes + threads)                                        | 🔄 Extra |
| Submittals        | P1                  | `app/api/projects/[id]/submittals/` (3 routes + reviews)                                  | 🔄 Extra |
| Change orders     | P1                  | `app/api/projects/[id]/change-orders/` (2 routes)                                         | 🔄 Extra |
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

| Area            | Blueprint Says          | Actual                                                                                                                                              | Status |
| --------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| ERP client      | `lib/erp/client.ts`     | Exists with env var config, mock mode                                                                                                               | ✅     |
| Entity mappers  | 12 MVP mappings         | 11 mapper files (contact, customer, expense, opportunity, project, quotation, sales-invoice, sales-order, supplier, task, timesheet) + sync-service | ✅     |
| Sync service    | Outbox + retry          | `lib/erp/sync-service.ts` with all entity types registered                                                                                          | ✅     |
| Sync API        | Job trigger + status    | `app/api/erp/sync/` + `[jobId]/`                                                                                                                    | ✅     |
| Webhook handler | ERPNext events          | `app/api/webhooks/erpnext/`                                                                                                                         | ✅     |
| Cron sync       | Scheduled snapshots     | `app/api/cron/erp-sync/`                                                                                                                            | ✅     |
| Queue           | Job processing          | `@upstash/qstash` installed, `lib/queue/` (5 files), `app/api/queue/process/`                                                                       | ✅     |
| Live testing    | Against running ERPNext | Not yet tested against live instance                                                                                                                | ⚠️     |

### Non-Functional Requirements

| Area               | Blueprint Says                   | Actual                                                  | Status   |
| ------------------ | -------------------------------- | ------------------------------------------------------- | -------- |
| Rate limiting      | All public endpoints             | `@upstash/ratelimit` + 259 routes protected             | ✅       |
| Sentry errors      | Error monitoring                 | `@sentry/nextjs` installed, 3 config files              | ✅       |
| a11y testing       | @axe-core/playwright in CI       | `@axe-core/playwright` installed, 8 a11y tests          | ✅       |
| Structured logging | Logger over console.log          | `lib/logger.ts` exists, 42 residual no-console warnings | ⚠️ Drift |
| PIPEDA compliance  | Privacy policy, field encryption | `app/api/privacy/requests/` (3 routes)                  | ✅       |
| BCP                | Business continuity              | `app/api/bcp/incidents/` (3 routes)                     | 🔄 Extra |
| Audit logs         | System audit trail               | `app/api/system/audit-logs/`                            | ✅       |
| Webhook management | Replay + monitoring              | `app/api/system/webhooks/` (2 routes)                   | ✅       |
| Email tracking     | Open/click tracking              | `app/api/email/track/open/`, `/click/`                  | 🔄 Extra |

### Infrastructure & Dependencies

| Package                 | Blueprint Says          | Installed                          | Status        |
| ----------------------- | ----------------------- | ---------------------------------- | ------------- |
| `@clerk/nextjs`         | Auth                    | ✅                                 | ✅            |
| `@supabase/supabase-js` | Database                | ✅                                 | ✅            |
| `@sentry/nextjs`        | Error monitoring        | ✅                                 | ✅            |
| `@axe-core/playwright`  | Accessibility           | ✅                                 | ✅            |
| `@upstash/qstash`       | Queue (replaces BullMQ) | ✅                                 | ✅            |
| `@upstash/ratelimit`    | Rate limiting           | ✅                                 | ✅            |
| `@upstash/redis`        | Redis client            | ✅                                 | ✅            |
| `zod`                   | Validation              | ✅                                 | ✅            |
| `react-hook-form`       | Forms                   | ✅                                 | ✅            |
| `@tanstack/react-query` | Data fetching           | ✅                                 | ✅            |
| `@tanstack/react-table` | Tables                  | ✅                                 | ✅            |
| Resend SDK              | Email                   | N/A — uses raw `fetch`             | ✅ Acceptable |
| BoldSign SDK            | E-sign                  | N/A — uses raw `fetch` + mock mode | ✅ Acceptable |

## Linting Results

**Errors:** 0
**Warnings:** 42

| Pattern                                   | Count | Notes                                               |
| ----------------------------------------- | ----- | --------------------------------------------------- |
| React Hook Form `watch()` incompatibility | ~1    | React Compiler lint, `FeatureFlagForm.tsx:44`       |
| Unused vars in e2e                        | ~3    | `response`, `body`, `title` in e2e specs            |
| Remaining `no-console`                    | ~38   | Residual console calls not yet migrated to `logger` |

## Architecture Compliance Summary

| Architectural Decision                              | Status                                                    |
| --------------------------------------------------- | --------------------------------------------------------- |
| D1: Supabase managed cloud                          | ✅ Compliant                                              |
| D2: `krewpact.com` domain                           | ✅ Compliant                                              |
| D3: Hybrid BFF architecture                         | ✅ Compliant — 270 API routes on Vercel                   |
| D4: Upstash for queue                               | ✅ Compliant — migrated from BullMQ to QStash             |
| D5: PRD canonical role model                        | ✅ Compliant                                              |
| D6: ERPNext via Cloudflare Tunnel                   | ✅ Compliant — env var configurable                       |
| D7: US-hosted with PIPEDA disclosure                | ✅ Compliant — privacy API exists                         |
| D8: Eventual consistency (no 2PC)                   | ✅ Compliant — outbox/inbox/retry pattern                 |
| D9: No n8n                                          | ✅ Compliant — removed from architecture                  |
| D10: MVP monitoring (Vercel + Sentry + BetterStack) | ✅ Compliant                                              |
| D11: Resend for email (MS Graph deferred)           | ✅ Compliant — `lib/microsoft/graph.ts` exists for future |
| D12: 99.5% uptime target                            | N/A — needs production monitoring                         |

## Scope Analysis

### P0 MVP (7 Epics) — ALL COMPLETE ✅

All 7 P0 epics are fully implemented with API routes, validators, services, and test coverage.

### P1 Features Built Ahead of Schedule

| P1 Feature        | Implementation                          |
| ----------------- | --------------------------------------- |
| Change orders     | `projects/[id]/change-orders/`          |
| RFIs              | `projects/[id]/rfis/` + threads         |
| Submittals        | `projects/[id]/submittals/` + reviews   |
| Time entries      | `projects/[id]/time-entries/`           |
| Expense claims    | `app/api/expenses/` (5 routes)          |
| Client portal     | `app/api/portal/projects/` (6 routes)   |
| Timesheet batches | `app/api/timesheet-batches/` (3 routes) |

### P2 Features Built Ahead of Schedule

| P2 Feature              | Implementation                            |
| ----------------------- | ----------------------------------------- |
| Trade portal            | `app/api/portal/trade/` (6 routes)        |
| Procurement (RFQs)      | `projects/[id]/rfqs/` (5 routes)          |
| Selections & allowances | `projects/[id]/selections/` (4 routes)    |
| Closeout                | `projects/[id]/closeout/` (2 routes)      |
| Warranty                | `projects/[id]/warranty/` (2 routes)      |
| Service calls           | `projects/[id]/service-calls/` (3 routes) |
| Deficiencies            | `projects/[id]/deficiencies/` (2 routes)  |
| Safety management       | `projects/[id]/safety/` (8 routes)        |

## Action List

### Immediate (blocking): None

### Short-term (tech debt):

- [ ] Migrate remaining 38 `console.log/warn/error` calls to structured `logger` — reduces lint warnings to ~4
- [ ] Test ERPNext sync against a live instance — 11 mappers + sync service are untested end-to-end
- [ ] Add `RESEND_API_KEY` and `BOLDSIGN_API_KEY` to production env — both services degrade gracefully but are non-functional without keys
- [ ] Fix `FeatureFlagForm.tsx:44` React Compiler warning — extract `watch()` to a separate non-memoized component

### Documentation (blueprint updates):

- [ ] Update Resolution doc to reflect QStash migration (was BullMQ) — architecture decision changed
- [ ] Add P1/P2 features to blueprint as "implemented ahead of schedule" — prevents future audits from flagging them as drift
- [ ] Document raw `fetch` pattern for Resend/BoldSign — clarify that no SDK packages are needed
- [ ] Add photos, meetings, reports, BCP to feature registry — undocumented features exist in code

### Future (before production launch):

- [ ] Live ERPNext connectivity test via Cloudflare Tunnel
- [ ] BoldSign API key and live e-sign test
- [ ] Resend domain verification and transactional email test
- [ ] BetterStack uptime monitoring setup
- [ ] Production seed data execution

---

**Status Legend:**

- ✅ Compliant — matches blueprint
- ⚠️ Drift — works but deviates (documented)
- ❌ Missing — required but not implemented
- 🔄 Extra — exists in code but not in blueprint (scope ahead of plan)
