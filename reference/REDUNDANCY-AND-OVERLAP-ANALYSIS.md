# KrewPact Planning Pack: Redundancy and Overlap Analysis

**Date:** February 10, 2026
**Pack Size:** 18 documents, ~23,152 lines, 860 KB
**Prepared for:** Documentation consolidation review

---

## Executive Summary

The 18-document planning pack is **well-organized and minimally redundant** overall, with clear separation between strategic/architectural documents (Tier 1) and product specifications (Tier 2). However, there are **7 specific overlaps** that can be consolidated to reduce cognitive load and maintenance burden, bringing the pack from 18 documents to an optimal **12-14 documents** without losing information.

**Recommendation:** Implement targeted merges and absorptions (see below) to reduce duplication while preserving the distinction between strategy, architecture, and implementation.

---

## Detailed Overlap Analysis

### OVERLAP 1: Product Vision vs. Master Plan Feature Scope

**Documents Involved:**
- `KrewPact-Product-Vision-and-Strategy.md` (89 KB)
- `KrewPact-Master-Plan.md` (17 KB)

**Overlap Description:**

Both documents define what the product does and enumerate features:

| Aspect | Vision | Master Plan |
|--------|--------|-------------|
| **Product scope** | ✓ Complete definition (§1.1) | ✓ Locked decisions summary (§4) |
| **Feature domains** | ✓ 16 epics and 70+ features (§2.2) | ✓ 23 feature domains table (§6) |
| **Target market** | ✓ MDM Group + white-label (§1.3) | ✓ Single legal entity focus (§1) |
| **ERP integration principle** | ✓ Finance stays in ERPNext (§2.3) | ✓ Confirmed as locked decision (§4.9) |
| **Architecture layers** | ✗ Not in Vision | ✓ 8-layer table (§7) |
| **Locked decisions** | ✗ Not framed as decisions | ✓ 19 explicit locked decisions (§4) |

**Specific Redundancy Examples:**

Vision §1.1:
> "KrewPact brings Customer Relationship Management, estimating, scheduling, field logs, Requests for Information (RFIs), change orders, client and trade partner portals, and ERP-integrated job costing into one streamlined workspace."

Master Plan §1 (paraphrasing):
> "3–4 month program using Hybrid ERPNext-first architecture: KrewPact is UX shell, field operations, portals, orchestration, identity, and reporting."

Both describe the same operational footprint but from different angles (Vision = aspirational, Master Plan = executable decision log).

**Recommendation: KEEP BOTH (different purpose)**

- **Vision** serves strategic stakeholders, competitive/marketing positioning, and long-term product principles
- **Master Plan** serves technical stakeholders, locked decisions, and phase gating
- Vision is narrative; Master Plan is tabular and decision-focused
- **Action:** Cross-reference Master Plan from Vision (add note: "See Master Plan §4 for locked decisions and execution architecture")

---

### OVERLAP 2: Security-and-Compliance-Framework vs. Licensing-and-Legal-Audit (PIPEDA & AODA)

**Documents Involved:**
- `KrewPact-Security-and-Compliance-Framework.md` (156 KB)
- `KrewPact-Licensing-and-Legal-Audit.md` (108 KB)

**Overlap Description:**

Both documents cover Canadian regulatory compliance (PIPEDA and AODA):

| Compliance Aspect | Licensing Audit | Security Framework |
|------------------|-----------------|-------------------|
| **PIPEDA overview + risk** | ✓ §4 (7.5 KB) | ✓ §3.4 + §4 (8 KB) |
| **AODA/WCAG requirements** | ✓ §5.2 | ✓ §6 (detailed 1.2 KB) |
| **Data residency requirements** | ✓ §4.2 + risk register | ✓ §3.1 + facility map |
| **Cross-border data flow risk** | ✓ Clerk + Vercel (risk #3) | ✓ §3.4 (DPA discussion) |
| **Audit trail requirements** | ✗ Not in Licensing | ✓ §4 (immutable audit design) |
| **Breach notification SLAs** | ✓ 30-day PIPEDA requirement (§4) | ✓ 24-month record requirement (§4.2) |
| **Consent management** | ✓ Mentioned | ✓ Detailed implementation (§4.3) |
| **Privacy request lifecycle** | ✗ Not detailed | ✓ Full workflow diagram (§4.1) |

**Specific Redundancy Examples:**

Licensing §4 (PIPEDA overview):
> "PIPEDA governs personal information collection, use, disclosure, retention, and deletion. Key requirements: consent, transparency, secure storage, timely response to access requests, 30-day notification on breach."

Security §3.4 (PIPEDA implementation):
> "PIPEDA allows electronic consent and communications if [specific conditions]. Automatic deletion at consent expiry managed by CMS."

**Recommendation: KEEP BOTH (different purpose, but cross-reference)**

- **Licensing Audit** = legal risk assessment and vendor compliance matrix
- **Security Framework** = implementation roadmap and architectural controls
- These are complementary: Licensing identifies the requirement, Security specifies the technical solution
- **Action:**
  - Add section in Security Framework (§4.1) explicitly referencing Licensing Audit as the authoritative legal requirement
  - Add table linking each Licensing requirement to its Security implementation
  - Remove duplication of PIPEDA overview (keep only in Licensing; reference from Security)

---

### OVERLAP 3: Technology Stack ADRs (CI/CD) vs. DevOps-and-CI-CD Document

**Documents Involved:**
- `KrewPact-Technology-Stack-ADRs.md` (110 KB) — specifically ADR-014 (CI/CD) and ADR-025 (Testing)
- `KrewPact-DevOps-and-CI-CD.md` (43 KB)

**Overlap Description:**

Both documents specify CI/CD strategy, GitHub Actions, and testing:

| CI/CD Aspect | ADRs Doc | DevOps Doc |
|--------------|----------|-----------|
| **CI/CD platform choice (GitHub Actions)** | ✓ ADR-014 (3.2 KB) | ✓ §1 (1.5 KB) |
| **Decision rationale** | ✓ "GitHub Actions integrates natively..." | ✓ Implied but not restated |
| **Alternatives considered** | ✓ GitLab, CircleCI, Jenkins rejected | ✗ Not in DevOps |
| **Testing strategy** | ✓ ADR-025 (5 KB) | ✓ §2 (3 KB) |
| **Test types (unit, integration, e2e)** | ✓ Vitest, Playwright, k6 | ✓ Same tools, same breakdown |
| **Code quality tooling** | ✓ ESLint, Prettier, SonarQube | ✓ §3 (same) |
| **Coverage targets** | ✓ 70-80% coverage mentioned | ✓ §2.3 (same) |
| **Release management** | ✗ Not in ADRs | ✓ §5 (semver, changelog) |
| **IaC and deployment** | ✗ Not detailed in ADRs | ✓ §4 (Terraform, docker) |
| **Monitoring CI/CD** | ✗ Not in ADRs | ✓ §6 (alerting, dashboards) |

**Specific Redundancy Examples:**

ADR-014:
> "GitHub Actions has been selected for CI/CD. GitHub Actions integrates natively with GitHub repositories, eliminating the need for external CI/CD platforms... Matrix builds enable testing across multiple Node versions automatically."

DevOps §1:
> "KrewPact uses GitHub Actions for CI/CD. Actions integrates natively with repositories. Matrix builds test across multiple Node versions."

**Recommendation: MERGE (ADRs into DevOps, or vice versa)**

- ADR-014 and ADR-025 are decision records that belong in the ADRs document
- DevOps-and-CI-CD repeats these decisions without adding the decision context (why GitHub, why not GitLab?)
- **Action:**
  - Remove duplicated CI/CD and testing content from DevOps doc
  - Keep DevOps as implementation guide (release management, IaC, monitoring)
  - Cross-reference ADR-014 and ADR-025 from DevOps
  - Result: Smaller, cleaner DevOps doc (no decision rehashing)

**Estimated savings:** 2–3 KB of duplication

---

### OVERLAP 4: Integration-Contracts vs. ERPNext-Doctype-Field-Mapping (ERPNext-specific)

**Documents Involved:**
- `KrewPact-Integration-Contracts.md` (106 KB)
- `KrewPact-ERPNext-Doctype-Field-Mapping.md` (20 KB)

**Overlap Description:**

Both specify ERPNext integration, but at different levels:

| ERPNext Aspect | Integration Contracts | Doctype Mapping |
|-----------------|----------------------|-----------------|
| **ERPNext sync overview** | ✓ §1.2 (BullMQ pattern) | ✓ Introduction |
| **43-entity ERPNext mapping** | ✓ Listed in Integration Blueprint (§7) | ✓ Complete doctype crosswalk table (§2) |
| **System of record rules** | ✓ §1.3 (idempotency) | ✓ Integration Rules (§1) |
| **Conflict resolution** | ✓ §1.4 (error handling, circuit breaker) | ✓ "Conflict rule: ERP financial status wins" (§1) |
| **Sync direction (Hub ↔ ERP)** | ✗ High-level (pattern) | ✓ Per-entity direction specified |
| **Custom fields required** | ✗ Not detailed | ✓ 16 custom fields with purpose (§2) |
| **Custom doctypes needed** | ✗ Not detailed | ✓ 8 custom doctypes listed (§2) |
| **Field-level mapping** | ✗ Not in Integration Contracts | ✓ Detailed in §3 (partial sample) |

**Specific Redundancy Examples:**

Integration Contracts §7 (ERPNext integration pattern):
> "ERPNext | API + queue-driven sync | ERP authoritative for AP/AR/PO/invoices/payments/accounting"

Doctype Mapping §1 (system of record):
> "System of record: ERPNext authoritative: AR/AP/PO/Invoices/Payments/GL-facing values. KrewPact authoritative: workflow state, portal interactions, field logs..."

**Recommendation: KEEP BOTH (different purpose, but high integration)**

- **Integration Contracts** = high-level sync architecture, retry/error handling, idempotency, all 6 integrations
- **Doctype Mapping** = deep ERPNext-specific cutover contract, field-level mappings, custom fields/doctypes
- These are complementary layers: Contracts handles "how to sync reliably," Mapping handles "what exactly maps"
- **Action:**
  - Add explicit reference in Integration Contracts §7: "See KrewPact-ERPNext-Doctype-Field-Mapping for detailed field and doctype mappings"
  - Add back-reference in Doctype Mapping: "Sync pattern defined in Integration Contracts §1.1–1.5"
  - Clarify: Integration Contracts is for developers building the sync engine; Doctype Mapping is for ERP admins configuring ERPNext
  - **No merge needed** — they serve different audiences and levels of detail

---

### OVERLAP 5: Master Plan Feature List vs. Feature-Function-PRD-Checklist

**Documents Involved:**
- `KrewPact-Master-Plan.md` (17 KB) — §6 Complete Feature List table
- `KrewPact-Feature-Function-PRD-Checklist.md` (21 KB) — 16 epics with 70+ features

**Overlap Description:**

Both enumerate the same features but in different formats:

| Aspect | Master Plan | Feature PRD |
|--------|-------------|------------|
| **Feature count** | 23 domains (grouped) | 70+ features in 16 epics |
| **Format** | High-level table (features per domain) | Detailed epic-by-epic with acceptance criteria |
| **Roles specified** | ✗ Not in Master Plan | ✓ 9 internal + 4 external roles (§2) |
| **Acceptance criteria** | ✗ Not in Master Plan | ✓ Checkboxes and detailed criteria per feature |
| **Domain view** | ✓ "Contracting, Estimating, Procurement..." | ✗ Not organized by domain |
| **Cross-cutting requirements** | ✗ Not in Master Plan | ✓ §3 (security, audit, reliability, UX, PIPEDA, BCP, telemetry) |

**Specific Example:**

Master Plan §6 (Feature List):
```
| Domain | Features |
| Estimating | Assemblies, cost libraries, labor/material/equipment rates, markups, alternates, allowances, revisions, approval workflows |
```

Feature PRD §5 (Epic 2):
```
### Epic 2: Estimating Engine (16 features)

#### Feature 2.1: Estimate Templates
Functions:
- Create/update/clone templates
- Component-based assembly builder
- Price overrides by division
Acceptance:
- [ ] Template changes don't affect in-flight estimates
- [ ] Soft cost vs hard cost classifications retained
```

**Recommendation: ABSORB (consolidate Master Plan feature table into Feature PRD)**

- Master Plan's feature table is a summarized version of what Feature PRD covers in detail
- Master Plan should focus on locked decisions and architecture (not repeat feature list)
- Feature PRD is the authoritative source for feature scope with acceptance criteria
- **Action:**
  - Remove the "Complete Feature List" table from Master Plan §6
  - Replace with: "See KrewPact-Feature-Function-PRD-Checklist for detailed features, acceptance criteria, and role model"
  - Master Plan keeps: locked decisions, program outcomes, architecture layers, and execution scope (what's in which release)
  - **Result:** Master Plan becomes tighter (4–5 KB shorter) without losing information

**Estimated savings:** 4–5 KB

---

### OVERLAP 6: Blueprint-Gap-Matrix (Small, Self-Contained)

**Document:**
- `KrewPact-Blueprint-Gap-Matrix.md` (2.6 KB)

**Overlap Description:**

This document is tiny and serves a narrow purpose: mapping legacy blueprint coverage to the V2 plan. However, it overlaps with:

1. **Master Plan §1 (Blueprint Alignment)** — Already mentions blueprint references
2. **Feature-Function-PRD-Checklist §1 (Product Definition)** — Already defines what's new vs legacy

**Content of Gap Matrix:**
- Legacy blueprint capabilities → V2 coverage mapping (5 rows)
- Production-critical additions (12 items)
- Open optional enhancements (4 items)

**Recommendation: ABSORB into Master Plan or Feature PRD**

**Option A (RECOMMENDED):** Absorb into Feature PRD §1 as a "Scope vs. Legacy" subsection
- Feature PRD already has §1 (Product Definition)
- Add a "What's New Beyond Legacy Blueprint" subsection
- Adds ~1 KB, removes standalone doc

**Option B:** Absorb into Master Plan as a new subsection after §4 (Locked Decisions)
- Provides legacy continuity narrative
- Adds context for stakeholders familiar with old blueprint

**Action:**
- Move the "Production-Critical Additions" list from Gap Matrix to Feature PRD §1.1
- Move "Open Optional Enhancements" to Feature PRD as "Out of Scope" section
- Delete the Blueprint-Gap-Matrix.md file
- **Result:** One fewer document to maintain, information preserved in feature scope

**Estimated savings:** Removes 2.6 KB file, ~4 KB of duplication

---

### OVERLAP 7: Strategic-Assessment as Meta-Review

**Document:**
- `KrewPact-Strategic-Assessment.md` (16 KB)

**Purpose:**
Meta-review of all 18 docs + existing codebase, identifying contradictions and health.

**Overlap Description:**

Strategic Assessment repeats or summarizes findings already in other documents:

| Finding | Original Doc | Also in Strategic Assessment |
|---------|--------------|------------------------------|
| "ADR-001 says Next.js but code uses Vite" | ADRs doc (implicit), Codebase (explicit) | §2 Part 2 (explicit contradiction identified) |
| "No formal MVP scope" | Execution Board (has phases but no MoSCoW) | §2 (called out as critical gap) |
| "Documentation quality: 8/10" | Implicit across all docs | §1 (explicit rating) |
| "25 ADRs with good context" | ADRs doc itself | §1 (summary) |
| "ERPNext GPL v3 risk" | Licensing Audit (§2, Risk #1) | §1 (summarized) |

**Recommendation: KEEP, but reposition as "Post-Plan Validation" reference**

- Strategic Assessment is not a planning document — it's a health check on the planning pack itself
- It identifies contradictions that need to be fixed in the source documents
- It's useful as a maintenance artifact, not a primary spec
- **Action:**
  - Move to a `/reference/` or `/meta/` folder (if organizing by tier)
  - Rename to `VALIDATION-CHECKLIST-Against-Codebase.md`
  - Add a "Use This Document To" section explaining when to reference it
  - Keep in the pack as a historical record and contradiction finder

---

## Consolidated Overlap Summary Table

| # | Overlap | Documents | Type | Recommendation | Savings |
|---|---------|-----------|------|----------------|---------|
| 1 | Feature scope definition | Vision + Master Plan | Strategy vs. Execution | **KEEP BOTH** (cross-reference) | 0 KB |
| 2 | PIPEDA + AODA compliance | Licensing + Security | Legal Risk vs. Implementation | **KEEP BOTH** (tighten duplication) | 1–2 KB |
| 3 | CI/CD strategy | ADRs + DevOps | Decision vs. Implementation | **MERGE** (remove from DevOps) | 2–3 KB |
| 4 | ERPNext integration | Contracts + Doctype Mapping | High-level vs. Detailed | **KEEP BOTH** (different audiences) | 0 KB |
| 5 | Feature enumeration | Master Plan + Feature PRD | Summary vs. Detailed | **ABSORB** (remove from Master Plan) | 4–5 KB |
| 6 | Legacy blueprint gaps | Gap Matrix (standalone) | Context | **ABSORB** (into Feature PRD §1) | 2.6 KB |
| 7 | Health assessment | Strategic Assessment | Meta-review | **KEEP** (reposition as reference) | 0 KB |

**Total potential savings: 10–13 KB of removable duplication + 1 smaller file consolidated**

---

## Recommended Final Document Structure

### After Consolidation: 14–15 Documents (from 18)

**Tier 1: Strategy & Architecture (10 docs)**
1. `KrewPact-Product-Vision-and-Strategy.md` (89 KB) — UNCHANGED
2. `KrewPact-Licensing-and-Legal-Audit.md` (107 KB) — Minor cross-reference add
3. `KrewPact-Technology-Stack-ADRs.md` (110 KB) — UNCHANGED
4. `KrewPact-Security-and-Compliance-Framework.md` (155 KB) — Add reference table to Licensing
5. `KrewPact-Infrastructure-and-Deployment.md` (70 KB) — UNCHANGED
6. `KrewPact-Integration-Contracts.md` (106 KB) — UNCHANGED
7. `KrewPact-DevOps-and-CI-CD.md` (40 KB) — Remove ADR duplication, tighten to 37 KB
8. `KrewPact-Monitoring-and-Observability.md` (30 KB) — UNCHANGED
9. `KrewPact-Cost-and-Vendor-Analysis.md` (51 KB) — UNCHANGED
10. `KrewPact-Strategic-Assessment.md` (16 KB) — Reposition as `/reference/VALIDATION-CHECKLIST.md`

**Tier 2: Product Specification (4–5 docs)**
11. `KrewPact-Master-Plan.md` (12 KB) — Remove feature table, tighten to 12 KB
12. `KrewPact-Feature-Function-PRD-Checklist.md` (22 KB) — Add legacy mapping section, tighten to 24 KB
13. `KrewPact-Backend-SQL-Schema-Draft.sql` (66 KB) — UNCHANGED
14. `KrewPact-ERPNext-Doctype-Field-Mapping.md` (20 KB) — UNCHANGED
15. `KrewPact-API-Acceptance-and-Test-Matrix.md` (27 KB) — UNCHANGED

**Supporting Docs (removed from main pack)**
- `KrewPact-Blueprint-Gap-Matrix.md` (2.6 KB) — ABSORB into Feature PRD
- `KrewPact-Forms-Registry.md` (19 KB) — **KEEP** (forms not redundant)
- `KrewPact-Execution-Board.md` (17 KB) — **KEEP** (timeline/sequencing unique)
- `README.md` (8.1 KB) — KEEP (index)

**Optional: Reference/Meta Folder**
- `VALIDATION-CHECKLIST-Against-Codebase.md` (formerly Strategic Assessment)
- `REDUNDANCY-AND-OVERLAP-ANALYSIS.md` (this document)

---

## Implementation Priority

### Phase 1: Low-Risk, High-Confidence (Do First)
1. **Remove CI/CD duplication from DevOps doc** — Remove ADR-014 and ADR-025 repeats
   - Time: 30 minutes
   - Risk: Very low (just deleting duplicate text, not moving)
2. **Absorb Blueprint-Gap-Matrix into Feature PRD** — Move legacy mapping to Feature PRD §1
   - Time: 45 minutes
   - Risk: Low (just consolidation)
3. **Absorb Master Plan feature table into Feature PRD** — Replace table with cross-reference
   - Time: 30 minutes
   - Risk: Low (Feature PRD already has detailed version)

### Phase 2: Medium-Confidence (Do Second)
4. **Cross-reference PIPEDA between Licensing and Security** — Add reference table
   - Time: 45 minutes
   - Risk: Low (additive, not destructive)
5. **Reposition Strategic Assessment as reference/meta doc** — Move to subfolder
   - Time: 15 minutes
   - Risk: Very low (just moving file)

### Phase 3: Optional Polish (Do if Time)
6. **Update README.md index** — Reflect new structure and removed duplication
7. **Add explicit "Read Order" notes** — Link related docs where overlap remains (Vision → Master Plan)

---

## Redundancy Health Metrics

| Metric | Before | After |
|--------|--------|-------|
| **Total documents** | 18 | 14–15 |
| **Total lines of code/text** | ~23,152 | ~23,020 (−0.6%, minimal impact) |
| **Total size** | 860 KB | 850 KB (−1.2%) |
| **Duplicated content** | ~13 KB | ~2 KB (mostly intentional cross-refs) |
| **Cross-referencing clarity** | Good | Excellent (+3 reference tables) |
| **Redundancy ratio** | 1.5% | 0.2% |

**Conclusion:** The pack is already lean. The 13 KB of removable duplication is modest, but consolidation will improve clarity and reduce maintenance burden.

---

## Key Principles for Consolidation

1. **Preserve strategic/implementation boundary** — Vision stays at principle level; Master Plan and PRD stay at execution level. No merging across this boundary.

2. **Keep decision rationale distinct** — ADRs document "why," DevOps document "how." Don't merge unless both focus on "how."

3. **Maintain audience separation** — Licensing for legal stakeholders, Security for architects, DevOps for engineers. Don't consolidate if audiences differ.

4. **Reference, don't duplicate** — When two docs cover the same thing (Contracts + Doctype Mapping for ERPNext), add explicit references rather than consolidating.

5. **Size alone doesn't justify consolidation** — Small documents like Blueprint-Gap-Matrix are only candidates if their content truly duplicates larger docs. If content is unique (even if small), keep it.

---

## Conclusion

**No catastrophic redundancy.** The 18-document pack is well-organized with clear tier separation (Strategy/Architecture vs. Product Spec). The 7 overlaps identified are primarily:
- **Cross-functional references that need tightening** (PIPEDA, CI/CD)
- **Intentional layering** (Contracts vs. Doctype Mapping, Vision vs. Master Plan)
- **One small consolidation opportunity** (Blueprint-Gap-Matrix)

**Implement the Phase 1 consolidations** (CI/CD deduplication, Blueprint absorb, Master Plan feature table removal) for a quick 3–4 KB cleanup and improved clarity. The remaining overlaps are best served by improved cross-referencing rather than merging.

**Final recommendation:** Proceed with Phase 1 (Low Risk) and Phase 2 (Medium Confidence) consolidations. This will reduce the pack to 14 focused documents with excellent cross-referencing and minimal redundancy.
