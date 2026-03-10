# KrewPact — Strategy Brief

> **The unified operations nucleus for MDM Group Inc.**
> A modern construction operations platform replacing fragmented tools (Sage, spreadsheets, email chains) with a single hub for CRM, estimating, contracting, project execution, and finance — all synced with ERPNext for accounting.

**Company:** MDM Group Inc., Mississauga, Ontario, Canada
**Domain:** krewpact.com
**Status:** Active development, deployed on Vercel, live Supabase + Clerk + ERPNext

---

## 1. The Problem

MDM Group operates 6 divisions across construction, telecom, property management, and lumber. Today, their operations run on:

- **Sage Construction Management + Sage 50** for accounting (being replaced by ERPNext)
- **Spreadsheets** for estimating, project tracking, and daily logs
- **Email** for client communication, trade partner coordination, and approvals
- **Paper + WhatsApp** for field operations
- **No CRM** — leads tracked informally, no pipeline visibility

This fragmentation means: no single source of truth, no real-time visibility for executives, manual data re-entry across systems, and zero automation. A $50M+ company running on tools designed for a 5-person shop.

---

## 2. The Solution

KrewPact is the **operational nucleus** — it sits between the people (field crews, PMs, estimators, executives, clients, trade partners) and the financial system (ERPNext). It owns everything _except_ accounting:

```
┌─────────────────────────────────────────────────────────────────┐
│                        MDM Digital Platform                      │
│                                                                  │
│  ┌──────────┐    ┌──────────────────────────────────────┐       │
│  │  Website  │───▶│            KREWPACT (Nucleus)        │       │
│  │ (Leads)   │    │                                      │       │
│  └──────────┘    │  CRM ─── Estimating ─── Contracting  │       │
│                  │   │           │              │         │       │
│  ┌──────────┐    │  Projects ── Tasks ──── Daily Logs   │       │
│  │  Client   │◀──│   │           │              │         │       │
│  │  Portal   │    │  Finance ── Documents ── Reports    │       │
│  └──────────┘    │   │                                   │       │
│                  │  Portals ── Notifications ── AI Chat  │       │
│  ┌──────────┐    └──────┬───────────────────────┬────────┘       │
│  │  Trade    │◀──────────┘                       │               │
│  │  Portal   │           Sync (REST API)         │               │
│  └──────────┘                                    ▼               │
│                  ┌──────────────────────────────────────┐       │
│                  │        ERPNEXT (Financial Brain)     │       │
│                  │  GL · Invoices · Payments · Inventory │       │
│                  │  Purchase Orders · Payroll · Tax      │       │
│                  └──────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────┐    ┌──────────────────────────────────────┐       │
│  │ MDM-Book │───▶│     Knowledge Layer (pgvector)       │       │
│  │ (SOPs)   │    │  AI chat · Embeddings · Context       │       │
│  └──────────┘    └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Data Authority Rules

| ERPNext Owns (Finance)  | KrewPact Owns (Operations)    |
| ----------------------- | ----------------------------- |
| General ledger          | Workflows & approvals         |
| Invoices (AR/AP)        | Field operations & daily logs |
| Payments & collections  | CRM & pipeline                |
| Inventory & procurement | Estimating & proposals        |
| Purchase orders         | Project execution & tasks     |
| Accounting & tax        | Portals (client + trade)      |
| Payroll (via ADP later) | Audit trails & compliance     |
|                         | User identity & RBAC          |
|                         | Document storage              |
|                         | Knowledge base & AI           |

**Sync pattern:** Eventual consistency via outbox/inbox, idempotent upsert, retry with backoff, dead-letter queue. No two-phase commit. Cross-system link via `krewpact_id` field on ERPNext doctypes.

---

## 3. Who Uses It

### MDM Group Divisions (6)

| Code          | Division        | Focus                      |
| ------------- | --------------- | -------------------------- |
| `contracting` | MDM Contracting | General contracting        |
| `homes`       | MDM Homes       | Residential construction   |
| `wood`        | MDM Wood        | Wood/lumber operations     |
| `telecom`     | MDM Telecom     | Telecommunications         |
| `group-inc`   | MDM Group Inc.  | Parent company / corporate |
| `management`  | MDM Management  | Property management        |

### Roles (13)

**Internal (9):** Platform Admin, Executive, Operations Manager, Project Manager, Project Coordinator, Estimator, Field Supervisor, Accounting, Payroll Admin

**External (4):** Client Owner, Client Delegate, Trade Partner Admin, Trade Partner User

**Scale target:** Up to 300 internal users, 99.5% uptime (MVP)

---

## 4. Technology Stack

| Layer          | Technology                                              | Why                                                  |
| -------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| **Frontend**   | Next.js 15 (App Router, TypeScript, React 19) on Vercel | SSR, API routes, edge middleware, automatic deploys  |
| **UI**         | Tailwind CSS + shadcn/ui (Radix primitives)             | WCAG AA accessible, consistent design system         |
| **Database**   | Supabase PostgreSQL (managed cloud, Pro tier)           | RLS, Realtime subscriptions, Storage, pgvector       |
| **ERP**        | ERPNext (GPL v3, self-hosted on Linux)                  | Full accounting suite, replacing Sage                |
| **Auth**       | Clerk (email + M365 SSO)                                | JWT template drives Supabase RLS via custom claims   |
| **E-Sign**     | BoldSign (white-label API)                              | Per-document pricing, Canadian e-sign compliant      |
| **Email**      | Resend (transactional)                                  | Developer-friendly, reliable delivery                |
| **Queue**      | Upstash QStash + Redis                                  | Serverless-compatible job queue for async operations |
| **AI**         | OpenAI (embeddings), Google AI SDK                      | Knowledge base search, context-aware chat            |
| **Monitoring** | Sentry + Vercel Analytics + BetterStack                 | Error tracking, performance, uptime                  |
| **Charts**     | Recharts                                                | Interactive dashboards and analytics                 |
| **Forms**      | React Hook Form + Zod                                   | Shared validation between client and API             |
| **Tables**     | TanStack Table + TanStack Query                         | Sorting, filtering, pagination, caching              |
| **PDF**        | @react-pdf/renderer                                     | Estimate and report PDF generation                   |

### Key Architecture Decisions

- **Clerk → Supabase JWT Bridge:** Clerk JWTs contain `krewpact_user_id`, `krewpact_org_id`, `krewpact_divisions`, `krewpact_roles`. RLS policies read these claims — no per-row subqueries.
- **GPL v3 Boundary:** ERPNext is GPL v3. Strict API boundary maintained — no shared code, separate repos, communication exclusively via REST API through Cloudflare Tunnel.
- **Multi-tenant Ready:** Org-scoped routing (`/org/[slug]/...`), JWT org claims, org-isolated RLS. Built for MDM first, but architecturally ready for white-label.
- **BFF Pattern:** All external calls go through Next.js API routes. Frontend never calls Supabase directly for mutations.

---

## 5. What's Built (March 2026)

### Feature Domains — Current Status

| Domain            | Status      | What's Working                                                                                                                                                     |
| ----------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CRM**           | ✅ Complete | Leads, contacts, accounts, opportunities, pipeline dashboard, lead scoring, outreach sequences, enrichment, bidding, bulk ops, import/export, 10 analytics widgets |
| **Estimating**    | ✅ Complete | Estimate builder, templates, assemblies, cost codes, cost catalog                                                                                                  |
| **Contracting**   | ✅ Complete | Contract creation, detail views, e-sign flows                                                                                                                      |
| **Projects**      | ✅ Complete | Project lifecycle, milestones, tasks, daily logs, team members                                                                                                     |
| **Finance**       | ✅ Partial  | Expense tracking, finance dashboard, invoice snapshots (read from ERPNext)                                                                                         |
| **Portals**       | ✅ Complete | Client portal, trade partner portal (separate route group + layout)                                                                                                |
| **Admin**         | ✅ Complete | Audit log, sync dashboard, governance, privacy, system settings, BCP                                                                                               |
| **Documents**     | ✅ Complete | Upload, preview, compliance, governance                                                                                                                            |
| **Notifications** | ✅ Complete | Realtime via Supabase subscriptions, bell with unread count                                                                                                        |
| **Reports**       | ✅ Complete | Executive dashboard (KPIs, pipeline chart), PM dashboard (health scores)                                                                                           |
| **Settings**      | ✅ Complete | Profile, team, onboarding wizard (4-step)                                                                                                                          |
| **Search**        | ✅ Complete | Global search across 7 tables, command palette (Cmd+K)                                                                                                             |
| **ERPNext Sync**  | ✅ Complete | 13/13 mappers (Customer, Contact, Opportunity, Quotation, Sales Order, Project, Task, etc.), sync dashboard                                                        |
| **AI/Knowledge**  | 🟡 Partial  | pgvector schema, embedding infrastructure, chat sessions table                                                                                                     |

### By the Numbers

- **109+ app pages** (fully implemented, not stubs)
- **79+ CRM API endpoints** alone (43+ total API route directories)
- **37 Supabase migrations** (foundation through governance)
- **3,363 passing tests** across 294 files
- **Rate limiting** on 99 API routes
- **Sentry error tracking** wired into all 11 error boundaries

### What's NOT Built Yet (Future Phases)

| Feature              | Priority | Notes                                    |
| -------------------- | -------- | ---------------------------------------- |
| Change orders        | P1       | CO workflow, approvals, cost impact      |
| RFIs & Submittals    | P1       | Creation, tracking, responses            |
| Time tracking        | P1       | Timesheets, ADP integration              |
| Offline capability   | P2       | PWA, IndexedDB, service workers          |
| Full AI chat         | P2       | Context-aware assistant within dashboard |
| Procurement          | P2       | PO management, vendor management         |
| Quality & Compliance | P2       | Inspections, punch lists, warranty       |
| Sage data migration  | P2       | Schema mapping, validation, rollback     |

---

## 6. Business Model & Positioning

### Primary Use Case

Replace MDM Group's fragmented workflow with a unified platform. **ROI case:** eliminating data re-entry, providing executive visibility, and enabling field crews to log work digitally.

### White-Label Potential

The architecture is multi-tenant ready. Every construction company above ~$10M revenue has the same problem: fragmented operations between accounting (ERP), field (paper/spreadsheets), and sales (no CRM). KrewPact could be offered as a SaaS product to other construction firms.

### Competitive Landscape

- **Procore** — Market leader but expensive ($30K+/yr), overkill for mid-market
- **Buildertrend** — Residential focused, weak CRM
- **CoConstruct** — Residential only
- **Sage Construction** — Legacy, being sunset
- **ERPNext alone** — Lacks field ops, portals, modern UX

**KrewPact's wedge:** Modern UX + CRM + field ops + ERPNext integration at a fraction of Procore's cost, purpose-built for Canadian construction compliance (Ontario Construction Act, PIPEDA, AODA).

---

## 7. Compliance & Legal

| Area                              | Status                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| **PIPEDA** (Canadian privacy)     | Auth + DB in US (disclosed in privacy policy). Field-level encryption for SIN/banking data. |
| **Ontario Construction Act 2026** | Lien/holdback/notice requirements designed into P1 features                                 |
| **AODA/WCAG AA**                  | @axe-core/playwright in CI, Radix primitives for ARIA                                       |
| **GPL v3** (ERPNext)              | Strict API boundary — no shared code. Separate repos. REST-only communication.              |
| **Data residency**                | Supabase in US (Pro tier). Clerk in US. ERPNext self-hosted (Canadian).                     |

---

## 8. Risk Register

| Risk                                            | Likelihood | Impact   | Mitigation                                             |
| ----------------------------------------------- | ---------- | -------- | ------------------------------------------------------ |
| ERPNext integration more complex than estimated | Medium     | High     | 13/13 MVP mappers built. Spike completed.              |
| Scope creep across 16 epics                     | High       | High     | P0/P1/P2 prioritization enforced. MVP scope locked.    |
| Clerk outage blocks all access                  | Medium     | High     | Graceful degradation planned. Token caching.           |
| GPL v3 propagation to frontend                  | Low        | Critical | Strict API boundary. Legal counsel budgeted.           |
| Single-person operations risk                   | High       | Medium   | Comprehensive docs, automated runbooks, Sentry alerts. |

---

## 9. Key Links

- **Live app:** https://app.krewpact.com
- **Codebase:** GitHub (private) — `MDM-Projects/krewpact`
- **Database:** Supabase project `owfjnfdqpzpvzvdobpxa`
- **ERPNext:** `erp-api.mdmgroupinc.ca` (via Cloudflare Tunnel)
- **Auth:** Clerk org at `hub.mdmgroupinc.ca`

---

_This document is the single-source strategy brief for KrewPact. For deep dives, see `docs/architecture/` which contains 22 detailed planning documents (~1MB) covering product vision, ADRs, security, infrastructure, integrations, and more._
