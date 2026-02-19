# KrewPact Security and Compliance Framework

**Organization:** MDM Group, Mississauga, Ontario, Canada
**Platform:** KrewPact - Construction Operations SaaS
**User Base:** 300+ internal users, external client/trade partner portals
**Tech Stack:** React/Next.js, Node.js BFF, Supabase PostgreSQL, ERPNext, Clerk (auth), BoldSign (e-sign), ADP integration, Vercel hosting

---

## 1. SECURITY ARCHITECTURE OVERVIEW

### 1.1 Defense-in-Depth Model

KrewPact implements a multi-layered security architecture protecting data across network, application, and data tiers:

**Layer 1: Perimeter Security**
- DDoS mitigation via Vercel/Cloudflare edge network
- WAF rules blocking malicious patterns
- Geographic IP filtering for Canadian operations

**Layer 2: Network Security**
- Tailscale zero-trust mesh network for system-to-system communication
- VPC isolation on AWS Canada (ca-central-1)
- VLAN segmentation via TP-Link Omada for internal network
- Firewall rules enforcing least-privilege access
- Private database endpoints (no public internet exposure)

**Layer 3: Authentication & Authorization**
- Clerk OAuth 2.0/SSO for all user authentication
- Multi-factor authentication (mandatory for admin, recommended for all)
- JWT token validation on every API request
- Session-based access revocation
- Role-based access control (RBAC) with principle of least privilege

**Layer 4: Application Security**
- Input validation via Zod schemas
- Output encoding to prevent XSS
- CSRF tokens on state-changing operations
- SQL injection prevention via parameterized queries
- Rate limiting on API endpoints
- Content Security Policy (CSP) headers

**Layer 5: Data Protection**
- AES-256 encryption at rest in Supabase
- TLS 1.3 in transit for all connections
- Field-level encryption for PII (SIN numbers, banking information)
- Row-Level Security (RLS) policies in PostgreSQL
- Database connection pooling with encryption

**Layer 6: Logging & Detection**
- Immutable audit logs for all data mutations
- Real-time anomaly detection for suspicious patterns
- Security event aggregation and alerting
- Compliance reporting dashboards

### 1.2 Trust Boundaries and Security Zones

| Security Zone | Description | Trust Level | Access Method | Key Controls |
|---|---|---|---|---|
| **Public Portal** | Unauthenticated client/trade partner portals | Untrusted | HTTPS only | Rate limiting, input validation, CAPTCHA |
| **Authenticated Users** | Internal staff and verified external users | Conditionally trusted | OAuth 2.0 + MFA | Session management, device fingerprinting, RLS policies |
| **Admin Zone** | Internal administrators (finance, operations) | Trusted | OAuth 2.0 + mandatory MFA | Audit logging of all actions, admin-only API endpoints |
| **System-to-System** | API communication between KrewPact and external systems | Cryptographically trusted | TLS + API key/webhook signature | Webhook signature verification, rate limiting, IP allowlisting |
| **ERPNext Integration** | Bidirectional sync with financial/operational data | Trusted (isolated) | Tailscale + VPN | Encrypted tunnel, request signing, audit trail |
| **Internal Network** | Proxmox, Docker containers, backend services | Physically secured | Zero-trust overlay (Tailscale) | Network segmentation, SSH keys only, automatic security updates |

### 1.3 Zero-Trust Principles Implementation

**Verify Every Request:**
- All API requests require valid JWT token
- Token claims validated against user permissions and resource scope
- Session must be active in Clerk auth system
- Device trust evaluated for anomaly detection

**Assume Breach:**
- Network segmentation via Tailscale prevents lateral movement
- RLS policies prevent data exfiltration even if database is compromised
- Audit logs are immutable (separate storage layer)
- Encryption keys stored separately from encrypted data

**Least Privilege Access:**
- Users granted minimum permissions required for role
- Permissions scoped to divisions/projects, not global
- Admin permissions explicitly logged and time-limited if possible
- External portal users isolated to specific projects/documents

**Continuous Monitoring:**
- Rate limiting triggers alert on threshold breach
- Failed authentication attempts logged with IP/fingerprint
- Unusual data access patterns detected
- Webhook failures logged with retry information

---

## 2. AUTHENTICATION AND IDENTITY

### 2.1 Clerk Configuration and OAuth Flows

**Clerk Integration Architecture:**
KrewPact uses Clerk as the authoritative identity provider for all users (internal and external).

**OAuth 2.0 Configuration:**
```
Authorization Flow: Authorization Code Flow with PKCE
Token Type: JWT (self-signed by Clerk)
Scopes: openid profile email
Redirect URIs: https://app.krewpact.internal, https://portal.krewpact.io
Grant Types: authorization_code, refresh_token
```

**SSO Provider Integration:**
- Google Workspace for internal staff (MDM Group corporate email)
- Azure AD available for enterprise clients (optional)
- Social providers disabled for security (internal/B2B only)
- One-to-one mapping between Clerk user ID and KrewPact user table

**Session Token Lifecycle:**

| Token Type | Purpose | Expiry | Refresh Strategy |
|---|---|---|---|
| Access Token (JWT) | API authentication | 1 hour | Automatic refresh via refresh token |
| Refresh Token | Obtain new access token | 30 days | Rotated on use (refresh token rotation) |
| Session Cookie | Browser state management | 30 days sliding | Renewed on each API request |
| ID Token | OpenID Connect claims | 1 hour | Obtained with access token |

**JWT Claims Structure:**

```json
{
  "sub": "user_xxxxx",
  "iss": "https://clerk.krewpact.io",
  "aud": "app_krewpact",
  "iat": 1707500000,
  "exp": 1707503600,
  "email": "user@mdmgroup.com",
  "email_verified": true,
  "custom:user_id": "internal_uuid",
  "custom:division": "division_id",
  "custom:roles": ["role1", "role2"],
  "custom:org_id": "org_uuid"
}
```

**Device Trust and Anomaly Detection:**

- Device fingerprint captured on registration (browser, OS, IP subnet)
- Step-up authentication required if device fingerprint changes significantly
- IP address deviation flagged if:
  - Geographic distance from previous session > 500km within 1 hour
  - Login from multiple countries within 2-hour window
  - IP reputation score below threshold (blacklisted proxies)
- Flagged logins require re-authentication with MFA
- Admin logins from new devices always require MFA

**Token Revocation:**
- Session invalidation: User logout immediately revokes all active tokens in Clerk
- Admin action: Administrators can revoke user sessions from admin dashboard
- Automatic: Tokens expire at specified time (1 hour access, 30 days refresh)
- Suspicious activity: Tokens revoked on fraud detection
- Revocation list cached locally with 5-minute TTL for performance

### 2.2 Multi-Factor Authentication (MFA)

**Mandatory Requirements:**
- All admin users: MFA required
- All internal staff accessing financial/HR data: MFA required
- External users: MFA recommended (optional for initial onboarding)

**Supported Methods:**
1. Time-based One-Time Password (TOTP) - authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
2. Backup codes (10 codes per user, stored encrypted in Supabase)
3. SMS-based OTP (secondary option for users without authenticator)

**MFA Enrollment:**
- Enforced during first login for mandatory users
- User can configure multiple devices
- Backup codes must be securely stored by user
- Recovery process: admin-initiated account unlock with new MFA setup

### 2.3 Role-Based Access Control (RBAC)

**Internal Roles (9 total):**

| Role | Purpose | Division-Scoped | Typical Users |
|---|---|---|---|
| Super Admin | System-wide access, user management, compliance | No (global) | IT Lead, Compliance Officer |
| Org Admin | Organization-level access, can manage users within org | Yes | General Manager |
| Finance Manager | Financial records, invoicing, holdback, lien management | Yes | Accounting Manager |
| Finance Reviewer | View-only access to financial data | Yes | Finance Lead |
| Project Manager | Manage projects, resources, schedules, documents | Yes | Construction Supervisors |
| Safety Officer | WSIB records, incident reporting, COR tracking | Yes | Safety Director |
| HR Manager | Employee records, payroll data, safety certifications | No (cross-division access) | HR Manager |
| Operations Manager | View operational data, reports, analytics | Yes | Operations Director |
| Report Viewer | Read-only access to reports and dashboards | Yes | Executive, Client stakeholders |

**External Roles (4 total):**

| Role | Purpose | Access Scope | Typical Users |
|---|---|---|---|
| Trade Partner Portal User | Access to project documents, timesheets, lien forms | Assigned projects only | Subcontractors, suppliers |
| Client Portal User | View project progress, documents, holdback info | Assigned projects only | Owner representatives, consultants |
| Lien Claimant | Submit and track lien claims | Specific project lien records | Subcontractors, laborers |
| Document Reviewer | Review and comment on documents (RFIs, drawings) | Assigned projects and documents | Client consultants, engineers |

**Permission Model: Resource + Action + Scope**

Each permission is defined as: `resource:action@scope`

**Resource Types:**
- `project`, `financial_record`, `employee`, `safety_record`, `document`, `contract`, `user`, `audit_log`

**Action Types:**
- `create`, `read`, `update`, `delete` (CRUD)
- `sign` (for documents), `approve` (for workflows), `export` (for reports)
- `admin:manage_users`, `admin:manage_roles`, `admin:revoke_sessions`

**Scope Types:**
- `global` - access to all divisions and projects
- `division:{division_id}` - access to all projects in specific division
- `project:{project_id}` - access to specific project only
- `own` - access only to user's own records

**Example Permissions:**

```
finance_manager@division_A:
  - project:read@division_A
  - financial_record:read@division_A
  - financial_record:create@division_A
  - financial_record:update@division_A
  - invoice:approve@division_A
  - lien_form:read@division_A
  - audit_log:read@division_A (limited to financial operations)

project_manager@project_123:
  - project:read@project_123
  - project:update@project_123
  - resource:read@project_123
  - resource:create@project_123
  - document:read@project_123
  - document:create@project_123
  - schedule:read@project_123
  - schedule:update@project_123

trade_partner_portal_user@project_123:
  - project:read@project_123 (limited to public info)
  - document:read@project_123 (assigned documents only)
  - timesheet:create@project_123
  - lien_form:read@project_123
```

**Role Hierarchy:**
```
Super Admin (all permissions)
├── Org Admin (all within org)
│   ├── Finance Manager
│   ├── Project Manager
│   ├── Safety Officer
│   ├── Operations Manager
│   └── Report Viewer
├── HR Manager (cross-org)
└── Finance Reviewer (read-only)

External:
├── Trade Partner Portal User
├── Client Portal User
├── Lien Claimant
└── Document Reviewer
```

**Role Inheritance Rules:**
- Higher roles inherit all permissions of lower roles
- Org Admin inherits Finance Manager permissions for scoped division
- Project Manager inherits Report Viewer permissions for scoped project
- External roles do not inherit each other's permissions

**Permission Matrix: Role × Resource × Actions**

| Role | Project (CRUD+) | Financial (CRUD) | Employee (R) | Safety (CRU) | Document (CRUD) | User Admin | Audit (R) |
|---|---|---|---|---|---|---|---|
| Super Admin | ✓ All | ✓ All | ✓ All | ✓ All | ✓ All | ✓ All | ✓ All |
| Org Admin | ✓ All | ✓ All | ✓ Div | ✓ Div | ✓ All | ✓ Div | ✓ Div |
| Finance Manager | ✓ R | ✓ CRUD | ✗ | ✗ | ✓ R | ✗ | ✓ R |
| Finance Reviewer | ✓ R | ✓ R | ✗ | ✗ | ✓ R | ✗ | ✓ R |
| Project Manager | ✓ CRUD | ✗ | ✗ | ✗ | ✓ CRUD | ✗ | ✓ R |
| Safety Officer | ✓ R | ✗ | ✓ Div | ✓ All | ✓ R | ✗ | ✓ R |
| HR Manager | ✓ R | ✗ | ✓ All | ✗ | ✓ R | ✓ All | ✓ R |
| Operations Manager | ✓ R | ✓ R | ✓ Div | ✓ Div | ✓ R | ✗ | ✓ R |
| Report Viewer | ✓ R | ✓ R | ✗ | ✗ | ✓ R | ✗ | ✗ |
| Trade Partner User | ✓ R(lim) | ✗ | ✗ | ✗ | ✓ R(assign) | ✗ | ✗ |
| Client Portal User | ✓ R(lim) | ✓ R(hold) | ✗ | ✗ | ✓ R(assign) | ✗ | ✗ |

Legend: ✓ = permission, ✗ = no permission, R(lim) = limited read, R(assign) = read assigned only

**Policy Overrides Mechanism:**

Override permissions can be temporarily granted by Org Admin for:
- Emergency access during incident (logged, maximum 4 hours)
- Temporary project contractor access (logged, time-limited)
- Data access requests by legal/compliance (logged, time-limited)

Override workflow:
1. Requestor submits override request with justification
2. Org Admin approves/rejects
3. If approved: temporary permission granted with expiry timestamp
4. Audit log records: who requested, who approved, duration, actions taken
5. Permission automatically revokes at expiry (or manual revocation)

**Principle of Least Privilege Enforcement:**

- Default-deny: Users start with no permissions
- Permissions explicitly assigned per role
- No wildcard permissions (all resources)
- External users cannot access internal admin functions
- Seasonal contractors have time-limited access revoked on project end
- Monthly role review: identify and remove obsolete permissions

### 2.4 Row-Level Security (RLS) in Supabase PostgreSQL

**RLS Policy Design Patterns:**

KrewPact uses PostgreSQL RLS to enforce data isolation at the database level, preventing unauthorized data access even if application logic is compromised.

**Pattern 1: Division-Based Isolation**

```sql
-- Enable RLS on all sensitive tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access projects in their assigned division(s)
CREATE POLICY division_isolation ON projects
  FOR SELECT
  USING (
    division_id IN (
      SELECT division_id FROM user_divisions
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can only create projects in their division
CREATE POLICY division_create ON projects
  FOR INSERT
  WITH CHECK (
    division_id IN (
      SELECT division_id FROM user_divisions
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Financial records isolation by division
CREATE POLICY financial_division_isolation ON financial_records
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.division_id IN (
        SELECT division_id FROM user_divisions
        WHERE user_id = auth.uid()
      )
    )
  );
```

**Pattern 2: Project-Level Isolation**

```sql
-- Policy: Users can access documents only for assigned projects
CREATE POLICY project_document_access ON documents
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Exclude admin users from document restrictions
CREATE POLICY admin_bypass ON documents
  FOR SELECT
  USING (
    (SELECT has_role('super_admin') FROM user_roles WHERE user_id = auth.uid())
    OR project_id IN (
      SELECT project_id FROM project_assignments
      WHERE user_id = auth.uid()
    )
  );
```

**Pattern 3: Portal User Isolation**

```sql
-- External users can only see specific portal resources
CREATE POLICY portal_user_isolation ON portal_documents
  FOR SELECT
  USING (
    user_id = auth.uid()  -- Only see own records
    OR project_id IN (
      SELECT project_id FROM portal_user_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Portal users cannot update sensitive fields
CREATE POLICY portal_update_restriction ON projects
  FOR UPDATE
  USING (
    user_id IN (
      SELECT user_id FROM user_roles
      WHERE role_id IN ('trade_partner', 'client_portal')
    )
  )
  WITH CHECK (
    -- Only allow update of specific fields (e.g., status updates)
    updated_at = now() AND
    created_at = old.created_at AND
    division_id = old.division_id
  );
```

**Pattern 4: Field-Level Masking for Sensitive Data**

```sql
-- Financial users can see full banking info; others see masked
CREATE POLICY financial_data_masking ON vendor_payments
  FOR SELECT
  USING (true)
  WITH CHECK (true);

-- Application layer applies masking based on RLS evaluation
-- Query:
SELECT
  id,
  vendor_name,
  CASE
    WHEN has_permission('financial_data:read')
      THEN bank_account_number
      ELSE '****-****-****-' || right(bank_account_number, 4)
  END as bank_account,
  amount
FROM vendor_payments;
```

**Performance Implications and Indexing Strategy:**

RLS policies add overhead to every query. Optimize with:

```sql
-- Index on user_divisions (frequently used in RLS checks)
CREATE INDEX idx_user_divisions_user_id ON user_divisions(user_id);
CREATE INDEX idx_user_divisions_division_id ON user_divisions(division_id);

-- Index on project_assignments (for document/resource access)
CREATE INDEX idx_project_assignments_user_id ON project_assignments(user_id);
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);

-- Composite index for RLS policy joins
CREATE INDEX idx_projects_division_id ON projects(division_id);
CREATE INDEX idx_financial_records_project_id ON financial_records(project_id);

-- Statistics for query planner
ANALYZE user_divisions;
ANALYZE project_assignments;
ANALYZE projects;

-- Monitor slow queries due to RLS
-- Log queries > 100ms to identify optimization opportunities
```

**RLS Policy Testing:**

```sql
-- Test as specific user
SET request.jwt.claims = '{"sub":"user_12345"}';
SELECT * FROM projects;  -- Should only return user's division projects

-- Verify policy enforcement
SELECT schemaname, tablename, policyname FROM pg_policies;

-- Check policy effectiveness
EXPLAIN ANALYZE SELECT * FROM projects;
```

---

## 3. DATA PROTECTION

### 3.1 Encryption Strategy

**Encryption at Rest:**

**Supabase PostgreSQL Database:**
- Encryption: AES-256 (AWS KMS managed keys)
- Coverage: All data in ca-central-1 region
- Key rotation: AWS-managed (automatic annual rotation)
- Backup encryption: Yes, inherited from instance encryption

**File Storage (AWS S3):**
- Bucket: `krewpact-files-ca`
- Encryption: AES-256 server-side encryption (S3-managed or KMS)
- Enable: SSE-S3 with block public access enabled
- Versioning: Enabled for all documents (e-signatures, contracts, drawings)

**ERPNext Self-Hosted (Proxmox):**
- Disk encryption: LUKS2 on all data volumes
- Encryption key: Stored in hardware security module (HSM) or key vault
- Backup encryption: GPG encrypted before transmission
- Database encryption: MySQL with AES encryption for sensitive fields

**Clerk Authentication Service:**
- Encryption: In-transit only (TLS 1.3)
- Data stored: EU region (Germany/Ireland) - not end-to-end encrypted by Clerk
- Mitigation: Clerk stores minimal data (email, phone, metadata)

**Encryption in Transit:**

- TLS 1.3 minimum for all connections
- Certificate pinning: Optional for mobile apps (if built)
- Protocol enforcement: HTTP requests redirected to HTTPS
- Perfect forward secrecy: Enabled on all TLS connections

**TLS Configuration:**

```
Cipher Suites (priority order):
1. TLS_AES_256_GCM_SHA384
2. TLS_AES_128_GCM_SHA256
3. TLS_CHACHA20_POLY1305_SHA256
4. ECDHE-ECDSA-AES256-GCM-SHA384
5. ECDHE-RSA-AES256-GCM-SHA384

Minimum Version: TLS 1.3
HSTS: max-age=31536000; includeSubDomains; preload
```

**Field-Level Encryption for PII:**

Sensitive fields encrypted with application-level encryption before storage:

```javascript
// Encryption schema for sensitive fields
const ENCRYPTED_FIELDS = {
  // Employee data
  sin_number: { encrypt: true, key: 'employee_pii' },
  banking_info: { encrypt: true, key: 'financial_pii' },
  health_certificate: { encrypt: true, key: 'safety_pii' },

  // Contractor/vendor data
  vendor_sin: { encrypt: true, key: 'vendor_pii' },
  contractor_banking: { encrypt: true, key: 'vendor_financial' },
};

// Encryption implementation (AES-256-GCM)
async function encryptField(plaintext, fieldKey) {
  const masterKey = await getEncryptionKey(fieldKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function decryptField(encryptedData, fieldKey) {
  const [iv, authTag, encrypted] = encryptedData.split(':');
  const masterKey = await getEncryptionKey(fieldKey);
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Key Management Strategy:**

- Master encryption keys: Stored in HashiCorp Vault or AWS Secrets Manager
- Key rotation: Quarterly (90-day cycle) for operational keys
- Key derivation: PBKDF2 for password-based encryption
- Key access: Limited to database service account and authorized admins
- Key audit: All key operations logged with user, timestamp, action
- Disaster recovery: Key escrow copies stored in geographically separate secure location

**Encryption for Backups:**

```bash
# Backup encryption strategy: 3-2-1 rule
# 3 copies: Production + 2 backup copies
# 2 storage types: Database backup + filesystem backup
# 1 off-site: AWS S3 cross-region replication

# Backup process
pg_dump -Fc -U postgres krewpact_db | \
  gpg --symmetric --cipher-algo AES256 > krewpact_db_$(date +%Y%m%d).sql.gpg

# Upload to S3 with encryption
aws s3 cp krewpact_db_$(date +%Y%m%d).sql.gpg \
  s3://krewpact-backups-ca/postgresql/$(date +%Y/%m/%d)/ \
  --sse AES256 --storage-class GLACIER

# Verify backup integrity
gpg --decrypt krewpact_db_20250209.sql.gpg | pg_restore -d test_db
```

### 3.2 Data Classification

| Classification Level | Description | Examples | Handling Requirements | Access Controls | Retention |
|---|---|---|---|---|---|
| **Public** | Information safe for public disclosure | General project info, company news, marketing materials | Can be published without approval | No restrictions (available to all) | Indefinite |
| **Internal** | Not for public disclosure but low sensitivity | General employee directory, internal policies, organizational charts | Must be kept internal; requires approval for external sharing | All internal staff | 3 years after last access |
| **Confidential** | Sensitive business data; unauthorized disclosure causes harm | Financial records, client contracts, project budgets, proprietary processes | Restricted to business-need-to-know; encryption required in transit and at rest | Division-based access controls | Legal/business retention period |
| **Restricted** | Highly sensitive; severe impact if disclosed | SIN numbers, banking info, WSIB claims, health data, personal medical records | Must be encrypted at rest and in transit; field-level encryption; minimal access logging | Admin/legal only; time-limited access | Regulatory minimum (CRA 6 years) |

**Data Classification Examples:**

```
PUBLIC:
  - Project completion announcements
  - Public bid information
  - General company contact information

INTERNAL:
  - Employee phone directory
  - Internal project schedules (timelines)
  - Organizational structure
  - Internal process documentation

CONFIDENTIAL:
  - Project budgets and financial forecasts
  - Client contracts and pricing terms
  - Vendor agreements and pricing
  - Employee salary information
  - Safety audit results
  - Project change orders and claims

RESTRICTED:
  - Social Insurance Numbers (SIN)
  - Banking account information (vendor/contractor)
  - Health certificates and WSIB claims
  - Workers' compensation records
  - Personal medical information
  - Background check results
  - Payroll records with net amounts
```

### 3.3 Data Retention and Disposal

| Data Category | Retention Period | Legal Basis | Disposal Method | Responsible Party |
|---|---|---|---|---|
| **Financial Records** | 6 years from creation | CRA tax law requirements | Secure deletion (DoD 5220.22-M standard) | Finance Manager |
| **Employee Records** | 6 years after termination | Ontario Employment Standards Act | Secure deletion + certificate of destruction | HR Manager |
| **Payroll Records** | 6 years from date of payment | CRA payroll deductions requirements | Secure deletion | HR Manager |
| **Audit Logs** | 7 years minimum (financial), 2+ years general | SOX/accounting standards; PIPEDA | Immutable storage; archived logs deleted securely | Compliance Officer |
| **Project Documents** | 7 years after project completion | Construction Act lien claims; CRA deductibility | Archive to cold storage after 2 years; destroy after 7 | Project Admin |
| **E-Signature Records** | 7 years minimum | BoldSign compliance; construction contracts | Immutable storage; no deletion | Document Admin |
| **WSIB/Safety Records** | Indefinite (safety-critical) | WSIB recordkeeping; OH&S Act | Permanent archival | Safety Officer |
| **Portal User Data** | Duration of relationship + 2 years | PIPEDA; business records retention | Secure deletion upon request or retention end date | Privacy Officer |
| **Backup Archives** | Minimum 2 years; max 7 years | Disaster recovery; regulatory compliance | Secure destruction per encryption schedule | IT Operations |
| **Email/Communications** | 2 years active; 5 years archive | PIPEDA; litigation hold procedures | Automated purge; litigation hold on request | IT Operations |
| **Cookies/Tracking Data** | Duration of user consent | PIPEDA; Consent Management System | Automatic deletion at consent expiry | Privacy Officer |
| **Deleted User Data** | 30 days post-deletion | GDPR right-to-be-forgotten; data protection | Purge from all systems after 30-day grace period | Privacy Officer |

**Disposal Methods:**

**Secure Deletion (Standard):**
- NIST SP 800-88 Secure Deletion Guidelines
- DoD 5220.22-M standard: 7-pass overwrite (or crypto-erase for SSD)
- Tool: BleachBit or shred with -vfz-27 option
- Verification: Certificate of destruction with deletion timestamp

**Immutable Archival:**
- WORM (Write-Once-Read-Many) storage for audit logs
- AWS S3 Object Lock: Compliance mode, minimum 7-year retention
- No deletion possible until retention period expires
- Verification: Amazon S3 access logs confirm immutability

**Cryptographic Erase:**
- For encrypted data: Destroy encryption key only
- Data becomes unrecoverable instantly (key destroyed)
- Certificate issued showing key destruction
- Applicable to: Encrypted backups, field-level encrypted data

### 3.4 Data Residency Strategy

**Primary Data Storage: Supabase on AWS Canada (ca-central-1)**

- Database location: AWS ca-central-1 region (Montreal, Canada)
- Backup location: AWS ca-west-1 (Calgary, Canada) for DR
- Compliance: Data residency requirement for Canadian businesses
- Latency: < 30ms for Toronto users, < 50ms for Western Canada
- Provider: Supabase (managed PostgreSQL on AWS)

**Authentication Service: Clerk (EU Servers)**

- Data location: Germany/Ireland (EU data centers)
- Mitigation: Clerk stores minimal user data (email, OAuth metadata only)
- No Canadian region available from Clerk
- Risk: Low due to minimal data stored; passwords not stored by Clerk
- Compliance: GDPR-compliant processing; privacy DPA in place

**E-Signature Service: BoldSign**

- Data location: Verify with BoldSign (Australia-based company)
- Signed documents: May be stored in Australia
- Mitigation: Contracts specify document delivery; we maintain local copy in CA
- Compliance: Electronic Commerce Act compliance verified

**File Storage: AWS S3 - Canadian Region**

- Bucket location: s3-ca-central-1 (Montreal)
- Encryption: AES-256 (AWS managed keys in ca-central-1)
- Replication: Automatic replication to ca-west-1 for DR
- Versioning: Enabled for all critical documents

**ERPNext Financial System: Self-Hosted in Canada**

- Server location: Proxmox hypervisor in secure Canadian data center
- Database: PostgreSQL on encrypted storage
- Backups: Encrypted, stored on Canadian S3
- Network: VPN/Tailscale for secure access from KrewPact

**Vercel Edge Functions: Canadian PoP Availability**

- Edge functions: Deployed globally but execute from nearest PoP
- Canadian PoPs: Toronto (ca-tor-1), Montreal (ca-mtl-1) available
- Data flow: Edge functions process requests; data stored in ca-central-1
- Latency: < 10ms from PoP to origin database

**Data Residency Compliance Matrix:**

| System | Data Type | Location | Compliance | Notes |
|---|---|---|---|---|
| Supabase PostgreSQL | All operational data | AWS ca-central-1 | PIPEDA compliant | Primary system |
| AWS S3 Backups | Database backups | AWS ca-west-1 | PIPEDA compliant | DR copy |
| AWS S3 Files | Documents, files | AWS ca-central-1 | PIPEDA compliant | Project files |
| Clerk Auth | User metadata | EU (Germany/Ireland) | GDPR compliant | Minimal data |
| BoldSign | Signed documents | Australia (TBD) | Electronic Commerce Act | Local copy maintained |
| ERPNext | Financial records | Canadian datacenter | PIPEDA compliant | Self-hosted |
| Vercel CDN | Static assets | Global PoPs | PIPEDA compliant | CDN layer only |
| Vercel Edge Functions | Request processing | Canadian PoPs | PIPEDA compliant | Transient data |

**Cross-Border Data Transfer Controls:**

- Data transfer to Clerk (USA/EU) minimized: OAuth metadata only
- Data transfer to BoldSign (Australia) limited to documents for signature
- Contractual safeguards: Standard contractual clauses (SCCs) in place
- Purpose limitation: External data use limited to specified purposes
- Regular audit: Quarterly review of data transferred externally

---

## 4. PIPEDA COMPLIANCE IMPLEMENTATION

> **Legal Requirements:** See [KrewPact-Licensing-and-Legal-Audit.md](./KrewPact-Licensing-and-Legal-Audit.md) §4 for the complete regulatory requirement summary and risk assessment.

### PIPEDA Requirements → Technical Implementation Mapping

| PIPEDA Requirement | Legal Reference | Technical Implementation |
|-------------------|-----------------|--------------------------|
| Consent management | Licensing §4 | Consent Management System (Security §4.3) |
| Breach notification (30 days) | Licensing §4 | Incident response workflow (Security §4.2) |
| Privacy access requests (DSAR) | Licensing §4 | Privacy request lifecycle (Security §4.1) |
| Data retention policies | Licensing §4 | Automated purge rules (Security §4.1) |
| Audit trails (7 years financial) | Licensing §4 | Immutable audit design (Security §4) |

### 4.1 Privacy by Design

KrewPact implements privacy by design principles throughout system architecture, ensuring data protection is foundational rather than an afterthought.

**Data Minimization Principles:**

- Collect only data necessary for specified purpose (construction project management)
- Avoid optional fields unless clear value to user
- Regular data audit to identify unused fields for removal
- Field-level tracking: Record purpose for every data field collected

**Data Minimization Checklist:**
```
Employee Data:
  ✓ Required: Name, email, phone, job title, division
  ✓ Required: Health certifications (for safety roles)
  ✓ Prohibited: Medical history (unless work-related accident)
  ✓ Minimize: Collect SIN only for payroll, not general employment

Project Data:
  ✓ Required: Project name, location, budget, timeline, team
  ✓ Prohibited: Collect names of private homeowners (unless authorized)
  ✓ Minimize: Collect contractor info only for assigned projects

Vendor/Contractor Data:
  ✓ Required: Business name, contact, services, insurance
  ✓ Required: SIN (for T4/payments); banking (for payments)
  ✓ Minimize: Collect only at time of payment, not during bidding
```

**Purpose Limitation Enforcement:**

- Data collected for payroll cannot be used for marketing
- Project location data cannot be used for competitive analysis
- Employee health data used only for WSIB/safety, never for performance evaluation
- Contractual restriction: Data use limited to specified purposes
- Technical enforcement: Access controls prevent cross-purpose data usage

**Privacy Impact Assessment (PIA) Process:**

Conduct PIA before implementing new features that collect/process data:

**PIA Checklist:**
```
1. Data Collection
   □ What personal information will be collected?
   □ Is collection necessary for the stated purpose?
   □ What is the legal basis for collection?

2. Consent
   □ Will explicit consent be obtained?
   □ Is consent form clear and separate from other terms?
   □ Can users withdraw consent easily?

3. Data Sharing
   □ Will data be shared with third parties?
   □ Will data be transferred outside Canada?
   □ Are Data Processing Agreements in place?

4. Data Security
   □ How will data be protected during transmission?
   □ How will data be encrypted at rest?
   □ Who has access to data?

5. Data Retention
   □ How long will data be retained?
   □ How will data be securely deleted?
   □ Are there legal retention requirements?

6. Individual Rights
   □ How will access requests be handled?
   □ How will correction requests be handled?
   □ How will deletion requests be handled?

7. Risk Assessment
   □ What is the probability of unauthorized disclosure?
   □ What would be the impact on individuals?
   □ What controls mitigate identified risks?
```

### 4.2 Consent Management System

**Consent Collection Points:**

| Collection Point | Purpose | Consent Type | Duration | Withdrawal | Legal Basis |
|---|---|---|---|---|---|
| **User Registration** | Create KrewPact account, receive updates | Explicit opt-in | Until withdrawal | One-click unsubscribe | Contractual |
| **Portal Signup** | Create external portal access | Explicit opt-in (separate form) | Duration of portal access | Self-service in portal | Contractual |
| **Data Processing** | Allow processing of personal data for operational purposes | Implied (T&C) | Duration of employment/contract | Through account settings | Legal obligation (employment) |
| **Cookies/Analytics** | Website analytics, performance monitoring | Explicit opt-in (cookie banner) | Duration of consent | Cookie preferences page | Explicit consent |
| **Marketing Communications** | Email newsletters, product updates | Explicit opt-in (separate checkbox) | Until withdrawal | Email footer unsubscribe link | Explicit consent |
| **Third-Party Integration** | Connect with ADP, ERPNext, Clerk | Explicit opt-in (OAuth scope approval) | Until revoked | Account integrations settings | User authorization |
| **Data Transfer to External Services** | Transfer to BoldSign for e-signatures | Explicit (document workflow) | For document processing only | Request after document signed | Purpose-specific consent |

**Consent Management Database Schema:**

```sql
CREATE TABLE consent_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  consent_type VARCHAR(50) NOT NULL,
  -- consent_type: 'registration', 'marketing', 'analytics', 'third_party'
  purpose TEXT NOT NULL,
  -- Specific purpose of data collection
  given_at TIMESTAMP NOT NULL DEFAULT NOW(),
  given_by_ip_address INET,
  given_by_user_agent TEXT,
  -- Track IP and device used to give consent
  expires_at TIMESTAMP,
  -- Consent expiry if temporary
  withdrawn_at TIMESTAMP,
  -- When user withdrew consent
  data_retention_until TIMESTAMP,
  -- When associated data will be deleted
  v1_signed_document_hash VARCHAR(256),
  -- Hash of consent document for audit trail
  status VARCHAR(20) DEFAULT 'active',
  -- 'active', 'withdrawn', 'expired'
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX idx_consent_records_consent_type ON consent_records(consent_type);
CREATE INDEX idx_consent_records_status ON consent_records(status);
```

**Consent Withdrawal Process:**

1. User initiates withdrawal via account settings
2. System records timestamp and method (email, portal UI)
3. Immediate effects:
   - Email communications stop
   - Marketing emails purged from mailing list
   - Analytics cookies deleted on next page load
4. Data handling:
   - Associated personal data marked for deletion
   - 30-day grace period before purge (user can cancel)
   - Audit log records withdrawal action
5. Confirmation email sent to user with withdrawal details

**Consent Audit Trail:**

```sql
CREATE TABLE consent_audit_log (
  id UUID PRIMARY KEY,
  consent_record_id UUID NOT NULL REFERENCES consent_records(id),
  action VARCHAR(50) NOT NULL,
  -- 'given', 'withdrawn', 'expired', 'updated'
  action_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  action_by_user_id UUID REFERENCES users(id),
  -- NULL if system action (e.g., automatic expiry)
  action_by_ip_address INET,
  action_reason TEXT,
  -- e.g., 'User requested via account settings', 'Consent expired (12 months)'
  notes TEXT
);
```

### 4.3 Data Subject Rights Implementation

**Right to Access (30-day SLA):**

Process for user requesting access to their personal data:

```
1. Request Receipt
   - User submits PIPEDA access request via privacy@krewpact.io
   - Automated response: Request logged, 30-day deadline set
   - Request ID generated for tracking

2. Verification
   - Confirm user identity (email verification, security questions)
   - Escalate to Privacy Officer if identity uncertain

3. Data Collection (7 days)
   - Query all systems: Supabase, ERPNext, Clerk, BoldSign, file storage
   - Compile data related to individual
   - Include: Consent records, audit logs, communication history

4. Review & Redaction (5 days)
   - Remove data about third parties (other employees)
   - Redact security-sensitive information if needed
   - Organize data in clear, understandable format

5. Delivery (within 30 days total)
   - Provide in commonly used format (PDF, CSV, plain text)
   - Hand-deliver or secure email transmission
   - Retain proof of delivery

6. Documentation
   - Log access request in audit trail
   - Record dates of receipt, completion, delivery
   - Maintain request and response documentation for 7 years
```

**Right to Correction Implementation:**

Process for user requesting correction of inaccurate data:

```
1. Request Submission
   - User requests data correction via support@krewpact.io
   - Specify which data is inaccurate and how to correct it

2. Verification
   - Verify user identity and authority to request correction
   - Determine if data is indeed inaccurate or just disputed

3. Correction Procedure
   If correction confirmed:
     - Update data in all systems (Supabase, ERPNext, etc.)
     - Record original value in audit log
     - Notify user of correction completion
   If correction disputed:
     - Document user's dispute
     - Retain both original and disputed versions
     - Send explanation to user

4. Notification
   - Notify third parties who received inaccurate data (if practicable)
   - Indicate correction date in notification
   - Keep record of notification
```

**Right to Deletion Implementation (Right to Be Forgotten):**

Process for user requesting data deletion:

```
1. Request Evaluation
   - User requests deletion via privacy@krewpact.io
   - Assess if deletion is legally permissible:
     ✓ Legal to delete if: Consent withdrawn, purpose complete, data no longer needed
     ✗ Cannot delete if: Legal obligation (CRA 6 years), litigation hold, WSIB claim

2. Determination
   - If deletable: Proceed to deletion
   - If not deletable: Explain legal reason and retention period

3. Data Deletion (if permissible)
   - Delete from primary systems (Supabase)
   - Delete from backups (via backup purge process)
   - Delete from archives (after legal retention period)
   - Keep audit log entry (shows deletion occurred)

4. Verification
   - Query systems to confirm deletion
   - Perform full-text search for stray references
   - Certificate of deletion issued to user

5. Post-Deletion
   - Cannot restore user data after 30-day grace period
   - User account may be retained (for audit purposes) but depersonalized
```

**Data Portability (PIPEDA / Quebec Law 25):**

Provide user with their data in machine-readable format:

```
Format: CSV, JSON, or standard open format
Include: All personal data processed about individual
Exclude: Derived insights, analytics, third-party data

Example JSON export:
{
  "user": {
    "id": "user_xxx",
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+1-416-555-0123",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "employment": {
    "division": "Division A",
    "role": "Project Manager",
    "start_date": "2024-01-15",
    "certifications": ["COR", "WHIMIS"]
  },
  "project_assignments": [
    {
      "project_id": "proj_123",
      "project_name": "Office Tower - Toronto",
      "role": "Manager",
      "assigned_date": "2024-01-15"
    }
  ],
  "consent_records": [
    {
      "type": "marketing",
      "given_at": "2024-01-15",
      "status": "active"
    }
  ]
}
```

**Request Tracking and Fulfillment Workflow:**

```sql
CREATE TABLE data_subject_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  request_type VARCHAR(50) NOT NULL,
  -- 'access', 'correction', 'deletion', 'portability'
  request_details TEXT,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  submitted_by_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  -- 'pending', 'in_progress', 'completed', 'denied'
  status_reason TEXT,
  -- Reason for denial if applicable
  completion_target TIMESTAMP,
  -- 30 days from submission (PIPEDA requirement)
  completed_at TIMESTAMP,
  verification_method VARCHAR(50),
  -- 'email', 'phone', 'in_person', 'security_question'
  verified_at TIMESTAMP,
  delivery_method VARCHAR(50),
  -- 'email', 'download', 'postal', 'hand_delivery'
  delivered_at TIMESTAMP,
  processed_by_admin_id UUID REFERENCES users(id),
  notes TEXT
);

CREATE INDEX idx_data_subject_requests_user_id ON data_subject_requests(user_id);
CREATE INDEX idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX idx_data_subject_requests_submitted_at ON data_subject_requests(submitted_at);
```

### 4.4 Breach Response Plan

**Detection Mechanisms:**

```
Automated:
  - Intrusion detection system (IDS) alerts on network anomalies
  - Log analysis: Alert on mass data exports, failed access attempts
  - Database: Alert on unusual query patterns (e.g., SELECT * FROM users)
  - File integrity: Monitor integrity of sensitive files
  - Rate limiting: Triggered when API quota exceeded

Manual:
  - User reports suspicious activity
  - External notification (law enforcement, business partners)
  - Vendor security alerts (Supabase, Clerk, AWS)
  - Audit review identifies suspicious patterns
```

**Breach Classification (Severity Matrix):**

| Severity | Impact | Examples | Response Time | Regulatory Notice |
|---|---|---|---|---|
| **S1 - Critical** | Widespread data exposure; severe privacy harm | Full database dump, all SIN numbers exposed, financial records leaked | Immediate (< 1 hour) | Yes, 24-48 hours |
| **S2 - High** | Significant data exposure; PII compromised | 100+ employee SINs exposed, banking info leaked | Within 4 hours | Yes, 24-48 hours |
| **S3 - Medium** | Limited exposure; containable impact | < 10 records exposed, isolated project data, non-sensitive info | Within 24 hours | Assess; likely yes |
| **S4 - Low** | Minimal exposure; no PII involved | Public project names disclosed, non-sensitive metadata | Within 1 week | Unlikely |

**Notification Requirements:**

**Office of the Privacy Commissioner (OPC) - Federal:**
- Notify if reasonable belief personal information has been stolen/misused
- Timeline: Without unreasonable delay
- Method: Online form at OPC website
- Information: Description of information involved, steps being taken

**Provincial Regulators (if applicable):**
- Quebec CNIL: If Quebec residents affected
- British Columbia: If BC residents affected
- Ontario: If breach involves health information

**Affected Individuals:**
- Notify if breach creates real risk of identity theft
- Timeline: Without unreasonable delay
- Method: Email (preferred), mail, public notice if mass breach
- Content: Nature of breach, what data compromised, mitigation steps, contact info

**Example Breach Notification:**

```
Subject: Important: Security Notice Regarding Your Personal Information

Dear [Name],

We are writing to inform you of a security incident that may have affected your personal information.

WHAT HAPPENED:
On [date], we discovered unauthorized access to our database containing employee records.
Our investigation indicates that [specific data types] may have been accessed.

WHAT WE'RE DOING:
- We have secured the affected system and prevented further unauthorized access
- We are working with [security firm] to investigate the incident
- We have notified law enforcement and regulatory authorities
- We are implementing enhanced security measures

WHAT YOU CAN DO:
- Review your credit report at [Canadian credit bureau website]
- Monitor your accounts for suspicious activity
- Change your password on KrewPact and any other sites using the same password
- If you observe fraudulent activity, contact [contact info]

SUPPORT:
We sincerely apologize for this incident. If you have questions, please contact:
  Privacy Officer: privacy@krewpact.io
  Phone: [phone number]
  Available: [hours]

---

[Personal Data Confirmation Section]
This notice relates to your account: [user_id]
Data types involved: [list specific data]
Retention period: Data will be securely deleted by [date]
```

**24-Month Breach Record Requirement (PIPEDA):**

Maintain records of all breaches:

```sql
CREATE TABLE security_breach_records (
  id UUID PRIMARY KEY,
  discovery_date DATE NOT NULL,
  breach_type VARCHAR(100) NOT NULL,
  -- 'unauthorized_access', 'data_theft', 'accidental_disclosure', etc.
  affected_individuals INT,
  affected_data_categories TEXT[],
  -- e.g., ['SIN', 'banking_info', 'health_records']
  root_cause TEXT,
  root_cause_investigation_date DATE,

  -- Regulatory notifications
  opc_notified BOOLEAN DEFAULT FALSE,
  opc_notification_date DATE,
  provincial_notified TEXT[],
  -- Array of provinces notified

  -- Individual notifications
  individuals_notified INT,
  notification_date DATE,
  notification_method TEXT,
  -- 'email', 'mail', 'public_notice'

  -- Remediation
  remediation_steps TEXT,
  estimated_remediation_complete DATE,

  -- Investigation details
  investigator_name VARCHAR(255),
  investigation_report_path VARCHAR(512),
  finding_summary TEXT,

  -- Follow-up
  post_breach_monitoring_duration VARCHAR(50),
  -- e.g., '24 months', 'indefinite'
  monitoring_results TEXT,

  -- Lessons learned
  process_improvements TEXT,
  lessons_learned TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

### 4.5 Third-Party Data Processing Agreements

**Data Processing Agreements (DPA) Required For:**

| Vendor | Service | Data Processed | DPA Status | Review Frequency |
|---|---|---|---|---|
| **Supabase** | PostgreSQL database | All operational data, PII | Signed | Annually |
| **Clerk** | Authentication | User email, OAuth metadata | Signed | Annually |
| **BoldSign** | E-signatures | Signed documents, user metadata | Signed | Annually |
| **ADP** | Payroll integration | Employee names, SINs, banking | Signed | Semi-annually |
| **Vercel** | Application hosting | Transient request data, logs | Signed | Annually |
| **AWS** | Cloud infrastructure | Database, backups, files | Signed (via Supabase) | Annually |

**DPA Review Checklist:**

```
Standard Clauses (Standard Contractual Clauses for EU data):
  □ Processor must process data only on documented instructions
  □ Processor must ensure data security (confidentiality, integrity, availability)
  □ Processor must limit access to authorized personnel
  □ Processor must assist with data subject rights requests
  □ Processor must delete/return data at end of contract
  □ Processor warrants they have no conflicting obligations

Sub-processor Management:
  □ List of current sub-processors documented
  □ Mechanism for notifying us of sub-processor changes
  □ Opportunity to object to new sub-processors
  □ Right to audit sub-processor security

Security Measures:
  □ Encryption in transit (TLS 1.3 minimum)
  □ Encryption at rest (AES-256)
  □ Access controls and authentication
  □ Regular security assessments/certifications
  □ Incident response procedures and notification timeline

Data Location:
  □ Data residency requirements (Canada-based)
  □ Data replication and backup locations
  □ Sub-processor data locations

Audit Rights:
  □ Right to audit processor's security practices
  □ Audit frequency and notice requirements
  □ Annual security certification required (SOC 2, ISO 27001)
  □ Incident response testing and proof

Termination:
  □ Data deletion on termination (within 30 days)
  □ Backup retention period (if applicable)
  □ Certification of deletion required
```

**Vendor Security Assessment Criteria:**

Score 0-5 for each criterion:

```
Criterion                          Weight   Score   Weighted Score
1. Encryption (in transit/rest)     15%     __/_5   ___
2. Access controls (authentication)  15%    __/_5   ___
3. Incident response capability      10%    __/_5   ___
4. Data residency compliance          15%    __/_5   ___
5. Audit certifications (SOC2/ISO)   15%    __/_5   ___
6. Data subject rights support        10%    __/_5   ___
7. Backup/recovery capability         10%    __/_5   ___
8. Sub-processor transparency         10%    __/_5   ___
                            TOTAL SCORE: ____/500

Scoring:
  >= 400: Acceptable (approved)
  300-399: Acceptable with conditions (audit/improvements required)
  < 300: Not acceptable (cannot use service)
```

**Ongoing Vendor Monitoring:**

```sql
CREATE TABLE vendor_monitoring (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  monitoring_date DATE NOT NULL,
  check_type VARCHAR(50) NOT NULL,
  -- 'security_assessment', 'breach_notification', 'incident_response'
  assessment_score INT,
  -- 0-500 scale
  notes TEXT,
  required_actions TEXT[],
  -- Array of required improvements
  follow_up_date DATE,
  status VARCHAR(20),
  -- 'passed', 'passed_with_conditions', 'failed'

  UNIQUE(vendor_id, monitoring_date)
);

-- Annual review schedule
SELECT vendor_name, last_assessment_date, CURRENT_DATE - last_assessment_date as days_since_assessment
FROM vendors
WHERE vendor_type IN ('authentication', 'data_processor', 'file_storage')
  AND CURRENT_DATE - last_assessment_date > 365
ORDER BY days_since_assessment DESC;
```

---

## 5. CONSTRUCTION INDUSTRY COMPLIANCE

### 5.1 Construction Act 2026 (Ontario)

**7-Day Termination Notice Tracking:**

The Construction Act requires that if a contract is terminated, seven days written notice must be given and statutory entitlements confirmed.

```sql
CREATE TABLE contract_terminations (
  id UUID PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES contracts(id),
  termination_initiated_date TIMESTAMP NOT NULL,
  terminating_party VARCHAR(100) NOT NULL,
  -- 'contractor', 'owner', 'general_contractor'
  reason TEXT NOT NULL,

  -- 7-day notice tracking
  notice_given_date TIMESTAMP,
  notice_method VARCHAR(50),
  -- 'email', 'registered_mail', 'in_person'
  notice_recipient_email VARCHAR(255),
  notice_delivery_confirmed BOOLEAN DEFAULT FALSE,
  notice_delivery_confirmed_at TIMESTAMP,

  -- Statutory entitlements calculation
  amount_earned_to_date NUMERIC(15,2),
  -- Contract value minus holdback
  holdback_percentage NUMERIC(5,2),
  -- Typically 10%
  holdback_amount NUMERIC(15,2),
  -- Calculated: amount_earned * holdback_percentage

  -- Form 6 (Final Certificate of Payment) tracking
  form_6_required BOOLEAN DEFAULT TRUE,
  form_6_generated_date TIMESTAMP,
  form_6_payment_due_date TIMESTAMP,
  -- 10 days after Form 6 issuance
  form_6_payment_received_date TIMESTAMP,
  form_6_payment_amount NUMERIC(15,2),

  termination_completed_date TIMESTAMP,
  -- When all statutory obligations fulfilled

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_terminations_contract_id ON contract_terminations(contract_id);
CREATE INDEX idx_contract_terminations_form_6_payment_due_date ON contract_terminations(form_6_payment_due_date);
```

**Workflow Automation:**

```javascript
// Upon contract termination initiation:
async function initiateContractTermination(contractId, terminatingParty, reason) {
  // 1. Create termination record
  const termination = await db.contract_terminations.create({
    contract_id: contractId,
    termination_initiated_date: new Date(),
    terminating_party: terminatingParty,
    reason: reason
  });

  // 2. Calculate entitlements
  const contract = await db.contracts.findById(contractId);
  const earnedAmount = calculateEarnedValue(contract); // Based on invoices
  termination.amount_earned_to_date = earnedAmount;
  termination.holdback_percentage = contract.holdback_percentage || 10;
  termination.holdback_amount = earnedAmount * (termination.holdback_percentage / 100);

  // 3. Send 7-day notice
  await sendContractTerminationNotice(contract.contractor_id, termination);
  termination.notice_given_date = new Date();

  // 4. Schedule Form 6 generation (7 days later)
  scheduleTask({
    type: 'generate_form_6',
    termination_id: termination.id,
    scheduled_date: addDays(new Date(), 7)
  });

  // 5. Record in audit log
  await auditLog.record({
    action: 'CONTRACT_TERMINATED',
    resource: contractId,
    details: { reason, amount: earnedAmount }
  });

  return termination;
}
```

**Lien Management Features:**

KrewPact tracks lien waiver requirements and manages statutory liens:

```sql
CREATE TABLE lien_tracking (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  contract_id UUID NOT NULL REFERENCES contracts(id),

  -- Statutory lien information
  statutory_lien_deadline TIMESTAMP NOT NULL,
  -- Deadline to register statutory lien (varies by jurisdiction)
  statutory_lien_registered BOOLEAN DEFAULT FALSE,
  statutory_lien_registration_date TIMESTAMP,
  statutory_lien_amount NUMERIC(15,2),
  -- Amount subject to lien

  -- Conditional Lien Waiver tracking
  lien_waiver_requested BOOLEAN DEFAULT FALSE,
  lien_waiver_requested_date TIMESTAMP,
  lien_waiver_received BOOLEAN DEFAULT FALSE,
  lien_waiver_received_date TIMESTAMP,
  lien_waiver_scope VARCHAR(50),
  -- 'partial_waiver', 'final_waiver'
  lien_waiver_amount NUMERIC(15,2),

  -- Final Lien Waiver (after full payment)
  final_lien_waiver_issued BOOLEAN DEFAULT FALSE,
  final_lien_waiver_date TIMESTAMP,
  final_lien_waiver_amount NUMERIC(15,2),

  -- Dispute/claim tracking
  lien_dispute_filed BOOLEAN DEFAULT FALSE,
  lien_dispute_date TIMESTAMP,
  dispute_description TEXT,
  dispute_resolution_date TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Alert for upcoming lien deadlines
SELECT contractor_id, project_id, statutory_lien_deadline
FROM lien_tracking
WHERE statutory_lien_registered = FALSE
  AND statutory_lien_deadline < CURRENT_DATE + INTERVAL '14 days'
ORDER BY statutory_lien_deadline ASC;
```

**Holdback Release Tracking (Form 6):**

```sql
CREATE TABLE form_6_certificates (
  id UUID PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES contracts(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  certificate_number VARCHAR(50) UNIQUE,
  -- e.g., "FORM6-2025-001"

  -- Certificate details
  contractor_name VARCHAR(255) NOT NULL,
  contractor_address TEXT NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  project_location VARCHAR(255) NOT NULL,

  -- Payment information
  contract_value NUMERIC(15,2) NOT NULL,
  total_earned_amount NUMERIC(15,2) NOT NULL,
  total_paid_to_date NUMERIC(15,2) NOT NULL,
  holdback_percentage NUMERIC(5,2) NOT NULL,
  -- Typically 10%
  held_back_amount NUMERIC(15,2) NOT NULL,
  -- Remaining holdback to be released
  amount_due_on_form_6 NUMERIC(15,2) NOT NULL,
  -- Amount being released by this Form 6

  -- Timing
  issued_date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  -- 10 days from issued date
  payment_received_date TIMESTAMP,
  payment_received_amount NUMERIC(15,2),

  -- Lien waiver correlation
  lien_waiver_condition_satisfied BOOLEAN DEFAULT FALSE,
  -- Did contractor provide final lien waiver?
  lien_waiver_received_date TIMESTAMP,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'issued',
  -- 'issued', 'payment_pending', 'payment_received', 'overdue', 'disputed'
  status_last_updated TIMESTAMP,

  -- Compliance verification
  verified_by_admin_id UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_form_6_due_date ON form_6_certificates(due_date);
CREATE INDEX idx_form_6_status ON form_6_certificates(status);
CREATE INDEX idx_form_6_contract_id ON form_6_certificates(contract_id);
```

**Statutory Notice Publication Integration:**

Required notices must be published in Construction Lien Act specified locations:

```sql
CREATE TABLE statutory_notices (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  notice_type VARCHAR(50) NOT NULL,
  -- 'lien_claim', 'project_completion', 'certificate_of_payment'

  -- Notice content
  notice_title VARCHAR(255) NOT NULL,
  notice_content TEXT NOT NULL,
  -- Statutory text required by Construction Act

  -- Publication requirements
  published_at_site BOOLEAN DEFAULT FALSE,
  published_at_site_date TIMESTAMP,
  -- Physical posting at job site

  published_online BOOLEAN DEFAULT FALSE,
  published_online_date TIMESTAMP,
  published_online_url VARCHAR(512),
  -- Online portal publication

  newspaper_published BOOLEAN DEFAULT FALSE,
  newspaper_name VARCHAR(255),
  newspaper_publication_date TIMESTAMP,
  -- Publication in local newspaper (if required)

  deadline_date DATE NOT NULL,
  -- Statutory deadline for publication

  compliance_verified BOOLEAN DEFAULT FALSE,
  verified_by_admin_id UUID REFERENCES users(id),
  verified_date TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Trust Fund Segregation Documentation:**

If KrewPact holds project funds (holdbacks), maintain segregation:

```sql
CREATE TABLE trust_fund_accounts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  bank_account_number VARCHAR(50) UNIQUE,
  -- Must be clearly labeled as trust account
  bank_name VARCHAR(255),
  account_type VARCHAR(50),
  -- 'trust_account', 'holdback_account'

  -- Trust segregation verification
  signed_agreement_path VARCHAR(512),
  -- Signed agreement with bank ensuring trust status
  signed_agreement_date DATE,

  -- Balance tracking
  current_balance NUMERIC(15,2),
  last_updated TIMESTAMP,

  -- Restrictions
  restricted_for_distribution BOOLEAN DEFAULT TRUE,
  distribution_allowed_only_for VARCHAR(255),
  -- 'statutory_lien_entitlements', 'unpaid_invoices'

  reconciliation_last_performed DATE,
  reconciliation_notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit trail for trust fund movements
CREATE TABLE trust_fund_movements (
  id UUID PRIMARY KEY,
  trust_fund_account_id UUID NOT NULL REFERENCES trust_fund_accounts(id),
  movement_type VARCHAR(20) NOT NULL,
  -- 'deposit', 'withdrawal', 'transfer'
  amount NUMERIC(15,2) NOT NULL,
  movement_date TIMESTAMP NOT NULL,
  reference_contract_id UUID REFERENCES contracts(id),
  -- Which contract this movement relates to
  description TEXT,
  authorized_by_admin_id UUID REFERENCES users(id),
  authorized_date TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 5.2 WSIB/OHSA Digital Records

**Safety Record Requirements:**

KrewPact maintains digital safety records per WSIB recordkeeping requirements:

```sql
CREATE TABLE safety_records (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Incident information
  incident_type VARCHAR(100) NOT NULL,
  -- 'injury', 'near_miss', 'hazard_identified', 'safety_inspection'

  incident_date TIMESTAMP NOT NULL,
  incident_location VARCHAR(255),

  -- Injury specific (if applicable)
  injured_worker_id UUID REFERENCES employees(id),
  injury_description TEXT,
  body_parts_affected TEXT[],
  -- e.g., ['left_hand', 'right_shoulder']

  -- Severity and classification
  severity_level VARCHAR(20),
  -- 'minor', 'serious', 'critical', 'fatality'

  -- WSIB claim linkage
  wsib_claim_filed BOOLEAN DEFAULT FALSE,
  wsib_claim_number VARCHAR(50),
  wsib_claim_filed_date TIMESTAMP,
  wsib_claim_status VARCHAR(50),
  -- 'pending', 'accepted', 'rejected', 'appealed'

  -- Root cause analysis
  root_cause_analysis TEXT,
  corrective_actions TEXT,
  corrective_actions_completed BOOLEAN DEFAULT FALSE,
  corrective_actions_completed_date TIMESTAMP,

  -- Witness information
  witness_names TEXT[],
  witness_statements TEXT,

  -- Investigation
  investigation_completed BOOLEAN DEFAULT FALSE,
  investigation_date TIMESTAMP,
  investigation_findings TEXT,
  investigator_name VARCHAR(255),

  -- Regulatory reporting
  mol_reported BOOLEAN DEFAULT FALSE,
  -- Ministry of Labour notified
  mol_report_date TIMESTAMP,
  mol_report_number VARCHAR(50),

  -- Documentation
  incident_photos_path VARCHAR(512)[],
  incident_report_path VARCHAR(512),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_admin_id UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_safety_records_project_id ON safety_records(project_id);
CREATE INDEX idx_safety_records_incident_date ON safety_records(incident_date);
CREATE INDEX idx_safety_records_severity_level ON safety_records(severity_level);
```

**Incident Reporting Workflow:**

```
1. Incident Discovery
   - Employee reports incident to supervisor
   - Entry in KrewPact safety module
   - Automatic notification to Safety Officer

2. Initial Assessment (within 24 hours)
   - Safety Officer reviews incident details
   - Severity classification assigned
   - Decision: WSIB claim required?
   - Decision: MOL notification required?

3. WSIB Claim Filing (within 3-4 days)
   - If claim required: File with WSIB
   - Track claim number and status
   - Attach medical documentation

4. Ministry of Labour Notification (within timeframe)
   - Critical/fatality: Immediate notification
   - Serious injury: Within 4 days
   - Document notification in system

5. Investigation (within 7-14 days)
   - Root cause analysis completed
   - Corrective actions identified
   - Witness statements collected
   - Investigation report filed

6. Follow-up and Closure
   - Corrective actions tracked to completion
   - WSIB claim status monitored
   - Incident used for training/prevention
   - Record maintained per legal retention
```

**Digital Posting Requirements:**

OHSA requires posting of safety notices at workplace:

```sql
CREATE TABLE safety_postings (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  posting_type VARCHAR(100) NOT NULL,
  -- 'wsib_poster', 'health_and_safety_policy', 'incident_notice'

  content TEXT NOT NULL,
  -- Content to be posted

  posting_required_date DATE NOT NULL,
  -- When posting must be visible

  posted_at_site BOOLEAN DEFAULT FALSE,
  posted_at_site_date TIMESTAMP,

  posted_online BOOLEAN DEFAULT FALSE,
  posted_online_url VARCHAR(512),
  posted_online_date TIMESTAMP,

  languages VARCHAR(50)[],
  -- e.g., ['English', 'French']

  compliance_verified BOOLEAN DEFAULT FALSE,
  verified_by_admin_id UUID REFERENCES users(id),
  verified_date TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Record Retention for Safety Documents:**

| Record Type | Retention Period | Legal Basis | Storage Location |
|---|---|---|---|
| Incident Reports | 7 years minimum | OHSA Section 34 | Supabase + Archive |
| WSIB Claims | Indefinite | Claim history | ERPNext + Archive |
| Safety Inspections | 3-5 years | OHSA Section 34 | Supabase + Archive |
| Health & Safety Certificates | Duration of employment + 3 years | OHSA recordkeeping | Supabase + Archive |
| COR Audit Records | 5 years | COR certification | Supabase + Archive |
| Accident Investigation Reports | 7 years minimum | OHSA Section 34 | Supabase + Archive |

**COR Certification Support:**

KrewPact tracks COR (Certificate of Recognition) certification requirements and readiness:

```sql
CREATE TABLE cor_certification_tracking (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Certification details
  certification_body VARCHAR(100),
  -- e.g., 'Ontario COR', 'WSIB COR'

  current_certification_level VARCHAR(50),
  -- 'certified', 'pending', 'expired', 'revoked'

  certification_date DATE,
  certification_expiry_date DATE,

  -- Audit readiness
  last_audit_date DATE,
  last_audit_findings TEXT,

  -- Documentation completeness
  safety_policy_completed BOOLEAN,
  worker_training_documented BOOLEAN,
  incident_investigation_completed BOOLEAN,
  audit_trail_maintained BOOLEAN,

  -- Audit schedule
  next_audit_scheduled_date DATE,
  auditor_name VARCHAR(255),

  -- Current status
  readiness_score INT,
  -- 0-100 scale

  readiness_notes TEXT,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.3 Electronic Signature Compliance

**PIPEDA Part 2 Compliance:**

PIPEDA allows electronic consent and communications if:
- Consent for electronic communication obtained in writing (electronic or paper)
- Capability to withdraw consent and request paper format
- Electronic documents provide same information as paper equivalent

```sql
CREATE TABLE electronic_document_consents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  document_type VARCHAR(100) NOT NULL,
  -- 'contract', 'agreement', 'disclosure', 'consent_form'

  consent_given_date TIMESTAMP NOT NULL,
  consent_method VARCHAR(50),
  -- 'electronic_signature', 'checkbox', 'email_confirmation'

  consent_ip_address INET,
  consent_user_agent TEXT,

  -- Ability to withdraw and request paper
  can_withdraw BOOLEAN DEFAULT TRUE,
  can_request_paper BOOLEAN DEFAULT TRUE,
  paper_request_method VARCHAR(255),
  -- Instructions for requesting paper copy

  withdrawal_method VARCHAR(255),
  -- How to withdraw consent

  status VARCHAR(20) DEFAULT 'active',
  -- 'active', 'withdrawn'

  withdrawn_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Ontario Electronic Commerce Act Compliance:**

```sql
CREATE TABLE signed_documents (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id),

  -- Signatory information
  signatory_email VARCHAR(255) NOT NULL,
  signatory_name VARCHAR(255) NOT NULL,

  -- Signature details (via BoldSign)
  signature_timestamp TIMESTAMP NOT NULL,
  signature_method VARCHAR(50),
  -- 'digital_signature', 'electronic_signature'

  bold_sign_transaction_id VARCHAR(255) UNIQUE,
  -- Reference to BoldSign for audit trail

  bold_sign_signature_id VARCHAR(255),
  -- BoldSign's unique signature identifier

  signature_certificate_path VARCHAR(512),
  -- Path to X.509 certificate (if available)

  -- Audit trail
  ip_address INET,
  user_agent TEXT,
  timezone VARCHAR(50),

  -- Signatory consent
  signatory_consented_to_esignature BOOLEAN DEFAULT TRUE,
  signatory_consent_timestamp TIMESTAMP,

  -- Legal validity
  legally_binding BOOLEAN DEFAULT TRUE,
  binding_jurisdiction VARCHAR(100),
  -- e.g., 'Ontario', 'Canada'

  authentication_level VARCHAR(50),
  -- 'basic', 'enhanced', 'qualified'

  -- Document integrity
  document_hash VARCHAR(256),
  -- SHA-256 hash for integrity verification

  integrity_verified BOOLEAN DEFAULT TRUE,
  integrity_verified_timestamp TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Signature Validity Requirements:**

```sql
CREATE TABLE signature_validation_rules (
  id UUID PRIMARY KEY,
  jurisdiction VARCHAR(100) NOT NULL,
  -- 'Ontario', 'Canada', 'Quebec', etc.

  -- Validity requirements
  requires_authentication BOOLEAN DEFAULT TRUE,
  requires_intent_captured BOOLEAN DEFAULT TRUE,
  requires_consent_recorded BOOLEAN DEFAULT TRUE,
  requires_timestamp BOOLEAN DEFAULT TRUE,
  requires_signer_identity_verification BOOLEAN DEFAULT TRUE,

  signer_authentication_method VARCHAR(100),
  -- 'email', 'phone', 'biometric', 'digital_certificate'

  signature_timestamp_tolerance_minutes INT,
  -- Allow ±N minutes for timestamp accuracy

  document_integrity_verification VARCHAR(100),
  -- 'hash_verification', 'blockchain', 'timestamp_authority'

  dispute_resolution_capability BOOLEAN DEFAULT TRUE,
  -- Can we prove signature legitimacy in dispute

  retention_requirement_years INT,
  -- How long signature must be retained

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Audit Trail for Signed Documents:**

```sql
CREATE TABLE signature_audit_trail (
  id UUID PRIMARY KEY,
  signed_document_id UUID NOT NULL REFERENCES signed_documents(id),

  event_type VARCHAR(50) NOT NULL,
  -- 'sent_for_signature', 'viewed', 'signed', 'rejected', 'completed'

  event_timestamp TIMESTAMP NOT NULL,

  signer_ip_address INET,
  signer_user_agent TEXT,
  signer_location VARCHAR(255),
  -- Approximate location based on IP

  event_details TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Query complete audit trail
SELECT event_type, event_timestamp, signer_location, event_details
FROM signature_audit_trail
WHERE signed_document_id = 'doc_xxx'
ORDER BY event_timestamp ASC;
```

**Long-Term Signature Preservation:**

Signed documents must remain verifiable for 7+ years:

```
Strategy 1: Long-Term Validation (LTV)
  - Include complete certificate chain in PDF
  - Include OCSP responses (proof certificate was valid at signing time)
  - Include CRL (Certificate Revocation List) at signing time
  - Result: Signature remains verifiable even if certificate expires

Strategy 2: Document Timestamping
  - Get RFC 3161 timestamp from trusted authority
  - Timestamp proves document existed at specific time
  - Timestamp can be re-timestamped if authority goes offline

Strategy 3: Blockchain Anchoring (Optional)
  - Store document hash on blockchain (Bitcoin, Ethereum)
  - Provides cryptographic proof of document existence
  - Available for 7+ years (blockchain immutable)

Implementation:
  1. BoldSign generates standard PKCS#7 signature
  2. Extract signature validation tokens from BoldSign
  3. Generate RFC 3161 timestamp from Sectigo/GlobalSign
  4. Embed in PDF/storage for long-term validation
  5. Archive on AWS Glacier with encryption
  6. Quarterly: Test signature verification on archived documents

---

## 6. ACCESSIBILITY (AODA/WCAG)

### 6.1 WCAG 2.0 Level AA Requirements

KrewPact is designed and tested to meet WCAG 2.0 Level AA (Web Content Accessibility Guidelines), ensuring accessibility for users with disabilities.

**Perceivable:**

1. **Text Alternatives (1.1)**
   - All images have descriptive alt text
   - Decorative images: alt="" (empty)
   - Functional images: Describe function/purpose
   - Example: `<img alt="Project status: 85% complete" src="progress-bar.png">`
   - Charts/graphs: Data table alternative provided

2. **Time-Based Media (1.2)**
   - Video: Captions provided (burned-in or selectable)
   - Video: Audio description track available
   - Audio-only: Transcript provided
   - Live streams: Real-time captions (CART or automated)

3. **Adaptable Content (1.3)**
   - Page structure meaningful without CSS
   - Proper heading hierarchy (H1, H2, H3, etc.)
   - Form labels properly associated with inputs
   - Instructions don't rely on sensory characteristics only

4. **Distinguishable (1.4)**
   - Color contrast minimum 4.5:1 for normal text
   - Color contrast minimum 3:1 for large text (18pt+)
   - No information conveyed by color alone
   - Resize text up to 200% without loss of functionality
   - No auto-playing audio

**Operable:**

1. **Keyboard Accessible (2.1)**
   - All functionality available via keyboard
   - Tab order logical and intuitive
   - No keyboard traps
   - Keyboard shortcuts documented
   - Focus indicator always visible

2. **Enough Time (2.2)**
   - No time limits on interactions
   - User can extend or adjust time limits
   - Moving content can be paused/stopped
   - Auto-refreshing content can be disabled

3. **Seizures (2.3)**
   - No content flashes more than 3 times per second
   - Animations can be disabled (prefer-reduced-motion)

4. **Navigable (2.4)**
   - Page has meaningful title
   - Link purpose clear from link text
   - Focus visible at all times
   - Multiple ways to find pages (search, sitemap, navigation)
   - Consistent navigation across site

**Understandable:**

1. **Readable (3.1)**
   - Page language specified in HTML: `<html lang="en-CA">`
   - Parts in other languages marked: `<span lang="fr">Bonjour</span>`
   - Abbreviations/acronyms defined on first use or via title

2. **Predictable (3.2)**
   - Navigation consistent across pages
   - Components function consistently
   - No unexpected context changes
   - Links open in same window (unless clearly indicated)

3. **Input Assistance (3.3)**
   - Error messages identify problem specifically
   - Error messages suggest correction
   - Required fields clearly marked
   - Form validation occurs before submission when possible

**Robust:**

1. **Compatible (4.1)**
   - Valid HTML/CSS (W3C validator)
   - Semantic HTML elements used correctly
   - ARIA attributes valid and necessary
   - Focus management handled programmatically

### 6.2 Implementation Standards

**Color Contrast Ratios:**

```css
/* Normal text (< 18pt): 4.5:1 minimum */
body {
  color: #333333; /* #333 on white = 12.63:1 ✓ */
  background-color: #ffffff;
}

/* Large text (18pt+): 3:1 minimum */
h1 {
  color: #666666; /* #666 on white = 5.92:1 ✓ */
  font-size: 24px;
}

/* UI components and graphical elements: 3:1 */
button {
  background-color: #0066cc; /* #0066cc on white = 8.59:1 ✓ */
  color: #ffffff;
  border: 2px solid #0055aa;
}

/* Disabled state still requires 3:1 */
button:disabled {
  background-color: #cccccc;
  color: #808080; /* #808080 on #cccccc = 3.11:1 ✓ */
}
```

**Focus Management:**

```javascript
// Visible focus indicator on all interactive elements
// CSS (in main stylesheet)
:focus {
  outline: 3px solid #4A90E2; /* Blue outline */
  outline-offset: 2px; /* Space between element and outline */
}

button:focus,
a:focus,
input:focus,
[role="button"]:focus {
  outline: 3px solid #4A90E2;
  outline-offset: 2px;
}

/* Remove default outline only if custom outline provided */
:focus-visible {
  outline: 3px solid #4A90E2;
  outline-offset: 2px;
}

// JavaScript: Manage focus in modals, dropdowns
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('role', 'dialog');

  // Store previously focused element
  const previouslyFocused = document.activeElement;

  // Move focus to modal (first focusable element)
  const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  firstFocusable.focus();

  // Trap focus within modal
  const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });

  // Return focus when modal closes
  modal.addEventListener('closeModal', () => {
    previouslyFocused.focus();
  });
}
```

**ARIA Attributes:**

```html
<!-- Semantic HTML first, ARIA only when needed -->

<!-- Bad: Div as button without ARIA -->
<div onclick="submitForm()">Submit</div>

<!-- Good: Use semantic button element -->
<button type="submit">Submit</button>

<!-- OK: If button styling required, use ARIA -->
<div role="button" tabindex="0" onclick="submitForm()">Submit</div>

<!-- Navigation landmarks -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/projects">Projects</a></li>
    <li><a href="/employees">Employees</a></li>
  </ul>
</nav>

<!-- Form region -->
<form aria-labelledby="form-title">
  <h2 id="form-title">Create New Project</h2>
  <!-- form fields -->
</form>

<!-- Alert/status region -->
<div role="alert" aria-live="polite">
  <strong>Success!</strong> Project created successfully.
</div>

<!-- Expandable section (accordion) -->
<button
  aria-expanded="false"
  aria-controls="section-content"
  onclick="toggleSection(this)"
>
  Project Details ▼
</button>
<div id="section-content" hidden>
  <!-- Content -->
</div>

<!-- Loading spinner -->
<div role="status" aria-live="polite" aria-busy="true">
  <span class="sr-only">Loading project data...</span>
</div>
```

**Keyboard Navigation:**

```javascript
// Tab order should be logical, typically left-to-right, top-to-bottom
// Set tabindex="0" only for custom interactive elements
// Never use positive tabindex values (breaks logical order)

// Implement keyboard shortcuts
document.addEventListener('keydown', (event) => {
  // Alt+S = Submit (document submitted forms)
  if (event.altKey && event.key === 's') {
    const form = document.querySelector('form[name="primary"]');
    if (form) form.submit();
  }

  // Escape = Close modal/popup
  if (event.key === 'Escape') {
    const modal = document.querySelector('[role="dialog"][open]');
    if (modal) modal.close();
  }

  // Arrow keys = Navigate list items
  if (event.key === 'ArrowDown' && document.activeElement.getAttribute('role') === 'option') {
    const nextOption = document.activeElement.nextElementSibling;
    if (nextOption) nextOption.focus();
  }
});

// Document keyboard shortcuts
const keyboardShortcuts = {
  'Alt+S': 'Submit form',
  'Escape': 'Close dialog',
  'Arrow Up/Down': 'Navigate list',
  'Enter': 'Activate button',
  'Space': 'Toggle checkbox'
};
```

**Screen Reader Compatibility:**

```html
<!-- Skip to main content link (visible on focus) -->
<style>
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: white;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  }
  .skip-link:focus {
    top: 0;
  }
</style>

<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Heading structure for screen readers -->
<h1>Dashboard</h1>
<!-- Main content heading -->

<h2>Projects</h2>
<!-- Section heading -->

<h3>Active Projects</h3>
<!-- Subsection heading -->

<table>
  <thead>
    <tr>
      <th scope="col">Project Name</th>
      <th scope="col">Status</th>
      <th scope="col">Budget</th>
    </tr>
  </thead>
  <tbody>
    <!-- scope="col" indicates header applies to column -->
  </tbody>
</table>

<!-- Form labels for screen readers -->
<label for="project-name">Project Name *</label>
<input
  id="project-name"
  type="text"
  required
  aria-required="true"
  aria-describedby="project-name-hint"
/>
<small id="project-name-hint">Required. Project name as it appears in contracts.</small>

<!-- Help text associated with input -->
<label for="email">Email</label>
<input
  id="email"
  type="email"
  aria-describedby="email-help"
/>
<span id="email-help">We'll send you project updates at this email.</span>
```

**Form Labeling Standards:**

```html
<!-- Good: Label associated with input -->
<label for="project_id">Project *</label>
<select id="project_id" name="project_id" required>
  <option value="">-- Select Project --</option>
  <option value="proj_123">Office Tower</option>
</select>

<!-- Bad: Placeholder as label (doesn't persist) -->
<input type="text" placeholder="Project Name"> <!-- ✗ -->

<!-- Good: Required indicator accessible -->
<label for="division_id">Division <span aria-label="required">*</span></label>
<select id="division_id" required aria-required="true">
  <!-- options -->
</select>

<!-- Good: Error messages associated with input -->
<label for="budget">Budget</label>
<input
  id="budget"
  type="number"
  aria-describedby="budget-error"
  aria-invalid="true"
/>
<span id="budget-error" role="alert">Budget must be greater than zero.</span>

<!-- Good: Optional indicator -->
<label for="notes">Notes <span aria-label="optional">(optional)</span></label>
<textarea id="notes"></textarea>
```

**Error Messaging Standards:**

```
Principles:
  1. Identify the problem specifically (not "Error")
  2. Suggest a solution if possible
  3. Use non-color indicators (icon + text)
  4. Ensure sufficient contrast

Examples:
  ✓ "Email address is invalid. Enter a valid email (e.g., user@example.com)"
  ✓ "Budget cannot be empty. Enter a dollar amount."
  ✗ "Invalid input"
  ✗ "Error" (too vague)
```

**Responsive Design Requirements:**

```css
/* Support zoom up to 200% without horizontal scrolling */
@media (min-width: 320px) {
  /* Mobile first approach */
}

@media (min-width: 768px) {
  /* Tablet layout */
}

@media (min-width: 1024px) {
  /* Desktop layout */
}

/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1e1e1e;
    color: #e0e0e0;
  }
  /* Maintain 4.5:1 contrast in dark mode */
}
```

### 6.3 Testing and Compliance

**Automated Testing Tools:**

```javascript
// axe-core integration (headless browser testing)
const { AxeBuilder } = require('@axe-core/playwright');

async function testAccessibility(page) {
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  const violations = accessibilityScanResults.violations;
  if (violations.length > 0) {
    console.error('Accessibility violations found:');
    violations.forEach(violation => {
      console.error(`- ${violation.id}: ${violation.description}`);
      violation.nodes.forEach(node => {
        console.error(`  Element: ${node.html}`);
      });
    });
    return false; // CI/CD failure
  }
  return true; // Pass
}

// Run on every deployment
if (process.env.NODE_ENV === 'production') {
  await testAccessibility(page);
}
```

```javascript
// Lighthouse CI integration
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["https://app.krewpact.io"],
      "numberOfRuns": 3,
      "settings": {
        "configPath": "./lighthouse-config.js"
      }
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "accessibility": ["error", { "minScore": 0.90 }]
      }
    }
  }
}
```

**Manual Testing Procedures:**

```
Keyboard Testing:
  1. Navigate entire page using Tab key only
  2. Verify all interactive elements reachable
  3. Verify focus order logical
  4. Verify focus indicator visible
  5. Verify Escape key closes modals
  6. Verify Enter key activates buttons

Screen Reader Testing (NVDA, JAWS, VoiceOver):
  1. Navigate page structure via headings
  2. Read all form labels and error messages
  3. Verify alt text for images appropriate
  4. Verify table headers associated correctly
  5. Verify expandable sections announced
  6. Verify status messages announced

Color Contrast Testing:
  1. Use color contrast analyzer tool
  2. Check all text against background
  3. Check focus indicators have 3:1 contrast
  4. Check disabled state has 3:1 contrast
  5. Verify no information conveyed by color alone

Zoom Testing:
  1. Set browser zoom to 200%
  2. Verify no horizontal scrolling required
  3. Verify text remains readable
  4. Verify layout doesn't break

Motion Testing:
  1. Enable prefers-reduced-motion in OS
  2. Verify animations disabled/minimized
  3. Verify no flashing content
  4. Verify parallax/scrolling effects reduced
```

**Assistive Technology Testing Matrix:**

| Technology | Browser | OS | WCAG Coverage | Test Frequency |
|---|---|---|---|---|
| **NVDA** | Firefox | Windows | Headings, links, forms, tables | Weekly (automated) |
| **JAWS** | Chrome | Windows | Screen reader features | Monthly |
| **VoiceOver** | Safari | macOS | Native screen reader | Monthly |
| **VoiceOver** | Safari | iOS | Mobile accessibility | Quarterly |
| **TalkBack** | Chrome | Android | Mobile accessibility | Quarterly |
| **Zoom for Mac** | Safari | macOS | Magnification, gestures | Quarterly |

**Compliance Reporting Schedule:**

- Monthly: Automated testing results (axe-core, Lighthouse)
- Quarterly: Manual testing of key user flows
- Semi-annually: Full accessibility audit by external firm
- Annually: AODA compliance certification

---

## 7. APPLICATION SECURITY

### 7.1 OWASP Top 10 Mitigations (2021)

**1. Broken Access Control**

Access control failures allow unauthorized data access. KrewPact mitigations:

```
Implementation:
- RBAC with role-based permissions (Resource:Action@Scope model)
- Row-Level Security (RLS) in PostgreSQL database
- API endpoint authorization checks before data access
- Column-level masking for sensitive data
- Audit logging of all data access

Code Example:
```javascript
// Middleware: Verify user has permission before returning data
async function projectRouter(req, res) {
  const projectId = req.params.projectId;
  const userId = req.user.id;

  // Check 1: User has permission to read this project
  const hasAccess = await checkUserPermission(userId, 'project:read', projectId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check 2: Verify RLS will filter data (defense-in-depth)
  const projects = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    // RLS policy automatically filters based on user's division/project access
    .single();

  if (!projects) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json(projects);
}
```

**2. Cryptographic Failures**

Sensitive data must be encrypted in transit and at rest.

```
Implementation:
- TLS 1.3 for all connections (no HTTP)
- AES-256 encryption at rest (Supabase, ERPNext, S3)
- Field-level encryption for PII
- Secure key management (not hardcoded, rotated regularly)
- HSTS headers enforcing HTTPS

Code Example:
```javascript
// Encryption configuration
const tlsConfig = {
  minVersion: 'TLSv1.3',
  ciphers: 'TLS_AES_256_GCM_SHA384',
  honorCipherOrder: true,
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload'
};

// Encrypt sensitive field
async function encryptSIN(sinNumber) {
  const masterKey = await getEncryptionKey('employee_pii');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  let encrypted = cipher.update(sinNumber, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// HTTPS enforcement
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

**3. Injection**

SQL injection, NoSQL injection, command injection prevented through parameterized queries.

```
Implementation:
- Use parameterized queries (Supabase client prevents injection)
- Input validation with Zod schemas
- Prepared statements
- ORM usage (not string concatenation)
- No dynamic SQL construction

Code Example:
```javascript
// BAD: Vulnerable to SQL injection
const query = `SELECT * FROM users WHERE email = '${email}'`;
// If email = "' OR '1'='1", returns all users!

// GOOD: Parameterized query (safe)
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', email);  // Parameter safely escaped

// Input validation before query
import { z } from 'zod';

const SearchSchema = z.object({
  projectName: z.string().min(1).max(255).regex(/^[a-zA-Z0-9\s\-]+$/)
  // Only alphanumeric, spaces, hyphens
});

const search = await SearchSchema.parseAsync(req.query);
// If invalid: throws error (never reaches database)
```

**4. Insecure Design**

Design secure requirements before building.

```
Implementation:
- Privacy by Design principles (data minimization, purpose limitation)
- Security requirements in project planning
- Threat modeling for features handling sensitive data
- Secure defaults (deny access unless explicitly granted)
- Design reviews before implementation

Threat Model Example:
```
Feature: Employee SIN Storage and Display

Threat 1: SIN display on screen
  - Risk: Shoulder surfing, unattended screen
  - Mitigation: Mask SIN except last 4 digits in UI
  - Mitigation: Require re-authentication to view full SIN

Threat 2: SIN export to CSV
  - Risk: CSV shared insecurely
  - Mitigation: Encrypt CSV before download
  - Mitigation: Audit log records all exports with who/when

Threat 3: SIN in logs
  - Risk: Logs exposed in error messages
  - Mitigation: Never log full SIN (use last 4 only)
  - Mitigation: Redact from error messages sent to client
```

**5. Security Misconfiguration**

Misconfigured security settings are common vulnerability source.

```
Implementation:
- Use security configuration as code (Infrastructure as Code)
- Automated configuration auditing
- No default credentials (change defaults immediately)
- Minimal attack surface (disable unused services)
- Security headers on all responses
- Regular security configuration review

Code Example:
```javascript
// Security headers middleware
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection (older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' trusted-cdn.com; img-src 'self' data: https:;"
  );

  // HSTS (force HTTPS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Disable caching for sensitive pages
  if (req.path.includes('/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }

  next();
});

// Verify no default credentials remain
const checkDefaultCredentials = async () => {
  const adminUser = await db.users.findOne({ email: 'admin@krewpact.io' });
  if (adminUser && adminUser.password === 'admin123') {
    throw new Error('ERROR: Default admin credentials still set!');
  }
};
```

**6. Vulnerable and Outdated Components**

Dependencies must be kept updated.

```
Implementation:
- Regular dependency updates (npm audit)
- Automated vulnerability scanning (Snyk, GitHub Dependabot)
- Remove unused dependencies
- Monitor security advisories
- Test updates before deploying

Package Management:
```bash
# Check for vulnerabilities
npm audit

# Update dependencies safely
npm update
npm outdated  # See what can be updated

# Automated scanning in CI/CD
- Use Snyk (scans dependencies on commit)
- GitHub Dependabot (automated PRs for updates)
- npm audit in pre-commit hook
```

**7. Authentication & Session Management Failures**

Weak authentication bypassed.

```
Implementation:
- Use Clerk (OAuth 2.0 compliant)
- MFA mandatory for sensitive accounts
- Session timeout (30 minutes idle)
- Token rotation (refresh token strategy)
- Account lockout after failed attempts
- Secure password reset flow

Code Example:
```javascript
// Session management
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

app.use(async (req, res, next) => {
  const sessionCookie = req.cookies['__session'];

  if (sessionCookie) {
    const session = await verifySessionToken(sessionCookie);

    // Check session age
    if (Date.now() - session.createdAt > SESSION_TIMEOUT_MS) {
      res.clearCookie('__session');
      return res.status(401).json({ error: 'Session expired' });
    }

    // Verify token still valid in Clerk
    const user = await clerk.users.getUser(session.userId);
    if (!user) {
      res.clearCookie('__session');
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
  }

  next();
});

// Account lockout after failed attempts
const loginAttempts = new Map(); // In production: Redis

async function recordFailedAttempt(email) {
  const attempts = (loginAttempts.get(email) || 0) + 1;
  loginAttempts.set(email, attempts);

  if (attempts >= 5) {
    // Lock account for 15 minutes
    setTimeout(() => loginAttempts.delete(email), 15 * 60 * 1000);
    return res.status(429).json({ error: 'Account locked. Try again in 15 minutes.' });
  }
}
```

**8. Software and Data Integrity Failures**

Updates and deployments must be secure.

```
Implementation:
- Code signing (Git commit signing)
- Artifact signing (Docker image signatures)
- Secure CI/CD pipeline (GitHub Actions, protected branches)
- Dependency verification (lock files, checksums)
- No auto-update (manual verification before deploying)

Code Example:
```javascript
// Verify artifact integrity before deployment
const crypto = require('crypto');

async function verifyArtifactSignature(artifactPath, signaturePath) {
  const artifact = fs.readFileSync(artifactPath);
  const signature = fs.readFileSync(signaturePath, 'utf8');

  const publicKey = fs.readFileSync('./keys/public.pem');
  const verify = crypto.createVerify('SHA256');
  verify.update(artifact);

  if (!verify.verify(publicKey, signature, 'base64')) {
    throw new Error('Artifact signature verification failed!');
  }
}

// Call before deployment
await verifyArtifactSignature('/app/docker-image.tar', '/app/docker-image.tar.sig');
```

**9. Logging & Monitoring Failures**

Lack of logging prevents incident detection.

```
Implementation:
- Log all authentication events
- Log all data access (RLS prevents unauthorized access)
- Log all administrative actions
- Centralized log aggregation
- Real-time alerting on suspicious patterns
- Audit logs immutable

Code Example:
```javascript
// Comprehensive logging
async function logSecurityEvent(event) {
  await supabase
    .from('audit_logs')
    .insert({
      event_type: event.type, // 'auth_success', 'auth_failure', 'data_access', 'admin_action'
      user_id: event.userId || null,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      resource: event.resource,
      action: event.action,
      status: event.status, // 'success', 'failure'
      details: event.details,
      timestamp: new Date(),
      immutable: true  // RLS prevents deletion
    });

  // Real-time alert if suspicious
  if (event.type === 'auth_failure' && event.count >= 5) {
    await sendAlert({
      severity: 'HIGH',
      message: `${event.userId} has 5+ failed login attempts from ${event.ipAddress}`,
      action_required: true
    });
  }
}
```

**10. Server-Side Request Forgery (SSRF)**

Backend makes requests to unintended locations.

```
Implementation:
- Allowlist only necessary external endpoints
- Validate redirect URLs
- Don't follow user-supplied URLs
- Disable unused protocols (gopher, file://)
- Timeout on external requests
- Verify SSL certificates

Code Example:
```javascript
// SSRF mitigation
const ALLOWED_DOMAINS = [
  'https://api.boldSign.io',
  'https://api.adp.com',
  'https://erp.mdmgroup.internal'
];

async function makeExternalRequest(url, options) {
  // Validate URL is allowlisted
  const urlObj = new URL(url);
  const isAllowed = ALLOWED_DOMAINS.some(domain => url.startsWith(domain));

  if (!isAllowed) {
    throw new Error(`URL not in allowlist: ${url}`);
  }

  // Validate not a private IP (prevents SSRF to internal systems)
  if (isPrivateIP(urlObj.hostname)) {
    throw new Error(`Cannot access private IP: ${urlObj.hostname}`);
  }

  // Set timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: 'error'  // Don't follow redirects
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}
```

### 7.2 API Security

**Rate Limiting Strategy:**

```javascript
// Rate limiting middleware using Redis
const redis = require('redis').createClient();

const RATE_LIMITS = {
  'auth:login': { points: 5, duration: 60 }, // 5 attempts per minute
  'api:general': { points: 100, duration: 60 }, // 100 requests per minute
  'api:export': { points: 10, duration: 3600 }, // 10 exports per hour
  'api:search': { points: 50, duration: 60 }, // 50 searches per minute
};

async function rateLimit(req, res, next) {
  const limitKey = `${req.ip}:${req.path}`;
  const limit = RATE_LIMITS[req.path] || RATE_LIMITS['api:general'];

  const current = await redis.incr(limitKey);

  if (current === 1) {
    await redis.expire(limitKey, limit.duration);
  }

  res.setHeader('X-RateLimit-Limit', limit.points);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit.points - current));
  res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + limit.duration);

  if (current > limit.points) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: limit.duration
    });
  }

  next();
}

app.use(rateLimit);
```

**Input Validation (Zod Schemas):**

```javascript
import { z } from 'zod';

// Define expected request schema
const CreateProjectSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().max(1000).optional(),
  division_id: z.string().uuid(),
  budget: z.number().positive(),
  start_date: z.coerce.date(),
  owner_id: z.string().uuid(),
});

// Validate request
async function createProject(req, res) {
  try {
    const data = await CreateProjectSchema.parseAsync(req.body);
    // If we reach here, data is valid and type-safe

    const project = await db.projects.create(data);
    res.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    throw error;
  }
}
```

**Output Encoding (Prevent XSS):**

```javascript
// Encode output before sending to client
function encodeHTML(str) {
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(str).replace(/[&<>"']/g, char => entities[char]);
}

// In response
res.json({
  id: project.id,
  name: encodeHTML(project.name), // Prevent XSS if name contains <script>
  description: encodeHTML(project.description),
  // ... other fields
});

// Better: Use templating engine with auto-escaping (React, Vue, etc.)
// They encode by default, so XSS is prevented automatically
```

**CORS Configuration:**

```javascript
// Configure CORS for specific origins
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://app.krewpact.io',
      'https://portal.krewpact.io',
      'https://admin.krewpact.io'
    ];

    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Number'],
  maxAge: 3600 // Preflight cache 1 hour
};

app.use(cors(corsOptions));
```

**API Key Management:**

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  -- Human-readable name for the key

  key_hash VARCHAR(256) NOT NULL,
  -- SHA-256 hash of the actual key (never store plaintext)

  permissions VARCHAR(255)[],
  -- e.g., ['project:read', 'document:read']

  last_used_at TIMESTAMP,
  last_used_ip_address INET,

  expires_at TIMESTAMP,
  -- Keys expire (e.g., 1 year)

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  -- Soft delete (revocation)

  UNIQUE(user_id, name)
);

-- API key verification in middleware
async function verifyAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const record = await db.api_keys.findOne({
    key_hash: keyHash,
    deleted_at: null,
    expires_at: { $gt: new Date() }
  });

  if (!record) {
    return res.status(401).json({ error: 'Invalid or expired API key' });
  }

  req.user = await db.users.findById(record.user_id);
  req.apiKeyPermissions = record.permissions;

  // Update last used
  await db.api_keys.update(record.id, {
    last_used_at: new Date(),
    last_used_ip_address: req.ip
  });

  next();
}
```

**Webhook Signature Verification:**

```javascript
// Verify webhooks from BoldSign, ERPNext with signature
const crypto = require('crypto');

async function verifyWebhookSignature(payload, signature, secret) {
  // HMAC-SHA256 signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  // Constant-time comparison (prevents timing attacks)
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  return isValid;
}

// Webhook handler
async function handleBoldSignWebhook(req, res) {
  const signature = req.headers['x-boldSign-signature'];
  const payload = req.body;

  const isValid = await verifyWebhookSignature(
    payload,
    signature,
    process.env.BOLD_SIGN_WEBHOOK_SECRET
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  if (payload.event === 'document.signed') {
    await handleDocumentSigned(payload);
  }

  res.json({ received: true });
}
```

### 7.3 Frontend Security

**Content Security Policy (CSP) Headers:**

```javascript
// Restrict what resources can load
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",  // Default: only same-origin
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://trusted-cdn.com",
      "style-src 'self' 'unsafe-inline' https://trusted-cdn.com",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.googleapis.com",
      "connect-src 'self' https://api.krewpact.io https://clerk.io",
      "frame-src 'none'",  // No iframes
      "object-src 'none'",  // No Flash, plugins
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"  // Upgrade HTTP to HTTPS
    ].join('; ')
  );
  next();
});
```

**XSS Prevention:**

```javascript
// 1. Use parameterized templates (React, Vue automatically escape)
// BAD: React
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// GOOD: React (auto-escapes)
<div>{userInput}</div>

// 2. Sanitize user-provided HTML
const DOMPurify = require('isomorphic-dompurify');

const sanitized = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
  ALLOWED_ATTR: ['href']
});

// 3. Content Security Policy (above) prevents inline script execution
```

**CSRF Protection:**

```javascript
// Express middleware: Generate CSRF tokens
const csrf = require('csurf');

const csrfProtection = csrf({ cookie: false });

// Return CSRF token to client
app.get('/form', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Verify CSRF token on state-changing requests
app.post('/project', csrfProtection, (req, res) => {
  // If token invalid, middleware returns 403
  // Process request
  res.json({ success: true });
});

// Client-side: Include token in all POST/PUT/DELETE requests
async function createProject(projectData) {
  const csrfToken = document.querySelector('[name="_csrf"]').value;

  const response = await fetch('/project', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify(projectData)
  });

  return response.json();
}
```

**Subresource Integrity (SRI):**

```html
<!-- Verify external scripts haven't been tampered with -->
<script
  src="https://trusted-cdn.com/library.js"
  integrity="sha384-abc123=="
  crossorigin="anonymous"
></script>

<!-- Generate hash: -->
<!-- openssl dgst -sha384 -binary library.js | openssl enc -base64 -A -->
```

**Dependency Vulnerability Scanning:**

```bash
# npm
npm audit  # One-time check
npm audit fix  # Auto-fix vulnerabilities

# GitHub Dependabot
# Automatically creates PRs for security updates
# Enable in Settings > Security & analysis

# Snyk
npm install -g snyk
snyk test  # Scan for vulnerabilities
snyk protect  # Add remediation to package.json

# In CI/CD pipeline
- name: Scan dependencies
  run: snyk test --severity-threshold=high
```

### 7.4 Database Security

**SQL Injection Prevention (Parameterized Queries):**

```javascript
// BAD: Vulnerable
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;
db.run(query);

// GOOD: Parameterized (safe)
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', req.body.email);  // Parameter safely escaped

// Even safer: Zod validation first
const EmailSchema = z.string().email();
const email = await EmailSchema.parseAsync(req.body.email);

const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', email);
```

**Connection Pooling Security:**

```javascript
// Connection pooling: Reuse connections, reduce attack surface
const pool = new PgPool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: true,  // Verify SSL certificate
    ca: fs.readFileSync('./ca-cert.pem'),
    key: fs.readFileSync('./client-key.pem'),
    cert: fs.readFileSync('./client-cert.pem')
  },
  max: 20,  // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query via pool (not direct connection)
const result = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
```

**Backup Encryption:**

```bash
# Backup with encryption
pg_dump -U postgres krewpact_db | \
  gpg --symmetric --cipher-algo AES256 --output krewpact_db_$(date +%Y%m%d).sql.gpg

# Upload encrypted backup
aws s3 cp krewpact_db_20250209.sql.gpg \
  s3://krewpact-backups-ca/postgresql/$(date +%Y/%m/%d)/ \
  --sse AES256

# Restore from backup
aws s3 cp s3://krewpact-backups-ca/postgresql/2025/02/09/krewpact_db_20250209.sql.gpg . && \
gpg --decrypt krewpact_db_20250209.sql.gpg | pg_restore -U postgres -d krewpact_db
```

**Access Logging:**

```sql
-- Enable query logging in PostgreSQL
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries > 100ms
-- Reload config
SELECT pg_reload_conf();

-- View logs
SELECT * FROM pg_logs ORDER BY timestamp DESC LIMIT 100;

-- Alert on suspicious queries
CREATE TABLE suspicious_queries (
  id SERIAL PRIMARY KEY,
  query TEXT,
  user_name VARCHAR(255),
  database VARCHAR(255),
  timestamp TIMESTAMP,
  reason VARCHAR(255)
);

-- Trigger alert if query matches suspicious pattern
-- (e.g., SELECT * with no WHERE clause on sensitive table)
```

---

## 8. INFRASTRUCTURE SECURITY

### 8.1 Network Security

**Tailscale Zero-Trust Mesh Network:**

KrewPact uses Tailscale for system-to-system communication, creating a zero-trust overlay network:

```
Architecture:
  - All backend services connect to Tailscale VPN
  - Encrypted tunnel between each service
  - No services exposed on public internet
  - Only Vercel edge functions and portals public-facing
  - All internal traffic: 100.x.x.x Tailscale IP addresses

Services on Tailscale Mesh:
  - Proxmox hypervisor: 100.64.0.1
  - ERPNext container: 100.64.0.2
  - Database replica (backup): 100.64.0.3
  - Internal CLI tools: 100.64.0.4
  - Admin workstations: 100.64.0.10-100.64.0.20

Tailscale Configuration:
```bash
# Install Tailscale on each service
curl -fsSL https://tailscale.com/install.sh | sh

# Enable subnet router for internal networks
sudo tailscale up --advertise-routes=10.0.0.0/8 --accept-routes

# Verify connectivity
tailscale status

# ACL (Access Control List): Who can access what
{
  "acls": [
    {
      "action": "accept",
      "src": ["group:backend"],
      "dst": ["group:database"]
    },
    {
      "action": "accept",
      "src": ["group:erp"],
      "dst": ["group:database", "group:file-storage"]
    },
    {
      "action": "deny",
      "src": ["*"],
      "dst": ["group:admin"]  // Admin services: only from approved IPs
    }
  ]
}
```

**VLAN Segmentation (TP-Link Omada):**

```
Network Architecture (Internal LAN):

  Internet
      |
  Firewall (pfSense)
      |
  TP-Link Omada Switch
      |
  +---+---+---+---+
  |   |   |   |   |
  V1  V2  V3  V4  V5

V1 (VLAN 10): Management
  - Omada controller
  - Switch management
  - Network monitoring

V2 (VLAN 20): Servers
  - Proxmox (KVM host)
  - Docker containers
  - ERPNext server
  - Database server

V3 (VLAN 30): Workstations
  - Employee laptops
  - Company computers
  - Devices on MDM (Mobile Device Management)

V4 (VLAN 40): Guest WiFi
  - Visitor internet access
  - Isolated from corporate network

V5 (VLAN 50): IoT/Cameras
  - Security cameras
  - Badge readers
  - Door locks

VLAN Rules (Inter-VLAN Routing):
  - V1 ↔ V2: Firewall restricted (management only)
  - V2 ↔ V2: Full connectivity (servers talk to each other)
  - V3 → V2: Limited access (workstations access specific services)
  - V3 ↔ V3: Full connectivity
  - V3 ↔ V4: No access (separate networks)
  - V3 ↔ V5: No access (IoT isolated)
  - V4 ↔ All: No access (guest isolated)
  - V5 ↔ All: No access (IoT isolated)
```

**Firewall Rules (pfSense):**

```
Inbound Rules:

  Port 443 (HTTPS)  → Vercel edge (external traffic)
  Port 80 (HTTP)    → Redirect to HTTPS
  Port 25 (SMTP)    → Block (prevent relay attacks)
  Port 22 (SSH)     → Block public-facing (Tailscale only)
  Port 3306 (MySQL) → Block public-facing
  Port 5432 (PostgreSQL) → Block public-facing

Outbound Rules:

  Allow: HTTPS (443) to all
  Allow: DNS (53) to known resolvers
  Allow: NTP (123) for time sync
  Allow: Specific APIs (Clerk, BoldSign, ADP) by FQDN
  Block: All other outbound
  Log all deny rules for audit

Special Rules:

  DDoS Protection:
    - Rate limit HTTPS: 1000 req/min per IP
    - SYN flood protection: Enabled
    - ICMP flood protection: Drop after 100/min

  GeoIP Blocking (Optional):
    - Block traffic from high-risk countries
    - Allow only Canada + key partner countries (US, EU)
```

### 8.2 Server Hardening

**Proxmox Host Security:**

```bash
# Initial Proxmox hardening
# 1. Update system
apt update && apt upgrade -y

# 2. Disable root SSH login
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# 3. Generate SSH key for admin user (password auth disabled)
ssh-copy-id -i ~/.ssh/id_rsa.pub user@proxmox.local
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# 4. Configure firewall
ufw enable
ufw default deny incoming
ufw default allow outgoing
ufw allow from 100.64.0.0/10  # Tailscale
ufw allow 8006/tcp  # Proxmox web console (local only)

# 5. Disable unnecessary services
systemctl disable bluetooth
systemctl disable cups

# 6. File integrity monitoring
apt install aide
aideinit
aide --check

# 7. System audit logging
apt install auditd
systemctl enable auditd
systemctl start auditd

# Monitor commands executed as root
auditctl -w /sbin/insmod -p x -k modules
auditctl -w /sbin/rmmod -p x -k modules
auditctl -w /etc/sudoers -p wa -k sudoers
```

**Container Isolation (Docker):**

```yaml
# docker-compose.yml with security hardening

version: '3.9'
services:
  erp:
    image: frappe/erpnext:latest
    container_name: erp_production

    # Security options
    security_opt:
      - no-new-privileges:true
      - cap_drop=ALL
      - cap_add=NET_BIND_SERVICE

    # Read-only filesystem (except specific dirs)
    read_only: true
    tmpfs:
      - /tmp
      - /run
      - /var/run

    # Non-root user
    user: "1000:1000"

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

    # Network isolation
    networks:
      - backend

    # Healthcheck
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    volumes:
      - erp_data:/home/frappe/frappe-bench/sites:rw
      - erp_logs:/var/log/frappe:rw

  postgresql:
    image: postgres:15-alpine
    container_name: postgres_production

    security_opt:
      - no-new-privileges:true

    environment:
      POSTGRES_USER: krewpact_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # From .env

    volumes:
      - postgres_data:/var/lib/postgresql/data

    user: "999:999"
    read_only: true
    tmpfs:
      - /tmp
      - /var/run/postgresql

volumes:
  erp_data:
    driver: local
  erp_logs:
    driver: local
  postgres_data:
    driver: local

networks:
  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

**OS Hardening (Debian/Ubuntu):**

```bash
# System security baseline

# 1. Kernel hardening
echo "kernel.kptr_restrict = 2" >> /etc/sysctl.conf
echo "kernel.dmesg_restrict = 1" >> /etc/sysctl.conf
echo "kernel.printk = 3 3 3 3" >> /etc/sysctl.conf
echo "net.ipv4.ip_forward = 0" >> /etc/sysctl.conf
echo "net.ipv4.conf.all.send_redirects = 0" >> /etc/sysctl.conf
echo "net.ipv4.conf.all.accept_redirects = 0" >> /etc/sysctl.conf
sysctl -p

# 2. Restrict file permissions
chmod 600 /etc/ssh/sshd_config
chmod 640 /etc/shadow
chmod 644 /etc/passwd

# 3. Remove unnecessary packages
apt remove xserver-xorg* bluetooth avahi-daemon cups

# 4. Enable automatic security updates
apt install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# 5. Configure SELinux or AppArmor
apt install apparmor apparmor-utils
systemctl enable apparmor
systemctl start apparmor

# 6. Disable core dumps (prevents information leakage)
echo "* hard core 0" >> /etc/security/limits.conf

# 7. Set session timeout for interactive users
echo "export TMOUT=900" >> /etc/profile  # 15 minutes

# 8. Monitor for rootkits
apt install rkhunter chkrootkit
rkhunter --update
rkhunter --check --skip-keypress
```

**SSH Key Management:**

```bash
# Generate SSH keypair for service accounts
ssh-keygen -t ed25519 -f /root/.ssh/krewpact_key -N ""
# Ed25519: More secure, compact signatures than RSA

# SSH config for key rotation
# /etc/ssh/sshd_config
HostKey /etc/ssh/ssh_host_ed25519_key          # Ed25519 (primary)
HostKey /etc/ssh/ssh_host_rsa_key              # RSA (fallback, 4096-bit)

# Restrict key algorithms
PubkeyAcceptedAlgorithms ssh-ed25519,rsa-sha2-512,rsa-sha2-256

# SSH agent for automatic key rotation
ssh-agent bash
ssh-add ~/.ssh/krewpact_key

# Key rotation schedule: Quarterly (90 days)
# Process:
#  1. Generate new keypair
#  2. Add to authorized_keys
#  3. Test new key authentication
#  4. Remove old key (grace period: 30 days)
#  5. Document in changelog
```

**Automatic Security Updates:**

```bash
# Configure unattended-upgrades
cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::InstallOnShutdown "false";
Unattended-Upgrade::Mail "sysadmin@mdmgroup.com";
Unattended-Upgrade::MailOnlyOnError "true";
EOF

# Enable automatic updates
echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";' > /etc/apt/apt.conf.d/20auto-upgrades

# Verify automatic updates
apt-get autoremove -y
systemctl restart apt-daily.service
```

### 8.3 Secret Management

**Environment Variable Handling:**

```bash
# .env.example (commit to git, no secrets)
DATABASE_URL=postgresql://user:password@host/db
CLERK_API_KEY=<set in deployment>
SUPABASE_SERVICE_ROLE_KEY=<set in deployment>
BOLD_SIGN_API_KEY=<set in deployment>
ADP_CLIENT_ID=<set in deployment>
ADP_CLIENT_SECRET=<set in deployment>

# .env.local (local development only, .gitignore)
DATABASE_URL=postgresql://local_user:local_pass@localhost/krewpact_dev
CLERK_API_KEY=actual_test_key
...

# Production: Use environment management system
# - Vercel: Secrets in project settings
# - Proxmox/Docker: Use Docker secrets or vault
# - GitHub Actions: Use repository secrets
```

**Vault/Secret Manager (HashiCorp Vault):**

```hcl
# Vault configuration
backend "file" {
  path = "/mnt/vault/data"
}

listener "tcp" {
  address = "127.0.0.1:8200"
  tls_cert_file = "/etc/vault/tls/vault.crt"
  tls_key_file = "/etc/vault/tls/vault.key"
}

# KV secrets engine
vault secrets enable -version=2 kv

# Store secrets
vault kv put kv/krewpact/database \
  user=postgres \
  password=$(openssl rand -base64 24) \
  host=db.internal \
  port=5432

# Retrieve secrets in application
const secret = await vaultClient.read('kv/data/krewpact/database');
const dbConfig = {
  user: secret.data.data.user,
  password: secret.data.data.password,
  host: secret.data.data.host,
  port: secret.data.data.port
};
```

**No Secrets in Code Policy:**

```bash
# Pre-commit hook: Prevent committing secrets
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Prevent committing secrets patterns
SECRETS=('password=' 'api_key=' 'secret=' 'token=' 'apiKey:' 'PRIVATE KEY')

for secret in "${SECRETS[@]}"; do
  if git diff --cached | grep -i "$secret"; then
    echo "ERROR: Possible secret found in staged changes!"
    echo "Secrets must not be committed to git."
    echo "Use environment variables or secret manager instead."
    exit 1
  fi
done

exit 0
EOF

chmod +x .git/hooks/pre-commit

# Scan existing repository for secrets
npm install -g git-secrets
git secrets --install
git secrets --scan

# Use Snyk to find secrets in code
snyk secret test
```

---

## 9. AUDIT AND LOGGING

### 9.1 Audit Trail Design

**What Gets Logged:**

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,

  -- Event metadata
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event_type VARCHAR(100) NOT NULL,
  -- 'user_created', 'document_signed', 'financial_record_updated', etc.

  -- Actor
  user_id UUID REFERENCES users(id),  -- NULL if system action
  user_email VARCHAR(255),  -- Denormalized for audit readability

  -- Resource
  resource_type VARCHAR(100) NOT NULL,
  -- 'user', 'project', 'financial_record', 'document', 'contract'
  resource_id UUID NOT NULL,
  -- ID of the resource affected

  -- Action
  action VARCHAR(50) NOT NULL,
  -- 'create', 'read', 'update', 'delete', 'sign', 'approve', 'export'

  -- Details
  changes JSONB,
  -- For updates: { field: { old_value, new_value }, ... }
  description TEXT,
  -- Human-readable description of what happened

  -- Context
  ip_address INET,
  user_agent TEXT,
  -- Request context

  -- Status
  status VARCHAR(20) DEFAULT 'success',
  -- 'success', 'failure'
  error_message TEXT,
  -- If status = failure

  -- Immutability enforcement
  immutable BOOLEAN DEFAULT TRUE,
  -- Row-level security prevents updates/deletes

  -- Data retention
  retention_until TIMESTAMP,
  -- When log can be archived/deleted

  CONSTRAINT audit_logs_immutable CHECK (
    -- This constraint would be enforced by RLS policy
    true
  )
);

-- Immutable: Only Org Admins and Compliance Officer can view
-- No user can delete their own audit logs
CREATE POLICY audit_logs_immutable ON audit_logs
  FOR DELETE
  USING (FALSE);  -- Never allow deletion (only retention expiry)

-- Index all common query patterns
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type_id ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Full-text search
CREATE INDEX idx_audit_logs_description ON audit_logs USING GIN(
  to_tsvector('english', description)
);
```

**Audit Log Examples:**

```json
{
  "id": "aud_001",
  "timestamp": "2025-02-09T14:32:00Z",
  "event_type": "user_created",
  "user_id": "admin_001",
  "user_email": "admin@mdmgroup.com",
  "resource_type": "user",
  "resource_id": "user_456",
  "action": "create",
  "description": "Created new employee: John Smith (john.smith@mdmgroup.com) in Division A",
  "changes": {
    "email": { "old_value": null, "new_value": "john.smith@mdmgroup.com" },
    "full_name": { "old_value": null, "new_value": "John Smith" },
    "role": { "old_value": null, "new_value": "project_manager" }
  },
  "status": "success"
}

{
  "id": "aud_002",
  "timestamp": "2025-02-09T15:45:00Z",
  "event_type": "document_signed",
  "user_id": "user_456",
  "user_email": "contractor@subcontractor.com",
  "resource_type": "document",
  "resource_id": "doc_123",
  "action": "sign",
  "description": "Electronically signed contract: Office Tower - Electrical Subcontract",
  "changes": {
    "status": { "old_value": "pending_signature", "new_value": "signed" },
    "signed_at": { "old_value": null, "new_value": "2025-02-09T15:45:00Z" },
    "signature_method": { "old_value": null, "new_value": "electronic_signature_boldsign" }
  },
  "status": "success",
  "ip_address": "203.0.113.45",
  "user_agent": "Mozilla/5.0..."
}

{
  "id": "aud_003",
  "timestamp": "2025-02-09T16:20:00Z",
  "event_type": "financial_record_accessed",
  "user_id": "finance_mgr_001",
  "user_email": "finance@mdmgroup.com",
  "resource_type": "financial_record",
  "resource_id": "inv_789",
  "action": "read",
  "description": "Accessed invoice INV-2025-001 (Office Tower project, $50,000)",
  "status": "success",
  "ip_address": "192.168.1.100"
}

{
  "id": "aud_004",
  "timestamp": "2025-02-09T17:15:00Z",
  "event_type": "authentication_failure",
  "user_id": null,
  "user_email": "attacker@malicious.com",
  "resource_type": "auth",
  "resource_id": "auth_session_xxx",
  "action": "login",
  "description": "Failed login attempt: Invalid credentials",
  "status": "failure",
  "error_message": "Invalid email or password",
  "ip_address": "192.0.2.50",
  "user_agent": "curl/7.64.1"
}

{
  "id": "aud_005",
  "timestamp": "2025-02-09T18:00:00Z",
  "event_type": "data_export",
  "user_id": "finance_mgr_001",
  "user_email": "finance@mdmgroup.com",
  "resource_type": "report",
  "resource_id": "report_monthly_financial",
  "action": "export",
  "description": "Exported financial report: Monthly Summary (January 2025) - CSV format",
  "changes": {
    "export_format": { "old_value": null, "new_value": "csv" },
    "export_rows": { "old_value": null, "new_value": 1500 }
  },
  "status": "success"
}
```

**Immutability Guarantees:**

```sql
-- Audit logs cannot be modified or deleted (except archival)
-- Enforcement via database constraints and RLS policies

-- 1. No UPDATE on audit_logs
CREATE POLICY audit_logs_no_update ON audit_logs
  FOR UPDATE
  USING (FALSE);  -- All updates denied

-- 2. No DELETE (user or app level)
CREATE POLICY audit_logs_no_delete ON audit_logs
  FOR DELETE
  USING (FALSE);  -- All deletes denied

-- 3. Only automated archival can remove old logs
-- (via scheduled background job with special permissions)

-- 4. Verify immutability with triggers (if using traditional databases)
CREATE OR REPLACE FUNCTION audit_logs_immutable_trigger()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Cannot modify audit logs';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable_trigger
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit_logs_immutable_trigger();
```

**Retention Period:**

```
Audit Log Retention Schedule:

  Financial Records (6 years): Retain indefinitely
    - Invoices, purchase orders, payments
    - Legal basis: CRA tax record requirements

  Employee Data (6 years): Retain 6 years after termination
    - Employment records, payroll, benefits
    - Legal basis: Ontario Employment Standards Act

  Access Logs (2 years): Retain 2 years
    - Login attempts, API calls, data access
    - Legal basis: PIPEDA accountability

  E-Signature Records (7 years): Retain 7 years
    - Document signing, signature validation
    - Legal basis: Construction Act, contract law

  WSIB/Safety Records (Indefinite): Retain indefinitely
    - Incident reports, safety inspections, claims
    - Legal basis: WSIB, Occupational Health & Safety Act

  Backup of All Logs: 7 years minimum
    - Disaster recovery and legal holds

Archival Strategy:
  1. Active logs: Supabase PostgreSQL (fast queries)
  2. 1-year+ old: Archive to AWS Glacier (cold storage, encryption)
  3. 7+ years old: Securely delete with certificate of destruction
```

### 9.2 Security Logging

**Authentication Events:**

```sql
CREATE TABLE auth_log (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  event_type VARCHAR(50) NOT NULL,
  -- 'login_success', 'login_failure', 'logout', 'mfa_verified', 'mfa_failed', 'token_refreshed'

  user_email VARCHAR(255),
  user_id UUID,  -- NULL if login failed (email only)

  ip_address INET NOT NULL,
  user_agent TEXT,
  location VARCHAR(255),  -- Approximate (via IP geolocation)

  mfa_method VARCHAR(50),  -- 'totp', 'sms', 'backup_code'

  status VARCHAR(20),  -- 'success', 'failure'
  failure_reason TEXT,  -- 'invalid_password', 'mfa_failed', 'account_locked'

  device_fingerprint VARCHAR(256),
  -- Hash of browser/device characteristics

  session_id VARCHAR(255),
  -- Clerk session token (if successful)

  anomalies_detected BOOLEAN DEFAULT FALSE,
  anomaly_details TEXT
  -- e.g., 'IP address changed significantly', 'login from new device'
);

CREATE INDEX idx_auth_log_user_id ON auth_log(user_id);
CREATE INDEX idx_auth_log_timestamp ON auth_log(timestamp DESC);
CREATE INDEX idx_auth_log_ip_address ON auth_log(ip_address);
CREATE INDEX idx_auth_log_status ON auth_log(status);

-- Alert if suspicious auth patterns detected
SELECT user_email, COUNT(*) as failed_attempts, array_agg(DISTINCT ip_address)
FROM auth_log
WHERE status = 'failure'
  AND timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY user_email
HAVING COUNT(*) >= 5;  -- 5+ failed attempts in 1 hour
```

**Authorization Failures:**

```sql
CREATE TABLE authz_log (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  user_id UUID NOT NULL REFERENCES users(id),
  user_email VARCHAR(255),

  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID NOT NULL,

  action VARCHAR(50) NOT NULL,  -- 'read', 'write', 'delete', 'export'

  required_permission VARCHAR(255),
  -- e.g., 'project:read@division_a'

  user_permissions VARCHAR(255)[],
  -- User's actual permissions (for audit)

  ip_address INET,

  denial_reason VARCHAR(255),
  -- 'insufficient_role', 'division_mismatch', 'rls_policy'

  severity VARCHAR(20),
  -- 'low' (expected), 'medium' (unusual), 'high' (suspicious)

  alert_sent BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_authz_log_user_id ON authz_log(user_id);
CREATE INDEX idx_authz_log_timestamp ON authz_log(timestamp DESC);
CREATE INDEX idx_authz_log_severity ON authz_log(severity);

-- Alert on high-severity authorization failures
SELECT user_email, COUNT(*) as denials, array_agg(resource_type)
FROM authz_log
WHERE severity = 'high'
  AND timestamp > CURRENT_TIMESTAMP - INTERVAL '1 day'
GROUP BY user_email
HAVING COUNT(*) >= 10;  -- 10+ denials in 24 hours
```

**Rate Limit Triggers:**

```sql
CREATE TABLE rate_limit_log (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  ip_address INET NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  -- e.g., 'POST /api/project', 'GET /api/documents'

  requests_in_window INT NOT NULL,
  rate_limit INT NOT NULL,
  time_window_seconds INT NOT NULL,

  user_id UUID,  -- NULL if unauthenticated

  action_taken VARCHAR(50),
  -- 'throttled' (returned 429), 'blocked' (IP banned)

  alert_sent BOOLEAN DEFAULT FALSE
);

-- Alert if rate limit triggered frequently
SELECT ip_address, endpoint, COUNT(*) as triggers
FROM rate_limit_log
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY ip_address, endpoint
HAVING COUNT(*) >= 5;  -- Triggered 5+ times in 1 hour
```

**Suspicious Activity Patterns:**

```javascript
// Real-time pattern detection
const suspiciousPatterns = [
  // Pattern 1: Multiple failed logins from same IP
  {
    name: 'brute_force_attempt',
    query: `
      SELECT ip_address, COUNT(*) as attempts
      FROM auth_log
      WHERE status = 'failure'
        AND timestamp > NOW() - INTERVAL '30 minutes'
      GROUP BY ip_address
      HAVING COUNT(*) >= 5
    `,
    action: 'block_ip', // Block IP for 1 hour
    severity: 'high'
  },

  // Pattern 2: Access to data outside user's division
  {
    name: 'cross_division_access_attempt',
    query: `
      SELECT user_id, user_email, resource_type, COUNT(*) as attempts
      FROM authz_log
      WHERE status = 'failure'
        AND denial_reason = 'division_mismatch'
        AND timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY user_id, resource_type
      HAVING COUNT(*) >= 3
    `,
    action: 'alert_admin',
    severity: 'medium'
  },

  // Pattern 3: Unusual export volume
  {
    name: 'mass_data_export',
    query: `
      SELECT user_id, COUNT(*) as exports, SUM(export_rows) as total_rows
      FROM audit_logs
      WHERE event_type = 'data_export'
        AND timestamp > NOW() - INTERVAL '1 day'
      GROUP BY user_id
      HAVING COUNT(*) >= 10 OR SUM(export_rows) >= 100000
    `,
    action: 'revoke_session_and_alert',
    severity: 'high'
  },

  // Pattern 4: After-hours access to sensitive data
  {
    name: 'after_hours_sensitive_access',
    query: `
      SELECT user_id, user_email, COUNT(*) as accesses
      FROM audit_logs
      WHERE resource_type IN ('financial_record', 'employee', 'safety_record')
        AND EXTRACT(HOUR FROM timestamp) NOT BETWEEN 7 AND 18
        AND EXTRACT(DOW FROM timestamp) NOT IN (0, 6)  -- Not weekend
      GROUP BY user_id
      HAVING COUNT(*) >= 5
    `,
    action: 'alert_admin',
    severity: 'medium'
  }
];

// Run pattern detection every 5 minutes
setInterval(async () => {
  for (const pattern of suspiciousPatterns) {
    const results = await db.query(pattern.query);
    if (results.length > 0) {
      await handleSuspiciousPattern(pattern, results);
    }
  }
}, 5 * 60 * 1000);

async function handleSuspiciousPattern(pattern, results) {
  if (pattern.action === 'block_ip') {
    for (const result of results) {
      await blockIPAddress(result.ip_address, 3600); // 1 hour
    }
  }
  if (pattern.action === 'revoke_session_and_alert') {
    for (const result of results) {
      await revokeUserSessions(result.user_id);
      await sendSecurityAlert(`Suspicious activity: ${pattern.name}`, result);
    }
  }
  if (pattern.action === 'alert_admin') {
    await sendSecurityAlert(`Alert: ${pattern.name}`, results);
  }
}
```

### 9.3 Compliance Reporting

**PIPEDA Compliance Dashboard:**

```sql
-- Query: Data Subject Requests (Access, Correction, Deletion)
SELECT
  DATE_TRUNC('month', submitted_at) as month,
  request_type,
  COUNT(*) as count,
  AVG(EXTRACT(DAY FROM (completed_at - submitted_at))) as avg_days_to_complete
FROM data_subject_requests
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', submitted_at), request_type
ORDER BY month DESC;

-- Query: Breach Incidents
SELECT
  DATE_TRUNC('month', discovery_date) as month,
  breach_type,
  COUNT(*) as incidents,
  SUM(affected_individuals) as total_individuals_affected
FROM security_breach_records
GROUP BY DATE_TRUNC('month', discovery_date), breach_type
ORDER BY month DESC;

-- Query: Consent Status
SELECT
  consent_type,
  status,
  COUNT(*) as count
FROM consent_records
WHERE created_at > CURRENT_DATE - INTERVAL '1 year'
GROUP BY consent_type, status;

-- Query: Unauthorized Access Attempts
SELECT
  DATE(timestamp) as date,
  COUNT(*) as failed_attempts,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT user_email) as unique_users
FROM auth_log
WHERE status = 'failure'
  AND timestamp > CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Dashboard visualization (Grafana, Tableau, or custom):
  - Monthly data subject requests (trend)
  - Breach incidents (timeline)
  - Consent collection rate (pie chart)
  - Failed authentication attempts (bar chart)
  - PIPEDA compliance status (checklist)
```

**AODA Compliance Reports:**

```
Quarterly Report:

1. Accessibility Issues Identified
   - Automated testing (axe-core): X violations
   - Manual testing (3 criteria): Y issues
   - User-reported issues: Z feedback

2. Remediation Progress
   - Critical issues (WCAG A): X fixed / Y in progress
   - Major issues (WCAG AA): X fixed / Y in progress
   - Minor issues: X fixed / Y in progress

3. Testing Coverage
   - Pages tested: 95%
   - User flows tested: 100% critical, 80% secondary
   - Assistive technologies: NVDA, JAWS, VoiceOver

4. Training & Competency
   - Dev team training: Last completed Feb 2025
   - QA team training: Last completed Feb 2025
   - Accessibility champion assigned: Yes

5. Vendor Compliance
   - Third-party components: 90% compliant or better
   - Accessible fonts/icons: 100%
   - Video captions: 95% (3 videos pending)

6. Status: On Track / At Risk / Non-Compliant
```

**Security Incident Reports:**

```
Monthly Report Template:

Executive Summary:
  - Total incidents: X
  - Critical (S1): X
  - High (S2): X
  - Medium (S3): X
  - Low (S4): X

Incident Details:
  [For each S1/S2 incident]
  - Date: YYYY-MM-DD
  - Description: [What happened]
  - Root cause: [Why it happened]
  - Impact: [Systems/data affected]
  - Duration: [Time to detect, contain, resolve]
  - Remediation: [Steps taken]
  - Prevention: [How to prevent recurrence]

Trends:
  - YoY incident rate: Trend analysis
  - Top vulnerability categories: [OWASP Top 10]
  - Top attack vectors: [Network, app, human]
  - Mean time to detect (MTTD): X hours
  - Mean time to respond (MTTR): X hours

Compliance:
  - PIPEDA breach notifications: [If applicable]
  - Regulatory agency notifications: [If applicable]
  - Public disclosure: [If applicable]

Recommendations:
  - Priority 1 actions: [Immediate]
  - Priority 2 actions: [Within 30 days]
  - Priority 3 actions: [Within 90 days]
```

**Access Review Reports:**

```
Quarterly Access Review:

1. Role Assignments
   - Review all user role assignments
   - Identify stale/redundant roles
   - Confirm role appropriateness

2. Permission Changes
   - New permissions granted: X
   - Permissions revoked: Y
   - Average time to remove access after termination: X days

3. Admin Access
   - Admin users active: X
   - Admin actions performed: Y
   - Audit of admin sessions: All logged ✓

4. External Access
   - Portal users: X active
   - Time to provision new external user: X days
   - Time to deprovision: X days

5. Segregation of Duties
   - Finance: Approval != Payment: Confirmed ✓
   - Contracts: Creation != Signature: Confirmed ✓
   - Data access: User != Admin privileges: Confirmed ✓

6. Certification
  - Reviewed by: [Manager]
  - Date: YYYY-MM-DD
  - Status: Approved / Approved with exceptions / Rejected

  Exceptions:
    - User X has both role A and B (reason: [justified/temporary])
    - Approval by: [Manager] on YYYY-MM-DD
```

---

## 10. INCIDENT RESPONSE

### 10.1 Incident Classification

**Severity Matrix:**

| Severity | Definition | Examples | Response Time | Escalation | Communication |
|---|---|---|---|---|---|
| **S1 - Critical** | Widespread data exposure; service unavailable; regulatory breach | Full database dump exposed, all SIN numbers stolen, ransomware, 1000+ users affected | Immediate (< 15 min response) | CEO, Privacy Officer, Legal | OPC notification within 24h, Public disclosure plan |
| **S2 - High** | Significant data compromise; limited availability; 100-1000 users affected | 100+ employee records exposed, financial data breach, auth service down 1+ hour | Within 1 hour | VP Operations, CISO, Privacy Officer | Regulatory assessment, Customer notification plan |
| **S3 - Medium** | Limited data exposure; 10-100 users affected; containable impact | 10-50 records exposed, single project access incident, temporary service interruption | Within 4 hours | Ops Manager, Security Lead | Internal notification, Customer if applicable |
| **S4 - Low** | Minimal/no data exposure; no PII; isolated incident | Failed login attempt, outdated library, non-critical service slow | Within 24 hours | Ops Team | Log entry only |

### 10.2 Response Procedures

**Incident Response Workflow:**

```
1. DETECTION (Automated & Manual)
   ├─ Automated: IDS alert, rate limit triggered, log anomaly
   ├─ Manual: User report, vendor alert, security scan finding
   └─ Record: Detection time, detection method, initial assessment

2. TRIAGE (< 30 minutes for S1-S2)
   ├─ Assess: Severity, scope, affected systems
   ├─ Classify: S1/S2/S3/S4
   ├─ Notify: On-call incident commander
   └─ Create: Incident ticket with all details

3. CONTAINMENT (Immediately for S1-S2)
   ├─ Isolate: Affected systems (don't shut down without evidence)
   ├─ Preserve: System state for forensics (memory dump, logs)
   ├─ Stop: Active attack (block IP, revoke credentials)
   ├─ Prevent: Lateral movement (network segmentation)
   └─ Communicate: To stakeholders (internal status update)

4. ERADICATION (Within hours for S1-S2)
   ├─ Root Cause: Identify how attack succeeded
   ├─ Clean: Remove malware/backdoors
   ├─ Patch: Fix exploited vulnerability
   ├─ Verify: Confirm eradication (log review, scan)
   └─ Secure: Prevent re-entry

5. RECOVERY (Within 24h for S1-S2)
   ├─ Restore: Systems from clean backups
   ├─ Verify: System functionality
   ├─ Monitor: For signs of re-compromise
   └─ Document: Recovery steps taken

6. POST-INCIDENT
   ├─ Notify: All affected parties (users, regulators)
   ├─ Analyze: What happened, why, how to prevent
   ├─ Improve: Update processes, security controls
   ├─ Train: Team on lessons learned
   └─ Report: Full incident report
```

**Communication Plan:**

```
Stakeholders & Notification:

INTERNAL (During Incident):
  - Incident Commander: Activated immediately
  - Executive on-call: S1/S2 within 15 min
  - Engineering team: Affected systems team
  - Operations team: Infrastructure, backups
  - Legal/Compliance: If potential regulatory impact
  - PR/Communications: If public disclosure likely

EXTERNAL (Post-Incident):
  - Office of Privacy Commissioner (OPC): S1/S2 within 24-48h
  - Provincial regulators: If Quebec/BC data involved
  - Affected customers: Within 72h (if their data affected)
  - Business partners: If partnership systems affected
  - Public disclosure: If significant breach and media likely

Communication Content:

Technical Details (Internal):
  - What system affected
  - Attack vector / root cause
  - Time window of compromise
  - Data types exposed
  - Current status and remediation

Notification to Users (External):
  - What happened (plain language)
  - What data was involved
  - What we're doing about it
  - What users should do (monitor credit, change passwords)
  - Contact information for questions
  - Compensation (if applicable: credit monitoring)

Public Statement (If disclosure):
  - Incident date and detection date
  - Systems affected
  - Types of data involved (no details)
  - Remediation status
  - Security improvements made
  - Contact for more information
```

**Post-Incident Review Process:**

```
Timeline: Conduct within 5 business days of incident closure

Participants:
  - Incident Commander (lead)
  - Technical staff involved in response
  - Security team
  - Management representatives

Agenda:

1. What Happened
   - Chronology of events
   - Who detected the incident
   - Time to detection vs impact window

2. Root Cause Analysis
   - How did attacker gain access
   - What vulnerability was exploited
   - Why was vulnerability not caught earlier

3. Response Effectiveness
   - Was severity correctly assessed
   - Were the right people notified
   - Were response procedures followed
   - What worked well
   - What could be improved

4. Lessons Learned
   - Process improvements
   - Technology upgrades needed
   - Training gaps identified
   - Preventive controls to implement

5. Action Items
   - Owner: Who is responsible
   - Action: What specifically needs to be done
   - Priority: High/Medium/Low
   - Deadline: When must it be completed
   - Verification: How will we confirm it's done

6. Documentation
   - Incident report drafted
   - Lessons learned captured
   - Action items tracked to completion
   - Report shared with stakeholders

Post-Incident Review Report (template):

  Incident ID: INC-2025-001
  Date: Feb 15, 2025
  Severity: S2
  Status: Closed

  Summary: [2-3 sentences]

  Root Cause: [Why it happened]

  Impact: [What was affected]

  Response Time: Detection: 23 min | Containment: 45 min | Resolution: 6 hours

  Preventive Actions:
    ✓ Action 1: [Implemented]
    ✓ Action 2: [Implemented]
    → Action 3: [In progress, due date]

  Success Metrics:
    - Severity correctly classified: Yes
    - Response within SLA: Yes (S2: within 1h, actual: 45min)
    - RTO met: Yes (target 4h, actual 6h)
    - No data exfiltration confirmed: Yes
```

### 10.3 Business Continuity

**RPO/RTO Targets:**

| System/Service | RTO (Recovery Time) | RPO (Recovery Point) | Rationale |
|---|---|---|---|
| **Public Portal (KrewPact UI)** | 4 hours | 1 hour | Customer-facing, loss of 1h acceptable |
| **Internal Web App** | 2 hours | 30 minutes | Critical operations |
| **Database (Supabase)** | 1 hour | 5 minutes | Core data, needs frequent backup |
| **ERPNext Financial System** | 4 hours | 30 minutes | Financial records critical, compliance |
| **Email/Communications** | 8 hours | 4 hours | Important but less critical |
| **File Storage (S3)** | 24 hours | 1 hour | Documents can be reconstructed |
| **Backup Systems** | 48 hours | 12 hours | Backup of backup; lower priority |

**Backup Strategy (3-2-1 Rule):**

```
Rule: 3 copies of data, on 2 different storage types, 1 offsite

Implementation:

1. Primary Database (Supabase PostgreSQL)
   - Location: AWS ca-central-1 (Montreal)
   - Replication: Continuous to secondary
   - RPO: 5 minutes
   - RTO: < 1 hour (failover to read replica)

2. Backup Copy #1 (AWS S3 - Same Region)
   - Location: AWS ca-central-1 (same as primary)
   - Frequency: Nightly full backup
   - Retention: 7 days
   - Encryption: AES-256
   - RTO: < 4 hours (restore from S3)

3. Backup Copy #2 (AWS S3 - Different Region)
   - Location: AWS ca-west-1 (Calgary, cross-region)
   - Frequency: Cross-region replication (automatic)
   - Retention: 30 days
   - Encryption: AES-256
   - RTO: < 8 hours (restore from CA-West)

4. Backup Copy #3 (Glacier Archive - Offsite/Cold)
   - Location: AWS Glacier (deep archive, 6-12h retrieval)
   - Frequency: Monthly archival of nightly backups
   - Retention: 7 years (compliance requirement)
   - Encryption: AES-256
   - RTO: 6-12 hours (expensive, only for disaster)

ERPNext Backups:

1. Primary (On Proxmox hypervisor)
   - Daily snapshots of VM
   - Retention: 7 days
   - RTO: < 1 hour (snapshot rollback)

2. Secondary (NFS share - local)
   - Daily encrypted backup
   - Retention: 30 days
   - RTO: < 4 hours

3. Tertiary (AWS S3 Canada)
   - Weekly sync to S3
   - Retention: 1 year
   - Encryption: Yes
   - RTO: < 8 hours
```

**Disaster Recovery Procedures:**

```
Scenario 1: Database Corruption
  Detection: Query returns unexpected results
  RTO Target: 1 hour

  1. Identify corruption scope
     - Query and timestamp of corruption
     - Affected tables/rows

  2. Restore from backup
     - Use Supabase point-in-time recovery (if < 5min old)
     - Or restore nightly backup from S3
     - Test restore on staging first

  3. Validation
     - Run data integrity checks
     - Compare record counts before/after
     - Spot-check random records

  4. Failover
     - Redirect traffic to restored database
     - Monitor for 30 minutes

Scenario 2: Data Center Failure (AWS ca-central-1 down)
  Detection: Database unreachable for 5+ minutes
  RTO Target: 4 hours

  1. Activate disaster recovery
     - Declare P1 incident
     - Activate on-call disaster recovery team

  2. Restore from CA-West backup
     - Retrieve latest backup from AWS ca-west-1
     - Provision new database in ca-west-1
     - Restore data and verify

  3. Update DNS/routing
     - Point database endpoint to new location
     - Propagation time: up to 5 minutes

  4. Verify services
     - Test application connectivity
     - Run smoke tests on critical flows
     - Monitor error rates for 1 hour

Scenario 3: Complete Service Loss (Ransomware)
  Detection: All systems encrypted/inaccessible
  RTO Target: 24 hours

  1. Activate crisis management
     - Declare P1/Critical incident
     - Assemble full response team
     - Notify executive leadership

  2. Assess backup integrity
     - Confirm backups not encrypted/compromised
     - Verify restore procedure works

  3. Rebuild from scratch
     - Provision new AWS environment (new account if possible)
     - Restore database from clean backup (pre-ransomware)
     - Redeploy application code (from GitHub)
     - Restore file storage from S3

  4. Coordination
     - Keep stakeholders updated every 2 hours
     - Prepare customer communication
     - Estimate timeline to restoration

  5. Post-recovery
     - Full forensic investigation
     - Identify attack vector
     - Implement remediation (patches, new security controls)
     - Public disclosure and customer notification

Scenario 4: Application/Code Issue
  Detection: Application crash, critical bug
  RTO Target: 2 hours

  1. Rollback to previous version
     - Revert recent code deployment
     - Redeploy previous known-good version

  2. Or fix and redeploy
     - Identify bug
     - Develop fix
     - Test in staging
     - Deploy to production

  3. Verify
     - Monitor error logs
     - User reports of functionality restored
```

**Failover Mechanisms:**

```yaml
# Kubernetes/Docker Orchestration Example

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: krewpact-api
spec:
  replicas: 3  # Multiple replicas for high availability
  selector:
    matchLabels:
      app: krewpact-api
  template:
    metadata:
      labels:
        app: krewpact-api
    spec:
      containers:
      - name: api
        image: krewpact:v1.2.3
        ports:
        - containerPort: 8080

        # Health checks for automatic failover
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5

        # Resource limits prevent cascade failures
        resources:
          requests:
            memory: "256Mi"
            cpu: "500m"
          limits:
            memory: "512Mi"
            cpu: "1000m"

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: krewpact-api-pdb
spec:
  minAvailable: 2  # Keep at least 2 replicas running
  selector:
    matchLabels:
      app: krewpact-api

---
apiVersion: v1
kind: Service
metadata:
  name: krewpact-api
spec:
  selector:
    app: krewpact-api
  ports:
  - protocol: TCP
    port: 443
    targetPort: 8080
  type: LoadBalancer  # Automatic load balancing across replicas

---
# Database failover
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: krewpact-db
spec:
  instances: 3  # 1 primary + 2 standbys
  primaryUpdateStrategy: unsupervised
  postgresql:
    parameters:
      max_connections: "200"
```

---

## 11. COMPLIANCE CHECKLIST

**Master Compliance Checklist: All Regulatory Requirements**

| Requirement | Regulation/Standard | Current Status | Owner | Evidence/Documentation | Last Reviewed | Next Review | Notes |
|---|---|---|---|---|---|---|---|
| **PIPEDA - Accountability** | PIPEDA Section 4 | ✓ Implemented | Privacy Officer | DPA with all vendors, Privacy Policy | 2025-01-15 | 2025-04-15 | Quarterly reviews |
| **PIPEDA - Identifier Minimization** | PIPEDA Section 4.2 | ✓ Implemented | Privacy Officer | Data minimization checklist, Field audit | 2025-01-20 | 2025-04-20 | Annual audit |
| **PIPEDA - Retention & Disposal** | PIPEDA Section 4.3 | ✓ Implemented | Compliance Officer | Data retention schedule, Disposal certs | 2025-01-10 | 2025-04-10 | Monitor execution |
| **PIPEDA - Accuracy** | PIPEDA Section 4.4 | ✓ Implemented | Privacy Officer | Correction request process, Records | 2025-01-25 | 2025-04-25 | Track corrections |
| **PIPEDA - Safeguarding** | PIPEDA Section 4.5 | ✓ Implemented | CISO | Encryption matrix, Access controls | 2025-01-15 | 2025-04-15 | Quarterly assessment |
| **PIPEDA - Openness** | PIPEDA Section 4.6 | ✓ Implemented | Privacy Officer | Privacy policy published, Contact info | 2025-01-12 | 2025-04-12 | Review policy changes |
| **PIPEDA - Individual Access** | PIPEDA Section 4.7 | ✓ Implemented | Privacy Officer | Access request process, SLA tracking | 2025-01-18 | 2025-04-18 | Monitor SLA compliance |
| **PIPEDA - Challenge Accuracy** | PIPEDA Section 4.8 | ✓ Implemented | Privacy Officer | Correction process, Record disputes | 2025-01-20 | 2025-04-20 | Track disputes |
| **AODA - Web Accessibility** | AODA 2005 Section 11.2 | ✓ Implemented | Product Manager | WCAG 2.0 AA compliance report | 2025-02-01 | 2025-05-01 | Monthly auto-testing |
| **AODA - Training** | AODA 2005 Section 11.3 | ✓ Implemented | HR Manager | Training certificates, Attendance records | 2025-01-30 | 2025-04-30 | Annual refresher |
| **AODA - Feedback Process** | AODA 2005 Section 11.4 | ✓ Implemented | Operations | Feedback form, Response records | 2025-02-05 | 2025-05-05 | Track feedback trends |
| **Construction Act - 7-Day Notice** | Ontario Construction Act 2026 | ✓ Implemented | Legal Dept | Notice templates, Send logs | 2025-01-22 | 2025-04-22 | Verify on terminations |
| **Construction Act - Lien Tracking** | Ontario Construction Act | ✓ Implemented | Finance Manager | Lien management system, Ledger | 2025-01-25 | 2025-04-25 | Monthly audit |
| **Construction Act - Form 6 Release** | Ontario Construction Act | ✓ Implemented | Finance Manager | Form 6 generation, Payment tracking | 2025-01-20 | 2025-04-20 | Verify timeliness |
| **Construction Act - Trust Funds** | Ontario Construction Act | ✓ Implemented | Finance Manager | Bank account agreement, Movement log | 2025-01-15 | 2025-04-15 | Quarterly reconciliation |
| **CRA - Payroll Records** | Income Tax Act (Canada) | ✓ Implemented | HR Manager | Payroll system, T4 filings | 2025-01-10 | 2025-04-10 | Annual T4 verification |
| **CRA - Financial Records** | Income Tax Act (Canada) | ✓ Implemented | Finance Manager | Accounting system, 6-year retention | 2025-01-10 | 2025-04-10 | Annual audit coordination |
| **WSIB - Incident Reporting** | Occupational Health & Safety Act | ✓ Implemented | Safety Officer | Incident database, MOL reports | 2025-01-28 | 2025-04-28 | Monthly incident review |
| **WSIB - Record Retention** | O. Reg. 833 | ✓ Implemented | Safety Officer | Archive system, 7-year retention | 2025-01-15 | 2025-04-15 | Annual cleanup |
| **OHSA - Safety Posting** | Occupational Health & Safety Act | ✓ Implemented | Safety Officer | Posting checklist, Photos at site | 2025-02-01 | 2025-05-01 | Quarterly verification |
| **E-Signature - PIPEDA Part 2** | PIPEDA Section 4 & Consent | ✓ Implemented | Privacy Officer | E-consent process, Records | 2025-01-25 | 2025-04-25 | Monitor consent records |
| **E-Signature - Electronic Commerce Act** | Ontario Electronic Commerce Act | ✓ Implemented | Legal Dept | Signature audit trail, Validation | 2025-01-20 | 2025-04-20 | Quarterly validation test |
| **Encryption - Data at Rest** | Industry Best Practice (AES-256) | ✓ Implemented | CISO | Encryption settings verified, Keys managed | 2025-01-15 | 2025-04-15 | Key rotation schedule |
| **Encryption - Data in Transit** | Industry Best Practice (TLS 1.3) | ✓ Implemented | CISO | SSL certificate audit, TLS version check | 2025-01-18 | 2025-04-18 | Certificate renewal schedule |
| **MFA - Admin Access** | Industry Best Practice | ✓ Implemented | CISO | MFA enrollment status, Backup codes | 2025-01-20 | 2025-04-20 | Quarterly review |
| **Access Controls - RBAC** | Principle of Least Privilege | ✓ Implemented | Security Lead | Role matrix, Permission audit | 2025-01-25 | 2025-04-25 | Monthly access review |
| **Audit Logging** | SOX / PIPEDA / CRA | ✓ Implemented | CISO | Audit log testing, Retention policy | 2025-01-15 | 2025-04-15 | Monthly log review |
| **Backup & Disaster Recovery** | Business Continuity Best Practice | ✓ Implemented | IT Ops Manager | Backup schedule, DR test results | 2025-01-20 | 2025-04-20 | Quarterly DR test |
| **Incident Response Plan** | PIPEDA / Industry Best Practice | ✓ Implemented | CISO | Plan document, Contact list, Drills | 2025-01-25 | 2025-04-25 | Annual drill execution |
| **Vendor DPA - Supabase** | PIPEDA Section 4.5 | ✓ Signed | Privacy Officer | DPA document, Security assessment | 2025-01-10 | 2025-04-10 | Annual review |
| **Vendor DPA - Clerk** | PIPEDA Section 4.5 | ✓ Signed | Privacy Officer | DPA document, SOC 2 certificate | 2025-01-12 | 2025-04-12 | Annual review |
| **Vendor DPA - BoldSign** | PIPEDA Section 4.5 | ✓ Signed | Privacy Officer | DPA document, Security audit | 2025-01-14 | 2025-04-14 | Annual review |
| **Vendor DPA - ADP** | PIPEDA Section 4.5 | ✓ Signed | Privacy Officer | DPA document, SOC 2 certificate | 2025-01-16 | 2025-04-16 | Annual review |
| **Vendor DPA - Vercel** | PIPEDA Section 4.5 | ✓ Signed | Privacy Officer | DPA document, Security policy | 2025-01-18 | 2025-04-18 | Annual review |
| **Security Training - All Staff** | PIPEDA / Industry Best Practice | ✓ Completed | HR Manager | Training records, Completion certs | 2025-01-31 | 2025-04-30 | Annual mandatory training |
| **Privacy Training - Data Handlers** | PIPEDA Section 4 | ✓ Completed | Privacy Officer | Training roster, Comprehension test | 2025-01-31 | 2025-04-30 | Annual mandatory training |
| **Penetration Testing** | Industry Best Practice | ✓ Completed | CISO | Pentest report, Remediation tracking | 2025-01-30 | 2025-04-30 | Annual (Q1) |
| **Vulnerability Scanning** | Industry Best Practice | ✓ Ongoing | CISO | Scan reports, Patch tracking | 2025-02-01 | 2025-05-01 | Monthly scans |
| **Data Residency - Canada** | PIPEDA Best Practice | ✓ Verified | CISO | Data residency audit, Contracts | 2025-01-20 | 2025-04-20 | Annual verification |
| **Third-Party Security Assessment** | PIPEDA Section 4.5 | ✓ Completed | CISO | Assessment results, Scores | 2025-01-25 | 2025-04-25 | Annual assessments |
| **Compliance Reporting - Monthly** | Internal Control | ✓ Completed | Compliance Officer | Monthly dashboard, Management report | 2025-02-05 | 2025-03-05 | Monthly cadence |
| **Compliance Certification - Annual** | External Audit | → In Progress | Compliance Officer | Audit report, Certification | Expected 2025-03-31 | 2026-03-31 | External auditor engaged |

**Compliance Status Legend:**
- ✓ Implemented: Requirement met, controls in place, tested
- → In Progress: Work underway, completion expected on schedule
- ⚠ At Risk: Mitigation in place but may not meet deadline
- ✗ Not Started: No work initiated, risk exists

**Compliance Calendar (Annual):**

```
January:
  - Quarterly PIPEDA compliance review
  - Annual security training completion deadline
  - Penetration testing (Q1)
  - Review previous year's incident reports

February:
  - AODA monthly accessibility testing
  - Vendor security assessments (annual refresh)
  - Data subject access requests (monitor SLA)

March:
  - External audit (for annual certification)
  - Financial records review (CRA readiness)
  - Q1 compliance report

April:
  - PIPEDA 3-month review (mid-year check)
  - Access control review (quarterly)
  - Update compliance documentation

May:
  - WCAG accessibility audit (spring refresh)
  - Backup/DR test execution
  - Q2 compliance report

June:
  - Mid-year compliance assessment
  - Vendor DPA renewal discussions
  - Data retention audit (purge old data)

July:
  - Security training refresher
  - Internal control assessment
  - Q3 compliance report

August:
  - AODA feedback review
  - Incident response plan drill
  - Vulnerability scan review

September:
  - PIPEDA 9-month review
  - Construction Act lien audit
  - Update security policies

October:
  - Annual penetration test (Q4)
  - Employee access review
  - Q4 compliance report

November:
  - Prepare for annual external audit
  - Security training (annual)
  - Disaster recovery test

December:
  - Year-end compliance certification
  - Annual incident review and lessons learned
  - Plan next year's compliance activities
  - Budget and resource planning for compliance
```

---

## Document Control

**Version History:**

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2025-02-09 | Security & Compliance Team | Initial comprehensive framework document |

**Document Classification:** INTERNAL - Confidential

**Owner:** Chief Information Security Officer (CISO)

**Distribution:**
- Executive Leadership (CEO, CFO, COO)
- Privacy Officer
- Compliance Officer
- Security Team
- Legal & Compliance Department
- External Auditors (as needed)

**Review Schedule:** Quarterly (next review: 2025-05-09)

**Amendment Process:**
1. Submit change request to CISO
2. Review by Compliance Officer and Privacy Officer
3. Approval by security governance committee
4. Update version number and distribution list
5. Notify all stakeholders of changes

---

**End of Document**

This KrewPact Security and Compliance Framework establishes the foundational security and privacy standards for the platform. All personnel must adhere to these requirements. Questions or concerns should be escalated to the Chief Information Security Officer.


```



