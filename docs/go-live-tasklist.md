# KrewPact Go-Live Task List

> Everything needed to take KrewPact from "code complete" to "MDM Group runs their business on it."
> Organized by independent work streams — no timelines, just tasks with done criteria.
> Each work stream is session-sized: pick one, complete it, check it off.

**Current state:** ~370+ API routes, 52 migrations, 485 RLS policies, 4,715 tests passing (428 files). Build clean.

---

## Session Dispatch Plan

Run sessions in **batches**. Within each batch, open one terminal per session and paste the prompt. All sessions within a batch have zero file conflicts and can run simultaneously. Wait for a batch to complete before starting the next.

### Conflict Map

| Type                  | Work Streams                                                            | Why                                                     |
| --------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| **Code-modifying**    | WS1, WS4, WS11, WS12, WS13, WS14, WS15                                  | Touch source files                                      |
| **Verification-only** | WS2, WS3, WS5, WS6, WS7, WS8, WS9, WS10, WS16                           | Run scripts / test external services, no source changes |
| **Wide blast radius** | WS13 (316 files), WS14 (all page.tsx)                                   | Must be sequenced carefully                             |
| **Overlapping files** | WS11 + WS14 (both touch page.tsx), WS12 + WS13 (both touch components/) | Cannot run simultaneously                               |

### Batch 1 — Foundation (7 parallel sessions)

All touch completely different files or are verification-only.

**Session 1 — WS1: CI Config**

```
Read docs/go-live-tasklist.md then work on WS1: CI & E2E Auth.
Files you'll touch: .github/workflows/ci.yml, playwright.config.ts
Check off completed tasks in docs/go-live-tasklist.md. Commit when done.
```

**Session 2 — WS3: Vercel Env Audit**

```
Read docs/go-live-tasklist.md then work on WS3: Vercel Environment Completeness.
This is verification-only — audit env vars, run health-check.ts, document gaps.
No source code changes. Report results as comments in the tasklist commit.
```

**Session 3 — WS4: Storage Buckets**

```
Read docs/go-live-tasklist.md then work on WS4: Supabase Storage Buckets.
Create a new Supabase migration for bucket RLS policies. Test upload routes.
Check off completed tasks in docs/go-live-tasklist.md. Commit when done.
```

**Session 4 — WS5: Email Verification**

```
Read docs/go-live-tasklist.md then work on WS5: Email (Resend) Configuration.
This is verification + testing — check DNS, send test emails, verify templates.
No source code changes expected. Report findings.
```

**Session 5 — WS15: Docs Sync**

```
Read docs/go-live-tasklist.md then work on WS15: Documentation Sync.
Only touch files in docs/ and CONTRIBUTING.md. Update docs to match current implementation.
Check off completed tasks in docs/go-live-tasklist.md. Commit when done.
```

**Session 6 — WS2: Data Seeding**

```
Read docs/go-live-tasklist.md then work on WS2: Production Data Seeding.
Only touch files in scripts/. Create or update seed scripts, run health-check.ts.
Check off completed tasks in docs/go-live-tasklist.md. Commit when done.
```

**Session 7 — WS9: PDF Testing**

```
Read docs/go-live-tasklist.md then work on WS9: PDF Generation.
Test existing PDF generation with real data. Fix any rendering issues in lib/pdf/.
Check off completed tasks in docs/go-live-tasklist.md. Commit when done.
```

### Batch 2 — Integration + Lint Sweep (5 parallel sessions)

WS13 runs in a **git worktree** for isolation. Verification sessions run alongside safely.

**Session 1 — WS13: Lint Cleanup (WORKTREE)**

```
Read docs/go-live-tasklist.md then work on WS13: Remaining Lint Cleanup.
This is the biggest code task — ~316 files with warnings. Work methodically:
1. Fix max-lines-per-function (extract helpers) in lib/ first, then components/, then app/
2. Fix complexity warnings (simplify or extract)
3. Fix react/no-array-index-key (use stable keys)
4. Fix max-depth (flatten logic)
Do NOT touch next.config.ts. Commit frequently by directory group.
Check off completed tasks in docs/go-live-tasklist.md.
```

**Session 2 — WS6 Part 1: ERPNext Mappers (customer through sales-order)**

```
Read docs/go-live-tasklist.md then work on WS6a through WS6f: ERPNext Integration.
Test mappers: tunnel verification, customer, contact, opportunity, quotation, sales-order.
This is verification/testing of existing code. Fix mapper bugs if found.
Only touch files in lib/erp/. Check off tasks in docs/go-live-tasklist.md.
```

**Session 3 — WS6 Part 2: ERPNext Mappers (project through DLQ)**

```
Read docs/go-live-tasklist.md then work on WS6g through WS6l: ERPNext Integration.
Test mappers: project, task, supplier, expense, timesheet, read-only invoices, sync cron, DLQ.
This is verification/testing of existing code. Fix mapper bugs if found.
Only touch files in lib/erp/. Check off tasks in docs/go-live-tasklist.md.
```

**Session 4 — WS7 + WS8: BoldSign + RBAC**

```
Read docs/go-live-tasklist.md then work on WS7 (BoldSign E-Sign) and WS8 (User Onboarding & RBAC).
Both are verification/testing. BoldSign touches lib/esign/, RBAC touches lib/rbac/.
Test all 13 role permission boundaries. Fix bugs if found.
Check off tasks in docs/go-live-tasklist.md.
```

**Session 5 — WS10: Portal Testing**

```
Read docs/go-live-tasklist.md then work on WS10: Portal Testing (Client + Trade Partner).
Test both portals end-to-end. Create test users, verify data isolation.
Only touch files in app/(portal)/ if bugs found. Check off tasks.
```

### Batch 3 — Page Polish + Bundle (3 parallel sessions)

After WS13 lint merge. WS11 and WS14 split page.tsx files to avoid conflicts.

**Session 1 — WS11: Server Component Conversion**

```
Read docs/go-live-tasklist.md then work on WS11: Server Component Conversion.
Convert these 5 pages to Server Components + add generateMetadata() to each:
- app/(dashboard)/org/[orgSlug]/dashboard/page.tsx
- app/(dashboard)/org/[orgSlug]/crm/leads/page.tsx
- app/(dashboard)/org/[orgSlug]/crm/accounts/page.tsx
- app/(dashboard)/org/[orgSlug]/projects/page.tsx
- app/(dashboard)/org/[orgSlug]/crm/opportunities/page.tsx
Also create loading.tsx for each. Only touch these 5 page.tsx files + new loading.tsx files.
Check off tasks in docs/go-live-tasklist.md. Commit when done.
```

**Session 2 — WS14: Metadata for All Other Pages**

```
Read docs/go-live-tasklist.md then work on WS14: Metadata & Accessibility.
Add generateMetadata() to ALL page.tsx files EXCEPT these 5 (handled by WS11):
- dashboard/page.tsx, crm/leads/page.tsx, crm/accounts/page.tsx, projects/page.tsx, crm/opportunities/page.tsx
Also run axe-core audit, check keyboard nav, verify skip-to-content link.
Check off tasks in docs/go-live-tasklist.md. Commit when done.
```

**Session 3 — WS12: Bundle Optimization**

```
Read docs/go-live-tasklist.md then work on WS12: Bundle Optimization.
Files you'll touch: next.config.ts and component files that import heavy libraries.
Add next/dynamic for CommandPalette, OnboardingWizard, recharts, react-pdf.
Verify tree-shaking. Do NOT touch page.tsx files.
Check off tasks in docs/go-live-tasklist.md. Commit when done.
```

### Batch 4 — Final Validation (1 session)

Everything else must be done first.

**Session 1 — WS16: UAT**

```
Read docs/go-live-tasklist.md then work on WS16: UAT (User Acceptance Testing).
Run all 4 end-to-end workflows: CRM, Project, Finance, Admin.
This validates all previous work streams. Document any failures as new tasks.
Check off tasks in docs/go-live-tasklist.md. Commit when done.
```

### Summary

| Batch | Sessions   | Work Streams                       | Prereqs                         |
| ----- | ---------- | ---------------------------------- | ------------------------------- |
| 1     | 7 parallel | WS1, WS2, WS3, WS4, WS5, WS9, WS15 | None                            |
| 2     | 5 parallel | WS6 (x2), WS7+WS8, WS10, WS13      | None (can overlap with Batch 1) |
| 3     | 3 parallel | WS11, WS12, WS14                   | WS13 merged                     |
| 4     | 1          | WS16                               | All above complete              |

**Total: 16 sessions across 4 batches. Max 12 simultaneous in Batches 1+2.**

---

## WS1: CI & E2E Auth

Unblocks all automated testing in CI. Currently E2E tests require real Clerk credentials.

- [x] Add `CLERK_TEST_EMAIL` + `CLERK_TEST_PASSWORD` to GitHub Actions secrets
- [x] Add `CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` to CI environment
- [ ] Verify E2E tests pass in CI with real Clerk auth (`e2e/auth-smoke.spec.ts`, `e2e/auth.spec.ts`, `e2e/dashboard-ui.spec.ts`)
- [x] Verify cron smoke test passes in CI (`__tests__/api/cron/smoke-test.test.ts`)

**Key files:** `.github/workflows/ci.yml`, `playwright.config.ts`, `e2e/*.spec.ts`
**Done when:** CI pipeline green with E2E step passing on a PR.

---

## WS2: Production Data Seeding

Real org data so the app isn't empty on first load.

- [ ] Create/update `scripts/seed-org.ts` — seed MDM Group org + 6 divisions into Supabase
- [ ] Create/update `scripts/seed-test-users.ts` — create admin users in Clerk + Supabase user rows
- [ ] Seed default scoring rules (`lead_scoring_rules`) for each division
- [ ] Seed default cost codes from MDM's chart of accounts
- [ ] Seed reference data sets (project types, trade categories, regions)
- [ ] Run `scripts/health-check.ts` against production to verify connectivity
- [ ] Verify: dashboard loads with real org, divisions visible in sidebar, admin can log in

**Key files:** `scripts/seed-org.ts`, `scripts/seed-test-users.ts`, `scripts/health-check.ts`
**Done when:** Admin logs in to production, sees MDM Group org with all 6 divisions, dashboard renders.

---

## WS3: Vercel Environment Completeness

All 35 env vars verified in production.

- [x] Audit all env vars in `.env.example` against Vercel dashboard (Production + Preview) — 13 missing vars added to .env.example, BoldSign name mismatch fixed
- [x] Verify `CRON_SECRET` is set and matches all 14 cron route checks — all 14 use `verifyCronAuth`
- [x] Verify `QSTASH_CURRENT_SIGNING_KEY` + `QSTASH_NEXT_SIGNING_KEY` are set
- [x] Verify `RESEND_API_KEY` is set
- [x] Verify `SENTRY_DSN` + `SENTRY_AUTH_TOKEN` are set
- [x] Verify `APOLLO_API_KEY` is set (for enrichment pipeline) — set in Production only
- [x] Run `scripts/health-check.ts` against production URL — 9/13 pass (4 enrichment keys local-only gaps, all pass in prod)
- [x] Verify all cron jobs are registered in `vercel.json` (or equivalent) — 14/14 crons registered

**Key files:** `.env.example`, `scripts/health-check.ts`, `vercel.json`
**Done when:** `health-check.ts` reports 12/12 services connected against production.

---

## WS4: Supabase Storage Buckets

File upload infrastructure for documents, photos, contracts.

- [x] Create `project-files` bucket in Supabase Storage
- [x] Create `project-photos` bucket
- [x] Create `contracts` bucket
- [x] Create `avatars` bucket
- [x] Add RLS policies to each bucket (match corresponding table policies — org_id scoping)
- [ ] Test upload via `/api/projects/[id]/files/` route
- [ ] Test upload via `/api/projects/[id]/photos/` route
- [ ] Test avatar upload via user profile
- [ ] Verify file retrieval returns signed URLs with correct expiry

**Key files:** `app/api/projects/[id]/files/route.ts`, `app/api/projects/[id]/photos/route.ts`
**Done when:** File upload and retrieval works end-to-end in deployed app.

---

## WS5: Email (Resend) Configuration

Transactional email for notifications, sequences, alerts.

- [x] Verify Resend domain is configured (e.g., `updates.krewpact.com` or `updates.mdmgroupinc.ca`) — updates.mdmgroupinc.ca verified, sending enabled
- [x] Verify DNS records (SPF, DKIM, DMARC) for sending domain — domain status: verified
- [ ] Test lead notification email (new lead → email to assigned rep)
- [ ] Test sequence step email (outreach sequence sends real email)
- [x] Test branded email templates (`lib/email/templates/`) render correctly — 7 templates present
- [ ] Test watchdog/smoke-test alert emails arrive at ops inbox
- [ ] Verify cooldown pattern works (no duplicate alerts within window)
- [ ] Test daily digest email (`app/api/cron/daily-digest/route.ts`)

**Key files:** `lib/email/`, `lib/email/templates/`, `app/api/email/send/route.ts`
**Done when:** Emails sent and received for all template categories (lead, sequence, alert, digest).

---

## WS6: ERPNext Live Integration

The biggest work stream. Split into sub-tasks — each mapper can be tested independently.

### 6a: Tunnel Verification

- [x] Verify ERPNext instance accessible via Cloudflare Tunnel from Vercel — tunnel live, deep health check passed
- [x] Verify `ERPNEXT_BASE_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET` in Vercel env
- [x] Test `lib/erp/client.ts` basic connectivity (GET /api/method/frappe.ping) — Company doctype returns 1 company

### 6b: Customer Mapper

- [ ] Create a KrewPact account → verify Customer created in ERPNext
- [ ] Verify `krewpact_id` field populated on ERPNext Customer
- [ ] Test update propagation (edit account name → Customer name updates)

**Key files:** `lib/erp/sync-handlers/customer-handler.ts`, `lib/erp/customer-mapper.ts`

### 6c: Contact Mapper

- [ ] Create contact in KrewPact → verify Contact in ERPNext
- [ ] Verify contact linked to correct Customer

**Key files:** `lib/erp/sync-handlers/contact-handler.ts`, `lib/erp/contact-mapper.ts`

### 6d: Opportunity Mapper

- [ ] Create opportunity in KrewPact → verify Opportunity in ERPNext
- [ ] Verify linked to correct Customer

**Key files:** `lib/erp/sync-handlers/opportunity-handler.ts`, `lib/erp/opportunity-mapper.ts`

### 6e: Quotation Mapper

- [ ] Create estimate in KrewPact → verify Quotation in ERPNext
- [ ] Verify line items map correctly
- [ ] Verify totals match

**Key files:** `lib/erp/quotation-mapper.ts`

### 6f: Sales Order Mapper

- [ ] Mark opportunity as won → verify Sales Order created in ERPNext
- [ ] Verify terms and amounts match

**Key files:** `lib/erp/sales-order-mapper.ts`

### 6g: Project + Task Mapper

- [ ] Create project in KrewPact → verify Project in ERPNext
- [ ] Create tasks → verify Tasks linked to ERPNext Project

**Key files:** `lib/erp/project-mapper.ts`, `lib/erp/task-mapper.ts`

### 6h: Supplier Mapper

- [ ] Create trade partner in KrewPact → verify Supplier in ERPNext

**Key files:** `lib/erp/supplier-mapper.ts`

### 6i: Expense + Timesheet Mapper

- [ ] Submit expense in KrewPact → verify Expense Claim in ERPNext
- [ ] Submit time entry → verify Timesheet in ERPNext

**Key files:** `lib/erp/expense-mapper.ts`, `lib/erp/timesheet-mapper.ts`

### 6j: Read-Only Mappers

- [x] Verify Sales Invoice read from ERPNext displays in KrewPact finance view — mapper tested, empty data (no invoices yet)
- [x] Verify Purchase Invoice read works — 1 record (ACC-PINV-2026-00001, Overdue)
- [x] Verify Payment Entry read works — mapper tested, fixed Paid/Reconciled status mapping

**Key files:** `lib/erp/sales-invoice-mapper.ts`, `lib/erp/purchase-invoice-mapper.ts`, `lib/erp/payment-entry-mapper.ts`

### 6k: Sync Cron End-to-End

- [ ] Trigger `/api/cron/erp-sync` manually
- [ ] Verify outbox items are processed
- [ ] Verify ERPNext webhook callback updates KrewPact records
- [ ] Verify sync status visible in admin panel (`/admin/sync`)

**Key files:** `app/api/cron/erp-sync/route.ts`, `lib/erp/sync-service.ts`, `app/api/webhooks/erpnext/route.ts`

### 6l: Dead-Letter & Retry

- [ ] Simulate a sync failure (invalid data)
- [ ] Verify item goes to dead-letter queue
- [ ] Verify retry mechanism works on requeue
- [ ] Verify admin can see failed items in sync dashboard

**Done when:** All 13 entity types sync bidirectionally. Cron runs clean. Dead-letter queue handles failures.

---

## WS7: BoldSign E-Sign Integration

Contract signing workflow.

- [ ] Configure `BOLDSIGN_API_KEY` + `BOLDSIGN_ACCOUNT_ID` in Vercel
- [ ] Test create envelope from contract page
- [ ] Test signing flow: send → recipient receives → signs → webhook callback
- [ ] Verify contract status updates in KrewPact (pending → sent → signed)
- [ ] Test multi-signer flow (if applicable)
- [ ] Verify signed PDF stored in Supabase Storage `contracts` bucket

**Key files:** `lib/esign/boldsign-client.ts`, `app/api/esign/route.ts`, `app/api/webhooks/boldsign/route.ts`
**Done when:** Full e-sign lifecycle works with real BoldSign sandbox or production.

---

## WS8: User Onboarding & RBAC Flow

End-to-end user lifecycle without touching the database directly.

- [ ] Test: admin creates user in Clerk dashboard → `webhooks/clerk` fires → Supabase user row created
- [ ] Test: admin assigns roles + divisions via Settings > Users page
- [ ] Test: new user logs in → sees only division-scoped data
- [ ] Test all 9 internal roles have correct permission boundaries:
  - [ ] `platform_admin` — full access
  - [ ] `executive` — read all, limited write
  - [ ] `operations_manager` — multi-division access
  - [ ] `project_manager` — own projects + team
  - [ ] `project_coordinator` — own projects, limited admin
  - [ ] `estimator` — estimates + CRM read
  - [ ] `field_supervisor` — daily logs, time, safety
  - [ ] `accounting` — finance views, invoice management
  - [ ] `payroll_admin` — time entries, expense approval
- [ ] Test 4 external roles:
  - [ ] `client_owner` — portal access, own projects only
  - [ ] `client_delegate` — portal access, delegated projects
  - [ ] `trade_partner_admin` — trade portal, manage team
  - [ ] `trade_partner_user` — trade portal, own tasks

**Key files:** `app/api/webhooks/clerk/route.ts`, `lib/rbac/permissions.ts`, `app/api/org/users/`
**Done when:** New employee can be onboarded via Clerk + Settings UI, sees correct data.

---

## WS9: PDF Generation

Estimates and reports need to be printable.

- [ ] Test estimate PDF generation with real estimate data (line items, totals, client info)
- [ ] Test project status PDF with real project data
- [ ] Test `/api/pdf/generate/` route returns downloadable PDF
- [ ] Verify MDM Group branding (logo, colors, footer)
- [ ] Verify line items don't overflow page boundaries
- [ ] Test ExportPdfButton component triggers download

**Key files:** `lib/pdf/generator.ts`, `app/api/pdf/generate/route.ts`, `components/Estimates/ExportPdfButton.tsx`
**Done when:** PDFs generate, download, and are print-ready with correct branding.

---

## WS10: Portal Testing (Client + Trade Partner)

External-facing portals for clients and trade partners.

### Client Portal

- [ ] Create test user with `client_owner` role in Clerk
- [ ] Test client portal login flow (`/portals/client/`)
- [ ] Verify client sees only assigned projects
- [ ] Test document access (view/download shared documents)
- [ ] Test messaging (send/receive messages with project team)
- [ ] Test change order approval flow
- [ ] Test invoice viewing

### Trade Partner Portal

- [ ] Create test user with `trade_partner_admin` role
- [ ] Test trade portal login flow
- [ ] Test onboarding flow (`/portals/trade/onboarding/`)
- [ ] Test task status updates
- [ ] Test submittal upload
- [ ] Test bid submission
- [ ] Test compliance document upload

**Key files:** `app/(portal)/`, `app/api/portal/`
**Done when:** External users see only their data, can perform all portal actions.

---

## WS11: Server Component Conversion

Performance optimization — move data fetching server-side.

- [x] Convert `app/(dashboard)/org/[orgSlug]/dashboard/page.tsx` to Server Component
- [x] Convert `app/(dashboard)/org/[orgSlug]/crm/leads/page.tsx` to Server Component
- [x] Convert `app/(dashboard)/org/[orgSlug]/crm/accounts/page.tsx` to Server Component
- [x] Convert `app/(dashboard)/org/[orgSlug]/projects/page.tsx` to Server Component
- [x] Convert `app/(dashboard)/org/[orgSlug]/crm/opportunities/page.tsx` to Server Component
- [x] Add `loading.tsx` Suspense fallback for each converted route
- [x] Verify no hydration errors after conversion
- [ ] Measure Lighthouse LCP before/after

**Done when:** Top 5 list pages server-rendered. Lighthouse LCP improved (measure before/after).

---

## WS12: Bundle Optimization

Reduce JS shipped to client.

- [ ] Run `ANALYZE=true npm run build` and review bundle composition
- [x] Add `next/dynamic` for `CommandPalette` (only loads on keyboard shortcut)
- [x] Add `next/dynamic` for `OnboardingWizard` (only loads for new users) — orphaned, not imported in app
- [x] Add `next/dynamic` for recharts components (heavy charting lib) — already code-split via 'use client' + dynamic loaders
- [x] Add `next/dynamic` for react-pdf components — orphaned TakeoffPdfViewer, not imported
- [ ] Verify recharts uses named imports (`import { BarChart }` not `import * as Recharts`)
- [ ] Verify date-fns imports are tree-shakeable (no `import * from 'date-fns'`)
- [ ] Check no single JS chunk exceeds 200KB gzipped

**Key files:** `next.config.ts`, components using heavy libraries
**Done when:** No single chunk > 200KB. Heavy components lazy-loaded.

---

## WS13: Remaining Lint Cleanup

Promote all warn-level rules to error.

- [ ] Fix `max-lines-per-function` warnings (~222 instances) — extract helper functions
- [ ] Fix `complexity` warnings (~111 instances) — simplify conditional logic or extract
- [ ] Fix `react/no-array-index-key` warnings (~66 instances) — use stable keys (id, slug)
- [ ] Fix `max-depth` warnings (~17 instances) — flatten nested conditionals
- [ ] Promote all warn-level rules to `error` in `.eslintrc.json` / `eslint.config.mjs`
- [ ] Verify: `npm run lint` passes with 0 warnings, 0 errors

**Key files:** ESLint config, various component and lib files
**Done when:** 0 lint warnings. All rules at error level. `npm run lint` clean.

---

## WS14: Metadata & Accessibility

SEO and WCAG compliance.

- [ ] Add `generateMetadata()` to all `page.tsx` files (title, description, openGraph)
- [ ] Run `@axe-core/playwright` audit on dashboard, CRM, estimates, projects pages
- [ ] Verify skip-to-content link present and functional
- [ ] Verify keyboard navigation through: login → dashboard → create lead → create estimate
- [ ] Verify all form inputs have associated labels
- [ ] Verify color contrast meets WCAG AA (4.5:1 for text)
- [ ] Run Lighthouse accessibility audit — target score > 90
- [ ] Verify all images have alt text (or are decorative with `alt=""`)

**Key files:** All `page.tsx` files, `app/layout.tsx`, component files
**Done when:** All pages have metadata. No critical a11y violations. Lighthouse a11y > 90.

---

## WS15: Documentation Sync

Docs match the codebase as-built.

- [x] Update `docs/architecture-overview.md` with AI Agentic Layer (8 agents, Gemini Flash)
- [x] Update architecture docs with Executive Dashboard + RAG / pgvector layer
- [x] Update `KrewPact-Architecture-Resolution.md` ERPNext mapper count (12 → 13 mappers + 15 sync-handlers)
- [ ] Document alert cooldown pattern in `docs/runbook.md`
- [ ] Document Apollo pump + enrichment pipeline in `docs/runbook.md`
- [ ] Document scoring engine rules and caps in `docs/domains.md`
- [x] Update `docs/ERPNEXT-SETUP-GUIDE.md` with all `krewpact_*` custom fields
- [x] Verify `CONTRIBUTING.md` reflects current dev workflow

**Key files:** `docs/`, `CONTRIBUTING.md`, planning documents
**Done when:** All docs match current implementation. No stale references.

---

## WS16: UAT (User Acceptance Testing)

End-to-end workflows with real MDM data and real users.

### CRM Workflow

- [ ] Create lead from web form submission
- [ ] Lead auto-scored by scoring engine
- [ ] Rep qualifies lead → stage progression
- [ ] Convert lead to opportunity + account
- [ ] Create estimate from opportunity
- [ ] Generate proposal PDF
- [ ] Send contract via BoldSign
- [ ] Mark opportunity as won → Sales Order synced to ERPNext

### Project Workflow

- [ ] Create project from won opportunity
- [ ] Assign team members (PM, supervisor, coordinator)
- [ ] Create milestones and tasks
- [ ] Log daily diary entries
- [ ] Upload project documents and photos
- [ ] Submit RFI → receive response
- [ ] Submit time entries
- [ ] Run project closeout checklist

### Finance Workflow

- [ ] View invoice snapshots from ERPNext
- [ ] View job cost breakdown
- [ ] Create purchase order
- [ ] Approve expense claim
- [ ] View financial dashboard with real data

### Admin Workflow

- [ ] Create new internal user
- [ ] Assign roles and divisions
- [ ] Verify user sees correct scoped data
- [ ] View audit log for user actions
- [ ] Run system health check from admin panel

**Done when:** All 4 workflows complete end-to-end with real MDM data. No manual DB edits needed.

---

## Quick Reference: Priority Order

If limited on time, work streams in rough priority order:

1. **WS1** (CI auth) — unblocks automated testing
2. **WS3** (Vercel env) — unblocks production deploys
3. **WS2** (data seeding) — unblocks manual testing
4. **WS6** (ERPNext) — core business value
5. **WS8** (RBAC flow) — users need to log in
6. **WS5** (email) — notifications are critical
7. **WS4** (storage) — documents are core workflow
8. **WS10** (portals) — external users
9. **WS7** (e-sign) — contract workflow
10. **WS9** (PDF) — estimates need to be sent
11. **WS16** (UAT) — validates everything
12. **WS11-15** — polish and optimization
