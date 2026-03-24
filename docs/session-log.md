# KrewPact Session Log

Archived session entries. Most recent first.

---

### Mar 23-24, 2026 — Playbook v2 Gold Standard + KrewPact Alignment + Production Readiness + UX Bug Fixes

- **Changes:** (1) Blueprint audit — 93/100 score. 344 routes, 118 pages, 4,306 tests, 60 migrations. All prior audit issues resolved except 4 untested crons and orphaned payment mapper. (2) MKG-Builds-Dev-Playbook v2 — 851-line gold-standard CLAUDE.md template, 13 sections. Added SOURCES.md + README.md. Covers architecture, security, Clerk Third-Party Auth, ESLint quality gates, feature flags, production hardening, CI/CD, agent rules. (3) KrewPact docs rewrite — CLAUDE.md 345 lines (was 374), AGENTS.md 187 lines (was 279), expanded contributing.md, updated Architecture Resolution with current audit counts. Moved session logs to docs/session-log.md. (4) Dev environment fixes — CI upgraded Node 20→24, added format:check step, tsconfig ES2017→ES2022, refactored queue/processor.ts (complexity 27→<15), removed unused import. (5) Production readiness verified — Vercel deployment READY, hub.mdmgroupinc.ca live, health endpoint OK, all security headers present, Clerk production with M365 SSO, Sentry clean (0 issues 7d). Production domain is hub.mdmgroupinc.ca (not app.krewpact.com). (6) UX bug fixes — division names via useDivisionName hook + DivisionContext enriched with allDivisions + getDivisionName (fetches all org divisions, cached 5min), fixed 5 UUID/code locations; lead deletion via delete button + ConfirmReasonDialog wired to existing useDeleteLead hook; PO form: replaced permanent "None" with loading skeleton, error alert, multi-division Select; BulkActionBar: replaced 4x window.confirm/prompt with ConfirmReasonDialog. (7) Raw ID/enum cleanup — created formatStatus() utility ("in_progress" → "In Progress"), applied to 6 high-traffic pages; fixed 3 P0 user_id→name resolutions (RepPerformanceCard, audit log, sequence enrollments). (8) Console error fixes — CSP wildcard \*.mdmgroupinc.ca for Clerk subdomains, added vercel.live to script-src/connect-src/frame-src; chart Recharts -1 dimension error fixed with min-h/min-w on ChartContainer + explicit ResponsiveContainer dimensions; Clerk DNS guided (CNAME for clerk.hub.mdmgroupinc.ca → frontend-api.clerk.accounts.dev).
- **Decisions:** DivisionContext enriched with allDivisions for org-wide name resolution (single source of truth, not per-hook fetching). Playbook v2 uses Clerk Third-Party Auth as default. formatStatus() as shared utility rather than per-component label maps. CSP uses \*.mdmgroupinc.ca wildcard to handle both Clerk domain configurations.
- **Tests:** 4,316/4,316 passing (374 files). +10 new tests (useDivisionName, formatStatus). 0 lint errors, 226 warnings (scripts only). 0 type errors.
- **Next:** Clerk DNS fix (CNAME clerk.mdmgroupinc.ca or remove NEXT_PUBLIC_CLERK_DOMAIN from Vercel env vars). Apply formatStatus() to remaining 9 enum locations. Fix P1 content card UUIDs (contracts/proposal_id, photos/file_id). Systematic UAT walkthrough of all enabled features. Enable additional feature flags (finance, portals, executive) after UAT.

---

### Mar 21, 2026 — PWA + Expo Native App Production-Ready + SDK 54 Upgrade

- **Changes:** Two parallel tracks — PWA (web app installable) and Expo native (field worker UX). **PWA:** Added @serwist/next service worker with offline fallback, enhanced manifest (shortcuts, maskable icons), iOS PWA meta tags, InstallPrompt component. **Expo:** Fixed all 7 API type mismatches (dashboard, projects, tasks, leads, daily logs — every field name and pagination wrapper was wrong). Redesigned Time screen from clock-in/out to hours-entry model matching actual DB schema. Rewrote DailyLogForm (work_summary, crew_count, weather as JSON, log_date). Added auth guard with useEffect redirect pattern. Created app.config.ts with env vars. Upgraded SDK 52→54 (React Native 0.81, React 19). Installed all missing peer deps (expo-crypto, expo-linking, expo-web-browser, expo-auth-session). EAS project created (@mkgbuilds/krewpact on expo.dev).
- **Files:** 6 new files (sw.ts, offline page, InstallPrompt, app.config.ts, eas.json, .env). 16 modified. 1 deleted (unused ProjectHealthCard).
- **Decisions:** PWA gives "full mirror" immediately (web app already had BottomNav, MobileNavigationDrawer, responsive layout). Native app focuses on field-worker UX. Time tracking uses hours-entry model (matches DB), clock-in/out deferred to Phase 2 (needs new table). Expo Go has limitations with native modules — development builds recommended once Apple Developer account approved.
- **Tests:** 4,310/4,310 passing (372 files). 0 type errors (web + mobile). Build clean. iOS bundle compiles via `expo export`.
- **Next steps:** Test in Expo Go or iOS Simulator (needs full Xcode). Once Apple Developer Program approved: EAS development build → TestFlight. Android dev build possible now. PWA deployed with Vercel auto-deploy.

### Mar 21, 2026 — AI Takeoff Engine Integration + App Audit + Database Seeding

- **Changes:** Full AI takeoff integration (4 phases), deep audit (8 issues fixed), Modal deployment, item suppliers tab, DB seeding.
- **Tests:** 4,310/4,310 passing. Build clean.

### Mar 5, 2026 — Phase 2: P0 Hardening — A11y, Responsive, Impersonation

- **Changes:** Fixed impersonation selector wireup (ImpersonationSelector dialog + `/api/user/current?impersonate=` backend with admin RBAC). Ran axe-core-style accessibility audit, fixing ARIA labels/roles/keyboard nav across 6 components (NotificationBell, BulkActionBar, GlobalSearch, CommandPalette, LineItemEditor, DataTable). Mobile responsive QA across all P0 pages — fixed 33 components: form grids `grid-cols-2 → grid-cols-1 sm:grid-cols-2`, fixed-width containers (DivisionSelector, MobileNavDrawer, StepConfigPanel), hardcoded multi-col grids (EmailAnalytics, SalesVelocity, Dashboard), DataTable overflow-x-auto.
- **Commits:** `294b723` (impersonation), `110c4f4` (a11y), `f17232b` (responsive)
- **Tests:** 2448/2448 passing (210 files). Typecheck clean.
- **Remaining:** Production deployment prep BLOCKED on D1-D4 credentials.

### Mar 2, 2026 — Team-Ready Development Environment

- **Changes:** Restructured CLAUDE.md from 287→97 lines, moving architecture/session history to `docs/`. Created domain-scoped CLAUDE.md files (`app/api/CLAUDE.md`, `lib/CLAUDE.md`). Added Prettier + Husky + lint-staged pre-commit hooks. Created `.nvmrc` (Node 20), `.editorconfig`, `.prettierrc`. Built CONTRIBUTING.md with security checklist, PR template, domain ownership map (`docs/domains.md`), security best practices (`docs/security.md`). Fixed 6 pre-existing lint errors (5x `no-explicit-any` in portal routes, 1x setState-in-effect in PortalMessageThread). Hardened CI with format check + separate security audit job (`npm audit --omit=dev`). Ran Prettier across entire codebase. PR #37 merged.
- **Decisions:** `--max-warnings 0` removed from lint-staged (205 pre-existing warnings would block commits). `types/supabase.ts` (3629 lines) added to `.prettierignore`. CI security audit uses `--omit=dev` to avoid xlsx devDep false positives. `docs/architecture.md` renamed to `docs/architecture-overview.md` to avoid collision with `docs/architecture/` directory.
- **Tests:** 2058/2058 passing (167 files). Typecheck clean. Build clean.

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

### Mar 6–20, 2026 — Condensed Log

- **Mar 20:** Estimate Builder Phase 2 (P0 Fixes) — inline line editing, `/estimates/new` page, estimates sub-nav layout. 4,029 tests.
- **Mar 20:** Inventory System Design — full spec for Almyta replacement (append-only ledger, 11 tables, fleet vehicles, serial/lot tracking). Spec at `docs/superpowers/specs/2026-03-20-inventory-system-design.md`.
- **Mar 20:** Inventory Implementation — schema migration, dashboard UI (items, stock overview, locations), PO creation/receiving, transaction history. 4,286 tests.
- **Mar 20:** Enrollment Approval Gate — all sequence enrollments require `pending_review` approval. Rewrote email templates. Built approvals UI. 4,029 tests.
- **Mar 19:** Header & Dashboard UI Polish — nav overflow dropdown (MAX_VISIBLE=5), removed inline user name/online badge, clean dashboard cards. 3,986 tests.
- **Mar 17:** Fix Email Pipeline + Smoke Test Spam + ERPNext Auth — 5 compounding issues resolved. 3,981 tests.
- **Mar 17:** Production Hardening — feature gating (16 flags), UX fixes (8 broken UI items), AI guardrails. 3,871 tests.
- **Mar 16:** Production Hardening — demo removal, coding standards (10 ESLint rules), 8 file splits. 3,871 tests.
- **Mar 14:** RBAC Unification + Platform Hardening + Mobile scaffold. Scoring alignment. 3,866 tests.
- **Mar 13:** David's Sales Deliverables + CEO Sales Book v2 + Leads folder optimization.
- **Mar 12:** AI Agentic Layer (8 agents, Gemini Flash, killswitch) + Lusha Integration. 3,750 tests.
- **Mar 11:** Closed-Loop CRM + 7-agent audit (79 files fixed). 3,489 tests.
- **Mar 10:** Production Readiness (14 stories). 3,488 tests.
- **Mar 9:** Executive Nucleus + Enterprise Phase 2. 3,478 tests.
- **Mar 8:** P1 completion + autonomous loop (all 18 PRD tasks). 3,092 tests.
- **Mar 6:** Queue migration BullMQ → QStash. Simplified job processing via Vercel serverless + HTTP push.
