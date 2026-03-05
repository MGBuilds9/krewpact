# KrewPact Execution Plan

**Created:** 2026-03-04
**Status:** ACTIVE
**Audience:** Every agent (human or AI) that touches this codebase

---

## Part 1: The Soul of KrewPact

Read this section first. Every line of code you write, every API you design, every test you add should serve these truths. If your work doesn't align with these principles, stop and reconsider.

### What KrewPact Is

KrewPact is the **command center** for MDM Group's construction operations. It is the single place where projects are won, estimated, contracted, executed, and closed out. It replaces a graveyard of spreadsheets, Sage legacy systems, email chains, and paper processes with one unified platform.

It is NOT a generic SaaS product (yet). It is NOT a toy. It is a production system for 300+ employees running $2M-$50M construction projects. Every feature must work under the pressure of a field supervisor with muddy hands on a tablet, an estimator racing a bid deadline, or an executive who needs a revenue number in 10 seconds.

### What KrewPact Is NOT

- **Not a replacement for ERPNext.** ERPNext owns money. KrewPact owns everything else: projects, people, documents, decisions, workflows, portals. When money moves, KrewPact tells ERPNext what happened. When ERPNext posts an invoice, KrewPact shows the status. Neither system tries to be the other.
- **Not a demo app.** The code today has mocked integrations and in-memory queues. That was fine for proving architecture. The next phase wires real services. Every "mock" you encounter is a debt that must be paid.
- **Not a monolith.** It's a Next.js app with clear domain boundaries. Respect them. CRM code doesn't import from Estimating. Projects don't know about Procurement internals. The `lib/` directory is the service layer; `app/api/` is the BFF; `components/` is the UI. Cross-cutting concerns go in `lib/` or `types/`.

### The Five Commandments

1. **ERPNext is the financial source of truth.** Never store authoritative financial data in Supabase. Mirror it, snapshot it, display it — but ERPNext is the ledger. If there's a conflict between KrewPact and ERPNext on a dollar amount, ERPNext wins.

2. **Audit everything, lose nothing.** Every mutation to every record gets an audit trail entry. Who changed it, when, what the previous value was, why. This isn't optional — it's the foundation that makes the system legally defensible for construction disputes. The `audit_logs` table exists. Use it.

3. **Division-scoped by default.** MDM Group has 6 divisions. Every query, every RLS policy, every UI filter must respect division boundaries. A user in MDM Contracting should never accidentally see MDM Homes data. The JWT carries `krewpact_divisions` as a claim. RLS enforces it. No exceptions.

4. **Offline tolerance, online requirement (MVP).** For MVP, the app is online-only. But design data flows so that offline-first (P2) doesn't require a rewrite. This means: forms should capture complete state locally before submitting, APIs should be idempotent, and sync should be eventual-consistency-safe.

5. **Canadian-first.** CAD currency. GST/HST/PST tax handling. Ontario Construction Act awareness. PIPEDA privacy compliance. AODA/WCAG accessibility. Dates in `America/Toronto` timezone by default. This isn't a US app adapted for Canada — it's a Canadian app from the ground up.

### Data Authority Map

```
ERPNext OWNS (never duplicate):          KrewPact OWNS (never defer):
- General Ledger                          - Lead/opportunity lifecycle
- Invoices (AR/AP)                        - Estimate versions & line items
- Payments                                - Proposals & e-sign workflow
- Purchase Orders                         - Project execution (tasks, logs, RFIs)
- Inventory                               - User identity & RBAC
- Supplier master (financial)             - Portal interactions
- Customer master (financial)             - Audit trails
                                          - File/document management
                                          - Safety & compliance forms
                                          - Workflow approvals (CO, RFI, submittal)

SHARED (sync via erp_sync_map):
- Customer ↔ Account
- Quotation ← Estimate
- Sales Order ← Contract
- Project ↔ Project
- Task → Task (optional mirror)
- Expense Claim ← Expense
- Timesheet ← Time entries
- Sales Invoice → invoice_snapshots (read)
- Purchase Invoice → po_snapshots (read)
- Job costs → job_cost_snapshots (derived)
```

### The Sync Contract

All ERPNext sync follows one pattern:

```
KrewPact writes to Supabase
  → enqueues sync job (queue)
    → worker reads outbox, calls ERPNext API
      → success: update erp_sync_map with erp_name
      → failure: retry with exponential backoff (1s → 4s → 16s)
        → max retries exceeded: dead_letter status
          → manual review interface
```

- **Idempotency keys** on every write. Same key = same result.
- **erp_sync_map** is the bridge table. It stores `hub_entity_type`, `hub_entity_id`, `erp_doctype`, `erp_name`.
- **ERPNext custom fields** prefixed `custom_mdm_*` or `custom_krewpact_*` store the back-reference.
- **Conflict resolution:** ERPNext wins on financial values. KrewPact wins on workflow state.

---

## Part 2: Current State (as of 2026-03-04)

### What's Built

| Layer | Count | State |
|-------|-------|-------|
| TypeScript files | 832 | Compiles clean (0 type errors) |
| API route groups | 40+ | All P0 + most P1/P2 scaffolded |
| Component modules | 22 | UI for all major domains |
| Supabase migrations | 34 | Full schema deployed |
| Unit/integration tests | 2,061 (168 files) | All passing |
| E2E tests | 8 specs | Auth, CRM, estimates, projects, finance, admin |
| Lint | 0 errors, 210 warnings | All warnings are `no-console` |
| ERPNext mappers | 9/12 MVP | Missing: Customer, Quotation, SalesInvoice |

### What's Mocked / Stubbed

These work in tests but aren't wired to real services:

| Service | File | Current State | What's Needed |
|---------|------|---------------|---------------|
| Queue | `lib/queue/client.ts` | In-memory Map | Wire to Upstash Redis or BullMQ |
| Email | `lib/email/resend.ts` | Uses `fetch()` to Resend API | Works but `resend` npm package not installed (uses raw fetch — actually functional if API key is set) |
| ERPNext | `lib/erp/client.ts` | Mock mode when no URL | Needs real ERPNext instance + Cloudflare Tunnel |
| E-sign | `app/api/esign/` | Schema + validators only | BoldSign SDK integration |
| Error tracking | None | Nothing | Sentry setup needed |
| Uptime monitoring | None | Nothing | BetterStack setup needed |
| Accessibility testing | None | Not in test pipeline | @axe-core/playwright in E2E |

### What's Been Built Ahead of Schedule

P1/P2 features that already have API routes + UI but need polish and real integration:
- Client Portal, Trade Portal
- Change Orders, RFIs, Submittals
- Safety Module (forms, incidents, toolbox talks, inspections)
- Procurement (RFQs, bids, leveling)
- Closeout & Warranty (packages, deficiencies, service calls)
- Selections & Allowances
- Finance (invoice/PO/job-cost snapshots)
- Time/Expense & Timesheets
- Calendar, Notifications, Reports
- BCP/Incidents, Governance, Migration, Privacy

---

## Part 3: Architecture Rules for Every Agent

### File Structure

```
/ (root — no src/ prefix, standard Next.js)
├── app/
│   ├── (dashboard)/org/[orgSlug]/   # All authenticated internal routes
│   ├── (portal)/client/              # Client portal routes
│   ├── (portal)/trade/               # Trade partner portal routes
│   ├── api/                          # BFF API routes (Next.js Route Handlers)
│   ├── auth/                         # Auth pages
│   └── layout.tsx                    # Root layout
├── components/
│   ├── ui/                           # shadcn/ui primitives (DO NOT MODIFY without good reason)
│   ├── Layout/                       # App shell (sidebar, header, breadcrumbs)
│   └── {Domain}/                     # Feature components (CRM/, Estimates/, Projects/, etc.)
├── lib/
│   ├── api/                          # Server-side API helpers
│   ├── crm/                          # CRM business logic (scoring, sequences, assignment)
│   ├── email/                        # Email sending (Resend)
│   ├── erp/                          # ERPNext client + mappers + sync service
│   ├── estimating/                   # Estimating calculations
│   ├── integrations/                 # Third-party (Apollo, enrichment)
│   ├── queue/                        # Job queue
│   ├── supabase/                     # Supabase clients (browser + server)
│   └── validators/                   # Shared Zod schemas
├── types/
│   └── supabase.ts                   # Generated Supabase types (DO NOT HAND-EDIT)
├── contexts/                         # React contexts
├── hooks/                            # Custom React hooks
├── e2e/                              # Playwright E2E tests
├── __tests__/                        # Vitest unit/integration tests
├── supabase/
│   ├── migrations/                   # SQL migrations (numbered)
│   └── functions/                    # Edge Functions (Deno runtime)
└── docs/                             # Architecture docs, plans, audits
```

### Code Patterns (Mandatory)

**API Routes (app/api/):**
```typescript
// Always: auth check → input validation → business logic → response
// Use Zod schema from lib/validators/
// Return structured JSON: { data } or { error, code }
// Wrap external calls in try/catch
// Log errors with context (entity type, ID, user)
```

**Supabase Queries:**
```typescript
// Server: import { createServerClient } from '@/lib/supabase/server'
// Browser: import { createBrowserClient } from '@/lib/supabase/client'
// ALWAYS use pooler port 6543 from serverless (server.ts handles this)
// ALWAYS use generated types from types/supabase.ts
// NEVER bypass RLS with service role key unless explicitly justified
```

**ERPNext Calls:**
```typescript
// ALWAYS go through lib/erp/client.ts — never call ERPNext directly
// ALWAYS encodeURIComponent() document names
// ALWAYS check isMockMode() and return mock data when no ERPNext configured
// Mappers live in lib/erp/{entity}-mapper.ts
```

**Forms:**
```typescript
// React Hook Form + Zod
// Schema in lib/validators/{domain}.ts
// Same schema validates client-side AND API route server-side
// Use shadcn/ui Form components
```

**Testing:**
```typescript
// Unit tests: __tests__/{domain}/*.test.ts
// Integration tests: __tests__/integration/*.test.ts
// RLS tests: __tests__/rls/*.test.ts
// E2E: e2e/*.spec.ts (Playwright)
// Every API route needs at least: happy path, auth failure, validation failure
// Every RLS policy needs: allowed user, denied user, cross-division isolation
```

### What NOT to Do

- Don't create new top-level directories. The structure is set.
- Don't install packages without justification. Check if `fetch()` works first (like Resend).
- Don't add ORM layers. Supabase client IS the query layer.
- Don't create abstraction layers "for later." Build what's needed now.
- Don't store financial authoritative data in Supabase. Read-only snapshots only.
- Don't write RLS policies that do per-row subqueries. Use JWT claims.
- Don't hardcode division IDs, role keys, or env-specific values.
- Don't skip audit trail writes for any mutation endpoint.

---

## Part 4: Execution Phases

### How to Read This

- **PARALLEL** = These workstreams have no dependencies on each other. Assign to separate agents. Run simultaneously.
- **SEQUENTIAL** = Must complete in order. Output of one feeds into the next.
- **GATE** = Quality checkpoint. All work in the phase must pass the gate before the next phase begins.

---

### Phase A: Infrastructure Wiring (Foundation)
**Mode: SEQUENTIAL — must complete before all other phases**
**Estimated complexity: Medium**

This phase takes the mocked/stubbed infrastructure and wires it to real services. Everything else depends on this.

#### A1: Queue Infrastructure → Real Upstash/Redis
**Priority: CRITICAL**

The in-memory queue (`lib/queue/client.ts`) must be replaced or augmented with a persistent queue.

**Decision needed from Michael:** Upstash QStash (serverless, HTTP-based, works from Vercel) OR Upstash Redis + BullMQ (requires a worker process on ERPNext host).

**Option 1 — Upstash QStash (simpler for MVP):**
- Install `@upstash/qstash`
- Modify `lib/queue/client.ts` to enqueue via QStash HTTP API
- QStash calls back to `/api/cron/{job-type}` endpoints (already exist)
- No worker process needed — Vercel handles execution
- Limitation: No fine-grained job control, no local dev queue

**Option 2 — Upstash Redis + BullMQ (production-grade):**
- Install `bullmq`, `@upstash/redis`, `ioredis`
- Replace in-memory Map with Redis-backed BullMQ queue
- Worker process runs on ERPNext host machine
- Full retry, DLQ, rate limiting, concurrency control
- Requires a long-running process outside Vercel

**Deliverables:**
- [ ] Decide queue strategy (Michael)
- [ ] Install chosen packages
- [ ] Update `lib/queue/client.ts` with real implementation
- [ ] Update `lib/queue/processor.ts` for chosen strategy
- [ ] Verify enqueue → process → status update flow
- [ ] Test retry and dead-letter behavior
- [ ] Update env vars in `.env.local` and Vercel

#### A2: ERPNext Connectivity
**Priority: CRITICAL**

- [ ] Stand up ERPNext instance (Docker or Frappe Cloud)
- [ ] Install `cloudflared` and create tunnel
- [ ] Set `ERPNEXT_BASE_URL` to tunnel URL
- [ ] Create API user in ERPNext with appropriate permissions
- [ ] Set `ERPNEXT_API_KEY` and `ERPNEXT_API_SECRET`
- [ ] Verify `lib/erp/client.ts` connects (health check endpoint)
- [ ] Add ERPNext custom fields (see `KrewPact-ERPNext-Doctype-Field-Mapping.md` §Required Custom Fields)

#### A3: Missing ERPNext Mappers
**Priority: HIGH**
**Can start after A2 is verified**

Build the 3 missing MVP mappers following the pattern in existing mappers (`lib/erp/contact-mapper.ts` etc.):

- [ ] `lib/erp/customer-mapper.ts` — Account ↔ Customer (bidirectional)
- [ ] `lib/erp/quotation-mapper.ts` — Estimate → Quotation (outbound only)
- [ ] `lib/erp/sales-invoice-mapper.ts` — Sales Invoice → invoice_snapshots (inbound read)
- [ ] Register all 3 in `lib/erp/sync-service.ts`
- [ ] Add tests for each mapper (transform logic, edge cases)

#### A4: Observability Setup
**Priority: HIGH**
**PARALLEL with A1-A3**

- [ ] Set up Sentry project for KrewPact
- [ ] Install `@sentry/nextjs` and configure (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`)
- [ ] Add Sentry error boundary to root layout
- [ ] Set up BetterStack uptime monitor for `app.krewpact.com`
- [ ] Add structured logging helper (`lib/logger.ts`) that replaces raw `console.log` — resolve all 210 lint warnings
- [ ] Add `SENTRY_DSN` to env vars

#### A5: Accessibility Pipeline
**Priority: MEDIUM**
**PARALLEL with A1-A4**

- [ ] Install `@axe-core/playwright`
- [ ] Add accessibility checks to existing E2E specs (at minimum: dashboard, CRM leads list, estimate form)
- [ ] Fix any WCAG AA violations found
- [ ] Add a11y check to CI pipeline

---

### GATE A: Infrastructure Verification

Before proceeding to Phase B, verify:
- [ ] Queue: enqueue a job, see it process, see retry on failure, see dead-letter after max retries
- [ ] ERPNext: `ErpClient.get('Company', 'MDM Group')` returns real data
- [ ] Sentry: throw a test error, see it appear in Sentry dashboard
- [ ] All 2,061+ tests still pass
- [ ] Typecheck clean
- [ ] Lint warnings reduced (logger migration)

---

### Phase B: Core Integration Wiring
**Mode: PARALLEL workstreams (B1, B2, B3 are independent)**
**Depends on: Gate A passed**

#### B1: ERPNext Sync — End-to-End
**Priority: CRITICAL**

Wire the full sync flow for MVP entities. This is the spine of the system.

**For each of the 12 MVP mappings, implement and test:**

1. **Outbound sync (KrewPact → ERPNext):**
   - [ ] Account → Customer (create + update)
   - [ ] Contact → Contact (create + update)
   - [ ] Opportunity → Opportunity (create)
   - [ ] Estimate (approved) → Quotation (create)
   - [ ] Contract (signed) → Sales Order (create)
   - [ ] Project → Project (create + status sync)
   - [ ] Task → Task (optional mirror)
   - [ ] Expense → Expense Claim (create)
   - [ ] Timesheet batch → Timesheet (create)

2. **Inbound sync (ERPNext → KrewPact):**
   - [ ] Sales Invoice → invoice_snapshots (periodic pull or webhook)
   - [ ] Purchase Invoice → po_snapshots (periodic pull)
   - [ ] Job cost data → job_cost_snapshots (derived from Project + GL)

3. **Sync infrastructure:**
   - [ ] Webhook receiver for ERPNext events (`app/api/webhooks/erpnext/`)
   - [ ] Periodic sync cron for snapshot tables (`app/api/cron/erp-sync/`)
   - [ ] DLQ review UI in admin panel
   - [ ] Sync status dashboard (last sync time, failure count, queue depth)

**Tests required:**
- [ ] Each mapper: unit tests for field transforms
- [ ] Sync service: integration test for full create → verify → update cycle
- [ ] Error handling: test retry behavior, dead-letter transition
- [ ] Idempotency: same request twice produces same result

#### B2: Email & Notifications — Real Wiring
**Priority: HIGH**

The email infrastructure (`lib/email/resend.ts`) uses raw `fetch()` to Resend's API — this actually works without the `resend` npm package. But the notification system needs completion.

- [ ] Verify Resend API key is set and sending works (test email to Michael)
- [ ] Set up Resend domain verification for `updates.mdmgroupinc.ca`
- [ ] Wire notification preferences (`app/api/notifications/preferences/`) to actually send emails
- [ ] Implement notification triggers for critical events:
  - Lead assigned → email to assignee
  - Estimate approved → email to opportunity owner
  - Contract signed → email to PM + accounting
  - Task overdue → email to assignee + PM
  - Daily log submitted → email to PM
  - Portal message received → email to internal recipient
- [ ] Email tracking (open/click) — endpoints exist, verify pixel injection works
- [ ] Test email rendering across clients (Outlook, Gmail, Apple Mail)

#### B3: BoldSign E-Sign Integration
**Priority: HIGH (Week 7+ per plan, but scaffolding exists)**

- [ ] Research BoldSign API — determine if npm package exists or use raw fetch
- [ ] Implement `lib/esign/boldsign-client.ts`:
  - Create envelope from proposal
  - Add signers (client contacts from KrewPact)
  - Send for signature
  - Check status
  - Download signed document
- [ ] Wire webhook receiver (`app/api/webhooks/boldsign/route.ts`)
  - Signature completed → update `esign_envelopes.status`
  - Signature completed → trigger contract creation
  - Signature completed → enqueue ERPNext Sales Order sync
- [ ] Wire proposal → e-sign flow in UI (`components/Contracting/`)
- [ ] Store signed PDFs in Supabase Storage
- [ ] Tests: mock BoldSign API, test full proposal → sign → contract flow

---

### GATE B: Integration Verification

- [ ] Create an Account in KrewPact → verify Customer appears in ERPNext
- [ ] Create an Estimate, approve it → verify Quotation appears in ERPNext
- [ ] Send a test email via Resend → verify delivery
- [ ] (If BoldSign ready) Create proposal → send for e-sign → complete → verify contract created
- [ ] All tests pass (target: 2,200+)
- [ ] No new type errors

---

### Phase C: Domain Hardening
**Mode: PARALLEL workstreams (all independent)**
**Depends on: Gate A passed (does NOT require Gate B)**

This phase takes existing features that are scaffolded but shallow and makes them production-ready. Each workstream can be assigned to a different agent.

#### C1: CRM Polish & Completion
**Priority: HIGH**

The CRM is the most complete domain. Harden it.

- [ ] Verify lead → opportunity → estimate → proposal → contract conversion chain end-to-end
- [ ] Lead assignment round-robin (`lib/crm/lead-assignment.ts`) — test with real division data
- [ ] Sequence processor (`lib/crm/sequence-processor.ts`) — verify it sends real emails via Resend
- [ ] Scoring engine — verify rules execute correctly against real lead data
- [ ] Duplicate detection — test across divisions (should NOT cross-match)
- [ ] CRM dashboard metrics — verify numbers are accurate against DB
- [ ] Saved views — verify per-user persistence
- [ ] Import/export — test with real MDM CSV data (382 leads already seeded)
- [ ] SLA alerts — verify overdue detection and notification

#### C2: Estimating Depth
**Priority: HIGH**

- [ ] Estimate builder — verify line item CRUD, nested sections, subtotals
- [ ] Assembly library — verify assemblies expand into line items correctly
- [ ] Cost catalog — verify item lookup and pricing
- [ ] Estimate versioning — verify version diff display
- [ ] Estimate → Proposal conversion — verify data carries through
- [ ] Markup engine — verify margin calculations (%, fixed, per-unit)
- [ ] Alternates and allowances — verify inclusion/exclusion in totals
- [ ] Template system — verify template creates estimate with correct structure
- [ ] Print/PDF export of estimates (if not yet implemented)

#### C3: Project Execution Hardening
**Priority: HIGH**

- [ ] Project creation from signed contract — verify auto-population
- [ ] Project members — verify role-based access within project
- [ ] Milestones — verify milestone CRUD and timeline display (NOTE: milestone API route may need creation — check `app/api/projects/[id]/` for existing)
- [ ] Tasks — verify CRUD, dependencies, status transitions, comments
- [ ] Daily logs — verify field supervisor workflow (create, submit, PM review)
- [ ] Site diary — verify daily narrative entries
- [ ] Document management — verify upload, versioning, folder organization, sharing
- [ ] Photo management — verify upload, annotations, GPS metadata
- [ ] Project dashboard — verify status, progress, budget vs actual display

#### C4: Portal Readiness
**Priority: MEDIUM**

- [ ] Client portal — verify project visibility scoping (only their projects)
- [ ] Client portal — change order approval workflow
- [ ] Client portal — document access (only portal-published files)
- [ ] Client portal — invoice visibility (from snapshots)
- [ ] Trade portal — onboarding flow
- [ ] Trade portal — compliance document upload and status
- [ ] Trade portal — task/scope visibility and status updates
- [ ] Trade portal — bid submission flow
- [ ] Portal messaging — verify internal ↔ external message flow
- [ ] Portal auth — verify Clerk integration for external users

#### C5: Finance Bridge Verification
**Priority: MEDIUM**

- [ ] Invoice snapshots — verify data accuracy from ERPNext
- [ ] PO snapshots — verify data accuracy
- [ ] Job cost snapshots — verify derived calculations
- [ ] Finance dashboard — verify charts and numbers match ERPNext
- [ ] Invoice list with filtering, search, status
- [ ] PO list with filtering
- [ ] Job cost report per project

#### C6: Change Management (RFI/CO/Submittal)
**Priority: MEDIUM**

- [ ] RFI creation → response → close workflow
- [ ] RFI thread discussions
- [ ] Change request → change order promotion
- [ ] Change order approval workflow (PM → client via portal)
- [ ] Change order → ERPNext Sales Order amendment sync
- [ ] Submittal creation → review → approve/reject workflow
- [ ] Submittal review tracking per reviewer

---

### GATE C: Domain Verification

- [ ] Full lifecycle test: Lead → Opportunity → Estimate → Proposal → Contract → Project → Tasks → Daily Log → Invoice
- [ ] Portal access test: Client sees only their project, can approve CO
- [ ] RLS test: User in Division A cannot see Division B data (automated)
- [ ] All tests pass (target: 2,500+)
- [ ] E2E tests cover critical paths (target: 12+ specs)

---

### Phase D: Production Readiness
**Mode: SEQUENTIAL (each step builds on the last)**
**Depends on: Gate C passed**

#### D1: Security Hardening
- [ ] Rate limiting on all public endpoints (API routes)
- [ ] CSRF protection verification
- [ ] Webhook signature verification for all webhook endpoints (Clerk, BoldSign, ERPNext)
- [ ] Input sanitization audit (XSS prevention)
- [ ] SQL injection prevention audit (Supabase parameterized queries)
- [ ] File upload validation (type, size, virus scan consideration)
- [ ] Sensitive data encryption (SIN, banking — field-level AES-256)
- [ ] API key rotation documentation
- [ ] Penetration test checklist for critical endpoints

#### D2: Performance & Scale
- [ ] Database query performance audit (slow query log)
- [ ] Index verification against `KrewPact-Architecture-Resolution.md` §H6
- [ ] Supabase connection pooling verification (port 6543)
- [ ] API response time benchmarks (target: <500ms p95 for list endpoints)
- [ ] Large dataset testing (1000+ leads, 100+ projects, 500+ tasks)
- [ ] Bundle size audit (Next.js build output)
- [ ] Image optimization (next/image usage)

#### D3: CI/CD Finalization
- [ ] GitHub Actions pipeline: Lint → Typecheck → Unit Test → Build → E2E → Deploy
- [ ] Preview deployments on Vercel for PRs
- [ ] Production deployment pipeline with manual approval gate
- [ ] Environment variable validation at build time
- [ ] Database migration strategy for production (Supabase CLI)
- [ ] Rollback procedure documented

#### D4: UAT & Go-Live Prep
- [ ] Seed production Supabase with MDM division data
- [ ] Create Clerk production instance
- [ ] Configure Clerk JWT template for Supabase
- [ ] Create test users for each role (9 internal + 4 external)
- [ ] UAT test script for each P0 epic
- [ ] Training documentation for PM, Field Supervisor, Estimator, Accounting roles
- [ ] DNS configuration: `app.krewpact.com` → Vercel
- [ ] SSL verification
- [ ] Go-live checklist sign-off

---

### GATE D: Production Go/No-Go

- [ ] All P0 features functional with real data
- [ ] ERPNext sync verified bidirectionally
- [ ] Sentry capturing errors, no critical unhandled
- [ ] BetterStack uptime monitor green
- [ ] 2,500+ tests passing
- [ ] 15+ E2E specs passing
- [ ] Zero WCAG AA critical violations
- [ ] Security checklist complete
- [ ] Michael signs off on UAT

---

## Part 5: Agent Assignment Guide

### How to Pick Up Work

1. Read this entire document first. Understand the soul.
2. Check which Phase/Gate the project is currently in (look at `docs/audits/` for latest state).
3. Pick a workstream within the current phase.
4. Read the relevant architecture docs before writing code:
   - Integration work → `KrewPact-Integration-Contracts.md` + `KrewPact-ERPNext-Doctype-Field-Mapping.md`
   - Schema work → `KrewPact-Backend-SQL-Schema-Draft.sql` + existing migrations in `supabase/migrations/`
   - Feature work → `KrewPact-Feature-Function-PRD-Checklist.md` for acceptance criteria
   - Any work → `CLAUDE.md` for conventions
5. Write tests alongside code. Not after. Not "later."
6. Run the full quality gate before pushing: `npm run lint && npm run typecheck && npm run test && npm run build`

### Parallel Work Matrix

```
Phase A (Infrastructure):
  A1 (Queue)  ─── SEQUENTIAL with A3 (Mappers need queue)
  A2 (ERPNext) ── SEQUENTIAL with A3 (Mappers need ERPNext)
  A4 (Sentry) ── PARALLEL (independent)
  A5 (a11y)   ── PARALLEL (independent)

Phase B (Integration):
  B1 (ERP Sync) ── PARALLEL
  B2 (Email)    ── PARALLEL
  B3 (BoldSign) ── PARALLEL

Phase C (Hardening):
  C1 (CRM)       ── PARALLEL
  C2 (Estimating) ── PARALLEL
  C3 (Projects)   ── PARALLEL
  C4 (Portals)    ── PARALLEL
  C5 (Finance)    ── PARALLEL (depends on B1 for real data)
  C6 (Change Mgmt) ── PARALLEL

Phase D (Production):
  D1 → D2 → D3 → D4 ── SEQUENTIAL
```

### Agent Sizing Guide

| Workstream | Complexity | Suggested Agent | Estimated Scope |
|------------|------------|----------------|-----------------|
| A1 Queue | Medium | Opus | ~3 files, 1 decision |
| A2 ERPNext setup | Medium | Human (Michael) | Infrastructure, not code |
| A3 Mappers | Medium | Sonnet | 3 new files + tests |
| A4 Sentry | Low | Sonnet | Config files + logger |
| A5 a11y | Low | Sonnet | Test additions |
| B1 ERP Sync | High | Opus | 12 entity flows, new endpoints |
| B2 Email | Medium | Sonnet | Notification triggers |
| B3 BoldSign | High | Opus | New integration from scratch |
| C1-C6 | Medium each | Sonnet/Opus | Feature hardening |
| D1-D4 | Varies | Opus orchestrating | Security + performance + deploy |

### Context Each Agent Needs

Every agent starting a workstream MUST read:
1. This file (`docs/EXECUTION-PLAN.md`) — the soul and the rules
2. `CLAUDE.md` — project conventions and tech stack
3. The specific architecture doc for their workstream (listed in each section)
4. The relevant `lib/` and `app/api/` code for their domain

Every agent finishing a workstream MUST:
1. Run `npm run lint && npm run typecheck && npm run test`
2. Ensure no regressions (test count should only go UP)
3. Update this document's checkboxes for completed items
4. Note any decisions made or blockers hit in the workstream section

---

## Part 6: Definition of Done

KrewPact MVP is **done** when:

1. A sales rep can enter a lead, qualify it, create an estimate, send a proposal, get it e-signed, and the resulting contract + project appear in both KrewPact and ERPNext.

2. A project manager can assign team members, create milestones and tasks, review daily logs, manage documents, and see financial data synced from ERPNext.

3. A client can log into the portal, see their project status, approve a change order, and view invoices.

4. A field supervisor can submit daily logs, safety forms, and time entries.

5. An executive can see a dashboard with pipeline value, project status, and revenue metrics across all divisions.

6. Every action is audited. Every query respects division boundaries. Every external sync is idempotent and recoverable.

7. The system runs on `app.krewpact.com` with Sentry error tracking, BetterStack uptime monitoring, and a CI pipeline that catches regressions before they ship.

---

*This document is the north star. When in doubt, re-read Part 1. When confused about scope, re-read the Phase you're in. When stuck on implementation, read the architecture docs referenced in each section. When everything works, check the boxes and move to the next Gate.*
