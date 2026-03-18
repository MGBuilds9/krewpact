# Blueprint Audit — 2026-03-17

## Executive Summary

**Alignment Score:** 91/100
**Critical Issues:** 1 (JWT template ambiguity)
**Architecture Drift:**

- Queue system evolved from BullMQ workers to QStash serverless (better fit, docs stale)
- JWT claims path may not match RLS policies (needs live verification)
- Implementation far exceeds MVP: 314 routes vs 40 planned, 80+ features vs 25 planned

## Numbers

| Metric                | Blueprint | Actual                        |
| --------------------- | --------- | ----------------------------- |
| API routes            | ~40       | 314                           |
| Features              | 25        | 80+                           |
| Forms/components      | 30        | 95                            |
| ERPNext mappers       | 12        | 13 (+payment-entry)           |
| Pages                 | -         | 100 (94 dashboard + 6 portal) |
| Migrations            | -         | 54                            |
| RLS policies          | -         | 501                           |
| Tests                 | -         | 3,871                         |
| Cron jobs             | -         | 14                            |
| External integrations | 5 (MVP)   | 14                            |
| Sync handlers         | -         | 11                            |

## Core Architecture

| Area           | Blueprint                              | Actual                                          | Status   |
| -------------- | -------------------------------------- | ----------------------------------------------- | -------- |
| Auth           | Clerk + JWT → Supabase RLS             | Clerk with dual-name claim fallbacks            | ⚠️ HIGH  |
| Database       | Supabase PostgreSQL + RLS              | 139 tables, 501 policies                        | ✅       |
| ERPNext        | 12 mappers, eventual consistency       | 13 mappers, circuit breaker, retry + DLQ        | ✅       |
| Queue          | BullMQ + Redis workers on ERPNext host | QStash serverless + in-memory dev               | ⚠️ DRIFT |
| Rate limiting  | Upstash Redis                          | Upstash Redis with circuit breaker fail-open    | ✅       |
| RBAC           | 9 internal + 4 external roles          | Exact match, 25 permissions, 12 domains         | ✅       |
| Proxy          | Auth + org routing                     | Public routes, domain restriction, org redirect | ✅       |
| Error handling | Structured responses                   | ApiError class + 11 error boundaries            | ✅       |
| Env validation | Zod schema                             | Required vs optional with prod warnings         | ✅       |

## Feature Domains

| Domain       | Routes | Pages | Status                                               |
| ------------ | ------ | ----- | ---------------------------------------------------- |
| CRM          | 87     | 30    | ✅ Exceeds (includes Sales AGI)                      |
| Estimating   | 16     | 5     | ✅ Complete                                          |
| Projects     | 63     | 15    | ✅ Exceeds (includes P2: safety, warranty, closeout) |
| Contracting  | 7      | 1     | ✅ Complete                                          |
| Finance      | 12     | 4     | ✅ Complete                                          |
| Portals      | 21     | 6     | ✅ Exceeds (client + trade)                          |
| Executive    | 15     | 4     | ✅ Exceeds (RAG, knowledge, staging)                 |
| AI           | 9      | 0     | ✅ Exceeds (8 agents, Gemini, killswitch)            |
| Admin/System | 30+    | 12    | ✅ Exceeds (14 crons, privacy, BCP, governance)      |

## Integration Inventory

| Service      | Client | Env Var | Error Handling     | Tests              |
| ------------ | ------ | ------- | ------------------ | ------------------ |
| Clerk        | ✅     | ✅      | ✅                 | ⚠️ No webhook test |
| Supabase     | ✅     | ✅      | ✅                 | ✅                 |
| ERPNext      | ✅     | ✅      | ✅ Circuit breaker | ✅                 |
| Resend       | ✅     | ✅      | ✅                 | ✅                 |
| BoldSign     | ✅     | ✅      | ✅                 | ✅                 |
| Redis        | ✅     | ✅      | ✅ Fail-open       | ✅                 |
| QStash       | ✅     | ✅      | ✅                 | ✅                 |
| Apollo       | ✅     | ✅      | ✅                 | ✅                 |
| Brave        | ✅     | ✅      | ✅                 | ✅                 |
| Google Maps  | ✅     | ✅      | ✅                 | ✅                 |
| Tavily       | ✅     | ✅      | ✅                 | ✅                 |
| Sentry       | ✅     | ✅      | N/A                | ✅                 |
| PDF gen      | ✅     | N/A     | ✅                 | ✅                 |
| pgvector/RAG | ✅     | ✅      | ✅                 | ✅                 |

## Issues to Address

### Immediate (HIGH)

1. **JWT template vs session token ambiguity** — `lib/supabase/server.ts` uses raw Clerk session tokens, not the custom JWT template. RLS policies reference `auth.jwt() ->> 'krewpact_user_id'`. If these don't match at runtime, RLS will deny all queries. **Needs live verification.**

2. **Dual-name claim fallback** — `lib/api/org.ts` checks both `role_keys` and `krewpact_roles`, `division_ids` and `krewpact_divisions`. Standardize on one naming convention.

### Short-term (MEDIUM)

3. **Update CLAUDE.md** — Queue section still says "BullMQ + Upstash Redis workers co-located on ERPNext host." Actual is QStash serverless.

4. **4 cron jobs missing tests** — `icp-refresh`, `portal-reminders`, `scoring`, `summarize`

5. **Clerk webhook missing test** — Only `boldsign` and `erpnext` webhook handlers have tests.

6. **Payment entry mapper has no sync handler** — Mapper exists but no `sync-payment-entry.ts` to trigger it.

### Documentation (blueprint updates)

7. Update route/feature counts in Architecture Resolution doc
8. Document Sales AGI layer in architecture docs (partially done in WS15)
9. Document circuit breaker pattern on ERPNext client
10. Document rate limiter fail-open pattern

## Go-Live Work Streams (updated)

15/16 work streams completed this session. WS16 (UAT) done as code walkthrough — found and fixed `won_at`/`won_notes` schema gap. Live UAT with real data still needed.
