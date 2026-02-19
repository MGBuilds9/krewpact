# KrewPact / KrewPact — Strategic Assessment

**Date:** February 9, 2026
**Author:** Claude (co-architect review)
**Scope:** Full evaluation of 18 planning documents + existing codebase (202 commits, ~36k LOC)
**Purpose:** Determine whether to build on the existing prototype or start fresh

---

## Executive Summary

KrewPact has a **strong documentation foundation** (18 well-structured planning docs) and a **functional prototype** (5 months, ~36k lines of TypeScript/React). However, there is a **critical misalignment between what was documented and what was built**, and the codebase has significant architectural gaps that affect production readiness.

**Bottom line:** The existing code is worth keeping for its UI layer and database schema, but the architecture needs a controlled migration — not a full rewrite, but not a simple extension either. The recommended path is a **hybrid approach**: preserve the frontend components and database, but restructure the project into the documented Next.js + BFF architecture before adding the remaining 50% of features.

---

## Part 1: Documentation Health

### Overall Quality: 8/10

The 18 documents cover product strategy, architecture, security, compliance, infrastructure, integrations, licensing, and operations comprehensively. Cross-referencing is strong — the Feature PRD links to the SQL schema, which links to the API matrix, which links to the ERPNext mapping.

### What's Well-Done

- **Product Vision** is clear: KrewPact is an operations command layer above ERPNext, not an ERP replacement
- **Architecture Decisions** (25 ADRs) are well-reasoned with alternatives considered and consequences documented
- **SQL Schema** is production-ready with RLS, audit trails, and proper constraints across 63 migrations
- **Integration Contracts** specify retry logic, circuit breakers, idempotency, and conflict resolution
- **Licensing Audit** correctly identifies the ERPNext GPL v3 vs. AGPL distinction and API boundary defense
- **Security Framework** covers defense-in-depth, RBAC with 13 roles, and Canadian compliance (PIPEDA, AODA)

### Critical Gaps in Documentation

| Gap | Impact | Priority |
|-----|--------|----------|
| **No formal MVP scope** | 16 epics with no explicit Phase 1 cutline — everything looks equally important | Critical |
| **No Sage migration playbook** | Data migration strategy mentioned but not specified (schema mapping, validation, rollback) | Critical |
| **No offline sync conflict resolution algorithm** | "Offline-first" declared as mandatory but conflict resolution logic undefined | High |
| **No performance SLOs** | No API response time targets, page load budgets, or sync latency requirements | High |
| **No change management plan** | 300+ users transitioning from manual/Sage workflows with no training strategy | High |
| **No disaster recovery plan** | Backup strategy exists but RTO/RPO targets undefined | Medium |
| **No vendor contingency plans** | Heavy reliance on Clerk, Supabase, Vercel with no fallback if a vendor fails | Medium |
| **No post-launch operations** | SLAs, on-call rotation, incident response, and runbooks not documented | Medium |

### Internal Contradictions

| Document A | Document B | Contradiction |
|-----------|-----------|---------------|
| ADR-001: Next.js + Vercel | Codebase: Vite SPA | Code uses Vite, not Next.js — no SSR, no API routes, no middleware |
| ADR-002: Node.js BFF pattern | Codebase: Supabase Edge Functions | No BFF exists — frontend calls Supabase directly |
| ADR-009: BullMQ + Redis for job queue | Codebase: No queue found | Zero background job infrastructure |
| Master Plan: "Offline-first mandatory" | Codebase: No offline capability | No IndexedDB, no service workers, no sync queue |
| Integration Contracts: ERPNext sync | Codebase: Zero ERPNext code | Most documented integration doesn't exist |

---

## Part 2: Codebase Health

### Vital Statistics

| Metric | Value |
|--------|-------|
| Framework | Vite 5.4 + React 18.3 (NOT Next.js) |
| Language | TypeScript 5.8 (strict mode) |
| Lines of code | ~36,000 |
| Source files | 214 TypeScript/TSX |
| Components | 135+ (60+ shadcn/ui + 75+ custom) |
| Custom hooks | 30 |
| Test files | 9 (4.2% file coverage) |
| Supabase migrations | 63 |
| Git commits | 202 over 5 months |
| Contributors | 49% AI-generated (gpt-engineer-app[bot]), 34% human (Michael), 11% AI (Jules), 5% Narcothetechy |

### What's Actually Built (vs. Documented)

| Epic | Documented | Code Status | Gap |
|------|-----------|-------------|-----|
| Identity & Access | Full RBAC, MFA, domain restriction | ✅ Implemented (Clerk + RBAC hooks) | Minor polish |
| Project Management | Full lifecycle, scheduling, tasks | ✅ Implemented (ProjectDetail, calendar, task tabs) | Working |
| Team & Organization | Org chart, skill matrix, divisions | ✅ Implemented (TeamProfileModal, OrgChart) | Working |
| Documents & Files | Upload, preview, share, versioning | ✅ Implemented (DocumentManager, FilePreview) | Working |
| Notifications | Email, in-app, celebration reminders | ✅ Implemented (NotificationCenter) | Working |
| Settings & Config | Account, profile, system, notifications | ✅ Implemented (5 settings tabs) | Working |
| Dashboard & Reporting | Smart dashboard, widgets, analytics | 🟡 Partial (widgets exist, limited data) | Needs data |
| Financial Operations | AR/AP, budgets, invoicing, ERPNext sync | 🟡 Partial (expenses only) | Major gap |
| CRM & Pipeline | Leads, contacts, opportunities | 🔴 Not found | Full build |
| Estimating Engine | Assemblies, pricing, proposals | 🔴 Not found | Full build |
| Contracting | Contracts, e-signatures (BoldSign) | 🔴 Not found | Full build |
| Change Orders | CO workflow, approvals, cost impact | 🔴 Not found | Full build |
| RFIs & Submittals | RFI creation, tracking, responses | 🔴 Not found | Full build |
| Field Operations | Daily logs, inspections, offline | 🔴 Not found | Full build |
| Time & Payroll | Time tracking, ADP integration | 🔴 Minimal | Full build |
| Quality & Compliance | Inspections, punch lists, warranty | 🔴 Not found | Full build |

**Summary:** ~6 of 16 epics have real code. The remaining 10 epics are unbuilt.

### Architecture Issues

**1. Wrong Framework (High Impact)**
Docs specify Next.js for SSR, API routes, and middleware. Code uses Vite (client-only SPA). This means no server-side rendering, no API route layer, no edge middleware, no built-in BFF. Every API call goes directly from browser to Supabase.

**2. No Backend/BFF Layer (High Impact)**
The documented Node.js BFF (Backend-For-Frontend) doesn't exist. The BFF was designed to orchestrate ERPNext sync, enforce business rules, handle webhooks, and manage background jobs. Without it, the app can't integrate with ERPNext, can't process webhooks reliably, and can't run background tasks.

**3. No Job Queue (Medium Impact)**
BullMQ + Redis was documented for async operations (sync, notifications, webhooks). Nothing exists. This blocks reliable ERPNext synchronization and webhook processing.

**4. No Offline Capability (Medium Impact)**
Documented as "mandatory" for field operations. Zero implementation — no IndexedDB, no service workers, no background sync.

**5. Direct Supabase Calls (Medium Impact)**
Frontend hooks call `supabase.from('table')` directly without an abstraction layer. This creates tight coupling — if you later add the BFF, every hook needs refactoring.

### Code Quality Assessment

**Strengths:**
- Clean component organization (feature-based folders)
- 30 well-structured custom hooks with proper React Query integration
- Error boundaries at app, route, and component levels
- OpenTelemetry tracing instrumentation
- Proper Clerk → Supabase JWT synchronization
- RLS policies on all tables (recently refactored to use `requesting_user_id()`)

**Weaknesses:**
- 4.2% test coverage (9 test files for 214 source files)
- 85+ ESLint warnings (mostly `any` types and unused vars)
- 60+ console.log/console.error in production code
- Hardcoded role names in RBAC checks
- No request/response validation at the API boundary
- No rate limiting
- No CSRF protection

---

## Part 3: Build-On vs. Start Fresh

### Option A: Build on Existing Code

**Effort:** ~3-4 months to production-ready MVP
**Risk:** Medium-High

**Pros:**
- 5 months of work preserved (~36k LOC)
- Working auth, projects, team, documents, settings
- 63 database migrations (schema is solid)
- Familiar to current contributors

**Cons:**
- Must migrate Vite → Next.js (significant refactor)
- Must build BFF layer from scratch
- Must build 10 missing epics
- AI-generated code (60% of commits) may have hidden quality issues
- 4% test coverage means changes are high-risk
- Architecture drift from docs creates confusion about "source of truth"

### Option B: Start Completely Fresh

**Effort:** ~6-8 months to production-ready MVP
**Risk:** Medium

**Pros:**
- Clean architecture from day 1 (Next.js + BFF as documented)
- Consistent with all 18 planning docs
- Can enforce test coverage minimums from start
- No legacy AI-generated code debt
- Proper offline-first from the beginning

**Cons:**
- 5 months of work discarded
- Must rebuild working features (auth, projects, team, etc.)
- Database schema work partially wasted (though schema can be reused)
- Psychological cost of "starting over"
- shadcn/ui components (60+) must be reconfigured

### Option C: Hybrid Migration (Recommended)

**Effort:** ~4-5 months to production-ready MVP
**Risk:** Medium-Low

**What to keep:**
- Database schema and all 63 migrations (Supabase)
- shadcn/ui component library (60+ components)
- Custom React components that are UI-only (no direct Supabase calls)
- Clerk auth configuration and RBAC logic
- Design patterns and business logic from hooks

**What to rebuild:**
- Project scaffolding (Vite → Next.js App Router)
- API layer (add Next.js API routes as BFF)
- Data fetching (refactor hooks to call BFF instead of Supabase directly)
- Background job system (BullMQ + Redis)
- ERPNext integration layer
- All 10 missing epics (build correctly from start)

**What to fix:**
- Test coverage (target 50%+ for critical paths)
- Remove hardcoded values and console.logs
- Add proper error handling and validation
- Add offline-first infrastructure (IndexedDB + service workers)

---

## Part 4: Recommended Path Forward

### Phase 0: Foundation Reset (Weeks 1-3)

**Goal:** Align architecture with documentation before building anything new.

1. **Scaffold Next.js App Router project** with the existing Supabase database
2. **Port shadcn/ui components** (copy the `/components/ui` directory — it's framework-agnostic)
3. **Set up Next.js API routes** as the BFF layer documented in ADR-002
4. **Connect Clerk** to Next.js middleware (Clerk has native Next.js support)
5. **Establish testing baseline** (Vitest + Playwright, 50% coverage target for new code)
6. **Set up CI/CD** per the DevOps doc (GitHub Actions → Vercel for frontend, Docker for backend)

### Phase 1: Core Operations MVP (Weeks 4-12)

**Goal:** Ship the features that match or exceed the JobTread feature floor for daily use.

Port from existing code (refactor to use BFF):
- Project management (ProjectDetail, tasks, calendar)
- Team & organization (org chart, divisions)
- Document management (upload, preview, share)
- Dashboard & widgets
- Settings & configuration
- Notifications

Build new:
- **ERPNext integration** (the most critical missing piece)
- **Estimating engine** (core to construction workflow)
- **Contracting** (with BoldSign e-signatures)
- **Change orders** (financial impact tracking)

### Phase 2: Field & Compliance (Weeks 13-20)

Build new:
- Field operations (daily logs, inspections, offline-first)
- Time tracking (with ADP integration)
- RFIs & submittals
- Quality & compliance (punch lists, warranty)
- CRM & pipeline

### Phase 3: Production Hardening (Weeks 21-24)

- Performance testing and SLO enforcement
- Security audit (pen test, PIPEDA review)
- Sage data migration execution
- User training and change management
- Disaster recovery testing
- Monitoring dashboards and alerting

---

## Part 5: Decisions Needed Before Proceeding

These are blocking questions that need answers before any code is written:

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| 1 | **Confirm Next.js migration** | Migrate to Next.js (align with docs) vs. stay on Vite (diverge from docs) | Architecture foundation |
| 2 | **Define MVP scope** | Which of the 16 epics must ship in v1? Which can wait? | Timeline and resource planning |
| 3 | **ERPNext integration depth** | Full bidirectional sync vs. read-only from ERPNext vs. defer entirely | Backend complexity |
| 4 | **Offline requirement** | True offline-first (PWA + IndexedDB) vs. graceful degradation vs. defer | Architecture complexity |
| 5 | **Team composition** | Solo + AI vs. small team vs. contractor(s) | Delivery velocity |
| 6 | **JobTread feature parity timeline** | When must each phase reach full feature parity with the JobTread benchmark? | Pressure on delivery scope |
| 7 | **White-label priority** | Build for MDM only first vs. multi-tenant from day 1 | Architecture decisions |
| 8 | **Clerk data residency** | Accept US hosting vs. find Canadian alternative vs. self-host auth | Compliance risk |

---

## Part 6: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ERPNext integration more complex than estimated | High | High | Spike/prototype ERPNext sync in week 1-2; define minimal sync scope |
| Scope creep across 16 epics | High | High | Formalize MVP scope; say "no" to Phase 2 features until Phase 1 ships |
| Single Proxmox node failure | Medium | Critical | Add HA node or cloud failover before production launch |
| Clerk outage blocks all access | Medium | High | Implement graceful degradation; cache auth tokens locally |
| GPL v3 licensing challenge from Frappe Foundation | Low | High | Get written clarification from Frappe; maintain strict API boundary |
| Team burnout (solo + AI development) | High | Medium | Set realistic timelines; consider bringing on 1-2 contractors for Phase 1 |
| Sage data loss during migration | Medium | High | Build migration validation suite; run parallel for 30+ days |
| PIPEDA non-compliance discovered post-launch | Low | High | Commission external privacy audit before launch |

---

## Appendix: Document-to-Code Traceability Matrix

| Document | Purpose | Code Alignment |
|----------|---------|---------------|
| Master Plan | Product vision, 16 epics | 🟡 Partially aligned (6/16 epics built) |
| Execution Board | Team, phases, sprints | 🔴 Not followed (no sprint structure visible in commits) |
| Feature PRD Checklist | Requirements traceability | 🟡 Partially covered |
| Blueprint Gap Matrix | Gap analysis vs. JobTread feature floor / ERPNext | 🔴 Gaps still open |
| ERPNext Doctype Mapping | Sync contract | 🔴 Zero implementation |
| SQL Schema Draft | Database design | ✅ Well-aligned (63 migrations, RLS, audit trails) |
| Forms Registry | UI form specifications | 🟡 Some forms built, most missing |
| API Test Matrix | Endpoint specs + test cases | 🔴 No BFF, no API layer, 4% test coverage |
| Product Vision & Strategy | Strategic direction | ✅ Directionally aligned |
| Cost & Vendor Analysis | Budget justification | ✅ Vendors match (Supabase, Clerk, Vercel) |
| Technology Stack ADRs | 25 architecture decisions | 🔴 Major deviation (Vite not Next.js, no BFF, no BullMQ) |
| Security Framework | Auth, RBAC, encryption | 🟡 Clerk + RLS implemented; gaps in rate limiting, CSRF |
| DevOps & CI/CD | Pipeline architecture | 🟡 GitHub exists, no CI/CD pipeline configured |
| Infrastructure & Deployment | Proxmox, VMs, networking | ⚠️ Not validated (infra separate from code) |
| Integration Contracts | Sync patterns, error handling | 🔴 Not implemented |
| Monitoring & Observability | Prometheus, Grafana, Loki | 🟡 OpenTelemetry in code; no Prometheus/Grafana |
| Licensing & Legal Audit | GPL, PIPEDA, AODA | ✅ Informational (no code impact) |

---

*This assessment is based on a full read of all 18 planning documents and a deep analysis of the 202-commit codebase. The recommendations prioritize shipping a production-ready MVP for MDM Group while preserving the work already done.*
