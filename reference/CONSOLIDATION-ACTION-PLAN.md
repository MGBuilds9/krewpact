# KrewPact Planning Pack: Consolidation Action Plan

**Quick Reference for Implementation**

---

## At-a-Glance: 7 Overlaps and Decisions

| # | Overlap | Keep/Merge/Absorb | Action | Effort | File Result |
|---|---------|-------------------|--------|--------|-------------|
| 1 | Vision vs. Master Plan (feature scope) | **KEEP BOTH** | Add cross-reference from Master Plan to Vision §1 | 5 min | Both 18 docs |
| 2 | Licensing vs. Security (PIPEDA/AODA) | **KEEP BOTH** | Add reference table linking requirements to implementations | 15 min | Both 18 docs |
| 3 | ADRs vs. DevOps (CI/CD strategy) | **MERGE** | Remove CI/CD content from DevOps; add ADR references | 30 min | 17 docs (DevOps shrinks 2.5 KB) |
| 4 | Integration-Contracts vs. Doctype-Mapping (ERPNext) | **KEEP BOTH** | Add cross-references; clarify audience/purpose | 10 min | Both 18 docs |
| 5 | Master Plan vs. Feature-PRD (feature list) | **ABSORB** | Remove feature table from Master Plan §6; cross-ref to PRD | 20 min | 17 docs (Master Plan shrinks 4 KB) |
| 6 | Blueprint-Gap-Matrix (legacy mapping) | **ABSORB** | Move to Feature-PRD §1 as "Scope vs. Legacy"; delete file | 30 min | 16 docs (remove 2.6 KB file) |
| 7 | Strategic-Assessment (meta-review) | **REPOSITION** | Move to `/reference/` subfolder as "VALIDATION-CHECKLIST" | 10 min | 15 docs in main; 1 in reference/ |

---

## Phase 1: Low-Risk, Quick Wins (Do This Week)

### Task 1.1: Remove CI/CD Duplication from DevOps Document
**File:** `KrewPact-DevOps-and-CI-CD.md`

**What to do:**
1. In §1 (CI/CD Pipeline), replace the 1.5 KB section with:
   ```
   See ADR-014 (Technology Stack ADRs) for the decision rationale and alternatives analysis.
   This section covers implementation and monitoring.
   ```
2. Remove repeats of: "GitHub Actions integrates natively...", "matrix builds test across..."
3. In §2 (Testing Strategy), replace 3 KB section with:
   ```
   See ADR-025 for testing strategy rationale and coverage targets.
   This section covers CI/CD integration and monitoring.
   ```

**Result:** DevOps shrinks from 43 KB → 40 KB. Still complete, but no decision rehashing.

**Time:** 30 minutes
**Risk:** Very low (you're deleting redundant text, not restructuring)

---

### Task 1.2: Consolidate Blueprint-Gap-Matrix into Feature PRD
**File to modify:** `KrewPact-Feature-Function-PRD-Checklist.md`
**File to delete:** `KrewPact-Blueprint-Gap-Matrix.md` (2.6 KB)

**What to do:**
1. In Feature-PRD §1 (Product Definition), after the bullet "Target: Mixed GC (residential + light commercial)", add a new subsection:

   ```markdown
   ### Product Scope vs. Legacy Blueprint

   The V2 plan expands the legacy blueprint (which focused on MVP: Service Directory, Project Management,
   Document Management, Team Directory, Admin/RBAC) into a production platform covering 16 complete epics.

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
   ```

2. Delete the file: `KrewPact-Blueprint-Gap-Matrix.md`

**Result:** Feature-PRD grows by ~1 KB (now 22 KB). One fewer file to maintain.

**Time:** 45 minutes
**Risk:** Low (just moving content, not restructuring)

---

### Task 1.3: Remove Feature List Duplication from Master Plan
**File:** `KrewPact-Master-Plan.md`

**What to do:**
1. In §6 (Complete Feature List), replace the entire 23-row feature domain table with:

   ```markdown
   ## Complete Feature List

   See **KrewPact-Feature-Function-PRD-Checklist.md** for detailed enumeration of 70+ features
   across 16 epics, including acceptance criteria and role model.

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
   ```

2. Remove the 4.5 KB feature table that starts "| Domain | Features |..."

**Result:** Master Plan shrinks from 17 KB → 12 KB. Still complete (locked decisions + architecture), but no feature detail duplication.

**Time:** 20 minutes
**Risk:** Low (table is duplicated in Feature PRD; removing here just cleans up Master Plan)

---

## Phase 2: Medium-Confidence (Do Next Week)

### Task 2.1: Cross-Reference PIPEDA Between Licensing and Security
**Files:** `KrewPact-Licensing-and-Legal-Audit.md` and `KrewPact-Security-and-Compliance-Framework.md`

**What to do:**

In **Licensing-and-Legal-Audit.md**, at the end of §4 (PIPEDA Compliance), add:

```markdown
---

**Implementation Details:** See KrewPact-Security-and-Compliance-Framework.md §4 for:
- Immutable audit trail design for PIPEDA compliance
- Consent management system integration
- Privacy request workflow (access, correction, deletion, export)
- Data retention policies and automated purge rules
- Breach notification process and record-keeping (24-month requirement)
```

In **Security-and-Compliance-Framework.md**, at the start of §4 (PIPEDA Implementation), add:

```markdown
---

**Legal Requirements:** See KrewPact-Licensing-and-Legal-Audit.md §4 for the complete
regulatory requirement summary and risk assessment.
```

Also in Security doc §4.1, add a new table right after "PIPEDA Compliance Implementation":

```markdown
## Mapping: PIPEDA Requirements → Technical Implementation

| PIPEDA Requirement | Location in Doc | Technical Implementation |
|-------------------|-----------------|--------------------------|
| Consent management | §4 Licensing | CMS (Consent Management System) in §4.3 Security |
| Breach notification (30 days) | §4 Licensing | Incident response workflow in §4.2 Security |
| Privacy access requests (DSAR) | §4 Licensing | Privacy request lifecycle in §4.1 Security |
| Data retention policies | §4 Licensing | Automated purge in §4.1 Security |
| Audit trails (7 years financial) | §4 Licensing | Immutable audit design in §4 Security |
```

**Result:** Both documents remain unchanged in size/scope but now explicitly connected.

**Time:** 30 minutes
**Risk:** Very low (additive cross-references only)

---

### Task 2.2: Add Cross-References Between Integration Contracts and Doctype Mapping
**Files:** `KrewPact-Integration-Contracts.md` and `KrewPact-ERPNext-Doctype-Field-Mapping.md`

**What to do:**

In **Integration-Contracts.md**, at the end of §7 (Integration Blueprint, ERPNext row), add:

```markdown

**Detailed Field Mapping:** See KrewPact-ERPNext-Doctype-Field-Mapping.md for:
- 43 doctype crosswalk (Customer → Account, Quotation → Estimate, etc.)
- 16 required custom fields per doctype
- 8 custom doctypes needed in ERPNext
- Field-level mapping details and direction (Hub → ERP vs. ERP → Hub)
- Cutover checklist
```

In **ERPNext-Doctype-Field-Mapping.md**, at the top of §1 (Integration Rules), add:

```markdown

---

**Sync Architecture:** See KrewPact-Integration-Contracts.md §1 for:
- Queue-driven sync pattern (BullMQ)
- Retry strategy and circuit breaker
- Idempotency and deduplication
- Error handling and deadletter processing
- Webhook infrastructure
```

**Result:** Both documents remain independent (Integration Contracts = high-level, Doctype Mapping = detailed), but now explicitly linked.

**Time:** 15 minutes
**Risk:** Very low (additive)

---

### Task 2.3: Reposition Strategic Assessment as Reference Document
**File to move:** `KrewPact-Strategic-Assessment.md`

**What to do:**
1. Create a subfolder: `/reference/`
2. Move `KrewPact-Strategic-Assessment.md` → `/reference/VALIDATION-CHECKLIST-Codebase-vs-Docs.md`
3. Add a header note:
   ```markdown
   # Validation Checklist: KrewPact Codebase vs. Planning Documents

   **Purpose:** This is a meta-review document, not a planning spec.
   Use this document to:
   - Identify contradictions between documented architecture and actual codebase
   - Assess health of planning documents against implementation reality
   - Track gaps between intent (docs) and reality (code)

   **Audience:** Architects, technical leads, and stakeholders reviewing build quality

   **Update Frequency:** Quarterly (after major code/doc changes)

   ---
   ```
4. Update README.md to move Strategic Assessment reference to a "Reference Documents" section at the end.

**Result:** Main planning pack shrinks to 14 documents. Strategic Assessment remains useful but is clearly positioned as a meta-review tool, not a core planning doc.

**Time:** 20 minutes
**Risk:** Very low (just file organization)

---

## Phase 3: Polish (Optional, Do If Time)

### Task 3.1: Update README.md Index
**File:** `README.md`

After implementing all consolidations, update:
1. Document count: "18 documents" → "15 core documents + reference"
2. File size: "~860 KB" → "~850 KB"
3. Add notation for moved files:
   ```markdown
   ---

   ## Reference Documents (Meta-Review & Validation)

   | File | Purpose |
   |------|---------|
   | `reference/VALIDATION-CHECKLIST-Codebase-vs-Docs.md` | Meta-review of planning docs vs. codebase health; use quarterly |
   | `REDUNDANCY-AND-OVERLAP-ANALYSIS.md` | Documentation of consolidation decisions; reference for future doc maintenance |
   ```

**Time:** 30 minutes
**Risk:** Very low

---

## Summary: Before and After

| Metric | Before Consolidation | After Phase 1 Only | After All Phases |
|--------|----------------------|-------------------|------------------|
| **Document count** | 18 | 16 | 15 (+ 1 reference) |
| **Total size** | 860 KB | 856 KB | 850 KB |
| **Removable duplication** | ~13 KB | ~6 KB | ~2 KB |
| **Time to implement** | — | 1.5 hours | 3 hours |
| **Risk level** | — | Very low | Very low |

---

## Maintenance: Going Forward

After consolidation, follow these rules to avoid new duplication:

1. **When updating a topic that appears in two documents:**
   - Update the source document (e.g., ADRs for CI/CD decision)
   - Update the cross-reference in the derivative document (e.g., DevOps)
   - Do NOT duplicate the rationale

2. **When adding a new compliance requirement:**
   - Add to Licensing-and-Legal-Audit.md first (legal source)
   - Add implementation details to Security-and-Compliance-Framework.md second
   - Link the two via the cross-reference table

3. **When revising features or scope:**
   - Update Feature-Function-PRD-Checklist.md (the canonical source)
   - Update Master Plan's architecture/locked decisions only if they change
   - Do NOT update both with the same feature list

4. **Quarterly Check:**
   - Run the VALIDATION-CHECKLIST against latest codebase
   - Identify new contradictions
   - Update docs or code to resolve contradictions

---

## Rollout Plan

**Week 1 (Phase 1):**
- Monday: Task 1.1 (DevOps deduplication)
- Tuesday: Task 1.2 (Blueprint absorption)
- Wednesday: Task 1.3 (Master Plan feature table)
- Review and test cross-links

**Week 2 (Phase 2):**
- Monday: Task 2.1 (PIPEDA cross-references)
- Tuesday: Task 2.2 (Integration cross-references)
- Wednesday: Task 2.3 (Reposition Strategic Assessment)
- Review and update README

**Week 3 (Phase 3, if time):**
- Update README.md and add maintenance guide

---

## Files Affected

### Core Modifications
- `KrewPact-DevOps-and-CI-CD.md` (reduce 43 KB → 40 KB)
- `KrewPact-Feature-Function-PRD-Checklist.md` (expand 21 KB → 24 KB)
- `KrewPact-Master-Plan.md` (reduce 17 KB → 12 KB)
- `KrewPact-Licensing-and-Legal-Audit.md` (add 200 bytes cross-ref)
- `KrewPact-Security-and-Compliance-Framework.md` (add 500 bytes cross-ref)
- `KrewPact-Integration-Contracts.md` (add 200 bytes cross-ref)
- `KrewPact-ERPNext-Doctype-Field-Mapping.md` (add 200 bytes cross-ref)
- `README.md` (update index)

### Files Deleted
- `KrewPact-Blueprint-Gap-Matrix.md` (2.6 KB removed)

### Files Moved
- `KrewPact-Strategic-Assessment.md` → `reference/VALIDATION-CHECKLIST-Codebase-vs-Docs.md`

### New Files Created
- `REDUNDANCY-AND-OVERLAP-ANALYSIS.md` (this analysis)
- `CONSOLIDATION-ACTION-PLAN.md` (this plan)
- `reference/` (new folder)

---

## Success Criteria

After implementation:
- [ ] No document contains verbatim repeats of content from another document
- [ ] All cross-document references are explicitly documented in README or cross-ref tables
- [ ] DevOps document no longer discusses ADR decisions (only implementation)
- [ ] Master Plan no longer repeats feature list (only locked decisions + architecture)
- [ ] Blueprint coverage is documented in Feature PRD, not standalone
- [ ] PIPEDA/AODA links are explicit between Licensing and Security docs
- [ ] ERPNext sync details are cross-linked between Contracts and Mapping docs
- [ ] Strategic Assessment is repositioned as a reference/validation tool
- [ ] Total size reduced from 860 KB to ~850 KB
- [ ] Document count reduced from 18 to 15 core + 1 reference

---

## Questions?

If a consolidation feels risky or unclear:
1. Review the detailed "Overlap Analysis" section in REDUNDANCY-AND-OVERLAP-ANALYSIS.md
2. Check the "Recommendation" and "Action" columns in the summary table above
3. Consider doing Phase 1 only if you want low-risk, quick wins
4. Phase 2 and 3 add polish but not critical functionality
