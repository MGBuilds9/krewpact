# KrewPact Production Readiness Audit — April 4, 2026

**Auditor:** Claude (automated)
**Focus:** Production readiness — what's real, what's scaffolding, how to verify
**Previous audit:** 2026-04-03 (blueprint alignment 93/100)

---

## Executive Summary

**Blueprint Alignment Score:** 93/100 (unchanged)
**Production Readiness Score:** 78/100 (up from initial 72 after fixes applied this session)
**Tests:** 5,310 / 5,310 passing (500 files + 1 skipped integration file)
**TypeScript Errors:** 0
**Lint Errors:** 0 (22 warnings, unchanged)

Key insight: Blueprint alignment (93) measures "did we build what we planned." Production readiness (78) measures "will it survive real users." The gap represents untested data isolation, soft E2E assertions, and monitoring gaps.

---

## What's Genuinely Production-Ready

| Area                        | Evidence                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Auth (Clerk + Supabase RLS) | `proxy.ts` uses `clerkMiddleware` with `auth.protect()` globally. `createUserClientSafe()` passes Clerk JWT to Supabase.    |
| API Routes (373)            | All spot-checked routes perform real Supabase queries, Zod validation, auth guards via `withApiRoute()`.                    |
| ERPNext Client              | `lib/erp/client.ts` — token auth, circuit breaker, retry with exponential backoff, Sentry alerts. 20+ sync handlers.        |
| Webhooks                    | Clerk svix signature verification, BoldSign, Takeoff webhooks.                                                              |
| Queue/Background Jobs       | QStash with signature verification, in-memory fallback for dev.                                                             |
| Email                       | Resend (transactional) + Microsoft Graph (user mailbox). Both log to Supabase.                                              |
| CI/CD                       | Full pipeline: lint → typecheck → format → test → build → E2E → security audit → post-deploy health check → Sentry release. |
| Health Checks               | Deep health: Supabase, Redis, Clerk, ERPNext, QStash, Sentry, cron history. Returns 503 on failure.                         |
| Security Headers            | CSP, HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy in `next.config.ts`.                                   |
| Rate Limiting               | `@upstash/ratelimit` on 20+ routes. Fails open when Redis down.                                                             |
| Error Boundaries            | 49 `error.tsx` + `global-error.tsx` with `Sentry.captureException`.                                                         |
| Env Validation              | `lib/env.ts` Zod schema validates 50+ vars at startup.                                                                      |
| Sentry                      | Client + edge + **server** (added this session).                                                                            |
| Feature Flag Gates          | Navigation + **layout-level** enforcement (added this session).                                                             |

## Fixes Applied This Session

1. **`sentry.server.config.ts`** — Created server-side Sentry initialization (matching client/edge patterns)
2. **`FeatureGate` component** — `components/shared/FeatureGate.tsx` checks org feature flags with admin bypass
3. **Layout-level feature gates** — Added to 10 flagged route layouts (CRM, estimates, projects, inventory, finance, executive, reports, payroll, schedule, documents). Direct URL access now gated.
4. **RLS integration test infrastructure** — `__tests__/integration/rls-policies.test.ts` with 8 tests for cross-tenant isolation (runs against Supabase local)
5. **FeatureGate unit tests** — 6 tests covering all states

## Corrected Audit Findings

| Initial Finding                                 | Correction                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| "No middleware.ts — no global route protection" | WRONG. `proxy.ts` IS the Next.js 16 middleware. Uses `clerkMiddleware` with `auth.protect()` for all non-public routes. |
| "Feature flags not enforced"                    | Was true for direct URL access. **Fixed this session** — 10 layouts now wrapped with `FeatureGate`.                     |
| "No sentry.server.config.ts"                    | Was true. **Fixed this session**.                                                                                       |

## Remaining Gaps

### Critical

| Gap                                    | Impact                                | Recommendation                                                                                               |
| -------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Test suite mocks all Supabase queries  | Query bugs and RLS leaks undetectable | Run RLS integration tests with `supabase start`: `SUPABASE_LOCAL=true npx vitest run __tests__/integration/` |
| E2E tests have escape-hatch assertions | Broken pages pass if they redirect    | Remove `\|\| hasEmpty \|\| url.includes(...)` patterns, add specific data assertions                         |

### Medium

| Gap                                 | Impact                                   | Recommendation                         |
| ----------------------------------- | ---------------------------------------- | -------------------------------------- |
| No load testing                     | Unknown behavior at 300 concurrent users | k6 load test against staging           |
| BetterStack token not wired in code | Uptime monitoring is external-only       | Wire monitors via BetterStack REST API |
| No Sentry alert rules               | Errors may go unnoticed                  | Add error rate and latency alerts      |

### Low

| Gap                         | Impact                          | Recommendation                                      |
| --------------------------- | ------------------------------- | --------------------------------------------------- |
| Web manifest not committed  | PWA installability unverified   | Check if Serwist generates it at build time         |
| No staging Supabase project | Testing against production data | Create separate Supabase project for staging branch |

## Test Assessment

**5,310 tests — honest breakdown:**

- **High value (~15-20 files):** Pure logic tests (ERP mappers, lead scoring, formatters) — real behavior, no mocks
- **Medium value (~400 files):** Route handler tests — verify auth (401), validation (400), error propagation (500). Supabase is fully mocked, so query correctness untested.
- **Low value (~60 files):** Component render tests — verify rendering without crashes. Don't test business logic.
- **E2E (26 specs):** Smoke tests with soft assertions. Better than nothing, but won't catch regressions.
- **RLS integration (1 file, 8 tests):** NEW — real Postgres, real RLS policies. Requires `supabase start`.

## Recommended Tool Stack

| Category        | Tool                  | Status                  | Action                                                |
| --------------- | --------------------- | ----------------------- | ----------------------------------------------------- |
| Uptime          | BetterStack           | Token exists, not wired | Wire monitors to `/api/health`                        |
| Synthetic       | Checkly               | Not configured          | Set up 5 browser checks (free tier)                   |
| Error Tracking  | Sentry                | Client + edge + server  | Add alert rules                                       |
| Load Testing    | k6 (free)             | Not done                | Write 5-10 scenarios                                  |
| Security        | OWASP ZAP (free)      | Not done                | Scan staging before launch                            |
| Dependencies    | Snyk (free tier)      | Not configured          | Add to GitHub repo                                    |
| Performance     | Vercel Speed Insights | Configured              | Already active                                        |
| Cron Monitoring | Sentry Crons          | Partial                 | Add check-in calls to 15 cron endpoints               |
| RLS Testing     | Supabase CLI local    | Infrastructure ready    | Run `supabase start` + `SUPABASE_LOCAL=true npm test` |

## Metrics

| Metric                | Apr 3             | Apr 4       | Delta                              |
| --------------------- | ----------------- | ----------- | ---------------------------------- |
| Pages                 | 129               | 129         | 0                                  |
| API Routes            | 373               | 373         | 0                                  |
| Test Files            | 499               | 501         | +2 (FeatureGate + RLS integration) |
| Tests Passing         | 5,304             | 5,310       | +6                                 |
| Tests Skipped         | 0                 | 8           | +8 (RLS — need Supabase local)     |
| TS Errors             | 0                 | 0           | 0                                  |
| ESLint Warnings       | 22                | 22          | 0                                  |
| Feature-Gated Layouts | 0                 | 10          | +10                                |
| Sentry Configs        | 2 (client + edge) | 3 (+server) | +1                                 |
