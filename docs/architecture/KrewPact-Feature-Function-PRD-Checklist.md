# KrewPact Feature + Function PRD Checklist

## Document Purpose
This document is the detailed product requirements checklist for the production platform.
It expands the master plan into feature-level and function-level requirements, including acceptance criteria and role scope.

## Product Definition
- Product: KrewPact (production replacement for JobTread with ERPNext-first financial system-of-record)
- Company model: Single legal entity, multi-division operations
- Target: Mixed GC (residential + light commercial)
- Timeline: Aggressive 3-4 month phased rollout
- Launch user scale: up to 300 internal users + external client/trade users

### Product Scope vs. Legacy Blueprint

The V2 plan expands the legacy blueprint (which focused on MVP: Service Directory, Project Management, Document Management, Team Directory, Admin/RBAC) into a production platform covering 16 complete epics.

**Legacy Blueprint Coverage (Preserved & Expanded):**
- Service directory / unified access shell → Authenticated app shell + module routing + policy guards
- Project management → Full lifecycle with milestones, dependencies, logs, RFIs, submittals, COs
- Document management → Versioning, ACL, portal publishing, migration lineage
- Team directory + scheduling → Role model, assignments, calendars, crew/time workflows
- Admin panel + RBAC → Division-aware RBAC + audit + policy overrides

**Production-Critical Additions (New):**
- CRM and pipeline management (Leads, Opportunities, Activities, Source Tracking)
- Estimating engine (Assemblies, Cost Libraries, Labor/Material/Equipment Rates, Markups, Alternates, Allowances)
- Proposal-to-contract flow (E-sign via BoldSign, Immutable Contract Lineage)
- Procurement RFQ/bid/award workflows
- Trade compliance document gating (Insurance/WCB/WSIB/License Tracking, Expiry Alerts)
- Client selections and allowance reconciliation
- ERPNext AP/AR/PO/Invoice/Payment integration
- ADP payroll sync with fallback export
- Client and trade portals with external permission model
- Field offline workflows (logs, time, safety, photos)
- Historical migration and reconciliation framework
- Closeout/deficiency/warranty/service lifecycle
- Privacy operations (PIPEDA-aligned request lifecycle)
- Business continuity and DR validation
- Product telemetry and adoption metrics

**Out of Scope (Deferred):**
- Digital takeoff integration
- Advanced forecasting ML
- Native mobile shell (PWA baseline only)
- Deep BI warehouse beyond operational analytics

## Role Model (Canonical)
### Internal roles
- `platform_admin`: full system config, security, user management, integrations
- `executive`: business-wide reporting, approval overrides, strategic insights
- `operations_manager`: project oversight, schedule governance, workflow escalations
- `project_manager`: estimate ownership, project delivery, client comms, CO approvals
- `project_coordinator`: doc control, submittals, RFIs, meeting notes, procurement support
- `estimator`: estimate templates, pricing assemblies, proposal generation
- `field_supervisor`: daily logs, crew management, safety forms, site photos
- `accounting`: AR/AP workflows, invoice reviews, payment reconciliation
- `payroll_admin`: labor export review and ADP synchronization monitoring

### External roles
- `client_owner`: contract, CO approvals, selected project document visibility, payment access
- `client_delegate`: restricted view/comment/approval permissions by project policy
- `trade_partner_admin`: manages own company users, submissions, compliance docs
- `trade_partner_user`: task updates, submittals, field forms, document uploads

## Cross-Cutting Product Requirements
### Security
- [ ] All endpoints require auth; all privileged actions require policy checks
- [ ] Division and project scoping enforced server-side (no client-only filtering)
- [ ] Impersonation only by approved admins with immutable audit records
- [ ] Webhooks verified by signature + timestamp window
- [ ] API rate limits by IP + user + endpoint risk class

### Audit + Compliance
- [ ] Immutable audit trail for approvals, contract events, financial sync events
- [ ] Traceability from user action -> workflow state -> external sync result
- [ ] Data retention policies configurable for project/legal records
- [ ] Exportable audit reports for compliance investigations

### Reliability
- [ ] Graceful degradation when ERPNext or external provider is unavailable
- [ ] Background retry with backoff and dead-letter queues
- [ ] Operational dashboards for queue depth, sync failures, webhook failures
- [ ] Service-level error budgets and release quality gates

### UX + Accessibility
- [ ] Desktop + tablet + mobile responsive support for all critical workflows
- [ ] Offline-first UX for field-critical forms (daily logs, time, safety, photos)
- [ ] WCAG AA baseline for core experiences
- [ ] Multi-step actions provide progress and state recovery

### Privacy + PIPEDA
- [ ] Privacy request lifecycle (access, correction, deletion, export) with SLA tracking
- [ ] Personal data classification and minimization rules enforced by policy
- [ ] Consent and notification records retained for audit
- [ ] Legal hold overrides standard retention/deletion processes

### Business Continuity + Incident Response
- [ ] Documented BCP scenarios for integration outage, DB outage, and storage outage
- [ ] Incident severity matrix with owner, escalation path, and communication templates
- [ ] Recovery drills run quarterly and tracked against RPO/RTO targets
- [ ] Customer-facing status communication process defined

### Master Data Governance
- [ ] Cost code dictionary managed centrally with approval workflow
- [ ] Reference data (trade types, categories, statuses) versioned and auditable
- [ ] Breaking master-data changes require impact preview and staged rollout
- [ ] Cross-system mapping tables maintained for ERP and payroll consistency

### Product Telemetry + Adoption
- [ ] Feature usage and workflow completion telemetry captured by role/division
- [ ] Adoption KPIs and drop-off funnels available to product/ops
- [ ] Telemetry is privacy-compliant and excludes sensitive payloads by default
- [ ] Major release success criteria include adoption thresholds

### Sandbox + Training Readiness
- [ ] Dedicated training sandbox seeded with realistic demo data
- [ ] Role-based training playbooks and scenario scripts maintained
- [ ] Feature release notes linked to SOP updates
- [ ] User certification checklist for PM, Field, Accounting, and Admin roles

---

## Epic 1: Identity, Access, and Organization
### Feature 1.1 Authentication + Session
Functions:
- Clerk SSO sign-in/out
- Domain and org membership checks
- Session refresh and claim hydration
- Forced re-auth for high-risk actions
Acceptance:
- [ ] Unauthorized users blocked on all protected routes and APIs
- [ ] High-risk actions require step-up auth (admin policy)

### Feature 1.2 Role-Based Access Control (RBAC)
Functions:
- Role assignment (single primary + optional secondary capabilities)
- Permission bundles with division-aware constraints
- Policy override and emergency access with reason capture
- Effective permission preview before saving role changes
Acceptance:
- [ ] Permission checks are deterministic and logged
- [ ] Admin cannot assign permissions beyond own scope (except platform_admin)

### Feature 1.3 Division Management
Functions:
- Division create/update/archive
- User division assignment and transfer history
- Division-specific workflow defaults and tax settings
Acceptance:
- [ ] Archived divisions become read-only and excluded from new records

---

## Epic 2: CRM and Pipeline
### Feature 2.1 Leads
Functions:
- Lead intake (manual + import)
- Source tracking, stage transitions, assignment
- Duplicate detection
- Lead-to-opportunity conversion
Acceptance:
- [ ] Duplicate prevention rules configurable and tested
- [ ] Lead conversion preserves full activity history

### Feature 2.2 Contacts and Accounts
Functions:
- Account + contact CRUD
- Primary/secondary contact roles
- Communication preferences
- Address and site metadata
Acceptance:
- [ ] Contacts can belong to multiple accounts with relationship type

### Feature 2.3 Pipeline Activities
Functions:
- Task and reminder scheduling
- Email/call/meeting log records
- Stage SLA timers and overdue alerts
Acceptance:
- [ ] Activity timeline is immutable except for allowed corrections

---

## Epic 3: Estimating Engine
### Feature 3.1 Cost Catalog
Functions:
- Material/labor/equipment rate libraries
- Vendor-specific cost variants
- Regional pricing multipliers
- Effective-date pricing versions
Acceptance:
- [ ] Re-pricing historical estimates is forbidden unless explicit revision mode used

### Feature 3.2 Assemblies and Templates
Functions:
- Assembly builder (nested line items)
- Template sections by project type
- Division defaults and reusable estimate packages
Acceptance:
- [ ] Assemblies can be versioned and locked for signed proposals

### Feature 3.3 Estimate Builder
Functions:
- Scope sections and line items
- Markups, margins, contingencies
- Alternates and allowances
- Revision and compare mode
Acceptance:
- [ ] Estimate revision diff includes cost, quantity, and narrative changes

### Feature 3.4 Proposal Generation
Functions:
- Branded proposal document generation
- Terms and exclusions
- Customer-facing option selection
- Approval state machine
Acceptance:
- [ ] Proposal output includes machine-readable payload for downstream contract creation

---

## Epic 4: Contracts and E-Sign
### Feature 4.1 Contract Assembly
Functions:
- Proposal-to-contract conversion
- Deposit and milestone schedule configuration
- Clause library and legal text versioning
Acceptance:
- [ ] Contract payload is immutable after e-sign initiated

### Feature 4.2 BoldSign Integration
Functions:
- Envelope creation and signer routing
- Reminder/escalation schedule
- Signed artifact retrieval and storage
- Event webhook ingestion
Acceptance:
- [ ] Signed contract and certificate are archived with checksum and metadata

### Feature 4.3 Contract Change Lifecycle
Functions:
- Amendment generation
- Re-sign orchestration
- Superseded contract linking
Acceptance:
- [ ] Contract lineage visible in single timeline

---

## Epic 5: Project Initiation and Setup
### Feature 5.1 Project Creation
Functions:
- Project creation from contract or manual setup
- Job code and naming standards
- Team assignment and default responsibilities
- Baseline budget and schedule initialization
Acceptance:
- [ ] Project cannot enter active state without required baseline artifacts

### Feature 5.2 Milestones and Baselines
Functions:
- Milestone templates by project type
- Baseline snapshots for budget and schedule
- Baseline lock and variance tracking
Acceptance:
- [ ] Baseline changes require manager approval and reason code

---

## Epic 6: Project Execution Core
### Feature 6.1 Task Management
Functions:
- Task creation, dependencies, critical path indicators
- Assignment and workload balancing
- Status transitions and blockers
Acceptance:
- [ ] Dependency cycle prevention enforced

### Feature 6.2 Scheduling
Functions:
- Calendar views (team, project, resource)
- Schedule conflict detection
- Resource and crew assignment suggestions
Acceptance:
- [ ] Conflict alerts generated on save and exposed in API response

### Feature 6.3 Daily Logs / Site Diary
Functions:
- Weather, labor count, work performed
- Delays, incidents, visitor logs
- Attachments and photos
Acceptance:
- [ ] Daily log entries support offline draft + sync + conflict resolution

### Feature 6.4 Meetings + Notes
Functions:
- Meeting agenda and attendees
- Action items from notes
- Follow-up reminders
Acceptance:
- [ ] Meeting action items create linked tasks

---

## Epic 7: RFIs, Submittals, and Document Control
### Feature 7.1 RFI Management
Functions:
- RFI creation, routing, due dates
- Threaded responses
- Status and SLA tracking
Acceptance:
- [ ] RFI status changes are audited and notification-driven

### Feature 7.2 Submittals
Functions:
- Submittal package creation
- Reviewer routing and stamped outcomes
- Revision requests and resubmittals
Acceptance:
- [ ] Final approved submittal is publishable to client/trade portals by policy

### Feature 7.3 Punch Lists
Functions:
- Defect item tracking with photo evidence
- Assignment and due dates
- Verification and closeout
Acceptance:
- [ ] Punch closeout requires verifier role distinct from creator (configurable)

### Feature 7.4 Document Versioning
Functions:
- File upload and metadata tagging
- Version create/restore
- Linking docs to RFIs/submittals/tasks
Acceptance:
- [ ] Every version has immutable checksum and uploader identity

---

## Epic 8: Change Order Management
### Feature 8.1 Change Requests
Functions:
- Internal or client-initiated CR creation
- Scope, cost, and time impact capture
- Estimate linkage and approval routing
Acceptance:
- [ ] CR cannot be promoted to CO without required impact fields

### Feature 8.2 Change Orders
Functions:
- CO document generation
- Client approval/e-sign
- Budget and schedule rebasing on approval
Acceptance:
- [ ] Approved CO updates project financial snapshots and timeline versions

---

## Epic 9: Field Operations and Safety
### Feature 9.1 Safety Forms
Functions:
- Toolbox talks
- Safety inspections
- Incident and near-miss reporting
Acceptance:
- [ ] Safety forms enforce signature + timestamp + location metadata

### Feature 9.2 Offline Field Workflow
Functions:
- Offline queue for logs, forms, photos
- Local conflict prompts
- Sync status and retry controls
Acceptance:
- [ ] Data loss prevention validated under app restart and network flaps

---

## Epic 10: Time, Payroll, and Expense
### Feature 10.1 Time Entry
Functions:
- Time entry by project/task/cost code
- Crew timesheet batching
- Approval workflow by supervisor/manager
Acceptance:
- [ ] Locked payroll periods block late edits unless override policy permits

### Feature 10.2 ADP Integration
Functions:
- Nightly API push/pull
- Mapping of labor codes and employee identities
- CSV fallback export on API failure
Acceptance:
- [ ] Every payroll export has reconciliation report and checksum

### Feature 10.3 Expenses
Functions:
- Expense claim creation
- Receipt upload and metadata extraction
- Approval and rejection with comments
- ERP posting integration
Acceptance:
- [ ] Expense status progression is policy-driven and immutable once posted

---

## Epic 11: Financial Operations (ERPNext Authority)
### Feature 11.1 AR Invoicing
Functions:
- Invoice creation from milestones/progress triggers
- ERPNext invoice synchronization
- Payment link generation and tracking
Acceptance:
- [ ] Invoice status in MDM mirrors ERPNext status with last-sync timestamp

### Feature 11.2 AP and Procurement
Functions:
- Purchase request -> PO -> receipt flow
- Vendor assignment and approval hierarchy
- ERPNext PO/AP sync and error handling
Acceptance:
- [ ] Procurement approvals are auditable and enforce threshold policy

### Feature 11.3 Job Costing
Functions:
- Cost aggregation across labor, materials, expenses, COs
- Forecast vs actual variance
- Margin trend analytics
Acceptance:
- [ ] Job-cost snapshots are versioned for monthly financial close

---

## Epic 12: Client Portal
### Feature 12.1 Client Visibility
Functions:
- Project summary and milestones
- Shared document access
- CO approval and invoice/payment views
Acceptance:
- [ ] Client users can only access explicitly assigned projects and artifacts

### Feature 12.2 Client Communication
Functions:
- Message threads tied to project context
- Announcement publishing
- Approval reminders
Acceptance:
- [ ] Portal communications are exportable for dispute history

---

## Epic 13: Trade Partner Portal
### Feature 13.1 Trade Access
Functions:
- Trade company onboarding
- Role management inside trade account
- Project assignment scope
Acceptance:
- [ ] Trade users cannot view competitor trade data within same project

### Feature 13.2 Trade Workflow
Functions:
- Task status updates
- Submittal and compliance document submission
- Site logs and issue reporting
Acceptance:
- [ ] Submission timestamps and statuses are immutable after approval

---

## Epic 14: Reporting and Analytics
### Feature 14.1 Operational Dashboards
Functions:
- Portfolio health (schedule, budget, risk)
- Division and PM performance views
- Pipeline conversion and sales cycle metrics
Acceptance:
- [ ] Dashboard filter behavior consistent across all modules

### Feature 14.2 Financial Dashboards
Functions:
- AR aging, AP aging, cashflow views
- WIP and margin tracking
- ERP reconciliation status
Acceptance:
- [ ] Finance dashboards label data freshness timestamp and source

### Feature 14.3 Audit/Compliance Reporting
Functions:
- Privileged action reports
- Approval lineage reports
- Data retention and deletion activity logs
Acceptance:
- [ ] Reports exportable in CSV and PDF with reproducible filters

---

## Epic 15: Notifications and Automation
### Feature 15.1 Notification Engine
Functions:
- In-app, email, and push routing
- User preference + suppression windows
- Escalation policies
Acceptance:
- [ ] Duplicate suppression with idempotency keys

### Feature 15.2 Workflow Automations
Functions:
- Trigger-based automations for approvals and reminders
- SLA breach escalations
- Integration-trigger events
Acceptance:
- [ ] Automation execution logs searchable by entity and event

---

## Epic 16: Data Migration and Legacy Decommission
### Feature 16.1 Migration Framework
Functions:
- Source connectors (JobTread, CSV/XLSX, SMB, OneDrive)
- Mapping templates and transform rules
- Dry-run and validation reports
Acceptance:
- [ ] Dry run and production run produce deterministic mapping IDs

### Feature 16.2 Delta and Reconciliation
Functions:
- Incremental sync until cutover
- Count and amount reconciliation
- Conflict queue with human resolution tools
Acceptance:
- [ ] Reconciliation sign-off required before cutover switch

### Feature 16.3 Legacy Archive
Functions:
- Read-only historical archive
- Deep link references from MDM records
- Access controls and retention policy
Acceptance:
- [ ] Legal hold and data export requirements met

---

## Epic 17: Procurement, RFQ, and Bid Management
### Feature 17.1 RFQ Packages
Functions:
- RFQ package creation from estimate/project scopes
- Vendor/trade invite management with due dates
- RFQ document bundle and revision history
Acceptance:
- [ ] RFQ revisions are versioned and traceable by invite recipient

### Feature 17.2 Bid Intake and Leveling
Functions:
- Bid submission capture by vendor/trade
- Bid normalization and scope alignment
- Bid comparison matrix and recommendation workflow
Acceptance:
- [ ] Award recommendation includes explicit exclusions and risk notes

### Feature 17.3 Award and PO Handoff
Functions:
- Award decision approval flow
- Award package generation and notification
- ERPNext PO handoff with mapping integrity checks
Acceptance:
- [ ] Awarded bid data maps to ERP documents without manual re-entry

---

## Epic 18: Trade Compliance and Eligibility
### Feature 18.1 Compliance Document Registry
Functions:
- Insurance, WCB/WSIB, and license document tracking
- Expiry detection and renewal reminders
- Compliance status by company and project
Acceptance:
- [ ] Expired compliance automatically blocks assignment/payment actions by policy

### Feature 18.2 Compliance Gate Engine
Functions:
- Configurable gate rules by division/project type
- Override process with reason + approver
- Compliance dashboard and exception queue
Acceptance:
- [ ] Compliance overrides are time-bound and fully audited

---

## Epic 19: Customer Selections and Allowance Reconciliation
### Feature 19.1 Selection Sheets
Functions:
- Selection categories and option libraries
- Client-facing selection submission and confirmation
- Versioned selection history
Acceptance:
- [ ] Selection changes after lock require formal approval workflow

### Feature 19.2 Allowance Management
Functions:
- Allowance budget allocation by category
- Real-time allowance drawdown from selected options
- Variance notification and CO trigger
Acceptance:
- [ ] Over-allowance selections trigger mandatory approval path

---

## Epic 20: Project Closeout, Deficiencies, and Warranty Service
### Feature 20.1 Closeout Packages
Functions:
- Handover checklist and required artifact verification
- As-built docs, warranties, manuals, and certificates bundle
- Client closeout acknowledgment
Acceptance:
- [ ] Project cannot be marked closed without complete closeout package

### Feature 20.2 Deficiency and Warranty Tracking
Functions:
- Deficiency item logging with owner and due date
- Warranty period tracking by item/component
- Service call intake, dispatch, and closure tracking
Acceptance:
- [ ] Warranty service calls preserve full timeline and resolution evidence

---

## Epic 21: Privacy Operations, BCP, and Platform Governance
### Feature 21.1 Privacy Operations
Functions:
- Privacy request intake and verification
- Data export/correction/deletion workflow with approval controls
- Privacy event audit reports
Acceptance:
- [ ] Privacy SLA compliance dashboard available for leadership review

### Feature 21.2 Continuity and Incident Management
Functions:
- Incident creation, severity classification, and responder assignment
- Recovery event timeline and postmortem records
- SLA and communication tracking
Acceptance:
- [ ] Every Sev1/Sev2 incident has postmortem and remediation owner

### Feature 21.3 Master Data and Config Governance
Functions:
- Cost code dictionary management
- Reference data lifecycle (draft/review/active/deprecated)
- Environment-safe config promotion (dev -> staging -> prod)
Acceptance:
- [ ] Config promotions include diff report and rollback option

### Feature 21.4 Product Analytics and Adoption
Functions:
- Feature usage events and workflow funnel tracking
- Role/division adoption KPIs
- Release impact reports
Acceptance:
- [ ] New features require telemetry validation before full rollout

---

## Non-Functional Requirements by Module
| Module | Availability | Performance | Data Freshness |
|---|---|---|---|
| Core API | 99.9% | p95 < 400ms | real-time |
| Estimating | 99.9% | p95 < 700ms for large estimates | real-time |
| Portals | 99.9% | p95 < 500ms | near real-time |
| Financial Sync | 99.5% async processing | queue lag < 5 min target | near real-time |
| Offline Sync | client tolerant | local write immediate | eventual sync |

## Quality Gates (Release Blocking)
- [ ] P0/P1 defects = 0 in release candidate
- [ ] Security tests pass with no high-severity findings
- [ ] Reconciliation variance below approved threshold
- [ ] UAT signoff by operations, finance, and executive sponsor
- [ ] Runbooks + on-call ownership documented and trained

## Feature Flags and Rollout Controls
- [ ] Module-level feature flags for portals, finance sync, and offline mode
- [ ] Division-scoped rollout toggles
- [ ] Kill switches for external integrations (ERP, e-sign, payroll)
- [ ] Dark launch options for high-risk modules

## Open Enhancements (Post Day-1)
- [ ] Digital takeoff and measurement workflows
- [ ] Native mobile app shells (iOS/Android)
- [ ] Advanced forecasting with ML signals
- [ ] Multi-company support
- [ ] Embedded BI authoring studio
