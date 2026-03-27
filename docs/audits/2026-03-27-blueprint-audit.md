# KrewPact Blueprint Audit — March 27, 2026

**Auditor:** Claude (automated)
**Blueprint sources:** `KrewPact-Strategy-Brief.md`, `docs/EXECUTION-PLAN.md`, `docs/architecture/KrewPact-Feature-Function-PRD-Checklist.md`, `docs/architecture/KrewPact-Product-Vision-and-Strategy.md`
**Previous audit:** 2026-03-25 (production readiness)

---

## Executive Summary

**Alignment Score:** 93/100
**Critical Issues:** 1 (TypeScript error in notifications dispatch)
**Architecture Drift:** Minimal — code has grown beyond blueprint scope in all the right ways

The internal operations platform is **feature-complete for MVP and all P1 epics**. All 17 feature flags are enabled. The codebase has matured significantly since the Mar 4 Execution Plan was written — most "mocked/stubbed" items have been wired to real services. The remaining work is P2 features, polish, and gap-filling.

---

## Blueprint vs Implementation

### Execution Plan Phases (written Mar 4)

| Phase | Item                    | Blueprint Status                       | Actual (Mar 27)                                                        | Status |
| ----- | ----------------------- | -------------------------------------- | ---------------------------------------------------------------------- | ------ |
| A1    | Queue Infrastructure    | "In-memory Map, wire to Upstash"       | QStash live, 14 cron jobs                                              | ✅     |
| A2    | ERPNext Connectivity    | "Stand up ERPNext + Cloudflare Tunnel" | Live via Cloudflare Tunnel                                             | ✅     |
| A3    | Missing ERPNext Mappers | "3 missing of 12 MVP"                  | 13/13 mappers complete                                                 | ✅     |
| A4    | Observability Setup     | "Sentry + BetterStack + logger"        | Sentry + BetterStack (5 monitors) + structured logger + withApiRoute() | ✅     |
| A5    | Accessibility Pipeline  | "@axe-core/playwright in CI"           | Installed, in CI pipeline                                              | ✅     |
| B1    | ERPNext Sync E2E        | "Wire full sync flow"                  | 13 mappers + sync service + outbox/inbox                               | ✅     |
| B2    | E-sign (BoldSign)       | "Schema + validators only"             | BoldSign SDK integrated                                                | ✅     |
| B3    | Email Integration       | "Raw fetch to Resend"                  | Resend + Microsoft Graph live                                          | ✅     |

**Gate A: PASSED.** Gate B: PASSED. All infrastructure wiring complete.

### Feature Domains

| Domain             | Blueprint Says                                                  | Actual                                                                                           | Status | Notes                                                        |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------ |
| CRM                | Leads, contacts, accounts, opportunities, pipeline, scoring     | 23 pages, ~55 API routes, scoring engine, sequences, enrichment, bidding, import/export          | ✅     | Exceeded blueprint — added sequences, enrichment, bidding    |
| Estimating         | Builder, templates, cost codes                                  | 5 pages, 8 API routes, assemblies, cost catalog, templates, takeoff                              | ✅     | Added assemblies + AI takeoff beyond blueprint               |
| Contracting        | Contract creation, e-sign                                       | 2 pages, 2 API routes, BoldSign integration                                                      | ✅     |                                                              |
| Projects           | Lifecycle, milestones, tasks, daily logs, RFIs, submittals, COs | 14 pages, ~45 API routes, + safety, closeout, warranty, service calls, selections, diary, photos | ✅     | Massively exceeded blueprint                                 |
| Finance            | Invoice snapshots, expenses, timesheets                         | 4 pages, job costs, ADP export, Ontario Construction Act holdbacks                               | ✅     | P1 complete                                                  |
| Portals            | Client + Trade Partner                                          | Both implemented with role-gated access                                                          | ✅     |                                                              |
| Inventory          | "Replaces Almyta"                                               | Complete: append-only ledger, fleet, locations, POs, receipts                                    | ✅     |                                                              |
| Admin/Governance   | Audit log, sync dashboard                                       | + BCP, privacy (PIPEDA), policy overrides, governance, migration tool                            | ✅     | Exceeded blueprint                                           |
| Notifications      | Realtime + email dispatch                                       | Supabase Realtime + dispatch + preferences + push subscriptions                                  | ✅     |                                                              |
| Reports/Dashboards | Executive + PM dashboards                                       | Both implemented with KPIs, pipeline, health scores                                              | ✅     |                                                              |
| Settings           | Org management                                                  | Onboarding wizard, roles, users, cost codes, compliance, scoring                                 | ✅     |                                                              |
| Search             | Global search                                                   | 7-table search + Cmd+K command palette                                                           | ✅     |                                                              |
| AI/Knowledge       | pgvector embeddings, AI chat                                    | Schema + endpoints exist, daily digest cron, suggestions/insights                                | ⚠️     | Functional but shallow — P2 for full context-aware assistant |
| Offline/PWA        | "Design for offline-first P2"                                   | PWA shell via Serwist, no IndexedDB offline                                                      | ⚠️     | PWA installable but not offline-capable                      |
| ERPNext Sync       | "12 MVP mappings"                                               | 13/13 complete, 30 more deferred to P1/P2                                                        | ⚠️     | MVP done, full 43 deferred                                   |

### Non-Functional Requirements

| Requirement           | Blueprint                        | Actual                                     | Status |
| --------------------- | -------------------------------- | ------------------------------------------ | ------ |
| RLS (deny-by-default) | All tables                       | Enforced on all tables                     | ✅     |
| Audit trails          | Every mutation                   | audit_logs table, withApiRoute()           | ✅     |
| Division scoping      | JWT claims + RLS                 | division_ids in Clerk metadata + RLS       | ✅     |
| Rate limiting         | Upstash Redis                    | Implemented with circuit breaker           | ✅     |
| Webhook verification  | Svix for Clerk                   | Clerk + BoldSign verified                  | ✅     |
| Security headers      | CSP, HSTS, etc.                  | Configured in next.config.ts               | ✅     |
| WCAG AA               | @axe-core/playwright             | In CI pipeline                             | ✅     |
| PIPEDA                | Privacy controls                 | Privacy requests module + field encryption | ✅     |
| Test coverage         | 60% lines, 50% branches          | 4,715 tests (428 files)                    | ✅     |
| CI/CD                 | Lint → Type → Test → Build → E2E | GitHub Actions (3 parallel jobs)           | ✅     |

---

## Code Health

### TypeScript

- **Errors:** 1
  - `app/api/notifications/dispatch/route.ts:26` — unsafe `as NotificationEvent` cast needs Zod validation or `as unknown as` intermediate

### ESLint

- **Errors:** 0
- **Warnings:** 269
  - Primary pattern: `max-lines` (files >300 lines) and `max-lines-per-function` (functions >80 lines)
  - Affected: inventory handlers, ERP sync, apollo-profiles, CRM scoring
  - 68 auto-fixable

### Tests

- **Passing:** 4,715 / 4,715 (428 files)
- **Vulnerabilities:** 0 production, 10 moderate dev-only

### Build

- Clean production build

---

## Items NOT in Blueprint (Code Has, Blueprint Doesn't)

These features were built organically and should be documented:

| Feature                     | Location                        | Recommendation      |
| --------------------------- | ------------------------------- | ------------------- |
| BCP/Incidents module        | `app/api/bcp/`, admin pages     | 🔄 Add to blueprint |
| Privacy requests (PIPEDA)   | `app/api/privacy/`, admin pages | 🔄 Add to blueprint |
| Governance/Reference data   | `app/api/governance/`           | 🔄 Add to blueprint |
| Migration tool              | Feature-flagged admin tool      | 🔄 Add to blueprint |
| Email tracking (open/click) | `app/api/email/track/`          | 🔄 Add to blueprint |
| PDF generation              | `app/api/pdf/generate/`         | 🔄 Add to blueprint |
| Calendar/events             | `app/api/calendar/`             | 🔄 Add to blueprint |
| Proposals module            | `app/api/proposals/`            | 🔄 Add to blueprint |
| System webhooks             | `app/api/system/webhooks/`      | 🔄 Add to blueprint |

---

## What's Left (Prioritized)

### Immediate (Blocking)

- [ ] Fix TypeScript error in `app/api/notifications/dispatch/route.ts:26`

### Short-Term (Tech Debt)

- [ ] Reduce lint warnings from 269 → <50 (split large files, extract functions)
- [ ] Update Execution Plan to reflect current reality (most phases complete)

### P2 Features (Not Yet Built)

| Feature                                   | Effort | Value             | Priority |
| ----------------------------------------- | ------ | ----------------- | -------- |
| Full AI chat (context-aware assistant)    | Large  | High              | P2-A     |
| Offline/PWA with IndexedDB                | Large  | Medium            | P2-B     |
| Remaining 30 ERPNext mappings             | Medium | Medium            | P2-C     |
| ADP payroll integration (live API)        | Medium | Medium            | P2-D     |
| Azure M365 deep integration               | Medium | Low               | P2-E     |
| White-label multi-tenant SaaS             | XL     | High (revenue)    | P2-F     |
| MERX bidding import automation            | Small  | Medium            | P2-G     |
| Full Ontario Construction Act enforcement | Medium | High (compliance) | P2-H     |
| Sage data migration tooling               | Medium | Medium (one-time) | P2-I     |

### Public-Facing / Website

- **KrewPact has NO public marketing pages** — it's purely an internal/partner operations app
- **The MDM marketing website lives at `mdm-website-v2`** (separate repo, Payload CMS)
- Root page (`/`) redirects to auth → dashboard
- No landing page, pricing, or product marketing exists for KrewPact itself
- **Decision needed:** Does KrewPact need its own product/marketing site (for future SaaS), or is the current auth-gated-only approach correct for internal use?

---

## Alignment Score Breakdown

| Category                | Weight   | Score  | Notes                                |
| ----------------------- | -------- | ------ | ------------------------------------ |
| Functional completeness | 30%      | 95     | All MVP + P1 complete                |
| Architecture adherence  | 25%      | 95     | BFF, RLS, sync patterns all followed |
| Code quality            | 15%      | 88     | 1 TS error, 269 lint warnings        |
| Test coverage           | 15%      | 95     | 4,715 tests, CI enforced             |
| Integration wiring      | 15%      | 90     | All live except ADP/M365 deep        |
| **Weighted Total**      | **100%** | **93** |                                      |

---

## Recommendations

1. **Fix the 1 TypeScript error** — quick win
2. **Update blueprint docs** — the Execution Plan (Mar 4) is significantly outdated; current state far exceeds it
3. **Decide on KrewPact's public face** — if SaaS is the long-term play, a product marketing site on krewpact.com is needed
4. **Plan P2 sprint** — prioritize AI assistant and Construction Act compliance as highest-value next features
5. **Lint cleanup sprint** — split the 10-15 oversized files to get warnings under 50
