# Executive Nucleus — Design Document

**Date:** 2026-03-09
**Status:** Approved
**Author:** KrewPact Team

## Overview

The Executive Nucleus is a restricted module within KrewPact that consolidates all MDM Group operational intelligence into a single interface accessible only to the C-suite (CEO, CFO, COO) and IT Director. It has two pillars:

1. **Command Center** — real-time dashboard aggregating financial, operational, and market data across all 6 divisions
2. **Knowledge Base** — searchable, AI-powered document corpus with a verified ingestion pipeline

## Problem

MDM Group's strategic data is scattered across:

- `_mdm/` vault folder (92 documents — SOPs, strategy, market research, infrastructure docs)
- ERPNext (financial data)
- KrewPact (CRM, projects, estimates, contracts)
- MDM-Book-Internal repo (skeleton folder structure)
- `08-finances/` vault folder (bank statements, budget)
- Craft docs (partially migrated)
- Email, WhatsApp, spreadsheets

The C-suite has no single place to see the full picture of the company. Running MDM requires checking 5+ systems.

## Solution

### Route Structure

```
/org/[orgSlug]/executive/
├── /                        ← Command Center overview (all widgets)
├── /finance                 ← Financial deep-dive (ERPNext data)
├── /pipeline                ← CRM pipeline deep-dive
├── /projects                ← Project health portfolio
├── /market                  ← Market intelligence (from knowledge base)
├── /subscriptions           ← SaaS/tool cost tracking
├── /knowledge               ← Document library + search
├── /knowledge/ingest        ← Ingestion pipeline (review/approve)
└── /knowledge/chat          ← AI chat against the verified corpus
```

### Access Control

**Roles:** `platform_admin`, `executive` only.

```typescript
const EXECUTIVE_ROLES = ['platform_admin', 'executive'] as const;

// Granular permissions within executive module:
// - Command Center (all pages): all EXECUTIVE_ROLES
// - Knowledge search + chat: all EXECUTIVE_ROLES
// - Knowledge ingest (approve/reject): platform_admin only
// - Subscription management (CRUD): platform_admin only
```

RLS policies use existing JWT claims pattern: `auth.jwt() ->> 'krewpact_roles'`.

---

## Pillar A: Command Center

### Overview Page Widgets

| #   | Widget                   | Data Source                        | Key Metrics                                                                                                                 |
| --- | ------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Action Required**      | Cross-table queries                | Overdue invoices, stalled deals, red projects, expiring contracts, pending approvals, SaaS renewals, knowledge review queue |
| 2   | **Financial Pulse**      | ERPNext (existing mappers)         | AR/AP totals, cash position, monthly revenue, P&L summary, outstanding invoices                                             |
| 3   | **Pipeline Health**      | KrewPact CRM (existing)            | Total pipeline value, stage distribution, velocity, win rate, division breakdown                                            |
| 4   | **Backlog & Forecast**   | Cross-system (contracts + ERPNext) | Total backlog, months of work, quarterly forecast, division breakdown                                                       |
| 5   | **Project Portfolio**    | KrewPact Projects (existing)       | Active count, health scores, overdue milestones, division breakdown                                                         |
| 6   | **Division Scorecards**  | Cross-table aggregation            | Per-division KPIs: revenue, projects, pipeline, team size, health                                                           |
| 7   | **Estimating Velocity**  | KrewPact Estimating (existing)     | Open bids, hit rate, avg margin, pending proposals                                                                          |
| 8   | **Staffing Overview**    | ERPNext Employee doctype           | Headcount by division, contractor vs employee                                                                               |
| 9   | **Market Intelligence**  | Knowledge base (verified docs)     | Latest GTA data, material price trends, competitor moves                                                                    |
| 10  | **Subscription Tracker** | `executive_subscriptions` table    | Monthly SaaS spend, per-tool cost, renewal dates                                                                            |

### Division Filtering

Every widget supports division filtering via a global filter bar at the top of the executive layout. Default view shows all divisions (the "whole picture"). Users can filter to a single division or compare divisions side-by-side.

### Alert Thresholds (Action Required Widget)

| Alert              | Trigger                                         | Severity |
| ------------------ | ----------------------------------------------- | -------- |
| Overdue invoice    | AR > 30 days                                    | High     |
| Stalled deal       | No CRM activity > 14 days on open opportunity   | Medium   |
| Project health red | Health score < 40%                              | High     |
| Expiring contract  | Contract end date within 14 days                | Medium   |
| SaaS renewal       | Renewal date within 7 days                      | Low      |
| Pending approval   | Change order / estimate awaiting approval > 48h | Medium   |
| Knowledge queue    | > 5 docs pending review                         | Low      |

### Metrics Cache

Cross-system metrics (backlog, forecast, division scorecards) are expensive to compute in real-time. Solution:

```sql
CREATE TABLE executive_metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    metric_key TEXT NOT NULL,        -- 'backlog_total', 'division_scorecard_contracting', etc.
    metric_value JSONB NOT NULL,     -- flexible shape per metric type
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, metric_key)
);
```

Refreshed hourly via QStash cron job. The API serves from cache; the overview page shows "Last updated: X minutes ago" with a manual refresh button.

---

## Pillar B: Knowledge Base

### Ingestion Pipeline

```
Source (vault, upload, URL)
    │
    ▼
knowledge_staging (status: pending_review)
    │
    ├── Review UI: view, edit, categorize, tag, assign division
    │
    ├── Approve → knowledge_docs (verified)
    │               │
    │               ▼ async (QStash job)
    │           chunk → embed (OpenAI ada-002) → knowledge_embeddings
    │
    ├── Reject → archived, review_notes recorded
    │
    └── Needs Edit → edited_content updated, re-review
```

### New Table: `knowledge_staging`

```sql
CREATE TABLE knowledge_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),

    -- Source tracking
    source_path TEXT,                  -- vault path or upload filename
    source_type TEXT NOT NULL,         -- 'vault_import', 'upload', 'url_scrape'

    -- Content
    title TEXT NOT NULL,
    raw_content TEXT NOT NULL,         -- original markdown/text
    edited_content TEXT,               -- human-edited version (null = unchanged)

    -- Classification
    category TEXT,                     -- 'sop', 'strategy', 'market', 'infrastructure', 'marketing', 'architecture', 'analysis'
    division_id UUID REFERENCES divisions(id),
    tags TEXT[],

    -- Review workflow
    status TEXT NOT NULL DEFAULT 'pending_review',
    -- States: pending_review → approved → ingested
    --         pending_review → rejected
    --         pending_review → needs_edit → pending_review (loop)
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Checksums for change detection on re-import
    content_checksum TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: executive roles only
ALTER TABLE knowledge_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY "executive_read_staging" ON knowledge_staging
    FOR SELECT USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ?| ARRAY['platform_admin', 'executive']
    );
CREATE POLICY "admin_write_staging" ON knowledge_staging
    FOR ALL USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );
```

### Ingestion Review UI (`/knowledge/ingest`)

- **Queue view:** Filterable table — status, category, division, date imported
- **Document viewer:** Rendered markdown preview with syntax highlighting
- **Inline editor:** Edit content before approving (fix errors, redact sensitive info)
- **Metadata panel:** Set category, division, tags, review notes
- **Bulk actions:** Approve/reject selected, bulk re-categorize
- **Diff view:** On re-import, show diff against previously approved version
- **Audit integration:** All approve/reject actions logged to existing audit_logs table

### Document Library (`/knowledge`)

- **Search:** Full-text search + semantic search (pgvector similarity)
- **Browse:** Category tree, division filter, tag filter
- **Document viewer:** Rendered markdown with metadata sidebar
- **Citation links:** Each doc has a stable URL for reference in chat

### AI Chat (`/knowledge/chat`)

Uses existing `ai_chat_sessions` + `ai_chat_messages` tables.

- Scoped to executive role
- Queries `knowledge_embeddings` via pgvector similarity search
- Returns answers with document citations (clickable links to source docs)
- Context-aware: can combine knowledge base with live KrewPact data
- Conversation history persisted per user

### Embedding Pipeline (async)

On document approval:

1. QStash job triggers `/api/knowledge/embed` endpoint
2. Document split into chunks (500-token windows, 100-token overlap)
3. Each chunk embedded via OpenAI ada-002 (1536 dimensions)
4. Stored in `knowledge_embeddings` with `doc_id` FK
5. Staging record status updated to `ingested`

Existing `knowledge_docs` and `knowledge_embeddings` tables are reused (migration `20260212220000`).

---

## New Table: `executive_subscriptions`

```sql
CREATE TABLE executive_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),

    name TEXT NOT NULL,                  -- 'Clerk', 'Vercel', 'Supabase'
    category TEXT NOT NULL,              -- 'platform', 'dev_tools', 'marketing', 'operations'
    vendor TEXT,

    monthly_cost NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'CAD',
    billing_cycle TEXT DEFAULT 'monthly', -- 'monthly', 'annual'
    renewal_date DATE,

    division_id UUID REFERENCES divisions(id), -- null = corporate-wide
    owner_user_id UUID REFERENCES users(id),

    notes TEXT,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: executive read, admin write
ALTER TABLE executive_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "executive_read_subs" ON executive_subscriptions
    FOR SELECT USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ?| ARRAY['platform_admin', 'executive']
    );
CREATE POLICY "admin_write_subs" ON executive_subscriptions
    FOR ALL USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );
```

---

## Existing Infrastructure Reused

| Component                                                   | How It's Used                                |
| ----------------------------------------------------------- | -------------------------------------------- |
| `knowledge_docs` + `knowledge_embeddings` (migration 00004) | Store verified documents and vectors         |
| `ai_chat_sessions` + `ai_chat_messages`                     | Chat persistence                             |
| ERPNext 13 mappers                                          | Financial data for dashboard widgets         |
| `useUserRBAC` hook                                          | Role gating on frontend                      |
| `apiFetch` + BFF pattern                                    | All API calls through Next.js routes         |
| Audit log                                                   | Ingestion approvals logged                   |
| QStash                                                      | Async embedding jobs + metrics cache refresh |
| Existing executive dashboard API                            | Extended, not replaced                       |

## New Infrastructure Required

| Component                       | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| `knowledge_staging` table       | Ingestion review pipeline                   |
| `executive_subscriptions` table | SaaS cost tracking                          |
| `executive_metrics_cache` table | Cached cross-system metrics                 |
| QStash cron (hourly)            | Refresh metrics cache                       |
| CLI import script               | Bulk import vault `_mdm/` docs into staging |
| OpenAI embedding calls          | Vectorize approved documents                |

---

## Compliance

- **PIPEDA:** No PII in knowledge base (SOPs, strategy, market data). Credential docs (`_mdm/credentials/`) explicitly excluded from ingestion.
- **RLS:** All new tables have deny-by-default RLS with executive/admin role checks via JWT claims.
- **Audit:** All ingestion approvals/rejections logged to existing audit trail.
- **GPL v3:** ERPNext data accessed via existing REST API mappers. No boundary violation.
- **AODA:** Executive module uses existing shadcn/ui Radix primitives. Axe-core tests required for new pages.

## Build Sequence (Recommended)

### Phase 1: Foundation (knowledge ingestion + staging)

- Migration: `knowledge_staging`, `executive_subscriptions`, `executive_metrics_cache`
- API: staging CRUD, bulk vault import endpoint
- UI: `/executive` layout, `/knowledge/ingest` review interface
- CLI: vault import script (reads `_mdm/`, creates staging records)

### Phase 2: Knowledge Base Live

- API: embedding pipeline (chunk + embed on approval)
- API: semantic search endpoint
- UI: `/knowledge` document library with search
- UI: `/knowledge/chat` AI chat interface

### Phase 3: Command Center

- API: `/api/executive/overview` (aggregates all widgets)
- API: `/api/executive/alerts` (cross-table threshold queries)
- API: `/api/executive/metrics/refresh` (QStash cron target)
- UI: `/executive` overview with all 10 widgets
- UI: Sub-pages (finance, pipeline, projects, market, subscriptions)

### Phase 4: Polish

- Division comparison views
- Backlog forecast charting
- Subscription cost trend over time
- Market intelligence auto-refresh (periodic re-scrape + re-ingest)
- Mobile-responsive executive layout
