# KrewPact Architecture Resolution Document

**Created:** February 10, 2026
**Purpose:** Resolve all contradictions, gaps, and risks identified in the planning pack before writing code.
**Status:** LOCKED DECISIONS — all items below are resolved unless marked ⬜ (pending user action).

---

## Locked Architecture Decisions

These override any contradicting statements in other planning docs.

| #   | Decision             | Resolution                                                                                                                                                                                      | Docs Affected                                            |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| D1  | Supabase hosting     | **Managed cloud (Pro tier)** for MVP. Migration path to self-hosted documented for future Canadian data residency.                                                                              | ADR-003 ✅, Infrastructure ❌ (update), Cost Analysis ✅ |
| D2  | Domain               | **krewpact.com** unified. All `.io` and `.internal` references updated. ERPNext stays at `erp.mdmgroupinc.ca`.                                                                                  | Infrastructure, Security, Integration Contracts          |
| D3  | BFF architecture     | **Hybrid**: Vercel API routes for user-facing requests. Cloudflare Tunnel exposes ERPNext (configurable endpoint, not hardcoded to Proxmox). BullMQ workers run on the same machine as ERPNext. | ADR-002, Access Plan, Infrastructure                     |
| D4  | Redis                | **Upstash** for BullMQ queue (Vercel-reachable). Self-hosted Redis optional for local caching only.                                                                                             | Access Plan, Infrastructure                              |
| D5  | Canonical role model | **PRD roles are canonical** (9 internal + 4 external). Security Framework role model is retired.                                                                                                | Security Framework, PRD                                  |
| D6  | ERPNext connectivity | **Cloudflare Tunnel** from ERPNext host. ERPNext install is configurable (any Linux machine, not hardcoded to Proxmox). Tunnel URL stored as env var.                                           | Infrastructure, Integration Contracts                    |
| D7  | Data residency       | **Accepted: US-hosted** for Clerk + managed Supabase with PIPEDA disclosure. Canadian migration path documented. ERPNext stays Canadian (on-prem).                                              | Security, Licensing                                      |
| D8  | 2-phase commit       | **Removed.** Actual pattern: eventual consistency with idempotent upsert, retry, dead-letter, compensating transactions.                                                                        | Integration Contracts                                    |
| D9  | n8n                  | **Removed from architecture.** BullMQ + BFF handle all orchestration. n8n CT removed from infrastructure allocation.                                                                            | Infrastructure                                           |
| D10 | Monitoring (MVP)     | **Vercel Analytics + Supabase Dashboard + BetterStack uptime** for MVP. Full Prometheus/Loki/Grafana stack deferred to post-launch.                                                             | Monitoring doc (deferred, not deleted)                   |
| D11 | Microsoft Graph      | **Deferred to post-MVP.** Email notifications via Resend. No calendar/OneDrive integration at launch.                                                                                           | Access Plan, build sequence                              |
| D12 | Uptime SLA           | **99.5%** for MVP (single-node). 99.9% target after second node or cloud migration.                                                                                                             | Master Plan, Infrastructure                              |

---

## Issue Resolution Detail

### CRITICAL — Resolved

#### C1: Supabase Managed vs Self-Hosted

**Decision:** Managed Supabase Pro tier for MVP.
**Rationale:** ADR-003 explicitly chose managed and rejected self-hosting. Solo developer cannot maintain PostgreSQL operations (backups, upgrades, pooling, replication) while building the product. $175-295/mo is negligible vs development cost.
**Migration path:** If PIPEDA enforcement requires Canadian data residency, migrate to self-hosted Supabase on Proxmox using `supabase self-hosting` Docker setup. Schema and RLS policies are portable. Plan 2-week migration window.
**Action:** Remove Supabase VM from Infrastructure doc's Proxmox allocation matrix. Update VLAN 30 to "reserved for future DB self-hosting."

#### C2: Vercel ↔ ERPNext Connectivity

**Decision:** Cloudflare Tunnel.
**How it works:**

1. Install `cloudflared` on the machine running ERPNext (any Linux host)
2. Create tunnel: `cloudflared tunnel create krewpact-erp`
3. Route: `erp-api.krewpact.com` → `localhost:8000` (ERPNext)
4. Vercel API routes call `https://erp-api.krewpact.com` with API key auth
5. No public IP exposed. Cloudflare handles TLS. Zero-trust maintained.

**Env var:** `ERPNEXT_BASE_URL=https://erp-api.krewpact.com` — configurable per deployment. Not every user needs Proxmox; any Linux machine with `cloudflared` works.
**Action:** Update Infrastructure doc to document Cloudflare Tunnel setup. Remove Tailscale as primary connectivity method for Vercel→ERPNext (Tailscale remains for SSH admin access).

#### C3: Redis / Queue Strategy

**Decision:** Upstash Redis for BullMQ. Self-hosted Redis removed from required infrastructure.
**Rationale:** Vercel API routes need to enqueue jobs (sync triggers, webhook processing). Upstash provides REST API reachable from serverless. BullMQ workers run on the ERPNext host machine and connect to Upstash over HTTPS.
**Cost:** Upstash Pay-as-you-go: ~$0.20/100K commands. At 300 users, estimate $10-30/mo.
**Action:** Remove Redis CT from Infrastructure allocation. Add Upstash to Cost Analysis. Update Integration Contracts queue config.

#### C4: Role Model Unification

**Decision:** PRD roles are canonical. Security Framework updated to match.

**Canonical roles (13 total):**

| Role Key              | Type     | Replaces (Security Doc)                     |
| --------------------- | -------- | ------------------------------------------- |
| `platform_admin`      | Internal | Super Admin                                 |
| `executive`           | Internal | Report Viewer (expanded)                    |
| `operations_manager`  | Internal | Operations Manager ✅                       |
| `project_manager`     | Internal | Project Manager ✅                          |
| `project_coordinator` | Internal | _(new — was missing)_                       |
| `estimator`           | Internal | _(new — was missing)_                       |
| `field_supervisor`    | Internal | Safety Officer (expanded)                   |
| `accounting`          | Internal | Finance Manager + Finance Reviewer (merged) |
| `payroll_admin`       | Internal | HR Manager (narrowed)                       |
| `client_owner`        | External | Client Portal User ✅                       |
| `client_delegate`     | External | Document Reviewer (renamed)                 |
| `trade_partner_admin` | External | Trade Partner Portal User (expanded)        |
| `trade_partner_user`  | External | Lien Claimant (expanded)                    |

**Action:** Rewrite Security Framework §2.3 permission matrix using PRD role keys. Update SQL schema `roles` seed data.

#### C5: Data Residency Map

**Decision:** Document and disclose. Accept US-hosted services for MVP.

| Service            | Data Stored                           | Location               | PIPEDA Impact                                        |
| ------------------ | ------------------------------------- | ---------------------- | ---------------------------------------------------- |
| Clerk              | Auth credentials, sessions, MFA       | US                     | Disclose in privacy policy. DPA with Clerk.          |
| Supabase (managed) | All operational data, PII, financials | US (or nearest region) | Disclose. Field-level encryption for SIN/banking.    |
| Vercel             | No persistent data (SSR cache only)   | US edge                | Low risk — no PII stored.                            |
| ERPNext            | Financial records, GL, invoices       | Canadian (on-prem)     | Compliant ✅                                         |
| BoldSign           | Signed documents, signatures          | US (Syncfusion cloud)  | Disclose. Copies stored in Supabase.                 |
| Upstash            | Queue messages (transient)            | US                     | Low risk — transient data, no PII in queue payloads. |

**Mitigation:**

- Privacy policy explicitly states auth data and operational data hosted in US
- Field-level encryption (AES-256) for SIN numbers, banking info, and sensitive PII
- All signed contract copies stored in Supabase Storage (same region as DB)
- If Canadian Supabase region becomes available, migrate
- If PIPEDA enforcement tightens, execute self-hosted migration plan

**Action:** Add data residency table to Security Framework §3.4 and Licensing §4.5.

#### C6: Domain Unification

**Decision:** `krewpact.com` for everything.

| Subdomain              | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `app.krewpact.com`     | Main application (Vercel)                                      |
| `portal.krewpact.com`  | Client/trade portal (Vercel, same app, different auth context) |
| `erp-api.krewpact.com` | ERPNext API via Cloudflare Tunnel                              |
| `erp.mdmgroupinc.ca`   | ERPNext admin UI (internal only, Tailscale)                    |
| `api.krewpact.com`     | BFF API (Vercel API routes) — same deployment as app           |

**Action:** Find-and-replace `krewpact.io` → `krewpact.com` across all docs. Update Infrastructure DNS section. Update Security doc redirect URIs.

#### C7: Clerk → Supabase JWT Bridge

**Decision:** Use Supabase's custom JWT verification with Clerk-issued JWTs.

**Implementation:**

1. Configure Clerk JWT template to include Supabase-compatible claims:
   ```json
   {
     "sub": "{{user.id}}",
     "role": "authenticated",
     "krewpact_user_id": "{{user.public_metadata.krewpact_user_id}}",
     "krewpact_divisions": "{{user.public_metadata.division_ids}}",
     "krewpact_roles": "{{user.public_metadata.role_keys}}"
   }
   ```
2. Set Supabase JWT secret to Clerk's JWT signing key
3. RLS policies use `auth.jwt() ->> 'krewpact_user_id'` instead of `auth.uid()`
4. Division filtering uses `auth.jwt() -> 'krewpact_divisions'` (JSONB array)
5. **No subquery per row** — claims are in the JWT, evaluated once per request

**RLS pattern (optimized):**

```sql
CREATE POLICY division_isolation ON projects
  FOR SELECT USING (
    division_id::text = ANY(
      string_to_array(auth.jwt() ->> 'krewpact_divisions', ',')
    )
  );
```

**Action:** Update Security Framework §2.4 RLS examples. Document Clerk JWT template config in Access Plan.

---

### HIGH — Resolved

#### H1: Timeline & MVP Scope

**Decision:** Redefine scope into P0 (MVP), P1 (fast-follow), P2 (future).

**MVP = Replace fragmented manual workflows with a unified platform. Nothing more.**

**P0 — MVP (12 weeks, target)**

| Epic                   | Features                                                   | Why P0                                  |
| ---------------------- | ---------------------------------------------------------- | --------------------------------------- |
| 1. Identity & Access   | Auth, RBAC, divisions                                      | Foundation — everything depends on this |
| 2. CRM                 | Leads, opportunities, accounts, contacts                   | Sales pipeline is daily workflow        |
| 3. Estimating          | Basic estimate builder, line items, templates              | Core revenue workflow                   |
| 4. Contracting         | Proposals, e-sign (BoldSign), contract tracking            | Closes deals                            |
| 5. Project Setup       | Project creation from contract, members, milestones        | Execution starting point                |
| 6. Project Execution   | Tasks, daily logs, basic document upload                   | Daily PM workflow                       |
| 7. ERPNext Sync (Core) | Customers, projects, estimates→quotations, invoices (read) | Finance bridge                          |

**Features: ~25 | Endpoints: ~40 | Forms: ~30 | ERPNext mappings: ~12**

**P1 — Fast Follow (weeks 13-20)**

| Epic                    | Features                                                |
| ----------------------- | ------------------------------------------------------- |
| Change Management       | Change orders, RFIs, submittals                         |
| Documents & Media       | Versioning, folders, portal publishing                  |
| Time & Expense          | Time entries, expense claims, approval workflows        |
| Client Portal           | Project visibility, document access, approval responses |
| ERPNext Sync (Extended) | POs, AP/AR invoices, payment entries                    |

**P2 — Future**

| Epic                    | Features                                            |
| ----------------------- | --------------------------------------------------- |
| Trade Portal            | Compliance docs, bid submissions, scope acceptance  |
| Procurement             | RFQ/bid/award workflows                             |
| Selections & Allowances | Client selections, allowance reconciliation         |
| Offline-First           | Local DB, background sync, conflict resolution      |
| ADP Integration         | Payroll export/sync                                 |
| Closeout & Warranty     | Deficiency tracking, warranty items, service calls  |
| Advanced Estimating     | Assemblies, cost catalog, markup engine, alternates |
| Historical Migration    | Sage data import, reconciliation                    |
| Full Monitoring         | Prometheus/Loki/Grafana stack                       |
| Microsoft 365           | Email, calendar, OneDrive integration               |

**Action:** Update Execution Board with P0/P1/P2 phasing. Remove 14-week-for-everything timeline.

#### H2: Offline-First Strategy

**Decision:** Defer offline to P2. For MVP, the app is online-only with graceful degradation.
**P2 approach:** Use Capacitor + SQLite for offline-capable mobile shell. Keep RSC for desktop. Don't fight the App Router — separate the offline experience.
**Action:** Move Epic 8 (Field Operations & Offline) to P2. Daily logs in P0 are online-only.

#### H3: Single-Node Uptime

**Decision:** Reduce SLA to 99.5% for MVP. Document upgrade path.
**99.5% = 43.8 hours downtime/year** — realistic for single-node + ISP outages.
**Upgrade path:** Add Proxmox cluster node ($2-3K hardware) post-launch for HA. Or migrate ERPNext to managed cloud (ERPNext Cloud at $50/mo).
**Action:** Update Master Plan uptime target. Update Infrastructure doc with upgrade path.

#### H4: 2-Phase Commit Removed

**Decision:** Replace with accurate description.
**Actual pattern:** Eventual consistency. Outbox pattern: KrewPact writes to Supabase + enqueues sync job. Worker reads from outbox, pushes to ERPNext with idempotency key. If ERPNext fails, job retries with exponential backoff. After max retries, dead-letter for manual review. Compensating transaction reverses Supabase state if needed.
**Action:** Update Integration Contracts §2.2.

#### H5: Connection Pooling

**Decision:** Use Supabase's built-in connection pooler (Supavisor) in transaction mode.
**Implementation:** Use `SUPABASE_DB_URL` with port 6543 (pooler) instead of 5432 (direct) for all Vercel serverless connections. Direct connections only from long-lived workers.
**Action:** Document in Access Plan env var section. Add to CLAUDE.md conventions.

#### H6: Schema Indexes

**Decision:** Add index migration file to be run immediately after base schema.

**Required indexes (minimum):**

```sql
-- Division scoping (used by every RLS policy)
CREATE INDEX idx_projects_division ON projects(division_id);
CREATE INDEX idx_estimates_division_status ON estimates(division_id, status);
CREATE INDEX idx_leads_division_stage ON leads(division_id, stage);
CREATE INDEX idx_accounts_division ON accounts(division_id);

-- Project scoping (most common query pattern)
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_daily_logs_project_date ON project_daily_logs(project_id, log_date);

-- CRM lookups
CREATE INDEX idx_contacts_account ON contacts(account_id);
CREATE INDEX idx_opportunities_account ON opportunities(account_id);
CREATE INDEX idx_activities_opportunity ON activities(opportunity_id);

-- Estimating
CREATE INDEX idx_estimate_lines_estimate ON estimate_lines(estimate_id);
CREATE INDEX idx_estimates_opportunity ON estimates(opportunity_id);

-- Contracting
CREATE INDEX idx_proposals_estimate ON proposals(estimate_id);
CREATE INDEX idx_contract_terms_proposal ON contract_terms(proposal_id);
CREATE INDEX idx_esign_envelopes_contract ON esign_envelopes(contract_id);

-- Sync
CREATE INDEX idx_erp_sync_map_entity ON erp_sync_map(entity_type, entity_id);
CREATE INDEX idx_erp_sync_jobs_status ON erp_sync_jobs(status, created_at);

-- Audit
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at);

-- User lookups
CREATE INDEX idx_user_divisions_user ON user_divisions(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
```

**Action:** Add `002_indexes.sql` migration file. Reference in schema doc.

#### H7: n8n Removed

**Decision:** n8n CT removed from infrastructure. All orchestration handled by BullMQ workers + BFF API routes.
**Action:** Remove n8n from Infrastructure VM/CT allocation matrix and boot sequence.

#### H8: BuildAxis → KrewPact Naming

**Decision:** Global find-and-replace across all docs.
**Known instances:**

- Integration Contracts webhook payload: `building_axis_id` → `krewpact_id`
- ANALYSIS-MANIFEST.txt: References "BuildAxis" throughout (this is a meta-document, acceptable)
- Possible others in Integration Contracts and ERPNext Doctype Mapping
  **Action:** Search all `.md` and `.sql` files for `BuildAxis`, `building_axis`, `buildaxis`, `build_axis` and replace.

---

### MEDIUM — Resolved

#### M1: Microsoft Graph Deferred

**Decision:** Cut from MVP. Email notifications use Resend ($0-20/mo). No calendar or file integration at launch.
**Action:** Remove from Access Plan build sequence Phase 0. Remove Azure AD env vars from MVP `.env.local` template (keep as commented-out for future).

#### M2: Monitoring Simplified

**Decision:** MVP monitoring stack:

- **Frontend:** Vercel Analytics (built-in, free)
- **Database:** Supabase Dashboard (built-in)
- **Uptime:** BetterStack or UptimeRobot ($0-20/mo)
- **Errors:** Sentry free tier (10K events/mo)
- **Logs:** Structured JSON to stdout, Vercel log drain

Full Prometheus/Loki/Grafana stack documented but deferred to post-launch.
**Action:** Update CLAUDE.md. Monitoring doc stays as future reference.

#### M3: AODA/WCAG Implementation

**Decision:** Add `axe-core` to test pipeline. Use Radix UI primitives (via shadcn/ui) which provide ARIA compliance. Manual accessibility audit before client portal launch (P1).
**CI integration:** `@axe-core/playwright` for E2E accessibility checks.
**Action:** Add to DevOps CI pipeline spec. Add a11y as cross-cutting acceptance criteria.

#### M4: Cost Analysis Updated

**Decision:** MVP monthly cost recalculated:

| Service             | Monthly Cost    |
| ------------------- | --------------- |
| Supabase Pro        | $175-295        |
| Vercel Pro          | $20             |
| Clerk               | $0 (free tier)  |
| BoldSign Hybrid     | $250            |
| Upstash Redis       | $10-30          |
| Resend (email)      | $0-20           |
| BetterStack         | $0-20           |
| Sentry              | $0              |
| Cloudflare (tunnel) | $0              |
| **Total SaaS**      | **$455-635/mo** |

Infrastructure (ERPNext host): existing hardware, $0 incremental.
**Action:** Update Cost Analysis with MVP-specific budget.

#### M5: MVP Feature List = Forms List

**Decision:** Only build forms for P0 features. ~30 forms, not 95+.
**P0 forms:** Lead form, opportunity form, account form, contact form, estimate builder, estimate line editor, proposal form, contract form, project form, project member form, milestone form, task form, daily log form, document upload, user profile, division management, role assignment, permission config, settings pages.
**Action:** Tag Forms Registry entries with P0/P1/P2.

#### M6: ERPNext Upgrade Path

**Decision:** Pin ERPNext to a specific version for MVP. Upgrade quarterly in staging first.
**Process:** 1) Pin version in Frappe Bench config. 2) Quarterly: upgrade staging, run integration tests, validate custom fields survive. 3) If clean: upgrade production. 4) If breaking: file issue, stay on current version.
**Action:** Add ERPNext version pinning to DevOps doc.

#### M7: ERPNext Test Instance

**Decision:** Run a second ERPNext instance for testing.
**Options (pick one during setup):**

- Docker container on dev machine (`bench --site test.localhost`)
- Separate Cloudflare Tunnel for test instance
- Frappe Cloud free tier for testing
  **Action:** Add to DevOps doc test infrastructure section.

#### M8: Forms & Validation Stack

**Decision:** React Hook Form + Zod for all forms. shadcn/ui form components.
**Pattern:** Zod schemas shared between client validation and API route validation. Single source of truth for form shape.
**Action:** Add to CLAUDE.md conventions.

---

## MVP Build Sequence (P0)

### Phase 0: Foundation (Week 1-2)

- [ ] Init Next.js 15 project with TypeScript, Tailwind, shadcn/ui
- [ ] Configure Clerk (email + M365 SSO)
- [ ] Create Supabase project, run base schema migration + indexes
- [ ] Set up Cloudflare Tunnel to ERPNext
- [ ] Build ERPNext API client (`lib/erp/client.ts`)
- [ ] ERPNext health check endpoint
- [ ] Upstash Redis connection + BullMQ setup
- [ ] Basic layout (sidebar nav, auth guard, dashboard shell)
- [ ] Clerk → Supabase JWT bridge (custom JWT template)
- [ ] RLS policies for core tables (users, divisions, projects)
- [ ] CI pipeline (lint, typecheck, test, build)
- [ ] Deploy to Vercel (even if empty)

### Phase 1: CRM + Estimating (Weeks 3-6)

- [ ] Accounts, Contacts, Leads CRUD
- [ ] Opportunities pipeline with stage management
- [ ] Activity logging
- [ ] Estimate builder (line items, basic templates)
- [ ] Estimate versioning
- [ ] ERPNext sync: Customer ↔ Account, Quotation ← Estimate
- [ ] Email notifications via Resend (estimate sent, status changes)

### Phase 2: Contracting + Project Setup (Weeks 7-9)

- [ ] Proposal generation from estimate
- [ ] BoldSign e-signature integration
- [ ] Contract tracking and status
- [ ] Project creation from signed contract
- [ ] Project members and role assignment
- [ ] Milestone management
- [ ] ERPNext sync: Sales Order ← Contract, Project ↔ Project

### Phase 3: Execution + Go-Live (Weeks 10-12)

- [ ] Task management (CRUD, assignment, status)
- [ ] Daily logs (online, form-based)
- [ ] Basic document upload (Supabase Storage)
- [ ] ERPNext sync: Invoice snapshots (read-only from ERPNext)
- [ ] Dashboard: project overview, pipeline metrics
- [ ] UAT with MDM Group pilot users
- [ ] Production deployment + monitoring setup
- [ ] Hypercare (bug fixes, performance tuning)

---

## Decisions Still Pending (User Action Required)

| #   | Question                                                          | Impact                     | When to Decide         |
| --- | ----------------------------------------------------------------- | -------------------------- | ---------------------- |
| P1  | Supabase region: US East or will Canadian region be available?    | Data residency             | Before `supabase init` |
| P2  | ERPNext host details: what machine, what OS, is Docker installed? | Cloudflare Tunnel setup    | Phase 0, Week 1        |
| P3  | Do you own krewpact.com? Is DNS on Cloudflare?                    | Domain setup               | Phase 0, Week 1        |
| P4  | BoldSign account created? API key available?                      | Can be deferred to Phase 2 | Week 7                 |
| P5  | Resend vs SendGrid for transactional email?                       | Email setup                | Phase 1                |
| P6  | Legal counsel budget for GPL review?                              | Risk mitigation            | Before white-label     |

---

## Document Update Tracker

| Document                    | Updates Needed                                                                                          | Status |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | ------ |
| Infrastructure & Deployment | Remove Supabase VM, remove n8n CT, add Cloudflare Tunnel, fix domain to .com, reduce uptime to 99.5%    | ⬜     |
| Integration Contracts       | Fix `building_axis_id`, remove 2PC, update ERPNext URL to tunnel, fix domain                            | ⬜     |
| Security Framework          | Rewrite §2.3 roles to PRD canonical, update §2.4 RLS to JWT-based, add data residency table, fix domain | ⬜     |
| Cost & Vendor Analysis      | Add Upstash, Resend, Sentry. Update Supabase to confirmed managed. Add MVP budget table.                | ⬜     |
| Access & Workflow Plan      | Resolve "Architecture decision needed" to Cloudflare Tunnel. Update env vars. Remove M365 from Phase 0. | ⬜     |
| Master Plan                 | Update uptime to 99.5%. Add P0/P1/P2 scope. Update timeline.                                            | ⬜     |
| Execution Board             | Rewrite with P0 12-week plan. Move P1/P2 to backlog.                                                    | ⬜     |
| Backend SQL Schema          | Add index migration. Verify role seed data matches canonical.                                           | ⬜     |
| Monitoring & Observability  | Mark as "post-launch reference." Add MVP monitoring section.                                            | ⬜     |
| CLAUDE.md                   | Update with all resolved decisions.                                                                     | ⬜     |
