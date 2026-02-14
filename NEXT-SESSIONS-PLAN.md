# KrewPact — Next Sessions Plan

> **Goal:** Get KrewPact live with real pages, connected to Supabase, and syncing to ERPNext.
> **Current state:** App shell scaffolded (15 pages, 35 API stubs, 7 DB tables). No real data flowing yet.

---

## Session 1: Infrastructure Setup (Pre-Coding)

**Objective:** Get all services provisioned so code can talk to real backends.

### Tasks
1. **Provision Supabase cloud instance** (if not already done)
   - Create project on supabase.com
   - Run all 4 migrations (`00001` through `00004`)
   - Grab: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
   - Verify tables exist: `divisions`, `users`, `roles`, `user_roles`, `user_divisions`, `audit_logs`, `leads`

2. **Configure Clerk JWT template**
   - In Clerk dashboard → JWT Templates → Create "supabase" template
   - Add custom claims: `krewpact_user_id`, `krewpact_divisions` (array), `krewpact_roles` (array)
   - These claims are what RLS policies use — without them, every query returns empty

3. **Set up ERPNext access**
   - Verify ERPNext instance is running (Cloudflare Tunnel or direct URL)
   - Create API key/secret pair in ERPNext
   - Test: `curl -s {ERPNEXT_BASE_URL}/api/method/frappe.auth.get_logged_user -H "Authorization: token {key}:{secret}"`

4. **Populate `.env.local`** with all service credentials
5. **Verify `npm run dev` loads** — dashboard should render (even with empty data)

### Deliverable
All external services reachable from local dev. `npm run dev` shows the dashboard with 0 projects.

---

## Session 2: Database Schema — CRM + Projects Tables

**Objective:** Create the core tables that pages need to render real data.

### Tasks
1. **Create migration `00005_crm_core.sql`:**
   - `accounts` — Companies/clients (name, industry, division_id, website, address, status)
   - `contacts` — People at accounts (first_name, last_name, email, phone, account_id, role)
   - `opportunities` — Sales pipeline (account_id, contact_id, division_id, value, stage, probability)

2. **Create migration `00006_projects_core.sql`:**
   - `projects` — Full project table (name, code, account_id, division_id, address, status, budget, start_date, end_date, project_manager_id)
   - `project_members` — Team assignment (project_id, user_id, role)
   - `tasks` — Project tasks (project_id, title, description, assignee_id, status, priority, due_date)
   - `documents` — File references (project_id, name, storage_path, uploaded_by)

3. **Create migration `00007_financials.sql`:**
   - `expenses` — Expense claims (project_id, user_id, amount, category, receipt_url, status)
   - `daily_logs` — Field reports (project_id, user_id, date, weather, crew_count, notes)

4. **Add RLS policies** for all new tables (same pattern as `00002`)
5. **Generate TypeScript types:** `supabase gen types typescript --project-id krewpact > types/supabase.ts`
6. **Run migrations** against cloud Supabase instance

### Deliverable
13+ tables live with RLS. TypeScript types generated for type-safe queries.

---

## Session 3: Wire Pages to Supabase — Projects + Dashboard

**Objective:** Replace mock data with real Supabase queries. Core CRUD working.

### Tasks
1. **Fix API routes to use real Supabase client:**
   - `api/projects/route.ts` — GET (list with filters), POST (create)
   - `api/projects/[id]/route.ts` — GET, PUT, DELETE
   - `api/projects/[id]/members/route.ts` — GET, POST
   - `api/dashboard/route.ts` — Aggregate KPIs from real tables

2. **Wire up pages:**
   - `/dashboard` — Real counts (active projects, pending expenses, pending reports)
   - `/projects` — List from Supabase with division filtering
   - `/projects/[id]` — Project detail with members, tasks, expenses tabs
   - `/projects/new` — Create project form saving to Supabase

3. **Wire user sync:**
   - Clerk webhook → `api/webhooks/clerk/route.ts` → upsert into `users` table
   - `api/user/current/route.ts` → Query Supabase for full user profile + roles

4. **Test end-to-end:** Create a project via UI → verify in Supabase dashboard

### Deliverable
Dashboard shows real KPIs. Projects CRUD works end-to-end. User shows up in users table after first login.

---

## Session 4: Wire Pages — CRM + Expenses + Tasks

**Objective:** Complete remaining page connections.

### Tasks
1. **CRM pages:**
   - `/crm/accounts` — List/create accounts
   - `/crm/contacts` — List/create contacts
   - `/crm/leads` — List leads (from existing `leads` table)

2. **Expense tracking:**
   - `/expenses` — List user's expenses with status filters
   - Expense creation form with receipt upload (Supabase Storage)
   - Approval workflow (submitted → approved → paid)

3. **Task management:**
   - `/tasks` — User's assigned tasks across projects
   - Task creation within project detail page
   - Status updates (todo → in_progress → done)

4. **Team page:**
   - `/team` — List all users in current division
   - Role badges, contact info

### Deliverable
All core pages render real data. Users can create accounts, log expenses, manage tasks.

---

## Session 5: ERPNext Integration — Sync Workflows

**Objective:** Two-way sync between KrewPact and ERPNext for key entities.

### Tasks
1. **Outbound sync (KrewPact → ERPNext):**
   - Customer: On account create → POST ERPNext Customer doctype
   - Quotation: On estimate approve → POST ERPNext Quotation
   - Project: On project create → POST ERPNext Project
   - Map KrewPact IDs to ERPNext `name` field (store in `erpnext_id` column)

2. **Inbound sync (ERPNext → KrewPact):**
   - Sales Invoice: Read-only pull from ERPNext for billing status
   - Purchase Invoice: Read-only pull for cost tracking

3. **Sync infrastructure:**
   - `lib/erp/sync.ts` — Sync manager with retry logic
   - Error handling: Log failures to `audit_logs`, surface in admin panel
   - Idempotency: Use `krewpact_id` custom field in ERPNext to prevent duplicates

4. **Admin sync dashboard:**
   - `/admin/sync` — Show last sync status, failed items, manual retry button

### Deliverable
Creating a customer in KrewPact creates it in ERPNext. Invoices from ERPNext visible in KrewPact.

---

## Session 6: Seed Data Import + Testing + Deploy

**Objective:** Load real MDM data, write tests, deploy to Vercel.

### Tasks
1. **Seed data import scripts:**
   - Parse `data/seed/Customer List.xlsx` → `accounts` + `contacts`
   - Parse `data/seed/Leads for contracting.xlsx` → `leads`
   - Parse `data/seed/projects/*.xlsx` → `projects` (historical)
   - Validate data quality, handle duplicates

2. **Write tests:**
   - Unit tests for all API routes (Vitest — same pattern as mdm-website-v2)
   - RLS policy tests (verify division-scoped access)
   - ERPNext sync tests (mock ERPNext API)
   - E2E: Login → Create project → Verify in list (Playwright)

3. **Deploy:**
   - Set all env vars in Vercel
   - Push to main → auto-deploy
   - Verify at krewpact.com (or staging URL)
   - Run smoke tests against production

4. **ERPNext data migration:**
   - Map `data/erpnext-import/` files to ERPNext doctypes
   - Import via ERPNext Data Import tool or API scripts

### Deliverable
KrewPact live with real MDM data. Tests passing. Team can start using it.

---

## Blockers to Resolve Before Session 1

| Blocker | Owner | Action |
|---------|-------|--------|
| Supabase cloud instance | Michael | Create on supabase.com, share credentials |
| Clerk JWT template | Michael | Configure in Clerk dashboard |
| ERPNext instance URL | Michael/David | Verify Cloudflare Tunnel or direct access |
| Domain email (@mdmconstruction.com) | Michael | Verify Clerk can auth with actual MDM emails |
| Vercel project for KrewPact | Michael | Create on company Vercel account |

---

## Session Order Priority

```
Session 1 (Infra)     → REQUIRED first, unblocks everything
Session 2 (Schema)    → REQUIRED second, tables before pages
Session 3 (Projects)  → Core value — this is when KrewPact becomes usable
Session 4 (CRM+More)  → Fills out the rest of the app
Session 5 (ERPNext)   → The bridge to accounting/finance
Session 6 (Ship)      → Data, tests, deploy
```

Each session is ~2-4 hours of focused work. Sessions 1-3 are the critical path to "live with pages and connected to database." Sessions 4-6 add ERP integration and production readiness.
