# KrewPact Blueprint Audit — 2026-02-25

## Executive Summary

**Alignment Score:** 72/100
**Critical Issues:** 3
**Architecture Drift:**
- File structure uses flat layout (`app/`, `lib/`, `components/`) instead of blueprint's `src/` prefix — intentional, well-organized
- Estimating, Contracting, and Project Execution features are stubbed/partial but not fully built (P0 Weeks 7-12 scope)
- Missing BullMQ/Upstash queue infrastructure — no worker system implemented yet

---

## Blueprint vs Implementation Table

### Phase 0: Foundation (Weeks 1-2) — COMPLETE

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| Auth/Identity | Clerk email + M365 SSO, JWT → Supabase RLS | Clerk 6.38.1 installed, `middleware.ts` with JWT bridge, domain restriction (`mdmgroupinc.ca`, `mdmcontracting.ca`) | ✅ | - | None |
| RBAC | 9 internal + 4 external roles, deny-by-default RLS | `00001_foundation.sql` has 13 roles, `00002_rls_policies.sql` + `00004_crm_rls_policies.sql` | ✅ | - | None |
| Division isolation | Multi-tenant via JWT claims | `DivisionContext.tsx`, RLS policies use `krewpact_divisions` | ✅ | - | None |
| Supabase schema | 28 enums, 19+ table groups | 6 migrations, 28 enums, 16+ core tables confirmed | ✅ | - | None |
| ERPNext client | `lib/erp/client.ts` with token auth | `lib/erp/client.ts` + `sync-service.ts` + `opportunity-mapper.ts` + `sales-order-mapper.ts` + `mock-responses.ts` | ✅ | - | None |
| App shell | Next.js App Router, layout, BFF pattern | Next.js 15 with 33 dashboard pages, 92 API routes, layout components | ✅ | - | None |
| CI/CD | GitHub Actions: lint → typecheck → test → build → deploy | `.github/` directory exists | ⚠️ | L | Verify pipeline runs |
| Demo mode | Not in blueprint | `demo-mode.ts`, `clerk-demo-client.tsx`, `clerk-demo-server.ts` | 🔄 | L | Document in blueprint |

### Phase 1: CRM + Estimating (Weeks 3-6) — MOSTLY COMPLETE

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| Lead management | CRUD, scoring, qualification | 18 CRM components, `/api/crm/leads`, scoring engine, lead stages | ✅ | - | None |
| Accounts & contacts | CRUD with division filtering | `/api/crm/accounts`, `/api/crm/contacts`, dedicated pages | ✅ | - | None |
| Opportunities | Stage pipeline, won/lost flow | Opportunity board, stage history, `/api/crm/opportunities` | ✅ | - | None |
| Lead scoring | Configurable fit/intent/engagement rules | `scoring-engine.ts`, `scoring-rules` API, `lead_scoring_rules` table | ✅ | - | None |
| Outreach sequences | Multi-step automation | `sequence-processor.ts`, `sequences` API, sequence enrollment | ✅ | - | None |
| Email templates | Merge fields, categories | `email-templates` API, `template-renderer.ts` | ✅ | - | None |
| Enrichment pipeline | Apollo → Clearbit → LinkedIn → Google waterfall | `apollo.ts`, `enrichment.ts`, `/api/cron/apollo-pump`, `/api/cron/enrichment` | ✅ | - | None |
| Activity logging | Calls, emails, meetings | `/api/crm/activities`, activity timeline component | ✅ | - | None |
| ERPNext sync (CRM) | Customer, Contact, Opportunity, Quotation | `erp/sync-service.ts`, `/api/erp/sync/customers`, `/api/erp/sync/opportunities` | ✅ | - | None |
| Estimate builder | Quantity x rate, assemblies, templates | `/api/estimates/`, estimate pages, `validators/estimating.ts`, 3 test files | ⚠️ | M | Verify depth — only 3 test files vs 25 for CRM |
| Cost catalog | Labor, materials, equipment, subcontractors | Not confirmed as standalone feature | ⚠️ | M | Verify or implement |
| Proposal generation | PDF output, terms & conditions | `proposal-generator.ts`, `/api/estimates/convert-to-proposal` | ⚠️ | M | Verify PDF generation |

### Phase 2: Contracting + Projects (Weeks 7-9) — PARTIAL

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| Contract templates | Template management | No dedicated contracting routes found | ❌ | H | Implement (Week 7 scope) |
| BoldSign e-sign | Signer flow, audit trail, webhook | `/api/webhooks/boldsign` exists but BoldSign not in dependencies | ❌ | H | Implement when ready |
| Project creation | From Sales Order, team, milestones, budget | `/api/projects/`, project pages with overview/members/milestones/documents/tasks | ✅ | - | None |
| Team assignment | Roles per member | `useProjectMembers.ts`, `/api/projects/{id}/members` | ✅ | - | None |
| Milestones | Schedule gates | `/api/projects/{id}/milestones`, milestone tracker component | ✅ | - | None |
| ERPNext sync (Projects) | Project, Task | `/api/erp/sync/projects` confirmed | ✅ | - | None |

### Phase 3: Execution + Go-Live (Weeks 10-12) — PARTIAL

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| Daily logs | Weather, crew, equipment, activities | Project daily log pages exist | ⚠️ | M | Verify completeness |
| Task management | Assignment, tracking | `/api/tasks/`, task pages, `useTasks.ts` | ✅ | - | None |
| Document upload | Photos, specs, shop drawings | `/api/projects/{id}/documents`, document pages | ⚠️ | M | Verify Supabase Storage integration |
| RFIs | Create & response workflow | Not found in routes | ❌ | H | Implement (Week 10 scope) |
| Submittals | Tracking workflow | Not found in routes | ❌ | M | Implement (Week 10 scope) |
| Change orders | Request & approval | Not found in routes | ❌ | M | Implement (Week 10 scope) |
| Time entry | Entry & approval, link to payroll | Not found in dedicated routes | ❌ | M | Implement (Week 10 scope) |
| Executive dashboard | Pipeline, projects, financials | Dashboard pages exist with metrics widgets, pipeline, reports | ✅ | - | None |
| Expenses | CRUD with project linking | `/api/expenses/`, expense pages, `useExpenses.ts`, `useProjectExpenses.ts` | 🔄 | L | Not in P0 blueprint — document |

### Infrastructure & Integration

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| BullMQ + Upstash Redis | Queue for async sync, workers on ERPNext host | No BullMQ in dependencies, no `lib/queue/` directory | ❌ | H | Implement queue infrastructure |
| Resend email | Transactional email | `lib/email/resend.ts` exists | ✅ | - | None |
| Microsoft Graph | Deferred to P2 | `lib/microsoft/graph.ts` + calendar/email hooks exist | 🔄 | L | Ahead of schedule — document |
| pgvector/RAG | Knowledge embeddings, AI chat | `00004_knowledge_vector.sql`, OpenAI in dependencies | ✅ | - | None |
| Impersonation | Not in blueprint | `ImpersonationContext.tsx` exists | 🔄 | L | Document in blueprint |
| Cron jobs | Not explicitly in blueprint | `/api/cron/apollo-pump`, `/enrichment`, `/sequence-processor`, `/sync` | 🔄 | L | Document in blueprint |

---

## Code Health

### Lint Results
- **Errors:** 0
- **Warnings:** 35 (unused variables in demo mode stubs, refactoring artifacts)
- **Pattern:** Demo mode files (`clerk-demo-*.ts`) account for majority of warnings

### TypeScript
- **Errors:** 0 — clean compilation

### Tests
- **904/904 passing** across 87 test files (9.39s)
- **0 failures**
- **Coverage distribution:** CRM heavily tested (25 API + 18 component + 7 lib = 50 files), Estimating light (5 files), Projects moderate (6 pages + integration tests)

---

## Status Summary

| Status | Count | Details |
|--------|-------|---------|
| ✅ Compliant | 22 | Foundation, RBAC, CRM pipeline, scoring, sequences, enrichment, ERPNext sync, project CRUD, dashboard |
| ⚠️ Drift | 5 | Estimating depth, cost catalog, proposal PDF, daily logs, document storage |
| ❌ Missing | 7 | Contracting/e-sign, RFIs, submittals, change orders, time entry, BullMQ queue |
| 🔄 Extra | 5 | Demo mode, Microsoft Graph (early), expenses, impersonation, cron jobs |

---

## Action List

### Immediate (blocking for MVP)
- [ ] **BullMQ + Upstash Redis queue** — No queue infrastructure exists. ERPNext sync currently runs inline (no retry/dead-letter). This is the most critical gap.
- [ ] **Contracting module** — No contract template management or BoldSign integration. Needed for Week 7+ scope.
- [ ] **RFI workflow** — Not implemented. Required for project execution phase.

### Short-term (tech debt)
- [ ] **Estimating depth** — Only 3 test files vs 50 for CRM. Verify cost catalog, assembly builder, and estimate versioning are fully functional.
- [ ] **Submittal tracking** — Not found in routes. Needed for execution phase.
- [ ] **Change order workflow** — Not found in routes. Needed for execution phase.
- [ ] **Time entry & approval** — Not found. Needed for Timesheet ERPNext mapping.
- [ ] **Fix 35 lint warnings** — Mostly demo mode stubs. Clean up unused variables.

### Documentation (blueprint updates)
- [ ] Update blueprint file structure: `app/` not `src/app/` (flat layout)
- [ ] Add demo mode system to blueprint (Clerk bypass, anon RLS)
- [ ] Add Microsoft Graph integration to blueprint (implemented ahead of P2)
- [ ] Add impersonation context to blueprint
- [ ] Add cron job endpoints to blueprint (apollo-pump, enrichment, sequence-processor, sync)
- [ ] Add expense management to blueprint (implemented but not in P0 scope)
- [ ] Document that Next.js 16.1.6 is used (blueprint says 15)

---

## Architecture Observations

### Strengths
1. **CRM is production-grade** — 8-phase lead lifecycle, scoring engine, sequence processor, enrichment pipeline, ERPNext sync. 50+ test files. This exceeds blueprint expectations.
2. **RLS is comprehensive** — 4 migration files dedicated to security policies. Deny-by-default confirmed.
3. **Type safety is clean** — 0 TypeScript errors, Zod validators for CRM/calendar/estimating/email.
4. **Test discipline is strong** — 904 tests, 87 files, 9.4s runtime. Good test-to-code ratio.

### Concerns
1. **Queue infrastructure gap** — Without BullMQ/Upstash, ERPNext sync has no retry, backoff, or dead-letter. This is a P0 requirement for production reliability.
2. **Estimating is shallow** — CRM has 10x the test coverage. Estimate builder may be more UI stub than functional.
3. **Execution features missing** — RFIs, submittals, change orders, time entry are all Week 10-12 scope and haven't started.
4. **Version drift** — `package.json` shows Next.js 16.1.6 but blueprint specifies 15. React 19.2.4 vs expected 18/19.

---

## Recommended Next Steps

> Audit complete. Recommended actions:
> 1. **Fix critical gap: BullMQ queue** — Implement `lib/queue/` with Upstash Redis connection, job definitions, retry policies, and dead-letter handling
> 2. **Deepen estimating** — Verify cost catalog CRUD, assembly builder, estimate versioning are fully functional with tests
> 3. **Plan Weeks 7-12** — Use `writing-plans` skill to plan contracting, e-sign, RFIs, submittals, change orders, time entry
> 4. **Update blueprint** — Sync documentation with reality (demo mode, Microsoft Graph, expenses, cron jobs, file structure)
> 5. **Clean lint warnings** — 35 warnings from demo mode stubs
