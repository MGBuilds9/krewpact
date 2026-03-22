# KrewPact Architecture

## System Overview

```
User → Vercel (Next.js app + API routes) → Cloudflare Tunnel → ERPNext
                                          → Supabase Cloud (direct HTTPS)
                                          → Upstash Redis (rate limits/cache)
                                          → Upstash QStash (background jobs)

QStash → /api/queue/process → ERPNext / Supabase
```

## Layer Breakdown

| Layer           | Technology                              | Responsibility                                             |
| --------------- | --------------------------------------- | ---------------------------------------------------------- |
| Web App         | Next.js 16 + React + TypeScript         | Internal UI, portals, PWA shell                            |
| API/BFF         | Next.js API routes (Vercel serverless)  | Domain APIs, orchestration, validation, rate limits        |
| Background Jobs | Upstash QStash + `/api/queue/process`   | ERP sync retries, dead-letter, async processing            |
| Operational DB  | Supabase Postgres (managed cloud)       | Workflows, field ops, audit trails, denormalized reporting |
| ERP Core        | ERPNext (any Linux + cloudflared)       | Accounting, inventory, procurement, invoicing, payments    |
| Object Storage  | Supabase Storage + CDN                  | Documents, photos, signed contracts                        |
| Identity        | Clerk Third-Party Auth                  | Auth, SSO, Supabase session JWT claims drive RLS           |
| Mobile          | Expo Router                             | Internal-beta mobile app over the same BFF                 |
| Observability   | Vercel Analytics + Sentry + BetterStack | Errors, uptime. Full Prometheus/Grafana deferred.          |

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

## Clerk → Supabase Auth Bridge

Clerk Third-Party Auth session tokens drive Supabase RLS. The Supabase JWT is derived from Clerk session claims and reads KrewPact metadata from the `metadata` object:

- `metadata.krewpact_user_id`
- `metadata.krewpact_org_id`
- `metadata.division_ids`
- `metadata.role_keys`

RLS policies still read from `auth.jwt()`, but the canonical claim source is Clerk session metadata, not a custom JWT template.

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

## AI Agentic Layer

> **Status: OFF by default** — Gated by `AI_ENABLED=true` env var. See `docs/ai-agentic-layer.md` for full documentation.

**Primary model:** Gemini 2.0 Flash (`gemini-2.0-flash`) via `@ai-sdk/google` — requires `GOOGLE_GENERATIVE_AI_API_KEY`.

### 8 Agents (`lib/ai/agents/`)

| Agent                   | Type         | Description                                                                 |
| ----------------------- | ------------ | --------------------------------------------------------------------------- |
| `insight-engine`        | Orchestrator | Runs 4 detectors in parallel, deduplicates, batch-inserts with 7-day TTL    |
| `stale-deal-detector`   | LLM          | Flags opportunities not updated in 14+ days; confidence 0.70→0.95           |
| `bid-matcher`           | LLM          | Matches new bidding opportunities against lead industries                   |
| `budget-anomaly`        | Rule-based   | Flags projects where actual cost / budget > 80%                             |
| `next-action-suggester` | Rule-based   | Suggests next step based on opportunity stage + last activity age           |
| `email-drafter`         | LLM          | Writes subject + body for follow-up, introduction, proposal emails          |
| `digest-builder`        | LLM          | Role-aware daily briefings (executive, PM, sales); stored in `user_digests` |
| `nl-query`              | LLM          | Two-step NL→plan→execute→answer using 4 Supabase query tools                |

### Killswitch Pattern

Every route calling a model checks `process.env.AI_ENABLED !== 'true'` and returns `503` if off. Cron schedules are also removed from `vercel.json` when off. LLM-calling crons (`generate-insights`, `daily-digest`) are gated; read-only routes (`insights`, `suggest`, `digest`, `analytics`, `preferences`) are always active.

### Cost Tracking

Every AI call logs to `ai_actions` table: `org_id`, `user_id`, `model_used`, `input_tokens`, `output_tokens`, `cost_cents`, `latency_ms`. Estimated monthly AI cost per org: $0.50–$1.00 (launch, 10–20 users).

### AI Database Tables

- `ai_insights` — entity-linked nudges (7-day expiry, dismissed/acted_on timestamps)
- `user_digests` — per-user daily briefings (unique per user per day)
- `ai_actions` — cost/usage tracking
- `users.ai_preferences` — JSONB column (min confidence, email opt-in, NL query toggle)

## Executive Dashboard

`app/api/executive/` routes provide a read-only intelligence layer for the `executive` role.

| Route                             | Description                                |
| --------------------------------- | ------------------------------------------ |
| `/api/executive/overview`         | Aggregated metrics across all divisions    |
| `/api/executive/forecast`         | Pipeline forecast and projections          |
| `/api/executive/alerts`           | Active alerts (budget, SLA, stale deals)   |
| `/api/executive/staging`          | Staging pipeline for bulk data import      |
| `/api/executive/subscriptions`    | Executive alert subscriptions              |
| `/api/executive/knowledge/chat`   | RAG-powered chat over knowledge embeddings |
| `/api/executive/knowledge/embed`  | Ingest documents into pgvector             |
| `/api/executive/knowledge/search` | Semantic search over knowledge base        |

### RAG / Knowledge Layer

- **`knowledge_embeddings`** — pgvector table; vectorized content from MDM-Book (SOPs, market data, competitor intel), project lessons, strategy docs
- **`ai_chat_sessions` + `ai_chat_messages`** — context-aware AI chat within dashboard
- **Embedding model:** OpenAI `text-embedding-ada-002` (1536 dimensions), IVFFlat index with 100 lists
- Context-awareness: queries from project view automatically include project context

## ERPNext Integration (13 mappers)

Mappers: Customer, Contact, Opportunity, Quotation, Sales Order, Project, Task, Sales Invoice (read), Purchase Invoice (read), Supplier, Expense Claim, Timesheet, Payment Entry

- Sync: eventual consistency, outbox/inbox, idempotent upsert, retry with backoff, dead-letter
- All custom fields prefixed `krewpact_*`
- ERPNext rate limit: 300 req/min (configurable)
- Always `encodeURIComponent()` for document names in API calls

## Surface Status

- **Production:** Web app, ERPNext sync, Microsoft Graph email/calendar, PWA support
- **Internal beta:** Expo mobile app
- **Deferred:** Offline-first execution. Current mobile/PWA support assumes network connectivity for core writes.

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
