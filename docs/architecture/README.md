# KrewPact Architecture Documentation

This folder contains the complete architecture documentation for KrewPact, MDM Group's unified construction operations platform.

**Audience:** MDM leadership (Ehab, David, Nervine), technical leads, and developers.
**Last updated:** February 19, 2026

---

## Document Inventory

| # | Document | Purpose | Audience | Size |
|---|----------|---------|----------|------|
| 1 | [Architecture Overview](./KrewPact-Architecture-Overview.md) | Holistic summary — start here | Everyone | 14 KB |
| 2 | [Decisions Register](./KrewPact-Decisions-Register.md) | All locked decisions in one place | Executives, leads | 16 KB |
| 3 | [Architecture Resolution](./KrewPact-Architecture-Resolution.md) | Detailed decision rationale, contradictions resolved | Technical leads | 23 KB |
| 4 | [Master Plan](./KrewPact-Master-Plan.md) | Execution plan, locked assumptions, architecture | Project managers | 17 KB |
| 5 | [Product Vision & Strategy](./KrewPact-Product-Vision-and-Strategy.md) | Market positioning, competitive analysis, growth | Executives, strategy | 93 KB |
| 6 | [Technology Stack ADRs](./KrewPact-Technology-Stack-ADRs.md) | 25 architecture decision records with rationale | Developers | 114 KB |
| 7 | [Feature PRD Checklist](./KrewPact-Feature-Function-PRD-Checklist.md) | 70+ features across 16 epics, acceptance criteria | Product, QA | 24 KB |
| 8 | [Backend SQL Schema](./KrewPact-Backend-SQL-Schema-Draft.sql) | Database design (28 enums, 19+ table groups) | Developers | 81 KB |
| 9 | [Security & Compliance](./KrewPact-Security-and-Compliance-Framework.md) | PIPEDA, AODA, encryption, audit trails | Compliance, IT | 166 KB |
| 10 | [Licensing & Legal](./KrewPact-Licensing-and-Legal-Audit.md) | GPL boundary, vendor agreements, legal risks | Legal, executives | 113 KB |
| 11 | [Infrastructure & Deployment](./KrewPact-Infrastructure-and-Deployment.md) | Hosting, networking, Cloudflare, Tailscale | IT, DevOps | 73 KB |
| 12 | [Integration Contracts](./KrewPact-Integration-Contracts.md) | ERPNext sync architecture, webhooks, queue patterns | Developers | 109 KB |
| 13 | [ERPNext Doctype Mapping](./KrewPact-ERPNext-Doctype-Field-Mapping.md) | Field-level mapping for ERPNext doctypes | Developers, ERP | 21 KB |
| 14 | [DevOps & CI/CD](./KrewPact-DevOps-and-CI-CD.md) | Pipeline, testing, deployment automation | DevOps | 46 KB |
| 15 | [Monitoring & Observability](./KrewPact-Monitoring-and-Observability.md) | Uptime, error tracking, alerting | IT, DevOps | 32 KB |
| 16 | [Cost & Vendor Analysis](./KrewPact-Cost-and-Vendor-Analysis.md) | TCO breakdown, vendor comparison, ROI | Finance, executives | 53 KB |
| 17 | [API & Test Matrix](./KrewPact-API-Acceptance-and-Test-Matrix.md) | API endpoints, test coverage targets | QA, developers | 28 KB |
| 18 | [Execution Board](./KrewPact-Execution-Board.md) | Week-by-week plan with dependencies and gates | Project managers | 17 KB |
| 19 | [Forms Registry](./KrewPact-Forms-Registry.md) | All 30 MVP forms with field specs | Developers, UX | 20 KB |
| 20 | [Access & Workflow Plan](./KrewPact-Access-and-Workflow-Plan.md) | Environment setup, credentials, build sequence | Developers | 18 KB |

---

## Suggested Reading Order

### For Executives (Ehab, Nervine)
1. Architecture Overview — what, why, and how (14 KB, ~10 min)
2. Decisions Register — every locked decision (16 KB, ~15 min)
3. Cost & Vendor Analysis — TCO, ROI, JobTread benchmark (53 KB, skim tables)
4. Product Vision & Strategy — market positioning (93 KB, skim §1-3)

### For COO / Project Management (David)
1. Architecture Overview — start here
2. Master Plan — execution plan and locked assumptions
3. Execution Board — week-by-week with dependencies
4. Feature PRD Checklist — what gets built and acceptance criteria
5. Decisions Register — reference for locked decisions

### For Technical Leads / Developers
1. Architecture Overview — context
2. Architecture Resolution — why decisions were made
3. Technology Stack ADRs — detailed rationale for every tech choice
4. Backend SQL Schema — database design
5. Integration Contracts + ERPNext Doctype Mapping — sync architecture
6. DevOps & CI/CD — pipeline and deployment
7. Access & Workflow Plan — environment setup

---

## Other Documentation

| Folder | Contents | Shared? |
|--------|----------|---------|
| `docs/internal/` | Analysis artifacts, consolidation plans, validation checklists | No — internal only |
| `docs/plans/` | Session-specific implementation plans | No — internal only |
