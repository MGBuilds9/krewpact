# Blueprint Audit — 2026-03-24

## Executive Summary

**Alignment Score:** 95/100 (up from 89 pre-fix, 93 on Mar 23)
**Critical Issues Fixed This Session:** 3 → 0
**Remaining Issues:** 5 medium priority

**What changed this session:**

- Vercel Analytics + Speed Insights installed and wired to root layout
- `SUPABASE_SERVICE_ROLE_KEY` + `CLERK_SECRET_KEY` now required in production (env schema hardened)
- 5 missing error boundaries added (inventory, expenses, timesheets, team, notifications)
- 5 missing loading skeletons added (expenses, timesheets, team, notifications, executive)
- `requireRole()` helper added — finance routes now enforce role-based access
- Legacy RBAC fallback removed (all 3 Clerk users confirmed migrated to `role_keys`)
- 35 new tests (4 cron routes + Clerk webhook + finance RBAC tests)
- Payment entry mapper confirmed in use by sync-invoices (NOT orphaned)
- Queue processor already refactored (complexity ~5, not 27 as previously reported)

**Delta since last audit (Mar 23, score 93/100):**

- Observability gap closed (Analytics + SpeedInsights)
- Env schema hardened for production
- Error/loading boundary coverage expanded from 13 → 18 error.tsx, 14 → 19 loading.tsx
- Finance routes now have server-side RBAC
- +35 tests, 0 new type/lint errors

## Numbers

| Metric             | Mar 17 | Mar 23 | Mar 24 | Δ (session) |
| ------------------ | ------ | ------ | ------ | ----------- |
| API routes         | 314    | 344    | 344    | 0           |
| Pages              | 100    | 118    | 118    | 0           |
| Components (total) | 95     | 303    | 355    | +52         |
| Test files         | —      | 372    | 384    | +12         |
| Tests passing      | 3,871  | 4,306  | 4,351  | +45         |
| Error boundaries   | —      | 13     | 18     | +5          |
| Loading skeletons  | —      | 14     | 19     | +5          |
| Lint errors        | 0      | 0      | 0      | 0           |
| Type errors        | 0      | 0      | 0      | 0           |
| Lint warnings      | —      | 225    | 227    | +2          |

## Core Architecture

| Area             | Blueprint                               | Actual                                                                       | Status |
| ---------------- | --------------------------------------- | ---------------------------------------------------------------------------- | ------ |
| Auth             | Clerk + JWT → Supabase RLS              | Clerk Third-Party Auth → RLS                                                 | ✅     |
| Database         | Supabase PostgreSQL + RLS               | 60 migrations, deny-by-default                                               | ✅     |
| ERPNext          | 12 mappers, eventual consistency        | 13 mappers, circuit breaker, retry + DLQ                                     | ✅     |
| Queue            | QStash serverless                       | QStash with dev fallback, 14 cron jobs                                       | ✅     |
| Rate limiting    | Upstash Redis                           | Upstash Redis, circuit breaker fail-open                                     | ✅     |
| RBAC             | 9 internal + 4 external roles           | Exact match, 25 permissions, 12 domains                                      | ✅     |
| Observability    | Sentry + Vercel Analytics + BetterStack | Sentry ✅ + Analytics ✅ + BetterStack ⚠️ (account exists, monitors pending) | ⚠️     |
| Env validation   | Required vs optional, Zod               | Zod + production superRefine for critical vars                               | ✅     |
| Feature flags    | Gate all features                       | 17 flags, 6 enabled, 11 disabled                                             | ✅     |
| Error boundaries | All route groups                        | 18/~23 covered (up from 13)                                                  | ✅     |

## Service Connection Matrix

| Service                   | Status            | Health Checked          | Notes                                            |
| ------------------------- | ----------------- | ----------------------- | ------------------------------------------------ |
| Supabase                  | ✅ Connected      | Yes (basic + deep)      | Clerk Third-Party Auth, RLS                      |
| Clerk                     | ✅ Connected      | Yes (deep)              | Domain restriction, svix webhooks                |
| ERPNext                   | ✅ Connected      | Yes (deep, 12s timeout) | Circuit breaker, mock fallback                   |
| QStash                    | ✅ Connected      | Yes (deep)              | Signature verification, in-memory dev fallback   |
| Upstash Redis             | ✅ Connected      | Yes (deep)              | Fail-open rate limiting                          |
| Sentry                    | ✅ Connected      | No                      | Client + server + edge, auto-reported via logger |
| Resend                    | ✅ Connected      | No                      | Graceful failure if key missing                  |
| Microsoft Graph           | ✅ Connected      | No                      | Clerk OAuth token                                |
| BoldSign                  | ✅ Connected      | No                      | Webhook signature verification                   |
| AI Providers              | ✅ Connected      | No                      | Direct API keys (Google, Anthropic)              |
| **Vercel Analytics**      | ✅ **FIXED**      | N/A                     | Installed this session                           |
| **Vercel Speed Insights** | ✅ **FIXED**      | N/A                     | Installed this session                           |
| BetterStack               | ⚠️ Account exists | ⚠️ Monitors pending     | User to configure manually                       |

## RBAC Enforcement

| Layer                  | Mechanism                                      | Status                    |
| ---------------------- | ---------------------------------------------- | ------------------------- |
| Proxy                  | `clerkMiddleware` + `auth.protect()`           | ✅ All non-public routes  |
| API routes (general)   | `auth()` → userId check                        | ✅ 344 routes             |
| API routes (executive) | `getKrewpactRoles()` + EXECUTIVE_ROLES         | ✅ Role-enforced          |
| API routes (finance)   | `requireRole(FINANCE_ROLES)`                   | ✅ **FIXED this session** |
| API routes (admin)     | `getKrewpactRoles()` on audit-log, sync/status | ✅ Partial (2/3 routes)   |
| Supabase RLS           | `auth.jwt() ->> 'krewpact_user_id'`            | ✅ All tables             |
| Client nav             | `useUserRBAC()` — legacy fallback removed      | ✅ **FIXED this session** |
| Feature gates          | `isFeatureEnabled()`                           | ✅ 17 flags               |
| Cron routes            | CRON_SECRET or QStash signature                | ✅ 14 endpoints           |
| Webhooks               | svix, BoldSign SDK, ERPNext secret             | ✅ 4 handlers             |

**Clerk user audit:** 3/3 users fully migrated to `role_keys`. Zero legacy `role` users found.

## Prior Audit Issues — Status

| #   | Issue (Mar 23)                         | Status      | Evidence                                                                    |
| --- | -------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| 1   | 4 cron jobs missing tests              | ✅ FIXED    | `icp-refresh`, `portal-reminders`, `scoring`, `summarize` tests added       |
| 2   | Clerk webhook missing test             | ✅ FIXED    | `__tests__/api/webhooks/clerk.test.ts` — 11 tests                           |
| 3   | Payment entry mapper — no sync handler | ✅ RESOLVED | Mapper IS used by `sync-invoices.ts` — not orphaned                         |
| 4   | Queue processor complexity 27          | ✅ RESOLVED | Already refactored in prior commit (complexity ~5)                          |
| 5   | Vercel Analytics not installed         | ✅ FIXED    | `<Analytics />` + `<SpeedInsights />` in `app/layout.tsx`                   |
| 6   | Env schema too permissive              | ✅ FIXED    | `superRefine` enforces production-required vars                             |
| 7   | Missing error boundaries               | ✅ FIXED    | +5 error.tsx files (inventory, expenses, timesheets, team, notifications)   |
| 8   | Missing loading states                 | ✅ FIXED    | +5 loading.tsx files (expenses, timesheets, team, notifications, executive) |
| 9   | Finance routes no RBAC                 | ✅ FIXED    | `requireRole(FINANCE_ROLES)` on all 4 routes                                |
| 10  | Legacy RBAC fallback                   | ✅ FIXED    | Removed — all users confirmed migrated                                      |

## Remaining Issues

### Medium Priority

1. **BetterStack monitors not configured** — account exists, user to set up 2 monitors:
   - `GET https://krewpact.ca/api/health` (1min)
   - `GET https://krewpact.ca/api/health?deep=true` (5min)

2. **Sentry not in deep health check** — if DSN is wrong, errors silently disappear

3. **No Server Action tests** — Server Actions are public HTTP endpoints without dedicated tests

4. **Portal routes lack role assertion** — external users (client*owner, trade_partner*\*) could theoretically access internal routes

5. **Division filtering inconsistent** — some routes filter by division_ids, others don't

### Low Priority

6. Session replay rate is 0% (only on-error)
7. No coverage upload to CI (Codecov)
8. E2E runs chromium only in CI
9. No mobile/PWA test runner
10. Lint warnings: 227 (all in scripts — not blocking)

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
Lint:       0 errors, 227 warnings (scripts only)
Types:      0 errors
Tests:      4,351/4,351 passing (384 files, 35s)
Build:      Clean (Next.js 16.2.1)
```

## Next Steps

1. **Configure BetterStack monitors** (manual — browser required)
2. **Add Sentry to deep health check** — verify DSN connectivity
3. **Add role assertion to portal routes** — prevent internal-route access by external users
4. **Audit division filtering** — ensure consistent multi-division access control
5. **Enable next feature flags** — portals and executive are code-complete, need UAT
