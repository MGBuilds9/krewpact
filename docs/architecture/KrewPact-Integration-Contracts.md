# KrewPact Integration Contracts

## Document Overview
This document specifies the external integration contracts for the KrewPact Construction Management Platform (V2). It defines the architecture, authentication methods, data flows, error handling, and monitoring strategies for all system integrations.

**Document Status**: Production Reference
**Last Updated**: February 2025
**Applies To**: KrewPact V2 and all downstream environments

---

## 1. INTEGRATION ARCHITECTURE OVERVIEW

### 1.1 Integration Patterns

KrewPact utilizes the following integration patterns based on use case requirements:

- **REST API Integration**: Synchronous request-response for immediate data exchanges (ERPNext, BoldSign, ADP Workforce Now)
- **Webhook Integration**: Asynchronous event-driven updates from external systems (ERPNext, Clerk, BoldSign, ADP)
- **Polling Integration**: Periodic batch synchronization for systems without webhook support (fallback for ADP, legacy systems)
- **OAuth 2.0 Delegation**: Delegated authentication flows for user-initiated actions (Microsoft Graph API)
- **API Key Authentication**: Direct authentication for service-to-service integration (BoldSign, custom integrations)

### 1.2 Message Queue Strategy for Asynchronous Operations

All asynchronous operations utilize BullMQ (Redis-backed job queue) for reliable, persistent processing:

- **Primary Queue**: `krewpact-sync` - handles all inter-system data synchronization
- **Webhook Queue**: `webhooks-inbound` - processes incoming webhook events from external systems
- **Notification Queue**: `notifications` - manages email, SMS, and push notification dispatch
- **Deadletter Queue**: `deadletter-sync` - captures failed jobs after max retry attempts
- **Scheduled Jobs**: Periodic sync tasks via BullMQ repeat functionality

**Queue Configuration**:
- Default concurrency: 5 workers per queue
- Job attempts: 3 retries before deadletter promotion
- Timeout: 30 seconds per job (configurable per integration)
- Redis persistence: Enabled with AOF (Append-Only File)

### 1.3 Idempotency Requirements

All integration endpoints and operations must be designed with idempotency as a first principle:

- **Unique Idempotency Keys**: Every mutable operation (POST, PUT, PATCH, DELETE) includes an `X-Idempotency-Key` header with UUID format
- **Duplicate Detection**: Server-side tracking of processed idempotency keys with 24-hour retention
- **Retry Safety**: Automatic retry of failed requests uses the same idempotency key, guaranteed no duplicate state changes
- **Entity-Level Idempotency**: Changes to entities like Estimates, Contracts, and Projects include a `change_id` field to prevent duplicate processing
- **Webhook Deduplication**: Inbound webhooks tracked by event ID to prevent processing the same event twice within 1-hour window

### 1.4 Error Handling Philosophy

KrewPact implements a comprehensive error handling strategy prioritizing data consistency and operational transparency:

**Retry Strategy**:
- **Exponential Backoff**: Base 2 seconds, max 60 seconds, jitter +/- 10%
- **Retry Attempts**: 3 attempts for transient errors (5xx, timeouts, network errors)
- **Permanent Failures**: Immediate deadletter promotion for 4xx errors (except rate limiting)
- **Rate Limit Handling**: Exponential backoff up to 5 minutes based on Retry-After header

**Dead Letter Queue Processing**:
- Failed sync jobs moved to deadletter queue after max retries
- Deadletter jobs retain full context: request, response, error, timestamp
- Manual review interface for deadletter queue with re-queue capability
- Automated alerts triggered when deadletter queue depth exceeds 10 items
- Daily deadletter report sent to integration team

**Error Classification**:
- **Transient**: Network timeouts, 503 Service Unavailable, temporary provider outages
- **Rate Limited**: HTTP 429 with Retry-After header
- **Validation**: HTTP 400 with structured error response (logged, no retry)
- **Authentication**: HTTP 401 with token refresh attempt, then deadletter if refresh fails
- **Authorization**: HTTP 403 (logged to security audit, no retry)
- **Server Error**: HTTP 5xx with exponential backoff
- **System Error**: Unexpected exceptions, deadletter after investigation

**Error Payload Standard**:
```json
{
  "timestamp": "2025-02-09T14:30:00Z",
  "error_code": "ERPNext.SYNC_CONFLICT",
  "error_message": "Document modified since last sync",
  "integration": "erpnext",
  "entity_type": "sales_order",
  "entity_id": "SO-2025-00123",
  "correlation_id": "uuid-v4",
  "retry_count": 2,
  "next_retry_at": "2025-02-09T14:31:05Z",
  "context": {
    "field": "delivery_date",
    "remote_value": "2025-03-15",
    "local_value": "2025-03-20",
    "resolution": "remote_wins"
  }
}
```

### 1.5 Circuit Breaker Pattern

All integration endpoints implement circuit breaker pattern to prevent cascading failures:

**Circuit States**:
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Integration failure detected, fast-fail new requests (return cached response or error)
- **HALF_OPEN**: Testing if integration recovered, allow limited requests

**Trip Conditions**:
- 5 consecutive failures in 60 seconds
- 50% error rate over last 100 requests
- Average response time exceeds 10 seconds for 30 seconds

**Recovery Process**:
- OPEN → HALF_OPEN after 30 seconds
- HALF_OPEN → CLOSED after 5 consecutive successful requests
- HALF_OPEN → OPEN if any request fails (retry recovery in 30 seconds)

**Fallback Behavior**:
- Read operations: Return last known good cached state with 1-hour TTL
- Write operations: Queue to deadletter for manual review when OPEN
- User notifications: Display "Integration temporarily unavailable" banner when OPEN for >5 minutes

---

## 2. ERPNEXT INTEGRATION (PRIMARY)

### 2.1 Connection Details

**Infrastructure**:
- **Deployment Model**: Self-hosted ERPNext instance (Docker containerized)
- **API Version**: Frappe REST API v2
- **Base URL Pattern**: `https://erp.krewpact.internal/api/resource/{doctype}`
- **Transport Security**: TLS 1.3 enforced, certificate pinning for production
- **Network**: Private VPC connectivity via AWS VPN or direct peering

**Authentication Methods**:

**Option A: API Key/Secret Pair** (Primary for service accounts)
- Header format: `Authorization: token {api_key}:{api_secret}`
- Key rotation: Quarterly, with 30-day overlap period
- Storage: Vault-encrypted environment variables, no hardcoding
- Per-doctype permissions enforced in ERPNext User role

**Option B: OAuth Bearer Token** (For user-initiated actions)
- Header format: `Authorization: Bearer {jwt_token}`
- Token source: Generated by custom Frappe middleware
- Expiration: 1 hour, with refresh token rotation
- Scopes: Limited to specific doctype operations

**Connection Configuration**:
```
Host: erp.krewpact.internal
Port: 443
API Endpoint: https://erp.krewpact.internal/api/resource
Webhook Endpoint: https://erp.krewpact.internal/api/method/erpnext_webhooks
Method Queue: frappe.client.set_value (async)
```

### 2.2 Sync Strategy

**Bidirectional Synchronization Model**:
- **System of Record (SoR)**: Designated per doctype to resolve conflicts
- **Direction**: KrewPact ↔ ERPNext (specified per mapping table)
- **Consistency Model**: Eventual consistency with 30-second SLO

**Sync Architecture**:
- **Message Queue**: BullMQ with Redis backend
- **Processing Model**: Asynchronous job-based with idempotency
- **Concurrency**: 5 sync workers per environment
- **Transaction Handling**: Eventual consistency with idempotent upsert, retry with backoff, and compensating transactions. *(Note: 2-phase commit was previously listed here but is not supported by ERPNext's Frappe API. See Architecture Resolution doc.)*

**Conflict Resolution**:
- **Last-Write-Wins (System of Record)**: When doctype SoR is a system, its values override
- **Field-Level Merging**: Some fields sync independently (e.g., amounts from ARP, addresses from CRM)
- **Change Audit Trail**: All conflicts logged with timestamps, users, and reason codes
- **Manual Override**: Portal interface for conflict resolution with approval workflow

**Sync Frequency**:
- **Financial Records** (Invoices, Purchase Orders, Payments): Real-time (webhook triggered)
- **Contracts & Estimates**: Near-real-time (5-minute maximum latency)
- **Projects & Tasks**: Near-real-time (10-minute maximum latency)
- **Master Data** (Customers, Suppliers, Employees): Batch sync (1 hour)
- **Historical Data**: Nightly full reconciliation at 2 AM UTC

**Initial Load Strategy**:
- Bulk import via Frappe Bench CLI for large datasets (>10K records)
- Paginated API requests (1000 records per batch) for medium datasets
- Automatic mapping of existing records by external key matching
- Audit logging of import source and timestamp

### 2.3 Entity Mapping Summary

The following table documents all KrewPact entity mappings to ERPNext doctypes:

| KrewPact Entity | ERPNext Doctype | System of Record | Sync Direction | Primary Trigger |
|---|---|---|---|---|
| Account (Company/Division) | Company | KrewPact | KrewPact → ERPNext | Creation, Update |
| Contact (Salesperson) | User | ERPNext | ERPNext → KrewPact | Creation, Role Change |
| Contact (Trade Partner Contact) | Contact | KrewPact | KrewPact ↔ ERPNext | Email Change, Address Update |
| Opportunity | Opportunity | KrewPact | KrewPact → ERPNext | Creation, Status Update |
| Estimate | Quotation | KrewPact | KrewPact → ERPNext | Creation, Line Item Change |
| Proposal/Contract (Client) | Sales Order | KrewPact | KrewPact → ERPNext | Execution/Signature |
| Proposal/Contract (Subcontract) | Purchase Order | KrewPact | KrewPact → ERPNext | Execution/Signature |
| Project | Project | KrewPact | KrewPact ↔ ERPNext | Creation, Status Update |
| Task | Task | KrewPact | KrewPact ↔ ERPNext | Creation, Assignment |
| Change Order (Prime) | Custom.ChangeOrder | KrewPact | KrewPact → ERPNext | Creation, Approval |
| Change Order (Sub) | Purchase Order Amendment | KrewPact | KrewPact → ERPNext | Creation, Approval |
| RFQ (Request for Quotation) | Request for Quotation | KrewPact | KrewPact → ERPNext | Creation, Issued |
| Bid (Supplier Quotation) | Supplier Quotation | KrewPact | KrewPact ← ERPNext | Received by Supplier |
| Purchase Order | Purchase Order | KrewPact | KrewPact → ERPNext | Execution, Issuance |
| Purchase Order Amendment | Custom.ChangeOrder | KrewPact | KrewPact → ERPNext | Creation, Approval |
| Expense Claim | Expense Claim | KrewPact | KrewPact → ERPNext | Submission, Approval |
| Time Entry (Timesheet) | Timesheet | KrewPact | KrewPact → ERPNext | Weekly Submission |
| Time Entry (Cost Labor) | Timesheet Detail | KrewPact | KrewPact → ERPNext | Hourly Recording |
| AR Invoice (Sales Invoice) | Sales Invoice | KrewPact | KrewPact → ERPNext | Generation, Posting |
| AP Invoice (Purchase Invoice) | Purchase Invoice | ERPNext | ERPNext → KrewPact | Receipt, Posting |
| AP Invoice Amendment | Purchase Invoice Amendment | KrewPact | KrewPact → ERPNext | Creation, Posting |
| Payment (AR) | Journal Entry | KrewPact | KrewPact → ERPNext | Recording, Application |
| Payment (AP) | Payment Entry | KrewPact | KrewPact → ERPNext | Recording, Application |
| Trade Partner (Supplier) | Supplier | KrewPact | KrewPact ↔ ERPNext | Creation, Status Update |
| Trade Partner (Subcontractor) | Supplier | KrewPact | KrewPact ↔ ERPNext | Creation, Status Update |
| Trade Partner (Vendor) | Supplier | KrewPact | KrewPact ↔ ERPNext | Creation, Status Update |
| Insurance Certificate | Custom.InsuranceCert | KrewPact | KrewPact → ERPNext | Upload, Expiry Update |
| Safety Certificate | Custom.SafetyAckn | KrewPact | KrewPact → ERPNext | Signed Document |
| Subcontractor Agreement | Custom.SubcontractorAgreement | KrewPact | KrewPact → ERPNext | Signed Document |
| BOM Item | Item | KrewPact | KrewPact ↔ ERPNext | Creation, Update |
| Work Breakdown Structure | Custom.WBS | KrewPact | KrewPact → ERPNext | Creation, Budget Update |
| Budget Line | Budget | KrewPact | KrewPact → ERPNext | Creation, Amount Update |
| Cost Code/Account | Cost Center | KrewPact | KrewPact → ERPNext | Creation, Mapping |
| PO Line Item | Purchase Order Item | KrewPact | KrewPact → ERPNext | Line Addition, Qty Update |
| SO Line Item | Sales Order Item | KrewPact | KrewPact → ERPNext | Line Addition, Qty Update |
| Material Requisition | Stock Request | KrewPact | KrewPact → ERPNext | Creation, Approval |
| Material Receipt | Purchase Receipt | KrewPact | KrewPact ← ERPNext | Received by Warehouse |
| Quality Inspection | Quality Inspection | KrewPact | KrewPact → ERPNext | Material Receipt |
| Safety Incident | Custom.SafetyIncident | KrewPact | KrewPact → ERPNext | Report, Investigation |
| Document Archive | File (Attachment) | KrewPact | KrewPact → ERPNext | File Upload |
| Compliance Requirement | Custom.ComplianceReq | KrewPact | KrewPact → ERPNext | Creation, Due Date Update |
| License/Certification | Custom.License | KrewPact | KrewPact → ERPNext | Creation, Expiry Update |
| Site Location | Custom.SiteLocation | KrewPact | KrewPact → ERPNext | Creation, Address Update |
| Equipment/Asset | Asset | KrewPact | KrewPact → ERPNext | Creation, Acquisition |
| Payroll Export | Monthly Record | KrewPact | KrewPact → ERPNext | Finalization, Posting |

**Total Mappings**: 43 entity types with bidirectional or unidirectional flows

**Mapping Governance**:
- Mapping changes require integration architect approval
- Field-level documentation maintained in ERPNext custom field metadata
- Quarterly audit of mapping completeness and data accuracy
- Version control: All mappings stored in Git with change history

---

> **Detailed Field Mapping:** See [KrewPact-ERPNext-Doctype-Field-Mapping.md](./KrewPact-ERPNext-Doctype-Field-Mapping.md) for the complete 43-doctype crosswalk, 16 required custom fields per doctype, 8 custom doctypes, field-level mapping details, and cutover checklist.

### 2.4 Required Custom Fields (ERPNext)

The following custom fields must exist in ERPNext to support KrewPact integration:

| Doctype | Field Name | Field Type | Purpose | Read-Only | KrewPact SoR |
|---|---|---|---|---|---|
| Sales Order | krewpact_id | Data (Link to KrewPact) | External reference to KrewPact Contract | No | KrewPact |
| Sales Order | krewpact_contract_type | Select | Contract type (Prime/Subcontract/Amendment) | No | KrewPact |
| Sales Order | krewpact_last_sync | DateTime | Timestamp of last KrewPact sync | Yes | System |
| Sales Order | krewpact_sync_status | Select | Sync state (pending/synced/conflict/error) | Yes | System |
| Purchase Order | krewpact_id | Data | External reference to KrewPact PO | No | KrewPact |
| Purchase Order | krewpact_line_items_hash | Data | Hash of line items for conflict detection | Yes | System |
| Purchase Order | krewpact_last_modified_by | Data | User/system that last modified in KrewPact | Yes | KrewPact |
| Quotation | krewpact_id | Data | External reference to KrewPact Estimate | No | KrewPact |
| Quotation | krewpact_validity_end | Date | Estimate expiration date | No | KrewPact |
| Quotation | krewpact_external_reference | Data | Customer's external reference (RFQ ID) | No | KrewPact |
| Purchase Invoice | krewpact_source_document | Link | Reference to KrewPact AP Invoice record | No | KrewPact |
| Purchase Invoice | krewpact_match_status | Select | Three-way match status (pending/matched/variance) | No | System |
| Sales Invoice | krewpact_source_document | Link | Reference to KrewPact AR Invoice record | No | KrewPact |
| Sales Invoice | krewpact_revenue_recognition | Select | Revenue recognition method for ASC 606 | No | KrewPact |
| Project | krewpact_id | Data | External reference to KrewPact Project | No | KrewPact |
| Project | krewpact_division | Link | Division identifier | No | KrewPact |
| Project | krewpact_wbs | Link | Reference to WBS structure | No | KrewPact |
| Task | krewpact_id | Data | External reference to KrewPact Task | No | KrewPact |
| Task | krewpact_phase | Data | Project phase/section | No | KrewPact |
| Task | krewpact_cost_code | Link | Cost code for labor tracking | No | KrewPact |
| Timesheet | krewpact_id | Data | External reference to KrewPact timesheet | No | KrewPact |
| Timesheet | krewpact_period | Data | Pay period identifier (YYYY-WW) | No | KrewPact |
| Timesheet Detail | krewpact_cost_code | Link | Cost code for labor allocation | No | KrewPact |
| Timesheet Detail | krewpact_charge_type | Select | Charge type (labor/equipment/material) | No | KrewPact |
| Supplier | krewpact_id | Data | External reference to KrewPact Trade Partner | No | KrewPact |
| Supplier | krewpact_partner_type | Select | Partner classification (Supplier/Subcontractor/Vendor) | No | KrewPact |
| Supplier | krewpact_division_access | Table (Link to Company) | Divisions this supplier can access | No | KrewPact |
| Contact | krewpact_id | Data | External reference to KrewPact Contact | No | KrewPact |
| Contact | krewpact_trade_partner_id | Link | Associated Trade Partner | No | KrewPact |
| Contact | krewpact_user_id | Link | Associated User account if applicable | No | KrewPact |
| User | krewpact_id | Data | External reference to KrewPact User | No | KrewPact |
| User | krewpact_divisions | Table (Link to Company) | Assigned divisions | No | KrewPact |
| User | krewpact_roles | Table | Custom role mappings for KrewPact | No | KrewPact |
| User | krewpact_portal_access | Check | Can access KrewPact portal | No | KrewPact |
| Expense Claim | krewpact_id | Data | External reference to KrewPact Expense | No | KrewPact |
| Expense Claim | krewpact_project | Link | Associated project | No | KrewPact |
| Expense Claim | krewpact_cost_code | Link | Cost code for allocation | No | KrewPact |
| Item | krewpact_id | Data | External reference to KrewPact Material | No | KrewPact |
| Item | krewpact_is_equipment | Check | Flag for equipment vs consumable | No | KrewPact |
| Item | krewpact_equipment_type | Select | Equipment classification | No | KrewPact |
| Cost Center | krewpact_id | Data | External reference to KrewPact Cost Code | No | KrewPact |
| Cost Center | krewpact_project | Link | Associated project | No | KrewPact |
| Cost Center | krewpact_phase | Data | Project phase identifier | No | KrewPact |

**Custom Field Configuration Standards**:
- All custom fields prefixed with `krewpact_` for easy identification
- Link fields require validation against corresponding KrewPact records
- Read-only fields populated by sync process only
- Select fields have predefined options documented in data dictionary
- Table fields use child doctypes where appropriate for complex data

### 2.5 Required Custom Doctypes (ERPNext)

The following custom doctypes must be created in ERPNext to support KrewPact-specific operations:

| Doctype | Purpose | Naming Convention | Key Fields | Permissions |
|---|---|---|---|---|
| ChangeOrder | Tracks prime contract and subcontractor change orders | CO-YYYY-XXXXX | krewpact_id, contract_id, description, amount, status, approver, effective_date | KrewPact service account: Read/Write, Managers: Read |
| CustomContract | Extended contract details (amendments, exhibits, insurance) | CTRCT-YYYY-XXXXX | krewpact_id, base_contract, amendment_number, effective_date, status | KrewPact service account: Read/Write, Legal: Read |
| SafetyAcknowledgment | Safety document signatures (tailgate, OSHA forms, certifications) | SAFE-YYYY-XXXXX | krewpact_id, document_type, signer_id, signature_date, status | KrewPact service account: Read/Write, Safety: Read |
| InsuranceCertificate | Certificate of Insurance tracking with expiry alerts | INS-YYYY-XXXXX | krewpact_id, vendor_id, policy_number, expiry_date, coverage_amounts, status | KrewPact service account: Read/Write, Insurance: Read |
| SubcontractorAgreement | Subcontractor master service agreement tracking | SUBAG-YYYY-XXXXX | krewpact_id, supplier_id, agreement_date, status, insurance_required, safety_required | KrewPact service account: Read/Write, Procurement: Read |
| WBS | Work Breakdown Structure with budget allocation | WBS-YYYY-XXXXX | krewpact_id, project_id, parent_wbs, budget_amount, cost_code, status | KrewPact service account: Read/Write, Managers: Read |
| ComplianceRequirement | Regulatory/contractual compliance items with tracking | COMP-YYYY-XXXXX | krewpact_id, project_id, requirement_type, due_date, responsible_party, status | KrewPact service account: Read/Write, Compliance: Read |
| SiteLocation | Physical site address tracking for multi-location projects | SITE-YYYY-XXXXX | krewpact_id, project_id, address, latitude, longitude, office_hours, status | KrewPact service account: Read/Write, Operations: Read |
| SafetyIncident | Safety incident reporting and investigation tracking | INC-YYYY-XXXXX | krewpact_id, project_id, incident_date, severity, description, investigation_status | KrewPact service account: Read/Write, Safety: Write, All: Read |
| License | Trade licenses and professional certifications tracking | LIC-YYYY-XXXXX | krewpact_id, license_type, holder_name, license_number, expiry_date, status | KrewPact service account: Read/Write, HR: Read |

**Custom Doctype Field Details**:
- Each custom doctype includes `krewpact_id` (Data, unique index, mandatory)
- Each includes `krewpact_last_sync` (DateTime, read-only, auto-update)
- Each includes `krewpact_sync_status` (Select: pending/synced/error, read-only)
- Each includes `creation_source` (Select: KrewPact/ERPNext/Import, read-only)
- Audit fields: `created_by`, `created_date`, `modified_by`, `modified_date` required
- All use standard ERPNext naming scheme with YYYY-XXXXX format

**Doctype Relationships**:
- ChangeOrder references Sales Order or Purchase Order via `krewpact_id`
- CustomContract references Sales Order via contract foreign key
- SafetyAcknowledgment references Contact and Project
- InsuranceCertificate references Supplier
- SubcontractorAgreement references Supplier (subcontractor type)
- WBS references Project and Cost Center
- ComplianceRequirement references Project
- SiteLocation references Project
- SafetyIncident references Project and User (reporter)
- License references User or Supplier

### 2.6 Webhook Configuration

**Incoming Webhook Events** (ERPNext → KrewPact):

| Event Name | Doctype | Trigger | Payload Size | Frequency |
|---|---|---|---|---|
| `document.after_insert` | Sales Invoice, Purchase Invoice | New invoice created | ~2 KB | Per invoice |
| `document.after_update` | Sales Order, Purchase Order | Document saved | ~3 KB | Per update |
| `document.after_submit` | Sales Order, Purchase Order | Document submitted | ~3 KB | Per submission |
| `document.after_amend` | Sales Order, Purchase Order | Amendment created | ~3 KB | Per amendment |
| `document.before_delete` | Sales Invoice, Purchase Invoice | Delete initiated | ~1 KB | Per deletion |
| `custom.after_change_order_approve` | ChangeOrder | Approval completed | ~2 KB | Per approval |
| `custom.after_wbs_update` | WBS | Budget or status change | ~2 KB | Per update |

**Webhook Payload Structure**:
```json
{
  "event": "document.after_submit",
  "key": "SO-2025-00123",
  "doctype": "Sales Order",
  "name": "SO-2025-00123",
  "action": "submit",
  "doc": {
    "doctype": "Sales Order",
    "name": "SO-2025-00123",
    "docstatus": 1,
    "krewpact_id": "contract-uuid",
    "customer": "CUST-001",
    "total": 125000.00,
    "delivery_date": "2025-03-20",
    "items": [
      {
        "item_code": "MAT-001",
        "qty": 100,
        "rate": 1250.00,
        "amount": 125000.00
      }
    ]
  },
  "user": "krewpact@erp.krewpact.internal",
  "webhook_id": "webhook-uuid-v4",
  "timestamp": "2025-02-09T14:30:00Z"
}
```

**Webhook Signature Verification**:
- **Algorithm**: HMAC-SHA256
- **Header**: `X-Frappe-Signature`
- **Secret**: Stored in Vault, rotated quarterly
- **Format**: Hex-encoded hash of payload + timestamp
- **Validation Code**:
```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

**Webhook Retry Policy**:
- **Initial Attempt**: Immediate upon event
- **Retry 1**: After 30 seconds (if HTTP 5xx, network timeout, or no response)
- **Retry 2**: After 5 minutes
- **Retry 3**: After 30 minutes
- **Max Retries**: 3 attempts total
- **Failure Action**: Logged to webhook failure queue, alert sent after 2 failed attempts
- **Manual Replay**: Available via webhook management interface with timestamp override

**Webhook Security**:
- **IP Allowlisting**: ERPNext instance IPs whitelisted in firewall
- **TLS Enforcement**: 1.3 minimum, certificate pinning enabled
- **Rate Limiting**: Max 100 webhooks per minute per doctype
- **Payload Encryption**: Optional end-to-end encryption for sensitive documents
- **Idempotency**: Webhook ID tracked to prevent duplicate processing within 1-hour window

### 2.7 Error Handling

**Sync Failure Scenarios**:

| Scenario | Root Cause | Detection | Response | Recovery |
|---|---|---|---|---|
| Document Conflict | Simultaneous edits in both systems | Version mismatch in sync check | Log conflict, queue for manual review | Manual resolution via conflict UI |
| Invalid Field Value | ERPNext validation rules changed | Validation error on POST/PUT | Deadletter with detailed error | Update mapping rules, manual correction |
| Authentication Failure | Token expired or revoked | 401 Unauthorized response | Attempt token refresh | Refresh service account credentials if persistent |
| Rate Limit Exceeded | Too many requests to ERPNext API | 429 Too Many Requests | Exponential backoff, queue backlog | Wait until quota reset (hourly/daily) |
| Network Timeout | Connectivity to ERPNext lost | TCP timeout, no response in 30 seconds | Retry with exponential backoff | Automatic after network recovery |
| Circular Sync | Entity updates trigger infinite loop | Sync depth > 5 in single chain | Stop processing, alert to ops | Human investigation, update trigger rules |
| Data Type Mismatch | Field definition changed in ERPNext | Type cast exception during sync | Deadletter, log schema mismatch | Schema update in custom field definition |
| Missing Referenced Entity | Related entity doesn't exist in target system | Foreign key constraint violation | Deadletter, queue parent entity sync | Sync parent entity first, retry child |
| Duplicate Record | Duplicate krewpact_id values exist | Unique constraint violation | Deadletter, report to data quality team | Merge duplicates, retry with corrected ID |
| Partial Update Failure | Some fields succeed, others fail | Mixed success/error in batch operation | Rollback all changes in transaction | Retry as single operation after fix |

**Retry Strategy with Exponential Backoff**:
```
Attempt 1: Immediate
Attempt 2: Base 2 seconds × 2¹ + jitter = ~2-4 seconds
Attempt 3: Base 2 seconds × 2² + jitter = ~4-8 seconds
Attempt 4: Base 2 seconds × 2³ + jitter = ~8-16 seconds (deadletter if still failing)

Jitter: +/- 10% random distribution
Max backoff: 60 seconds
```

**Dead Letter Queue Processing**:
- Failed sync job moved to `deadletter-sync` queue after 3 failed attempts
- Job record includes: original request, response, error message, stack trace, timestamps
- Deadletter dashboard shows: job count, oldest unresolved date, recent error patterns
- Alert triggers:
  - When deadletter queue depth > 10 items: Slack notification to #integration-alerts
  - When queue age > 24 hours: Escalation email to integration team lead
  - When single error pattern repeats > 5 times: Root cause analysis auto-ticket created
- Manual re-queue available with manual override of entity version numbers (requires approval)
- Jobs auto-expire from deadletter after 30 days (archived to audit log)

**Error Context Preservation**:
```json
{
  "job_id": "job-uuid-v4",
  "entity_id": "contract-uuid",
  "entity_type": "Contract",
  "operation": "create_sales_order",
  "request": {
    "method": "POST",
    "url": "https://erp.krewpact.internal/api/resource/Sales Order",
    "headers": {
      "Authorization": "token ***",
      "X-Idempotency-Key": "idempotency-uuid"
    },
    "body": { "customer": "CUST-001", "total": 125000.00 }
  },
  "response": {
    "status": 400,
    "message": "Customer CUST-001 not found in ERPNext"
  },
  "error": "Field validation failed: customer",
  "attempt": 2,
  "last_error_at": "2025-02-09T14:35:00Z",
  "next_retry_at": "2025-02-09T14:36:05Z",
  "context": {
    "division": "Division-A",
    "user_id": "user-uuid-v4",
    "reason_for_deadletter": "Customer master data mismatch"
  }
}
```

**Manual Reconciliation Process**:
1. Query deadletter queue and filter by entity type
2. Verify data consistency in KrewPact and ERPNext (manual queries or UI inspection)
3. Identify root cause: missing reference data, schema change, or system error
4. Take corrective action: create missing reference, update field mapping, fix data
5. Manual re-queue with force-override flag if necessary
6. Monitor retry in real-time via job status dashboard
7. Document root cause and corrective action in integration runbook

**Alerting Thresholds**:
- **Critical**: Single entity sync fails 3 times in 5 minutes (paged on-call)
- **High**: Deadletter queue depth > 50 items or age > 6 hours
- **Medium**: Sync latency exceeds 60 seconds (SLA breach)
- **Low**: Failed webhook delivery from ERPNext (< 5 consecutive)

### 2.8 Monitoring

**Sync Success Rate Targets**:
- **Overall Target**: > 99.5% success rate (monthly rolling window)
- **Financial Records**: > 99.9% (Invoices, POs, Payments)
- **Operational Records**: > 99.0% (Projects, Tasks, Estimates)
- **Master Data**: > 99.5% (Customers, Suppliers, Users)
- **Measurement**: (Successful syncs) / (Total sync attempts) including retries

**Latency Targets**:
- **Real-time syncs** (financial): P95 < 5 seconds, P99 < 10 seconds
- **Near-real-time** (contracts): P95 < 30 seconds, P99 < 60 seconds
- **Batch syncs** (master data): P95 < 5 minutes
- **Measurement**: Time from event trigger to final state consistency

**Queue Depth Monitoring**:
- **Normal**: < 100 jobs in queue
- **Warning**: 100-500 jobs (monitor processing rate)
- **Alert**: > 500 jobs or growth rate increasing
- **Dashboard**: Real-time queue depth graph with capacity forecast

**Key Metrics Dashboard**:
- Sync success/failure rates by doctype (24-hour and 7-day averages)
- Current queue depths by operation type
- Deadletter queue size and age
- Average latency by doctype
- Webhook delivery success rate and retry rate
- Circuit breaker state and trip/recovery events
- API response time distribution (p50, p95, p99)
- Authentication token refresh rate and failures

**Data Freshness Metrics**:
- Maximum time since last successful sync per entity type
- Count of entities with stale data (not synced in 24 hours)
- Percentage of krewpact_sync_status = "synced" in ERPNext records
- Conflict resolution rate (manual overrides per day)

**Reporting**:
- **Daily Report**: 24-hour sync metrics, errors, and queue status (email to team)
- **Weekly Report**: Trend analysis, deadletter statistics, improvement areas (team meeting)
- **Monthly Report**: SLA compliance, performance trends, recommendations (executive summary)
- **On-Demand**: Query builder for custom metrics across any date range

---

## 3. CLERK INTEGRATION (AUTHENTICATION)

### 3.1 Configuration

**Clerk Instance Setup**:
- **Application ID**: `prod_clerk_xxxxxxxxxxxxxx` (stored in Vault)
- **Frontend API Key**: `pk_live_xxxxxxxxxxxxxxxx` (publishable, public-safe)
- **Secret Key**: Stored in Vault, never committed to repository
- **Environment**: Production instance (no cross-environment token sharing)
- **Domain**: auth.krewpact.com (custom domain configured in Clerk Dashboard)

**JWT Template Configuration**:
- **Template Name**: `krewpact_jwt`
- **Issuer**: `https://auth.krewpact.com`
- **Audience**: `https://api.krewpact.com`
- **Signing Algorithm**: RS256 (RSA SHA-256)
- **Token Lifetime**: 1 hour (3600 seconds)
- **Refresh Lifetime**: 30 days

**Custom Claims in JWT**:
```json
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "email_verified": true,
  "name": "User Name",
  "given_name": "User",
  "family_name": "Name",
  "picture": "https://...",
  "iat": 1707480600,
  "exp": 1707484200,
  "iss": "https://auth.krewpact.com",
  "aud": "https://api.krewpact.com",
  "krewpact": {
    "user_id": "user-uuid-v4",
    "roles": ["project_manager", "estimator"],
    "divisions": ["division-uuid-1", "division-uuid-2"],
    "portal_access": false,
    "partner_type": "internal"
  }
}
```

**Webhook Configuration** (in Clerk Dashboard):
- **Event Types Enabled**:
  - user.created
  - user.updated
  - user.deleted
  - session.created
  - session.revoked
  - email_address.created
  - email_address.updated
  - organization.created (if using Organizations)
  - organization.updated
  - organizationMembership.created
  - organizationMembership.deleted

- **Webhook Endpoint**: `https://api.krewpact.com/webhooks/clerk`
- **API Version**: v1
- **Signing Algorithm**: HMAC-SHA256
- **Retry Policy**: 3 attempts with exponential backoff (Clerk-managed)

### 3.2 Authentication Flows

**Sign-Up Flow (Internal Users)**:
1. User navigates to `/sign-up` on KrewPact application
2. Clerk redirects to `https://auth.krewpact.com/sign-up?redirect_url=...`
3. User enters email, creates password, and verifies email address
4. Clerk creates user account and session
5. Webhook: `user.created` event triggers KrewPact user provisioning
6. Redirect back to application with authenticated session
7. KrewPact backend receives Clerk JWT in Authorization header
8. Verify JWT signature using Clerk public key (cached, refreshed daily)
9. Extract custom claims and authorize based on roles/divisions
10. Return application session cookie (separate from Clerk session)

**Sign-Up Flow (Portal Users - Trade Partners)**:
1. Trade Partner receives invitation email with unique signup link
2. Link includes preauthorized flag: `?type=portal&partner_id=...`
3. User fills registration form (limited fields: name, password, phone)
4. Webhook `user.created` triggers with metadata: `{"portal_user": true, "partner_id": "..."}`
5. KrewPact creates minimal user record with portal-only access
6. Redirect to portal dashboard with limited feature set

**Sign-In Flow (Standard)**:
1. User navigates to `/sign-in` or clicks sign-in on protected route
2. Clerk redirects to `https://auth.krewpact.com/sign-in?redirect_url=...`
3. User enters email and password
4. Clerk validates credentials, creates session token
5. Session token embedded in redirect URL as signed JWT
6. KrewPact verifies signature and extracts user ID
7. Create/update application session cookie
8. Redirect to originally requested URL

**Sign-In Flow (SSO - Future)**:
1. User clicks "Sign In with Corporate SSO"
2. Clerk redirects to SAML/OAuth provider
3. User authenticates with corporate IdP (Active Directory, Okta, etc.)
4. IdP returns assertion with user attributes
5. Clerk translates to Clerk user, creates session
6. Return to KrewPact with authenticated session
7. Webhook `user.created` fires for first-time SSO users

**Sign-In Flow (Magic Link - Future)**:
1. User enters email on sign-in page
2. Clerk sends magic link to email address
3. User clicks link in email
4. Link contains one-time code validated by Clerk
5. Session created without password requirement
6. Redirect to KrewPact with authenticated session

**Multi-Factor Authentication (MFA)**:
- **Enabled For**: All internal users (enforced)
- **Methods**: TOTP (Google Authenticator, Authy), Backup codes
- **Methods**: SMS (secondary option, for admin users)
- **Enrollment**: During first login, can be skipped for 7 days
- **Challenge Flow**: After password validation, user prompted for MFA code
- **Recovery**: Backup codes provided during setup, printable

**Session Management**:
- **Session Lifetime**: 30 days (absolute expiration)
- **Idle Timeout**: 4 hours (if no activity)
- **Token Refresh**: Automatic via refresh token (valid for 30 days)
- **Session Invalidation**: User logout, password change, admin revocation
- **Multiple Sessions**: User can have up to 5 active sessions (device limit)
- **Session Monitoring**: List active sessions in account settings, revoke individual sessions

**Session Storage**:
- **Client-Side**: Clerk SDK manages session cookie automatically
- **Secure Flag**: Always set, prevents JavaScript access
- **SameSite**: Strict (prevents CSRF attacks)
- **HttpOnly**: Enabled (prevents XSS token extraction)
- **Domain**: `.krewpact.com` (all subdomains)

### 3.3 Webhook Events

**user.created Event**:
```json
{
  "type": "user.created",
  "data": {
    "id": "user_2SiQXfq0L39dDjHZQO6QT4QVzCZ",
    "object": "user",
    "email_addresses": [
      {
        "id": "idn_2SiQXfq0L39dDjHZQO6QT4QVFGH",
        "email_address": "user@example.com",
        "verified": false
      }
    ],
    "first_name": "John",
    "last_name": "Doe",
    "profile_image_url": "https://img.clerk.com/...",
    "two_factor_enabled": false,
    "created_at": 1707480600000,
    "updated_at": 1707480600000
  }
}
```

**user.updated Event**:
```json
{
  "type": "user.updated",
  "data": {
    "id": "user_2SiQXfq0L39dDjHZQO6QT4QVzCZ",
    "first_name": "John",
    "last_name": "Smith",
    "email_addresses": [
      {
        "email_address": "john.smith@example.com",
        "verified": true
      }
    ],
    "updated_at": 1707481200000
  }
}
```

**user.deleted Event**:
```json
{
  "type": "user.deleted",
  "data": {
    "id": "user_2SiQXfq0L39dDjHZQO6QT4QVzCZ",
    "object": "user",
    "deleted": true
  }
}
```

**session.created Event**:
```json
{
  "type": "session.created",
  "data": {
    "id": "sess_2SiQXfq0L39dDjHZQO6QT4QVzCZ",
    "user_id": "user_2SiQXfq0L39dDjHZQO6QT4QVzCZ",
    "client": {
      "id": "web_2SiQXfq0L39dDjHZQO6QT4QVzCZ",
      "user_agent": "Mozilla/5.0..."
    },
    "created_at": 1707480600000,
    "last_active_at": 1707480600000
  }
}
```

**session.revoked Event**:
```json
{
  "type": "session.revoked",
  "data": {
    "id": "sess_2SiQXfq0L39dDjHZQO6QT4QVzCZ",
    "user_id": "user_2SiQXfq0L39dDjHZQO6QT4QVzCZ",
    "revoked_at": 1707481200000
  }
}
```

**Webhook Payload Handling**:
- All webhook payloads validated using HMAC signature
- Signature header: `svix-signature` contains timestamps and signatures
- Validate timestamp within 5 minutes (prevents replay attacks)
- Log all webhook events for audit trail
- Idempotent processing: track webhook event ID to prevent duplicates
- All operations should complete within 5 seconds (timeouts logged, not retried by Clerk)

**User Provisioning Workflow**:
1. Receive `user.created` webhook
2. Extract email, name, and metadata
3. Check if user already exists in KrewPact (by email)
4. If new user:
   - Create KrewPact user record with status "active"
   - Assign default role based on email domain or metadata
   - Assign division access based on metadata or email pattern
   - Create audit log entry
5. If existing user (reactivation scenario):
   - Update status to "active" if previously deleted
   - Restore division assignments
6. Send confirmation email to user with next steps
7. Return HTTP 200 OK to Clerk

**User Update Workflow**:
1. Receive `user.updated` webhook
2. Find KrewPact user by Clerk user ID
3. Sync fields: first_name, last_name, email
4. Handle email changes:
   - If email verified, update KrewPact email
   - If verification pending, ignore (wait for verification webhook)
5. Update audit log with change details
6. No confirmation email needed
7. Return HTTP 200 OK

**User Deletion Workflow**:
1. Receive `user.deleted` webhook
2. Find KrewPact user by Clerk user ID
3. Mark KrewPact user as deleted (soft delete, preserve audit trail)
4. Revoke all active sessions
5. Revoke API keys if any
6. Remove from all teams/divisions
7. Archive user data (comply with GDPR right to be forgotten)
8. Create audit log: "User deleted by Clerk"
9. Return HTTP 200 OK

### 3.4 User Sync

**Clerk to KrewPact User Provisioning**:

| Field | Clerk Source | KrewPact Target | Sync Timing | Bidirectional |
|---|---|---|---|---|
| User ID | user.id | user.clerk_user_id | Automatic | No |
| Email | user.email_addresses[0].email_address | user.email | On verified | No |
| First Name | user.first_name | user.first_name | Automatic | No |
| Last Name | user.last_name | user.last_name | Automatic | No |
| Profile Picture | user.profile_image_url | user.avatar_url | Automatic | No |
| Email Verified | user.email_addresses[0].verified | user.email_verified | Automatic | No |
| MFA Enabled | user.two_factor_enabled | user.mfa_enabled | Automatic | No |
| Created At | user.created_at | user.created_at | Automatic | No |
| Last Updated | user.updated_at | user.updated_at | Automatic | No |

**Role Assignment Workflow**:
1. **Default Role Assignment**:
   - Internal user emails (@krewpact.com): Default role = "member"
   - Trade partner emails (configured domains): Default role = "portal_user"
   - Admin-designated users: Role = "admin" (requires manual assignment)

2. **Metadata-Based Assignment**:
   - Clerk public metadata can include: `{"roles": ["project_manager", "estimator"]}`
   - KrewPact webhook processor reads metadata and assigns matching roles
   - If metadata missing, use default role
   - Roles must exist in KrewPact role table (validated)

3. **Role Change**:
   - Admin updates user roles in KrewPact dashboard
   - Changes immediately effect API authorization
   - No Clerk sync needed (KrewPact is system of record for roles)
   - Clerk metadata not updated bidirectionally

**Division Assignment**:
1. **Default Division Assignment**:
   - All internal users assigned to "Global" division
   - Portal users assigned to parent trade partner's division
   - Admins assigned to all divisions

2. **Custom Division Assignment**:
   - Admin can manually assign user to multiple divisions
   - User can only access projects/records within assigned divisions
   - Division assignment validated on every API request
   - Changes immediately effective

3. **Division Change**:
   - When division assignment changes, user loses access to previous division's data
   - Active sessions not immediately revoked (next request fails with 403)
   - User must re-login if all divisions removed

**Permission Assignment**:
1. Permissions derived from role + division combination
2. Role defines action capabilities (create, read, update, delete)
3. Division defines scope (which projects/records)
4. Combined via access control list evaluated on each request
5. Changes to role or division immediately propagate

**Deprovisioning (User Offboarding)**:
1. **Initiated By**: HR admin in KrewPact → "Offboard User"
2. **Actions**:
   - Mark KrewPact user as "inactive"
   - Revoke all API keys
   - Revoke all active sessions
   - Remove from all teams and divisions
   - Archive user's owned records (reassign or mark inactive)
   - Generate offboarding report (accessed items in final 30 days)
3. **Clerk Sync**:
   - KrewPact does NOT delete Clerk user (HR retains record for compliance)
   - If Clerk user deleted externally, KrewPact marks as inactive on next sync
4. **Data Access After Offboarding**:
   - Terminated users cannot login
   - Assigned records accessible only by new owner or admin
   - Audit logs preserve user's access history (regulatory compliance)

### 3.5 Security Considerations

**JWT Verification**:
- **Public Key Source**: Fetch from `https://auth.krewpact.com/.well-known/jwks.json` on startup
- **Key Caching**: Cache keys for 24 hours, invalidate on signature verification failure
- **Signature Check**: Verify RS256 signature using Clerk's public key
- **Claims Validation**:
  - `iss` matches expected issuer URL
  - `aud` matches expected audience
  - `exp` has not passed (allow 60 seconds clock skew)
  - `iat` not in future (allow 60 seconds clock skew)
- **Implementation**: Use `jsonwebtoken` library (Node.js) or equivalent, never manually decode

**Token Expiry and Refresh**:
- **Token Lifetime**: 1 hour (Clerk session)
- **Refresh Mechanism**: Automatic via Clerk SDK (client-side)
- **Refresh Token**: Valid for 30 days, rotated on each use
- **Expired Token Handling**: Return 401 Unauthorized, client redirects to login
- **Implicit Grant Fallback**: If refresh fails after 3 attempts, force re-authentication

**CORS Configuration**:
- **Allowed Origins**:
  - https://krewpact.com
  - https://*.krewpact.com
  - https://auth.krewpact.com
  - http://localhost:3000 (development only, via .env)
- **Allowed Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization, X-Idempotency-Key, X-Request-ID
- **Exposed Headers**: X-Total-Count, X-RateLimit-Remaining, X-RateLimit-Reset
- **Credentials**: Allow credentials (cookies, auth headers)
- **Max Age**: 86400 seconds (24 hours)

**Rate Limiting**:
- **Per User**: 100 requests per minute
- **Per IP**: 1000 requests per minute (all users combined)
- **Per Endpoint**: Tiered (login: 5/minute, API: 100/minute)
- **Rate Limit Headers**:
  - `X-RateLimit-Limit`: Max requests in window
  - `X-RateLimit-Remaining`: Requests left in window
  - `X-RateLimit-Reset`: Unix timestamp when window resets
- **Rate Limit Exceeded**: Return 429 Too Many Requests with Retry-After header
- **Bypass**: Whitelisted IPs for internal tools/integrations

---

## 4. BOLDSIGN INTEGRATION (E-SIGNATURES)

### 4.1 API Configuration

**BoldSign REST API Endpoints**:
- **Base URL**: `https://api.boldsign.com/v1`
- **API Version**: v1 (latest, no deprecation notices)
- **API Key**: Stored in Vault as `BOLDSIGN_API_KEY`, scoped to specific actions
- **Timeout**: 30 seconds for all API calls
- **Rate Limit**: 1000 requests per hour per API key

**Authentication Method**:
- **Type**: API Key in Authorization header
- **Header Format**: `Authorization: Bearer {api_key}`
- **Key Rotation**: Quarterly, with 30-day overlap
- **Key Permissions**: Limited to document and envelope operations (no account/user management)

**Environment Configuration**:
- **Sandbox Environment**:
  - **Base URL**: `https://api-sandbox.boldsign.com/v1`
  - **Use Case**: Development and testing, no production data
  - **API Key**: Separate sandbox key with limited quota
- **Production Environment**:
  - **Base URL**: `https://api.boldsign.com/v1`
  - **Use Case**: Live document signing
  - **API Key**: Production key, fully managed security

**API Endpoints Used**:
- `POST /templates`: Create signing templates
- `GET /templates/{templateId}`: Retrieve template details
- `POST /send/from_template`: Create envelope from template with signers
- `POST /send/document_bytes`: Create envelope from document bytes
- `GET /envelopes/{envelopeId}`: Retrieve envelope status and details
- `POST /envelopes/{envelopeId}/remind`: Send reminder to pending signers
- `POST /envelopes/{envelopeId}/void`: Cancel/void envelope
- `GET /envelopes/{envelopeId}/audit_trail`: Get audit trail (signature proof)
- `POST /webhooks`: Register webhook endpoint
- `GET /webhooks`: List registered webhooks

### 4.2 Document Signing Workflow

**Template Management**:
1. **Template Creation**: Lawyer creates template in BoldSign portal with:
   - Document name and description
   - Signer placeholder fields (e.g., "Client", "Contractor")
   - Signature field positions and sizes
   - Date signed field (auto-filled by BoldSign)
   - Multi-page document support
   - Text fields, checkbox fields, initial fields
2. **Template Storage**: Template ID noted in KrewPact and stored with document type
3. **Template Versioning**: When template changes (amendments), new version number assigned
4. **Template List**:
   - Template: Prime Contract (sc_template_1)
   - Template: Subcontract (sc_template_2)
   - Template: Amendment Letter (sc_template_3)
   - Template: Change Order (sc_template_4)
   - Template: Safety Acknowledgment (sc_template_5)
   - Template: NDA / Confidentiality (sc_template_6)

**Envelope Creation**:
1. KrewPact generates document (PDF) or uses existing template
2. Document embedded in envelope via template
3. Signers added to envelope:
   - Define signer order (sequential signing)
   - Assign roles (e.g., "Client Signature", "Contractor Signature")
   - Provide signer email address and name
4. Envelope metadata:
   - Contract ID (KrewPact reference)
   - External ID (for webhook correlation)
   - Redirect URLs (after signing completed/declined)
5. Request sent to BoldSign API:
```json
{
  "templateId": "sc_template_1",
  "signers": [
    {
      "email": "client@example.com",
      "name": "Client Name",
      "roleId": "client_signature",
      "sequenceNumber": 1
    },
    {
      "email": "contractor@example.com",
      "name": "Contractor Name",
      "roleId": "contractor_signature",
      "sequenceNumber": 2
    }
  ],
  "externalId": "contract-uuid",
  "messageTitle": "Prime Contract - Project ABC",
  "messageBody": "Please review and sign the attached contract. Contact [support] if you have questions.",
  "redirectUrl": "https://app.krewpact.com/contracts/{contract-uuid}/signed",
  "disableExpiryAlert": false,
  "expiryValue": 30,
  "expiryUnit": "days"
}
```

**Signer Assignment**:
- **Primary Signers**: Defined in contract template (e.g., Client, Contractor)
- **Secondary Signers**: Additional approvals (e.g., Safety Officer, Project Manager)
- **Signer Order**: Sequential (each signer signs in defined order) or parallel (all can sign simultaneously)
- **Signer Authentication**: Email-based (link sent to email, no additional login)
- **Multi-Signer Support**: Up to 10 signers per envelope

**Signing Ceremony (Embedded vs Email)**:

**Email Ceremony** (Primary):
1. KrewPact creates envelope with signers
2. BoldSign sends email to each signer with secure signing link
3. Email includes: contract preview, signing deadline, instructions
4. Signer clicks link (authenticated by email/one-time code)
5. BoldSign displays document with highlighted signature fields
6. Signer reviews, provides signature (draw, type, or upload image)
7. Signer provides initials on each page if required
8. Signer submits signature (BoldSign applies timestamp)
9. BoldSign sends confirmation email to signer
10. KrewPact receives webhook notification

**Embedded Ceremony** (Optional):
1. KrewPact creates envelope with signers
2. KrewPact generates unique signing URL for each signer
3. Signer directed to KrewPact portal with embedded signing UI
4. Signing UI powered by BoldSign JavaScript SDK
5. User sees document and can place signature/initials
6. On submission, SDK posts to BoldSign API
7. KrewPact receives webhook notification
8. User sees success message and redirect

**Completion Callback**:
- **Webhook Event**: `document_signed`, `document_declined`, `document_expired`
- **Payload**: Includes envelope ID, signer details, timestamp, audit trail reference
- **Processing**: KrewPact updates contract status, triggers notifications, updates audit log
- **Signature Extraction**: Download signed PDF via API: `GET /envelopes/{envelopeId}/documents/{documentId}`

### 4.3 Webhook Events

**Registered Webhook Events**:

| Event Type | Description | Trigger | Payload |
|---|---|---|---|
| envelope_sent | Envelope created and sent to signers | Immediate after API call | envelopeId, signers, timestamp |
| envelope_viewed | Signer viewed document | Signer clicks signing link | envelopeId, viewedBy, viewedAt |
| envelope_signed | Signer completed signature | Signer submitted signature | envelopeId, signedBy, signedAt, signatureData |
| envelope_completed | All signers completed signing | Last signer submitted | envelopeId, completedAt, allSigners |
| envelope_declined | Signer declined to sign | Signer chose decline option | envelopeId, declinedBy, declinedAt, reason |
| envelope_voided | Envelope cancelled by sender | Manual cancellation via API | envelopeId, voidedBy, voidedAt, reason |
| envelope_expired | Envelope signing deadline passed | Automatic after expiry date | envelopeId, expiredAt |

**Webhook Payload Example** (envelope_completed):
```json
{
  "eventType": "envelope_completed",
  "eventId": "webhook-event-uuid",
  "eventTimestamp": "2025-02-09T14:30:00Z",
  "envelope": {
    "id": "envelope_uuid_123",
    "externalId": "contract-uuid",
    "documentName": "Prime Contract",
    "createdDate": "2025-02-08T10:00:00Z",
    "completedDate": "2025-02-09T14:30:00Z",
    "signers": [
      {
        "email": "client@example.com",
        "name": "Client Name",
        "status": "signed",
        "signedDate": "2025-02-09T13:15:00Z",
        "signatureData": {
          "signature": "base64_encoded_signature_image",
          "timestamp": "2025-02-09T13:15:00Z"
        }
      },
      {
        "email": "contractor@example.com",
        "name": "Contractor Name",
        "status": "signed",
        "signedDate": "2025-02-09T14:30:00Z"
      }
    ]
  }
}
```

**Signature Verification**:
- **Algorithm**: HMAC-SHA256
- **Header**: `X-Boldsign-Signature`
- **Secret**: BoldSign webhook secret (stored in Vault, separate from API key)
- **Format**: Hex-encoded HMAC of raw request body
- **Validation Code**:
```python
import hmac
import hashlib

def verify_boldsign_webhook(body, signature, secret):
    expected = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

**Event Processing**:
1. Receive webhook HTTP POST
2. Verify signature (reject if invalid)
3. Parse JSON payload and extract `eventId`
4. Check if event already processed (idempotency key: `eventId`)
5. Look up envelope via `externalId` (contract UUID)
6. Update contract status based on event type:
   - `envelope_completed` → Set status "executed", store signed PDF
   - `envelope_declined` → Set status "declined", notify user
   - `envelope_expired` → Set status "expired", notify user
7. Generate audit trail entry with signer info and timestamp
8. Send notifications (email to relevant parties)
9. Return HTTP 200 OK (not 204, per BoldSign spec)
10. If processing fails: Return HTTP 5xx (BoldSign will retry)

### 4.4 Document Types and Signing Workflows

| Document Type | Template ID | Signers | Workflow | Storage | Retention |
|---|---|---|---|---|---|
| Prime Contract | sc_template_1 | Client, Contractor, PM (optional) | Client signs, then contractor, then PM approval | Supabase, ERPNext archive | 7 years (per contract law) |
| Subcontract | sc_template_2 | KrewPact (Prime), Subcontractor, Safety | Prime signs, then sub, then safety approval | Supabase, ERPNext archive | 7 years |
| Amendment Letter | sc_template_3 | Original signers of base contract | Each original signer re-confirms amendment | Supabase, linked to base contract | Same as base contract |
| Change Order | sc_template_4 | Client or Owner, Contractor, Finance Approval | Requester → Contractor → Finance → Client | Supabase, linked to project | Per contract (usually 7 years) |
| Safety Acknowledgment | sc_template_5 | Field Personnel | Individual signer, one-time acknowledgment | Supabase, per-worker | 3 years (OSHA retention) |
| NDA / Confidentiality | sc_template_6 | Employee or Partner, KrewPact Legal | Counterparty → KrewPact execution | Supabase, secure folder | 5 years post-execution |

**Signing Workflow Details**:

**Prime Contract Workflow**:
1. Legal prepares contract in KrewPact, references ERPNext sales order
2. PM submits contract for signature via "Initiate Signing"
3. KrewPact creates BoldSign envelope with client and contractor
4. Email sent to client and contractor signing links
5. Client signs first (sequential signing)
6. Contractor signs second
7. Optional: PM reviews and approves (if contract involves PM sign-off)
8. On completion: BoldSign webhook notifies KrewPact
9. KrewPact updates contract status to "Executed"
10. Signed PDF downloaded and stored in document vault
11. ERPNext Sales Order updated: status = "completed", reference to signed PDF added
12. Notifications sent: client, contractor, PM, finance

**Subcontract Workflow**:
1. PM prepares subcontract in KrewPact, references ERPNext PO
2. KrewPact initiates signing with: Subcontractor, KrewPact (prime), Safety officer
3. Subcontractor signs first
4. KrewPact execution (automated: pre-authorized signature or manual)
5. Safety officer approves (verifies insurance, certifications)
6. On completion: PDF stored, ERPNext PO updated
7. Subcontractor receives copy via email

**Change Order Workflow**:
1. PM or Finance initiates change order in KrewPact
2. Determines signers based on contract terms (client approval, contractor, finance)
3. KrewPact creates envelope
4. Signers receive signing link
5. Sequential signing per contract rules
6. On completion: Change order posted to project, budget updated
7. ERPNext GL entries created for budget adjustment

### 4.5 Compliance

**Canadian E-Signature Law Compliance**:
- **Jurisdiction**: Compliant with British Columbia Personal Information Protection Act (PIPPA) and similar provincial e-signature standards
- **Requirements Met**:
  - Documents can be signed electronically without special format
  - Signature authenticity verifiable (timestamp, audit trail)
  - Non-repudiation: Signer cannot deny signing
  - Consent: Signer confirms intent to sign (no click-through fraud)
  - Original document preserved (signed PDF is official copy)

**Audit Trail Preservation**:
- **Audit Trail Generation**: BoldSign automatically generates audit trail
- **Contents**:
  - Document name and ID
  - Signers and signer email addresses
  - Signature timestamp (server time, not user device)
  - IP address of signer
  - Device/browser information (user agent)
  - Signature placement (page and coordinates)
- **Audit Trail Access**:
  - Download via API: `GET /envelopes/{envelopeId}/audit_trail`
  - Embedded in signed PDF as metadata
  - Archived with signed document
- **Immutability**: Audit trail cannot be modified after signature
- **Certificate of Completion**: BoldSign generates completion certificate as separate document

**Long-Term Document Storage**:
- **Storage Location**: Supabase Storage (S3-compatible backend)
- **Retention Duration**: 7 years for contracts (per construction industry standards)
- **Backup**: Replicated to Cloudflare R2 for disaster recovery
- **Access Control**: Only authorized users and auditors can access
- **Encryption**: AES-256 encryption at rest, TLS 1.3 in transit
- **Versioning**: Original + signed versions both retained
- **Metadata**: Document type, signers, dates, audit trail stored in SQL database

**Certificate of Completion**:
- Generated by BoldSign upon envelope completion
- Includes:
  - Document identification (name, hash)
  - Signer information (names, emails, IP addresses)
  - Signature timestamp and timezone
  - Audit trail reference
  - BoldSign certification mark and validity period
- Stored alongside signed PDF
- Can be printed or exported as separate document
- Accepted as evidence of signature validity in legal proceedings

---

## 5. ADP WORKFORCE NOW INTEGRATION (PAYROLL)

### 5.1 API Access

**ADP Workforce Now API**:
- **API Platform**: ADP API Central (Swagger/OpenAPI specification available)
- **API Version**: 2.0 (latest, recommended version)
- **Base URL**: `https://api.adp.com` (production)
- **Authentication**: OAuth 2.0 with client credentials flow

**OAuth 2.0 Configuration**:
- **Grant Type**: Client Credentials (service-to-service)
- **Token Endpoint**: `https://auth.adp.com/auth/oauth/v2/token`
- **Client ID**: Stored in Vault as `ADP_CLIENT_ID`
- **Client Secret**: Stored in Vault as `ADP_CLIENT_SECRET`, rotated annually
- **Scope**: `time_and_labor:write`, `worker:read`, `payroll_input:write`
- **Token Lifetime**: 1 hour
- **Refresh Strategy**: Obtain new token 5 minutes before expiry (proactive refresh)

**Certificate-Based Authentication** (Optional, for higher security):
- **Certificate**: X.509 client certificate stored in Vault
- **Usage**: Mutual TLS (mTLS) for certificate pinning
- **Certificate Rotation**: Managed via ADP portal, 90-day overlap period
- **When Used**: High-security environments (production) as additional layer

**Sandbox Environment**:
- **Base URL**: `https://api-sandbox.adp.com` (non-production)
- **Use Case**: Development, testing, integration validation
- **Test Data**: Provided by ADP with sample employees and pay periods
- **No Production Data**: Sandbox completely isolated from live payroll
- **Credentials**: Separate sandbox OAuth credentials

**API Endpoints Used**:
- `POST /core/v1/time-and-labor/timesheets`: Submit time entries
- `GET /core/v1/workers`: Retrieve employee master data
- `GET /core/v1/workers/{workerID}`: Get individual employee details
- `GET /core/v2/payroll-input/current-payroll`: Retrieve current pay period
- `POST /core/v2/payroll-input/earnings-instructions`: Submit earnings/deductions
- `GET /core/v2/payroll-results`: Get processed payroll results
- `POST /core/v1/events/callbacks`: Register webhook endpoints

### 5.2 Data Flows

**Time Entry Export (KrewPact → ADP)**:

| Step | Source | Destination | Data | Frequency | Error Handling |
|---|---|---|---|---|---|
| 1 | KrewPact Time Entry | BullMQ Queue | timesheet_id, project_id, cost_code, hours, week_ending | Nightly at 10 PM | Deadletter if validation fails |
| 2 | Job Processor | ADP API | Formatted timesheet entries | Per submitted batch | Retry with backoff (3x) |
| 3 | ADP Validation | KrewPact DB | accepted/rejected status | Synchronous response | Update sync_status field |
| 4 | Weeklong Review | KrewPact Portal | Time entry summary for approval | Before Friday 5 PM | Manual correction interface |
| 5 | Approved Batch | ADP Payroll | Final submission | Weekly on Friday 6 PM | Post-submission audit |

**Time Entry Format**:
```json
{
  "externalId": "timesheet-uuid",
  "employeeId": "emp-123",
  "payPeriodEndDate": "2025-02-14",
  "timeEntries": [
    {
      "workDate": "2025-02-10",
      "costCode": "WBS-2025-01.1.2",
      "hoursWorked": 8.0,
      "chargeType": "regular",
      "projectReference": "project-uuid-123",
      "taskReference": "task-uuid-456"
    }
  ]
}
```

**Employee Data Import (ADP → KrewPact)**:

| Step | Source | Destination | Data | Frequency | Sync Method |
|---|---|---|---|---|---|
| 1 | ADP API | Query Job | Employee ID, name, status, department | Weekly on Monday | Scheduled job |
| 2 | Job Processor | KrewPact DB | Upsert into employee table | Per record | Idempotent update |
| 3 | Updated Records | Sync Queue | Employee changed records | Weekly | Webhook (if available) |
| 4 | Data Validation | KrewPact Audit | Import status, count, validation errors | Weekly | Audit log entry |

**Employee Data Mapping**:
```
ADP Field → KrewPact Field
workerID → emp_id (unique)
firstName + lastName → emp_name
personalEmail → email
payGroup → payroll_group
department → department
compensationFrequency → salary_type
effectiveDate → start_date
employmentStatus → status (active/inactive/terminated)
```

**Pay Period Sync**:
1. KrewPact queries ADP for current/next pay period on Monday
2. ADP returns: pay period start date, end date, cutoff date
3. KrewPact updates internal pay period calendar
4. Time entry window opens automatically (opens on cutoff date, closes Friday EOD)
5. Employees submit time in KrewPact
6. KrewPact exports time to ADP on Friday EOD
7. Payroll processed by ADP over weekend
8. Payroll results available on Wednesday

**Cost Allocation Mapping**:
- **KrewPact Cost Code** (WBS-based): e.g., `WBS-2025-01.1.2.3`
- **ADP Department/GL Code**: e.g., `DEPT-001`, `GL-5100-001`
- **Mapping Table**: Maintained in both systems, reconciled monthly
- **Mapping Process**:
  1. Finance defines cost allocation model in KrewPact
  2. Cost codes created with ADP GL mapping
  3. Time entries charged to cost code in KrewPact
  4. On export to ADP, cost code automatically maps to GL code
  5. ADP uses GL code for payroll expense allocation

### 5.3 Integration Points

| Data Element | Direction | Frequency | Format | Error Handling | SLA |
|---|---|---|---|---|---|
| Employee Master (hire, termination, status change) | ADP → KrewPact | Weekly batch | REST API JSON | Failed records in deadletter, retry next week | P95 < 5 minutes |
| Time and Attendance (hourly, project tracking) | KrewPact → ADP | Weekly batch (Friday 6 PM) | REST API JSON | Validation error → deadletter, manual review | Must complete by Saturday 2 AM |
| Payroll Results (deductions, taxes, net pay) | ADP → KrewPact | Weekly on Wednesday | REST API JSON or SFTP file | Download retry, fallback to manual check-in | P95 < 10 minutes |
| Cost Center / Department Mapping | Both → Central registry | Monthly reconciliation | SQL database + Excel export | Discrepancies flagged, documented | Manual sign-off required |
| Leave Balances (annual leave, sick leave) | ADP → KrewPact | On update (real-time webhook if available, else daily) | REST API JSON | Cache with 24-hour TTL | P95 < 60 seconds |
| Worker Assignment (project/task allocation) | KrewPact → ADP | On update | Via time entry metadata | No direct API (implied via cost code) | N/A |

**Time and Attendance Detail**:
- **Time Entry Submission**: Weekly per employee (Friday EOD)
- **Fields Captured**: Date, hours worked, cost code, project, task, notes
- **Approval Workflow**: Employee submits → PM approves → Finance reviews → Post to ADP
- **Corrections**: Allowed until cutoff (Friday 5 PM), then manual adjustment needed
- **Audit Trail**: All entries, approvals, modifications logged with timestamp

**Payroll Results Detail**:
- **Frequency**: Weekly (pay period cycle)
- **Data Included**: Gross pay, deductions, taxes, net pay, check information
- **Format**: JSON API response or SFTP CSV file (backup)
- **Processing**: KrewPact imports results, calculates cost allocations, posts to GL
- **Variance Reporting**: Payroll vs. expected salary exceptions flagged

**Cost Allocation Integration**:
- **Chart of Accounts**: GL 5100 (Labor - Direct), GL 5200 (Labor - Indirect)
- **Cost Center Mapping**: WBS phase maps to GL cost center
- **Allocation Method**: Time × hourly rate → GL entry
- **Monthly Reconciliation**: Actual vs. budget by project, variance analysis
- **Reporting**: Project financial dashboard shows labor cost by phase

### 5.4 ADP Workforce Now Partner Program Requirements

**Certification Requirements**:
- **ADP Integration Certification**: KrewPact must pass ADP integration testing
- **Testing Scope**:
  - Employee data synchronization (hire, update, terminate)
  - Time and labor submission and processing
  - Error handling and retry logic
  - Security and authentication (OAuth 2.0)
  - Compliance with ADP API standards
- **Certification Valid**: 12 months
- **Recertification**: Annual audit of integration functionality and data quality

**Annual Renewal**:
- **Contract**: Service agreement renewed annually with ADP
- **API Credentials**: OAuth credentials and certificates rotated annually
- **Support Plan**: ADP technical support tier maintained (Standard or Premium)
- **Compliance Audit**: Annual review of security practices, data handling, retention
- **Cost**: Subscription fee based on employee count and features used

**Revenue Sharing** (If Applicable):
- **Model**: Not applicable for this integration (direct B2B service)
- **Referral Program**: ADP may provide referral commissions for new customers
- **Marketplace**: KrewPact listed in ADP app marketplace (requires compliance)

**Support Obligations**:
- **KrewPact Support**: Responsible for KrewPact → ADP integration issues
- **ADP Support**: Responsible for ADP API issues and outages
- **Escalation**: If ADP API down > 4 hours, escalate to ADP support team
- **Response Time**: High-priority issues (payroll impacted) → 2-hour response
- **Documentation**: Maintain runbook for common issues and resolution steps

### 5.5 Error Handling

**Validation Errors** (Time Entry Format):

| Error | Cause | Detection | Response | Recovery |
|---|---|---|---|---|
| Invalid hours format | User enters "8hrs" instead of "8.0" | API validation on submit | Display user-friendly error message | User corrects and resubmits |
| Missing cost code | Time entry not associated with project | Validation against project list | Error notification in KrewPact | User selects cost code from project |
| Hours exceed daily limit | User enters 24+ hours in one day | Business rule validation | Warning (allow override if intentional) | Manual review by PM |
| Employee not found in ADP | Employee ID mismatch or terminated | Query ADP API for employee | Cannot submit (prevent orphaned records) | HR confirms employee status in ADP |
| Future-dated entry | Time entry date in future | Date validation | Reject with error message | User corrects date |

**Authentication Failures**:
- **Expired Token**: Automatic refresh 5 minutes before expiry, retries with new token
- **Invalid Credentials**: Deadletter job, alert ops immediately (requires manual intervention)
- **Revoked Certificate**: Fallback to OAuth credentials, notify ADP integration team
- **Network Unreachable**: Queue job with exponential backoff, circuit breaker protection

**Rate Limiting**:
- **ADP Rate Limit**: 100 requests per minute per API key
- **KrewPact Strategy**:
  - Batch time entries (up to 50 per request)
  - Space out submissions across week (not all Friday 6 PM)
  - Queue management to prevent burst requests
- **Rate Limit Response**: 429 Too Many Requests, respect Retry-After header
- **Backoff**: Start with 60 seconds, double each attempt (max 10 minutes)

**Data Reconciliation**:
1. **Weekly Reconciliation**:
   - Query ADP for payroll results (Wednesday)
   - Compare submitted time vs. ADP processed time
   - Identify discrepancies (missing entries, quantity changes)
2. **Discrepancy Handling**:
   - Quantity variance (< 0.5 hours): Acceptable, document
   - Quantity variance (> 0.5 hours): Investigate, correct, resubmit
   - Missing entries: Check if employee terminated, skip if so
3. **Cost Allocation Check**:
   - Total payroll $ matches submitted hours × rates
   - GL entries post correctly to cost centers
   - Project costing rollup is accurate
4. **Monthly Report**:
   - Reconciliation summary to Finance
   - Variance exceptions requiring action
   - Approval sign-off

---

## 6. MICROSOFT 365 INTEGRATION

### 6.1 Microsoft Graph API Configuration

**App Registration in Azure Active Directory**:
- **Application Name**: KrewPact
- **Client ID**: Stored in Vault as `AZURE_CLIENT_ID`
- **Client Secret**: Stored in Vault as `AZURE_CLIENT_SECRET`, rotated every 6 months
- **Tenant ID**: Stored in Vault as `AZURE_TENANT_ID`
- **Redirect URI**: `https://api.krewpact.com/auth/azure/callback` (for delegated flows)

**Microsoft Graph API Endpoints**:
- **Base URL**: `https://graph.microsoft.com/v1.0`
- **API Version**: v1.0 (stable, recommended)
- **Authentication**: OAuth 2.0 (both delegated and app-only)

**Permissions Required** (Delegated vs. Application):

| Permission | Type | Purpose | Scope |
|---|---|---|---|
| Mail.Send | Delegated | Send emails on behalf of user | `Mail.Send` |
| Mail.Read | Delegated | Read user's mailbox | `Mail.Read` |
| Calendars.ReadWrite | Delegated | Create/update calendar events | `Calendars.ReadWrite` |
| Files.ReadWrite | Delegated | Read/write files in OneDrive | `Files.ReadWrite` |
| Sites.ReadWrite.All | Application | Read/write to SharePoint sites | `Sites.ReadWrite.All` |
| Directory.ReadWrite.All | Application | Read/write users and groups | `Directory.ReadWrite.All` |
| User.ReadWrite.All | Application | Read/write all user profiles | `User.ReadWrite.All` |

**Authentication Flows**:

**Application-Only** (Service-to-service, higher privilege):
- **Flow**: Client Credentials
- **Tokens**: Service account, no user context
- **Use Case**: Bulk operations (email, document management)
- **Token Lifetime**: 1 hour, automatic refresh

**Delegated** (User context, lower privilege):
- **Flow**: Authorization Code with PKCE
- **Tokens**: Access token + refresh token
- **Use Case**: User-initiated actions (calendar, mail)
- **Token Lifetime**: 1 hour, refresh token valid 90 days
- **User Consent**: Required on first use (pre-consented for admin users)

### 6.2 Integration Points

**Email: Send Transactional Emails**:

| Email Type | Recipients | Template | Trigger | Frequency |
|---|---|---|---|---|
| Contract Signature Invitation | Client, Contractor | contract_invite | Signature workflow initiated | Per contract |
| Portal Access Invitation | Trade Partner contact | portal_invite | New trade partner onboarded | Per new partner |
| Project Update Notification | PM, client contacts | project_update | Major project milestone | Per milestone |
| Invoice Notification | Finance, client contact | invoice_ready | AR/AP invoice generated | Per invoice |
| Payment Confirmation | Payee, Finance | payment_confirm | Payment processed | Per payment |
| Time Entry Reminder | Employee | time_reminder | Week ending Friday | Weekly |
| Approval Request | Approver | approval_request | Document awaiting approval | Per approval |
| System Alert | Admin team | system_alert | Integration failure, security event | Per incident |

**Email Sending Implementation**:
- **Endpoint**: `POST /me/sendMail` (delegated) or `POST /users/{userId}/sendMail` (app-only)
- **Method**: REST API with JSON payload
- **Retry Strategy**: 3 attempts with exponential backoff
- **Delivery Confirmation**: Track via Graph API (optional)

**Email Payload Example**:
```json
{
  "message": {
    "subject": "Contract Ready for Signature: Prime Contract - Project ABC",
    "body": {
      "contentType": "HTML",
      "content": "<html><body><p>Please review and sign the attached contract...</p></body></html>"
    },
    "toRecipients": [
      {
        "emailAddress": {
          "address": "client@example.com",
          "name": "Client Name"
        }
      }
    ],
    "bccRecipients": [
      {
        "emailAddress": {
          "address": "pm@krewpact.com",
          "name": "Project Manager"
        }
      }
    ]
  },
  "saveToSentItems": true
}
```

**Calendar: Meeting Scheduling for Project Milestones**:

| Event Type | Attendees | Trigger | Frequency | Duration |
|---|---|---|---|---|
| Project Kickoff | PM, client contacts, key team | Project created or status updated | Per project start | 2 hours |
| Progress Review | PM, client, finance | Monthly milestone date | Monthly | 1 hour |
| Safety Meeting | PM, safety officer, site team | Monthly at site | Monthly | 1.5 hours |
| Close-Out Meeting | PM, client, finance, legal | Project completion | Per project completion | 1 hour |
| Change Order Review | PM, estimator, client | Change order submitted | Per change order | 1 hour |

**Calendar Event Creation**:
- **Endpoint**: `POST /users/{userId}/events` (delegated) or `POST /me/events` (current user)
- **Method**: REST API with JSON payload
- **Attendees**: Automatically sent invitation via email (managed by Outlook)
- **Reminders**: Set 24 hours and 1 hour before event

**Calendar Event Payload**:
```json
{
  "subject": "Project Kickoff: Project ABC",
  "body": {
    "contentType": "HTML",
    "content": "Join us for project kickoff. Agenda: overview, team introductions, schedule, budget review."
  },
  "start": {
    "dateTime": "2025-02-17T09:00:00",
    "timeZone": "America/Vancouver"
  },
  "end": {
    "dateTime": "2025-02-17T11:00:00",
    "timeZone": "America/Vancouver"
  },
  "attendees": [
    {
      "emailAddress": {
        "address": "pm@krewpact.com",
        "name": "Project Manager"
      },
      "type": "required"
    }
  ],
  "location": {
    "displayName": "Project Site / Conference Room A"
  },
  "isReminderOn": true,
  "reminderMinutesBeforeStart": 1440
}
```

**OneDrive / SharePoint: Document Storage and Sharing**:

| Document Type | Storage Location | Sharing Model | Access | Sync |
|---|---|---|---|---|
| Project Documents | SharePoint Project Site | Public (internal org) | Read/Write for team | OneDrive Business |
| Contracts (Signed) | OneDrive /Contracts | Shared with client | Read-only for client | OneDrive link |
| Estimates/Proposals | SharePoint Project Site | Private team only | Read/Write for PM | OneDrive Business |
| Financial Records | OneDrive /Finance | Private (Finance only) | Read-Only | OneDrive Business |
| Safety Documents | SharePoint Site | Read-only for field | QR code link | Static |

**Teams: Notifications and Channel Updates** (Optional/Future):
- **Channel Model**: Per project, auto-created when project goes active
- **Notifications**: Major milestones, approvals, alerts posted to project channel
- **Integration**: KrewPact bot posts updates to Teams
- **User Setup**: Minimal (auto-added to team on project assignment)

### 6.3 File Sync Strategy

**OneDrive Business for Project Document Storage**:
- **Primary Storage**: Documents stored in user's OneDrive Business for cloud sync
- **Folder Structure**: `/Projects/{ProjectName}/` with subfolders (Contracts, Estimates, Correspondence, etc.)
- **Sync**: Automatic via Windows/Mac OneDrive client (user-initiated)
- **Backup**: Automatic 30-day version history in OneDrive
- **Offline Access**: Users can mark folder for offline sync

**SharePoint Document Libraries for Shared Project Folders**:
- **Model**: Shared library per project site
- **Folder Structure**: `/Shared Documents/` with sections:
  - Project Plans
  - Contracts & Amendments
  - Safety & Compliance
  - Financial Reports
  - Correspondence
- **Access**: Team members have edit access, clients have read-only (via sharing link)
- **Versioning**: SharePoint maintains version history (limit: 500 versions per document)

**Sync Strategy** (Sync vs. Link Approach):

**Option 1: Sync (Automatic Replication)**:
- **Model**: OneDrive sync client copies files between KrewPact and OneDrive
- **Direction**: Bidirectional (changes in KrewPact replicate to OneDrive, and vice versa)
- **Pros**: Offline access, transparent to users, automatic versioning
- **Cons**: Bandwidth usage, potential for conflicts, requires client installation
- **Use Case**: Frequently accessed documents (active projects)

**Option 2: Link (Reference)**:
- **Model**: KrewPact stores link to OneDrive/SharePoint file
- **Direction**: Users access via link in KrewPact UI
- **Pros**: Single source of truth, no sync latency, lower bandwidth
- **Cons**: Requires online access, no offline viewing
- **Use Case**: Archived documents, formal records (signed contracts)

**Recommended Approach** (Hybrid):
- **Active Projects**: Sync model (real-time collaboration)
- **Archived Projects**: Link model (reference only, read-only)
- **Signed Documents**: Link model with SharePoint read-only restriction
- **Financial Records**: Sync model with Finance-only access

**Conflict Resolution for Concurrent Edits**:
1. **Detection**: OneDrive automatically detects conflicting changes
2. **Notification**: Both users notified of conflict via email
3. **Handling**:
   - **OneDrive Model**: Creates "version" copy of both files (allows manual merge)
   - **SharePoint Model**: Last-write-wins, older version preserved in history
4. **KrewPact Handling**:
   - Periodically scan for conflicted files
   - Alert users with instructions to resolve
   - Once resolved, sync latest version back to KrewPact
5. **Prevention**: Document locks during editing (SharePoint co-authoring prevents simultaneous edits)

### 6.4 Permissions Matrix

| API | Permission | Type | Scope | Justification | Risk Level |
|---|---|---|---|---|---|
| Mail API | Mail.Send | Delegated | User mailbox | Send emails on behalf of user | Medium (impersonation risk) |
| Mail API | Mail.Read | Delegated | User mailbox | Read user emails (optional, for context) | Medium (privacy) |
| Calendar API | Calendars.ReadWrite | Delegated | User calendar | Create meeting invitations | Low (scheduling only) |
| Files API | Files.ReadWrite | Delegated | User OneDrive | Upload/download project documents | Medium (data access) |
| Sites API | Sites.ReadWrite.All | Application | Organization SharePoint | Manage project site permissions | High (organizational data) |
| Directory API | User.ReadWrite.All | Application | Organization users | Sync user information | High (identity data) |
| Directory API | Directory.ReadWrite.All | Application | Organization directory | Manage teams/groups | High (administrative) |

**Permission Management**:
- **Admin Consent**: All permissions pre-consented by IT admin (no user consent dialogs)
- **Principle of Least Privilege**: Only grant necessary permissions
- **Delegated Permissions**: Limited to user's own data (OneDrive, calendar)
- **Application Permissions**: Require admin approval, used for batch operations only
- **Audit Trail**: All API calls logged with user/service account and timestamp

---

## 7. FILE STORAGE INTEGRATION

### 7.1 Storage Architecture

**Primary Storage: Supabase Storage** (S3-compatible):
- **Service**: Supabase Storage backend (powered by AWS S3)
- **Region**: `ca-central-1` (Canada, for data residency compliance)
- **Bucket**: `krewpact-documents`
- **Access Level**: Private (all files require signed URLs)
- **Encryption**: AES-256 at rest (automatic)

**Backup: Cloudflare R2** (Object storage, S3-compatible):
- **Service**: Cloudflare R2 (redundant backup)
- **Region**: Automatic (Cloudflare global network)
- **Bucket**: `krewpact-backup`
- **Sync Strategy**: Nightly backup of all new/modified files from Supabase
- **Retention**: 30 days minimum

**CDN: Vercel** (Content Delivery Network):
- **Service**: Vercel serverless edge network
- **Purpose**: Serve public/shareable documents (signed contracts, public materials)
- **Cache**: 1 hour (configurable per document type)
- **Regions**: Globally distributed (latency optimized)

**Storage Quotas**:
- **Supabase**: 100 GB base, expandable (pay-as-you-go)
- **R2**: Unlimited storage (low-cost backup)
- **Retention**: 7 years for contracts, 3 years for operational documents

### 7.2 Upload Flow

**Client-Side Chunked Upload for Large Files**:
1. **File Selection**: User selects file (max 2 GB)
2. **Chunking**: JavaScript splits file into 5 MB chunks
3. **Hash Calculation**: SHA-256 hash computed for entire file
4. **Upload Request**: POST to `/api/documents/upload-init` with:
   - File name, size, hash
   - Document type (contract, estimate, etc.)
   - Project ID, division ID
5. **Server Response**: Returns upload ID and chunk URLs
6. **Chunk Upload**: Browser uploads each chunk via signed POST URL (parallel, 3 concurrent)
7. **Progress Tracking**: Real-time progress bar via JavaScript
8. **Completion**: Browser calls `/api/documents/upload-complete` with upload ID
9. **Validation**: Server verifies all chunks received, recalculates hash
10. **Storage**: Server assembles chunks into single file, uploads to Supabase

**Server-Side Virus Scanning**:
- **Scanner**: ClamAV (open-source antivirus)
- **Timing**: After file assembly, before storage
- **Process**:
  1. Download assembled file to temp directory
  2. Run `clamscan` command
  3. If clean: Continue to storage
  4. If detected: Quarantine file, log incident, notify user
5. **Quarantine**: Infected files moved to quarantine bucket, deleted after 30 days
6. **Alerting**: Security team notified via Slack #security channel

**Metadata Extraction**:
- **PDF**: Extract text content, page count, creation date, author (if present)
- **Office Documents**: Extract title, author, creation date, subject
- **Images**: Extract EXIF data (GPS location stripped for privacy)
- **Metadata Use**: Full-text search indexing, document properties display

**Thumbnail Generation**:
- **PDF**: Generate thumbnail of first page (PNG, 200x300 pixels)
- **Images**: Generate 3 sizes (small 200px, medium 500px, large 1000px)
- **Video**: Generate poster frame at 5-second mark
- **Tool**: ImageMagick for image processing, FFmpeg for video
- **Storage**: Thumbnails stored in Supabase at `thumbnails/` prefix
- **Caching**: Thumbnails cached in browser (1-week expiry)

**Presigned URLs for Direct Upload**:
- **Use Case**: Large files (>100 MB) uploaded directly to S3 without proxy
- **Process**:
  1. KrewPact API generates presigned POST URL (valid 30 minutes)
  2. Browser POSTs directly to S3
  3. S3 executes validation (CORS, content-type, size)
  4. Callback to KrewPact API on completion
5. **Security**: Presigned URLs require authentication, scoped to single file

### 7.3 File Organization

**Bucket Structure**:
```
krewpact-documents/
  ├── divisions/
  │   ├── {division-uuid}/
  │   │   ├── projects/
  │   │   │   ├── {project-uuid}/
  │   │   │   │   ├── contracts/
  │   │   │   │   │   ├── {contract-uuid}/v1/{filename}
  │   │   │   │   │   └── {contract-uuid}/v2/{filename}
  │   │   │   │   ├── estimates/
  │   │   │   │   ├── change-orders/
  │   │   │   │   ├── correspondence/
  │   │   │   │   └── safety-docs/
  │   │   │   └── {project-uuid}/ ... (other projects)
  │   │   └── shared-resources/
  │   │       ├── insurance-templates/
  │   │       ├── safety-acknowledgments/
  │   │       └── compliance-docs/
  │   └── {division-uuid}/ ... (other divisions)
  ├── archives/
  │   └── {year}/{month}/ ... (archived/old documents)
  └── quarantine/
      └── {scan-date}/{infected-file-hash}

thumbnails/
  ├── {division-uuid}/
  │   ├── projects/
  │   │   └── {project-uuid}/{document-id}-thumb.png
```

**Naming Conventions**:
- **File Names**: `{entity-type}-{entity-id}-{timestamp}-{sequence}.{extension}`
  - Example: `contract-9f8d4c2e-v2-2025-02-09-001.pdf`
- **Versions**: `v1`, `v2`, `v3` ... (preserved for audit trail)
- **Timestamps**: ISO 8601 format with milliseconds
- **UUID**: 36 characters, globally unique, no sensitive info

**Version Control for Documents**:
- **Each Version**: Stored separately under `{entity-id}/v{version}/`
- **Metadata**: Tracks version number, created by, created at, change reason
- **Retention**: All versions retained (no auto-cleanup)
- **Rollback**: Admin can restore any previous version
- **Audit Trail**: Change log shows all versions with metadata

**Soft Delete with Retention**:
- **Soft Delete**: Mark document as deleted (set `deleted_at` timestamp) but keep file
- **Retention**: 30-day grace period before permanent deletion
- **Recovery**: Deleted documents can be restored within 30-day window (via admin)
- **Permanent Delete**: After 30 days, file permanently removed from Supabase and R2
- **Compliance**: Deleted metadata retained in audit log for 7 years

### 7.4 Access Control

**Signed URLs with Expiry**:
- **URL Format**: `https://supabase-url/storage/v1/object/signed/{path}?token={jwt}&expires={timestamp}`
- **Token**: JWT containing: file path, user ID, expiry time
- **Expiry Options**:
  - **Temporary Download**: 1 hour (for one-time access)
  - **Session Duration**: 8 hours (for active work)
  - **Public Share**: 7 days (for client collaboration)
  - **Long-term**: 30 days (for archived documents)
- **Token Verification**: Server validates JWT signature before generating URL
- **Revocation**: URLs cannot be revoked (created with fixed expiry)

**Role-Based File Access**:
- **Admin**: All files, all projects
- **Project Manager**: All files for assigned projects
- **Estimator**: Estimate and proposal files only
- **Safety Officer**: Safety document files
- **Client (Portal User)**: Only signed contracts and approved documents
- **Finance**: Financial documents and invoices

**Access Control Logic**:
1. User requests file access
2. System checks: user exists, not deleted, token valid
3. System checks: user has permission for document type
4. System checks: user assigned to project OR document shared with user
5. If all checks pass: Generate signed URL with appropriate expiry
6. If any check fails: Return 403 Forbidden

**Portal User File Isolation**:
- **Portal Users**: Limited to files explicitly shared with them
- **Shareable Documents**: Contracts, approved estimates, invoices, communications
- **Non-Shareable**: Internal notes, draft documents, financial data (unless for their company)
- **Sharing Mechanism**: Admin explicitly grants access via share link or direct assignment
- **Access Revocation**: Admin can revoke access at any time (new shares required)

**Watermarking for Confidential Documents** (Optional):
- **Implementation**: ImageMagick overlay on PDF/images with text watermark
- **Watermark Text**: "CONFIDENTIAL" or document classification
- **Placement**: Diagonal across document at 20% opacity
- **Use Case**: Sensitive contracts, financial data shared with external parties
- **Enablement**: Per-document flag: `requires_watermark: true`

---

## 8. NOTIFICATION INTEGRATIONS

### 8.1 Email (Primary)

**Email Provider: Resend** (or SendGrid/SES alternative):
- **Service**: Resend (recommended for simplicity and deliverability)
- **API Endpoint**: `https://api.resend.com/emails`
- **API Key**: Stored in Vault as `RESEND_API_KEY`
- **Domain**: emails.krewpact.com (custom domain with DKIM/SPF configured)

**Transactional Email Templates**:

| Template | Use Case | Sender | Recipients | Variables |
|---|---|---|---|---|
| contract_invite | Contract signature invitation | noreply@krewpact.com | Client, Contractor | contract_name, signing_link, deadline |
| portal_invite | Portal access welcome | support@krewpact.com | Trade partner contact | portal_url, username, temp_password |
| project_update | Project milestone notification | pm@krewpact.com | Client contacts | project_name, milestone, description |
| invoice_ready | Invoice generated and ready | finance@krewpact.com | Client contact | invoice_id, amount, due_date |
| payment_confirm | Payment processed confirmation | finance@krewpact.com | Payee | amount, date, reference |
| time_reminder | Weekly time entry reminder | system@krewpact.com | Employees | deadline, period_ending |
| approval_request | Document awaiting approval | system@krewpact.com | Approver | document_type, document_id, approver_name |
| system_alert | System/integration alert | alerts@krewpact.com | Admin team | alert_type, severity, message, remediation |

**Email Template Example**:
```html
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <h2>Contract Ready for Signature</h2>
  <p>Hi {{recipient_name}},</p>
  <p>The following contract is ready for your signature:</p>
  <ul>
    <li><strong>Contract:</strong> {{contract_name}}</li>
    <li><strong>Project:</strong> {{project_name}}</li>
    <li><strong>Signing Deadline:</strong> {{deadline}}</li>
  </ul>
  <p><a href="{{signing_link}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none;">Review and Sign</a></p>
  <p>If you have questions, contact {{support_email}}.</p>
  <p>Best regards,<br/>KrewPact Team</p>
</body>
</html>
```

**Notification Preferences Per User**:
- **Email Frequency**: Immediate, daily digest, weekly summary, never
- **Notification Types**: Contract updates, project updates, approvals, financial, system alerts
- **Per-Category Preference**: User can set different preferences for each notification type
- **Storage**: User preferences table with notification_type and frequency
- **Default**: Immediate for critical (approvals), daily digest for others

**Unsubscribe Management**:
- **Unsubscribe Link**: Included in every email footer
- **One-Click**: Unsubscribe link immediately disables all emails for that type
- **User Control**: User can modify preferences in account settings
- **Portal Users**: Option to disable all non-essential emails (receive only critical)
- **Compliance**: GDPR/CASL compliant (respect unsubscribe requests)

**Email Sending Implementation**:
```javascript
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "Contract Notifications <noreply@krewpact.com>",
  to: recipient.email,
  subject: `Contract Ready: ${contract.name}`,
  html: contractInviteTemplate(context),
  reply_to: "support@krewpact.com",
  tags: [
    { name: "contract_id", value: contract.id },
    { name: "notification_type", value: "contract_invite" }
  ]
});
```

**Email Delivery Confirmation**:
- **Webhook**: Resend posts webhook events (bounce, complaint, delivery, open, click)
- **Tracking**: KrewPact logs delivery status changes
- **Bounce Handling**: Soft bounces → retry, hard bounces → disable email
- **Complaint**: Mark email as undeliverable, stop sending

### 8.2 SMS (Future)

**SMS Provider Options**:
- **Primary**: Twilio (established, reliable, supports Canada)
- **Backup**: Vonage (also reliable, good coverage)

**Use Cases**:
- Urgent notifications (safety alerts, emergency contact)
- Two-factor authentication (MFA backup code delivery)
- Site-specific alerts (access, check-in reminders)

**Implementation** (When enabled):
- User opt-in required (security and regulatory compliance)
- Phone number validation (SMS sent to confirm)
- Rate limiting (max 1 SMS per 15 minutes per user)
- Cost tracking (SMS more expensive than email, budget monitoring)

### 8.3 Push Notifications (Future)

**Web Push** (Service Workers):
- **Support**: Modern browsers with service worker capability
- **Payload**: Notification title, body, icon, action links
- **Triggering**: Backend calls service worker via Push API

**Mobile Push** (When native apps built):
- **Platforms**: iOS (APNs), Android (FCM)
- **Service**: Firebase Cloud Messaging or vendor-specific
- **Payload**: Title, body, deep link to app screen

---

## 9. WEBHOOK INFRASTRUCTURE

### 9.1 Inbound Webhooks

**Webhook Sources and Events**:

| Source | Events | Endpoint | Auth Method | Retry Policy | Timeout |
|---|---|---|---|---|---|
| ERPNext | document.after_insert, document.after_update, document.after_submit | `/webhooks/erpnext` | HMAC-SHA256 signature | 3 attempts, 30s/5m/30m | 30 seconds |
| Clerk | user.created, user.updated, user.deleted, session.created, session.revoked | `/webhooks/clerk` | HMAC-SHA256 signature | 3 attempts, Clerk managed | 5 seconds |
| BoldSign | envelope_sent, envelope_signed, envelope_completed, envelope_declined | `/webhooks/boldsign` | HMAC-SHA256 signature | 3 attempts, Clerk managed | 5 seconds |
| ADP | (if available) payroll_completed, pay_period_change | `/webhooks/adp` | OAuth token or HMAC | 3 attempts, provider managed | 10 seconds |
| Microsoft Graph | (optional) file_created, file_modified, calendar_event_created | `/webhooks/microsoft` | HMAC-SHA256 signature | 3 attempts, provider managed | 10 seconds |

**Webhook Endpoint Implementation**:
```javascript
// POST /webhooks/erpnext
app.post('/webhooks/erpnext', async (req, res) => {
  const signature = req.headers['x-frappe-signature'];
  const payload = JSON.stringify(req.body);

  // Verify signature
  if (!verifyHmacSignature(payload, signature, FRAPPE_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Check idempotency (webhook_id in payload)
  const idempotencyKey = `${req.body.webhook_id}`;
  const processed = await db.webhooks.findOne({ idempotency_key: idempotencyKey });
  if (processed) {
    return res.status(200).json({ message: 'Already processed' });
  }

  // Queue webhook processing
  await queue.add('webhook-process', {
    source: 'erpnext',
    event: req.body.event,
    payload: req.body.doc,
    idempotency_key: idempotencyKey,
    received_at: new Date()
  });

  // Record webhook receipt
  await db.webhooks.create({
    idempotency_key: idempotencyKey,
    source: 'erpnext',
    event: req.body.event
  });

  // Immediate response to sender (processing async)
  return res.status(202).json({ message: 'Accepted' });
});
```

**Webhook Processing Workflow**:
1. Receive HTTP POST with signature
2. Verify signature using HMAC-SHA256
3. Check idempotency key (prevent duplicate processing)
4. Queue job to `webhooks-inbound` queue with full context
5. Return 202 Accepted immediately (not blocking)
6. Job processor: extract entity details, perform sync operation
7. Update database with sync result (success/error/conflict)
8. Send notifications if necessary (error alerts, completion confirmations)

### 9.2 Outbound Webhooks (Future)

**Customer-Configurable Webhooks**:
- **Model**: Admin users can register webhooks for events in their division
- **Event Types** (Future):
  - `contract.signed`: When contract execution completed
  - `project.created`: When new project created
  - `invoice.issued`: When invoice sent to customer
  - `document.uploaded`: When new document added to project
  - `approval.requested`: When approval awaited
  - `user.created`: When new portal user created

**Retry Policy**:
- **Initial Attempt**: Immediate upon event
- **Retry 1**: 30 seconds
- **Retry 2**: 5 minutes
- **Retry 3**: 30 minutes
- **Max Attempts**: 3 total
- **Failure**: Logged, alert sent to webhook owner after 2 failures

**Signature Generation**:
```javascript
function generateWebhookSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const data = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  return {
    signature,
    timestamp
  };
}
```

### 9.3 Webhook Security

**Signature Verification for Each Provider**:
- **ERPNext**: HMAC-SHA256 with Frappe webhook secret
- **Clerk**: HMAC-SHA256 with Clerk webhook secret
- **BoldSign**: HMAC-SHA256 with BoldSign webhook secret
- **ADP**: OAuth token validation or HMAC
- **Microsoft**: HMAC-SHA256 with Graph webhook secret

**IP Allowlisting** (Where Supported):
- **ERPNext**: Whitelist ERPNext server IP(s) in firewall
- **Clerk**: Clerk IP ranges documented, allowlist if available
- **BoldSign**: BoldSign IP ranges documented, allowlist if available
- **Implementation**: WAF rules or firewall rules (AWS SG, Cloudflare)

**Replay Attack Prevention**:
- **Timestamp Validation**: Extract timestamp from signature or payload
- **Window**: Only accept webhooks within 5 minutes of current time (clock skew tolerance)
- **Tracking**: Store processed webhook IDs in cache/database
- **Deduplication**: Reject if same webhook_id already processed

**Payload Size Limits**:
- **Max Size**: 10 MB per webhook
- **Enforcement**: HTTP 413 if exceeded
- **Compression**: Gzip compression supported (Content-Encoding header)

**Rate Limiting on Webhook Endpoints**:
- **Per IP**: 1000 requests/minute (prevent abuse)
- **Per Source**: 5000 requests/hour (provider-specific quota)
- **Backoff**: 429 response triggers exponential backoff from provider

---

## 10. INTEGRATION MONITORING AND SLAs

### 10.1 Health Check Matrix

| Integration | Health Check Method | Frequency | Alert Threshold | Escalation |
|---|---|---|---|---|
| ERPNext | API connectivity test (GET /api/resource/Company) | Every 5 minutes | 2 consecutive failures | Slack #ops, email ops@krewpact.com |
| Clerk | JWT public key fetch (GET /.well-known/jwks.json) | Every 24 hours | Failure or stale keys | Slack #ops, ops-on-call |
| BoldSign | Template list retrieval (GET /templates) | Every 15 minutes | Connection timeout | Slack #ops |
| ADP | OAuth token refresh test | Every 1 hour | Token refresh failure | Slack #ops |
| Microsoft Graph | Access token validation (GET /me) | Every 30 minutes | Token validation error | Slack #ops |
| File Storage (Supabase) | Presigned URL generation test | Every 10 minutes | URL generation failure | Slack #ops |
| Email (Resend) | Test email send to internal address | Every 6 hours | Send failure | Slack #ops, email ops@krewpact.com |
| Database | Connection pool health + query latency | Every 2 minutes | Pool exhaustion or p99 > 1s | Paged on-call |

**Health Check Implementation**:
```javascript
// ERPNext health check
async function checkErpnextHealth() {
  try {
    const response = await axios.get(
      'https://erp.krewpact.internal/api/resource/Company',
      {
        headers: { 'Authorization': `token ${API_KEY}:${API_SECRET}` },
        timeout: 10000
      }
    );

    if (response.status === 200) {
      return {
        status: 'healthy',
        latency_ms: response.headers['x-response-time'],
        timestamp: new Date()
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    };
  }
}

// Schedule health check
cron.schedule('*/5 * * * *', async () => {
  const health = await checkErpnextHealth();
  await db.healthChecks.create({
    integration: 'erpnext',
    ...health
  });

  if (health.status === 'unhealthy') {
    await notifyOps(`ERPNext health check failed: ${health.error}`);
  }
});
```

### 10.2 SLA Targets

| Integration | Availability | Latency (P95) | Error Rate | Data Freshness | Notes |
|---|---|---|---|---|---|
| ERPNext | 99.5% monthly | < 5 seconds | < 0.5% | < 5 minutes (financial) | Excludes planned maintenance |
| Clerk | 99.9% monthly | < 500 ms | < 0.1% | Real-time | Auth-critical, high SLA |
| BoldSign | 99.5% monthly | < 3 seconds | < 0.5% | < 1 minute | Depends on BoldSign SLA |
| ADP | 99.0% monthly | < 10 seconds | < 1.0% | Weekly batches | Payroll timing flexible |
| Microsoft Graph | 99.5% monthly | < 2 seconds | < 0.5% | Real-time (calendar), daily (mail) | Microsoft SLA compliance |
| File Storage | 99.9% monthly | < 2 seconds | < 0.1% | Real-time | Supabase SLA |
| Email | 99.0% monthly | < 30 seconds | < 1.0% | Transactional | Delivery SLA per provider |

**Measurement Methodology**:
- **Availability**: (Successful operations / Total operations) × 100% (monthly rolling window)
- **Latency**: Response time P95 percentile (excludes outliers)
- **Error Rate**: (Failed operations / Total operations) × 100% (classification: transient vs. permanent)
- **Data Freshness**: Maximum time delay between source and target system

**Incident Response**:
- **Critical** (availability < 95%): Page on-call immediately, establish war room
- **High** (availability 95-99%): Slack alert, monitor closely, escalate if continues
- **Medium** (availability 99-99.5%): Log incident, plan improvement

### 10.3 Degraded Mode Behavior

**Impact When Integration Down**:

| Integration | Impact | Degraded Behavior | Recovery Action |
|---|---|---|---|---|
| ERPNext | High | Read cache (stale data), queue writes to deadletter, display banner | Retry syncs once recovered |
| Clerk | Critical | Force reauthentication (users go to login), reject new signups | Update auth configuration |
| BoldSign | High | Queue signing requests, display banner, use backup email notification | Resume once recovered |
| ADP | Medium | Buffer time entries, flag for manual submission, notify Finance | Manual export to ADP, resubmit |
| Microsoft Graph | Medium | Cache last email/calendar state, disable new sends, queue notifications | Resume once recovered |
| File Storage | High | Display cached thumbnails, prevent new uploads, error message | Restore from backup if data loss |
| Email | Medium | Queue notifications, attempt retry, display warning | Resume once recovered |

**Degradation Detection and User Notification**:
1. Health check fails twice (10 minutes for 5-min checks)
2. System sets integration status to `DEGRADED`
3. If any integration critical to user action (auth, signing):
   - Display banner: "Service temporarily unavailable"
   - Suggest alternative: "Use email link provided earlier"
   - Show status page: `status.krewpact.com`
4. Background queues keep trying (exponential backoff)
5. When recovered: Clear banner, resume normal operation

**Example Degraded Mode Messaging**:
```
Integration: BoldSign Signing Service
Status: Temporarily Unavailable (since 14:30 UTC)

Impact: Unable to initiate new document signatures
Workaround: Signers can still access previously sent documents at [email link]
Estimated Recovery: < 1 hour
Status Page: https://status.krewpact.com/incidents/2025-02-09-boldsign

Check back soon or contact support@krewpact.com
```

**Recovery Procedure**:
1. Monitor health checks return to `healthy` status
2. Verify queued operations can process successfully (test transaction)
3. Resume normal queue processing
4. Post-mortem: Document root cause, improve prevention

---

## 11. INTEGRATION MAINTENANCE AND OPERATIONS

### 11.1 Regular Maintenance Tasks

**Quarterly Tasks**:
- Rotate ERPNext API keys (with 30-day overlap)
- Rotate BoldSign API key (if supported)
- Audit all custom Frappe fields and doctypes (ensure in sync)
- Review and update webhook configurations
- Rotate database credentials

**Annual Tasks**:
- Complete ERPNext integration recertification (if required)
- Renew ADP partnership and support agreements
- Update Microsoft Azure app registration certificates
- Full security audit of integration endpoints
- Disaster recovery test (restore from backups)

**Monthly Tasks**:
- Review SLA compliance metrics
- Analyze deadletter queue trends
- Validate cost allocation reconciliation
- Check for new API versions or deprecation notices
- Performance baseline review

### 11.2 Runbook and Documentation

All integrations documented in detailed runbooks covering:
- Quick start: authentication, endpoint verification
- Common issues and resolutions
- Escalation contacts and procedures
- Rollback procedures if integration fails
- Monitoring dashboard links and alerts

### 11.3 Change Management

All integration changes follow change management process:
- Risk assessment (integration impact, rollback difficulty)
- Approval from integration architect
- Testing in sandbox environment first
- Scheduled change window (off-peak hours)
- Monitoring during and after deployment
- Rollback plan documented and tested

---

## Document Revision History

| Date | Author | Changes |
|---|---|---|
| 2025-02-09 | Architecture Team | Initial comprehensive document creation |

---

**End of Document**
