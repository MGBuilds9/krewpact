# Blueprint Audit — 2026-03-23

## Executive Summary

**Alignment Score:** 93/100
**Critical Issues:** 0
**Architecture Drift:**

- Implementation continues to exceed MVP scope (344 routes vs ~40 planned) — deliberate acceleration, not drift
- 4 cron jobs and 1 webhook handler still lack dedicated tests
- Payment entry mapper remains orphaned (no sync handler)

**Delta since last audit (Mar 17, score 91/100):**

- JWT/auth ambiguity resolved — Clerk Third-Party Auth is now the canonical path, code comments explicit
- Dual-name claim fallback eliminated — `lib/api/org.ts` rewritten with clean metadata accessor
- BullMQ references removed from CLAUDE.md
- Inventory system shipped (14 test files, 6 migrations, full CRUD + POs + serials + fleet)
- AI Takeoff engine integrated (4 phases, 2 test files)
- PWA support + Expo native app scaffold
- Production hardening on auth flows
- Next.js 16.1.7 → 16.2.1

## Numbers

| Metric                | Blueprint | Mar 17 | Mar 23 | Δ    |
| --------------------- | --------- | ------ | ------ | ---- |
| API routes            | ~40       | 314    | 344    | +30  |
| Features              | 25        | 80+    | 85+    | +5   |
| Pages                 | -         | 100    | 118    | +18  |
| Components            | -         | 95     | 303    | +208 |
| Lib files             | -         | -      | 171    | -    |
| Hooks (custom)        | -         | -      | 67     | -    |
| Migrations            | -         | 54     | 60     | +6   |
| Test files            | -         | -      | 372    | -    |
| Tests passing         | -         | 3,871  | 4,306  | +435 |
| Cron jobs             | -         | 14     | 14     | 0    |
| Lint errors           | 0         | 0      | 0      | 0    |
| Type errors           | 0         | 0      | 0      | 0    |
| Lint warnings         | -         | -      | 225    | -    |
| ERPNext mappers       | 12        | 13     | 13     | 0    |
| External integrations | 5 (MVP)   | 14     | 14     | 0    |

## Core Architecture

| Area             | Blueprint                        | Actual                                          | Status |
| ---------------- | -------------------------------- | ----------------------------------------------- | ------ |
| Auth             | Clerk + JWT → Supabase RLS       | Clerk Third-Party Auth (session token) → RLS    | ✅     |
| Database         | Supabase PostgreSQL + RLS        | 60 migrations, deny-by-default RLS              | ✅     |
| ERPNext          | 12 mappers, eventual consistency | 13 mappers, circuit breaker, retry + DLQ        | ✅     |
| Queue            | QStash serverless                | QStash with dev fallback, 14 cron jobs          | ✅     |
| Rate limiting    | Upstash Redis                    | Upstash Redis with circuit breaker fail-open    | ✅     |
| RBAC             | 9 internal + 4 external roles    | Exact match, 25 permissions, 12 domains         | ✅     |
| Proxy/Auth       | Auth + org routing               | Public routes, domain restriction, org redirect | ✅     |
| Error handling   | Structured responses             | ApiError class + error boundaries               | ✅     |
| Env validation   | Zod schema                       | Required vs optional with prod warnings         | ✅     |
| Feature flags    | Gate all features                | 17 flags, 6 enabled, 11 disabled                | ✅     |
| File size ESLint | 150-300 line limits              | Enforced (only scripts exempt)                  | ✅     |

## Feature Domains

| Domain       | Routes | Pages | Tests       | Status                                            |
| ------------ | ------ | ----- | ----------- | ------------------------------------------------- |
| CRM          | 87     | 30    | ✅          | ✅ Exceeds (includes Sales AGI)                   |
| Estimating   | 16     | 5     | ✅          | ✅ Complete (+ AI takeoff)                        |
| Projects     | 63     | 15    | ✅          | ✅ Exceeds (safety, warranty, closeout)           |
| Contracting  | 7      | 1     | ✅          | ✅ Complete                                       |
| Finance      | 12     | 4     | ✅          | ✅ Complete                                       |
| Portals      | 21     | 6     | ✅          | ✅ Exceeds (client + trade)                       |
| Executive    | 15     | 4     | ✅          | ✅ Exceeds (RAG, knowledge, staging)              |
| AI           | 9      | 0     | ✅          | ✅ Exceeds (8 agents, Gemini, killswitch)         |
| Inventory    | 25+    | 10    | ✅ 14 files | ✅ NEW — Full system (items, POs, fleet, serials) |
| Admin/System | 30+    | 12    | ✅          | ✅ Exceeds (14 crons, privacy, BCP, governance)   |

## New Since Last Audit

### Inventory Management System (Mar 20-21)

- **6 new migrations:** enums, tables, RLS, triggers, takeoff RLS, Almyta migration support
- **8 API route groups:** items, fleet, locations, purchase-orders, goods-receipts, serials, transactions, stock
- **10 pages:** items list/detail/new, fleet list/detail, locations, POs list/detail/new, receive, transactions
- **16 components:** item-form, fleet-form, po-form, po-line-editor, receive-form, serial-tracker, etc.
- **14 test files:** API tests, lib tests, RLS tests, validator tests
- **Lib modules:** items, ledger, fleet, goods-receipts, locations, purchase-orders, serials, stock-summary
- **Feature flag:** `inventory_management: true`
- **Architecture:** Append-only double-entry ledger. No UPDATE/DELETE on `inventory_ledger`. Aligned with design spec.

### AI Takeoff Engine (Mar 20-21)

- Integration with external takeoff service for estimate line generation
- 4-phase workflow: upload → process → review → accept
- 2 test files (client + RLS)
- Feature flag: `ai_takeoff: true`

### PWA + Expo (Mar 21)

- Service worker with offline fallback (`sw.ts`)
- `InstallPrompt` component
- Offline page
- Expo native app scaffold in `mobile/` (SDK 54, React Native 0.81)
- EAS project configured

### Production Hardening (Mar 23)

- Auth flow improvements
- Session token approach clarified with code comments

## Prior Audit Issues — Resolved

| #   | Issue (Mar 17)                         | Status     | Evidence                                                                               |
| --- | -------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| 1   | JWT template vs session token          | ✅ FIXED   | `server.ts:46` — explicit comment, Third-Party Auth                                    |
| 2   | Dual-name claim fallback               | ✅ FIXED   | `org.ts` — clean `_getClerkMetadata()` accessor                                        |
| 3   | CLAUDE.md BullMQ refs                  | ✅ FIXED   | 0 occurrences of BullMQ in CLAUDE.md                                                   |
| 4   | 4 cron jobs missing tests              | ⚠️ PARTIAL | 10/14 tested. Still missing: `icp-refresh`, `portal-reminders`, `scoring`, `summarize` |
| 5   | Clerk webhook missing test             | ❌ OPEN    | Only `boldsign` and `erpnext` webhook handlers tested                                  |
| 6   | Payment entry mapper — no sync handler | ❌ OPEN    | Mapper exists, no `sync-payment-entry.ts`                                              |

## Current Issues

### Short-term (MEDIUM)

1. **4 cron jobs untested** — `icp-refresh`, `portal-reminders`, `scoring`, `summarize` have route handlers but no test files. All other 10 crons have tests.

2. **Clerk webhook handler untested** — `app/api/webhooks/clerk/route.ts` handles user sync from Clerk but has no test. BoldSign and ERPNext webhook handlers are tested.

3. **Payment entry mapper orphaned** — `lib/erp/payment-entry-mapper.ts` exists but there is no `sync-handlers/sync-payment-entry.ts` to invoke it. Either wire it up or remove it.

4. **Lint warnings in scripts** — 225 warnings, all in scripts/ directory:
   - `scripts/inventory-migration/transform.ts` (664 lines, complexity 82)
   - `scripts/health-check.ts` (585 lines, complexity 16, deep nesting)
   - `scripts/ingest-book.ts` (228 lines, complexity 29)
   - `lib/queue/processor.ts` (101 lines, complexity 27)
   - `lib/validators/inventory-items.ts` (unused import)
   - One `alt-text` warning in a layout image

5. **`lib/queue/processor.ts` complexity** — Only non-script file with a lint warning. Cyclomatic complexity 27 (limit 15). Consider splitting by job type.

### Low Priority

6. **CLAUDE.md session log growing** — Consider archiving older entries (pre-March) to `docs/session-log.md` to keep CLAUDE.md focused.

7. **Expo mobile app untested** — `mobile/` directory has no test runner configured. PWA tests not present either. Both are new additions.

### Documentation Updates Needed

8. Route/feature/test counts in Architecture Resolution doc are stale (based on original estimates).

## Feature Flag Status

| Flag                   | Enabled | Notes                |
| ---------------------- | ------- | -------------------- |
| `ai_suggestions`       | ✅      | Active               |
| `ai_insights`          | ✅      | Active               |
| `ai_daily_digest`      | ✅      | Active               |
| `sequences`            | ✅      | Active               |
| `inventory_management` | ✅      | Shipped Mar 20       |
| `ai_takeoff`           | ✅      | Shipped Mar 20       |
| `portals`              | ❌      | Code complete, gated |
| `executive`            | ❌      | Code complete, gated |
| `bidding`              | ❌      | Code complete, gated |
| `enrichment_ui`        | ❌      | Code complete, gated |
| `migration_tool`       | ❌      | Admin only           |
| `schedule`             | ❌      | Future               |
| `documents_upload`     | ❌      | Future               |
| `finance`              | ❌      | Code complete, gated |
| `safety`               | ❌      | Code complete, gated |
| `closeout`             | ❌      | Code complete, gated |
| `warranty`             | ❌      | Code complete, gated |

## Code Health

```
Lint:       0 errors, 225 warnings (scripts only)
Types:      0 errors
Tests:      4,306/4,306 passing (372 files, 37s)
Build:      Clean (Next.js 16.2.1)
```

## Action List

**Short-term (should fix):**

- [ ] Add tests for 4 untested crons (`icp-refresh`, `portal-reminders`, `scoring`, `summarize`)
- [ ] Add test for Clerk webhook handler
- [ ] Wire up `sync-payment-entry.ts` or remove orphaned mapper
- [ ] Fix unused import in `lib/validators/inventory-items.ts` (`nullableSafeString`)
- [ ] Refactor `lib/queue/processor.ts` to reduce complexity below 15

**Low priority:**

- [ ] Address `alt-text` lint warning in layout image
- [ ] Archive older CLAUDE.md session entries
- [ ] Add mobile/PWA test runner

**Documentation:**

- [ ] Update Architecture Resolution doc with current counts (344 routes, 118 pages, 4,306 tests)
