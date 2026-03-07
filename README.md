# KrewPact — Complete Production Planning Pack

> Unified operations hub for construction lifecycle management.
> Domain: **krewpact.com** | Built by MDM Group Inc., Mississauga, Ontario, Canada.

## Quickstart (Developers)

```bash
npm ci
cp .env.example .env.local
# Fill in keys (see docs/local-dev.md)
npm run dev
```

- **Full setup:** [docs/local-dev.md](docs/local-dev.md)
- **Operations:** [docs/runbook.md](docs/runbook.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Env vars:** [.env.example](.env.example)

---

## Planning Pack Overview

This folder contains **15 core planning documents** + **1 reference document** forming the complete, production-ready planning set for KrewPact — a modern, ERP-integrated construction operations platform for MDM Group Inc.

### Document Organization

- **Strategy & Architecture** (9 docs) — Vision, licensing, ADRs, security, infrastructure, integrations, DevOps, monitoring, costs
- **Product Specification** (6 docs) — Master plan, PRD, SQL schema, execution board, forms, ERPNext mapping, API matrix
- **Reference** (`reference/`) — Validation checklists, consolidation history

---

## Document Index

### Strategy, Licensing & Architecture

| #   | File                                            | Description                                                                                                                                                                      | Size   |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | `KrewPact-Product-Vision-and-Strategy.md`       | Product vision, strategic pillars, personas, feature domain map, competitive landscape, success metrics                                                                          | 91 KB  |
| 2   | `KrewPact-Licensing-and-Legal-Audit.md`         | **START HERE.** OSS license audit (ERPNext GPL v3 deep dive), vendor terms, PIPEDA, Construction Act 2026, AODA, data residency, white-label implications, 25-item risk register | 110 KB |
| 3   | `KrewPact-Technology-Stack-ADRs.md`             | 25 Architecture Decision Records — every technology choice with context, decision, consequences, and alternatives                                                                | 112 KB |
| 4   | `KrewPact-Security-and-Compliance-Framework.md` | Defense-in-depth security architecture, RBAC (13 roles), RLS policies, PIPEDA implementation, OWASP mitigations, AODA/WCAG, incident response, audit trail design                | 159 KB |
| 5   | `KrewPact-Infrastructure-and-Deployment.md`     | Proxmox VM/CT allocation, ZFS layout, VLAN design, Tailscale overlay, Vercel frontend, Supabase deployment, ERPNext Frappe Bench, backup/DR strategy                             | 70 KB  |
| 6   | `KrewPact-Integration-Contracts.md`             | All external integration specs: ERPNext (43 entity mappings), Clerk, BoldSign, ADP, Microsoft 365, file storage, notifications, webhook infrastructure, SLAs                     | 106 KB |
| 7   | `KrewPact-DevOps-and-CI-CD.md`                  | GitHub Actions pipelines, testing strategy (Vitest/Playwright/k6), code quality tooling, release management, IaC, developer experience guide                                     | 43 KB  |
| 8   | `KrewPact-Monitoring-and-Observability.md`      | Prometheus/Loki/Grafana stack, application and business metrics, alerting rules, Telegram bot notifications, dashboards, uptime/SLA monitoring                                   | 30 KB  |
| 9   | `KrewPact-Cost-and-Vendor-Analysis.md`          | Detailed vendor pricing, infrastructure costs, development team scenarios (solo+AI vs small team vs hybrid), TCO comparison, white-label revenue modeling                        | 51 KB  |

### Product Specification & Implementation

| #   | File                                         | Description                                                                                                                                                       | Size  |
| --- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 10  | `KrewPact-Master-Plan.md`                    | Decision-complete master plan: locked decisions, program outcomes, 8-layer architecture, canonical table groups, integration blueprint, security/compliance model | 13 KB |
| 11  | `KrewPact-Feature-Function-PRD-Checklist.md` | 16 epics, 70+ features, acceptance criteria, 9 internal + 4 external roles, cross-cutting requirements. Includes legacy blueprint → V2 scope expansion mapping    | 22 KB |
| 12  | `KrewPact-Backend-SQL-Schema-Draft.sql`      | PostgreSQL 15+ schema: 28 enums, 19+ table groups, RLS-ready, Supabase-compatible                                                                                 | 66 KB |
| 13  | `KrewPact-Execution-Board.md`                | 14-week delivery program with phase gates, team ownership matrix, risk register, release gates, acceptance metrics _(contains timelines)_                         | 16 KB |
| 14  | `KrewPact-Forms-Registry.md`                 | 95 internal forms, 5 client portal forms, 7 trade portal forms, 15 ERPNext operational forms, 5 system forms                                                      | 19 KB |
| 15  | `KrewPact-ERPNext-Doctype-Field-Mapping.md`  | 43 doctype crosswalk mappings, 16 required custom fields, 8 custom doctypes, sync rules, cutover checklist                                                        | 20 KB |
| 16  | `KrewPact-API-Acceptance-and-Test-Matrix.md` | 19 API endpoint groups, 100+ endpoints, acceptance criteria, test cases, quality gates                                                                            | 27 KB |

### Operational

| #   | File                                   | Description                                                                                                                                       | Size  |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 17  | `KrewPact-Access-and-Workflow-Plan.md` | Complete `.env.local` template (7 services), per-service setup checklists, Claude access model, ERPNext MCP server design, 4-phase build sequence | 18 KB |

### Reference Documents

| File                                                 | Purpose                                                                            |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `reference/VALIDATION-CHECKLIST-Codebase-vs-Docs.md` | Meta-review of planning docs vs. codebase health; use quarterly to track alignment |
| `reference/REDUNDANCY-AND-OVERLAP-ANALYSIS.md`       | Documentation of all overlap analysis decisions                                    |
| `reference/CONSOLIDATION-ACTION-PLAN.md`             | Consolidation actions taken and maintenance guidelines                             |
| `reference/EXECUTIVE-SUMMARY-Redundancy-Analysis.md` | Executive summary of consolidation review                                          |

---

## Recommended Review Order

### Executive / Strategic Review

1. **Product Vision & Strategy** — The "what" and "why"
2. **Licensing & Legal Audit** — Legal landscape and risks
3. **Cost & Vendor Analysis** — Financial commitment
4. **Master Plan** — Technical scope and locked decisions

### Technical / Architecture Review

1. **Technology Stack ADRs** — Every technology choice
2. **Security & Compliance Framework** — Security posture
3. **Infrastructure & Deployment** — Hosting/network architecture
4. **Integration Contracts** — External system touchpoints
5. **DevOps & CI/CD** — Development workflow
6. **Monitoring & Observability** — Operational visibility

### Implementation

1. **Feature Function PRD Checklist** — What to build (includes legacy scope mapping)
2. **Backend SQL Schema Draft** — Data model
3. **Forms Registry** — UI form specifications
4. **ERPNext Doctype Field Mapping** — ERP sync contract
5. **API Acceptance & Test Matrix** — API contract and testing
6. **Execution Board** — Delivery sequence _(has timelines)_
7. **Access & Workflow Plan** — Environment setup and Claude integration

---

## Key Decisions Captured

| Decision   | Choice                          | Rationale                                                                 | Document                  |
| ---------- | ------------------------------- | ------------------------------------------------------------------------- | ------------------------- |
| ERP System | ERPNext (GPL v3, self-hosted)   | Feature-rich, free, Canadian-hostable. GPL risk mitigated by API boundary | ADRs #004, Licensing §2.2 |
| Database   | Supabase PostgreSQL             | RLS, real-time, storage built-in, Canadian region                         | ADRs #003                 |
| Auth       | Clerk                           | Developer experience, free tier for 50K MAU                               | ADRs #005                 |
| E-Sign     | BoldSign                        | White-label API, per-doc pricing, Canadian e-sign compliant               | ADRs #006                 |
| Frontend   | Next.js on Vercel               | SSR, ISR, edge functions, automatic deploys                               | ADRs #001, #010           |
| Backend    | Node.js BFF                     | Aggregates ERPNext + Supabase + vendors                                   | ADRs #002                 |
| Hosting    | Proxmox (self-hosted) + Vercel  | Cost control, data residency, ZFS reliability                             | ADRs #011, Infra §2       |
| Networking | Tailscale + TP-Link Omada VLANs | Zero-trust overlay, VLAN isolation                                        | ADRs #012, Infra §3       |

---

## Critical Risks (Top 5)

| Risk                                   | Impact                                                        | Mitigation                                                       | Document                      |
| -------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------- |
| ERPNext GPL v3 propagation to frontend | Could force open-sourcing proprietary code                    | Strict API boundary, separate repos, legal counsel               | Licensing §2.2, §5            |
| Clerk has no Canadian data residency   | PIPEDA cross-border compliance gap                            | DPA with Clerk, privacy policy disclosure, evaluate alternatives | Licensing §4.5, Security §3.4 |
| Construction Act 2026 changes          | Must support new lien/holdback/notice requirements from day 1 | Feature requirements documented, build into Epic 4/5             | Licensing §4.3, Security §5.1 |
| Single-person operations risk          | Bus factor of 1 for infrastructure                            | Document everything, automate runbooks, Telegram alerts          | Monitoring §5, DevOps §7      |
| Scope creep across 16 epics            | Never ship                                                    | MoSCoW prioritization, phase gates, MVP first                    | Vision §5.2, Execution Board  |

---

## Cross-Reference Map

These documents have explicit bidirectional cross-references:

| Document A                          | ↔   | Document B                                    | Linked Sections                               |
| ----------------------------------- | --- | --------------------------------------------- | --------------------------------------------- |
| Licensing & Legal Audit (§4 PIPEDA) | ↔   | Security Framework (§4 PIPEDA Implementation) | Legal requirements ↔ Technical implementation |
| Integration Contracts (§2 ERPNext)  | ↔   | ERPNext Doctype Mapping (§1 Rules)            | Sync architecture ↔ Field-level mapping       |
| Master Plan (§6 Features)           | →   | Feature PRD (full detail)                     | Summary → Canonical source                    |
| Feature PRD (§1 Scope)              | ←   | _(absorbed Blueprint-Gap-Matrix)_             | Legacy → V2 expansion mapping                 |
| Technology Stack ADRs (#014, #025)  | →   | DevOps & CI/CD                                | Decision rationale → Implementation           |

---

## Open Questions

1. **ERPNext commitment** — Given GPL implications, should we evaluate Odoo Enterprise or Supabase-native finance as alternatives?
2. **Clerk data residency** — Is EU (Germany/Ireland) acceptable under PIPEDA, or do we need a Canadian-resident auth provider?
3. **Legal counsel** — Budget $5-15K for OSS license review and $5-10K for privacy/compliance review. When to engage?
4. **Team composition** — Solo+AI, small team, or hybrid with offshore? (See Cost Analysis §5)
5. **Quebec Law 25** — Does MDM Group serve Quebec clients? If yes, additional compliance requirements apply.

---

## Document Maintenance

All documents are markdown (+ 1 SQL schema) for easy version control, AI consumption, and editing. As decisions are made, update the relevant documents and note the change in this index.

**Maintenance rules:**

- **Feature changes** → Update Feature PRD (canonical source); update Master Plan only if locked decisions change
- **Compliance changes** → Update Licensing first (legal requirements), then Security (technical implementation)
- **ERPNext changes** → Update Integration Contracts (architecture) and Doctype Mapping (field-level)
- **CI/CD changes** → Update ADRs for decisions, DevOps for implementation
- **Quarterly** → Run `reference/VALIDATION-CHECKLIST-Codebase-vs-Docs.md` against latest codebase

**Total planning pack: ~845 KB across 17 core documents + 4 reference documents.**

## Multi-tenant + White-label

- **Org model**: Each deployment is one organization. MDM is seeded via JSON (no hardcoded MDM in migrations).
- **JWT claim**: include `krewpact_org_id` in Clerk JWT for org scoping.

### Seed an Organization

```bash
npx tsx scripts/seed-org.ts --file supabase/seed/seed-org-mdm.json
```

### Required env (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```
