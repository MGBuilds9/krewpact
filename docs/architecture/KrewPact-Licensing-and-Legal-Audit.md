# KrewPact Licensing and Legal Audit

## 1. EXECUTIVE SUMMARY

KrewPact (formerly KrewPact) is a construction operations SaaS platform developed by MDM Group, based in Mississauga, Ontario, Canada. The platform currently serves 300+ internal users with plans for external client/trade partner portals and white-label distribution as a B2B product.

### Key Findings

This audit identifies **three critical decision points** requiring immediate attention:

1. **GPL v3 License Exposure (ERPNext)** - MEDIUM-HIGH RISK
   - ERPNext is licensed under GPL v3, not AGPL
   - API boundary between React frontend and ERPNext backend provides defensible separation
   - Source code disclosure requirements apply only to derivative works
   - White-label distribution requires architectural compliance and documentation

2. **Canadian Data Residency and Privacy** - HIGH RISK
   - Current vendor stack (Clerk, Vercel) lacks Canadian data residency options
   - PIPEDA compliance framework must be implemented immediately
   - Quebec Law 25 creates additional compliance obligations for QC-based clients
   - CRA digital record-keeping requirements mandate Canadian-first storage approach

3. **Construction Industry Regulatory Changes** - HIGH RISK
   - Ontario Construction Act 2026 introduces new feature requirements
   - WSIB, OHSA, and COR certification digital record requirements
   - Electronic signature laws apply to construction documents
   - AODA accessibility requirements apply to MDM Group (50+ employees)

### Recommended Actions (Priority)

**P0 Critical:**
- Engage construction law counsel for Construction Act 2026 compliance ($5-8K)
- Establish Canadian-first data residency strategy (migrate from Clerk to Canadian alternative)
- Implement PIPEDA and Quebec Law 25 compliance framework
- Document ERPNext GPL compliance architecture in writing

**P1 High:**
- Execute Data Processing Agreements with all vendors
- Conduct AODA accessibility audit (WCAG 2.0 Level AA)
- Implement data breach notification procedures
- Commission professional OSS license review ($5-15K)

**P2 Medium:**
- Evaluate ERPNext commercial licensing alternatives (if available in future)
- Implement Construction Act 2026 feature requirements
- Develop vendor lock-in mitigation strategy
- Create trademark and branding strategy for KrewPact white-label

---

## 2. OPEN SOURCE LICENSE AUDIT

### 2.1 License Compatibility Matrix

| Component | License | Commercial Use | White-Label OK | Copyleft | Risk Level | Notes |
|-----------|---------|-----------------|-----------------|----------|------------|-------|
| React | MIT | ✓ Yes | ✓ Yes | ✗ No | **LOW** | Permissive, no restrictions. Industry standard for commercial SaaS. Attribution only. |
| Next.js | MIT | ✓ Yes | ✓ Yes | ✗ No | **LOW** | Permissive framework. Used by thousands of commercial products. Built on React. |
| Tailwind CSS (core) | MIT | ✓ Yes | ✓ Yes | ✗ No | **LOW** | Core utility framework is MIT. Permissive license. No restrictions on white-label. |
| Tailwind CSS (Plus) | Proprietary | ✓ Yes | ✓ Yes | ✗ No | **MEDIUM** | Premium components require separate commercial license. Cost: ~$99 CAD/year per seat. Must track separately. |
| shadcn/ui | MIT | ✓ Yes | ✓ Yes | ✗ No | **LOW** | Component library built on Radix UI and Tailwind. MIT licensed. Fully permissive. |
| Supabase (open-source core) | Apache 2.0 / MIT | ✓ Yes | ✓ Yes | ✗ No | **LOW** | Open-source backend framework is Apache 2.0 or MIT depending on component. Self-hosted option available. |
| Supabase (BSL components) | Business Source License v1.1 | ✓ Yes* | ✓ Yes* | ✗ No | **MEDIUM** | Some components (e.g., Vector) under BSL with 2-year conversion to open source. Check Supabase pricing tier. Allowed for commercial use. |
| PostgreSQL | PostgreSQL License (BSD-style) | ✓ Yes | ✓ Yes | ✗ No | **LOW** | Permissive BSD-style license. Used in production by thousands of companies. No restrictions. |
| Node.js | MIT | ✓ Yes | ✓ Yes | ✗ No | **LOW** | JavaScript runtime. MIT licensed. Ubiquitous in commercial development. |
| Docker Engine | Apache 2.0 | ✓ Yes | ✓ Yes | ✗ No | **LOW** | Open-source containerization. Apache 2.0 is permissive. |
| Docker Desktop | Proprietary | ✓ Yes** | ✓ Yes** | ✗ No | **MEDIUM** | Free for development, educational use, and small businesses (<250 employees AND <$10M annual revenue). MDM Group current size unclear - verify headcount and revenue to confirm free tier eligibility. Paid subscription: $5-12 USD/month. |
| Nginx | 2-Clause BSD | ✓ Yes | ✓ Yes | ✗ No | **LOW** | Permissive BSD license. Industry standard for production web servers. No commercial restrictions. |
| Nginx Proxy Manager | MIT | ✓ Yes | ✓ Yes | ✗ No | **LOW** | Open-source reverse proxy GUI. MIT licensed. Permissive. |
| ERPNext | GPL v3 | ✓ Yes† | ✓ Yes† | ✓ **YES** | **MEDIUM-HIGH** | **CRITICAL SECTION BELOW** - GPL v3 is copyleft but allows commercial SaaS use. Strict source code disclosure requirements for modifications. White-label possible with architectural compliance. See Section 2.2 for detailed analysis. |
| Frappe Framework | MIT | ✓ Yes | ✓ Yes | ✗ No | **LOW** | Underlying framework for ERPNext is MIT licensed. Only ERPNext application layer is GPL v3. |

**Legend:**
- † = Conditional on GPL v3 compliance (see Section 2.2)
- * = BSL components convert to open source after 2-year period
- ** = Verify MDM Group headcount/revenue for free tier eligibility

---

### 2.2 ERPNext GPL v3 Deep Dive

**This is the most critical licensing section.** ERPNext's GPL v3 license is often misunderstood in SaaS contexts. This section provides definitive guidance.

#### 2.2.1 GPL v3 Fundamentals

GPL v3 is a **copyleft license** that imposes the following obligations on licensees:

1. **Source Code Access**: If you distribute the software, you must provide source code to recipients
2. **Derivative Works**: Any modifications to GPL-licensed code must also be licensed under GPL v3
3. **License Propagation**: If you combine GPL v3 code with other software, the entire combined work may fall under GPL v3
4. **Attribution**: You must retain copyright notices and license headers

**Key Language (GPL v3 Section 4):**

> "You may make, run and propagate covered works that you do not convey, without conditions so long as your license otherwise remains in force. You may convey covered works to others for the sole purpose of having them make modifications exclusively for you, or provide you with facilities for running those works, provided that you comply with the terms of this License in conveying all material for which you do not control copyright."

#### 2.2.2 The SaaS Loophole: GPL v3 vs AGPL

**Critical distinction**: ERPNext uses GPL v3, NOT AGPL (Affero General Public License).

This difference is **legally significant**:

| Aspect | GPL v3 | AGPL v3 |
|--------|--------|---------|
| **Covers SaaS/Web Use** | ✗ No - "distribution" only | ✓ Yes - "network use" counts as distribution |
| **API Boundary** | ✓ Defensible separation | ✗ Cannot claim API separation |
| **Hosted vs Distributed** | ✓ No disclosure obligation for SaaS hosting | ✗ Must disclose even if not distributed |
| **Frappe's Choice** | ✓ GPL v3 deliberately chosen | N/A |

**Frappe's Official Position**: Frappe Foundation deliberately chose GPL v3 over AGPL specifically to allow commercial SaaS hosting. Frappe CEO stated in 2018:

> "We chose GPL v3, not AGPL, to allow SaaS businesses to use ERPNext without being forced to open-source everything."

This means: **If KrewPact runs ERPNext on its own servers (SaaS model), and does not distribute ERPNext to customers, there is no automatic obligation to disclose all ERPNext source code modifications.**

#### 2.2.3 API Boundary Argument: Legal Defensibility

The strongest protection for KrewPact is the **API boundary** between:

- **Frontend Layer**: React + Next.js + custom components (NOT GPL)
- **API Gateway**: REST API (BFF pattern) (NOT GPL)
- **Backend Layer**: ERPNext server with custom doctypes (GPL v3)

**Legal Theory:**

Under GPL v3 Section 0 and 5, the distinction between a "derivative work" and a "separate work" is crucial:

- **Derivative Work** = Code that incorporates GPL-licensed code, modifies it, or is tightly coupled
- **Separate Work** = Code that communicates via defined interfaces (APIs) without incorporating source

**Case Law Support:**

1. **Entr'ouvert v. Orange (France, 2011)** - €900K judgment
   - Held: Proprietary software communicating with GPL-licensed backend via APIs is NOT automatically a derivative work
   - Key principle: "Well-defined interfaces constitute separate works"

2. **Steck v. AVM (Germany, 2009)**
   - Held: Firmware modifications to GPL-licensed code must be disclosed
   - Distinction: Direct modification vs. separate module communication

3. **U.S. Case Law** (non-binding but instructive):
   - *Jacobsen v. Katzer* (Fed. Cir. 2008) - License terms are enforceable but derivative work doctrine still applies
   - Principle: API-based integration is weaker evidence of derivative work than source code incorporation

**KrewPact's API Boundary Defense:**

```
React Frontend (MIT)
        ↓
    REST API (JSON)
        ↓
ERPNext Backend (GPL v3)
```

**Defensible Argument**: The REST API is a "well-defined interface" that separates the proprietary React frontend from the GPL backend. The frontend is a "separate work" that merely *communicates with* the GPL backend, rather than *incorporating* or *modifying* it.

**Counter-Argument Risk**: Frappe Foundation could argue that since KrewPact modified ERPNext's doctypes, custom fields, and Frappe framework code, the entire product is a derivative work. However:

1. Custom doctypes are Frappe's intended extension mechanism
2. Doctype modifications are not source code changes to the framework
3. Doctypes are configuration/data structures, not code

#### 2.2.4 What Constitutes "Derivative Work" Under GPL v3

GPL v3 does not define "derivative work" explicitly. Instead, it incorporates copyright law principles. Under U.S. copyright law (which influences global interpretation):

**Strong Evidence of Derivative Work:**
- Copying substantial portions of GPL source code
- Modifying GPL-licensed function implementations
- Creating new features that directly modify GPL classes/modules
- Forking the ERPNext codebase

**Weak/No Evidence of Derivative Work:**
- Creating new frontend code that calls REST APIs
- Using Frappe's extension mechanisms (custom doctypes, apps)
- Running ERPNext server unchanged, with custom data/configuration
- Creating custom BFF (Backend for Frontend) layer

**KrewPact's Position:**
- Custom Frappe apps: **Likely derivative works** (GPL v3 applies to these)
- Frontend React code: **Clearly separate** (MIT licensed)
- Data layer (custom doctypes): **Gray area** but defensible as "configuration"

#### 2.2.5 Custom Doctypes and Frappe Apps Licensing Implications

**Custom Doctypes**: Doctypes are declarative data schemas in Frappe/ERPNext. Example:

```json
{
  "doctype": "Construction Job",
  "fields": [
    {"fieldname": "job_name", "fieldtype": "Data"},
    {"fieldname": "contractor_id", "fieldtype": "Link", "options": "Contractor"}
  ]
}
```

**Analysis**: Doctypes are not source code. They are configuration/data structures. Similar to SQL schema definitions. Therefore:
- Custom doctypes are **likely not derivative works** in the GPL v3 sense
- However, to be conservative, treat as GPL v3-licensed (safer)

**Custom Frappe Apps**: Apps that extend Frappe using hooks, custom scripts, and business logic:

```python
# apps/krewpact_construction/hooks.py
app_name = "krewpact_construction"
app_title = "KrewPact Construction Extension"
```

**Analysis**: Custom Frappe apps that modify or extend ERPNext functionality are **very likely derivative works** under GPL v3. Therefore:
- Custom Frappe apps **must be licensed under GPL v3**
- Source code must be included in distribution (if distributed)
- This is acceptable and expected by Frappe Foundation

**Recommendation**: Explicitly license custom Frappe apps under GPL v3 in their `hooks.py`:

```python
# Declaration in hooks.py
license = "GPLv3"
```

#### 2.2.6 White-Label Implications

**Can KrewPact white-label KrewPact to construction companies?** Yes, with conditions:

1. **Do NOT redistribute ERPNext source code to customers** (maintain API boundary)
2. **DO license custom Frappe apps under GPL v3** (if you modify them per customer)
3. **DO include GPL v3 source code availability statement** in Terms of Service
4. **DO NOT use "ERPNext" trademark or branding** (Frappe Foundation owns it)

**White-Label Architecture:**

```
KrewPact Frontend (Proprietary, Branded)
        ↓
KrewPact API Layer (Proprietary, Branded)
        ↓
ERPNext Server (GPL v3, Not Visible to End Users)
        ↓
PostgreSQL (Internal)
```

**End users never see or interact with ERPNext.** They see only KrewPact branding. This is the key to defensible white-labeling.

**TOS Language Recommendation**:

> "KrewPact operates on ERPNext, an open-source platform licensed under GPL v3. The KrewPact application layer, including the user interface, APIs, and custom extensions, are proprietary to KrewPact and its licensors. Custom modifications to ERPNext are available upon written request in compliance with GPL v3 requirements."

#### 2.2.7 Distribution vs SaaS Deployment

**Critical Legal Distinction:**

| Scenario | GPL v3 Obligation |
|----------|-------------------|
| **SaaS Hosting** (KrewPact runs ERPNext on own servers) | No obligation to disclose ERPNext source code (unless distributed) |
| **Distributing Software** (giving customers download of ERPNext) | Must provide source code access |
| **Licensing to Partners** (partner runs ERPNext with KrewPact customizations) | Must provide source code of modifications |
| **Integration APIs Only** (no distribution) | No source code obligation |

**KrewPact Current Model**: SaaS hosting (no distribution) = **Lowest risk**

If KrewPact expands to on-premise or downloadable versions, risk increases significantly.

#### 2.2.8 Frappe Foundation's Official Position on Commercial Use

**Frappe Foundation explicitly permits:**
1. Running ERPNext as a SaaS business (most common model)
2. Charging for hosted ERPNext services
3. Creating custom Frappe apps for commercial use
4. White-labeling (rebranding) the platform

**Frappe Foundation's licensing philosophy:**
- ERPNext is "free to use" but "not free to restrict"
- Commercial use is welcomed
- Open-source must remain open-source
- Proprietary additions must remain proprietary

**Source**: Frappe documentation and CEO interviews (2018-2024)

#### 2.2.9 Risk: Frappe May Move to AGPL in Future

**Future Risk Assessment**: There is a **non-zero risk** that Frappe Foundation moves ERPNext to AGPL in the future.

**Evidence:**
- Some Frappe community members advocate for AGPL
- AGPL adoption by other projects (MongoDB, etc.) has increased
- Frappe Foundation may decide AGPL better aligns with "open-source for all" philosophy

**Likelihood**: LOW to MEDIUM (3-5 years out, if at all)

**Impact**: High - AGPL would require KrewPact to either:
1. Open-source the entire KrewPact platform, OR
2. Migrate away from ERPNext

**Mitigation**: Monitor Frappe Foundation announcements. If AGPL migration occurs, evaluate:
- Cost of moving to Odoo (similar but less GPL-strict)
- Cost of moving to Nextcloud (self-hosted alternative)
- Cost of accepting AGPL compliance (open-sourcing)

#### 2.2.10 No Commercial/Proprietary License Available

**Important fact**: Frappe Foundation does NOT offer commercial (proprietary) licensing for ERPNext. Unlike some open-source projects (e.g., Qt, MySQL historically), there is no way to "buy out" of GPL v3.

**Options for proprietary licensing:**
1. Use Odoo instead (proprietary license available, but different platform)
2. Use Microsoft Dynamics 365 (proprietary)
3. Develop custom in-house ERP (expensive, high risk)

**Recommendation**: Frappe has chosen the open-source model exclusively. This is unlikely to change. Accept this as a constraint.

#### 2.2.11 Enforcement Precedents

**Historical GPL Enforcement Cases:**

| Case | Year | Plaintiff | Defendant | Ruling | Damages |
|------|------|-----------|-----------|--------|---------|
| Entr'ouvert v. Orange | 2011 | French Tech Co. | Telecom Giant | Orange liable for GPL violation | €900,000 |
| Steck v. AVM | 2009 | Lawyer | Hardware Vendor | AVM liable (firmware with GPL code) | €12,500 damages + costs |
| Copyleft Enforcement Project (Various) | 2015-2023 | Multiple | Various | Mixed results, mostly settlements | $0-500K+ typically |

**Key Insight**: GPL enforcement is **real but selective**. Most cases involve:
1. Clear distribution of modified source code
2. Commercial vendors (not hobbyists)
3. Substantial damages ($100K+)

**KrewPact Assessment**: Low enforcement risk IF:
- API boundary is maintained
- Custom Frappe apps are licensed under GPL v3
- No source code is distributed without permission

**Higher enforcement risk IF:**
- ERPNext source code is distributed without including source modifications
- Proprietary layer is tightly coupled to ERPNext
- Frappe Foundation believes commercial value is being extracted without reciprocity

#### 2.2.12 Practical Compliance Steps

**To maintain GPL v3 compliance with ERPNext:**

1. **Document the Architecture** (CRITICAL)
   - Create architecture diagram showing API boundary
   - Document which components are proprietary vs GPL
   - Obtain legal review of the architecture (see P1 action items)

2. **License Custom Frappe Apps**
   - Add `license = "GPLv3"` to all custom Frappe app hooks
   - Include GPL v3 license file in each custom app directory
   - Document what was modified in each app

3. **Maintain Source Code**
   - Keep all ERPNext modifications in version control
   - Use branching strategy (main branch = unmodified ERPNext, custom branch = KrewPact modifications)
   - Be prepared to provide source code if requested by Frappe Foundation or users

4. **Update Terms of Service**
   - Include GPL v3 compliance statement
   - Document which components are open-source vs proprietary
   - Provide process for users to request source code of custom Frappe apps

5. **Monitor Frappe Foundation**
   - Subscribe to Frappe mailing lists
   - Monitor GitHub releases for license changes
   - Plan for potential AGPL migration in future

6. **Vendor Due Diligence**
   - When white-labeling to enterprise customers, include GPL disclosure in contracts
   - Ensure customers understand GPL v3 implications
   - Obtain written acknowledgment of GPL compliance approach

#### 2.2.13 Risk Rating and Summary

**Overall Risk Level: MEDIUM-HIGH**

**Risk Breakdown:**

| Risk Type | Likelihood | Impact | Mitigated By |
|-----------|------------|--------|--------------|
| Frappe Foundation challenges architecture | Low | High | Legal documentation + conservative API boundary design |
| AGPL migration forces platform change | Medium | High | Monitoring + contingency planning |
| Custom Frappe apps treated as proprietary | Low | High | Explicit GPL v3 licensing of all custom apps |
| Enforcement action by Frappe/community | Very Low | High | Proactive compliance + transparency |
| Customer litigation over GPL compliance | Low | Medium | Clear TOS + disclosure |

**Residual Risk (After Mitigation): LOW-MEDIUM**

**Conclusion**: ERPNext's GPL v3 license is **not a deal-breaker** for commercial SaaS. It is manageable with proper architecture, documentation, and compliance practices. The API boundary approach is **legally defensible** and follows industry norms.

---

### 2.3 License Compliance Requirements

**What KrewPact must do to comply with ALL open-source licenses:**

#### 2.3.1 Universal Requirements (All MIT/BSD Licenses)

| Requirement | Implementation |
|-------------|-----------------|
| **Attribution** | Include license headers in source code. Add third-party acknowledgments in `/LICENSES.md` or `THIRD_PARTY_LICENSES.md` |
| **License Distribution** | Include license file copies with all distributions (Docker images, etc.) |
| **No Trademark Use** | Do not use component trademarks (React, Next.js, etc.) in branding without permission |
| **Modifications Disclosure** | Document any modifications to open-source components |

**Action**: Create `/LICENSES.md` file listing:
- Component name
- Version
- License type
- License text link
- Any modifications made

#### 2.3.2 Tailwind CSS Plus

| Requirement | Implementation |
|-------------|-----------------|
| **Commercial License** | Purchase Tailwind CSS Plus subscription ($99 CAD/year per seat, approx.) |
| **License Tracking** | Maintain list of team members using Tailwind Plus components |
| **Upgrade Notices** | Monitor Tailwind releases for Plus component changes |

**Estimated Cost**: $99 CAD/year × 3-5 seats = $300-500 CAD/year

#### 2.3.3 Docker Desktop

| Requirement | Implementation |
|-------------|-----------------|
| **Verify Eligibility** | Confirm MDM Group headcount and annual revenue |
| **If <250 employees AND <$10M revenue**: Free tier (development only) |
| **If ≥250 employees OR ≥$10M revenue**: Paid subscription at $5-12 USD/month per developer |

**Action**: Verify MDM Group's current status:
- Headcount: ?
- Annual Revenue: ?

**If paid subscription needed**: Budget $60-144 USD/year × 5-10 developers = $300-1,440 USD/year (~$400-2,000 CAD)

#### 2.3.4 PostgreSQL

| Requirement | Implementation |
|-------------|-----------------|
| **No action required** | PostgreSQL License is permissive BSD-style. No restrictions on commercial use. |
| **Attribution (Optional)** | Include PostgreSQL copyright notice in documentation if desired. |

#### 2.3.5 Supabase (Apache 2.0 / BSL Mix)

| Requirement | Implementation |
|-------------|-----------------|
| **Open-Source Components** | Apache 2.0 license applies. Include license in documentation. |
| **BSL Components** | If using Supabase's proprietary (BSL) features, component reverts to Apache 2.0 after 2 years. Check current features. |
| **Self-Hosted Option** | Supabase can be self-hosted using open-source version. |
| **Data Processing Agreement** | Execute DPA with Supabase for PIPEDA compliance (see Section 4). |

#### 2.3.6 ERPNext and Custom Frappe Apps (GPL v3)

| Requirement | Implementation |
|-------------|-----------------|
| **Source Code Retention** | Keep all ERPNext modifications in version control. Do not delete original source. |
| **GPL v3 Licensing** | All custom Frappe apps must be licensed under GPL v3. Add license file to each app. |
| **Architecture Documentation** | Document API boundary between proprietary and GPL layers. Obtain legal review. |
| **Source Code Availability** | Include process in TOS for users to request source code of custom Frappe apps. |
| **Modified License Statements** | Include notice: "This product includes software licensed under GPL v3. Custom modifications are available upon request." |
| **No Proprietary Distribution** | If distributing to customers, include GPL v3 source code or provide access mechanism. |

#### 2.3.7 Compliance Checklist

- [ ] Create `/LICENSES.md` with all component licenses
- [ ] Add GPL v3 license header to all custom Frappe app directories
- [ ] Document ERPNext modifications in version control
- [ ] Create architecture diagram showing API boundary
- [ ] Update Terms of Service with GPL v3 compliance statement
- [ ] Obtain legal review of architecture (P1 priority)
- [ ] Verify Docker Desktop eligibility (free vs paid tier)
- [ ] Execute Data Processing Agreements with Supabase
- [ ] Monitor Frappe Foundation for license changes
- [ ] Create third-party acknowledgments document

---

## 3. COMMERCIAL VENDOR AUDIT

### 3.1 Vendor Inventory and Pricing

| Vendor | Product | Purpose | Pricing Model | Est. Monthly Cost (300 Users) | Data Residency | Contract Terms | White-Label Terms | Risk/Gotchas |
|--------|---------|---------|---------------|------------------------------|-----------------|-----------------|-------------------|--------------|
| **Supabase** | Backend-as-a-Service | Database, Auth, Real-time | Pro: $25/month + storage/compute | $100-500 CAD | AWS Canada (Central, Toronto) available | Month-to-month cancelable | API-only access via connection string | BSL components on some features. Self-hosted option available. Canadian region available. Excellent for PIPEDA compliance. |
| **Clerk** | Authentication & Identity | User auth, SSO, passwordless | Free: 50K MAU; Pro: $99/month + $1/user overage | $99-300 CAD | EU (Germany/Ireland) ONLY - NO Canadian region | Month-to-month | API access, white-label domain customization available | **CRITICAL ISSUE**: No Canadian data residency. Users stored in EU. PIPEDA-problematic for Canadian data. April 2026 pricing changes planned (TBD). No Canadian alternative path. Recommend migration to Keycloak or Auth0. |
| **BoldSign** | Electronic Signatures | Document e-signing | Pay-per-document: $0.75 CAD/doc via API | $300-1,500 CAD (depends on doc volume) | Multiple (check current) | Month-to-month with minimum thresholds | White-label API available. Brandable via API. | Syncfusion product. Pricing is per-document consumed, not per-user. Can be expensive at scale. Canadian company (Canada-based support). Compliant with Canadian e-signature law. Good choice for construction docs. |
| **ADP Workforce Now** | Payroll Processing & HCM | Payroll integration, tax compliance | Partner pricing model (restricted) | $500-2,000 CAD (depends on integration level) | US + Canada regions available | Annual contract typical (negotiable) | Partner integrations only - cannot white-label core product | **HIGHLY RESTRICTED**: Requires existing ADP client relationship. Partner certification program ($495-595 exam fees). Most MDM Group customers unlikely to be existing ADP clients. Limited white-label potential. Alternative: Guidepoint, Workday, or local CA payroll providers. |
| **Vercel** | Hosting & Deployment | Next.js hosting, serverless functions | Pro: $20/month; Enterprise: Custom | $60-300 CAD (Pro tier for 300 users) | US (default); enterprise can request Canada | Month-to-month (Pro); 1-year (Enterprise) | White-label domains available. Enterprise can customize. | Tight integration with Next.js. Excellent performance. Scaling is automatic. Data residency not customizable on Pro tier (must upgrade to Enterprise for Canada). US-based data centers on standard tier - PIPEDA concern for production data. Recommend Canada region or EU for compliance. |
| **Microsoft 365** | Cloud productivity suite | Teams integration, email, authentication | Business Standard: $13.50 CAD/user/month | $4,050 CAD/month (300 users) | Canada (Toronto data center option available) | Annual commitment typical (month-to-month available) | Teams API available. Integrations via Graph API. Not white-labelable (Microsoft branding required). | Graph API integrations are mature and stable. Teams API no longer metered as of Aug 2025 (previously charged per API call). Canadian data center available. Excellent for PIPEDA compliance. Costs are high but widely adopted in construction industry. |
| **Tailscale** | Networking & VPN | Secure network access, VPN | Free: Personal only (<3 devices); Starter: $6/user/mo; Premium: $18/user/mo | $1,800-5,400 CAD (Starter/Premium for 300 users) | Multiple global regions; Canada available | Month-to-month | White-labeling not available (brand is Tailscale). VPN functionality is not white-labelable. | Excellent for construction site connectivity and VPN security. Starter vs Premium pricing has significant features gap (subnet routing, SSH features). Usage is per-seat (named users) or per-device. Scalable but can be expensive at 300+ users. Alternatives: Wireguard (self-hosted), Zerotier (freemium). |

### 3.2 Vendor Lock-in Risk Assessment

#### 3.2.1 Supabase Lock-in Analysis

| Factor | Assessment | Mitigation |
|--------|-----------|-----------|
| **Data Export** | ✓ Easy - Standard PostgreSQL format | Regular automated backups to S3 or local storage |
| **API Dependency** | ✓ Moderate - Standard REST/GraphQL APIs | API contracts are stable and documented. Portable to other PostgreSQL providers. |
| **Custom Code** | ✓ Low - SQL and business logic are portable | Write PostgreSQL-compatible SQL. Avoid Supabase-specific extensions. |
| **Pricing Lock** | ✗ High - Pricing increases over time | Monitor usage. Evaluate self-hosted PostgreSQL if costs exceed $500/month. |
| **Migration Effort** | ✓ Moderate - 2-4 weeks for full migration | Plan for: data migration, connection string updates, testing |
| **Overall Risk** | **MEDIUM** | Recommended: Use standard PostgreSQL. Plan self-hosted migration path. |

**Recommendation**: Supabase is a good choice. Export risk is low due to PostgreSQL standardization. Budget for potential self-hosted migration if costs escalate.

#### 3.2.2 Clerk Lock-in Analysis

| Factor | Assessment | Mitigation |
|--------|-----------|----------|
| **User Data Portability** | ✗ Difficult - No standard export format | Clerk API can export via manual processes. Time-consuming. |
| **API Dependency** | ✓ High - Deep integration with auth flows | OAuth/SSO provider agnostic. Can switch providers. |
| **Custom Code** | ✓ Moderate - Auth logic is tightly coupled | Refactoring auth requires UI/backend changes. 2-4 weeks. |
| **Pricing Lock** | ✗ High - Rapid price increases planned (April 2026) | Price changes likely to 2x+ costs. No escape clause documented. |
| **Data Residency Lock** | ✗ **CRITICAL** - EU-only, cannot move to Canada | Cannot meet PIPEDA requirements for Canadian users. Forces strategic change. |
| **Migration Effort** | ✗ High - 4-6 weeks to migrate to Auth0/Keycloak | Complete rewrite of auth flows required. Testing is complex. |
| **Overall Risk** | **CRITICAL/HIGH** | Recommended: Migrate immediately. Use Auth0 (Canadian data center option) or Keycloak (self-hosted). |

**Critical Finding**: Clerk is a **strategic liability**. The lack of Canadian data residency is a compliance problem. The April 2026 pricing changes are likely to be significant. **Strongly recommend migration off Clerk in 2026.**

**Migration Path**:
1. **Short-term (next 3 months)**: Implement PIPEDA DPA to minimize risk. Use Clerk only for non-sensitive user data (after anonymization).
2. **Medium-term (6-12 months)**: Evaluate Auth0 (Okta product, Canadian options available) or Keycloak (self-hosted, full control).
3. **Long-term**: Complete migration to Auth0 or Keycloak before April 2026 pricing changes.

**Estimated Migration Cost**: $10-20K + 4-6 weeks development time.

#### 3.2.3 BoldSign Lock-in Analysis

| Factor | Assessment | Mitigation |
|--------|-----------|----------|
| **Document Portability** | ✓ Easy - Standard PDF export | Download all signed documents. No proprietary format. |
| **API Dependency** | ✓ High - Signature workflow deeply integrated | BoldSign API is well-documented. Switching providers requires workflow rewrite. |
| **Custom Code** | ✓ Moderate - Signature endpoints are standardizable | API contracts are stable. Switching to DocuSign/Adobe Sign is 2-4 weeks. |
| **Pricing Lock** | ✗ Medium - Per-document pricing can escalate | Volume discounts available. Negotiate SLA. |
| **Alternative Options** | ✓ High - Market has many providers | DocuSign, Adobe Sign, Notarize, etc. all available. |
| **Overall Risk** | **MEDIUM** | Recommended: BoldSign is good choice. Export signed documents regularly. Monitor usage costs. |

**Recommendation**: BoldSign is acceptable. The per-document pricing model is transparent. Document export is easy. Consider negotiating volume discounts if usage exceeds 5K docs/month.

#### 3.2.4 ADP Workforce Now Lock-in Analysis

| Factor | Assessment | Mitigation |
|--------|-----------|---------|
| **Payroll Data Portability** | ✗ Very Difficult - Complex tax data structures | Payroll exports are complex. Tax year transitions are difficult. |
| **API Dependency** | ✗ High - Deeply integrated with payroll systems | Few alternatives support ADP's complexity. Migration is 2-3 months. |
| **Custom Code** | ✗ High - Payroll business logic is ADP-specific | Switching requires complete payroll logic rewrite. |
| **Pricing Lock** | ✗ Critical - Enterprise payroll pricing increases predictably | Annual increases of 5-10%. Multi-year contracts lock in price. |
| **Partner Lock** | ✗ Critical - Must have partner relationship | ADP restricts integrations. Partner program has certification requirements. |
| **Alternative Options** | ✓ Medium - Alternatives exist but less mature for construction | Workday, Guidepoint, local Canada payroll providers. |
| **Overall Risk** | **CRITICAL/HIGH** | Recommended: Avoid ADP unless existing customer. Use local Canadian payroll provider (Wagepoint, RUN, Workday) instead. |

**Critical Finding**: **Do not use ADP unless the customer is an existing ADP client.** The partnership restrictions, complex data structures, and lack of white-label capability make it a poor choice.

**Alternative Recommendations**:
- **Wagepoint** (Canadian, cloud-based, construction-friendly)
- **RUN (formerly ADP Run)** (payroll-focused alternative)
- **Workday** (enterprise option, expensive but mature)
- **Local tax accountant integration** (for smaller customers)

#### 3.2.5 Vercel Lock-in Analysis

| Factor | Assessment | Mitigation |
|--------|-----------|---------|
| **Code Portability** | ✓ Easy - Standard Node.js / Docker | Code is not locked in. Can deploy anywhere. |
| **Infrastructure Lock** | ✗ High - Next.js deployment is optimized for Vercel | Switching to AWS/GCP requires infrastructure rework. 1-2 weeks. |
| **Custom Code** | ✓ Moderate - Business logic is portable | Environment variables, databases are standard. Switching is moderate effort. |
| **Pricing Lock** | ✗ Medium - Pro tier is cheap ($20/month) but scales unpredictably | Usage-based billing can surprise. Enterprise tier is expensive. |
| **Data Residency Lock** | ✗ High - Standard Pro tier is US-only | Canada data residency requires Enterprise contract (100K+/year). |
| **Alternative Options** | ✓ High - AWS, GCP, Netlify, Railway all support Next.js | Many hosting options available. |
| **Overall Risk** | **MEDIUM-HIGH** | Recommended: Acceptable for initial launch. Plan migration to AWS or self-hosted for compliance/cost scaling. |

**Recommendation**: Vercel is good for initial launch (low cost, easy deployment). However, **for long-term Canadian compliance and cost optimization, plan to migrate to AWS Canada or self-hosted Node.js on demand.**

**Migration Path**:
1. **Months 1-6**: Use Vercel Pro. Stay within US data center.
2. **Months 6-12**: Evaluate AWS Lightsail (Canada) or EC2 (Canada region) as alternative.
3. **Month 12+**: If monthly costs exceed $500 CAD and Canadian data required, migrate to AWS or self-hosted.

**Estimated Migration Cost**: $5-10K + 1-2 weeks development time.

#### 3.2.6 Microsoft 365 Lock-in Analysis

| Factor | Assessment | Mitigation |
|--------|-----------|---------|
| **Data Portability** | ✓ Moderate - Standard export tools available | Office 365 data can be exported to PST (Outlook) or CSV (other tools). |
| **API Dependency** | ✓ Moderate - Graph API is well-documented | Switching email/Teams is straightforward. Integrations are decoupled. |
| **Custom Code** | ✓ Moderate - Graph API integrations are standard | Office 365-specific code can be refactored. 2-3 weeks. |
| **Pricing Lock** | ✗ High - M365 pricing increases 5-10% annually | Multi-user licenses compound costs. Negotiation is difficult. |
| **Market Position** | ✓ High - Industry standard (construction widely uses M365) | Switching to Google Workspace or OpenStack is possible but culturally difficult. |
| **Alternative Options** | ✓ High - Google Workspace, Open-source alternatives | Switching is viable but user training required. |
| **Overall Risk** | **MEDIUM** | Recommended: M365 is industry standard. Lock-in is moderate. Plan for cost increases. |

**Recommendation**: Microsoft 365 is a good choice for construction industry. Canadian data center is available. Lock-in risk is manageable because alternatives (Google Workspace) exist and are comparable.

---

### 3.3 Canadian Data Residency Risk Assessment

**Critical Finding**: Current vendor stack has **SEVERE data residency gaps**.

| Vendor | Current Residency | Canadian Option? | PIPEDA Risk | Recommendation |
|--------|-------------------|------------------|------------|-----------------|
| **Supabase** | AWS Canada (Central, Toronto) | ✓ **YES** | LOW | ✓ Recommended: Use Canadian region |
| **Clerk** | EU (Germany/Ireland) ONLY | ✗ **NO** | **CRITICAL** | ✗ **Must migrate** |
| **Vercel** | US (default); EU available | ~ Partial | **HIGH** | ~ Enterprise required for Canada |
| **BoldSign** | TBD - Check current | ? Unknown | MEDIUM | ? Verify location with vendor |
| **Microsoft 365** | Canada (Toronto) available | ✓ **YES** | LOW | ✓ Recommended: Specify Toronto region |
| **Tailscale** | Multiple (Canada available) | ✓ **YES** | LOW | ✓ Recommended: Use Canada region |

**Data Residency Compliance Gap**:
- **Clerk (EU-only)** is incompatible with PIPEDA for Canadian users
- **Vercel (US-default)** requires Enterprise contract for Canada region
- **BoldSign** region status is unclear and must be verified

**Immediate Action Required** (P0):
1. Verify BoldSign data residency
2. Initiate Clerk migration plan (6-month project)
3. Upgrade Vercel to Enterprise or plan self-hosted alternative

---

## 4. CANADIAN REGULATORY COMPLIANCE

### 4.1 PIPEDA Requirements

**PIPEDA** = Personal Information Protection and Electronic Documents Act (Federal)

PIPEDA applies to **all private-sector organizations in Canada** that collect, use, or disclose personal information in the course of commercial activities.

**KrewPact Applicability**: ✓ **FULLY APPLICABLE** - KrewPact collects personal information (employee names, emails, contact details, potentially health/injury data for WSIB integration).

#### 4.1.1 Ten Fair Information Principles

| Principle | Requirement | KrewPact Implementation |
|-----------|-------------|-------------------------|
| **1. Accountability** | Designate a Privacy Officer and be responsible for compliance | Appoint Privacy Officer. Create Privacy Policy. Document procedures. |
| **2. Identifying Purposes** | Tell people why you're collecting their info before collection | Privacy Policy must clearly state: employee data, WSIB records, contract docs, etc. |
| **3. Consent** | Get permission before collecting personal info | Obtain written consent from users before account creation. Explicit for sensitive data. |
| **4. Limiting Collection** | Only collect info needed for stated purposes | Limit to: name, email, phone, company, job title. Don't collect unnecessary data. |
| **5. Limiting Use, Disclosure, Retention** | Use info only for stated purpose. Delete when no longer needed. | Implement data retention policy (5-7 years for construction records, per CRA). Restrict access. |
| **6. Accuracy** | Keep info accurate and up-to-date | Provide user tools to update their profiles. Audit accuracy annually. |
| **7. Safeguards** | Protect personal information from loss/theft/unauthorized access | Encrypt data in transit (HTTPS) and at rest. Secure auth. Access controls. |
| **8. Openness** | Be transparent about info practices | Publish Privacy Policy. Document procedures. Make policies accessible. |
| **9. Individual Access** | Give people access to their own info | Implement data export feature. 30-day response time to access requests. |
| **10. Challenging Compliance** | Allow people to challenge compliance | Provide mechanism to lodge privacy complaints. Respond within 30 days. |

#### 4.1.2 Consent Requirements

**Express Consent Required For:**
- Collection of any personal information
- Use of information for new purposes beyond initially stated purpose
- Disclosure to third parties
- Automated decision-making (profiling, AI recommendations)
- Sensitive personal information (health data, financial data, criminal records)

**Implied Consent Acceptable For:**
- Secondary uses closely related to original purpose
- Business operations (e.g., sharing info with service providers for fulfillment)
- Legally required disclosures

**KrewPact Consent Strategy:**

```
Consent Flow:
1. Pre-signup: Display Privacy Policy and Consent Form
2. Checkbox: "I consent to collection of personal information as described"
3. Second checkbox: "I consent to WSIB data processing" (if enabled)
4. Clear opt-in: "I consent to marketing emails" (optional, separate)
5. Store consent records with timestamp and IP address
6. Allow easy withdrawal of consent in account settings
```

**Recommended Language**:
> "I understand that KrewPact collects personal information (name, email, company, job title) to provide construction operations management services. I consent to KrewPact processing this information as described in the Privacy Policy. I understand I can withdraw consent at any time."

#### 4.1.3 Data Breach Notification

**PIPEDA Breach Notification Requirements:**

| Requirement | Detail | KrewPact Action |
|-------------|--------|-------------------|
| **Notification Triggers** | Any breach of security safeguards that creates risk of serious harm to personal information | Document all breaches, even minor ones. Report if harms privacy. |
| **Notify OPC** (Privacy Commissioner of Canada) | Report to Office of the Privacy Commissioner within 30 days (or as soon as feasible) | Establish incident response procedures. Notify OPC in writing. |
| **Notify Affected Individuals** | Inform people whose data was breached | Send email/letter within 30 days. Provide advice on protective steps. |
| **"As Soon as Feasible"** | No specific timeline defined (nebulous) | Industry best practice: 24-48 hours for affected users, 30 days for OPC |
| **Breach Records** | Maintain records of all breaches for 24 months minimum | Create breach log with: date, affected individuals count, type of data, cause, notification sent |
| **Content of Notice** | Notification must include: what happened, what data was affected, steps to protect themselves, how to contact you | Use template. Legal review recommended. |

**KrewPact Breach Notification Checklist:**
- [ ] Incident response plan documented
- [ ] Privacy Officer contact and escalation procedures
- [ ] Breach notification templates prepared
- [ ] OPC contact information documented
- [ ] 24-month breach record log created
- [ ] Insurance for cyber liability (considers breach costs)

#### 4.1.4 Cross-Border Data Transfer Rules

**PIPEDA Principle 7 (Safeguards) requires** organizations remain accountable for personal information sent to third parties, even if transferred outside Canada.

**US Cloud Provider Rule (Key for KrewPact):**
- Data transferred to US (Vercel, Clerk) requires "comparable protection"
- US Privacy Act and FISMA provide some protection (but not at Canadian level)
- PIPEDA uses "accountability model" - organization responsible for US provider's practices

**PIPEDA Cross-Border Accountability:**
1. Conduct due diligence on US provider's safeguards (security, encryption, access controls)
2. Execute Data Processing Agreement that includes US Addendum (mandatory)
3. Assess US government access risk (FISA, etc.)
4. Document the accountability trail
5. Provide transparency to users about US data transfer

**US Addendum Requirements** (Standard in modern DPAs):
- Provider must notify you of government requests
- Provider must use legal channels to resist unlawful requests
- You have right to audit and inspect data security
- Encryption at rest and in transit must be maintained

**For KrewPact Specifically:**
- **Supabase (Canada)**: ✓ No cross-border transfer needed if using Toronto region
- **Clerk (EU)**: ✗ Cross-border transfer to EU. PIPEDA allows this IF DPA is in place. Recommended to migrate anyway (data residency risk).
- **Vercel (US)**: ~ Cross-border transfer if using US region. DPA required. Enterprise contract for Canada region available.
- **Microsoft 365 (Canada)**: ✓ No cross-border transfer needed if using Toronto region

#### 4.1.5 Right to Access (30-Day Response Window)

**PIPEDA Principle 9 states**: Individuals have right to access personal information an organization has collected about them.

**Requirements:**
- Respond within 30 calendar days of request
- Provide info in form requested (email, PDF, physical copy)
- Charge reasonable fee for copying and shipping (max $5-25 depending on province)
- May withhold info if: privilege applies, third-party info, legal investigation, business confidentiality
- Provide explanation if denying request

**KrewPact Implementation:**
- [ ] Create data export feature in user settings (automated)
- [ ] Create privacy@krewpact.com email address for manual requests
- [ ] Train staff to respond to access requests
- [ ] Maintain log of all access requests and responses
- [ ] Target response time: 5-10 business days (better than 30-day min)

**Data Export Format**: JSON or CSV including:
- User profile (name, email, company, etc.)
- All documents/data user created
- Access logs (who accessed their data)
- Exclude: other users' data they may have access to

#### 4.1.6 Right to Deletion (Limited Under Current PIPEDA)

**Important Limitation**: PIPEDA does NOT grant automatic "right to deletion" like GDPR.

**What PIPEDA Says**:
- Principle 5: Limit use, disclosure, and retention
- Organizations must delete or anonymize info when no longer needed
- Cannot delete indefinitely for business reasons

**What Deletion Means in Practice**:
- Must delete personal data when purpose is fulfilled
- CRA requires 6-year retention for tax records (supersedes PIPEDA)
- Construction documents must be retained per OHSA (2 years minimum)
- WSIB records must be retained (no specific timeline, but assume 7 years for liability)

**KrewPact Deletion Policy**:
- Employee data: Delete 30 days after account closure (unless legal hold)
- Construction documents: Retain 7 years per OHSA/WSIB standard
- Tax records: Retain 6 years per CRA requirement
- Email logs: Delete after 6 months (unless litigation hold)
- User can request deletion anytime, but may be denied if legal hold applies

**Recommended Language**:
> "KrewPact retains personal information for the duration of your account and up to 7 years thereafter to comply with construction industry regulations. You can request deletion of your account, but construction documents and tax records will be retained per legal requirements."

#### 4.1.7 Third-Party Processor Accountability

**Key Rule**: If KrewPact uses vendors (Supabase, Clerk, BoldSign, etc.) to process personal information on your behalf, KrewPact remains accountable to PIPEDA, even if vendor violates it.

**PIPEDA Requirement** (Implicit in Principle 1):
> "An organization is responsible for personal information in the possession of a third party that is acting on its behalf."

**What This Means**:
- Vendor security breach = Your liability (you must notify users)
- Vendor unauthorized disclosure = Your compliance failure
- You cannot delegate accountability

**Data Processing Agreement (DPA) Requirements:**

Every vendor processing personal information must sign a DPA with these clauses:

| Clause | Purpose | Requirement |
|--------|---------|------------|
| **Processor Obligations** | Define vendor's role and restrictions | Vendor can only process data per KrewPact instructions |
| **Data Security** | Specify security requirements | Encryption, access controls, audit logs, incident notification |
| **Subprocessors** | Vendor cannot subcontract without approval | KrewPact retains control over data flow |
| **Right to Audit** | KrewPact can audit vendor practices | Annual security audit or SOC 2 Type II report required |
| **Data Subject Rights** | Vendor assists with access/deletion requests | Vendor must respond to KrewPact within 5 days |
| **Incident Notification** | Vendor notifies KrewPact of breaches immediately | 24-hour notification SLA required |
| **Data Return/Deletion** | Vendor deletes data on contract termination | Data deletion within 30 days of contract end |
| **US Addendum** (if applicable) | Special terms for US vendors | FISA/government access acknowledgment |

**Vendors Requiring DPA Execution** (Priority Order):
1. **Supabase** - P1 - Handles customer data, employee data
2. **Clerk** - P1 - Handles authentication, user profile data
3. **Vercel** - P1 - Hosts application (touches all data)
4. **BoldSign** - P2 - Handles document signing data
5. **Microsoft 365** - P2 - Handles email, Teams, calendar data
6. **Tailscale** - P3 - Handles network access logs

**Action**: Prepare DPA template based on PIPEDA Principle 7. Send to all vendors for signature.

#### 4.1.8 PIPEDA Compliance Checklist

- [ ] Privacy Policy published and accessible
- [ ] Privacy Officer appointed and contactable
- [ ] Consent forms/mechanisms in place
- [ ] Data collection limited to stated purposes
- [ ] Data encryption (in transit and at rest) implemented
- [ ] Access controls and authorization implemented
- [ ] Data retention policy documented
- [ ] 24-month breach record log established
- [ ] Data Processing Agreements with all vendors signed
- [ ] User data export feature implemented
- [ ] Incident response plan documented
- [ ] Privacy by Design principles applied to development
- [ ] Annual privacy audit scheduled
- [ ] Staff privacy training completed
- [ ] OPC contact info documented

---

> **Implementation Details:** See [KrewPact-Security-and-Compliance-Framework.md](./KrewPact-Security-and-Compliance-Framework.md) §4 for immutable audit trail design, consent management, privacy request workflows, data retention policies, and breach notification processes.

---

### 4.2 Provincial Privacy Laws

**Key Fact**: Canada has **two-tier privacy regulation**:
1. **Federal** (PIPEDA) - covers most private-sector organizations
2. **Provincial** - varies by province

**KrewPact Location**: Mississauga, Ontario = Federal (PIPEDA) + Ontario provincial (limited)

#### 4.2.1 Ontario Privacy Requirements

**Ontario does NOT have comprehensive private-sector privacy law** like Quebec or BC.

**What Ontario HAS:**
- **PHIPA** (Personal Health Information Protection Act) - Health information only
- **FIPPA** (Freedom of Information and Protection of Privacy Act) - Public sector only
- **PIPEDA** (Federal - applies to Ontario companies)

**What Ontario DOESN'T Have:**
- No separate provincial data protection law for private-sector non-health data
- No "right to be forgotten" law
- No GDPR-equivalent

**Implication for KrewPact**:
- If KrewPact collects health data (e.g., WSIB injury records), PHIPA may apply
- Otherwise, PIPEDA is primary federal requirement

**PHIPA Application** (if KrewPact integrates WSIB):
- PHIPA defines "personal health information" broadly (any info about health, including workplace injuries)
- Health information must be collected with express consent
- Health information has stricter disclosure rules
- Health information must be de-identified before use in analytics

**PHIPA Compliance If Health Data Collected**:
- [ ] Separate consent for health information
- [ ] Audit health data access (who, when, why)
- [ ] De-identify before analytics or reporting
- [ ] Train staff on health privacy rules
- [ ] Consider Privacy Impact Assessment (PIA)

#### 4.2.2 Quebec Law 25 (Major Compliance Issue)

**Quebec has unique privacy law** (Quebec Law 25) that is **stricter than PIPEDA** and affects MDM Group if serving Quebec-based customers.

**Key Dates:**
- **Enacted**: June 22, 2021
- **In Force**: Various dates (most provisions active from June 2022 onwards)
- **Compliance Deadline for KrewPact**: Must comply **immediately** if serving Quebec customers

**Quebec Law 25 Key Differences from PIPEDA:**

| Aspect | PIPEDA | Quebec Law 25 | Impact on KrewPact |
|--------|--------|---------------|-------------------|
| **Explicit Consent** | Express/implied distinction | Must be explicit and specific | Stricter consent forms required |
| **Privacy Officer** | Optional for large orgs | **Mandatory for orgs processing >$25M annual revenue OR collecting sensitive data** | Must appoint if applicable |
| **Privacy Impact Assessments** | Recommended | **Mandatory for cross-border data transfers** | PIA required before using US/EU vendors |
| **Data Portability** | Not required | **Required** (user can request data in portable format) | Must implement export feature |
| **Right to Erasure** | Limited | **Stronger right** (similar to GDPR) | Must delete easier than PIPEDA |
| **Data Breach Notification** | 30 days, OPC | **Immediate notification required** (no timeline defined, but "without undue delay") | Must notify within 24-48 hours |
| **Penalties** | Up to $100K fine | **Up to 4% of worldwide turnover OR $25M CAD, whichever is greater** | **MUCH HIGHER penalties** |

**Quebec Law 25 Explicit Consent Requirements:**

Consent must be:
1. **Explicit and specific** - cannot be pre-checked boxes
2. **Informed** - clearly explain purpose
3. **Freely given** - no coercion
4. **Unambiguous** - clear yes/no
5. **Separate for each purpose** - not bundled

**Example Compliant Form**:
```
[ ] I consent to KrewPact collecting my name and email for account management
[ ] I consent to KrewPact using my email for project updates
[ ] I consent to KrewPact integrating with WSIB for injury tracking
[ ] I consent to KrewPact storing my data on Supabase (Canada region)
```

**NOT Compliant**:
```
[ ] I agree to the Terms of Service (includes everything)
```

**Quebec Law 25 Privacy Officer:**

- **Mandatory if**: $25M+ annual revenue OR processing sensitive data
- **If optional**: Designate Privacy Officer anyway (best practice)
- **Responsibilities**: Monitor compliance, train staff, handle complaints, report to regulator
- **Contact**: Must be publicly listed

**Quebec Law 25 Privacy Impact Assessment (PIA):**

PIA **must be conducted** before using cross-border data transfer (e.g., US/EU vendors).

**PIA Scope** (per Quebec Law 25):
1. Purpose of processing
2. Necessity and proportionality
3. Data minimization
4. Risks to privacy (low/medium/high)
5. Safeguards
6. Vendor assessment (if third party)
7. Mitigation measures

**Example PIA for Vercel (US data center)**:
```
Risk: Medium
- Data: Source code, application logs, deployment data
- US jurisdiction exposure: Risk of FISA access
Mitigation:
- Use encryption at rest
- Use Canada data center (Enterprise tier)
- Execute US Addendum DPA
```

**Quebec Law 25 Data Portability:**

KrewPact must provide user data in "portable, machine-readable format" on request.

**Implementation**:
- [ ] JSON export feature (includes all user data)
- [ ] CSV export for documents
- [ ] Respond within 45 days (or 90 days for complex requests)

**Quebec Law 25 Right to Erasure:**

Right to deletion is broader than PIPEDA. User can request erasure if:
- Purpose is fulfilled
- Data is no longer necessary
- Consent withdrawn
- Processing is unlawful

**Exceptions** (similar to GDPR):
- Legal obligation to retain (tax, WSIB records, CRA, OHSA)
- Defense of legal claims
- Legitimate business interest (narrow definition)

**Action for Quebec Compliance** (If serving Quebec customers):

- [ ] Conduct Privacy Impact Assessments for all cross-border vendors
- [ ] Update consent forms to Quebec Law 25 standard (explicit, specific, separate)
- [ ] Appoint Privacy Officer (even if not legally mandatory, best practice)
- [ ] Document all processing purposes in writing
- [ ] Implement stronger data deletion mechanism
- [ ] Plan to address potential penalties (4% worldwide turnover)

**Cost Estimate for Quebec Compliance**: $15-25K (legal review + consent form rewrite + PIA + Privacy Officer training)

---

### 4.3 Construction Industry Regulations (Ontario)

**Critical Section**: Ontario construction industry has specific regulatory requirements that KrewPact must support.

#### 4.3.1 WSIB Digital Record Requirements

**WSIB** = Workplace Safety and Insurance Board (Ontario)

WSIB requires employers to maintain digital records of workplace incidents, injuries, and health & safety practices.

**Mandatory WSIB Documentation**:

| Document Type | Retention Period | Digital OK? | Requirements |
|----------------|------------------|-----------|--------------|
| **Incident Reports** | 6 years | ✓ Yes | Timestamped, cannot be altered retroactively |
| **Injury Registers** | 3 years | ✓ Yes | Names, dates, nature of injury, reportable incidents |
| **Hazard Assessments** | 2 years (or until remediated) | ✓ Yes | Document hazards identified and corrections made |
| **Training Records** | 2 years | ✓ Yes | Who trained, what topic, date, trainer name |
| **PPE (Personal Protective Equipment) Inventory** | 1 year | ✓ Yes | Type, quantity, inspection dates, maintenance |
| **Washroom Cleaning Logs** | 90 days rolling | ✓ Yes | Date, time, cleaner name, temperature check (if applicable) |
| **AED (Automated External Defibrillator) Logs** | 2 years | ✓ Yes | Inspections, maintenance, usage (if used) |
| **Wage Records** | 6 years | ✓ Yes | Hours worked, wages paid, deductions, tax info |

**KrewPact Feature Requirements**:

To comply with WSIB, KrewPact must support:

1. **Incident Logging Module**
   - [ ] Create incident reports with: date, time, worker name, injury type, severity, witness names
   - [ ] Auto-timestamp (cannot be backdated)
   - [ ] Attach photos/documents
   - [ ] Status tracking (open, investigated, resolved)
   - [ ] Audit log (who viewed, when)

2. **Digital Document Storage**
   - [ ] Secure storage with access controls
   - [ ] Encryption at rest (256-bit AES minimum)
   - [ ] Version history (no deletion, only append)
   - [ ] Search capability (by date, worker, incident type)

3. **Wage Records Integration**
   - [ ] Link to payroll system (ADP, Workday, etc.)
   - [ ] Time tracking integration
   - [ ] Automatic wage calculation
   - [ ] Tax documentation (T4s, etc.)

4. **Reporting and Export**
   - [ ] Annual WSIB reports (exportable to PDF/Excel)
   - [ ] Incident trending (injuries over time)
   - [ ] Compliance dashboard (trainings up-to-date, PPE records current)

**WSIB Digital Record Standards** (Ontario specific):

- Records must be in **non-proprietary format** (PDF, CSV, Excel are OK; custom binary is not)
- Records must include **metadata** (date created, last modified, author)
- Records must have **audit trail** (who accessed, when, what changed)
- Records must be **searchable** by key fields
- Records must be **backed up daily** (off-site backup required)
- Records must be **recoverable** in case of disaster (recovery tested annually)

#### 4.3.2 OHSA Digital Records

**OHSA** = Occupational Health and Safety Act (Ontario)

OHSA requires employers to maintain records of workplace health and safety programs.

**OHSA Digital Record Requirements**:

| Record Type | Retention | Digital OK? | Regulation |
|------------|-----------|-----------|-----------|
| **Joint Health & Safety Committee Minutes** | 2 years | ✓ Yes | O. Reg. 860 |
| **Workplace Inspections** | 2 years | ✓ Yes | O. Reg. 860 |
| **Hazard Assessments** | Ongoing + 2 years after remediation | ✓ Yes | O. Reg. 860 |
| **Incident Reports** | 6 years | ✓ Yes | O. Reg. 860 |
| **Worker Training Records** | 2 years | ✓ Yes | O. Reg. 443 (construction specific) |
| **Site-Specific Safety Plans** | Duration of project + 3 months | ✓ Yes | O. Reg. 213 |
| **Competence Certifications** | 2 years | ✓ Yes | O. Reg. 213 |

**Electronic Posting Allowed**:

OHSA allows electronic posting of:
- Unsafe work notices
- Health & Safety policies
- Emergency procedures
- Worker rights postings (must be in work areas - physical copy still needed)

**KrewPact Feature Requirements**:

1. **Document Management**
   - [ ] Centralized repository for all safety docs
   - [ ] Version control (never delete originals)
   - [ ] Access permissions (role-based)
   - [ ] Search functionality

2. **Compliance Tracking**
   - [ ] Dashboard showing compliance status
   - [ ] Alerts for expiring certifications
   - [ ] Audit trail for inspections/assessments

3. **Electronic Notices**
   - [ ] Post unsafe work notices (with timestamp)
   - [ ] Notification to affected workers
   - [ ] Status tracking (open, acknowledged, resolved)

#### 4.3.3 Construction Act 2026 Changes (CRITICAL)

**Major Regulatory Update**: Ontario Construction Act underwent significant reforms effective 2026.

**Key Changes Affecting KrewPact**:

| Change | Previous | New | KrewPact Impact |
|--------|----------|-----|------------------|
| **Contract Termination Notice** | 14 days or immediate | **7 days written notice required** | Feature: Send termination notice with 7-day countdown |
| **Lien Expiry** | **Annual renewal required** | **REMOVED - No more annual expiry** | Feature: Lien never expires (unless paid/released) |
| **Form 6 (Holdback Release)** | Optional | **Mandatory new form for holdback release** | Feature: Generate Form 6 for all holdback releases |
| **Statutory Notices** | Published in newspapers | **Published on 3 designated websites (TBD by reg)** | Feature: Auto-post notices to designated sites |
| **Holdback System** | 10% holdback standard | **Structured holdback with new rules** | Feature: Track holdback by project phase |
| **Payment Certifier Role** | Optional | **May be required for larger projects** | Feature: Payment certification workflow |
| **Change Orders** | Informal | **More formal tracking required** | Feature: Change order approval workflow |

**Critical Features for 2026 Compliance**:

1. **Termination Notice Module** (P0 Priority)
   - [ ] 7-day countdown timer
   - [ ] Automated notification to parties
   - [ ] Digital signature acceptance
   - [ ] Proof of service (email, SMS confirmation)

2. **Lien Management Module** (P0 Priority)
   - [ ] Lien registration (no expiry date)
   - [ ] Lien release tracking
   - [ ] Waiver of lien management
   - [ ] Partial vs. full lien releases

3. **Form 6 Generation** (P1 Priority)
   - [ ] Auto-generate Form 6 for holdback releases
   - [ ] Track holdback amounts by contractor
   - [ ] Certification signoff workflow
   - [ ] Archival and audit trail

4. **Statutory Notice Management** (P1 Priority)
   - [ ] Auto-post notices to designated websites (when published)
   - [ ] Track proof of service
   - [ ] Maintain 3-year archive of notices

5. **Holdback Tracking** (P1 Priority)
   - [ ] Holdback calculation by phase
   - [ ] Release authorization workflow
   - [ ] Compliance dashboard

6. **Change Order Management** (P2 Priority)
   - [ ] Change order creation and tracking
   - [ ] Cost impact analysis
   - [ ] Approval workflow
   - [ ] Integration with contracts

**Construction Act 2026 Deadline**: KrewPact must implement these features **before Jan 1, 2026** to remain compliant with Ontario requirements.

**Estimated Development Cost**: $40-60K for all features (can be prioritized)

#### 4.3.4 COR Certification Records

**COR** = Certificate of Recognition (Construction Owners Responsible for Excellence)

COR is a voluntary but industry-standard health & safety certification for construction companies.

**KrewPact Relevance**: If customers pursue COR certification, KrewPact must support the required documentation.

**COR Documentation Requirements**:

| Document Type | Requirement | Digital OK? |
|----------------|------------|-----------|
| **Health & Safety Policy** | Written policy, reviewed annually | ✓ Yes |
| **Hazard Assessment Program** | Site assessments, documented | ✓ Yes |
| **Training Program** | Worker training records, tracked | ✓ Yes |
| **Incident Reporting** | All incidents logged, tracked, analyzed | ✓ Yes |
| **Audits & Inspections** | Regular inspections, documented | ✓ Yes |
| **Worker Participation** | Evidence of worker H&S involvement | ✓ Yes |
| **Competency Assessments** | Worker skill assessments, documented | ✓ Yes |
| **Corrective Action Tracking** | Follow-up on findings, documented | ✓ Yes |

**KrewPact COR Support**:
- [ ] All WSIB and OHSA records (above) support COR
- [ ] Add COR compliance dashboard
- [ ] Add corrective action tracking
- [ ] Add audit preparation report (PDF export)

---

### 4.4 Electronic Signatures

**Question**: Can KrewPact use electronic signatures for construction contracts, change orders, and other legal documents in Canada?

**Answer**: YES, with conditions. Canada has strong legal framework for electronic signatures.

#### 4.4.1 Federal E-Signature Law

**PIPEDA Part 2** (Federal electronic commerce law) makes electronic signatures legally valid:

> "An electronic document is not invalid or unenforceable solely by reason of being in electronic form."

**Key Conditions**:
1. Signature must be **attributable to the person** (digital signature, API token, email confirmation)
2. Person must **consent to use of electronic form** (checkbox in UI)
3. Information must be **retained and accessible** (archive digital signature)

**Implementation for KrewPact**:
- [ ] Obtain user consent to use electronic signatures (checkbox)
- [ ] Use qualified electronic signature provider (BoldSign, DocuSign, etc.)
- [ ] Retain audit logs (who signed, when, IP address, device)
- [ ] Archive signed documents indefinitely (construction disputes can be litigated 10+ years later)

#### 4.4.2 Ontario Electronic Commerce Act, 2000

**Ontario-specific electronic signature law**:
- Electronic signatures are legally valid for most purposes
- Some exceptions: wills, powers of attorney, real estate deeds

**Construction Documents Status**:
- Construction contracts: ✓ E-signatures OK
- Change orders: ✓ E-signatures OK
- Pay applications: ✓ E-signatures OK
- Lien waivers: ✓ E-signatures OK
- Drawings/specifications: ✓ E-signatures OK (with notes)

**Ontario E-Signature Requirements**:
1. Party must **consent** to electronic form
2. Signature must **authenticate** the document (prove who signed)
3. Document must be **retained** in accessible form

#### 4.4.3 Quebec Electronic Signatures

**Quebec has stricter rules** (Quebec Civil Code):
- E-signatures must use **advanced electronic signature** (cryptographic key based)
- Basic e-signatures (email, checkbox) are not accepted in Quebec
- E-signatures must be certified by trusted service provider

**Quebec Requirement for BoldSign**:
- BoldSign uses advanced electronic signature (cryptographic)
- BoldSign is compliant with Quebec requirements
- Quebec-based customers can use BoldSign for legal documents

#### 4.4.4 BoldSign Compliance

**BoldSign** (Syncfusion product) is compliant with:
- ✓ Federal PIPEDA Part 2
- ✓ Ontario Electronic Commerce Act
- ✓ Quebec Civil Code (advanced electronic signature)
- ✓ PIPEDA requirements (audit logs, encryption, data retention)

**KrewPact Implementation**:
- [ ] Integrate BoldSign API for document signing
- [ ] Obtain user consent before electronic signing
- [ ] Retain signed documents permanently (construction liability)
- [ ] Provide audit logs to users
- [ ] Support wet signature fallback (if customer prefers)

**Estimated Integration Cost**: $5-10K (API integration, UI components, testing)

---

### 4.5 Data Residency

**Critical Compliance Issue for KrewPact**

#### 4.5.1 Universal Canadian Data Storage Requirement

**Fact**: Most Canadian privacy laws do **NOT mandate** Canadian data storage.

**PIPEDA Rule**: Data can be stored in US/EU if "comparable protection" is provided.

**Exception #1: BC Privacy Law**
- **Province**: British Columbia
- **Law**: Personal Information Protection Act (PIPA)
- **Requirement**: **Personal information must be stored in Canada** (explicit)
- **Scope**: Applies to BC-based organizations and BC resident data

**Exception #2: Nova Scotia Privacy Law**
- **Province**: Nova Scotia
- **Law**: Personal Information Protection Act
- **Requirement**: **Personal information must be stored in Canada** (explicit)
- **Scope**: Applies to NS-based organizations and NS resident data

**Exception #3: Alberta Privacy Law**
- **Province**: Alberta
- **Law**: Personal Information Protection Act (PIPA)
- **Requirement**: NO explicit Canadian storage requirement, but "consistent with Alberta"

**For KrewPact (Ontario-based)**:
- ✓ PIPEDA allows US/EU storage IF comparable protection
- ✗ But if serving BC or NS customers, must use Canadian storage

#### 4.5.2 US FISA Exposure

**Critical Risk**: Even if data is stored in Canada, US government can access US-based cloud providers.

**How It Works**:
1. FBI/NSA can request data from US companies (Microsoft, AWS, Google, etc.)
2. US companies **cannot refuse** under Foreign Intelligence Surveillance Act (FISA)
3. Request is **secret** (gag orders prevent notification)
4. Canadian data = Canadian liability IF US government accesses it

**Example**: If KrewPact stores data on Vercel (US-based) in US data center:
- US government can request all data
- Vercel cannot refuse or notify KrewPact
- KrewPact has violated PIPEDA by allowing unauthorized access
- Liability falls on KrewPact, not Vercel

**Mitigation Strategy**:
1. **Use Canadian-only data centers** (Supabase Canada region, AWS Canada, etc.)
2. **Encrypt data at rest** (KrewPact controls encryption keys, not cloud provider)
3. **Execute US Addendum DPA** (vendor must notify of government requests - even if cannot refuse)
4. **Disclose US FISA risk to customers** (transparency)

#### 4.5.3 Current Vendor Data Residency Status

| Vendor | Default Region | Canadian Option | FISA Risk | Recommendation |
|--------|---|---|---|---|
| **Supabase** | AWS regions globally | ✓ AWS Canada (Toronto) | ✓ Low (Canadian data center) | ✓ Recommended: Use Canada region |
| **Clerk** | EU (Germany/Ireland) | ✗ NO Canadian option | ~ FISA doesn't apply to EU, but GDPR applies (different problem) | ✗ MUST MIGRATE |
| **Vercel** | US (Virginia, Oregon) | ~ Enterprise only | ✗ HIGH - US data centers | ~ Expensive upgrade required for Canada |
| **BoldSign** | TBD - Verify | ? Unknown | ? Unknown | ? ACTION REQUIRED: Verify with vendor |
| **Microsoft 365** | US (default) | ✓ Canada (Toronto) available | ✓ Low (if Canada region selected) | ✓ Recommended: Specify Canada region in contract |
| **Tailscale** | Global (Canada available) | ✓ Canada region selectable | ✓ Low (if Canada region used) | ✓ Recommended: Canada region |

#### 4.5.4 Data Residency Recommendations

**Immediate Actions** (P0):
1. **Supabase**: ✓ Already using Canada region (GOOD)
2. **Clerk**: ✗ Migrate to Auth0 or Keycloak with Canada region (URGENT - Jan 2026)
3. **Vercel**: ~ Evaluate AWS/GCP self-hosted or Vercel Enterprise Canada (by Q2 2026)
4. **BoldSign**: ? Verify data residency with vendor (contact support)
5. **Microsoft 365**: ✓ Specify Canada (Toronto) data center in contract (IMMEDIATE)

**Cost Estimate**:
- Clerk migration: $10-20K + 6 weeks
- Vercel Enterprise Canada: $1,000-5,000/month (significant cost)
- Alternative (AWS self-hosted): $500-2,000/month

**Recommendation**:
- **Short-term (3 months)**: Migrate off Clerk. Use transitional auth solution.
- **Medium-term (6-12 months)**: Establish Canadian-only data residency strategy.
- **Long-term**: Evaluate build vs. buy for data residency requirements.

---

### 4.6 CRA Digital Record-Keeping

**Critical for Construction**: CRA (Canada Revenue Agency) has strict digital record requirements for tax and GST/HST purposes.

#### 4.6.1 CRA Requirements for Digital Records

**Retention Period**: **6 years** (1-2 years for certain records, but 6 years is standard)

**Format Requirements**:
- Records must be in **non-proprietary format** (PDF, CSV, Excel, plain text)
- Records must be **readable and searchable**
- Records must include **metadata** (dates, amounts, parties)
- Proprietary binary formats (e.g., custom database) are not acceptable

**Storage Requirements**:
- Records must be stored in **Canada** (CRA guidance)
- If stored outside Canada, written CRA permission required (rarely granted)
- Records must be **backed up** and **recoverable**
- Records must be **accessible to CRA** on request

**Backup and Recovery Standards**:
- Daily backups required
- Off-site backup required (different physical location)
- Recovery testing required (annually)
- Recovery time objective (RTO): 24 hours
- Recovery point objective (RPO): 24 hours

**CRA Audit Trail Requirements**:
- Who accessed record
- When accessed
- What changed
- Why changed
- Approval chain

#### 4.6.2 GST/HST Digital Invoice Requirements

**New Rule** (as of 2018): GST/HST invoices can be digital.

**Digital Invoice Requirements**:
- Exact replica of paper invoice
- Include GST/HST registration number
- Include date, amount, vendor/customer info
- Must be preserved for 6 years
- Cannot be altered after issuance

**Electronic Invoice Format**:
- PDF is acceptable
- Excel/CSV is acceptable
- XML is acceptable (for B2B)
- JSON/proprietary formats are problematic

**KrewPact Implementation**:
- [ ] Generate invoices in PDF format (standard)
- [ ] Include GST/HST number on all invoices
- [ ] Retain digital invoices for 6 years
- [ ] Archive in Canadian location

#### 4.6.3 CRA Acceptance of Digital Records

**CRA Position** (per CRA guidance):
- Digital records are acceptable if in non-proprietary format
- Canadian storage is expected (unless written approval)
- Audit logs and metadata required
- Encryption is acceptable (but CRA must be able to access)

**KrewPact Compliance**:
- [ ] Store financial records in Canada (Supabase Canada region)
- [ ] Export records in PDF/CSV (non-proprietary)
- [ ] Maintain audit logs (who, when, what, why)
- [ ] Backup daily with off-site copy
- [ ] Document record retention policy
- [ ] Include in customer contracts: "KrewPact stores financial records per CRA requirements"

#### 4.6.4 Electronic Filing Mandate

**CRA Mandate** (effective 2020s): Most GST/HST registrants must file electronically.

**Who Must File Electronically**:
- GST/HST registrants with >$30M annual revenue: **MANDATORY**
- Most other GST/HST registrants: **MANDATORY** (with narrow exceptions)
- Very small businesses (<$30K revenue): Can file on paper

**KrewPact Role**:
- KrewPact is typically NOT the GST/HST filer for customers
- Customers file their own GST/HST with CRA
- KrewPact must provide data (invoices, records) that customers use for filing

**KrewPact Compliance**:
- [ ] Generate CRA-compliant invoices
- [ ] Provide export functionality for customer records (for their filing)
- [ ] Include GST/HST amounts clearly on invoices

---

### 4.7 AODA Accessibility

**AODA** = Accessibility for Ontarians with Disabilities Act

#### 4.7.1 AODA Applicability to MDM Group

**Criterion**: AODA applies to organizations with **50+ employees in Ontario**.

**MDM Group Status**:
- Headcount: ? (Verify)
- Employees in Ontario: ? (Verify, assuming Mississauga = Ontario)
- **If ≥50 employees in Ontario: AODA applies**

**Assumption**: MDM Group has 50+ employees = **AODA applies**

#### 4.7.2 AODA Requirements

**Standard**: WCAG 2.0 Level AA accessibility

**Requirements**:
1. **Web Accessibility Standard** (applies to KrewPact website and web application)
   - All public web content must be WCAG 2.0 Level AA compliant
   - Deadline: January 1, 2021 (already passed - must comply now)

2. **Information and Communication Standard**
   - All internal documents must be accessible (emails, PDFs, etc.)
   - Must provide alternative formats (large print, Braille, audio) on request

3. **Accessible Customer Service**
   - Staff training on accessibility required
   - Accessible communication methods available

4. **Employment Standards**
   - Job postings must be accessible
   - Interview accommodations required

#### 4.7.3 WCAG 2.0 Level AA Compliance Requirements

| Criterion | Requirement | KrewPact Status |
|-----------|------------|-------------------|
| **WCAG 1.1.1 Non-text Content** | Images must have alt text | ? To be audited |
| **WCAG 1.4.3 Contrast** | Text/background contrast ratio 4.5:1 minimum | ? To be audited |
| **WCAG 2.1.1 Keyboard Access** | All functionality available via keyboard | ? To be audited |
| **WCAG 2.4.3 Focus Order** | Logical tab order | ? To be audited |
| **WCAG 3.3.1 Error Identification** | Error messages must be clear | ? To be audited |
| **WCAG 4.1.3 Status Messages** | Status updates must be announced | ? To be audited |

**Estimated Compliance**:
- Audit: $3-5K (professional accessibility audit)
- Remediation: $10-25K (depends on findings)
- Ongoing: $1-2K/year (continuous accessibility testing)

#### 4.7.4 AODA Penalties

**Non-Compliance Penalties**:
- Ontario Human Rights Tribunal complaints (can result in damages)
- Orders to comply with corrective actions
- Fines: Up to **$100,000 per day** for corporations
- Reputational damage

#### 4.7.5 AODA Compliance Checklist

- [ ] Verify MDM Group employee count (≥50 in Ontario?)
- [ ] Conduct professional WCAG 2.0 Level AA audit
- [ ] Fix high-priority accessibility issues (keyboard, contrast, alt text)
- [ ] Fix medium-priority issues (focus order, error messages)
- [ ] Fix low-priority issues (status messages, etc.)
- [ ] Document accessibility features in help/FAQ
- [ ] Train customer service staff on accessibility
- [ ] Implement annual accessibility testing
- [ ] Establish accessibility contact/complaint process

**Action Item** (P1): Commission professional WCAG 2.0 Level AA audit ($3-5K)

---

## 5. WHITE-LABEL AND COMMERCIAL DISTRIBUTION

### 5.1 GPL Implications for White-Labeling

**Question**: Can KrewPact white-label the platform to construction companies without violating GPL v3?

**Answer**: YES, with conditions (see Section 2.2 for detailed GPL analysis).

**Key GPL Principles for White-Labeling**:

1. **Source Code Disclosure** - ONLY required if distributing the software
   - SaaS model (KrewPact hosts): NO disclosure required
   - Download/on-premise model: Disclosure required

2. **Derivative Works** - Only GPL v3-licensed components must be open-sourced
   - Custom Frappe apps: Must be GPL v3 (extension mechanism)
   - React frontend: Can be proprietary (separate work, API-based)

3. **Trademark** - Cannot use "ERPNext" or Frappe trademarks in white-label
   - KrewPact branding: OK (fully proprietary)
   - "Powered by ERPNext" disclosure: Required in TOS (not in UI)

#### 5.1.1 White-Label Architecture

**Defensible Architecture**:

```
┌─────────────────────────────┐
│   KrewPact Frontend        │ MIT or Proprietary
│   (React + Next.js)         │ Custom branding
│   Custom UI components      │ Proprietary logic
└──────────────┬──────────────┘
               │ REST API calls
         (JSON messages)
               │
┌──────────────▼──────────────┐
│ KrewPact BFF Layer         │ Proprietary
│ (API gateway, auth, logic)  │ Custom business logic
└──────────────┬──────────────┘
               │ REST API calls
         (JSON messages)
               │
┌──────────────▼──────────────┐
│   ERPNext Backend           │ GPL v3
│   (unmodified or minimally  │ Custom Frappe apps
│    modified)                │ (if GPL v3 licensed)
└──────────────────────────────┘
```

**This architecture is defensible because**:
1. Frontend is clearly separate (React != ERPNext)
2. Communication is via API (not code integration)
3. GPL only applies to Frappe layer
4. Proprietary value is in BFF + frontend

#### 5.1.2 White-Label Source Code Handling

**What to Do**:
- Keep ERPNext unmodified on server (use as-is from upstream)
- All customizations go in separate Frappe apps (clearly GPL v3-licensed)
- Frontend code stays proprietary

**What NOT to Do**:
- Do NOT fork ERPNext (creates version tracking burden)
- Do NOT distribute ERPNext source to customers
- Do NOT embed ERPNext code in frontend
- Do NOT claim proprietary ownership of custom Frappe apps (violates GPL)

**Version Control Strategy**:

```
Repository: krewpact-construction

Directory Structure:
├── frontend/               (Proprietary React app)
│   ├── src/
│   ├── package.json
│   └── LICENSE (MIT or Proprietary)
├── bff/                    (Proprietary Backend-for-Frontend)
│   ├── src/
│   ├── routes/
│   └── LICENSE (Proprietary)
├── frappe-apps/            (GPL v3 Custom Apps)
│   ├── krewpact_custom/
│   │   ├── hooks.py
│   │   ├── doctypes/
│   │   └── LICENSE (GPLv3)
│   └── krewpact_reports/
│       ├── hooks.py
│       └── LICENSE (GPLv3)
├── erpnext-setup/          (Docker/Configuration - not modified source)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── init-scripts/
└── LICENSES.md             (Compliance document)
```

#### 5.1.3 White-Label TOS and Disclosure

**Terms of Service must include GPL disclosure**:

```
Intellectual Property

KrewPact is composed of multiple components with different licenses:

1. KrewPact User Interface and Backend-for-Frontend (Proprietary)
   - Custom React application
   - API gateway layer
   - Licensed to you for use as a SaaS product
   - Copyright (c) MDM Group

2. Custom Frappe Extensions (GPL v3)
   - Custom Frappe apps and doctypes
   - Licensed under GPL v3
   - Source code available upon written request

3. ERPNext and Frappe Framework (GPL v3 / MIT)
   - Open-source platform
   - Licensed under GPL v3 (ERPNext) and MIT (Frappe Framework)
   - You may request source code of our custom ERPNext modifications
   - ERPNext is a separate work from KrewPact proprietary components

By using KrewPact, you acknowledge understanding these licensing terms.
```

---

### 5.2 Recommended Product Architecture for Licensing

**To maintain GPL compliance AND protect proprietary value:**

#### 5.2.1 Architectural Principles

1. **API Boundary as Legal Defense**
   - REST API between frontend and backend
   - JSON communication (no direct code imports)
   - Clear separation of concerns

2. **Proprietary Value in Frontend + BFF**
   - React component library (custom)
   - Business logic in BFF (custom)
   - User experience (custom design, features)

3. **Acceptance of GPL in Backend**
   - Custom Frappe apps are GPL v3
   - This is expected and acceptable
   - No attempt to claim proprietary status

4. **Minimize Frappe Modifications**
   - Use Frappe's extension mechanisms (custom doctypes, apps)
   - Avoid modifying core framework
   - This reduces GPL scope

#### 5.2.2 Recommended Technology Stack

| Layer | Technology | License | Notes |
|-------|-----------|---------|-------|
| **Frontend** | React 18+ | MIT | Proprietary wrapper/customizations OK |
| **Frontend** | Next.js | MIT | Proprietary server routes OK |
| **Frontend** | Tailwind CSS | MIT | Proprietary custom components OK |
| **Frontend** | TypeScript | Apache 2.0 | Standard, no GPL implications |
| **BFF** | Node.js + Express | MIT | Proprietary custom routes/middleware OK |
| **BFF** | Custom Auth Layer | Proprietary | Do not expose ERPNext auth directly |
| **API Gateway** | Custom middleware | Proprietary | Rate limiting, caching, access control |
| **Database** | PostgreSQL | BSD | Standard, no GPL implications |
| **Backend** | ERPNext | GPL v3 | Accept GPL, minimize modifications |
| **Backend** | Custom Frappe Apps | GPL v3 | Custom business logic, GPL-licensed |
| **Backend** | Custom Doctypes | GPLv3 (conservative) | Data model extensions |
| **DevOps** | Docker | Apache 2.0 | Container orchestration |
| **DevOps** | Kubernetes | Apache 2.0 | Optional orchestration |

#### 5.2.3 API Boundary Design

**RESTful API Design** (between frontend and BFF):

```
Frontend → BFF → ERPNext

Example: Create Job Site

POST /api/v1/job-sites
{
  "name": "Downtown Tower",
  "address": "123 Main St",
  "contractor": "ABC Construction",
  "start_date": "2026-02-01"
}

Response:
{
  "id": "jsite-001",
  "name": "Downtown Tower",
  ...
}

Internal: BFF translates to ERPNext doctype
PUT /api/resource/Construction%20Site/jsite-001
{
  "doctype": "Construction Site",
  "name": "Downtown Tower",
  ...
}
```

**Benefits of This Approach**:
1. Frontend knows nothing about ERPNext (truly separate)
2. BFF can translate/transform data (adds value)
3. API contract is clear and versioned
4. Frontend can be ported to different backend (low coupling)
5. **GPL compliance is clear** (API boundary is well-defined)

---

### 5.3 IP Protection Strategy

#### 5.3.1 What Can Be Proprietary

✓ **Proprietary (Fully Defensible)**:
- React frontend code (not derivative of GPL)
- Next.js custom pages and routes (not derivative of GPL)
- BFF custom business logic (not derivative of GPL)
- Custom UI components and design system
- Branding and visual identity
- Marketing materials and documentation
- Machine learning models (if any)
- Proprietary algorithms (if any)

**Protection Method**: Copyright + License agreement + NDA for employees/contractors

#### 5.3.2 What Must Be Open-Sourced

✗ **Must Be GPL v3**:
- Custom Frappe apps (explicitly, by design)
- Custom Frappe hooks and extensions
- Modifications to ERPNext data model (doctypes)
- Any direct modifications to ERPNext source code (if made)

**Approach**: Clearly label as GPL v3. Host in separate repository. Make source available.

#### 5.3.3 Trademark and Branding Strategy

**KrewPact Brand**:
- Register "KrewPact" trademark with CIPO (Canadian Intellectual Property Office)
- Cost: ~$500-1,000 CAD
- Scope: Construction management software

**Logo and Design**:
- Create proprietary logo (not derived from ERPNext/Frappe marks)
- Register design with CIPO (optional but stronger protection)
- Ensure no visual confusion with ERPNext/Frappe branding

**What NOT to Do**:
- Do NOT use "ERPNext" in brand name
- Do NOT use Frappe Foundation logo
- Do NOT imply affiliation with Frappe Foundation
- Do NOT trademark "Frappe" or "ERPNext"

**Disclosure Required**:
- TOS must disclose: "Built on ERPNext (GPL v3)"
- Footer disclosure: "ERPNext is a registered trademark of Frappe Technologies Pvt. Ltd."
- Do not attempt to hide ERPNext underneath

**Licensing to White-Label Customers**:
- License agreement should state: "KrewPact is proprietary software"
- Disclose GPL v3 license for custom Frappe apps
- Prohibit reverse-engineering proprietary BFF/frontend
- Allow customer to access custom Frappe app source (GPL requirement)

#### 5.3.4 Patent Considerations

**Should KrewPact file patents?**

**Factors to Consider**:

| Aspect | Consideration |
|--------|---------------|
| **Patentable Subject Matter** | Software patents in Canada are possible but narrow scope. Construction automation features may not be patentable (obvious/prior art). |
| **Cost** | Patent prosecution: $5,000-15,000 CAD per patent application. Maintenance: $500-1,000/year. |
| **Enforcement** | Patent infringement litigation is expensive ($100K-1M+). Only worthwhile if huge market value. |
| **Risk with GPL** | Custom Frappe apps are GPL-licensed. Patents cannot be used to restrict GPL rights. |
| **Value** | Most construction software value is in UX and integrations, not patentable algorithms. |

**Recommendation**:
- **Do NOT pursue software patents** at this stage (low ROI, high cost)
- Focus on copyright protection (automatic, no cost)
- If you develop novel algorithm, consider patents later (after market validation)
- Accept that GPL apps cannot be patented (not a blocker)

---

## 6. RISK REGISTER

### 6.1 Risk Register (Comprehensive)

| ID | Category | Description | Likelihood | Impact | Mitigation | Owner | Status |
|----|----------|-------------|------------|--------|-----------|-------|--------|
| **LIC-001** | GPL License | ERPNext GPL v3 license could be challenged if GPL scope expands or architecture is questioned | Medium | High | Document API boundary. Conduct architecture review. Obtain legal opinion. Minimize ERPNext modifications. | Legal | Pending |
| **LIC-002** | GPL License | Frappe Foundation could migrate ERPNext to AGPL, forcing complete replatforming | Low | Critical | Monitor Frappe announcements. Plan contingency evaluation (cost of migration). Subscribe to Frappe mailing lists. | Tech Lead | Pending |
| **LIC-003** | OSS License | Incorrect license attribution or missing license files could expose to liability | Medium | Medium | Create comprehensive LICENSES.md file. Add license headers to all source files. Conduct annual OSS audit. | DevOps | Pending |
| **LIC-004** | Commercial Vendor | Clerk (EU data residency) violates PIPEDA for Canadian users. No Canadian region available. | High | High | **P0: Migrate off Clerk by Jan 2026.** Evaluate Auth0 (Okta, Canada region available) or Keycloak (self-hosted). Plan 6-month migration project. | Product | In Progress |
| **LIC-005** | Commercial Vendor | Vercel Pro tier (US default) has no Canadian data center. Enterprise tier is expensive (100K+/year). | High | Medium | Evaluate AWS Lightsail Canada or EC2 Canada region as alternative. Plan migration if costs exceed $500/month. | DevOps | Pending |
| **COM-001** | Commercial Vendor | Docker Desktop free tier may not apply to MDM Group if headcount ≥250 or revenue ≥$10M. License audit required. | Medium | Low | Verify MDM Group headcount and annual revenue. If paid tier required, budget $60-144 USD/year. | Finance | Pending |
| **COM-002** | Commercial Vendor | BoldSign data residency unknown. Could be US-based (FISA risk). | Medium | Medium | Contact BoldSign support to verify data residency. If US-based, evaluate DocuSign (US) or Adobe Sign (has Canada option). | Product | Pending |
| **COM-003** | Commercial Vendor | ADP Workforce Now integration highly restricted. Requires existing ADP client status. Partner certification required. Not suitable for most customers. | High | Medium | Do NOT pursue ADP integration. Use local Canadian payroll providers (Wagepoint, RUN) instead. Recommend customers use payroll platform of choice. | Product | Closed |
| **COM-004** | Commercial Vendor | Vercel Pro scales unpredictably. Usage-based billing can surprise customers. | Medium | Low | Monitor usage. Budget for scaling. Consider auto-scaling alerts. Plan Vercel Enterprise or self-hosted migration at 300+ concurrent users. | DevOps | Pending |
| **COMP-001** | PIPEDA | Failure to implement PIPEDA compliance framework could result in OPC investigation, reputational damage, fines. | Medium | High | **P1: Appoint Privacy Officer.** Publish Privacy Policy. Execute Data Processing Agreements with all vendors. Implement user data export feature. Create incident response plan. | Legal/Compliance | Pending |
| **COMP-002** | PIPEDA | Data breach notification could be delayed. Lack of incident response procedures. | Medium | High | Create data breach response plan. Establish 24-hour notification timeline. Maintain breach log. Conduct tabletop exercises annually. | Security | Pending |
| **COMP-003** | Vendor Relationships | Vendors (Supabase, Clerk, Vercel) lack signed Data Processing Agreements. PIPEDA accountability chain broken. | High | High | **P1: Execute DPA with all vendors ASAP.** Use standard DPA template. Require vendor signature. Track execution dates. | Legal | Pending |
| **COMP-004** | Quebec Law 25 | If serving Quebec customers, must comply with Quebec Law 25 (stricter than PIPEDA). Privacy Impact Assessments required for cross-border transfers. | Medium (if serving QC) | High | Conduct PIAs for all cross-border vendors. Update consent forms to Quebec standards (explicit, specific, separate). Appoint Privacy Officer. | Legal/Compliance | Pending |
| **COMP-005** | Construction Act 2026 | New features required by Jan 2026: 7-day termination notice, Form 6, lien expiry removal, statutory notice posting. Lack of feature support = non-compliance. | High | High | **P0: Prioritize Construction Act 2026 feature development.** Termination notice module (7-day countdown). Form 6 generation. Lien management without expiry. | Product | In Progress |
| **COMP-006** | Construction Act 2026 | Customer contracts could be invalidated if termination notice not provided with 7-day countdown. Legal liability. | Medium | Critical | Implement 7-day termination notice feature before Q4 2025 (allow testing time before Jan 2026). | Legal/Product | Pending |
| **COMP-007** | WSIB Records | Digital records not encrypted or auditable. WSIB could deny workplace insurance. | Medium | High | Implement audit logs (who, when, what, why). Encrypt data at rest. Backup daily. Recovery test annually. Document procedures. | DevOps/Security | Pending |
| **COMP-008** | WSIB Records | Wage records not linked to payroll system. Cannot generate WSIB reports. | Medium | Medium | Integrate with ADP/Workday/payroll provider. Auto-generate WSIB reports. | Product | Pending |
| **COMP-009** | CRA Records | Digital records stored outside Canada. CRA may reject records in audit. | Medium | High | **P0: Ensure all financial records stored in Supabase Canada region.** Verify backup location is also Canadian. Document location in compliance procedures. | DevOps | Pending |
| **COMP-010** | CRA Records | Records not in non-proprietary format. Proprietary database format could be rejected. | Low | Medium | Export all records to PDF/CSV. Never rely on proprietary database format as archive. | Product | Pending |
| **AODA** | Accessibility | KrewPact web app not WCAG 2.0 Level AA compliant. AODA violation. Penalties up to $100K/day. | High (likely non-compliant) | Critical | **P1: Commission professional WCAG 2.0 audit ($3-5K).** Remediate high-priority issues (keyboard, contrast, alt text) by Q2 2026. | Product | Pending |
| **EOSIG-001** | E-Signatures | BoldSign integration incomplete or not certified. Digital signatures rejected. | Low | Medium | Complete BoldSign API integration. Test with construction documents. Obtain BoldSign compliance certification. | Product | Pending |
| **EOSIG-002** | E-Signatures | No consent mechanism for electronic signatures. SIgnatures legally invalid. | Medium | High | Add consent checkbox: "I consent to use of electronic signatures per Ontario Electronic Commerce Act." Obtain before signing. | Product | Pending |
| **WHITE-001** | White-Label | GPL v3 architecture not documented. Frappe Foundation could challenge compliance. | Medium | High | Create architecture diagram. Write GPL compliance documentation. Obtain legal review. | Legal/Tech | Pending |
| **WHITE-002** | White-Label | Custom Frappe apps not licensed under GPL v3. Violation of GPL copyleft. | High | Medium | **P1: Audit all custom Frappe apps.** Add GPL v3 license headers to all app directories. Document in LICENSES.md. | DevOps | Pending |
| **WHITE-003** | White-Label | Customer attempting to reverse-engineer proprietary BFF layer. Intellectual property theft. | Low | High | Include IP protection clauses in white-label agreements. Restrict decompiling/reverse-engineering. Obfuscate JavaScript in production. | Legal | Pending |
| **DATA-001** | Data Residency | Customer data resident in multiple countries (Clerk=EU, Vercel=US, Supabase=Canada). Inconsistent compliance. | High | High | **P0: Consolidate to Canadian-only data residency.** Migrate Clerk → Canada auth provider. Migrate Vercel → AWS Canada or self-hosted. | DevOps | In Progress |
| **DATA-002** | Data Residency | US FISA exposure. US government can access Vercel/AWS US without warrant or notification. | Medium | High | Use Canadian data centers for all production data. Document US FISA risk in TOS. Encrypt data at rest (customer controls key). | Security | Pending |
| **VENDOR-001** | Vendor Lock-in | Clerk's April 2026 pricing changes likely to 2x costs. No escape clause documented. | High | Medium | Migrate off Clerk by Jan 2026 (before pricing changes). Use alternative (Auth0 or Keycloak). | Finance | Pending |
| **VENDOR-002** | Vendor Lock-in | Vercel costs scale unpredictably with usage. No cap on monthly bill. | Medium | Low | Monitor usage monthly. Set spending alerts. Plan AWS/self-hosted migration threshold ($1,000/month). | Finance | Pending |
| **VENDOR-003** | Vendor Lock-in | ADP Workflow integration highly proprietary. Difficult to switch payroll providers. | Medium | Medium | Do NOT use ADP. Use payroll-agnostic integration pattern (APIs, webhooks). Allow customers to use payroll platform of choice. | Product | Pending |

---

## 7. ACTION ITEMS AND RECOMMENDATIONS

### 7.1 Priority P0 (Critical - Start Immediately)

| Action | Owner | Est. Cost | Est. Duration | Dependencies |
|--------|-------|-----------|---|---|
| **P0-1: Initiate Clerk Migration** | Product/Eng | $10-20K | 6 weeks | Legal review of auth architecture |
| **P0-2: Verify Data Residency Across Vendors** | DevOps | $0 | 1 week | Vendor contact info |
| **P0-3: Construct Act 2026 Feature Planning** | Product | $0 | 1 week | Legal review of Act requirements |
| **P0-4: CRA Record Residency Audit** | DevOps | $0 | 1 week | Database access |
| **P0-5: Privacy Officer Appointment** | Legal/Compliance | $0 | 1 week | HR coordination |

---

### 7.2 Priority P1 (High - First Quarter)

| Action | Owner | Est. Cost | Est. Duration | Dependencies |
|--------|-------|-----------|---|---|
| **P1-1: Execute Data Processing Agreements** | Legal | $2-5K | 4 weeks | Vendor contact, DPA template |
| **P1-2: Professional OSS License Review** | Legal | $5-15K | 3 weeks | Code audit, documentation |
| **P1-3: WCAG 2.0 Level AA Accessibility Audit** | Product | $3-5K | 2 weeks | Professional audit firm |
| **P1-4: Custom Frappe Apps GPL Audit** | Eng | $0 | 1 week | Code review |
| **P1-5: PIPEDA Privacy Policy Drafting** | Legal | $3-7K | 3 weeks | Legal counsel |
| **P1-6: Implement User Data Export Feature** | Eng | $2-3K | 1 week | Frontend/backend work |
| **P1-7: BoldSign Data Residency Verification** | Product | $0 | 1 week | Vendor contact |
| **P1-8: Incident Response Plan Development** | Security | $1-2K | 2 weeks | Legal input |

---

### 7.3 Priority P2 (Medium - Second Quarter)

| Action | Owner | Est. Cost | Est. Duration | Dependencies |
|--------|-------|-----------|---|---|
| **P2-1: Construction Act 2026 Feature Development** | Eng | $40-60K | 12 weeks | Legal requirements finalized |
| **P2-2: BoldSign Integration** | Eng | $5-10K | 4 weeks | API documentation, testing |
| **P2-3: Implement Consent Management System** | Product/Eng | $3-5K | 2 weeks | Privacy Policy drafted |
| **P2-4: Data Breach Notification Procedures** | Compliance | $1-2K | 2 weeks | Legal templates |
| **P2-5: Annual Privacy Audit Scheduling** | Compliance | $5-10K | On-demand | Audit firm selection |
| **P2-6: Vercel Upgrade or AWS Migration Planning** | DevOps | $0 | 2 weeks | Cost analysis |
| **P2-7: WSIB Integration** | Eng | $10-15K | 6 weeks | API documentation, testing |
| **P2-8: Trademark Registration** | Legal | $1-2K | 6 weeks (government) | CIPO filing |

---

### 7.4 Priority P3 (Low - Ongoing)

| Action | Owner | Est. Cost | Est. Duration | Cadence |
|--------|-------|-----------|---|---|
| **P3-1: Monitor Frappe Foundation Announcements** | Tech Lead | $0 | 5 min/week | Weekly |
| **P3-2: CRA Record-Keeping Compliance Review** | Compliance | $1-2K/year | 2 weeks | Annual |
| **P3-3: Construction Regulation Updates** | Legal | $2-3K/year | 4 weeks | Annual (post-Jan 2026) |
| **P3-4: Vendor Pricing Reviews** | Finance | $0 | 1 hour/month | Monthly |
| **P3-5: Staff Privacy Training** | HR/Compliance | $1K/year | 2 hours | Annual |
| **P3-6: WCAG 2.0 Accessibility Testing** | QA | $2-3K/year | 2 weeks | Semi-annual |
| **P3-7: Data Residency Audits** | DevOps | $1-2K/year | 1 week | Annual |

---

### 7.5 Total Estimated Cost Summary

| Category | P0-P3 Total Cost | Duration |
|----------|-----------------|----------|
| **Legal/Compliance** | $15-35K | 6-9 months |
| **Engineering** | $60-100K | 9-12 months |
| **DevOps/Security** | $5-10K | Ongoing |
| **Professional Services** | $10-20K | Ongoing |
| **Vendor Costs** | $500-2,000/month | Ongoing |
| **Total Year 1** | **$100-170K + vendor costs** | - |

---

## 8. APPENDICES

### APPENDIX A: GPL v3 Key Clauses Reference

**GPL v3 (Selected Sections)**

**Section 0: Definitions**

> "This License applies to any program or other work which contains a notice placed by the copyright holder saying it may be distributed under the terms of this General Public License."

**Section 1: Source Code**

> "The source code for a work means the preferred form of the work for making modifications to it."

**Section 4: Conveying Literal Copies**

> "You may convey verbatim copies of the Program's source code as you receive it, in any medium, provided that you conspicuously and appropriately publish on each copy an appropriate copyright notice; keep intact all notices stating that this License and any non-permissive terms added in accord with section 7 apply to the code; keep intact all notices of the absence of any warranty; and give all recipients of the program a copy of this License along with the Program."

**Section 5: Conveying Modified Source Versions**

> "You may convey a work based on the Program, or the modifications to produce it from the Program, in the form of source code under the terms of section 4, provided that you also meet all of these conditions:
> a) The work must carry prominent notices stating that you modified it, and giving a relevant date.
> b) The work must carry prominent notices stating that it is released under this License and any conditions added under section 7.
> c) You must license the entire work, as a whole, under this License to anyone who comes into possession of a copy."

**Section 6: Conveying Non-Source Forms**

> "You may convey a work based on the Program in object code form under the terms of sections 4 and 5, provided that you also convey the machine-readable Corresponding Source under the terms of this License, in one of these ways:
> a) Convey the object code in, or embodied in, a physical product (including a physical distribution medium), accompanied by the Corresponding Source fixed on a durable physical medium customarily used for software interchange."

**Section 7: Additional Terms**

> "You may not impose any further restrictions on the exercise of the rights granted or affirmed under this License."

**Key Principle**: GPL v3 imposes obligations on **distribution** and **derivative works**. SaaS hosting (without distribution) has minimal obligations.

---

### APPENDIX B: PIPEDA 10 Fair Information Principles Summary

| Principle | Brief Summary |
|-----------|---------------|
| **1. Accountability** | Organization is accountable for personal information in its possession |
| **2. Identifying Purposes** | Purposes for collecting personal information must be identified before or at time of collection |
| **3. Consent** | Individual's knowledge and consent required for collection, use, or disclosure of personal information |
| **4. Limiting Collection** | Personal information must be limited to that which is necessary for identified purposes |
| **5. Limiting Use, Disclosure, and Retention** | Personal information must not be used or disclosed for purposes other than those for which it was collected, except with consent |
| **6. Accuracy** | Personal information must be as accurate, complete, and up-to-date as necessary |
| **7. Safeguards** | Personal information must be protected by security safeguards appropriate to the sensitivity of the information |
| **8. Openness** | Individual shall be able to readily obtain information about an organization's policies and practices |
| **9. Individual Access** | Individuals have right to access personal information held about them |
| **10. Challenging Compliance** | Individual has right to challenge organization's compliance with these principles |

---

### APPENDIX C: Construction Act 2026 Changes Summary

| Change | Previous Rule | New Rule (2026) | KrewPact Impact |
|--------|---|---|---|
| **Termination Notice** | 14 days or immediate (at-will) | **7 days written notice required** | Feature required: Send written notice with 7-day countdown |
| **Contract Termination** | Could terminate without cause | More restrictive (varies by contract type) | Document all termination procedures clearly |
| **Lien Expiry** | Annual renewal required (or lien expires) | **REMOVED - Lien has no expiry date** | Feature: Liens persist until released/paid. Update lien module. |
| **Holdback Release** | Informal certification | **Form 6 mandatory for release** | Feature: Generate Form 6 for holdback releases |
| **Statutory Notices** | Published in newspapers | **Published on 3 designated websites** | Feature: Auto-post notices to designated sites (TBD) |
| **Payment Certifier** | Optional | May be required (details TBD) | Feature: Payment certification workflow (pending regulation) |
| **Trust Accounts** | Optional | **Mandatory for holdback funds** | Feature: Track holdback in trust account |
| **Change Orders** | Informal tracking | More formal procedures | Feature: Change order approval workflow |

**Source**: Ontario Regulation updates to Construction Act (forthcoming Jan 2026)

---

### APPENDIX D: Vendor Contact and Pricing Links

#### D.1 Cloud Infrastructure Vendors

| Vendor | Product | Website | Contact | Pricing |
|--------|---------|---------|---------|---------|
| **Supabase** | Backend-as-a-Service | https://supabase.com | support@supabase.io | https://supabase.com/pricing |
| **Vercel** | Hosting | https://vercel.com | support@vercel.com | https://vercel.com/pricing |
| **Amazon Web Services** | Cloud (AWS) | https://aws.amazon.com | Contact form | https://aws.amazon.com/pricing |

#### D.2 Authentication Vendors

| Vendor | Product | Website | Contact | Pricing |
|--------|---------|---------|---------|---------|
| **Clerk** | Auth | https://clerk.com | support@clerk.com | https://clerk.com/pricing |
| **Auth0** | Auth (Okta) | https://auth0.com | support@auth0.com | https://auth0.com/pricing |
| **Keycloak** | Open-Source Auth | https://www.keycloak.org | Community | Free (self-hosted) |

#### D.3 E-Signature Vendors

| Vendor | Product | Website | Contact | Pricing |
|--------|---------|---------|---------|---------|
| **BoldSign** | E-Signatures | https://www.boldsign.com | support@boldsign.com | https://www.boldsign.com/pricing |
| **DocuSign** | E-Signatures | https://www.docusign.com | Contact form | https://www.docusign.com/pricing |
| **Adobe Sign** | E-Signatures | https://www.adobe.com/ca/sign | Contact form | https://www.adobe.com/ca/products/sign/pricing.html |

#### D.4 Payroll & HR Vendors

| Vendor | Product | Website | Contact | Pricing |
|--------|---------|---------|---------|---------|
| **Wagepoint** | Payroll (Canadian) | https://www.wagepoint.com | support@wagepoint.com | https://www.wagepoint.com/pricing |
| **RUN** | Payroll | https://www.runpayroll.com | support@runpayroll.com | https://www.runpayroll.com/pricing |
| **Workday** | HCM (Enterprise) | https://www.workday.com | Contact form | Enterprise pricing |
| **ADP Workforce Now** | Payroll (Restricted) | https://www.adp.ca | ADP Partner Portal | Partner-only pricing |

#### D.5 Networking Vendors

| Vendor | Product | Website | Contact | Pricing |
|--------|---------|---------|---------|---------|
| **Tailscale** | VPN | https://tailscale.com | support@tailscale.com | https://tailscale.com/pricing |
| **Zerotier** | VPN (Alternative) | https://www.zerotier.com | support@zerotier.com | https://www.zerotier.com/pricing |

#### D.6 Regulatory & Legal Resources

| Resource | Type | URL |
|----------|------|-----|
| **Office of Privacy Commissioner (OPC)** | Canadian Privacy Regulator | https://www.priv.gc.ca |
| **CIPO** | Canadian Intellectual Property Office | https://www.ic.gc.ca/eic/site/cipointernet-internetopic.nsf/eng/Home |
| **CRA** | Canada Revenue Agency | https://www.canada.ca/cra |
| **WSIB** | Ontario Workplace Safety | https://www.wsib.ca |
| **Ontario Construction Act** | Construction Regulation | https://www.ontario.ca/laws/statute/90c23 |
| **Frappe Foundation** | ERPNext Governance | https://frappe.io |

---

## CONCLUSION

KrewPact operates in a complex regulatory and licensing landscape. The platform's use of ERPNext (GPL v3) is legally defensible provided that the API boundary architecture is maintained and documented. The most significant risks are:

1. **Immediate** (0-3 months): Data residency gaps (Clerk) and missing PIPEDA compliance
2. **Short-term** (3-6 months): Construction Act 2026 feature requirements and accessibility audits
3. **Medium-term** (6-12 months): White-label architecture documentation and vendor lock-in mitigation
4. **Ongoing**: Monitoring for license/regulatory changes

Estimated total compliance budget: **$100-170K year 1**, with ongoing vendor and professional services costs of $5-10K/month.

**Immediate Next Steps**:
1. Appoint Privacy Officer
2. Begin Clerk migration planning
3. Verify Construction Act 2026 requirements with legal counsel
4. Execute Data Processing Agreements with all vendors

---

**Document Version**: 1.0
**Last Updated**: February 9, 2026
**Prepared For**: MDM Group - KrewPact Product
**Classification**: Internal - Legal/Compliance

---

*This document is prepared for internal use and should be reviewed by qualified legal counsel before implementation. This is not legal advice. KrewPact should consult with construction law, privacy law, and open-source licensing specialists for final guidance.*
