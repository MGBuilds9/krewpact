# Blueprint Audit — 2026-04-12

**Alignment Score: 88/100**
**Critical Issues: 1** (build broken by TypeScript errors)
**Architecture Drift:**
- Supabase JS v2.102+ introduced `RejectExcessProperties` — breaks `Record<string, unknown>` patterns in inventory serials + migration script (build fails)
- Projects module missing dedicated milestones and punch list routes (embedded in overview instead)
- Finance module is read-only ERPNext mirror — no AR aging or budgets pages (by design, but blueprint expects them)
- ConfirmDialog listed in CLAUDE.md shared components but missing from `components/shared/`

---

## Executive Summary

KrewPact is a mature, well-architected construction operations platform. Phase 0 (Foundation + SSO Unlock) is complete. The codebase has 130 pages, 374 API routes, 5,445 passing tests across 510 files, 84 database migrations, and a comprehensive auth/security posture. The single blocking issue is a TypeScript regression from a Supabase SDK upgrade that prevents production builds.

---

## Code Health

| Check | Result | Details |
|-------|--------|---------|
| Lint | PASS (0 errors, 29 warnings) | All warnings are pre-existing complexity/max-params thresholds |
| TypeScript | FAIL (3 errors) | `lib/inventory/serials.ts:203,240` + `scripts/inventory-migration/load.ts:118` — `RejectExcessProperties` from Supabase SDK upgrade |
| Unit Tests | PASS (5,445/5,445) | 510 test files, 49.5s runtime |
| Build | FAIL | Blocked by TypeScript errors above |
| Format | PASS | Prettier clean |

### TypeScript Errors (Blocking)

All 3 errors share the same root cause: `Record<string, unknown>` is no longer assignable to Supabase's new `RejectExcessProperties<T>` generic. The `@supabase/supabase-js` v2.102+ upgrade tightened insert/update typing.

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `lib/inventory/serials.ts` | 203 | `updateData` typed as `Record<string, unknown>` passed to `.update()` | Type as `Tables<'inventory_serials'>['Update']` |
| `lib/inventory/serials.ts` | 240 | Same pattern in `updateSerialStatus` | Same fix |
| `scripts/inventory-migration/load.ts` | 118 | Generic `T extends Record<string, unknown>` too loose for `.insert(row)` | Cast with `as any` (script-only) or constrain generic |

**Priority: P0** — Build is broken. Must fix before any deploy.

---

## Blueprint vs Implementation

### Auth & Security

| Area | Blueprint Says | Actual | Status | Priority |
|------|----------------|--------|--------|----------|
| Clerk Third-Party Auth | Session tokens drive Supabase RLS, no custom JWT template | Implemented in `lib/supabase/server.ts` — `getToken()` directly | ✅ | — |
| RLS claims | `auth.jwt() ->> 'krewpact_user_id'`, never `auth.uid()` | 136 `auth.jwt()` refs, 0 `auth.uid()` across 12 migration files | ✅ | — |
| 13 roles (9 internal + 4 external) | Canonical role model in CLAUDE.md | Implemented in RBAC layer + `lib/rbac/sync-roles.ts` | ✅ | — |
| Rate limiting | Upstash Redis, fails open | `lib/api/rate-limit.ts` — sliding window, 60/30 rpm, circuit breaker | ✅ | — |
| Webhook verification | svix + timingSafeEqual | svix (Clerk, BoldSign) + timingSafeEqual (ERPNext, Takeoff, leads, health, cron) — 11 files | ✅ | — |
| Timing attack regression tests | Cover all webhook endpoints | `__tests__/api/webhooks/timing-attack-regression.test.ts` — 27 tests, 6 endpoints | ✅ | — |
| API auth coverage | All routes authenticated | `withApiRoute()` enforces `auth: 'required'` by default. Public routes intentional (leads, email tracking, queue/cron) | ✅ | — |
| `service_role` isolation | Server-only, never in client | Only in `lib/supabase/server.ts`, `lib/env.ts`, scripts, edge functions | ✅ | — |
| Matview RLS gap | SECURITY INVOKER wrapper | Migration `20260409_002` creates `inventory_stock_summary_secure` view | ✅ | — |
| SSO to ERPNext | Clerk OIDC IdP → frappe-oidc-extended | Live. `/go/erpnext/[...slug]` redirect route with origin-checked cookie | ✅ | — |
| Security headers | CSP, HSTS, X-Frame-Options | Configured in `next.config.ts` — 5+ header directives | ✅ | — |
| Error boundaries | Per route group + global | 49 `error.tsx` + 1 `global-error.tsx` | ✅ | — |

**Auth Score: 12/12 — No gaps.**

### ERPNext Integration

| Area | Blueprint Says | Actual | Status | Priority |
|------|----------------|--------|--------|----------|
| 47 entity mappings | MVP 12 + P2 Batches 2A-2D + extensions | 47 sync handlers in `lib/erp/sync-handlers/` — exact match | ✅ | — |
| Sole access point | All calls through `lib/erp/client.ts` | Confirmed. 0 production routes bypass. 3 scripts + 2 health checks use direct fetch (acceptable) | ✅ | — |
| Circuit breaker | CLOSED/OPEN/HALF_OPEN pattern | 5 consecutive failures → 30s open, half-open probe | ✅ | — |
| Retry with backoff | Exponential on 5xx/408/429 | Up to 3 attempts, 1s/2s backoff | ✅ | — |
| QStash queue | Async job processing | `POST /api/erp/sync` → QStash → `/api/queue/process` → SyncService | ✅ | — |
| Idempotent upsert | Dedup within 1-hour window | Implemented in sync handlers | ✅ | — |
| `krewpact_*` custom fields | Cross-system link fields | `krewpact_id`, `krewpact_user_id`, `krewpact_change_order_id` + 3 more | ✅ | — |
| Mock mode | Fallback when ERPNEXT_BASE_URL unset | Alerts Sentry in production | ✅ | — |

**ERPNext Score: 8/8 — No gaps.**

### Feature Completeness by Domain

| Domain | Blueprint Expects | Actual | Status | Gaps |
|--------|-------------------|--------|--------|------|
| **CRM** | Leads, opportunities, accounts, contacts, pipeline, activities, bidding, sequences, enrichment, scoring | 70+ components, full route tree including bidding + sequences + enrichment + settings (scoring/SLA/templates) | ✅ | Pipeline embedded in opportunities (valid UX choice, not a gap) |
| **Estimates** | Builder, templates, catalog, assemblies, proposals, version history | Full route tree + `LineItemEditor`, `TotalsPanel`, `AssemblyBuilderForm`, `ProposalGenerationForm`, `VersionHistory` | ✅ | — |
| **Projects** | Milestones, daily logs, RFIs, submittals, change orders, punch lists, closeout, safety, procurement | 15+ sub-routes: diary, rfis, submittals, change-orders, closeout, safety, procurement, selections, photos, time, warranty, meetings, documents | ⚠️ | No dedicated milestones route (embedded in overview). No punch list route. |
| **Inventory** | Items, locations, stock movements, serials, BOMs, fleet, POs | Full route tree: items, locations, transactions, adjustments, POs, receive, fleet + serial tracker | ✅ | BOMs delegated to ERPNext (correct per data authority rules) |
| **Finance** | Invoices, expenses, AR aging, budgets, job costs | Overview, invoices, job-costs, purchase-orders | ⚠️ | No AR aging page. No budgets page. ERPNext is authoritative — may be intentional SSO deep-link targets. |
| **Executive** | Dashboard, reports, AI insights | Dashboard + knowledge/chat + knowledge/ingest + knowledge/base + subscriptions | ✅ | — |
| **Portal** | Client portal, trade partner portal | Client: projects + documents/meetings/messages/progress/survey. Trade: onboarding/bids/compliance/submittals/tasks | ✅ | — |
| **Settings** | Org settings, team management, roles, branding | Overview, organization, users, roles, branding, compliance, cost-codes, scoring | ✅ | — |
| **Mobile** | Expo field-worker app: logs, time, safety, photos | Tabs: dashboard, logs, photos, safety, time, more + project detail/list | ✅ | Field-worker scoped by design |
| **AI/RAG** | pgvector, knowledge chat, embeddings | `lib/ai/`, `lib/knowledge/`, executive knowledge routes, `ai_chat_sessions` | ✅ | Vercel AI SDK v6 + Cmd-K deferred to Phase 4 |

### Infrastructure & DevOps

| Area | Blueprint Says | Actual | Status | Priority |
|------|----------------|--------|--------|----------|
| CI/CD pipeline | Lint → Typecheck → Test → Build → E2E → Security | 4 workflows: `ci.yml`, `dependabot-auto-merge.yml`, `label-pr.yml`, `security-scan.yml` | ✅ | — |
| Feature flags | `org_settings.feature_flags` JSONB, FeatureGate component | `components/shared/FeatureGate.tsx` + 10 route-group layouts enforcing gates | ✅ | — |
| Structured logging | `lib/logger.ts`, no console.log | ESLint `no-console` (error) + logger in 49+ files | ✅ | — |
| Environment validation | Zod schema for env vars | `lib/env.ts` | ✅ | — |
| Monitoring | Sentry + Vercel Analytics + BetterStack + Checkly | All present. Checkly config (`checkly.config.ts`) + 4 checks | ✅ | — |
| E2E testing | Playwright + @clerk/testing for prod QA | Dev suite (16 specs) + QA suite (`npm run qa:e2e`, 12 tests) | ✅ | — |
| Offline/PWA engine | IndexedDB queue, conflict resolution, sync | `lib/offline/` — store, sync-engine, conflict-resolver, online-detector | ✅ | — |
| Database migrations | RLS on all tables, `auth.jwt()` only | 84 migrations. 136 `auth.jwt()` refs, 0 `auth.uid()` | ✅ | — |

### Shared Components

| Component | CLAUDE.md Lists | Exists | Status |
|-----------|-----------------|--------|--------|
| DataTable | Yes | Not in `components/shared/` | ⚠️ Likely in domain dirs or shadcn |
| ConfirmDialog | Yes | Not in `components/shared/` | ⚠️ Missing — may use shadcn AlertDialog |
| DataTableSkeleton | Yes | `components/shared/DataTableSkeleton.tsx` | ✅ |
| EmptyState | Yes | `components/shared/EmptyState.tsx` | ✅ |
| FormSection | Yes | `components/shared/FormSection.tsx` | ✅ |
| PageHeader | Yes | `components/shared/PageHeader.tsx` | ✅ |
| PageSkeleton | Yes | `components/shared/PageSkeleton.tsx` | ✅ |
| StatsCard | Yes | `components/shared/StatsCard.tsx` | ✅ |
| StatusBadge | Yes | `components/shared/StatusBadge.tsx` | ✅ |
| FeatureGate | Not listed (discovered) | `components/shared/FeatureGate.tsx` | 🔄 Document |
| OfflineSyncListener | Not listed (discovered) | `components/shared/OfflineSyncListener.tsx` | 🔄 Document |

---

## Phase Status vs Plan

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| **Phase 0** | Foundation: Gaps + SSO Unlock | ✅ COMPLETE | PR #136 merged 2026-04-10. 5,445 tests. SSO live. |
| **Phase 1** | Set Up the Right System (ERPNext config, 22 users, runbooks) | NOT STARTED | Requires `MICROSOFT_GRAPH_*` env vars. ~1-2 weeks. |
| **Phase 2** | Data Audit: Map Existing Data (73K docs, entity mapping) | NOT STARTED | ~1 week. Depends on Qdrant (73K docs indexed). |
| **Phase 3** | CEO Demo: 10 Screens That Work | NOT STARTED | ~1-2 weeks. Real data, zero dead buttons. |
| **Phase 4** | AI Agent Layer + CEO Demo | NOT STARTED | Vercel AI SDK v6, Cmd-K, role-aware tools. ~1-2 weeks. |
| **Phase 5** | Pilot: One Division, One Revenue Path | NOT STARTED | Requires Supabase Pro upgrade. ~2-4 weeks real usage. |
| **Phase 6** | Full Rollout + Legacy Sunset | NOT STARTED | All 6 divisions. Sage retired. ~1-2 months. |
| **Phase 7** | Long Tail | NOT STARTED | Takeoff, mobile offline, portal public, ADP payroll. |

**CEO demo target:** Late May 2026 (Phases 0-4 complete)
**Pilot target:** June-July 2026

---

## Deferred Items (Tracked)

| Item | Where Tracked | Blocker |
|------|---------------|---------|
| Supabase PITR drill | TODOS.md | Not on Pro tier — must upgrade before Phase 5 |
| BoldSign sender email | TODOS.md, Phase 6 prerequisite | Domain not in M365 tenant |
| Takeoff integration | Plan Phase 7 | No good open-source AI takeoff in 2026 |
| GitHub branch protection | Account audit 2026-04-11 | Requires GitHub Pro ($4/mo) |
| Credential rotation (LeadForge) | Account audit 2026-04-11 | ACTION REQUIRED — not yet done |

---

## Action List

### Immediate (P0 — Blocking)

- [ ] Fix `lib/inventory/serials.ts:203,240` — Replace `Record<string, unknown>` with typed Supabase update type for `inventory_serials`
- [ ] Fix `scripts/inventory-migration/load.ts:118` — Constrain generic or cast for Supabase `.insert()` compatibility
- [ ] Verify `npm run build` succeeds after fixes

### Short-term (P1 — Tech Debt)

- [ ] Add dedicated milestones route under Projects (currently embedded in overview)
- [ ] Add dedicated punch list route under Projects (blueprint expects it)
- [ ] Evaluate AR aging + budgets pages for Finance (or document as intentional ERPNext deep-link targets)
- [ ] Locate or create `ConfirmDialog` and `DataTable` in `components/shared/` (or update CLAUDE.md to reflect actual locations)

### Documentation (Blueprint Updates)

- [ ] Add `FeatureGate` and `OfflineSyncListener` to CLAUDE.md shared components list
- [ ] Update CLAUDE.md test count from 5,404 to 5,445
- [ ] Update CLAUDE.md route counts (130 pages, 374 API routes)
- [ ] Document older plan files in `docs/plans/` as superseded by unified gateway plan v2
- [ ] Update lint warning count (29 stable baseline)

---

## Metrics Summary

| Metric | Value |
|--------|-------|
| Pages | 130 |
| API Routes | 374 |
| Test Files | 510 |
| Passing Tests | 5,445 |
| Database Migrations | 84 |
| ERPNext Mappings | 47/47 |
| Feature Flags | Enforced on 10 route-group layouts |
| Error Boundaries | 49 + 1 global |
| shadcn Primitives | 57 |
| Domain Component Dirs | 30 |
| Zod Validators | 36 |
| React Query Hooks | 64 |
| Lint Errors | 0 |
| Lint Warnings | 29 (baseline) |
| TypeScript Errors | 3 (Supabase SDK regression) |
| Build | FAILING |
| Security Vulnerabilities | 0 found |

---

*Audit performed 2026-04-12 against plan v2 (Unified Gateway) at `~/.claude/plans/polymorphic-conjuring-stream.md` and architecture docs at `docs/architecture/`.*
