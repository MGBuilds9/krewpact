# KrewPact Architecture

## System Overview

```
User → Vercel (Next.js app + API routes) → Cloudflare Tunnel → ERPNext
                                          → Supabase Cloud (direct HTTPS)
                                          → Upstash Redis (enqueue jobs)

ERPNext Host → BullMQ Workers → Upstash Redis (dequeue jobs)
                               → ERPNext (localhost, direct)
                               → Supabase Cloud (direct HTTPS)
```

## Layer Breakdown

| Layer          | Technology                              | Responsibility                                             |
| -------------- | --------------------------------------- | ---------------------------------------------------------- |
| Web App        | Next.js + React + TypeScript            | Internal UI (online-only for MVP)                          |
| API/BFF        | Next.js API routes (Vercel serverless)  | Domain APIs, orchestration, validation, rate limits        |
| Sync Workers   | Node.js on ERPNext host                 | BullMQ workers for ERPNext sync, retries, dead-letter      |
| Operational DB | Supabase Postgres (managed cloud)       | Workflows, field ops, audit trails, denormalized reporting |
| ERP Core       | ERPNext (any Linux + cloudflared)       | Accounting, inventory, procurement, invoicing, payments    |
| Object Storage | Supabase Storage + CDN                  | Documents, photos, signed contracts                        |
| Identity       | Clerk → Supabase JWT bridge             | Auth, SSO, session claims. JWT claims drive RLS.           |
| Observability  | Vercel Analytics + Sentry + BetterStack | Errors, uptime. Full Prometheus/Grafana deferred.          |

## Unified Architecture (MDM Growth Intelligence System)

KrewPact is the **nucleus** of MDM Group's unified platform:

- **KrewPact** = The Nucleus (operations, CRM, project execution, portals)
- **ERPNext** = The Financial Brain (replacing Sage Construction Mgmt + Sage50)
- **LeadForge** → Sales AGI layer (merged INTO KrewPact's CRM + automation tables)
- **mdm-website-v2** = The Conversion Engine (reads from KrewPact API)
- **MDM-Book** = Intelligence Layer (vectorized into KrewPact's pgvector)

**One Supabase. One Clerk auth. One event bus. ERPNext for finance. Sage migrated out.**

### MDM Group Divisions

| Code          | Name            | Description                |
| ------------- | --------------- | -------------------------- |
| `contracting` | MDM Contracting | General contracting        |
| `homes`       | MDM Homes       | Residential construction   |
| `wood`        | MDM Wood        | Wood/lumber                |
| `telecom`     | MDM Telecom     | Telecommunications         |
| `group-inc`   | MDM Group Inc.  | Parent company / corporate |
| `management`  | MDM Management  | Property management        |

## Data Authority Rules

- **ERPNext authoritative for:** GL, invoices, payments, inventory, purchase orders, accounting
- **Supabase authoritative for:** workflows, field ops, portals, audit trails, user/RBAC, lead scoring, outreach automation, knowledge embeddings
- **Cross-system link:** `krewpact_id` field on ERPNext doctypes maps to Supabase records
- **Sync pattern:** Eventual consistency. Outbox/inbox with idempotent upsert, retry, dead-letter. No 2PC.
- **Event bus:** `unified_events` table for cross-system communication

## Clerk → Supabase JWT Bridge

Clerk JWTs drive Supabase RLS. Configured via Clerk JWT template:

```json
{
  "sub": "{{user.id}}",
  "role": "authenticated",
  "krewpact_user_id": "{{user.public_metadata.krewpact_user_id}}",
  "krewpact_org_id": "{{user.public_metadata.krewpact_org_id}}",
  "krewpact_divisions": "{{user.public_metadata.division_ids}}",
  "krewpact_roles": "{{user.public_metadata.role_keys}}"
}
```

- RLS policies use `auth.jwt() ->> 'krewpact_user_id'` (not `auth.uid()`)
- Org scoping: `krewpact_org_id()` SQL function reads from JWT
- Division filtering: `auth.jwt() -> 'krewpact_divisions'` (JSONB array)
- No per-row subqueries — claims evaluated once per request

## Canonical Role Model

**Internal (9):** `platform_admin`, `executive`, `operations_manager`, `project_manager`, `project_coordinator`, `estimator`, `field_supervisor`, `accounting`, `payroll_admin`

**External (4):** `client_owner`, `client_delegate`, `trade_partner_admin`, `trade_partner_user`

## Sales AGI Layer (from LeadForge Merge)

- **Lead scoring:** `lead_scoring_rules` + `lead_score_history`
- **Outreach sequences:** `outreach_sequences` + `sequence_steps` + `sequence_enrollments`
- **Email templates:** `email_templates` — merge fields, categories
- **Outreach tracking:** `outreach_events` — email/call/LinkedIn/SMS
- **Enrichment pipeline:** `enrichment_jobs` — Apollo → Clearbit → LinkedIn → Google
- **Bidding opportunities:** `bidding_opportunities` — Bids & Tenders, MERX import

## RAG / Knowledge Layer (pgvector)

- **`knowledge_embeddings`** — vectorized content from MDM-Book
- **`ai_chat_sessions` + `ai_chat_messages`** — context-aware AI chat
- **Embedding model:** OpenAI ada-002 (1536 dimensions), IVFFlat index

## ERPNext Integration (MVP = 12 mappings)

MVP mappings: Customer, Contact, Opportunity, Quotation, Sales Order, Project, Task, Sales Invoice (read), Purchase Invoice (read), Supplier, Expense Claim, Timesheet

- Sync: eventual consistency, outbox/inbox, idempotent upsert, retry with backoff, dead-letter
- All custom fields prefixed `krewpact_*`
- ERPNext rate limit: 300 req/min (configurable)
- Always `encodeURIComponent()` for document names in API calls

## GPL v3 Boundary

ERPNext is GPL v3. Maintain strict API boundary. No shared code, separate repos. Communication exclusively through REST API via Cloudflare Tunnel.

## Compliance

- **PIPEDA** — Auth (Clerk) and DB (Supabase) in US. Field-level encryption for SIN/banking.
- **Construction Act 2026** — Ontario; lien/holdback/notice requirements in P1
- **AODA/WCAG** — @axe-core/playwright in CI. Radix primitives for ARIA.

## Scale Targets

- Up to 300 internal users
- 99.5% uptime (MVP), 99.9% post-HA
- RPO 15min, RTO 2h
- CAD + GST/HST/PST tax handling

## Planning Documents

All in `docs/architecture/`:

1. `KrewPact-Architecture-Resolution.md` — All contradictions resolved
2. `KrewPact-Master-Plan.md` — Locked decisions, architecture, scope
3. `KrewPact-Technology-Stack-ADRs.md` — 25 ADRs
4. `KrewPact-Backend-SQL-Schema-Draft.sql` — PostgreSQL schema
5. `KrewPact-Feature-Function-PRD-Checklist.md` — 16 epics, 70+ features
6. `KrewPact-Access-and-Workflow-Plan.md` — Env var template, setup checklists
7. `KrewPact-Integration-Contracts.md` — ERPNext entity mappings
