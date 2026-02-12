# KrewPact Production Master Plan (A–Z)

## Summary
This is a decision-complete plan to replace JobTread with a production-grade mixed-GC platform in an aggressive 3–4 month program, using a **Hybrid ERPNext-first architecture**: ERPNext is finance/procurement/inventory source-of-truth; KrewPact is UX shell, field operations, portals, orchestration, identity, and reporting.
The plan includes full feature scope, backend data model, integration logic, API contracts, infra/security, migration, testing, and cutover.

## Companion Documents (Detailed Expansion)
1. Full feature/function PRD checklist:
   `/Users/mkgbuilds/Sites/Local Development/KrewPact/KrewPact/KrewPact-Feature-Function-PRD-Checklist.md`
2. Backend canonical SQL schema draft:
   `/Users/mkgbuilds/Sites/Local Development/KrewPact/KrewPact/KrewPact-Backend-SQL-Schema-Draft.sql`
3. Week-by-week execution board with dependencies and gates:
   `/Users/mkgbuilds/Sites/Local Development/KrewPact/KrewPact/KrewPact-Execution-Board.md`

## Blueprint Alignment
1. Existing blueprint references were checked against:
   `/Users/mkgbuilds/Sites/Local Development/KrewPact/docs/blueprints/krewpact-blueprint.html`
2. This V2 plan expands blueprint coverage to production-critical areas that are often missing from MVP blueprints: procurement RFQ/bid workflows, trade compliance gating, customer selections/allowances, closeout/warranty service, privacy operations, business continuity, and product telemetry/adoption.
3. Execution sequencing and acceptance gates in this package are intentionally stricter than the legacy blueprint to support production replacement of JobTread, not just feature parity demos.

## Locked Decisions (From Your Inputs)
1. System model: Hybrid ERPNext-first.
2. Timeline: 3–4 month aggressive rollout.
3. Hosting: Managed stack + private ERPNext bench.
4. Business focus: Mixed GC (residential + light commercial).
5. Day-1 replacement: Full core ops + basic finance.
6. Migration depth: Full historical migration.
7. Portals: Client portal + subcontractor/vendor portal at initial release.
8. Mobile: Offline capture for critical field flows.
9. Finance authority: ERPNext source of truth.
10. Tax/currency: Canada-first, CAD + GST/HST/PST.
11. Labor/payroll: Timesheets + ADP integration (nightly API + CSV fallback).
12. Estimating: Production-grade assemblies/templates.
13. Legacy sources: JobTread + spreadsheets + local SMB shares + OneDrive.
14. E-sign: BoldSign.
15. Payments: Invoice + external payment links.
16. Org model: Single legal company + divisions.
17. Scale target: Up to 300 internal users.
18. Reliability target: 99.5% uptime (MVP, single-node), 99.9% post-HA upgrade. RPO 15m, RTO 2h.
19. File migration: Phased bulk import + delta sync.

## Program Outcomes (What “Done” Means)
1. All core JobTread workflows run in KrewPact + ERPNext without daily reliance on JobTread.
2. Finance transactions post in ERPNext with reconciled project/job-cost reporting in KrewPact.
3. Field teams can submit daily logs, safety forms, photos, time, and expenses offline.
4. Client and trade partner portals are live with role-based access.
5. Historical data is searchable and auditable after migration.
6. Production SLOs and DR targets are operationally verifiable.

## Scope by Priority (Revised Feb 2026)

> **REVISED:** Original 14-week timeline for 70+ features was not realistic for solo+AI development.
> Scope is now prioritized P0/P1/P2. See `KrewPact-Architecture-Resolution.md` for full rationale.

### P0 — MVP (12 weeks target)
**Goal:** Replace JobTread's daily workflows. Nothing more.

| Phase | Weeks | Included |
|---|---|---|
| Foundation | 1-2 | Identity/RBAC, Clerk auth, Supabase schema, ERPNext client, Cloudflare Tunnel, app shell, CI/CD |
| CRM + Estimating | 3-6 | Leads, opportunities, accounts, contacts, estimate builder, templates, ERPNext sync (Customer, Quotation) |
| Contracting + Projects | 7-9 | Proposals, BoldSign e-sign, contract tracking, project creation, members, milestones, ERPNext sync (Sales Order, Project) |
| Execution + Go-Live | 10-12 | Tasks, daily logs, document upload, invoice snapshots (read), dashboard, UAT, production deploy |

**~25 features, ~40 endpoints, ~30 forms, ~12 ERPNext mappings**

### P1 — Fast Follow (Weeks 13-20)
Change orders, RFIs, submittals, document versioning, time/expense, client portal, extended ERPNext sync (POs, AP/AR invoices)

### P2 — Future
Trade portal, procurement RFQ, selections/allowances, offline-first, ADP integration, closeout/warranty, advanced estimating (assemblies, cost catalog), historical migration, full monitoring stack, Microsoft 365 integration

## Complete Feature List

See **KrewPact-Feature-Function-PRD-Checklist.md** for detailed enumeration of 70+ features across 16 epics, including acceptance criteria and role model.

High-level domain summary:
- Identity & Security (4 features)
- CRM & Pipeline (6 features)
- Estimating (8 features)
- Contracting (4 features)
- Project Setup (5 features)
- Project Execution (8 features)
- Change Management (3 features)
- Documents & Photos (6 features)
- Field Mobility (4 features)
- Procurement & Bids (4 features)
- Trade Compliance (2 features)
- Selections & Allowances (3 features)
- Financial Operations (6 features)
- Time & Payroll (3 features)
- Expense Management (3 features)
- Closeout & Warranty (4 features)
- Portals (4 features)
- Reporting & BI (3 features)
- Master Data & Admin Ops (4 features)
- Product Analytics (2 features)
- Privacy & Governance (2 features)
- Ops & Reliability (3 features)

## Target Architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Web App | React + TypeScript | Internal UI + portals + offline-capable PWA |
| API/BFF | Node/Edge service tier | Domain APIs, orchestration, validation, rate limits, policy enforcement |
| Operational DB | Supabase Postgres | Portal/ops data, workflow states, sync logs, denormalized reporting views |
| ERP Core | ERPNext private bench | Accounting, inventory, procurement, invoicing, payments integration points |
| Object Storage | Supabase Storage + CDN | Documents/photos/artifacts |
| Queue/Jobs | Redis-backed workers or managed queues | Sync pipelines, migration jobs, retries, webhooks |
| Identity | Clerk | Auth, SSO, session claims |
| Monitoring | OTEL collector + metrics/log backend | Traces, logs, SLO reporting |

## Backend Tables (Canonical Model)

| Group | Tables | Core Purpose |
|---|---|---|
| Identity/RBAC | `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `divisions`, `user_divisions`, `policy_overrides` | Access control and org structure |
| CRM | `accounts`, `contacts`, `leads`, `opportunities`, `opportunity_stage_history`, `activities` | Sales lifecycle |
| Estimating | `estimate_templates`, `assemblies`, `assembly_items`, `cost_catalog_items`, `estimates`, `estimate_lines`, `estimate_versions`, `estimate_alternates`, `estimate_allowances` | Estimation engine |
| Contracting | `proposals`, `proposal_events`, `esign_envelopes`, `esign_documents`, `contract_terms` | Proposal-to-contract |
| Projects | `projects`, `project_members`, `milestones`, `tasks`, `task_dependencies`, `task_comments`, `project_daily_logs`, `site_diary_entries` | Execution core |
| Change/RFI/Submittal | `change_requests`, `change_orders`, `rfi_items`, `rfi_threads`, `submittals`, `submittal_reviews` | Controlled approvals |
| Files/Media | `file_metadata`, `file_versions`, `file_folders`, `file_shares`, `project_files`, `photo_assets`, `photo_annotations` | Documents/photos lifecycle |
| Procurement & Compliance | `rfq_packages`, `rfq_invites`, `rfq_bids`, `bid_leveling_sessions`, `bid_leveling_entries`, `trade_partner_compliance_docs` | Procurement competition and compliance control |
| Selections & Cost Codes | `cost_code_dictionary`, `cost_code_mappings`, `selection_sheets`, `selection_options`, `selection_choices`, `allowance_reconciliations` | Financial classification and client selection governance |
| Field/Safety | `safety_forms`, `safety_incidents`, `toolbox_talks`, `inspections` | Compliance and safety |
| Time/Expense | `time_entries`, `timesheet_batches`, `expense_claims`, `expense_receipts`, `expense_approvals` | Labor and reimbursement |
| Financial Bridge | `erp_sync_map`, `erp_sync_jobs`, `erp_sync_events`, `erp_sync_errors`, `invoice_snapshots`, `po_snapshots`, `job_cost_snapshots` | ERP integration state and traceability |
| Closeout & Warranty | `closeout_packages`, `deficiency_items`, `warranty_items`, `service_calls`, `service_call_events` | Post-substantial completion lifecycle |
| Portal | `portal_accounts`, `portal_permissions`, `portal_messages`, `portal_view_logs` | External collaboration |
| Notifications/Audit | `notifications`, `notification_preferences`, `audit_logs`, `webhook_events`, `idempotency_keys` | Operational safety and traceability |
| Governance & Analytics | `privacy_requests`, `privacy_request_events`, `bcp_incidents`, `bcp_recovery_events`, `feature_usage_events`, `adoption_kpis` | Privacy, continuity, and product telemetry |
| Migration | `migration_batches`, `migration_records`, `migration_conflicts`, `migration_attachments` | Historical data migration and reconciliation |

## Backend Logic (Mandatory Services)
1. Auth/RBAC service: claim hydration, permission checks, division scoping, policy override evaluation.
2. Estimating service: pricing, markup engine, version diffing, alternate/allowance resolution, conversion to project baseline.
3. Workflow service: generic approval engine for CO/RFI/submittal/expense/timesheet with SLA timers.
4. Sync service (ERPNext): outbox/inbox pattern, idempotent upsert, retry with backoff, dead-letter handling.
5. File service: upload, scan, metadata extraction, versioning, secure link generation, portal publishing gates.
6. Offline sync service: client queue processing, optimistic writes, conflict strategy (`last_write_wins` for notes, merge policy for structured forms).
7. Notification service: event-driven email/in-app/push routing with user preferences.
8. Migration service: bulk importers (JobTread/CSV/SMB/OneDrive), dedupe, mapping, validation, reconciliation reports.

## Public APIs / Interfaces / Types (Important Additions)

| Interface Area | Required Contract |
|---|---|
| REST/GraphQL BFF | `/api/v1/leads`, `/opportunities`, `/estimates`, `/projects`, `/change-orders`, `/rfis`, `/submittals`, `/timesheets`, `/expenses`, `/portal/*`, `/reports/*` |
| Sync APIs | `/api/v1/integrations/erpnext/push`, `/pull`, `/reconcile`, `/sync-jobs/:id` |
| Webhooks | `boldsign.envelope.*`, `erpnext.doc.*`, `payment.*`, `adp.sync.*` |
| Type System | Shared TS package with `RBACClaim`, `EstimateDTO`, `ProjectDTO`, `WorkflowState`, `SyncEvent`, `PortalPermission`, `OfflineMutation`, `MigrationRecordStatus` |
| Event Schemas | Versioned JSON schemas for `EstimateApproved`, `ChangeOrderSigned`, `InvoiceIssued`, `TimesheetApproved`, `MigrationConflictDetected` |

## Integration Blueprint

| Integration | Pattern | Notes |
|---|---|---|
| ERPNext | API + queue-driven sync | ERP authoritative for AP/AR/PO/invoices/payments/accounting |
| BoldSign | API + webhook callbacks | Provider abstraction to swap vendors later |
| ADP | Nightly API sync + CSV fallback | Payroll continuity and auditable exports |
| Microsoft 365/OneDrive | Graph API ingestion + delta | Source migration and optional ongoing document sync |
| SMB Shares | Connector worker + checksum map | Batch import + delta watch until cutover |
| Payment Links | ERPNext invoice link embedding | External collection with ERP reconciliation |

## Security, Compliance, and Governance
1. Enforce JWT verification on all edge/server endpoints.
2. Remove static permissive CORS and use environment-specific allowlists.
3. Centralize secret management and rotation (30/90-day policies).
4. Encrypt sensitive PII fields at rest and in transit.
5. Apply RLS with deny-by-default and policy tests.
6. Implement tamper-evident audit logs for privileged actions.
7. Add rate limiting, anti-automation controls, and webhook signature verification.
8. Formalize data retention and legal hold rules for project/legal docs.

## Infrastructure and Scalability Plan

| Area | Production Design |
|---|---|
| Environments | `dev`, `staging`, `prod` isolated with separate secrets and data |
| CI/CD | Protected mainline, migration gates, automated smoke/regression checks |
| Compute | Managed web tier + autoscaled workers for queues/migration |
| Database | Supabase Postgres with PITR, read replicas for heavy reporting if needed |
| Storage | Versioned buckets, lifecycle policies, CDN edge caching |
| Resilience | Multi-AZ where available, graceful degradation paths |
| DR | Nightly restore tests, quarterly failover simulation, RPO/RTO validation |

## Data Migration Plan (Full Historical)
1. Discovery and mapping: canonical schema mapping for JobTread, spreadsheets, SMB, OneDrive.
2. Bulk historical import: oldest-to-newest batches with deterministic IDs and checksum dedupe.
3. Delta sync window: keep legacy and new system aligned during pilot.
4. Reconciliation: record counts, financial totals, doc hash parity, random sampling QA.
5. Sign-off gates: domain owner approval for sales, projects, finance, docs.
6. Final cutover: freeze writes in legacy, run final delta, switch users, monitor.
7. Legacy mode: read-only archive with deep links for compliance.

## Testing Plan (Required Scenarios)

| Test Layer | Scenarios |
|---|---|
| Unit | Pricing math, tax calculations (GST/HST/PST), workflow transitions, permission guards |
| Integration | Estimate→Project conversion, CO approval→ERP update, timesheet→ADP export |
| Contract | Webhook schema compatibility, API versioning, idempotency behavior |
| Security | RLS policy tests, privilege escalation attempts, webhook spoof tests |
| Data | Migration mapping validation, checksum parity, reconciliation tolerances |
| E2E Internal | Lead→Estimate→Sign→Project→Daily Logs→CO→Invoice flow |
| E2E Portal | Client approvals, document visibility boundaries, trade submission lifecycle |
| Offline | No-network capture, conflict resolution, sync recovery after reconnect |
| Performance | 300-user concurrency baseline, heavy document upload, queue backlog behavior |
| DR/Ops | Backup restore drills, worker crash recovery, alert routing validation |

## Cutover and Rollout Plan
1. Week 1–2: Foundation hardening, schema finalization, integration scaffolds, migration dry runs.
2. Week 3–4: CRM + estimating + proposals + BoldSign go-live for pilot division.
3. Week 5–6: Execution modules (tasks, logs, docs, RFI/submittal, CO) + offline beta.
4. Week 7–8: Portals + time/expense approvals + production migration wave 1.
5. Week 9–10: ERPNext finance sync, payment links, ADP nightly integration.
6. Week 11–12: Full historical migration finalization, dual-run validation, go-live gate.
7. Week 13–14: Hypercare, defect burndown, performance tuning, decommission plan.

## Go-Live Acceptance Criteria
1. 100% of day-1 critical workflows pass UAT and E2E checks.
2. Financial sync reconciliation variance under agreed threshold (target 0 critical mismatches).
3. Migration parity signed off by business owners.
4. 99.9% SLO dashboards and alerting operational.
5. No open P0/P1 security findings.
6. Support runbooks and on-call ownership active before cutover.

## Team and Delivery Model
1. Product stream: PM + solution architect + business analyst.
2. Engineering stream: frontend squad, backend/integration squad, data migration squad.
3. ERP stream: ERPNext functional consultant + customization engineer.
4. QA stream: automation + UAT coordinator.
5. Ops stream: DevOps/SRE + security lead.
6. Cadence: weekly steering, daily squad sync, biweekly release trains, formal go/no-go gates.

## Explicit Assumptions and Defaults
1. Single-company, division-based model is sufficient for initial launch.
2. No native payroll engine is built; ADP remains payroll system.
3. Digital takeoff is not in initial release unless separately approved.
4. BoldSign adapter abstraction is built to reduce vendor lock-in.
5. Payment links are externalized through finance integration, not custom payment ledger.
6. ERPNext private bench capacity is available for custom app and integrations.
7. Legacy systems remain readable during migration and dual-run.
8. Aggressive timeline assumes dedicated cross-functional team and fast stakeholder turnaround.
9. Trade partner compliance gates are enforced before assignment/payment workflows.
10. Closeout and warranty operations are included in initial production scope.
