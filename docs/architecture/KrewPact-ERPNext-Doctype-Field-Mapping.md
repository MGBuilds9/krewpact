# KrewPact <-> ERPNext Doctype and Field Mapping (Production Contract)

## Purpose
This is the implementation contract for ERPNext integration.
It defines canonical doctype mapping, field mapping, sync direction, and customizations required to support KrewPact as the operational shell and ERPNext as the financial system-of-record.

## Integration Rules

> **Sync Architecture:** See [KrewPact-Integration-Contracts.md](./KrewPact-Integration-Contracts.md) for the queue-driven sync pattern (BullMQ), retry strategy, circuit breaker, idempotency, error handling, and webhook infrastructure.

- System of record:
  - ERPNext authoritative: AR/AP/PO/Invoices/Payments/GL-facing values.
  - KrewPact authoritative: workflow state, portal interactions, field logs, RFI/submittals, governance/audit context.
- Every synced record must store bidirectional external IDs:
  - Hub side: `erp_sync_map` (`hub_entity_type`, `hub_entity_id`, `erp_doctype`, `erp_name`).
  - ERP side: `custom_krewpact_id` (or equivalent custom field).
- Sync behavior:
  - Create from Hub to ERP for commercial/project setup entities.
  - Mirror from ERP to Hub for accounting statuses and posted totals.
  - Conflict rule: ERP financial status wins; Hub workflow metadata wins.
- All monetary values sync with explicit precision and tax context (Canada-first GST/HST/PST).

## Doctype Crosswalk

| Hub Entity | Hub Table(s) | ERPNext Doctype | Direction | Notes |
|---|---|---|---|---|
| Account | `accounts` | `Customer` | Bi-directional (Hub create, ERP status mirror) | Customer master |
| Contact | `contacts` | `Contact` (+ `Dynamic Link`) | Bi-directional | Contact roles may require custom child table |
| Opportunity/Lead | `leads`, `opportunities` | `Opportunity` | Hub -> ERP primary, ERP stage mirror optional | Qualified leads become opportunities |
| Estimate | `estimates`, `estimate_lines` | `Quotation`, `Quotation Item` | Hub -> ERP | Estimate versions remain in Hub; approved version exported |
| Proposal/Contract | `proposals`, `contract_terms`, `esign_*` | `Sales Order` (+ custom contract fields) | Hub -> ERP + ERP status mirror | Signed contract creates/updates sales order |
| Project | `projects` | `Project` | Bi-directional | Project status and actuals can mirror back |
| Tasks | `tasks`, `task_dependencies` | `Task` | Hub -> ERP optional mirror | Keep full dependency logic in Hub |
| Change Order | `change_orders` | `Sales Order` amendment OR custom `MDM Change Order` | Hub -> ERP | Choose one strategy and lock |
| RFQ Package | `rfq_packages`, `rfq_invites` | `Request for Quotation` | Hub -> ERP | Supplier invite orchestration |
| Bids | `rfq_bids` | `Supplier Quotation` | Hub -> ERP + ERP status mirror | Bid leveling stays in Hub |
| Award/PO | `rfq_bids` (awarded), `po_snapshots` | `Purchase Order` | Hub -> ERP + ERP -> Hub snapshot | Award converts to PO |
| AP Expenses | `expense_claims`, `expense_*` | `Expense Claim`, `Expense Claim Detail` | Hub -> ERP + ERP status mirror | Final posting authority ERP |
| Time | `time_entries`, `timesheet_batches` | `Timesheet`, `Timesheet Detail` | Hub -> ERP + ERP status mirror | ADP export remains Hub service |
| AR Invoice View | `invoice_snapshots` | `Sales Invoice` | ERP -> Hub | Read model in Hub |
| AP Invoice View | `po_snapshots` (and AP mirrors) | `Purchase Invoice` | ERP -> Hub | Read model in Hub |
| Job Cost View | `job_cost_snapshots` | `Project` + GL aggregates | ERP -> Hub | Derived read model |
| Trade Partner | `portal_accounts` (trade), compliance docs | `Supplier` + custom compliance doctypes | Hub -> ERP | Trade compliance gating |
| Selections/Allowances | `selection_*`, `allowance_reconciliations` | custom `MDM Selection Sheet`, optional SO/PO adjustments | Hub -> ERP selective | Workflow in Hub, accounting deltas in ERP |
| Closeout/Warranty/Service | `closeout_*`, `warranty_*`, `service_*` | custom doctypes | Hub -> ERP optional cost linkage | Optional ERP operations visibility |
| Privacy/BCP/Governance | `privacy_*`, `bcp_*`, `reference_data_*` | Hub only (default) | Hub only | Export-only if needed |

## Required ERPNext Custom Fields (minimum)

| Doctype | Field | Type | Purpose |
|---|---|---|---|
| Customer | `custom_mdm_account_id` | Data | Hub external ID |
| Customer | `custom_division` | Link/Data | Division scoping |
| Contact | `custom_mdm_contact_id` | Data | Hub external ID |
| Opportunity | `custom_mdm_opportunity_id` | Data | Hub external ID |
| Quotation | `custom_mdm_estimate_id` | Data | Hub estimate linkage |
| Quotation | `custom_mdm_estimate_version` | Int | Immutable estimate version |
| Sales Order | `custom_mdm_contract_id` | Data | Hub contract linkage |
| Sales Order | `custom_boldsign_envelope_id` | Data | E-sign traceability |
| Sales Order | `custom_allowance_total` | Currency | Allowance context |
| Project | `custom_mdm_project_id` | Data | Hub project linkage |
| Task | `custom_mdm_task_id` | Data | Hub task linkage |
| Request for Quotation | `custom_mdm_rfq_package_id` | Data | Hub RFQ package linkage |
| Supplier Quotation | `custom_mdm_rfq_bid_id` | Data | Hub bid linkage |
| Purchase Order | `custom_mdm_award_id` | Data | Award traceability |
| Expense Claim | `custom_mdm_expense_claim_id` | Data | Hub expense linkage |
| Timesheet | `custom_mdm_timesheet_batch_id` | Data | Hub batch linkage |
| Sales Invoice | `custom_mdm_project_id` | Data | Project correlation |
| Purchase Invoice | `custom_mdm_project_id` | Data | Project correlation |

## Required Custom Doctypes in ERPNext
- `MDM Trade Compliance Doc`
- `MDM Selection Sheet`
- `MDM Selection Choice`
- `MDM Allowance Reconciliation`
- `MDM Change Order` (if not using pure Sales Order amendment strategy)
- `MDM Closeout Package`
- `MDM Deficiency Item`
- `MDM Warranty Item`
- `MDM Service Call`

## Field Mapping Details

## 1) CRM and Master Data

### 1.1 Accounts -> Customer
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `accounts.id` | `Customer.custom_mdm_account_id` | UUID as string | Hub -> ERP |
| `accounts.name` | `Customer.customer_name` | passthrough | Hub -> ERP |
| `accounts.account_type` | `Customer.customer_type` | map (`company`,`individual`) | Hub -> ERP |
| `accounts.currency_code` | `Customer.default_currency` | default `CAD` | Hub -> ERP |
| `accounts.status` | `Customer.disabled` | active=false -> disabled=1 | Hub -> ERP |
| `accounts.division_id` | `Customer.custom_division` | lookup division code | Hub -> ERP |
| `Customer.name` | `erp_sync_map.erp_name` | mapping cache | ERP -> Hub |

### 1.2 Contacts -> Contact
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `contacts.id` | `Contact.custom_mdm_contact_id` | UUID string | Hub -> ERP |
| `contacts.first_name` | `Contact.first_name` | passthrough | Hub -> ERP |
| `contacts.last_name` | `Contact.last_name` | passthrough | Hub -> ERP |
| `contacts.email` | `Contact.email_id` | lowercase normalize | Hub -> ERP |
| `contacts.phone` | `Contact.phone` | E.164 sanitize | Hub -> ERP |
| `contacts.mobile` | `Contact.mobile_no` | E.164 sanitize | Hub -> ERP |
| `contacts.account_id` | `Dynamic Link.link_name` | map via `Customer.name` | Hub -> ERP |

### 1.3 Opportunities -> Opportunity
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `opportunities.id` | `Opportunity.custom_mdm_opportunity_id` | UUID string | Hub -> ERP |
| `opportunities.account_id` | `Opportunity.party_name` | customer lookup | Hub -> ERP |
| `opportunities.stage` | `Opportunity.status` | enum mapping | Bi |
| `opportunities.title` | `Opportunity.opportunity_title` | passthrough | Hub -> ERP |
| `opportunities.amount` | `Opportunity.opportunity_amount` | numeric precision(14,2) | Hub -> ERP |
| `opportunities.expected_close_date` | `Opportunity.expected_closing` | date | Hub -> ERP |
| `opportunities.source` | `Opportunity.source` | controlled vocabulary | Hub -> ERP |

## 2) Estimating, Proposal, Contract

### 2.1 Estimates -> Quotation / Quotation Item
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `estimates.id` | `Quotation.custom_mdm_estimate_id` | UUID string | Hub -> ERP |
| `estimates.version_no` | `Quotation.custom_mdm_estimate_version` | integer | Hub -> ERP |
| `estimates.opportunity_id` | `Quotation.opportunity` | lookup by mapped ERP Opportunity | Hub -> ERP |
| `estimates.account_id` | `Quotation.party_name`/`customer` | customer lookup | Hub -> ERP |
| `estimates.issue_date` | `Quotation.transaction_date` | date | Hub -> ERP |
| `estimates.valid_until` | `Quotation.valid_till` | date | Hub -> ERP |
| `estimates.currency_code` | `Quotation.currency` | default CAD | Hub -> ERP |
| `estimates.subtotal` | `Quotation.total` | currency | Hub -> ERP |
| `estimates.total` | `Quotation.grand_total` | tax-inclusive if applicable | Hub -> ERP |
| `estimate_lines.item_code` | `Quotation Item.item_code` | map cost code/item | Hub -> ERP |
| `estimate_lines.description` | `Quotation Item.description` | passthrough | Hub -> ERP |
| `estimate_lines.uom` | `Quotation Item.uom` | normalize UOM dictionary | Hub -> ERP |
| `estimate_lines.quantity` | `Quotation Item.qty` | decimal | Hub -> ERP |
| `estimate_lines.unit_rate` | `Quotation Item.rate` | currency | Hub -> ERP |
| `estimate_lines.line_total` | `Quotation Item.amount` | currency | Hub -> ERP |

### 2.2 Contract Terms -> Sales Order
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `contract_terms.id` | `Sales Order.custom_mdm_contract_id` | UUID string | Hub -> ERP |
| `contract_terms.proposal_id` | `Sales Order.custom_mdm_proposal_id` (custom) | UUID string | Hub -> ERP |
| `contract_terms.account_id` | `Sales Order.customer` | customer lookup | Hub -> ERP |
| `contract_terms.project_id` | `Sales Order.project` | project lookup | Hub -> ERP |
| `contract_terms.signing_date` | `Sales Order.transaction_date` | date | Hub -> ERP |
| `contract_terms.target_start_date` | `Sales Order.delivery_date` | date | Hub -> ERP |
| `contract_terms.contract_value` | `Sales Order.grand_total` | currency | Hub -> ERP |
| `contract_terms.payment_terms_template` | `Sales Order.payment_terms_template` | validated template name | Hub -> ERP |
| `esign_envelopes.provider_envelope_id` | `Sales Order.custom_boldsign_envelope_id` | string | Hub -> ERP |
| `Sales Order.status` | `contract_terms.erp_status` (virtual/sync map) | status mapping | ERP -> Hub |

## 3) Projects and Execution

### 3.1 Projects -> Project
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `projects.id` | `Project.custom_mdm_project_id` | UUID string | Hub -> ERP |
| `projects.name` | `Project.project_name` | passthrough | Hub -> ERP |
| `projects.account_id` | `Project.customer` | customer lookup | Hub -> ERP |
| `projects.start_date` | `Project.expected_start_date` | date | Hub -> ERP |
| `projects.target_end_date` | `Project.expected_end_date` | date | Hub -> ERP |
| `projects.status` | `Project.status` | enum mapping | Bi |
| `projects.budget` | `Project.estimated_costing` (or custom) | currency | Hub -> ERP |
| `projects.division_id` | `Project.department`/custom division | mapping table | Hub -> ERP |

### 3.2 Tasks -> Task (optional mirror)
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `tasks.id` | `Task.custom_mdm_task_id` | UUID string | Hub -> ERP |
| `tasks.project_id` | `Task.project` | mapped project | Hub -> ERP |
| `tasks.title` | `Task.subject` | passthrough | Hub -> ERP |
| `tasks.description` | `Task.description` | rich text sanitized | Hub -> ERP |
| `tasks.start_date` | `Task.exp_start_date` | date | Hub -> ERP |
| `tasks.due_date` | `Task.exp_end_date` | date | Hub -> ERP |
| `tasks.priority` | `Task.priority` | enum map | Hub -> ERP |
| `tasks.status` | `Task.status` | enum map | Bi |

## 4) Change Orders

### 4.1 Recommended Strategy: Custom Doctype + Sales Order Delta
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `change_orders.id` | `MDM Change Order.mdm_change_order_id` | UUID | Hub -> ERP |
| `change_orders.project_id` | `MDM Change Order.project` | linked project | Hub -> ERP |
| `change_orders.requested_by` | `MDM Change Order.requested_by` | user map | Hub -> ERP |
| `change_orders.amount_delta` | `MDM Change Order.amount_delta` | currency | Hub -> ERP |
| `change_orders.schedule_delta_days` | `MDM Change Order.schedule_delta_days` | integer | Hub -> ERP |
| `change_orders.status` | `MDM Change Order.status` | workflow map | Bi |
| `change_orders.approved_at` | `MDM Change Order.approved_on` | datetime | Hub -> ERP |
| `change_orders.id` | `Sales Order Item.custom_mdm_change_order_id` (if applied) | foreign reference | Hub -> ERP |

## 5) Procurement and AP

### 5.1 RFQ -> Request for Quotation
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `rfq_packages.id` | `Request for Quotation.custom_mdm_rfq_package_id` | UUID | Hub -> ERP |
| `rfq_packages.project_id` | `Request for Quotation.custom_project_ref`/`project` | lookup | Hub -> ERP |
| `rfq_packages.title` | `Request for Quotation.message_for_supplier` (header) | structured templating | Hub -> ERP |
| `rfq_packages.issue_date` | `Request for Quotation.transaction_date` | date | Hub -> ERP |
| `rfq_packages.due_date` | `Request for Quotation.schedule_date` | date | Hub -> ERP |
| `rfq_packages.status` | `Request for Quotation.status` | enum map | Bi |

### 5.2 Bids -> Supplier Quotation
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `rfq_bids.id` | `Supplier Quotation.custom_mdm_rfq_bid_id` | UUID | Hub -> ERP |
| `rfq_bids.rfq_package_id` | `Supplier Quotation.request_for_quotation` | mapped RFQ | Hub -> ERP |
| `rfq_bids.trade_partner_id` | `Supplier Quotation.supplier` | supplier lookup | Hub -> ERP |
| `rfq_bids.bid_amount` | `Supplier Quotation.grand_total` | currency | Hub -> ERP |
| `rfq_bids.valid_until` | `Supplier Quotation.valid_till` | date | Hub -> ERP |
| `rfq_bids.status` | `Supplier Quotation.status` | enum map | Bi |

### 5.3 Award -> Purchase Order
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `rfq_bids.id` (awarded) | `Purchase Order.custom_mdm_award_id` | UUID | Hub -> ERP |
| `rfq_bids.trade_partner_id` | `Purchase Order.supplier` | supplier lookup | Hub -> ERP |
| `rfq_bids.project_id` | `Purchase Order.project` | mapped project | Hub -> ERP |
| `rfq_bids.award_date` | `Purchase Order.transaction_date` | date | Hub -> ERP |
| `rfq_bids.expected_delivery` | `Purchase Order.schedule_date` | date | Hub -> ERP |
| `rfq_bids.bid_amount` | `Purchase Order.grand_total` | currency | Hub -> ERP |
| `Purchase Order.status` | `po_snapshots.status` | mirror snapshot | ERP -> Hub |

### 5.4 Trade Partner Compliance -> Supplier + Custom Doctype
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `trade_partner_compliance_docs.trade_partner_id` | `Supplier.name` | supplier map | Hub -> ERP |
| `trade_partner_compliance_docs.doc_type` | `MDM Trade Compliance Doc.doc_type` | enum map | Hub -> ERP |
| `trade_partner_compliance_docs.issue_date` | `MDM Trade Compliance Doc.issue_date` | date | Hub -> ERP |
| `trade_partner_compliance_docs.expiry_date` | `MDM Trade Compliance Doc.expiry_date` | date | Hub -> ERP |
| `trade_partner_compliance_docs.status` | `MDM Trade Compliance Doc.status` | active/expired/pending | Bi |
| `trade_partner_compliance_docs.file_url` | `MDM Trade Compliance Doc.attachment` | secure URL/link | Hub -> ERP |

## 6) AR/AP/Expenses/Time

### 6.1 Expense Claims -> Expense Claim
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `expense_claims.id` | `Expense Claim.custom_mdm_expense_claim_id` | UUID | Hub -> ERP |
| `expense_claims.employee_ref` | `Expense Claim.employee` | employee lookup | Hub -> ERP |
| `expense_claims.claim_date` | `Expense Claim.posting_date` | date | Hub -> ERP |
| `expense_claims.total_amount` | `Expense Claim.total_claimed_amount` | currency | Hub -> ERP |
| `expense_claims.status` | `Expense Claim.approval_status` | enum mapping | Bi |
| `expense_claims.project_id` | `Expense Claim Detail.project` | line-level mapping | Hub -> ERP |
| `expense_claims.cost_center` | `Expense Claim.payable_account`/`cost_center` | mapping table | Hub -> ERP |

### 6.2 Time Entries -> Timesheet
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `timesheet_batches.id` | `Timesheet.custom_mdm_timesheet_batch_id` | UUID | Hub -> ERP |
| `timesheet_batches.employee_ref` | `Timesheet.employee` | employee lookup | Hub -> ERP |
| `timesheet_batches.period_start` | `Timesheet.start_date` | date | Hub -> ERP |
| `timesheet_batches.period_end` | `Timesheet.end_date` | date | Hub -> ERP |
| `time_entries.project_id` | `Timesheet Detail.project` | mapped project | Hub -> ERP |
| `time_entries.task_id` | `Timesheet Detail.task` | mapped task | Hub -> ERP |
| `time_entries.hours` | `Timesheet Detail.hours` | decimal hours | Hub -> ERP |
| `time_entries.costing_rate` | `Timesheet Detail.costing_rate` | currency | Hub -> ERP |
| `timesheet_batches.status` | `Timesheet.status` | enum mapping | Bi |

### 6.3 Invoices (ERP mirror only)
| ERP Field | Hub Snapshot Field | Transform | Dir |
|---|---|---|---|
| `Sales Invoice.name` | `invoice_snapshots.erp_invoice_id` | passthrough | ERP -> Hub |
| `Sales Invoice.customer` | `invoice_snapshots.account_id` | reverse map | ERP -> Hub |
| `Sales Invoice.project` | `invoice_snapshots.project_id` | reverse map | ERP -> Hub |
| `Sales Invoice.posting_date` | `invoice_snapshots.invoice_date` | date | ERP -> Hub |
| `Sales Invoice.due_date` | `invoice_snapshots.due_date` | date | ERP -> Hub |
| `Sales Invoice.grand_total` | `invoice_snapshots.total_amount` | currency | ERP -> Hub |
| `Sales Invoice.outstanding_amount` | `invoice_snapshots.balance_amount` | currency | ERP -> Hub |
| `Sales Invoice.status` | `invoice_snapshots.status` | enum | ERP -> Hub |

## 7) Selections and Allowances

### 7.1 Selection Sheets -> Custom Doctypes
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `selection_sheets.id` | `MDM Selection Sheet.mdm_selection_sheet_id` | UUID | Hub -> ERP |
| `selection_sheets.project_id` | `MDM Selection Sheet.project` | mapped project | Hub -> ERP |
| `selection_sheets.category` | `MDM Selection Sheet.category` | enum | Hub -> ERP |
| `selection_sheets.allowance_budget` | `MDM Selection Sheet.allowance_budget` | currency | Hub -> ERP |
| `selection_choices.selection_option_id` | `MDM Selection Choice.option_ref` | reference | Hub -> ERP |
| `selection_choices.approved_by` | `MDM Selection Choice.approved_by` | user/contact ref | Hub -> ERP |
| `allowance_reconciliations.variance_amount` | `MDM Allowance Reconciliation.variance_amount` | currency | Hub -> ERP |
| `allowance_reconciliations.disposition` | `MDM Allowance Reconciliation.disposition` | (`credit`,`change_order`,`po_adjustment`) | Hub -> ERP |

## 8) Closeout, Warranty, Service

### 8.1 Custom Doctypes
| Hub Field | ERP Field | Transform | Dir |
|---|---|---|---|
| `closeout_packages.id` | `MDM Closeout Package.mdm_closeout_id` | UUID | Hub -> ERP optional |
| `closeout_packages.project_id` | `MDM Closeout Package.project` | map | Hub -> ERP optional |
| `deficiency_items.id` | `MDM Deficiency Item.mdm_deficiency_id` | UUID | Hub -> ERP optional |
| `deficiency_items.status` | `MDM Deficiency Item.status` | enum | Bi optional |
| `warranty_items.id` | `MDM Warranty Item.mdm_warranty_id` | UUID | Hub -> ERP optional |
| `service_calls.id` | `MDM Service Call.mdm_service_call_id` | UUID | Hub -> ERP optional |
| `service_calls.status` | `MDM Service Call.status` | enum | Bi optional |

## 9) Hub-Only (No ERP Persistence by Default)
- `rfi_items`, `rfi_threads`
- `submittals`, `submittal_reviews`
- `file_*`, `photo_*`
- `portal_*`
- `notifications`, `notification_preferences`
- `privacy_requests`, `privacy_request_events`
- `bcp_incidents`, `bcp_recovery_events`
- `feature_usage_events`, `adoption_kpis`
- `migration_*`

## Mapping Validation Gates
1. Every mapped entity has deterministic key strategy and idempotency key.
2. Every financial posting path is replay-safe and audited.
3. Every status enum has explicit translation map and unknown-state fallback.
4. Every field transform has test coverage for null, invalid, and edge values.
5. Every custom doctype/field exists in staging before integration UAT begins.

## Cutover Checklist for Mapping Readiness
- [ ] Custom fields created and migrated in ERPNext staging + production.
- [ ] Custom doctypes and workflow states deployed and permissioned.
- [ ] Mapping dictionary signed off by ERP lead + finance lead.
- [ ] End-to-end sample transactions validated for each mapped domain.
- [ ] Rollback plan documented for sync mismatch scenarios.
