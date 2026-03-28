# KrewPact Architecture Overview

---

## What is KrewPact?

KrewPact is MDM Group's unified construction operations platform — the nucleus that replaces fragmented manual workflows with a single system for CRM, estimating, project execution, client and trade partner portals, and reporting. It integrates with ERPNext (replacing Sage) as the financial and procurement source of truth, giving every division — Contracting, Homes, Wood, Telecom, Group Inc., and Management — a shared platform built specifically for how MDM operates. Rather than stitching together a patchwork of spreadsheets, email chains, and legacy accounting software, KrewPact creates a continuous, automated workflow from the first lead all the way through final invoice.

---

## Why We're Building It

MDM currently runs on Sage 50 Accounting, Sage Construction Management, spreadsheets, email, OneDrive, and SMB file shares. Every piece of the business lives in a different place, maintained by a different person, with no automated handoff between them. The result is duplicated effort, slow approvals, missed information, and no clear picture of where the business stands at any moment.

**Key pain points driving this initiative:**

- No single source of truth for project data — the same project exists differently in Sage, a spreadsheet, and someone's inbox
- Estimates are built manually in spreadsheets with no connection to accounting, purchasing, or project execution
- Client communication happens over email with no audit trail, no approval workflow, and no visibility for the client into their project status
- Trade partners and subcontractors are managed through phone calls and emailed PDFs, with no portal for compliance documents, scheduling, or payment status
- Finance and operations are completely disconnected — project managers cannot see live cost vs. budget without calling Nancy or Marian
- There is no mobile-accessible field tool for daily logs, site photos, or task updates
- Reporting is manual — dashboards are rebuilt in Excel from data pulled from multiple systems
- Sage Construction Management and Sage 50 are separate products with separate databases, creating reconciliation work every month

---

## Current Systems Being Replaced

| Current System               | What It Does                                           | Replaced By                                     |
| ---------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Sage 50 Accounting           | General ledger, accounts payable/receivable, payroll   | ERPNext                                         |
| Sage Construction Management | Project tracking, cost codes, estimates, job costing   | KrewPact + ERPNext                              |
| Spreadsheets                 | Lead tracking, estimating, scheduling, budget tracking | KrewPact CRM + Estimating                       |
| Email / manual               | Client communication, approvals, document distribution | KrewPact Portals + BoldSign e-signatures        |
| OneDrive / SMB file shares   | Document storage, contract filing, photo archives      | KrewPact Document Management (Supabase Storage) |

---

## Target Architecture

The platform is composed of five connected services, each with a clear responsibility:

- **KrewPact** (the app everyone uses daily) — the web application where all day-to-day work happens: managing leads, building estimates, running projects, communicating with clients and trade partners, and viewing dashboards. Built with Next.js and hosted on Vercel.

- **ERPNext** (the financial brain) — an open-source ERP system replacing Sage 50 and Sage Construction Management. It handles the general ledger, accounts payable and receivable, purchase orders, inventory, and invoicing. Hosted on-premises at MDM.

- **Supabase** (the database) — a managed cloud PostgreSQL database that stores all KrewPact operational data: workflows, field logs, CRM records, documents, audit trails, and reporting. It also handles file storage for documents and photos.

- **Clerk** (identity and access) — manages user login, Microsoft 365 single sign-on (so staff log in with their MDM email), and role-based permissions across all six divisions.

- **Cloudflare Tunnel** — creates a secure, encrypted connection between KrewPact (on Vercel's cloud) and ERPNext (on-premises at MDM). No VPN client required. Data travels through Cloudflare's global network.

**How it flows:**

```
Staff / Clients / Trade Partners
        |
        v
  KrewPact Web App  (hosted on Vercel)
        |
        |-----> ERPNext  (finance, invoicing, procurement — on-premises)
        |
        |-----> Supabase  (operations data, documents, field logs — cloud)
```

Finance data (GL entries, invoices, purchase orders) lives in ERPNext. Everything else — project workflows, CRM, estimates, field logs, portals, reporting — lives in KrewPact backed by Supabase. The two systems stay in sync automatically through a background job queue; no manual data entry in both places.

---

## JobTread as Feature Benchmark

JobTread was evaluated as a commercial construction project management platform. After thorough assessment, MDM chose to build KrewPact custom rather than purchase JobTread. JobTread serves as KrewPact's long-term feature floor — the minimum feature set KrewPact must always match or exceed across all phases of development.

**Why build custom instead of buying JobTread:**

1. **Multi-division support** — KrewPact is designed from the ground up to serve all six MDM divisions under one platform with division-level permissions and reporting. No off-the-shelf SaaS product handles this natively at MDM's specific structure.
2. **ERPNext integration** — The Sage migration path requires deep, custom integration with ERPNext. No construction SaaS supports this without significant paid customization that would cost more than building it ourselves.
3. **White-label commercial opportunity** — KrewPact is designed to be licensable to other construction firms. A SaaS subscription cannot be resold.
4. **Full data control and Canadian compliance** — PIPEDA, Ontario Construction Act holdback rules, HST handling, and Canadian payroll compliance require configurations no US-built SaaS product readily accommodates.
5. **Unlimited customization** — MDM's processes, divisions, and reporting needs will evolve. A custom platform grows with the business; a SaaS subscription is always constrained by another company's roadmap.

---

## MDM Group Divisions

| Division Code | Name            | Description                             |
| ------------- | --------------- | --------------------------------------- |
| `contracting` | MDM Contracting | General contracting — the core business |
| `homes`       | MDM Homes       | Residential construction                |
| `wood`        | MDM Wood        | Wood and lumber supply                  |
| `telecom`     | MDM Telecom     | Telecommunications and electrical       |
| `group-inc`   | MDM Group Inc.  | Parent company and corporate operations |
| `management`  | MDM Management  | Property management                     |

All six divisions share one KrewPact platform. Each user's access is scoped to their division(s) and role. An estimator in Contracting sees only Contracting data; an executive sees across all divisions.

---

## What "Done" Looks Like

When KrewPact is fully implemented, MDM Group will operate with:

- **Single source of truth** — all project data for all divisions in one place, live and accurate
- **Automated workflows** — lead captured in CRM flows automatically into estimate, then contract, then project, then invoice — no manual re-entry
- **Client portal** — clients log in to approve selections, sign documents, view project milestones, and track progress without emailing Nancy or Marian
- **Trade partner portal** — subcontractors and trade partners submit compliance documents, view schedules, and track payment status without phone calls
- **Real-time dashboards** — executives see cost vs. budget, project health, sales pipeline, and division-level KPIs at any time — no Excel rebuilds
- **Mobile field access** — project supervisors and field staff log daily progress, upload photos, and update tasks from a phone or tablet on site
- **Complete Sage migration** — Sage 50 and Sage Construction Management retired; ERPNext becomes the single accounting and ERP system with full audit trail
- **PIPEDA-compliant data handling** — role-based access, field-level encryption for sensitive data, and a complete audit log of who accessed or changed what

---

## MVP Scope — 12-Week Phase 0

The MVP is a focused 12-week build. The goal is to replace the most painful manual workflows with a working, production-deployed platform — not to build everything at once.

| Phase                  | Weeks | What Gets Built                                                                                         |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------------- |
| Foundation             | 1-2   | User login, roles and permissions, database, ERPNext connection, app shell, CI/CD pipeline              |
| CRM + Estimating       | 3-6   | Leads, opportunities, accounts, contacts, estimate builder, ERPNext customer and quotation sync         |
| Contracting + Projects | 7-9   | Proposals, e-signatures via BoldSign, project creation, milestones, ERPNext sync (Sales Order, Project) |
| Execution + Go-Live    | 10-12 | Tasks, daily logs, document upload, invoice snapshots, executive dashboard, testing, production deploy  |

**MVP delivers approximately:** 25 features | 40 API endpoints | 30 forms | 12 ERPNext integrations

**Post-MVP roadmap:**

- **P1 (weeks 13-20):** Change orders, RFIs, time tracking, expense reporting, client portal, extended ERPNext sync
- **P2 (future):** Trade partner portal, procurement, offline mobile, ADP payroll integration, project closeout and warranty, full Microsoft 365 integration

---

## Key Decisions Made

The following decisions are locked. A complete decision register with rationale is in the [Decisions Register](./KrewPact-Decisions-Register.md).

| Decision             | What Was Decided                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Architecture model   | Hybrid ERPNext-first: ERPNext owns finance, KrewPact owns everything else                                    |
| Hosting              | Managed cloud (Vercel + Supabase) for the app; on-premises ERPNext at MDM                                    |
| Authentication       | Clerk with Microsoft 365 SSO — staff log in with their existing MDM email                                    |
| Data sync            | Eventual consistency between KrewPact and ERPNext (background queue, not real-time locks)                    |
| Compliance           | US-hosted services (Vercel, Supabase, Clerk) disclosed per PIPEDA; field-level encryption for sensitive data |
| Scale target         | Up to 300 internal users; 99.5% uptime for MVP                                                               |
| Monthly SaaS cost    | Approximately $455-635 CAD/month (Supabase, Vercel, BoldSign, monitoring)                                    |
| Development approach | AI-assisted development with automated testing — 12-week MVP is aggressive but achievable                    |

---

## Reading Guide

This folder contains the complete KrewPact architecture and planning documentation. Use the table below to find the right document for your question.

| #   | Document                                                                   | What It Covers                                            | Best For                  |
| --- | -------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------- |
| 1   | [Architecture Overview](./KrewPact-Architecture-Overview.md)               | This document — holistic summary of the platform          | Everyone                  |
| 2   | [Decisions Register](./KrewPact-Decisions-Register.md)                     | All locked decisions in one place                         | Executives, project leads |
| 3   | [Architecture Resolution](./KrewPact-Architecture-Resolution.md)           | Detailed decision rationale, contradictions resolved      | Technical leads           |
| 4   | [Master Plan](./KrewPact-Master-Plan.md)                                   | Full execution plan, locked assumptions, architecture     | Project managers          |
| 5   | [Product Vision & Strategy](./KrewPact-Product-Vision-and-Strategy.md)     | Market positioning, competitive analysis, growth strategy | Executives, strategy      |
| 6   | [Technology Stack ADRs](./KrewPact-Technology-Stack-ADRs.md)               | 25 architecture decision records with rationale           | Developers                |
| 7   | [Feature PRD Checklist](./KrewPact-Feature-Function-PRD-Checklist.md)      | 70+ features across 16 epics with acceptance criteria     | Product, QA               |
| 8   | [Backend SQL Schema](./KrewPact-Backend-SQL-Schema-Draft.sql)              | Database design (28 enums, 19+ table groups)              | Developers                |
| 9   | [Security & Compliance](./KrewPact-Security-and-Compliance-Framework.md)   | PIPEDA, AODA, encryption, audit trails                    | Compliance, IT            |
| 10  | [Licensing & Legal](./KrewPact-Licensing-and-Legal-Audit.md)               | GPL boundary, vendor agreements, legal risks              | Legal, executives         |
| 11  | [Infrastructure & Deployment](./KrewPact-Infrastructure-and-Deployment.md) | Hosting, networking, Cloudflare, Tailscale                | IT, DevOps                |
| 12  | [Integration Contracts](./KrewPact-Integration-Contracts.md)               | ERPNext sync architecture, webhooks, queue patterns       | Developers                |
| 13  | [ERPNext Doctype Mapping](./KrewPact-ERPNext-Doctype-Field-Mapping.md)     | Field-level mapping for 43 ERPNext doctypes               | Developers, ERP admin     |
| 14  | [DevOps & CI/CD](./KrewPact-DevOps-and-CI-CD.md)                           | Pipeline, testing, deployment automation                  | DevOps                    |
| 15  | [Monitoring & Observability](./KrewPact-Monitoring-and-Observability.md)   | Uptime, error tracking, alerting                          | IT, DevOps                |
| 16  | [Cost & Vendor Analysis](./KrewPact-Cost-and-Vendor-Analysis.md)           | TCO breakdown, vendor comparison, ROI                     | Finance, executives       |
| 17  | [API & Test Matrix](./KrewPact-API-Acceptance-and-Test-Matrix.md)          | API endpoints, test coverage targets                      | QA, developers            |
| 18  | [Execution Board](./KrewPact-Execution-Board.md)                           | Week-by-week plan with dependencies and gates             | Project managers          |
| 19  | [Forms Registry](./KrewPact-Forms-Registry.md)                             | All 30 MVP forms with field specs                         | Developers, UX            |
| 20  | [Access & Workflow Plan](./KrewPact-Access-and-Workflow-Plan.md)           | Environment setup, credentials, build sequence            | Developers                |

---

_Last updated: February 19, 2026_
_Prepared for: Executive Leadership (CEO, COO, CFO)_
