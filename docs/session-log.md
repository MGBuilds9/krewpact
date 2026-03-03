# Session Log

### Mar 2, 2026 — Multi-Tenant Org Wiring (Path-Based Routing)

- **Changes:** Merged PR #36 (organizations table, org_id on all core tables, restrictive RLS, seed script). Rewrote `middleware.ts` with org slug extraction, resolution via in-memory cache, and request header injection (`x-krewpact-org-id`, `x-krewpact-org-slug`). Moved all 16 dashboard feature directories under `app/(dashboard)/org/[orgSlug]/`. Created `contexts/OrgContext.tsx` (mirrors DivisionContext pattern), `lib/api/org.ts` (server-side org helpers), `hooks/useOrgRouter.ts` (org-aware navigation), `app/api/org/[slug]/route.ts` (GET org by slug). Updated 8 layout/nav components to use `useOrgRouter`. Updated 21 page files with org-aware routing. Updated 6 API routes with `getOrgIdFromAuth()` for org_id on INSERT. Created 2 new test files, updated 7 page tests + 2 test helpers. Added `krewpact_org_id` to JWT template docs.
- **Decisions:** API routes get org_id from JWT claims (via `getOrgIdFromAuth()`) not middleware headers. Service client used for org lookups (RLS restricts organizations to platform_admin). `useOrgRouter` hook centralizes org-aware path generation.
- **Tests:** 2058/2058 passing (167 files, +10 new tests). Typecheck clean. Build clean.

### Mar 1, 2026 — CRM HubSpot Parity: 10 Pipeline Gaps Closed

- **Changes:** Implemented 10 CRM gaps vs HubSpot across 4 sprints. Added `contacted` lead stage. Carried `source_channel` through conversion. Consolidated sequence processors with DLQ/branching/real email. Created round-robin lead assignment. Added auto follow-up task creation. Expanded sequence step types. Built email open/click tracking. Added `calculateForecastMetrics()`. Built saved views CRUD API.
- **Tests:** 2048/2048 passing (165 files). Typecheck clean. Build clean.

### Feb 27, 2026 — Production Readiness: Queue Wiring, Finance Dialogs, E2E, ERPNext Verified

- **Changes:** Wired 8 queue processor stubs to real SyncService methods. Added row-click detail dialogs to 3 finance pages. Fixed 2 E2E test selectors. Fixed 3 type errors. Verified ERPNext connectivity at erp.mdmgroupinc.ca.
- **Tests:** 2046/2046 passing. 16/16 E2E specs passing.

- Feb 27: CRM A-to-Z Completion (Sprints 5-8) — Flow builder, email templates, bulk ops, DLQ, SLA. 1990 tests.
- Feb 26: Seed real MDM data from Excel — 382 leads, 14 accounts, 231 contacts. 1020 tests.
- Feb 26: CRM Sprint 1+2 — DataTable, pagination, ContactForm, AccountForm. 1020 tests.
- Feb 25: Demo mode, DB schema alignment, UI polish. 904 tests.
- Feb 24: CRM lead lifecycle (8 phases) + Cross-Subdomain SSO. 904 tests.
- Feb 24: Full Service Connection + Microsoft Graph. 650 tests.
- Feb 23: LeadForge Pipeline (Phases A-F) + Clerk Auth Unification. 597 tests.
- Feb 15: Tier 3 Zod validation — all 32 mutating routes. 554 tests.
- Feb 13: CRM + Estimating Phase 1 (Ralph Loop). 549 tests.
- Feb 12: MDM Unified Growth Intelligence System (Phase 0) — Sales AGI + pgvector schema.
