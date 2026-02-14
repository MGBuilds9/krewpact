# KrewPact Production Execution Board

## Objective
Deliver a production-grade unified construction operations platform with ERPNext-first architecture in an aggressive 14-week program, including full historical migration and cutover.

## Delivery Streams
- Product and Process: PRD, UAT scope, training, cutover runbook
- Frontend and UX: Internal app + client/trade portals + offline flows
- Backend and Platform: APIs, workflows, queueing, security, observability
- ERP and Integrations: ERPNext mappings, BoldSign, ADP, payments, migration connectors
- Data Migration: extraction, transform, load, reconciliation, signoff
- Governance and Compliance: privacy operations, master data stewardship, BCP/DR readiness
- QA and Release: automation, regression, performance, release gating

## Team Ownership Matrix
| Stream | Primary Owner | Supporting Roles |
|---|---|---|
| Product and Process | Product Lead | Ops sponsor, Finance lead, PMO |
| Frontend and UX | FE Lead | UX designer, QA automation |
| Backend and Platform | BE Lead | Platform engineer, Security engineer |
| ERP and Integrations | ERP Lead | Integration engineer, Finance analyst |
| Data Migration | Data Migration Lead | DBA, QA, Business SMEs |
| Governance and Compliance | Security/Compliance Lead | Privacy officer, Data steward, Legal/ops |
| QA and Release | QA Lead | FE/BE engineers, SRE |

## Dependency Legend
- `CP`: Critical path dependency
- `EXT`: External dependency (vendor/customer/infra)
- `INT`: Internal dependency

## Phase 0 (Week 0): Mobilization and Readiness
### Deliverables
- [ ] Final scope lock and acceptance matrix
- [ ] Environment readiness (`dev`, `staging`, `prod`) with secret management
- [ ] ERPNext private bench validated for custom app deployment
- [ ] Integration credentials secured (BoldSign, ADP, Microsoft, payment gateway)
- [ ] RACI and escalation paths finalized

### Dependencies
- `EXT`: Infra and vendor credentials
- `INT`: Sponsor availability for scope lock

### Exit Gate
- [ ] Program kickoff signoff by Product, Engineering, ERP, Finance

---

## Phase 1 (Weeks 1-2): Foundation and Hardening
### Product and Process
- [ ] Detailed module acceptance criteria approved
- [ ] Change control process and release policy defined
- [ ] Master data governance charter (cost codes/reference data/approval matrices) ratified

### Frontend and UX
- [ ] App shell hardening and route policy guard integration
- [ ] Shared component standards (states, forms, accessibility)

### Backend and Platform
- [ ] Canonical schema implementation migration (from SQL draft)
- [ ] Auth claim mapping and RBAC policy middleware
- [ ] Queue infrastructure and job runner scaffolding
- [ ] Webhook ingestion framework + idempotency layer
- [ ] Observability baseline (metrics, logs, traces)
- [ ] Governance tables and policy hooks wired (privacy requests, compliance docs, reference data)

### ERP and Integrations
- [ ] ERPNext connection and service account setup
- [ ] Integration contract definitions and mapping docs
- [ ] Cost code mapping framework agreed between ERPNext and KrewPact

### Data Migration
- [ ] Source inventory and field-level mapping workbook
- [ ] Migration dry-run pipeline skeleton

### QA and Release
- [ ] Baseline test harness and CI quality gates
- [ ] Security baseline scans and dependency remediation backlog
- [ ] Governance baseline tests (retention policy checks, PII masking checks)

### Dependencies
- `CP-INT`: RBAC middleware before protected module APIs
- `CP-EXT`: ERP and vendor keys before integration tests

### Exit Gate
- [ ] Secure foundation checklist completed

---

## Phase 2 (Weeks 3-4): CRM + Estimating + Contracting
### Product and Process
- [ ] Lead/opportunity workflow approval and SOP draft
- [ ] Estimating conventions and pricing governance policy
- [ ] Procurement thresholds and bid-evaluation policy approved

### Frontend and UX
- [ ] CRM views (lead board, opportunity detail, activities)
- [ ] Estimate builder UX with assemblies/templates
- [ ] Proposal and contract workflows with status timeline

### Backend and Platform
- [ ] CRM APIs and stage history engine
- [ ] Estimating service (pricing, markups, alternates, allowances)
- [ ] Proposal generation service and contract payload lock
- [ ] Cost code dictionary and mapping APIs available for estimating and finance modules

### ERP and Integrations
- [ ] BoldSign adapter and webhook processing
- [ ] Contract artifact storage and checksum tracking

### Data Migration
- [ ] Sage CRM and estimate historical import (batch 1)

### QA and Release
- [ ] E2E flow: Lead -> Estimate -> Proposal -> E-sign
- [ ] Regression suite v1
- [ ] Cost-code mapping validation scenarios added to integration pack

### Dependencies
- `CP-INT`: Estimating service before proposal generation
- `CP-EXT`: BoldSign webhook verification in staging

### Exit Gate
- [ ] Pilot division can execute sales-to-contract flow in staging

---

## Phase 3 (Weeks 5-6): Project Execution Core
### Product and Process
- [ ] Standard PM templates and governance rules finalized
- [ ] Daily log and field reporting SOP approved

### Frontend and UX
- [ ] Project setup, milestones, tasks, dependencies
- [ ] Schedule calendar and conflict indicators
- [ ] Daily logs and site diary views

### Backend and Platform
- [ ] Project/task API and dependency validation
- [ ] Workflow transitions and SLA timers
- [ ] Audit event capture for project-critical actions

### ERP and Integrations
- [ ] Project ID mapping to ERPNext project records (non-financial)

### Data Migration
- [ ] Active + historical project and task import (batch 2)

### QA and Release
- [ ] E2E flow: Contract -> Project -> Task -> Daily Log
- [ ] Load test for project/timeline queries

### Dependencies
- `CP-INT`: Contract conversion before project creation automation
- `INT`: Timeline conflict engine before schedule rollout

### Exit Gate
- [ ] Project execution core accepted by PM + field supervisor pilots

---

## Phase 4 (Weeks 7-8): Docs, RFI/Submittals, Change Orders, Portals, Procurement
### Product and Process
- [ ] Document retention and portal visibility policy finalized
- [ ] RFI/submittal escalation policy approved
- [ ] RFQ and bid leveling policy approved (including award authority matrix)
- [ ] Trade compliance enforcement policy approved (assignment/payment gates)

### Frontend and UX
- [ ] Document manager with versioning and metadata
- [ ] RFI/submittal interfaces and status timelines
- [ ] Change request/order UIs
- [ ] Client portal and trade portal v1
- [ ] RFQ package builder, bid intake inbox, bid comparison workspace
- [ ] Trade compliance dashboard (expiry alerts, eligibility status)

### Backend and Platform
- [ ] File APIs (folders, versions, shares, visibility)
- [ ] RFI/submittal workflow APIs
- [ ] CO workflow and budget impact service hooks
- [ ] Portal permission engine
- [ ] RFQ/bid services, leveling engine, and award workflow APIs
- [ ] Compliance gate engine tied to project assignment + procurement workflow states

### ERP and Integrations
- [ ] CO approval events queued for ERP budget sync
- [ ] RFQ award to ERP PO draft handoff mapping implemented

### Data Migration
- [ ] SMB + OneDrive bulk file import (wave 1)
- [ ] Portal-facing file classification and ACL mapping
- [ ] Legacy vendor registry and compliance document migration (wave 1)

### QA and Release
- [ ] E2E flow: RFI lifecycle, submittal lifecycle, CO lifecycle
- [ ] Portal access-control security test pack
- [ ] E2E flow: RFQ -> Bid -> Leveling -> Award -> PO draft handoff
- [ ] Compliance gate regression: expired insurance/license blocks assignment and payment release

### Dependencies
- `CP-INT`: Portal permission engine before external user onboarding
- `CP-EXT`: Microsoft API rate and access constraints for file migration
- `CP-INT`: Compliance gate engine before trade portal general rollout

### Exit Gate
- [ ] External portal beta with controlled user cohort
- [ ] Procurement + compliance workflow pilot accepted by PM and operations

---

## Phase 5 (Weeks 9-10): Time/Expense + Finance Integration + Selections
### Product and Process
- [ ] Payroll policy, approval hierarchy, and cutoff rules signed off
- [ ] AR/AP operating procedures agreed with finance
- [ ] Client selections and allowance variance SOP signed off

### Frontend and UX
- [ ] Time entry and timesheet approvals
- [ ] Expense capture and approval flows
- [ ] Invoice visibility and payment link UX
- [ ] Client selection center and PM allowance reconciliation view

### Backend and Platform
- [ ] Time/expense services and policy checks
- [ ] ERP sync jobs for AR/AP/PO snapshots
- [ ] Job-cost snapshot generation jobs
- [ ] Selection sheets, option choices, and allowance reconciliation services

### ERP and Integrations
- [ ] ERPNext document mapping (Invoices, POs, AP records)
- [ ] ADP nightly sync + CSV fallback pipeline
- [ ] Payment link injection and status callbacks
- [ ] Selection allowance variance mapped to change-order and PO adjustment paths

### Data Migration
- [ ] Historical financial references import (read models)
- [ ] Historical selections and allowance balances import (where available)

### QA and Release
- [ ] E2E flow: Time -> Approval -> ADP export
- [ ] E2E flow: Expense -> Approval -> ERP posting
- [ ] E2E flow: Invoice issued -> payment update
- [ ] E2E flow: Selection submitted -> allowance variance -> approval -> budget update

### Dependencies
- `CP-EXT`: ADP integration credentials and schema mapping
- `CP-INT`: ERP sync reliability and retries before finance UAT
- `CP-INT`: Cost code dictionary freeze before production finance reports

### Exit Gate
- [ ] Finance and payroll UAT signoff in staging
- [ ] Selection/allowance workflow accepted by PM + client pilot

---

## Phase 6 (Weeks 11-12): Full Historical Migration + Dual Run + Closeout Readiness
### Product and Process
- [ ] Business validation scorecards finalized
- [ ] Cutover communication plan published
- [ ] Closeout, deficiency, and warranty SOP finalized
- [ ] Privacy incident and BCP runbook approved

### Frontend and UX
- [ ] Historical record browsing and legacy links
- [ ] Admin migration conflict resolution UI
- [ ] Closeout package workspace and warranty/service console
- [ ] Privacy request admin console and policy status dashboard

### Backend and Platform
- [ ] Migration orchestration jobs at scale
- [ ] Conflict queues and automated validation checks
- [ ] Reconciliation reporting APIs
- [ ] Closeout/warranty services with SLA timers and escalation rules
- [ ] Privacy request lifecycle service + retention/legal hold jobs
- [ ] Product telemetry pipeline and adoption KPI aggregation jobs

### ERP and Integrations
- [ ] Final ERP sync parity checks
- [ ] Warranty/service call cost mapping to ERP project/job-cost references

### Data Migration
- [ ] Full historical import waves complete
- [ ] Delta sync active through dual-run period
- [ ] Reconciliation by module signed off
- [ ] Historical closeout and deficiency records migrated (if present)

### QA and Release
- [ ] Full regression and performance campaign
- [ ] Security and resilience drills
- [ ] BCP/DR simulation drills with documented evidence
- [ ] Privacy SLA and data lifecycle compliance test pack

### Dependencies
- `CP-INT`: Reconciliation signoff before go-live decision
- `CP-EXT`: Legacy system export access continuity
- `CP-INT`: Privacy and BCP signoff before final go-live approval board

### Exit Gate
- [ ] Go-live readiness review approved
- [ ] Privacy + BCP + closeout readiness accepted by governance owners

---

## Phase 7 (Weeks 13-14): Cutover + Hypercare
### Cutover Activities
- [ ] Freeze writes in legacy systems
- [ ] Run final delta sync and validation
- [ ] Switch production routing and user access
- [ ] Activate hypercare command center

### Hypercare Work
- [ ] Daily defect triage and patch trains
- [ ] Monitoring thresholds tuning
- [ ] User training and adoption support
- [ ] Final decommission checklist
- [ ] Compliance expiry queue monitoring and intervention
- [ ] Warranty/service backlog stabilization and SLA tracking

### Exit Gate
- [ ] Stable operations for 2 consecutive weeks
- [ ] Decommission recommendation approved

---

## Critical Path (Must-Hit Milestones)
1. Foundation security + schema + queue scaffolding complete by end of Week 2.
2. Sales-to-contract flow (including e-sign) stable by end of Week 4.
3. Project execution + docs + CO + RFQ/compliance workflows stable by end of Week 8.
4. ERP finance sync + ADP integration + selections/allowance reconciliation stable by end of Week 10.
5. Historical migration reconciliation + privacy/BCP readiness complete by end of Week 12.
6. Cutover with no P0/P1 open issues and compliance gates active by Week 13.

## Risk Register
| Risk | Probability | Impact | Mitigation | Owner |
|---|---|---|---|---|
| ERP mapping complexity under-estimated | Medium | High | Freeze mapping specs by Week 2; weekly finance-ERP reviews | ERP Lead |
| Historical data quality issues | High | High | Early profiling, conflict queues, SME signoff gates | Migration Lead |
| External API constraints (ADP/Microsoft/BoldSign) | Medium | High | Sandbox rehearsals + retry architecture + fallbacks | Integration Lead |
| Scope creep in aggressive timeline | High | High | Strict change control and phase-based scope lock | Product Lead |
| Security findings late in cycle | Medium | High | Security scans in each phase gate, not end-only | Security Lead |
| Trade compliance data incomplete/expired at go-live | Medium | High | Pre-cutover compliance audits + automated expiry alerting + assignment/payment blocks | Ops + Compliance Lead |
| Privacy request workflows fail SLA under production load | Medium | Medium | Load-test privacy workflow + staffing model and escalation playbook | Compliance Lead |

## Week-by-Week Board (Execution Detail)
| Week | Must Deliver | Dependencies | Gate |
|---|---|---|---|
| 1 | Infra/security baseline, auth policy middleware, schema migration start | Env + credentials | Security readiness |
| 2 | Queue/webhook/idempotency, migration framework dry run | Week 1 complete | Foundation complete |
| 3 | CRM APIs + UI, activity timeline | Week 2 | CRM smoke pass |
| 4 | Estimating/proposals/contracts + BoldSign | Week 3 + BoldSign | Sales flow accepted |
| 5 | Project setup/tasks/schedule core | Week 4 | PM workflow accepted |
| 6 | Daily logs/site diary + audit lineage | Week 5 | Field flow accepted |
| 7 | Docs/versioning + RFI/submittals + RFQ package workflows | Week 6 | Document/procurement control accepted |
| 8 | Change orders + portal beta + bid leveling + compliance gating | Week 7 | External beta and procurement gate |
| 9 | Time/expense module + approvals + client selections | Week 8 | Ops/payroll/PM smoke |
| 10 | ERP AR/AP/PO sync + ADP nightly + payment links + allowance reconciliation | Week 9 + external APIs | Finance UAT pass |
| 11 | Full historical migration wave + delta sync + closeout/warranty readiness | Week 10 | Reconciliation wave 1 |
| 12 | Reconciliation completion + privacy/BCP drills + go-live rehearsal | Week 11 | Go-live ready |
| 13 | Final cutover + hypercare launch | Week 12 | Production switch |
| 14 | Hypercare stabilization + decommission plan | Week 13 | Stabilization signoff |

## Release Gates (Hard Stops)
- Gate A (End Week 2): Security and architecture hardening complete
- Gate B (End Week 4): Sales-to-contract production-ready in staging
- Gate C (End Week 8): Delivery operations + portal + procurement/compliance workflows accepted
- Gate D (End Week 10): Financial integrations + selections/allowances accepted by finance/payroll/PM
- Gate E (End Week 12): Migration/reconciliation + privacy/BCP signed off
- Gate F (Go-Live): Production launch approval board signoff

## Mandatory Acceptance Metrics
- [ ] P0 defects = 0 before each phase gate
- [ ] P1 defects <= approved threshold before gate advancement
- [ ] UAT pass rate >= 95% on gate scope
- [ ] ERP sync success rate >= 99% over 7 days pre-cutover
- [ ] Queue dead-letter rate <= 0.5% with active remediation
- [ ] RPO <= 15 minutes and validated restore drills
- [ ] Trade partner compliance coverage >= 99% for active assignments
- [ ] Privacy request SLA adherence >= 95% in pilot + pre-live simulations
- [ ] Active-user adoption threshold met for PM/Field/Accounting roles per rollout targets

## Operational Handover Checklist
- [ ] On-call rotations and escalation tree active
- [ ] Runbooks for top 20 incidents completed
- [ ] Dashboard ownership assigned by stream
- [ ] Support team trained on admin and troubleshooting tools
- [ ] Executive KPI dashboards and cadence finalized
- [ ] Privacy operations owner and legal-hold process activated
- [ ] Master data stewards assigned (cost codes, workflow templates, reference sets)
- [ ] Warranty/service support workflow handed off with SLA dashboard ownership
