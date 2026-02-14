# KrewPact Complete Forms Registry (Internal + External)

## Purpose
This document defines every operational form to be implemented in KrewPact for MDM Group's unified construction operations platform.
It covers internal operations, client portal, trade portal, and governance/admin forms.

## Form Design Standards (Applies to All Forms)
- Every create/update action writes immutable audit context (`actor`, `timestamp`, `source`, `before`, `after`).
- Required fields are validated server-side even when client-side validation exists.
- Forms with financial impact require explicit approval workflow state before ERP sync.
- File upload fields require checksum, MIME validation, malware scan status, and retention class.
- Offline-capable forms must support draft-save, conflict resolution, and replay-safe submission IDs.
- External-facing forms (client/trade) must enforce portal permission checks and project scoping.

## Internal Hub Forms

| Form ID | Form Name | Primary Roles | Required Fields (minimum) | Primary Tables | ERPNext Impact |
|---|---|---|---|---|---|
| AUTH-01 | Sign In / Session Bootstrap | all | identity provider token | `users` (read), `user_roles` (read), `user_divisions` (read) | None |
| AUTH-02 | Profile + MFA Preferences | all internal users | display name, phone, locale, MFA preference | `users`, `notification_preferences` | None |
| ORG-01 | Division Setup | platform_admin | division code, name, status, tax region | `divisions` | Optional mapping to Company/Branch custom config |
| ORG-02 | User Provisioning | platform_admin | email, full name, role(s), division(s), status | `users`, `user_roles`, `user_divisions` | Optional employee/sales user mapping |
| ORG-03 | Role + Permission Editor | platform_admin | role key, permission set, scope constraints | `roles`, `permissions`, `role_permissions` | None |
| ORG-04 | Policy Override Request | executive, platform_admin | policy key, override reason, expiry, approver | `policy_overrides` | None |
| CRM-01 | Lead Intake | project_manager, estimator, coordinator | source, lead name, contact channel, division, owner | `leads` | Sync to `Opportunity` (qualified leads) |
| CRM-02 | Account Form | project_manager, coordinator | account name, account type, billing region | `accounts` | Sync to `Customer` |
| CRM-03 | Contact Form | project_manager, coordinator | first name, last name, email, relationship | `contacts` | Sync to `Contact` |
| CRM-04 | Opportunity Form | project_manager, estimator | account, opportunity title, stage, expected value | `opportunities`, `opportunity_stage_history` | Sync to `Opportunity` |
| CRM-05 | Activity Log Form | project_manager, coordinator | activity type, date, owner, summary | `activities` | None |
| EST-01 | Cost Catalog Item | estimator, operations_manager | cost code, UOM, unit cost, effective date | `cost_catalog_items`, `cost_code_dictionary` | Optional to `Item Price`/`Item` |
| EST-02 | Assembly Builder | estimator | assembly name, version, line items, quantities | `assemblies`, `assembly_items` | Optional template artifact |
| EST-03 | Estimate Template Form | estimator | template name, division, sections | `estimate_templates` | None |
| EST-04 | Estimate Builder | estimator, project_manager | opportunity/project, lines, markup, contingency | `estimates`, `estimate_lines`, `estimate_versions` | Sync to `Quotation` |
| EST-05 | Alternate/Option Form | estimator | parent estimate, option label, amount | `estimate_alternates` | `Quotation Item` optional rows |
| EST-06 | Allowance Form | estimator, project_manager | parent estimate, allowance category, budget | `estimate_allowances` | Custom allowance fields in `Quotation`/`Sales Order` |
| EST-07 | Proposal Generation Form | estimator, project_manager | estimate version, legal template, exclusions | `proposals`, `proposal_events` | Feeds contract/Sales Order pipeline |
| CON-01 | Contract Terms Form | project_manager, executive | proposal ref, payment schedule, legal clauses | `contract_terms` | Sync to `Sales Order` + custom contract fields |
| CON-02 | E-Sign Envelope Form | project_manager | contract ref, signer list, routing order | `esign_envelopes`, `esign_documents` | Signed artifact linked to `Sales Order` |
| CON-03 | Contract Amendment Form | project_manager, executive | original contract, amendment reason, deltas | `contract_terms`, `proposal_events` | Sales Order amendment/change order trigger |
| PRJ-01 | Project Creation Form | operations_manager, project_manager | contract/opportunity ref, project code, start/end | `projects` | Sync to `Project` |
| PRJ-02 | Project Team Assignment Form | operations_manager, project_manager | project, user, role, assignment dates | `project_members` | Optional assignment metadata |
| PRJ-03 | Milestone Form | project_manager | project, milestone name, target date, status | `milestones` | Optional milestone custom child table |
| PRJ-04 | Task Form | project_manager, coordinator | project, title, assignee, due date, status | `tasks`, `task_dependencies` | Optional sync to `Task` |
| PRJ-05 | Task Comment Form | project_manager, coordinator, field_supervisor | task, comment body | `task_comments` | None |
| PRJ-06 | Daily Log Form (offline-capable) | field_supervisor | project, date, weather, labor count, work summary | `project_daily_logs` | Optional summarized project update |
| PRJ-07 | Site Diary Entry Form (offline-capable) | field_supervisor | project, timestamp, event type, details | `site_diary_entries` | None |
| PRJ-08 | Meeting Minutes Form | project_manager, coordinator | project, meeting date, attendees, decisions | `task_comments` or dedicated extension | None |
| DOC-01 | Folder Management Form | project_coordinator | parent folder, name, visibility class | `file_folders` | None |
| DOC-02 | File Metadata Form | project_coordinator | project/folder, file type, retention class | `file_metadata`, `file_versions`, `project_files` | Optional doc links |
| DOC-03 | File Share/Publish Form | project_coordinator, project_manager | file, audience, expiry, permission level | `file_shares` | None |
| DOC-04 | Photo Capture Form (offline-capable) | field_supervisor | project, timestamp, geo marker, caption | `photo_assets` | None |
| DOC-05 | Photo Annotation Form | field_supervisor, project_manager | photo, annotation text, coordinates | `photo_annotations` | None |
| RFI-01 | RFI Create Form | project_manager, project_coordinator | project, subject, question, due date, assignee | `rfi_items` | Optional project communication record |
| RFI-02 | RFI Response Thread Form | project_manager, trade_partner_user | rfi, response text, attachment refs | `rfi_threads` | None |
| SUB-01 | Submittal Create Form | project_coordinator, trade_partner_user | project, package type, due date, spec section | `submittals` | Optional procurement linkage |
| SUB-02 | Submittal Review Form | project_manager, operations_manager | submittal, review status, comments, next action | `submittal_reviews`, `submittals` | None |
| CHG-01 | Change Request Form | project_manager | project, reason, schedule impact, cost impact | `change_requests` | Pre-stage for ERP budget changes |
| CHG-02 | Change Order Form | project_manager, executive | approved change request, amount delta, approval evidence | `change_orders` | Sync to Sales Order amendment/Project budget |
| SAF-01 | Safety Form | field_supervisor | project, form type, checklist answers, signoff | `safety_forms` | None |
| SAF-02 | Safety Incident Form | field_supervisor, operations_manager | project, incident type, severity, description, actions | `safety_incidents` | Optional HR/insurance export |
| SAF-03 | Toolbox Talk Form | field_supervisor | project, topic, attendees, completion time | `toolbox_talks` | None |
| SAF-04 | Inspection Form | field_supervisor, project_manager | project, checklist, deficiencies, status | `inspections` | None |
| TIME-01 | Time Entry Form (offline-capable) | field_supervisor, trade_partner_user | project, person/crew, date, hours, cost code | `time_entries` | Sync to `Timesheet` |
| TIME-02 | Timesheet Batch Approval Form | payroll_admin, operations_manager | period, batch ID, approval decision | `timesheet_batches` | Export/sync to ADP + ERP cost journal |
| EXP-01 | Expense Claim Form | all internal users (policy scoped) | project, expense date, category, amount, currency | `expense_claims` | Sync to `Expense Claim` |
| EXP-02 | Expense Receipt Upload Form | claimant | claim, receipt image/PDF, merchant, tax amount | `expense_receipts` | Attachment to `Expense Claim` |
| EXP-03 | Expense Approval Form | accounting, operations_manager | claim, approval decision, account coding | `expense_approvals`, `expense_claims` | Post to AP in ERPNext |
| FIN-01 | Invoice Snapshot Review Form | accounting | project, invoice number, status, due date | `invoice_snapshots` | Mirror from `Sales Invoice` |
| FIN-02 | PO Snapshot Review Form | accounting, project_manager | supplier, PO number, status, amount | `po_snapshots` | Mirror from `Purchase Order` |
| FIN-03 | Job Cost Snapshot Review Form | executive, accounting | project, period, cost buckets, variance | `job_cost_snapshots` | Derived from ERP GL/project data |
| PROC-01 | RFQ Package Form | project_coordinator, project_manager | project, package title, scope, due date | `rfq_packages` | Creates `Request for Quotation` |
| PROC-02 | RFQ Invite Form | project_coordinator | rfq package, supplier/trade partner, invite channel | `rfq_invites` | Links to `Supplier` invitation context |
| PROC-03 | Bid Submission Form | trade_partner_user, coordinator | rfq package, bid amount, exclusions, lead time | `rfq_bids` | Creates/updates `Supplier Quotation` |
| PROC-04 | Bid Leveling Session Form | project_manager, estimator | rfq package, normalization assumptions | `bid_leveling_sessions` | None |
| PROC-05 | Bid Leveling Entry Form | estimator | leveling session, supplier, normalized values | `bid_leveling_entries` | None |
| COMP-01 | Compliance Document Upload Form | trade_partner_admin, coordinator | partner, doc type, issue/expiry date, file | `trade_partner_compliance_docs` | Optional supplier custom fields |
| SEL-01 | Selection Sheet Form | project_manager, client_owner | project, category, due date, allowance | `selection_sheets` | Optional custom doctype sync |
| SEL-02 | Selection Option Form | project_manager, coordinator | selection sheet, option label, cost delta | `selection_options` | Optional change order/PO path |
| SEL-03 | Selection Choice Form | client_owner, client_delegate | selection sheet, chosen option, notes | `selection_choices` | Triggers allowance reconciliation |
| SEL-04 | Allowance Reconciliation Form | project_manager, accounting | project, allowance category, committed vs budget | `allowance_reconciliations` | Sync adjustment to project budget/CO |
| CLS-01 | Closeout Package Form | project_manager, coordinator | project, checklist items, required docs, completion target | `closeout_packages` | Optional close status sync |
| CLS-02 | Deficiency Item Form | field_supervisor, project_manager | project, deficiency type, priority, due date | `deficiency_items` | None |
| CLS-03 | Warranty Item Form | project_manager | project, warranty scope, start/end, owner | `warranty_items` | Optional service context sync |
| CLS-04 | Service Call Form | client_owner, coordinator | project/warranty ref, issue summary, severity | `service_calls` | Optional service ticket sync |
| CLS-05 | Service Event Form | project_manager, field_supervisor | service call, event type, notes, next step | `service_call_events` | None |
| PORT-01 | Portal Account Invite Form | project_coordinator, platform_admin | email, account type, linked project(s), role | `portal_accounts` | None |
| PORT-02 | Portal Permission Form | project_manager, platform_admin | portal account, scope, permission set | `portal_permissions` | None |
| PORT-03 | Portal Message Form | project_manager, project_coordinator | project, recipient group, message body | `portal_messages` | Optional communication logging |
| PORT-04 | Portal Visibility Audit Form | project_manager | project, files/modules visibility matrix | `portal_permissions`, `portal_view_logs` | None |
| NOTIF-01 | Notification Preference Form | all users | channel preferences, event subscriptions | `notification_preferences` | None |
| PRIV-01 | Privacy Request Intake Form | platform_admin, privacy_officer | requester identity, request type, legal basis, due date | `privacy_requests` | Optional legal log export |
| PRIV-02 | Privacy Request Event Form | privacy_officer | privacy request, action taken, outcome | `privacy_request_events` | None |
| BCP-01 | Incident Record Form | security_lead, operations_manager | incident type, severity, start time, impact scope | `bcp_incidents` | None |
| BCP-02 | Recovery Event Form | security_lead, SRE | incident, recovery step, timestamp, result | `bcp_recovery_events` | None |
| GOV-01 | Reference Data Set Form | platform_admin, data_steward | set name, version, status | `reference_data_sets` | Optional ERP mapping table |
| GOV-02 | Reference Data Value Form | platform_admin, data_steward | set, key, display label, effective date | `reference_data_values` | Optional ERP mapping table |
| GOV-03 | Cost Code Dictionary Form | accounting, data_steward | cost code, description, active status | `cost_code_dictionary` | Sync to accounting dimensions/items |
| GOV-04 | Cost Code Mapping Form | accounting, ERP lead | hub cost code, erp account/item mapping, effective date | `cost_code_mappings` | Core ERP mapping artifact |
| MIG-01 | Migration Batch Form | migration_lead | source system, entity type, run window | `migration_batches` | None |
| MIG-02 | Migration Conflict Resolution Form | migration_lead, SME | conflict type, chosen resolution, approver | `migration_conflicts`, `migration_records` | None |

## Client Portal Forms

| Form ID | Form Name | Required Fields | Primary Tables | Notes |
|---|---|---|---|---|
| CPORT-01 | Client Change Approval | change order, decision, signer identity | `change_orders`, `proposal_events` | Must enforce signer authorization and e-sign evidence |
| CPORT-02 | Client Selection Submission | selection sheet, selected option, notes | `selection_choices` | Auto-triggers allowance variance check |
| CPORT-03 | Client Message Reply | message thread, reply text | `portal_messages` | Project-scoped only |
| CPORT-04 | Client Deficiency Confirmation | deficiency item, confirmation status | `deficiency_items` | Optional acceptance/signoff capture |
| CPORT-05 | Service Call Intake | project/warranty ref, issue details, urgency | `service_calls` | Route to warranty/service queue |

## Trade Portal Forms

| Form ID | Form Name | Required Fields | Primary Tables | Notes |
|---|---|---|---|---|
| TPORT-01 | Trade Organization Onboarding | company details, admin user, trade categories | `portal_accounts`, `portal_permissions` | Creates trade partner admin identity |
| TPORT-02 | Compliance Document Upload | doc type, issue/expiry dates, attachment | `trade_partner_compliance_docs` | Blocks assignment if expired/missing |
| TPORT-03 | Bid Submission | rfq package, amount, duration, exclusions | `rfq_bids` | Idempotent submit/update until deadline |
| TPORT-04 | Submittal Submission | project, submittal package, documents | `submittals` | Workflow enters `submitted` state |
| TPORT-05 | RFI Response | rfi item, response text, attachments | `rfi_threads` | Time-stamped and immutable after submit |
| TPORT-06 | Time Entry Submission | project, date, hours, crew metadata | `time_entries` | Policy checks for cutoff/locked periods |
| TPORT-07 | Safety/Inspection Submission | project, checklist responses, signatures | `safety_forms`, `inspections` | Available by project policy only |

## ERPNext Operational Forms (Surfaced/Linked from Hub)

| ERP Form ID | ERPNext Doctype/Form | Hub Triggering Form(s) | Required ERP Fields | Notes |
|---|---|---|---|---|
| ERP-01 | Customer | `CRM-02 Account Form` | `customer_name`, `customer_type`, `custom_mdm_account_id` | Created/updated from Hub account lifecycle |
| ERP-02 | Contact | `CRM-03 Contact Form` | `first_name`, `last_name`, `email_id`, `custom_mdm_contact_id` | Linked to customer via dynamic link |
| ERP-03 | Opportunity | `CRM-04 Opportunity Form`, `CRM-01 Lead Intake` | `party_name`, `status`, `opportunity_amount`, `custom_mdm_opportunity_id` | Qualified sales pipeline sync |
| ERP-04 | Quotation + Quotation Item | `EST-04 Estimate Builder`, `EST-07 Proposal Generation Form` | customer/opportunity refs, item lines, totals, `custom_mdm_estimate_id` | Approved estimate version only |
| ERP-05 | Sales Order | `CON-01 Contract Terms Form`, `CON-02 E-Sign Envelope Form` | `customer`, `project`, `grand_total`, `custom_mdm_contract_id` | Contract source of financial commitments |
| ERP-06 | Project | `PRJ-01 Project Creation Form` | `project_name`, `customer`, start/end dates, `custom_mdm_project_id` | Project financial anchor |
| ERP-07 | Task (optional mirror) | `PRJ-04 Task Form` | `project`, `subject`, status, `custom_mdm_task_id` | Hub remains workflow authority |
| ERP-08 | Request for Quotation | `PROC-01 RFQ Package Form`, `PROC-02 RFQ Invite Form` | `transaction_date`, `schedule_date`, `custom_mdm_rfq_package_id` | Procurement handoff |
| ERP-09 | Supplier Quotation | `PROC-03 Bid Submission Form` | `supplier`, RFQ reference, totals, `custom_mdm_rfq_bid_id` | Bids normalized in Hub |
| ERP-10 | Purchase Order | `PROC-05 Bid Leveling Entry Form` + award action | `supplier`, `project`, `grand_total`, `custom_mdm_award_id` | Awarded bid conversion |
| ERP-11 | Expense Claim | `EXP-01/02/03` | `employee`, `posting_date`, `total_claimed_amount`, `custom_mdm_expense_claim_id` | AP posting path |
| ERP-12 | Timesheet + Timesheet Detail | `TIME-01`, `TIME-02` | employee, period dates, hours, project/task refs | Payroll + costing bridge |
| ERP-13 | Sales Invoice (mirror) | `FIN-01` (read) | invoice number/date/status/totals | ERP authoritative; Hub read model |
| ERP-14 | Purchase Invoice (mirror) | `FIN-02` (read) | supplier, posting date, status, totals | ERP authoritative; Hub read model |
| ERP-15 | Custom MDM doctypes | `COMP-01`, `SEL-*`, `CHG-02`, `CLS-*` | custom fields per mapping contract | Required for extended construction workflows |

## Hidden/System Forms (Admin-Only Operational Screens)

| Form ID | Form Name | Purpose | Primary Tables |
|---|---|---|---|
| SYS-01 | Webhook Event Replay Form | replay failed webhook events safely | `webhook_events`, `idempotency_keys` |
| SYS-02 | ERP Sync Job Control Form | retry/dead-letter management | `erp_sync_jobs`, `erp_sync_errors`, `erp_sync_events` |
| SYS-03 | Notification Replay Form | resend failed notifications | `notifications` |
| SYS-04 | Audit Log Query Form | compliance investigations/exports | `audit_logs` |
| SYS-05 | Feature Flag / Adoption Dashboard Filters | release readiness and adoption checks | `feature_usage_events`, `adoption_kpis` |

## Form Implementation Priority
1. Must-have for pilot cutover: CRM, Estimating, Contracting, Project core, Docs, RFI/Submittals, CO, Time/Expense, RFQ/Bid, Compliance, Portals.
2. Must-have before full decommission: selections/allowances, closeout/warranty, privacy ops, BCP workflows.
3. Hardening wave: advanced governance controls, replay tooling UX refinements, expanded analytics filters.
