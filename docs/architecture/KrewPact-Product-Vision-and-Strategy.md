# KrewPact Product Vision and Strategy Document

**Organization:** MDM Group
**Product:** KrewPact - Unified Construction Operations Hub
**Status:** Strategic Vision
**Last Updated:** February 2026

---

## 1. PRODUCT VISION

### 1.1 Vision Statement

KrewPact is a unified operations hub that anchors the entire construction lifecycle around a single, reliable axis. It brings Customer Relationship Management, estimating, scheduling, field logs, Requests for Information (RFIs), change orders, client and trade partner portals, and ERP-integrated job costing into one streamlined workspace. KrewPact serves as the command center for construction operations—where decisions are made, projects are executed, compliance is maintained, and stakeholders stay aligned.

By consolidating fragmented workflows and eliminating manual handoffs, KrewPact enables MDM Group and similar contractors to operate with unprecedented visibility, speed, and control over their projects. The platform is built with field realities in mind: offline capability ensures crews can work anywhere, portal-first architecture keeps external stakeholders informed and engaged, and enterprise-grade audit trails ensure nothing is lost and everything is accountable.

### 1.2 Problem Statement

Construction companies today face a critical operational challenge: the tools and processes designed to manage projects were built for a simpler era and do not scale effectively with modern business complexity.

**Current State Problems:**

- **Spreadsheet Sprawl:** Projects are tracked across dozens of spreadsheets, email chains, and paper documents. There is no single source of truth for project status, financials, or commitments. When a spreadsheet is updated in one place but not another, decisions are made on stale information.

- **Disconnected Tool Ecosystems:** Most contractors use separate systems for CRM, estimating, scheduling, field management, and accounting. Data entered once must be re-entered multiple times across different platforms. This creates redundancy, introduces errors, and wastes hundreds of hours annually on manual data synchronization.

- **Fragmented Legacy Workflows:** MDM Group currently relies on Sage 50 Accounting, Sage Construction Management, spreadsheets, and manual processes for project management. These fragmented tools cannot scale to meet the complexity of mixed residential and light commercial operations. Integration options are limited, customization is restrictive, and no single platform provides unified visibility across operations.

- **Data Silos Between Functions:** The field, office, finance, and external stakeholders each live in their own information worlds. A project manager may see estimated costs, but the field supervisor sees a different scope. Finance sees invoiced amounts, but project teams see committed costs. This misalignment drives poor decisions and scope creep.

- **Absence of Mixed Residential + Light Commercial Solutions:** Most construction software is built for either residential home builders (small teams, simple scopes) or large commercial contractors (heavy infrastructure, complex contracts). Few platforms serve the middle market that builds $2M to $50M portfolios of mixed residential homes and light commercial buildings in the same year.

- **Stakeholder Communication Breakdown:** Clients and trade partners lack visibility into project progress until formal updates arrive. This creates frustration, increases change orders due to scope confusion, and damages client relationships. Conversely, construction companies struggle to collect timely information (submittals, compliance documents, change orders) from external parties.

- **Compliance and Audit Risk:** Without a system that captures and retains every decision, every change, and every approval, construction companies face legal and financial risk. What was the original scope? When was it changed? Who approved it? These questions often go unanswered when data is scattered.

KrewPact directly solves these problems by providing a single, unified platform that spans the entire construction lifecycle and connects all stakeholders.

### 1.3 Target Market

**Primary Market: MDM Group**

MDM Group, headquartered in Mississauga, Ontario, is a mixed residential and light commercial general contractor with over 300 employees. The organization operates multiple divisions building residential developments (townhomes, condominiums, single-family homes) and light commercial projects (small office buildings, retail centers, institutional facilities). MDM Group's operations span contract negotiation, estimation, field execution, client relations, trade partner management, payroll, and integrated job costing.

KrewPact is first and foremost a strategic system to modernize and scale MDM Group's internal operations. Success with the internal user base of 300+ employees is the primary objective.

**Secondary Market: White-Label B2B for Similar Contractors**

Following successful deployment within MDM Group, KrewPact will be packaged as a white-label solution for other mixed residential and light commercial general contractors in Canada and North America. This market consists of regional and mid-market contractors ($100M to $500M annual revenue) with similar operational profiles: multiple divisions, complex project portfolios, established trade partner networks, and a need for integrated financial and operational control.

The secondary market is not a launch priority but is an important long-term value capture strategy and justifies the architectural investment in multi-tenancy and customization frameworks.

**Tertiary Market: Specialty Trade Contractors**

Specialty trade contractors (mechanical, electrical, plumbing, framing, etc.) that manage their own subcontracts, compliance documentation, and crew scheduling represent a natural expansion opportunity. A lighter-weight, trade-focused version of KrewPact could serve this market with a narrower feature set focused on project management, crew scheduling, compliance, and billing.

### 1.4 Product Principles

These principles guide all product decisions, architecture choices, and feature prioritization:

**1. Finance Stays in ERPNext (Single Source of Truth for Money)**

ERPNext is MDM Group's financial backbone and will remain so. KrewPact does not duplicate or replace financial functionality. Instead, KrewPact focuses on operational command and control, with ERPNext serving as the system of record for all monetary transactions, general ledger entries, customer accounts, and financial reporting. KrewPact initiates financial transactions (job costing entries, purchase orders, payroll initiations) through clean APIs, but ERPNext maintains data integrity and final authority over all money flows.

**2. KrewPact is the Command Layer for Projects, People, Documents, and Decisions**

KrewPact owns the operational context: what projects exist, what scope they encompass, who is responsible, what decisions have been made, what documents must be collected, what compliance requirements apply, and what communication has occurred. When a project manager approves a change order in KrewPact, KrewPact records the decision and decision maker. When finance syncs that approved change order to ERPNext, finance sees it as an instruction to update the cost model. KrewPact is the source of truth for operational decisions.

**3. Offline-Capable for Field Operations**

Field crews and supervisors often work in locations without reliable internet connectivity. KrewPact architecture ensures that field users can sync relevant project data locally, work offline without interruption, and seamlessly re-sync when connectivity returns. The offline-first approach is not a nice-to-have but a core requirement that informs data synchronization design, conflict resolution strategies, and mobile experience.

**4. Portal-First for External Stakeholders**

KrewPact recognizes that clients and trade partners need visibility and engagement. Rather than treating portals as an afterthought, KrewPact is architected with portals as primary surfaces. The Client Portal gives project owners real-time visibility into progress, pending approvals, and outstanding items. The Trade Partner Portal enables subcontractors to accept scopes, submit compliance documents, record time, and view payment status. Portal engagement reduces email volume, accelerates decision-making, and improves stakeholder satisfaction.

**5. Audit Everything, Lose Nothing**

Every mutation to every piece of data—every approval, every status change, every cost modification, every scope adjustment—is recorded in an immutable audit trail. Who made the change? When? From what system? Why? What was the previous value? This principle ensures that KrewPact can answer any question about how a project reached its current state and provides defensible records for disputes, audits, and compliance verification. The audit trail is not a feature; it is foundational architecture.

**6. Canadian-First Compliance (PIPEDA, Construction Act, AODA)**

KrewPact is built for Canadian contractors and incorporates Canadian legal and regulatory requirements from inception, not as afterthoughts:

- **PIPEDA Compliance:** Personal information is handled according to Canadian privacy standards with appropriate consent, retention, and access controls.
- **Construction Act Alignment:** Features support mechanics lien rights, lien hold periods, and holdback calculations per provincial construction acts.
- **AODA Compliance:** Accessibility is built into the design, ensuring users with disabilities can operate the platform with WCAG 2.0 AA standard compliance.

---

## 2. STRATEGIC PILLARS

### 2.1 Replace Fragmented Manual Workflows

KrewPact will consolidate MDM Group's fragmented manual processes and Sage-based workflows into a unified platform, removing bottlenecks and adding capabilities that no current tool combination provides. This includes:

- Project and customer management workflows that MDM Group users depend on daily
- Estimation and bidding workflows that feed project execution
- Change order and RFI management that track scope decisions
- Client communication and approval workflows
- Field crew scheduling and labor tracking
- Integration with ERPNext for job costing and payroll

Migration from legacy systems (Sage 50, Sage Construction Management, spreadsheets) to KrewPact will be performed systematically, ensuring that historical data is preserved, user training is comprehensive, and the cutover is managed as a controlled business event. No data will be lost. No workflows will be broken without a clear replacement in place.

### 2.2 Unified Data Model

The most powerful outcome of consolidating fragmented systems is a single unified data model that connects all aspects of the business. A project record in KrewPact is not isolated; it is connected to:

- Customers and client stakeholders who approved the scope
- Estimated costs and labor that were the basis of the bid
- Committed change orders that modified scope and cost
- Scheduled tasks and crew assignments that execute the work
- Time entries and materials consumed that track actual labor and resources
- RFIs and submittals that resolve design questions
- Financial transactions in ERPNext that record income and expense
- Quality issues and warranty claims that track post-completion performance

With a unified data model, questions that require joining data across five separate systems today can be answered immediately: What is the current profitability of this project? Why do actual labor costs differ from estimates? Which trade partners have outstanding compliance documents? What is the client's approval status on pending change orders?

KrewPact organizes this unified model around 16 epics that span the complete construction lifecycle, ensuring comprehensive coverage and coherent interconnection across all domains.

### 2.3 ERP Integration (Not Replacement)

KrewPact does not attempt to replace ERPNext. This would be both impractical and undesirable. ERPNext is mature, widely deployed, battle-tested for financial operations, and maintained by a global community. KrewPact instead becomes the interface layer that makes ERPNext accessible and relevant to construction operations.

The integration operates bidirectionally:

- **KrewPact to ERPNext:** When a project is created in KrewPact, a corresponding cost center is created in ERPNext. When a change order is approved in KrewPact, the change is reflected in the project's cost model in ERPNext. When a crew logs time in KrewPact, it flows to ERPNext payroll. KrewPact is the initiator of financial transactions.

- **ERPNext to KrewPact:** When ERPNext processes a customer payment, KrewPact reflects updated invoice status. When ERPNext calculates job costs, KrewPact displays actuals versus budget. When ERPNext runs payroll, KrewPact shows labor cost accruals. KrewPact displays financial results and constraints that inform operational decisions.

Clear system-of-record designations prevent conflicts. For example, the general ledger in ERPNext is the system of record for financial transactions; KrewPact does not maintain a competing ledger. The project scope in KrewPact is the system of record for what work is being performed; ERPNext reflects that scope in its cost model but does not define scope independently.

This architecture provides the best of both systems: ERPNext's financial rigor and compliance, KrewPact's operational agility and user experience.

### 2.4 Portal Economy

KrewPact invests heavily in two portal surfaces that serve critical external stakeholder needs:

**Client Portal:** Project owners (clients) gain real-time visibility into:

- Project status and milestones
- Budget status and change order approvals needed
- Photos and progress documentation
- Outstanding decisions or approvals blocking progress
- Invoice status and payment history

The Client Portal reduces information friction between builders and owners, accelerates approvals, and significantly improves client satisfaction by providing transparency that previously required manual reporting.

**Trade Partner Portal:** Subcontractors and material suppliers access:

- Their assigned scopes and contract terms
- Schedule and milestone dates
- Compliance documentation requirements (licenses, insurance, safety certificates)
- Submittals they must provide (shop drawings, samples, certifications)
- Time entry and expense recording for time-and-materials work
- Payment status and outstanding invoices

The Trade Partner Portal shifts administrative burden from general contractors to trade partners, who can manage their own compliance documents and time entry, reducing rework and reconciliation.

### 2.5 White-Label Ready

While MDM Group is the launch customer, KrewPact architecture is designed from inception for white-label deployment. This means:

- **Multi-Tenancy:** The platform supports multiple independent customer organizations (divisions, subsidiaries, or unrelated contractors) operating in complete isolation within a single deployment, with separate data, users, and configurations.

- **Division Awareness:** Within a single tenant, the architecture supports multiple divisions, regions, or business units with the ability to segregate data, customize workflows, and maintain separate reporting while sharing core infrastructure.

- **Customization Frameworks:** Rather than forking code for each customer, KrewPact provides configuration frameworks for workflow customization, report templates, and branding without requiring code modifications.

- **Clean APIs:** All critical functionality is accessible through clean, documented APIs, enabling partners to integrate KrewPact into their own toolchains and extend functionality without modifying core code.

The white-label architecture adds engineering rigor and reduces the cost of future customer onboarding. However, these architectural investments are only justified if MDM Group successfully adopts and derives value from KrewPact internally. The white-label vision is secondary to internal success.

---

## 3. USER PERSONAS AND ROLES

### 3.1 Internal Roles (9)

**Role: platform_admin**

The Platform Administrator holds responsibility for the technical operation, configuration, and support of KrewPact across MDM Group. This role manages user accounts, system settings, integrations, data quality, and system health.

Responsibilities:

- User and access management (account creation, role assignment, termination)
- System configuration and customization (workflows, approval chains, notification rules)
- Data quality and integrity (reconciliation, duplicate detection, data migration validation)
- Integration management (ERPNext sync, third-party API connections)
- Backup, recovery, and disaster preparedness
- Technical support and troubleshooting for platform issues
- Compliance documentation and audit preparation

Primary Epics: Identity and Access Management, Data Migration, Notifications, Reporting (configuration)

**Role: executive**

Executives (President, Chief Financial Officer, Chief Operating Officer) use KrewPact to monitor the health of the business and make strategic decisions. They need dashboards that show company-wide performance, project profitability, cash flow impact, and portfolio trends at a glance.

Responsibilities:

- Portfolio management (which projects we have, overall health)
- Financial oversight (profitability, cash position, revenue recognition)
- Resource allocation (crew and equipment across projects)
- Strategic decision-making (which market segments to pursue, where to invest)

Primary Epics: Reporting, Financial Operations, Project Execution

Key Workflows:

- View executive dashboard with key metrics (revenue, margin, cash, project count)
- Filter and analyze project performance by division, geography, or client type
- Monitor project profitability trends and identify problem projects early
- Review cash flow impact of pending approvals and change orders
- Analyze resource utilization and capacity constraints

**Role: operations_manager**

The Operations Manager oversees day-to-day execution across multiple projects, ensuring resources are allocated efficiently, crews are coordinated, and projects stay on track. This role sits between project managers and executives.

Responsibilities:

- Multi-project coordination (ensuring no conflicts, optimizing transitions)
- Resource scheduling (crew, equipment, material delivery sequencing)
- Performance monitoring (tracking progress against schedule and budget)
- Problem escalation (identifying and escalating issues that block progress)
- Trade partner coordination (ensuring subcontractors are resourced and on schedule)
- Site supervision (visiting sites, assessing quality, resolving field issues)

Primary Epics: Project Execution, Field Operations, Time and Payroll, Scheduling

Key Workflows:

- View portfolio dashboard showing all active projects and their status
- Identify schedule conflicts or crew overallocation
- Reassign crews between projects to resolve bottlenecks
- Review daily field logs and safety reports
- Approve timesheets and validate labor costs against projections
- Coordinate material deliveries with multiple subcontractors

**Role: project_manager**

The Project Manager owns a specific project from contract through final closeout. This role manages scope, budget, schedule, and relationships with the client and trade partners. The project manager is the single point of authority for project decisions.

Responsibilities:

- Scope management (understanding and defending the original scope, managing changes)
- Budget management (tracking costs, identifying variances, controlling overruns)
- Schedule management (coordinating phases, managing critical path, keeping project on track)
- Client relations (communication, approvals, satisfaction)
- Trade partner management (assignments, performance, disputes)
- Quality and compliance (inspections, testing, regulatory requirements)
- RFI and change order management (issues, submittals, approval workflows)
- Project closeout (final accounting, warranty setup, archival)

Primary Epics: Project Execution, Estimating, Contracting, RFIs and Submittals, Change Orders, Client Portal

Key Workflows:

- Create and track project scope document
- Manage budget and monitor cost variance against baseline
- Create and track change orders from proposal through approval and accounting entry
- Issue RFIs to resolve design questions; track responses and resolution
- Communicate progress and approvals to client through portal
- Manage subcontractor assignments and performance
- Close out project and transition to warranty

**Role: project_coordinator**

The Project Coordinator supports project managers with administrative and coordination tasks. This role handles documentation, scheduling, communications, and workflow facilitation.

Responsibilities:

- Document management (contracts, submittals, compliance records, RFIs)
- Schedule coordination (confirming appointments, tracking milestones)
- Communication facilitation (ensuring stakeholders receive notices and updates)
- Data entry and record keeping (logging decisions, changes, and transactions)
- Compliance tracking (ensuring required documents are collected and current)
- Client communication (routine updates, reminders, administrative notices)

Primary Epics: Project Execution, RFIs and Submittals, Document Control, Notifications

Key Workflows:

- Manage RFI log and ensure responses are received on time
- Track compliance requirements (insurance certificates, licenses, inspections)
- Coordinate scheduling across project phases and trade partners
- Prepare and distribute progress updates to clients
- File and organize project documents in centralized repository
- Track change order approval status and notify stakeholders of decisions

**Role: estimator**

The Estimator prepares bids and cost estimates for new projects. This role requires deep construction knowledge, understanding of material costs, labor productivity, and market conditions.

Responsibilities:

- Scope takeoff (quantifying work from blueprints and specifications)
- Cost estimation (labor rates, material pricing, equipment costs, overhead)
- Productivity assessment (how long will tasks actually take on similar projects)
- Risk identification (uncertain conditions, complexity factors)
- Proposal preparation and client presentation
- Estimate refinement post-award (detailed breakdown for project execution)
- Estimate analysis post-project (actual versus estimated, learning capture)

Primary Epics: Estimating, Contracting, Project Execution

Key Workflows:

- Create estimate from project scope and specifications
- Apply labor rates and productivity factors from historical data
- Generate proposal document for client review
- Convert approved estimate into project baseline for tracking
- Analyze actual results versus estimate after project completion
- Update estimating assumptions and labor rates based on actuals

**Role: field_supervisor**

The Field Supervisor leads crews in the field, manages daily execution, ensures quality and safety, and reports progress back to the office. This role is deeply operational and works in environments where internet connectivity may be limited.

Responsibilities:

- Crew leadership and task assignment
- Safety management (daily safety briefings, hazard identification, incident reporting)
- Quality assurance (inspections, rework identification, standards compliance)
- Progress tracking (what was completed today, what is blocked)
- Material management (ordering, receiving, storage, waste)
- Subcontractor coordination (confirming schedule, quality checks, invoicing)
- Time tracking and labor reporting
- Daily communication with project management

Primary Epics: Field Operations, Scheduling, Time and Payroll, Quality and Compliance

Key Workflows:

- Receive daily assignments and scope details (often offline)
- Log daily progress and completed tasks
- Record labor time per task and employee
- Report safety incidents and near-misses
- Request materials or flag supply shortages
- Document quality issues and required rework
- Collect subcontractor time and daily reports
- Sync offline data when connectivity returns

**Role: accounting**

The Accounting role (controller, accountant) manages accounts payable, accounts receivable, job costing verification, and financial reporting. This role bridges KrewPact and ERPNext.

Responsibilities:

- Accounts payable (processing invoices, managing payment approvals)
- Accounts receivable (invoicing clients, tracking payments, collections)
- Job costing (verifying costs are recorded against correct projects, identifying variances)
- Financial reporting (balance sheet, income statement, cash flow)
- Reconciliation (ensuring KrewPact and ERPNext are in sync)
- Compliance (tax preparation, audit support, regulatory reporting)
- Cost allocation (ensuring costs are assigned to correct cost centers)

Primary Epics: Financial Operations, Time and Payroll, Project Execution, Reporting

Key Workflows:

- Review pending invoices from subcontractors and verify against contract terms
- Match time entries to payroll and verify labor costs
- Reconcile project budget actuals from ERPNext with project records in KrewPact
- Prepare customer invoices with change order additions and adjustments
- Monitor cash position and payment timing
- Prepare monthly financial statements and variance analysis

**Role: payroll_admin**

The Payroll Administrator manages payroll processing, ensuring employees and contractors are paid correctly and on time. This role integrates with time tracking data in KrewPact and payroll systems in ERPNext.

Responsibilities:

- Payroll processing (weekly or biweekly cycle)
- Time validation (ensuring time entries are complete and accurate)
- Deduction management (tax, benefits, garnishments)
- Contractor payment management (1099s, contract terms)
- Payroll compliance (statutory deductions, reporting)
- Labor cost analysis (actual versus budget by project)

Primary Epics: Time and Payroll, Project Execution, Financial Operations

Key Workflows:

- Review time entries submitted by field supervisors
- Validate time entries against hours worked and project assignments
- Process payroll with validated time data
- Reconcile labor costs back to project budgets
- Manage contractor invoicing and payments
- Generate payroll reports and reconciliation

### 3.2 External Roles (4)

**Role: client_owner**

The Client Owner is the principal or owner of the project being constructed. This may be a residential homeowner, a commercial real estate developer, or an institutional client. The client owner makes final decisions regarding scope, approvals, and change orders.

Responsibilities:

- Scope approval and change authorization
- Budget oversight and cost control
- Schedule review and acceptance
- Quality acceptance and sign-off
- Payment authorization

Constraints: External user with limited KrewPact access via Client Portal; cannot access internal project management data or financial details beyond their own project.

Primary Portal Features:

- Project status and progress photos
- Pending approvals requiring client decision
- Change order review and approval
- Budget status and cost-to-date
- Contact and message center for communication with project team
- Invoice and payment history

**Role: client_delegate**

The Client Delegate is a representative authorized by the client owner to make decisions on their behalf. This may be a property manager, an architect, or a project manager employed by the client.

Responsibilities: Same as client_owner, but as a delegated authority rather than the principal.

Constraints: Limited to Client Portal with same access restrictions as client_owner.

**Role: trade_partner_admin**

The Trade Partner Administrator manages the subcontracting organization's participation in MDM Group projects. This role maintains company compliance documentation, manages crew assignments, and oversees invoicing and payment.

Responsibilities:

- Crew assignment and scheduling coordination
- Compliance documentation (licenses, insurance, safety certifications)
- Submittals and shop drawings (ensuring delivery on time)
- Time and expense tracking for crew
- Invoice submission and payment tracking
- Performance communication with MDM Group

Constraints: External user with access to Trade Partner Portal; sees only projects and assignments relevant to their organization.

Primary Portal Features:

- Assigned scopes and project schedules
- Compliance requirements and document upload
- Schedule and critical path information
- Time entry for crew members
- Submittal and shop drawing uploads
- Invoice submission and payment status
- Communication with assigned project manager

**Role: trade_partner_user**

The Trade Partner User is a crew member, foreman, or field coordinator employed by a subcontracting organization. They use KrewPact to record time, report progress, and access relevant project information.

Responsibilities:

- Daily time entry and task completion reporting
- Progress and safety reporting
- Compliance document management
- Communication with MDM Group site supervisors

Constraints: Limited access to Trade Partner Portal focused on their assigned projects and tasks.

Primary Portal Features:

- Daily work assignments and scope details
- Time entry recording
- Progress and safety reporting
- Compliance requirements for their crew
- Communication with site supervisor or project coordinator

---

## 4. PRODUCT ARCHITECTURE PHILOSOPHY

### 4.1 Eight-Layer Target Architecture

KrewPact is architected as a modern, cloud-native application with clear separation of concerns across eight distinct layers. Each layer has well-defined responsibilities and interfaces, enabling independent scaling, testing, and evolution.

**Layer 1: Frontend (React/Next.js)**

The frontend layer comprises all user-facing interfaces: web applications for internal users, client portal, trade partner portal, and mobile-optimized experiences. Built on React and Next.js, the frontend provides responsive, interactive interfaces that work across devices and network conditions.

Responsibilities:

- User interface rendering and interaction
- Local state management for user experience fluidity
- Offline capability (caching, local data persistence)
- Form validation and user guidance
- Accessibility compliance (WCAG 2.0 AA)
- Performance optimization (lazy loading, code splitting, caching)

Constraints:

- No business logic lives in the frontend; all logic decisions are made in the API layer
- The frontend is a presentation layer and must remain stateless regarding critical data
- Offline capabilities must synchronize gracefully with the API when connectivity returns

**Layer 2: API and Backend-for-Frontend (BFF) Layer (Node.js)**

The API layer is the command center of the system. All mutations (changes to data), all authorization decisions, and all business logic flow through this layer. The API layer serves as a Backend-for-Frontend (BFF) that shapes data specifically for frontend needs, minimizing round-trips and complexity.

Responsibilities:

- Request routing and endpoint definition
- Authentication and authorization (enforcing RBAC rules)
- Business logic and validation
- Data transformation and shaping for specific frontends
- Transaction management and consistency
- Audit trail recording
- API rate limiting and security
- Integration coordination (initiating ERPNext syncs, queue jobs)

Constraints:

- All mutations must flow through API validation and authorization
- The API layer maintains the system of record for operational decisions
- No sensitive data (passwords, tokens, payment info) ever leaves this layer
- All external integrations are initiated from this layer (not directly from frontend)

**Layer 3: Operational Database (Supabase PostgreSQL)**

Supabase provides a managed PostgreSQL database that stores all operational data: projects, customers, budgets, change orders, RFIs, time entries, and all other business entities. The schema is the physical embodiment of the unified data model.

Responsibilities:

- Persistent storage of operational data
- Data integrity (referential integrity, constraints, triggers)
- Query performance (indexes, optimization)
- Backup and recovery (automated by Supabase)
- Row-level security (database-enforced access control)
- Full-text search indexes for document and field searching

Constraints:

- The operational database is the source of truth for all non-financial data
- Financial data is not duplicated here; only references to financial transactions in ERPNext
- All access to this database flows through the API layer (no direct application connections)
- The schema supports the unified data model across all 16 epics

**Layer 4: Financial System (ERPNext)**

ERPNext, running in a separate infrastructure managed by ERPNext services, maintains the financial backbone. ERPNext is not integrated into KrewPact code; rather, KrewPact communicates with ERPNext through documented REST APIs.

Responsibilities:

- Chart of accounts and general ledger
- Accounts receivable (customer invoices and payments)
- Accounts payable (vendor invoices and payments)
- Job costing (cost center tracking, cost accrual)
- Payroll processing
- Financial reporting (balance sheet, income statement, tax reporting)
- Multi-currency and multi-company support
- Compliance and audit trail

Constraints:

- ERPNext is the single source of truth for all financial transactions
- KrewPact does not modify ERPNext's core tables; it communicates through APIs and custom apps
- Sync is asynchronous; financial results may lag operational data by seconds to minutes
- Conflict resolution always favors ERPNext data in cases of discrepancy

**Layer 5: Object Storage (Cloud Storage for Files and Media)**

Project documents, photos, submittals, compliance certificates, and media files are stored in scalable object storage (AWS S3 or Cloudflare R2). Object storage provides a durable, scalable, and cost-effective way to manage large files without burdening the operational database.

Responsibilities:

- File storage and retrieval
- File versioning and audit trail
- Access control (ensuring only authorized users can access files)
- Content delivery (fast retrieval from anywhere)
- Long-term archival capability
- Backup and redundancy

Constraints:

- Files are referenced from the operational database via URL or object ID, not embedded
- File access is authenticated through the API layer
- Large files must not be served directly from the API but instead via signed URLs

**Layer 6: Asynchronous Processing Queue and Jobs (Node.js, Bull or similar)**

Many operations in KrewPact require asynchronous processing: syncing data to ERPNext, sending notifications, generating reports, processing offline data conflicts, and image transformations. A job queue system handles these background operations reliably.

Responsibilities:

- Job scheduling and queuing
- Retry logic and failure handling
- Long-running operation management
- Integration with external systems (ERPNext sync)
- Notification triggering
- Batch operations (bulk imports, exports)
- Error logging and alerting

Constraints:

- Jobs are reliable and idempotent (can be retried without side effects)
- Job status is visible in the API layer so users know when async operations complete
- Failed jobs create alerts that trigger manual investigation
- Job execution does not hold up user-facing API responses

**Layer 7: Identity and Authentication (Clerk)**

User identity management, authentication, and session management are handled by Clerk, a purpose-built identity platform. Clerk provides secure, scalable authentication without maintaining passwords or authentication logic in custom code.

Responsibilities:

- User account creation and management
- Password management and multi-factor authentication
- OAuth and SSO integrations
- Session management and token issuance
- User profile and metadata
- Audit logging of authentication events

Constraints:

- All authentication decisions delegate to Clerk; KrewPact does not store passwords
- Authorization decisions (what a user can access) are made in the API layer based on Clerk identity
- Clerk tokens are validated in the API layer before granting access

**Layer 8: Monitoring, Observability, and Alerting**

System health, performance, and errors are continuously monitored. Observability tools (logging, metrics, tracing) provide visibility into system behavior. Alerts notify on-call engineers of problems requiring immediate attention.

Responsibilities:

- Application logging (structured logs with context)
- Performance metrics (response times, throughput, error rates)
- Distributed tracing (understanding request flows across layers)
- Uptime monitoring and alerting
- Anomaly detection
- Capacity planning information

Constraints:

- Logging must not expose sensitive data (passwords, tokens, payment information)
- Monitoring infrastructure is separate from production data; no raw data flows to monitoring systems
- Alerts must be actionable and routed to appropriate teams

### 4.2 System-of-Record Philosophy

A critical design principle of KrewPact is clarity about which system maintains the authoritative version of each piece of information. When KrewPact and ERPNext both contain related data (e.g., project budget and cost), the system-of-record designation prevents conflicts and defines how sync discrepancies are resolved.

| Domain         | Entity                                                  | System of Record      | Sync Direction                                                 | Conflict Resolution                                                 |
| -------------- | ------------------------------------------------------- | --------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Projects       | Project master data (name, scope, address, dates)       | KrewPact              | KrewPact → ERPNext (async)                                     | Rebuild cost center in ERPNext from KrewPact                        |
| Projects       | Project budget (labor, material, equipment costs)       | KrewPact              | KrewPact → ERPNext (async)                                     | Rebuild budget lines in ERPNext cost center                         |
| Projects       | Change order approval status                            | KrewPact              | KrewPact → ERPNext (async)                                     | Require re-approval if ERPNext state differs                        |
| Financials     | General ledger and journal entries                      | ERPNext               | ERPNext only (read-only in KrewPact)                           | KrewPact never writes GL entries                                    |
| Financials     | Customer invoices and payments                          | ERPNext               | ERPNext only (KrewPact initiates, ERPNext executes)            | ERPNext is source of truth for paid/unpaid status                   |
| Financials     | Vendor invoices and payments                            | ERPNext               | ERPNext only (KrewPact initiates, ERPNext executes)            | ERPNext is source of truth for paid/unpaid status                   |
| Financials     | Job costs and cost accruals                             | ERPNext               | ERPNext reads KrewPact data; KrewPact displays ERPNext results | If discrepancy, rebuild from ERPNext and alert                      |
| Estimates      | Estimate and bid data                                   | KrewPact              | KrewPact only (one-way to client)                              | KrewPact is authoritative for all estimating work                   |
| Change Orders  | Approved change order content                           | KrewPact              | KrewPact → ERPNext (async)                                     | Rebuild from KrewPact on conflict                                   |
| RFIs           | RFI questions, responses, and resolution                | KrewPact              | KrewPact only                                                  | KrewPact owns RFI lifecycle                                         |
| Submittals     | Submittal documents and approvals                       | KrewPact              | KrewPact only                                                  | KrewPact owns submittal lifecycle                                   |
| Scheduling     | Project schedule, milestones, task assignments          | KrewPact              | KrewPact only                                                  | KrewPact owns schedule; external tools read via API                 |
| Time and Labor | Time entries and labor allocation                       | KrewPact              | KrewPact → ERPNext (async for payroll)                         | If discrepancy, audit KrewPact time entries against ERPNext payroll |
| Trade Partners | Subcontractor scope and assignments                     | KrewPact              | KrewPact only                                                  | KrewPact owns trade partner relationships                           |
| Compliance     | Compliance requirements and document collection         | KrewPact              | KrewPact only                                                  | KrewPact owns compliance tracking                                   |
| Documents      | Project documents, submittals, photos, compliance files | KrewPact (file store) | KrewPact only                                                  | KrewPact owns all project documentation                             |
| Customers      | Customer master data and contact information            | KrewPact              | KrewPact ↔ ERPNext (bidirectional sync)                        | Merge conflicts on data entry; prefer KrewPact if recent            |

This system-of-record table is referenced during design and implementation of any sync or integration feature. It ensures consistency and prevents conflicts.

### 4.3 Data Flow Principles

Data flows through KrewPact according to well-defined patterns that ensure consistency, auditability, and reliability:

**All Mutations Flow Through the API/BFF Layer**

Any change to any piece of data—creating a project, approving a change order, logging time, uploading a document—is initiated by a frontend request to the API. The API validates the request, applies business rules, checks authorization, records the change in the audit trail, and persists the change to the operational database. This pattern ensures that:

- Every change is authorized (RBAC is enforced)
- Every change is logged (audit trail is complete)
- Business rules are consistently applied (no bypassing logic)
- Data integrity constraints are maintained (database constraints prevent corruption)

**ERPNext Sync is Asynchronous**

When KrewPact decides that a financial transaction needs to occur (e.g., approving a change order that adds cost, or finalizing time entries for payroll), the API does not immediately call ERPNext. Instead, the API creates a job in the asynchronous queue. The job is picked up by a background worker that calls ERPNext's API, handles retries if the call fails, and records success or failure in the audit trail.

This asynchronous pattern ensures that:

- KrewPact remains responsive even if ERPNext is temporarily unavailable
- Retries are automatic and reliable (with exponential backoff)
- Failed sync attempts trigger alerts so manual investigation can occur
- The audit trail shows exactly when and why ERPNext was updated

**Optimistic UI with Server Validation**

When a user makes a change in the frontend (approving a change order, logging time), the frontend immediately reflects the change in the UI to provide a responsive feel. Simultaneously, the frontend sends the change to the API for validation and persistence. If the API rejects the change (invalid data, authorization failure, business rule violation), the UI reverts the change and displays an error message.

This pattern ensures that:

- The UI feels responsive and fast
- Invalid changes are caught and rejected
- The database remains the source of truth (UI changes are tentative)
- Users understand why their action was rejected

**Idempotent Operations for Reliability**

All operations in KrewPact are designed to be idempotent: performing the same operation twice produces the same result as performing it once. For example, approving a change order twice (if the network request is retried) does not create two approvals; it confirms the same approval twice.

Idempotency ensures that:

- Network retries do not cause data corruption
- ERPNext sync can be safely retried without duplicate transactions
- Background jobs can be safely restarted after failures
- Manual recovery is simpler and less error-prone

**Audit Trail on Every Mutation**

Every change to every piece of data is recorded in an immutable audit trail. The audit trail captures:

- What was changed (entity, field, old value, new value)
- Who changed it (user account)
- When it was changed (timestamp)
- Where it was changed from (API endpoint, frontend, integration)
- Why it was changed (if captured through UI context)

The audit trail enables:

- Compliance verification (answering "who approved this?")
- Dispute resolution (showing the history of changes)
- Learning and improvement (analyzing patterns in decisions)
- Debugging (reconstructing system state at any point in time)

### 4.4 Separation of Concerns (Licensing Strategy)

KrewPact is composed of multiple logical components with different licensing and intellectual property considerations. A clear separation of concerns ensures that:

1. Open source dependencies do not contaminate proprietary code
2. ERPNext customizations are properly licensed
3. The codebase remains manageable and evolvable

**Frontend (React/Next.js): Proprietary**

The KrewPact frontend is proprietary code owned by MDM Group. The frontend is a separate repository with strict dependency controls: only MIT or Apache-licensed open source dependencies are permitted. GPL or AGPL dependencies are not used.

Rationale: The frontend is the primary user-facing product and is critical to competitive differentiation. It must remain proprietary to protect MDM Group's investment.

**API and BFF Layer (Node.js): Proprietary**

The API layer is proprietary code owned by MDM Group. This layer contains core business logic, integration logic, and data transformation. Only MIT or Apache-licensed open source dependencies are permitted; GPL or AGPL dependencies are not used.

Rationale: The API layer encodes the business rules, workflows, and operational logic that differentiate KrewPact. This must remain proprietary.

**Supabase PostgreSQL Schema: Proprietary**

The database schema that embodies the unified data model is proprietary to MDM Group. The schema definition, migrations, and structure are not published or shared with third parties.

Rationale: The schema represents the information architecture and unified data model that is core to KrewPact value. This must remain proprietary.

**ERPNext Custom Apps: GPL v3**

Any custom apps, customizations, or extensions to ERPNext are developed under the GPL v3 license to comply with ERPNext's licensing. These components are maintained in a separate repository and are subject to GPL v3 requirements (copyleft, source code availability).

Rationale: ERPNext itself is GPL v3 licensed, and any code that extends or modifies ERPNext must also be GPL v3 licensed. This is a legal requirement, not a choice. However, keeping these customizations in a separate repository isolates them from proprietary code.

**ERPNext Core: Untouched**

KrewPact does not modify the core ERPNext codebase. Instead, all ERPNext customizations are implemented through custom apps, hooks, and APIs that ERPNext is explicitly designed to support. This ensures that:

- ERPNext upgrades do not break KrewPact
- The ERPNext community can continue supporting ERPNext without KrewPact-specific logic
- KrewPact maintains independence from ERPNext's roadmap and release cycle

---

## 5. FEATURE DOMAIN MAP

### 5.1 Epic Overview

KrewPact spans the entire construction lifecycle and is organized into 16 epics, each representing a distinct domain with specific features, complexity, and dependencies. The epics are the primary organizing principle for development, testing, and product management.

| Epic # | Domain                           | Key Features                                                                                              | Complexity | Dependencies                                                            |
| ------ | -------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| 1      | Identity and Access Management   | User provisioning, role assignment, RBAC enforcement, session management                                  | High       | Clerk, custom authorization layer                                       |
| 2      | Customer Relationship Management | Customer master data, contact management, communication history, customer categorization                  | Medium     | Project Execution, Contracting                                          |
| 3      | Estimating                       | Estimate creation, bid pricing, labor and material rates, historical productivity, proposal generation    | High       | Contracting, Project Execution, Financial Operations                    |
| 4      | Contracting                      | Contract terms, scope definition, contract templates, contract storage and retrieval                      | Medium     | Estimating, Customer Relationship Management, Document Control          |
| 5      | Project Execution                | Project master data, scope management, milestone tracking, status reporting                               | High       | All other epics (central hub)                                           |
| 6      | RFIs and Submittals              | RFI creation and tracking, submittal management, approval workflows, document versioning                  | High       | Project Execution, Document Control                                     |
| 7      | Change Orders                    | Change order creation, pricing, approval workflows, budget impact tracking                                | High       | Project Execution, Estimating, Financial Operations                     |
| 8      | Field Operations                 | Crew assignment, daily work logs, site conditions reporting, material management, quality tracking        | High       | Project Execution, Scheduling, Time and Payroll                         |
| 9      | Scheduling                       | Project schedule creation, task sequencing, resource leveling, critical path analysis, milestone tracking | High       | Project Execution, Field Operations, Time and Payroll                   |
| 10     | Time and Payroll                 | Time entry, labor tracking, payroll integration, attendance management                                    | High       | Project Execution, Financial Operations, Field Operations               |
| 11     | Financial Operations             | Job costing, budget tracking, cost accrual, financial reporting, ERPNext integration                      | High       | Project Execution, Time and Payroll, Estimating, Change Orders          |
| 12     | Client Portal                    | Project visibility, approval workflows, budget tracking, communication, progress photos                   | Medium     | Project Execution, Change Orders, Financial Operations, Notifications   |
| 13     | Trade Partner Portal             | Scope and schedule visibility, compliance document collection, time entry, submittal uploads              | Medium     | Project Execution, RFIs and Submittals, Time and Payroll, Notifications |
| 14     | Reporting and Analytics          | Project profitability, cash flow analysis, resource utilization, variance analysis, trend reporting       | Medium     | Financial Operations, Project Execution, Time and Payroll               |
| 15     | Notifications and Communication  | Email notifications, in-app alerts, communication log, alert configuration                                | Medium     | All epics (cross-cutting)                                               |
| 16     | Data Migration                   | Sage data import, legacy data validation, reconciliation, legacy data archival                            | High       | All epics (one-time)                                                    |

### 5.2 Feature Priority Matrix

Within each epic, individual features are prioritized using the MoSCoW (Must Have, Should Have, Could Have, Won't Have) method. This reflects the intended launch scope and subsequent enhancement phases.

**Epic 1: Identity and Access Management**

- **Must Have:**
  - User account creation and deletion
  - Login and logout
  - Multi-factor authentication (MFA)
  - Role-based access control (RBAC) with nine internal roles and four external roles
  - Permission enforcement at API level
  - Session management and timeout
  - Audit logging of authentication and authorization decisions

- **Should Have:**
  - Single Sign-On (SSO) via Clerk integrations
  - User deprovisioning workflows
  - Role change audit trail
  - Bulk user import and management

- **Could Have:**
  - Custom role creation and permission assignment
  - API token management for service accounts
  - Integration with LDAP or Active Directory

- **Won't Have:**
  - Custom password policies beyond industry standard

**Epic 2: Customer Relationship Management**

- **Must Have:**
  - Customer master record (name, address, contact info, tax ID, payment terms)
  - Customer contact and stakeholder management
  - Customer communication history (emails, notes, approvals)
  - Customer categorization (residential owner, commercial developer, institutional)
  - Customer search and filtering

- **Should Have:**
  - Customer portal user assignment
  - Historical project list per customer
  - Customer-specific contract terms
  - Customer document storage and retrieval

- **Could Have:**
  - Customer credit scoring or payment history analysis
  - Automated customer communication campaigns
  - Customer survey and feedback collection

- **Won't Have:**
  - Advanced CRM features (lead scoring, sales pipeline forecasting)

**Epic 3: Estimating**

- **Must Have:**
  - Estimate creation from blueprints and specifications
  - Labor rate and productivity rate management
  - Material cost and equipment cost input
  - Estimate line items and assemblies
  - Estimate summary and proposal generation
  - Project baseline creation from estimate
  - Historical estimate versus actual analysis

- **Should Have:**
  - Estimate templates for common project types
  - Estimate sharing and client presentation
  - Estimate version history and change tracking
  - Integrated material pricing from suppliers
  - Crew productivity rate libraries by trade and conditions

- **Could Have:**
  - Automated takeoff from digital files (BIM, PDF)
  - Parametric estimating for similar project scaling
  - Risk and contingency calculation
  - Estimate rolling forecasts

- **Won't Have:**
  - Advanced quantity pricing negotiations or dynamic pricing

**Epic 4: Contracting**

- **Must Have:**
  - Contract template library (customer contracts, subcontractor agreements)
  - Contract creation and customization
  - Contract terms and conditions management (payment, warranty, insurance requirements)
  - Signature capture and digital execution
  - Contract document storage and retrieval
  - Contract scope attachment and reference

- **Should Have:**
  - Contract version history and change tracking
  - Milestone and payment schedule definition
  - Insurance and bonding requirement specification
  - Automatic contract renewal or expiration notification

- **Could Have:**
  - Electronic signature integration (DocuSign, HelloSign)
  - Contract analytics (term distribution, risk patterns)
  - Approval workflows before contract execution

- **Won't Have:**
  - Legal AI or contract risk scoring

**Epic 5: Project Execution**

- **Must Have:**
  - Project creation and master data (name, address, customer, contract, budget)
  - Project scope statement and detailed scope documentation
  - Project status and milestone tracking
  - Project team assignment (project manager, coordinator, supervisors)
  - Budget baseline and variance tracking
  - Project-level document organization and retrieval
  - Project timeline (start, expected finish, actual finish)
  - Project closure and archival

- **Should Have:**
  - Project portfolio view and filtering
  - Project health dashboard (schedule, budget, quality status)
  - Project profitability tracking and accrual
  - Project risk and issue tracking
  - Project division and cost center assignment

- **Could Have:**
  - Project templates for common project types
  - Automated project notifications (milestones, overdue items)
  - Project dependency and critical path visualization
  - Scenario analysis and "what-if" budgeting

- **Won't Have:**
  - Multi-project resource planning (covered in Scheduling)

**Epic 6: RFIs and Submittals**

- **Must Have:**
  - RFI creation with question, context, and deadline
  - RFI assignment to architect or designer
  - RFI response tracking and response deadline enforcement
  - RFI resolution and decision recording
  - RFI history and status reporting
  - RFI impact on schedule and cost (if applicable)
  - Submittal receipt and review
  - Submittal approval or rejection
  - Shop drawing and sample management

- **Should Have:**
  - RFI and submittal templates
  - Batch RFI submission to multiple parties
  - RFI response time analysis
  - Submittal revision control and versioning
  - Submittal compliance checklist

- **Could Have:**
  - Automatic RFI deadline reminders and escalation
  - Integration with designer/engineer drawing systems
  - RFI impact analysis on critical path

- **Won't Have:**
  - AI-powered answer suggestions for RFIs

**Epic 7: Change Orders**

- **Must Have:**
  - Change order creation with scope change description
  - Change order pricing (material, labor, overhead)
  - Change order client proposal and approval
  - Approved change order implementation
  - Budget update from change order
  - Financial transaction creation in ERPNext
  - Change order history and status reporting
  - Multiple change order approval levels (project manager, executive, client)

- **Should Have:**
  - Change order template and standard pricing
  - Change order impact on schedule
  - Change order contingency reserves
  - Unapproved change order tracking (pending approval, pending client decision)
  - Cost-to-completion updates from change orders

- **Could Have:**
  - Automated change order recommendation from RFIs
  - Change order grouping for client presentation
  - Change order cost impact analysis (what-if scenario)

- **Won't Have:**
  - Predictive change order modeling

**Epic 8: Field Operations**

- **Must Have:**
  - Crew assignment to tasks and projects
  - Daily work log creation (what was accomplished, what is pending, what is blocked)
  - Site conditions and environment reporting
  - Material usage and inventory tracking
  - Safety incident and near-miss reporting
  - Quality issues and rework tracking
  - Subcontractor coordination and daily reporting
  - Progress photo documentation and tagging
  - Field-to-office communication and request submission

- **Should Have:**
  - Mobile-optimized field work interfaces
  - Offline capability for field logging (sync when connectivity returns)
  - Site cleanliness and housekeeping checklist
  - Weather and environmental impact logging
  - Equipment usage and maintenance tracking
  - Crew attendance and presence tracking

- **Could Have:**
  - GPS-based crew location tracking
  - Voice-to-text for field reporting
  - Real-time site condition alerts (safety hazards, progress issues)
  - Automated photo tagging and documentation

- **Won't Have:**
  - Real-time video streaming from sites

**Epic 9: Scheduling**

- **Must Have:**
  - Project schedule creation and task definition
  - Task sequencing and dependency management
  - Resource assignment to tasks
  - Critical path identification and reporting
  - Schedule baseline and actual progress tracking
  - Milestone definition and tracking
  - Schedule status reporting and variance analysis
  - Schedule updates and replanning

- **Should Have:**
  - Resource leveling and conflict detection
  - Schedule compression and crashing options
  - Historical schedule analysis and lessons learned
  - Schedule export for client and stakeholder communication
  - Schedule alerts for delayed tasks and critical path impacts

- **Could Have:**
  - Advanced scheduling constraints and calendars
  - Predictive schedule delay analysis
  - Automated schedule optimization

- **Won't Have:**
  - Integration with external scheduling tools (Primavera, Microsoft Project) beyond data export

**Epic 10: Time and Payroll**

- **Must Have:**
  - Time entry by employee and project assignment
  - Labor rate and wage tracking
  - Attendance and timekeeping
  - Overtime and premium pay tracking
  - Payroll integration with ERPNext
  - Labor cost accrual and reconciliation
  - Time entry validation (no overlapping assignments, rate validation)
  - Payroll audit trail and change tracking

- **Should Have:**
  - Mobile time entry for field workers
  - Geofencing for time punch clock (punch in/out tied to job site)
  - Per Diem and travel time tracking
  - Contract labor and 1099 tracking
  - Labor cost variance analysis (actual vs. estimate)
  - Crew utilization and availability tracking

- **Could Have:**
  - Predictive labor cost modeling
  - Workforce planning and allocation optimization
  - Integration with external payroll systems

- **Won't Have:**
  - Advanced HR functions (benefits administration, performance review) beyond basic compliance

**Epic 11: Financial Operations**

- **Must Have:**
  - Job costing structure and cost allocation
  - Budget definition and baseline
  - Cost tracking against budget
  - Variance analysis and cost control
  - Project profitability calculation
  - Invoice creation and tracking (sent to customer, payment received)
  - Change order cost impact
  - Financial reporting to ERPNext (one-way sync)
  - Cost accrual and monthly reconciliation

- **Should Have:**
  - Multi-level budget (estimate, baseline, committed, actuals)
  - Cost category hierarchy (labor, materials, equipment, overhead, general conditions)
  - Budget reserves and contingency management
  - Cost forecasting and cost-to-completion
  - Holdback tracking and mechanics lien compliance
  - Financial dashboard and executive reporting

- **Could Have:**
  - Integrated supplier pricing and purchasing
  - Automated cost posting from ERPNext
  - Advanced profitability and margin analysis
  - Cash flow forecasting

- **Won't Have:**
  - International currency and multi-entity consolidation (can be added later)

**Epic 12: Client Portal**

- **Must Have:**
  - Client login and access control (limited to their projects)
  - Project status and milestone view
  - Progress photos and documentation
  - Change order proposal presentation and approval
  - Invoice and payment status
  - Budget overview and cost tracking
  - Communication and message center
  - Document download and retrieval

- **Should Have:**
  - Mobile-responsive interface
  - Email notifications of pending approvals
  - Project documents (contracts, insurance, permits)
  - Field supervisor and trade partner contact information
  - Pending decisions and action items highlighting

- **Could Have:**
  - Video tour and site walkthrough documentation
  - Client survey and satisfaction feedback
  - Warranty information and post-completion care

- **Won't Have:**
  - Real-time cost tracking or financial details beyond approved budget and change orders

**Epic 13: Trade Partner Portal**

- **Must Have:**
  - Trade partner login and access control (limited to their assignments)
  - Project schedule and milestone view
  - Assigned scope and work description
  - Compliance requirement documentation (licenses, insurance, safety certs)
  - Submittal and shop drawing upload
  - Time entry for crew and material tracking
  - Invoice submission and payment status
  - Communication with project manager
  - Schedule changes and notifications

- **Should Have:**
  - Mobile-responsive interface
  - Email notifications of schedule changes
  - Photo documentation of completed work
  - Safety incident reporting
  - Equipment and material requests

- **Could Have:**
  - Integration with trade partner accounting systems
  - Automated compliance document renewal reminders
  - Performance metrics and rating

- **Won't Have:**
  - Financial settlement calculations (handled off-portal)

**Epic 14: Reporting and Analytics**

- **Must Have:**
  - Project profitability report (revenue, cost, margin by project)
  - Cash flow report and projection
  - Resource utilization report (crew hours, equipment usage)
  - Cost variance analysis (estimate vs. actual)
  - Schedule variance analysis (planned vs. actual dates)
  - Portfolio summary (active projects, revenue pipeline, margin)
  - Change order summary and approval status
  - Labor cost analysis by trade and project

- **Should Have:**
  - Executive dashboard with key metrics (active projects, revenue, margin, cash position)
  - Historical trend analysis (project profitability over time, schedule performance)
  - Crew productivity analysis
  - Client and trade partner performance scorecards
  - Customizable report templates
  - Report export (PDF, Excel, PowerPoint)

- **Could Have:**
  - Predictive analytics (cost forecasting, schedule prediction, risk assessment)
  - Benchmarking against historical projects
  - Anomaly detection (unusual costs, schedule slippage)
  - Custom report builder

- **Won't Have:**
  - Advanced machine learning or AI-driven insights (can be added in future)

**Epic 15: Notifications and Communication**

- **Must Have:**
  - Email notifications for key events (project created, approval needed, change order submitted, RFI received)
  - In-app notification center with unread notification tracking
  - User notification preference management (which events trigger notifications)
  - Notification history and search
  - Communication log (who said what, when)
  - Message and note attachment to entities (projects, change orders, RFIs)

- **Should Have:**
  - SMS notifications for urgent items (overdue approvals, safety incidents)
  - Notification templates and customization
  - Bulk notification dispatch
  - Read receipt tracking
  - Notification scheduling (do not disturb hours)

- **Could Have:**
  - Slack or Teams integration for notifications
  - Chatbot for common inquiries
  - Two-way email reply to notifications

- **Won't Have:**
  - Voice call notifications or IVR systems

**Epic 16: Data Migration**

- **Must Have:**
  - Sage 50 and Sage Construction Management data exports and transformation
  - Data validation and quality checks before import
  - Full project and historical data import (projects, customers, estimates, contracts, change orders)
  - User account migration and role mapping
  - Document and file migration
  - Data reconciliation and duplicate detection
  - Rollback capability during migration
  - Migration audit trail and validation report

- **Should Have:**
  - Incremental data sync during parallel running (legacy systems and KrewPact running simultaneously)
  - Cutover plan and execution support
  - User training materials generated from KrewPact
  - Post-cutover reconciliation and data quality checks

- **Could Have:**
  - Historical data cleanup and deduplication
  - Automated data quality improvement
  - Data archival of obsolete legacy data

- **Won't Have:**
  - Reverse migration or rollback to legacy systems after cutover

### 5.3 Cross-Cutting Concerns

Beyond the 16 epics, several capabilities permeate the entire system and require special attention during design and implementation:

**Security and Role-Based Access Control**

Security is not a feature but a foundation. Every endpoint, every query, every mutation is subject to authorization checks. Users can only access data relevant to their role and assigned projects. Security is enforced at multiple layers:

- **API Layer:** Endpoints validate the user's role and permissions before executing any query or mutation
- **Database Layer:** Row-level security policies ensure users cannot read data they are not authorized to see
- **Frontend Layer:** UI elements are hidden for users who lack necessary permissions
- **Audit Trail:** All access to sensitive data is logged

**Audit and Compliance**

Auditability is foundational to KrewPact. Every mutation creates an audit entry capturing what changed, who changed it, when, and (optionally) why. Audit entries are immutable and retained indefinitely. This enables:

- **Compliance verification:** Auditors can answer "Who approved this?" or "When was this decision made?"
- **Dispute resolution:** Showing the history of scope and cost changes
- **Investigation:** Reconstructing system state at any point in time
- **Learning:** Analyzing patterns in decisions and identifying improvements

**Offline Capability**

Field operations require offline capability. KrewPact frontends can sync relevant data locally, work offline without interruption, and re-sync when connectivity returns. Key considerations:

- **Selective sync:** Only relevant data (assigned projects, tasks, documents) is synced locally
- **Conflict resolution:** If the same data is modified offline and in the cloud simultaneously, a resolution strategy handles the conflict
- **Transparency:** Users understand what data is offline vs. cloud-based
- **Bandwidth efficiency:** Sync protocols minimize data transfer

**Notifications**

Users need to stay informed about events requiring attention: approvals needed, changes submitted, RFIs received, schedule changes, etc. Notifications are personalized, configurable, and delivered through appropriate channels (email, in-app, SMS).

**Search and Filtering**

Projects contain many documents, communications, and transactions. Users need powerful search and filtering to find what they need. Capabilities include:

- **Full-text search:** Searching document contents, comments, and notes
- **Faceted filtering:** Filtering by project, date, responsible party, status, etc.
- **Saved searches:** Users can save filters and reuse them
- **Search performance:** Indexed searches return results quickly even with large datasets

**File Management**

Projects accumulate many files: blueprints, contracts, submittals, photos, insurance certificates, etc. File management includes:

- **File organization:** Files are categorized and organized by type and purpose
- **Version control:** Multiple versions of documents are retained with change history
- **Access control:** Files are protected; only authorized users can access them
- **Long-term storage:** Files are reliably stored and accessible for years
- **Compliance:** Retention policies ensure files are kept as long as required

**Privacy (PIPEDA)**

KrewPact is built for Canadian contractors and complies with Canadian Personal Information Protection and Electronic Documents Act (PIPEDA) requirements:

- **Consent:** Users consent to collection and use of personal information
- **Transparency:** Users understand what personal information is collected and how it is used
- **Access and correction:** Users can access their personal information and request corrections
- **Retention:** Personal information is retained only as long as necessary
- **Security:** Personal information is protected against unauthorized access

**Accessibility (AODA/WCAG 2.0 AA)**

KrewPact is designed to be accessible to users with disabilities, in compliance with Accessibility for Ontarians with Disabilities Act (AODA) and Web Content Accessibility Guidelines (WCAG) 2.0 Level AA:

- **Keyboard navigation:** All functionality is keyboard accessible; users do not need to use a mouse
- **Screen reader compatibility:** Interfaces are compatible with screen readers used by blind and low-vision users
- **Color contrast:** Text has sufficient color contrast for users with low vision
- **Forms and labels:** Form fields are properly labeled so users understand what to enter
- **Video captions:** Any video content includes captions for deaf and hard-of-hearing users
- **Readability:** Content is written clearly and organized in a way that is easy to understand

---

## 6. COMPETITIVE LANDSCAPE

### 6.1 Direct Competitors

The construction software market is competitive, with several established platforms targeting different market segments. KrewPact directly competes with these platforms for the mixed residential and light commercial contractor segment:

**JobTread**

JobTread is a construction PM platform that MDM Group evaluated and uses as KrewPact's long-term feature floor — the minimum feature set KrewPact must always match or exceed across all phases (P0 through P2). JobTread's strengths define the baseline: ease of use for estimating and project creation, mobile field apps, and client portal capabilities. These are requirements, not differentiators. Areas where KrewPact must go further include:

- Single-company model; multi-division support is limited
- Limited integration options; limited ability to sync with ERPNext
- Customization is restricted; features cannot be adapted to unique MDM Group workflows
- Vendor roadmap does not align with mixed residential and light commercial construction trends
- Offline field operations are limited

**Buildertrend**

Buildertrend is a comprehensive construction management platform popular with residential builders. Strengths include robust scheduling, project management, and client portal. Limitations include:

- Designed primarily for residential; light commercial is an add-on
- Estimating tools are basic; detailed labor and material management is limited
- ERP integration is limited; financial operations require a separate system
- Pricing is per-user, which is expensive for large contractor teams
- Customization options are limited

**CoConstruct**

CoConstruct focuses on residential construction, particularly custom home building. Strengths include collaborative design tools, visual project management, and strong client engagement. Limitations include:

- Not designed for general contracting or commercial work; focus is narrow
- Financial capabilities are rudimentary; accounting requires external systems
- Multi-project scheduling and resource management is limited
- Scalability to large contractor operations is questionable

**Procore**

Procore is a comprehensive construction management platform targeting mid-market and enterprise contractors. Strengths include robust project management, financial integration, and marketplace of integrations. Limitations include:

- High cost and complexity; requires significant implementation and training
- Heavily geared toward large-scale commercial construction; less suitable for mixed residential and light commercial
- Implementation is lengthy and resource-intensive
- Offshore support and implementation can create cultural friction
- Strong focus on heavy civil and commercial infrastructure rather than mixed portfolio

**BuilderPrime**

BuilderPrime is a newer entrant focused on residential and light commercial construction. Strengths include modern interface, mobile-first design, and strong field operations. Limitations include:

- Limited financial integration; job costing is basic
- Limited reporting and analytics capabilities
- Still maturing; feature set is narrower than mature competitors
- Smaller company means less established support and roadmap certainty
- Limited track record with large operators like MDM Group

### 6.2 Differentiation

KrewPact is differentiated from competitors in several important ways:

**Integrated with ERP (Not Standalone)**

Unlike most competitors that operate as standalone project management systems, KrewPact is architected to sit on top of ERPNext as the financial backbone. This means:

- No duplicate entry of financial data; KrewPact initiates transactions that ERPNext executes
- Financial truth is always in ERPNext; KrewPact reflects financial results
- Job costing is integrated; actual costs flow from KrewPact to ERPNext to financial statements
- No reconciliation between two financial systems; one source of truth for money

**Built for Mixed Residential and Light Commercial**

Most construction software specializes in either residential (home builders) or commercial (large contractors). KrewPact is explicitly designed for contractors who build both residential developments (condos, townhomes) and light commercial projects (retail, office, small institutional) simultaneously. The unified data model supports:

- Different contract models (fixed price, cost-plus, design-build)
- Different project types with appropriate workflows
- Shared resources across mixed project portfolios
- Reporting that reflects mixed portfolio profitability

**Canadian Compliance Built-In**

Rather than bolting on compliance afterward, KrewPact incorporates Canadian legal requirements from inception:

- PIPEDA compliance for personal information
- Construction Act mechanics lien management
- AODA accessibility standards
- Canadian provincial construction practices and lien holds

**White-Label Ready**

The architecture supports deployment as a white-label solution for other contractors, enabling a secondary revenue stream and justifying the engineering investment in clean architecture and separation of concerns.

**Offline-First Field Operations**

Field operations often occur without reliable internet. KrewPact is architected for offline capability:

- Field crews sync relevant data locally, work offline, and re-sync when connectivity returns
- Conflict resolution handles simultaneous edits
- No loss of data even if network is unavailable for hours

**Portal Economy**

Rather than treating portals as afterthoughts, KrewPact is architected with portals as primary surfaces:

- Client Portal provides visibility and approval workflows that reduce friction
- Trade Partner Portal shifts administrative burden to subcontractors
- Portals drive engagement and decision-making speed

| Feature Comparison             | KrewPact                      | JobTread    | Buildertrend | Procore             |
| ------------------------------ | ----------------------------- | ----------- | ------------ | ------------------- |
| Mixed Residential + Commercial | Yes                           | Limited     | No           | Limited             |
| ERP Integration                | Native (ERPNext)              | Limited     | Limited      | Limited             |
| Offline Field Operations       | Yes                           | Limited     | No           | No                  |
| Canadian Compliance            | Yes                           | Partial     | No           | No                  |
| White-Label Ready              | Yes                           | No          | No           | No                  |
| Multi-Division Support         | Yes                           | Limited     | No           | Yes                 |
| Job Costing                    | Integrated (ERPNext)          | Basic       | Basic        | Yes                 |
| Client Portal                  | Yes                           | Yes         | Yes          | Yes                 |
| Trade Partner Portal           | Yes                           | No          | No           | Yes                 |
| Estimating Tools               | Full                          | Full        | Limited      | Yes                 |
| RFI and Submittal Management   | Yes                           | Yes         | Limited      | Yes                 |
| Change Order Management        | Yes                           | Yes         | Yes          | Yes                 |
| Cost Reporting                 | Rich                          | Basic       | Basic        | Rich                |
| Mobile Field Apps              | Yes                           | Yes         | Limited      | Yes                 |
| Customization                  | Framework (white-label ready) | Limited     | Limited      | Limited             |
| Pricing Model                  | TBD                           | Per-project | Per-user     | Per-project + usage |

---

## 7. SUCCESS METRICS

Success of KrewPact is measured across multiple dimensions: platform health, business impact, and user satisfaction. These metrics guide product decisions and investment priorities.

### 7.1 Platform Metrics

**User Adoption Rates**

Adoption measures the percentage of intended users actively using KrewPact. Successful adoption requires that users find value immediately and integrate KrewPact into their daily workflows.

- Metric: Percentage of MDM Group employees with active KrewPact accounts
- Target: 90% of intended users within 6 months of launch
- Measurement: Account creation and monthly active user metrics
- Action: Low adoption triggers training, workflow changes, or product adjustments

**Feature Utilization**

Not all features are used equally. High-value features should show strong utilization; underutilized features may indicate unclear value, difficulty of use, or redundancy with existing tools.

- Metric: Percentage of users leveraging each major feature
- Target: 70%+ utilization for core features (project management, time entry, RFI management); 40%+ for ancillary features
- Measurement: Event logging tracks feature usage
- Action: Underutilized features are investigated; usability improvements are prioritized

**System Uptime and Reliability**

KrewPact must be reliably available. Downtime or errors disrupt operations and erode user confidence.

- Metric: System uptime percentage and error rates
- Target: 99.9% uptime; error rates <0.1%
- Measurement: Infrastructure monitoring and application logging
- Action: Downtime incidents trigger investigation and prevention of recurrence

**Synchronization Success Rates**

Data sync between KrewPact and ERPNext is critical to financial accuracy. Failed sync operations create reconciliation burden.

- Metric: Percentage of sync operations that complete successfully
- Target: 99.9% sync success rate
- Measurement: Job queue monitoring and error tracking
- Action: Failed syncs trigger immediate investigation and manual reconciliation

**Portal Engagement**

Client and trade partner portals drive efficiency and satisfaction. Strong engagement indicates these users find value.

- Metric: Portal login frequency, action completion rates (e.g., change order approval rate), response times
- Target: 80% of invited portal users actively engage; average change order approval time <3 business days
- Measurement: Portal activity logging
- Action: Low engagement triggers outreach and usability investigation

### 7.2 Business Metrics

**Time Saved Per Project**

The primary business value of KrewPact is time savings through elimination of manual data entry, spreadsheet management, and email coordination.

- Metric: Hours saved per project (estimate field time, office coordination time, financial reconciliation)
- Target: 10% reduction in indirect time per project (roughly 40 hours per $2M project)
- Measurement: Time studies before/after implementation; comparison of project time allocation
- Action: If time savings lag target, identify bottlenecks and improve workflows

**Estimation Accuracy Improvement**

Estimating accuracy directly impacts project profitability. KrewPact provides better historical data and estimation tools.

- Metric: Accuracy of estimates (estimated total cost vs. actual total cost) as a percentage
- Target: Improve estimation accuracy from current 85% (within 15% of actual) to 92% (within 8% of actual)
- Measurement: Compare estimated cost to actual cost on completed projects
- Action: Systematic analysis of estimation misses to improve assumptions and rates

**Change Order Processing Time**

Change orders should be evaluated, priced, approved, and implemented quickly. Slow change order processing creates project delays and client frustration.

- Metric: Average time from change order proposal to client approval and implementation
- Target: Reduce from current average of 5 days to 2 days
- Measurement: Track timestamp from change order submission to approval in KrewPact
- Action: Identify bottlenecks (evaluation, approval, communication) and streamline workflow

**RFI Response Time**

RFIs block progress when answers are delayed. KrewPact should improve response time by clarifying responsibility and automating reminders.

- Metric: Average time from RFI submission to resolution
- Target: Reduce from current average of 7 days to 4 days
- Measurement: Track RFI submission and resolution timestamps
- Action: Analyze RFI types and responders; improve process for consistently slow responders

**Client Satisfaction (Portal NPS)**

Client satisfaction with project execution drives repeat business and referrals. Portal engagement and communication quality directly impact satisfaction.

- Metric: Net Promoter Score (NPS) from post-project client surveys focused on portal experience and communication
- Target: NPS > 50 (considered "good" for B2B construction)
- Measurement: Automated post-project survey sent to all clients
- Action: Analyze NPS by project manager and client type; identify best practices

---

## 8. RISK AND MITIGATION

### Risk: Scope Creep Across 16 Epics

**Description:** With 16 epics spanning the entire construction lifecycle, the temptation to build comprehensive features across all domains simultaneously is high. This leads to spreading engineering resources thin, missing deadlines, and quality problems.

**Mitigation:**

- Clear prioritization using MoSCoW for each epic's features
- Ruthless feature triage; "won't have" features are explicitly scoped out
- Regular scope freeze points; no feature additions once development phase begins
- Executive oversight of scope changes; any expansion requires clear justification and trade-off analysis
- Iterative release model; deliver valuable subsystems first, enhance later

### Risk: ERPNext Version Upgrades Breaking Sync

**Description:** ERPNext is actively maintained with regular version upgrades. Breaking changes in ERPNext APIs or data models could disrupt sync between KrewPact and ERPNext, causing financial data corruption or reconciliation burden.

**Mitigation:**

- Isolation of ERPNext integration in a dedicated module with stable APIs
- Comprehensive sync testing and validation; all sync operations verified on each ERPNext version
- Version compatibility matrix; document which KrewPact versions support which ERPNext versions
- Controlled ERPNext upgrade process; test all sync operations before upgrading production
- Fallback mechanisms; if sync fails, system alerts immediately and prevents further sync until investigated
- Custom apps in separate repository so they can be versioned independently of KrewPact core

### Risk: User Adoption Resistance

**Description:** Switching from legacy manual workflows to KrewPact requires significant user behavior change. Users accustomed to current processes may resist KrewPact if they perceive it as more complex or if training is inadequate.

**Mitigation:**

- Phased adoption with parallel running (legacy systems and KrewPact operating simultaneously for a period)
- Comprehensive training program tailored to each role; training occurs shortly before user relies on KrewPact
- Early adopter program; identify power users and train them deeply; they become peer mentors
- Feedback loops; collect user feedback regularly and make rapid improvements
- Pragmatic cutover; complete cutover only after confidence is high that users can succeed
- Dedicated support during transition; on-call expert support available during parallel running and immediately after cutover

### Risk: Offline/Online Data Conflict Resolution

**Description:** Field operations work offline, then re-sync when connectivity returns. If the same data is edited offline and in the cloud simultaneously, a conflict arises. Resolving conflicts manually is time-consuming and error-prone.

**Mitigation:**

- Optimistic locking; only one user can edit a given record simultaneously; offline edits are rejected if the record was changed in the cloud
- Conflict notification; users are immediately notified of conflicts and prompted to resolve
- Last-write-wins with audit trail; conflict resolution defaults to last write, but audit trail captures what was overwritten
- Selective offline sync; minimize data that syncs offline to reduce conflict surface area
- User education; users understand which data can be safely edited offline and which should wait for connectivity
- Testing of conflict scenarios; simulate conflicts during QA and ensure resolution is safe

### Risk: Portal Security for External Users

**Description:** Clients and trade partners access KrewPact through portals. Inadequate security could allow unauthorized access to sensitive project information or financial data.

**Mitigation:**

- Row-level security enforced at database level; users cannot access data outside their permitted scope
- Strong authentication; multi-factor authentication available for portal users
- Encrypted communication; all traffic over HTTPS; sensitive data encrypted at rest
- Regular security audits; third-party security assessment of portal code and infrastructure
- Compliance verification; portal compliance with PIPEDA, PCI-DSS (if payment info is handled), and other standards
- Access logging; all portal access is logged and auditable
- Session management; sessions expire automatically; users must re-authenticate regularly
- Rate limiting; protections against brute-force login attempts and API abuse

---

## 9. FUTURE VISION

KrewPact v1 delivers a unified operations hub that consolidates fragmented tools and manual processes. The v1 vision focuses on solving the immediate operational problems and establishing a strong foundation for future expansion.

Beyond v1, KrewPact will evolve to support increasingly sophisticated construction operations:

**AI-Powered Estimating**

Estimating is currently manual and relies on estimator expertise. Machine learning can learn from historical projects to recommend labor and material costs, automate quantity takeoffs from digital files, and flag unusual estimates for review.

Future capabilities:

- Automatic labor rate and productivity recommendations based on project characteristics
- Automated quantity takeoff from BIM models and PDFs
- Anomaly detection (estimate that deviates significantly from similar historical projects)
- Predictive accuracy scoring (confidence level in estimate based on project complexity and historical accuracy)

**Digital Takeoff Integration**

Quantity takeoff from blueprints is currently manual. Integration with digital takeoff tools (e.g., PlanSwift, BlueBeam) can automate this process, reducing takeoff time and improving accuracy.

Future capabilities:

- Import quantities directly from takeoff tool into estimate
- Automated unit conversion and assembly calculation
- Takeoff visualization overlaid on blueprints

**Predictive Scheduling**

Historical schedule data can inform predictions of how long tasks will take, which critical path is most likely to be delayed, and what milestones are at risk.

Future capabilities:

- Schedule recommendations based on historical duration of similar tasks
- Probability of on-time completion with current schedule
- Early warning of tasks at risk of delay based on actual progress to date
- Resource allocation optimization to improve schedule performance

**Deep BI and Analytics Warehouse**

Current reporting is transactional (project detail reports). A data warehouse enables sophisticated analysis of trends, patterns, and business insights.

Future capabilities:

- Historical trend analysis (how has our profitability evolved over years?)
- Comparative analysis (which project types are most profitable? which clients?)
- Predictive analytics (what is our projected cash position in 6 months?)
- Anomaly detection (which projects are outliers; which crews are most productive?)
- Executive decision support (what-if analysis; scenario modeling)

**Native Mobile Apps**

Web applications optimized for mobile are adequate for occasional access. Native mobile apps optimized for field use would improve adoption and usability.

Future capabilities:

- iOS and Android apps for field operations
- Offline-first architecture optimized for mobile
- Camera integration for progress photos
- GPS and geofencing for location tracking
- Voice recognition for hands-free work logging

**Marketplace for Integrations**

KrewPact will expose APIs enabling third-party developers to build integrations and extensions. A marketplace makes these integrations discoverable and installable.

Future capabilities:

- Material supplier integrations for automated pricing
- Digital drawing and BIM integrations
- Accounting system integrations beyond ERPNext
- Time tracking and attendance system integrations
- Document management integrations
- Third-party reporting and BI tools

**Multi-Language Support**

Canada is bilingual. Support for French alongside English will expand addressable market and improve user experience for French-speaking contractors and crews.

Future capabilities:

- Full UI localization to French
- Help and training materials in French
- Customer support in French
- Compliance documentation in French (PIPEDA, construction act references)

---

## Conclusion

KrewPact is a strategic platform designed to modernize construction operations at MDM Group and, subsequently, across the broader contractor market. By unifying fragmented tools, consolidating data silos, and integrating with ERP financial systems, KrewPact enables construction companies to operate with unprecedented visibility, speed, and control.

The 8-layer architecture provides a foundation for scalability, reliability, and evolution. The 16 epics span the complete construction lifecycle from estimating through warranty. The unified data model connects all aspects of business, enabling questions that currently require manual work to be answered instantly.

Success is measured not only by feature completeness but by business impact: time saved, estimation accuracy improved, change order processing accelerated, and client satisfaction increased. With disciplined execution, rigorous testing, and relentless focus on user adoption, KrewPact will deliver measurable value to MDM Group and become a strong platform for the contractor market.
