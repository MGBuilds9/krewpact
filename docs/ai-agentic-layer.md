# AI Agentic Layer

> **Status: OFF** — All AI features are disabled via `AI_ENABLED=false` (default).
> Set `AI_ENABLED=true` in Vercel env vars when ready to launch.

## Killswitch

Every route that calls an AI model checks `process.env.AI_ENABLED !== 'true'` and returns `503` if off.

| Route                                 | Gated | Reason                                                      |
| ------------------------------------- | ----- | ----------------------------------------------------------- |
| `POST /api/ai/query`                  | Yes   | Calls Gemini (2 LLM calls per request)                      |
| `POST /api/ai/draft-email`            | Yes   | Calls Gemini                                                |
| `POST /api/cron/generate-insights`    | Yes   | Calls Gemini for each stale deal                            |
| `POST /api/cron/daily-digest`         | Yes   | Calls Gemini for summary + sends email                      |
| `GET /api/ai/insights`                | No    | Read-only DB query (returns empty if no insights generated) |
| `GET /api/ai/suggest`                 | No    | Rule-based DB lookups, no LLM                               |
| `GET /api/ai/digest`                  | No    | Read-only DB query                                          |
| `GET /api/ai/analytics`               | No    | Read-only DB query                                          |
| `GET/PUT /api/ai/preferences`         | No    | User settings CRUD                                          |
| `PATCH /api/ai/insights/[id]/dismiss` | No    | DB update only                                              |
| `POST /api/ai/insights/[id]/act`      | No    | DB update only                                              |

Cron schedules are also **removed from `vercel.json`** — routes exist but won't auto-fire.

### To enable AI features at launch:

1. Set in Vercel: `AI_ENABLED=true`
2. Set in Vercel: `GOOGLE_GENERATIVE_AI_API_KEY=<your-key>` (NOT `GEMINI_API_KEY`)
3. Optionally set: `ANTHROPIC_API_KEY=<key>` (for NL query fallback)
4. Re-add crons to `vercel.json`:

```json
{
  "path": "/api/cron/generate-insights",
  "schedule": "0 */2 * * *"
},
{
  "path": "/api/cron/daily-digest",
  "schedule": "0 12 * * 1-5"
}
```

5. Redeploy

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        TWO TRIGGER PATHS                             │
│                                                                      │
│  ┌─────────────────────┐          ┌──────────────────────────────┐  │
│  │  CRON (background)  │          │  USER ACTION (real-time)     │  │
│  │                     │          │                              │  │
│  │  generate-insights  │          │  Cmd+K NL query              │  │
│  │  daily-digest       │          │  "Draft email" button        │  │
│  │  (disabled — manual │          │  "Get suggestions" on est.   │  │
│  │   curl only)        │          │  View any entity page        │  │
│  └────────┬────────────┘          └──────────────┬───────────────┘  │
│           │                                      │                   │
└───────────┼──────────────────────────────────────┼───────────────────┘
            ▼                                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        MODEL ROUTER (lib/ai/router.ts)               │
│                                                                      │
│  Task type → Provider + Model:                                       │
│    nudge/draft/summarize → Google    Gemini 2.0 Flash               │
│    query                 → Anthropic Claude Haiku 4.5               │
│    embed                 → OpenAI   text-embedding-ada-002          │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│  8 AGENTS        │  │  TOOL SYSTEM     │  │  COST TRACKER        │
│                  │  │  (lib/ai/tools)  │  │  (lib/ai/cost-       │
│  insight-engine  │  │                  │  │   tracker.ts)        │
│  ├ stale-deal    │  │  4 query tools:  │  │                      │
│  ├ bid-matcher   │  │  - search_opps   │  │  Every AI call logs: │
│  ├ budget-anomaly│  │  - search_leads  │  │  • org_id, user_id   │
│  ├ next-action   │  │  - search_proj   │  │  • model used        │
│  │               │  │  - get_metrics   │  │  • input/output tkns │
│  email-drafter   │  │                  │  │  • cost in cents     │
│  digest-builder  │  │  NL query agent  │  │  • latency ms        │
│  nl-query        │  │  uses tools to   │  │                      │
│  next-action-sug │  │  fetch data      │  │  → ai_actions table  │
└────────┬─────────┘  └──────────────────┘  └──────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     SUPABASE (3 new tables + 1 column)               │
│                                                                      │
│  ai_insights        entity-linked nudges (7-day expiry, deduplicated)│
│  user_digests       per-user daily briefings (1 per user per day)   │
│  ai_actions         cost/usage tracking for analytics dashboard     │
│  users.ai_prefs     min confidence threshold, email opt-in (JSONB)  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     UI COMPONENTS (5 new)                             │
│                                                                      │
│  AiInsightBanner     Amber cards on entity detail pages              │
│  AiSuggestion        Inline suggestions on estimate line items       │
│  DailyDigestWidget   Dashboard card with today's briefing            │
│  EmailDraftModal     AI-drafted email with copy/edit/send            │
│  InsightAnalyticsCard Settings page — cost + usage breakdown         │
│                                                                      │
│  + CommandPalette    NL query mode (Cmd+K → type question)           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Models & Providers

| Provider      | Model                       | Env Var                        | Used For                                                                  |
| ------------- | --------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| **Google**    | `gemini-2.0-flash`          | `GOOGLE_GENERATIVE_AI_API_KEY` | Nudges, email drafts, digest summaries, NL query (plan + answer)          |
| **Anthropic** | `claude-haiku-4-5-20251001` | `ANTHROPIC_API_KEY`            | NL query (router says Haiku, but current code uses Gemini for both steps) |
| **OpenAI**    | `text-embedding-ada-002`    | _(existing from RAG layer)_    | Knowledge embeddings (pgvector, not part of agentic layer)                |

> **Note:** The router maps `query → Anthropic Haiku`, but the `nl-query.ts` agent currently hardcodes `google('gemini-2.0-flash')` for both the planning and answering steps. This is intentional for MVP to keep one provider. Switch to Haiku when Anthropic key is configured.

### Important: Env Var Name

The Vercel AI SDK (`@ai-sdk/google`) reads `GOOGLE_GENERATIVE_AI_API_KEY`, **not** `GEMINI_API_KEY`. If you set the wrong name, all Gemini calls will fail with an auth error.

---

## Cost Breakdown

### Per-Token Pricing (from `lib/ai/cost-tracker.ts`)

| Model            | Input (per 1M tokens) | Output (per 1M tokens) |
| ---------------- | --------------------- | ---------------------- |
| Gemini 2.0 Flash | $0.075                | $0.30                  |
| Claude Haiku 4.5 | $0.80                 | $4.00                  |
| ada-002 (embed)  | $0.10                 | N/A                    |

### Per-Task Token Estimates

| Task                  | Model        | Max Output Tokens | Avg Input Tokens | Avg Output Tokens | Est. Cost/Call |
| --------------------- | ------------ | ----------------- | ---------------- | ----------------- | -------------- |
| **Stale deal nudge**  | Gemini Flash | 80                | ~200             | ~60               | $0.000033      |
| **Email draft**       | Gemini Flash | 400               | ~800             | ~300              | $0.000150      |
| **NL query (plan)**   | Gemini Flash | 150               | ~500             | ~80               | $0.000062      |
| **NL query (answer)** | Gemini Flash | 200               | ~600             | ~150              | $0.000090      |
| **Digest summary**    | Gemini Flash | 100               | ~400             | ~80               | $0.000054      |
| **Bid match insight** | Gemini Flash | 80                | ~300             | ~60               | $0.000041      |

### Monthly Cost Projections (per org)

#### Cron: Generate Insights (every 2 hours = 12 runs/day)

| Detector         | Calls/Run (max)     | LLM Calls       | Daily Cost | Monthly Cost |
| ---------------- | ------------------- | --------------- | ---------- | ------------ |
| Stale deals      | 20 opps scanned     | 20 Gemini calls | $0.008     | **$0.24**    |
| Bid matches      | 20 leads scanned    | 20 Gemini calls | $0.008     | **$0.24**    |
| Next actions     | 20 opps scanned     | 0 (rule-based)  | $0.00      | **$0.00**    |
| Budget anomalies | 20 projects scanned | 0 (rule-based)  | $0.00      | **$0.00**    |
| **Subtotal**     |                     |                 | **$0.016** | **$0.48**    |

> Deduplication means most runs produce 0 new insights after the first run. Real cost will be much lower.

#### Cron: Daily Digest (weekdays at noon = ~22 runs/month)

| Component               | Per User          | For 20 Users | Monthly (22 days) |
| ----------------------- | ----------------- | ------------ | ----------------- |
| Digest summary (Gemini) | $0.000054         | $0.0011      | **$0.024**        |
| Email send (Resend)     | $0.00 (free tier) | $0.00        | **$0.00**         |
| **Subtotal**            |                   |              | **$0.024**        |

#### User-Triggered (estimated usage)

| Action           | Frequency (est.) | Cost/Call | Monthly Cost |
| ---------------- | ---------------- | --------- | ------------ |
| NL query (Cmd+K) | 50 queries/month | $0.000152 | **$0.008**   |
| Email drafts     | 30 drafts/month  | $0.000150 | **$0.005**   |
| **Subtotal**     |                  |           | **$0.013**   |

### Total Monthly Cost Estimate

| Scenario              | Orgs | Users | Est. Monthly AI Cost |
| --------------------- | ---- | ----- | -------------------- |
| **MDM only (launch)** | 1    | 10-20 | **$0.50 - $1.00**    |
| **10 orgs**           | 10   | 100   | **$5 - $10**         |
| **50 orgs (scale)**   | 50   | 500   | **$25 - $50**        |

> Gemini 2.0 Flash is extremely cheap. Even at scale, the AI layer costs less than a single Vercel Pro seat.

---

## 8 Agents

### 1. Insight Engine (`lib/ai/agents/insight-engine.ts`)

**Orchestrator.** Runs 4 detectors in parallel, deduplicates against existing active insights, batch-inserts new ones with 7-day TTL.

### 2. Stale Deal Detector (`lib/ai/agents/stale-deal-detector.ts`)

Finds opportunities not updated in 14+ days (excluding contracted/closed_lost). Gemini writes a 1-sentence nudge. Confidence scales with staleness (0.70 at 14 days → 0.95 at 39+ days).

### 3. Bid Matcher (`lib/ai/agents/bid-matcher.ts`)

Matches new bidding opportunities against lead industries. Gemini explains the match. Links to the bidding opportunity for quick action.

### 4. Budget Anomaly Detector (`lib/ai/agents/budget-anomaly.ts`)

**Rule-based (no LLM).** Flags projects where `actual_cost / budget > 80%`. Generates warning with % consumed and burn rate.

### 5. Next Action Suggester (`lib/ai/agents/next-action-suggester.ts`)

**Rule-based (no LLM).** Looks at opportunity stage + days since last activity and suggests logical next steps (schedule site visit, send proposal, follow up, etc.).

### 6. Email Drafter (`lib/ai/agents/email-drafter.ts`)

Takes entity context (lead/opp/account) + recent activities + draft type (follow_up, introduction, proposal, custom). Gemini writes subject + body. Returns suggested recipient email from contacts.

### 7. Digest Builder (`lib/ai/agents/digest-builder.ts`)

Role-aware daily briefings:

- **Executive:** Won/lost MTD, pipeline value, stale deals
- **PM:** Tasks due today, active project budget %
- **Sales:** Pipeline summary, stale deals, new leads
- **Other:** Combined sales + PM view

Gemini writes 2-sentence summary. Stored in `user_digests`, emailed via Resend.

### 8. NL Query Agent (`lib/ai/agents/nl-query.ts`)

Two-step process:

1. **Plan:** Gemini reads the user's natural language question + available tools → outputs `TOOL: search_opportunities ARGS: {"stale_days": 30}`
2. **Execute:** Runs the tool against Supabase, gets data summary
3. **Answer:** Gemini converts data into natural language response

Available tools: `search_opportunities`, `search_leads`, `search_projects`, `get_metrics` (pipeline_value, win_rate, avg_deal_size, leads_this_month, active_projects).

---

## Database Schema

### `ai_insights`

| Column       | Type                    | Notes                                                   |
| ------------ | ----------------------- | ------------------------------------------------------- |
| id           | UUID PK                 |                                                         |
| org_id       | UUID FK → organizations | RLS-gated                                               |
| entity_type  | TEXT                    | lead, opportunity, project, account, task               |
| entity_id    | UUID                    |                                                         |
| insight_type | TEXT                    | stale_deal, bid_match, budget_alert, next_action, etc.  |
| title        | TEXT                    | Short headline                                          |
| content      | TEXT                    | LLM-generated explanation                               |
| confidence   | FLOAT                   | 0.0-1.0, default 0.5                                    |
| action_url   | TEXT                    | Optional deep link                                      |
| action_label | TEXT                    | Optional CTA text                                       |
| metadata     | JSONB                   | Detector-specific data (days_stale, stage, value, etc.) |
| model_used   | TEXT                    | gemini-2.0-flash, rule-based                            |
| expires_at   | TIMESTAMPTZ             | 7 days from creation                                    |
| dismissed_at | TIMESTAMPTZ             | Set when user clicks X                                  |
| acted_on_at  | TIMESTAMPTZ             | Set when user clicks action                             |

**Indexes:** `(entity_type, entity_id) WHERE dismissed_at IS NULL`, `(org_id)`, `(expires_at)`

### `user_digests`

| Column        | Type                    | Notes                                       |
| ------------- | ----------------------- | ------------------------------------------- |
| id            | UUID PK                 |                                             |
| user_id       | UUID FK → users         |                                             |
| org_id        | UUID FK → organizations | RLS-gated                                   |
| digest_date   | DATE                    |                                             |
| sections      | JSONB                   | Array of `{title, items: [{label, value}]}` |
| summary       | TEXT                    | 2-sentence LLM summary                      |
| email_sent_at | TIMESTAMPTZ             |                                             |
| read_at       | TIMESTAMPTZ             | Set when user views in dashboard            |

**Unique:** `(user_id, digest_date)`

### `ai_actions`

| Column        | Type                    | Notes                                                 |
| ------------- | ----------------------- | ----------------------------------------------------- |
| id            | UUID PK                 |                                                       |
| org_id        | UUID FK → organizations | RLS-gated                                             |
| user_id       | UUID FK → users         | Null for cron jobs                                    |
| action_type   | TEXT                    | insight_generated, email_drafted, query_planned, etc. |
| model_used    | TEXT                    |                                                       |
| input_tokens  | INT                     |                                                       |
| output_tokens | INT                     |                                                       |
| cost_cents    | INT                     | Auto-calculated from token counts                     |
| latency_ms    | INT                     |                                                       |

### `users.ai_preferences` (JSONB column)

```json
{
  "insight_min_confidence": 0.7,
  "digest_email_enabled": true,
  "nl_query_enabled": true
}
```

---

## Files

### Source (25 new files)

```
lib/ai/
├── index.ts              Barrel exports
├── router.ts             Task → provider/model mapping
├── types.ts              AITask, InsightType, EntityType, etc.
├── cost-tracker.ts       Token cost estimation + DB logging
├── tools.ts              4 query tools for NL agent
├── providers/
│   └── gemini.ts         Gemini 2.0 Flash wrapper (via @ai-sdk/google)
└── agents/
    ├── insight-engine.ts     Orchestrator (runs 4 detectors)
    ├── stale-deal-detector.ts
    ├── bid-matcher.ts
    ├── budget-anomaly.ts
    ├── next-action-suggester.ts
    ├── email-drafter.ts
    ├── digest-builder.ts
    └── nl-query.ts

components/AI/
├── index.ts
├── AiInsightBanner.tsx
├── AiSuggestion.tsx
├── DailyDigestWidget.tsx
├── EmailDraftModal.tsx
└── InsightAnalyticsCard.tsx

app/api/ai/
├── insights/route.ts           GET: fetch active insights for entity
├── insights/[id]/dismiss/route.ts  PATCH: mark dismissed
├── insights/[id]/act/route.ts      POST: mark acted on
├── query/route.ts              POST: NL query (gated)
├── draft-email/route.ts        POST: email draft (gated)
├── suggest/route.ts            GET: rule-based field suggestions
├── digest/route.ts             GET: today's digest for user
├── analytics/route.ts          GET: insight + cost analytics
└── preferences/route.ts        GET/PUT: user AI preferences

app/api/cron/
├── generate-insights/route.ts  POST: batch insight generation (gated)
└── daily-digest/route.ts       POST: build + email digests (gated)
```

### Tests (15 new files, 111 tests)

```
__tests__/lib/ai/          13 test files (agents, providers, router, tools, cost-tracker)
__tests__/api/ai/           9 test files (all API routes)
__tests__/components/AI/    5 test files (all components)
```

### Migrations

```
supabase/migrations/20260312_001_ai_agentic_layer.sql   (ai_insights, user_digests, ai_actions + RLS)
supabase/migrations/20260312_002_ai_preferences.sql     (users.ai_preferences JSONB column)
```
