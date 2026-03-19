# KrewPact CRM Workflows

> Internal reference for MDM Group sales operations. Describes the full lead lifecycle and the daily/weekly rhythm for a sales rep using KrewPact.

---

## 1. Life of a Lead

A lead enters KrewPact from one of several sources — manual entry, website form submission, Apollo/Lusha enrichment import, or MERX bid board scrape. From there, it moves through a defined stage pipeline with both manual rep actions and automated background processing.

### Stage Pipeline

```
NEW ──┬──▶ CONTACTED ──▶ QUALIFIED ──▶ PROPOSAL ──▶ NEGOTIATION ──▶ WON
      │                      ▲  │          ▲  │                       │
      └──────────────────────┘  ▼          │  ▼                       ▼
                             NURTURE ──────┘                   Converts to
                                                               Opportunity
```

Every stage except WON and LOST can transition to **LOST** (terminal).
**NEW** can skip directly to **QUALIFIED** for high-ICP-fit leads.
**NURTURE** is a parking lane — leads re-enter the funnel via CONTACTED or QUALIFIED.

### Stage Definitions

| Stage           | What It Means                                           | Who Moves It             |
| --------------- | ------------------------------------------------------- | ------------------------ |
| **New**         | Just entered the system. No outreach yet.               | Auto (on creation)       |
| **Contacted**   | Rep has made first contact (email, call, LinkedIn).     | Rep (manual)             |
| **Qualified**   | Confirmed budget, timeline, decision-maker access.      | Rep (manual)             |
| **Proposal**    | Estimate/quote sent. Waiting on client response.        | Rep (manual)             |
| **Negotiation** | Active back-and-forth on pricing, scope, or terms.      | Rep (manual)             |
| **Nurture**     | Not ready now, but worth keeping warm.                  | Rep (manual)             |
| **Won**         | Deal closed. Lead converts to Account + Opportunity.    | Rep (via Convert action) |
| **Lost**        | Dead — no deal, no future potential. Requires a reason. | Rep (manual)             |

### Automated Background Layer

These processes run continuously without rep intervention:

| Step                      | What Happens                                                                                                                          | Trigger                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **1. Enrichment**         | Apollo/Clearbit/LinkedIn/Google waterfall fills company size, industry, contacts, social profiles.                                    | On lead creation or manual trigger                    |
| **2. Scoring**            | Rules engine evaluates **fit** (company match to ICP), **intent** (signals), and **engagement** (interactions). Produces score 0-100. | On lead creation, enrichment completion, activity log |
| **3. Account Matching**   | Compares lead against existing customer accounts. Match score >= 80% flags lead as existing customer.                                 | After scoring                                         |
| **4. Suppression Check**  | If account match >= 80%, lead is blocked from outreach sequences. Banner shown on lead detail page.                                   | Before enrollment                                     |
| **5. Auto-Enrollment**    | High-scoring leads that pass suppression check are enrolled in outreach sequences.                                                    | Score threshold met + no suppression                  |
| **6. Sequence Execution** | Multi-step email/call cadence fires on schedule. QStash pushes jobs to Vercel serverless workers.                                     | Enrollment active                                     |
| **7. AI Insights**        | Gemini Flash generates per-lead suggestions (next best action, similar won deals, risk flags).                                        | On lead detail page view                              |

### Lead Conversion (Won)

When a rep marks a lead as **Won**, the Convert Lead action:

1. Validates the lead is in `won` stage and hasn't already been converted
2. Creates an **Opportunity** linked to the lead (`lead_id` reference), starting at **Intake** stage
3. Optionally links to an existing **Account** or creates a new one
4. Optionally links to a **Contact**

**Data that carries over to the opportunity:**

- `opportunity_name` ← lead's `company_name` (can be overridden)
- `division_id` ← lead's division
- `estimated_revenue` ← lead's `estimated_value`
- `source_channel` ← lead's source channel
- `stage` ← always starts at `intake`

The lead remains in the system as a historical record (status = won, read-only).

---

## 2. Opportunity Pipeline

Once a lead converts to Won, an opportunity is created and enters its own pipeline. This is where the construction sales process happens — site visits, estimating, proposals, and contract negotiation.

### Stage Pipeline

```
INTAKE ──▶ SITE VISIT ──▶ ESTIMATING ──▶ PROPOSAL ──▶ NEGOTIATION ──▶ CONTRACTED
                                                                          │
  Any stage can transition to CLOSED LOST ◀───────────────────────────────┘
```

Each stage can only move forward (no skipping) or to **CLOSED LOST** (terminal).

### Stage Definitions

| Stage           | What It Means                                                             | Who Moves It         |
| --------------- | ------------------------------------------------------------------------- | -------------------- |
| **Intake**      | Opportunity created from lead conversion. Gathering project requirements. | Auto (on conversion) |
| **Site Visit**  | Rep/estimator has visited the project site. Scope being defined.          | Rep (manual)         |
| **Estimating**  | Estimate/takeoff in progress. Working with estimating team.               | Rep (manual)         |
| **Proposal**    | Formal proposal submitted to client. Awaiting response.                   | Rep (manual)         |
| **Negotiation** | Active discussion on price, scope, schedule, or terms.                    | Rep (manual)         |
| **Contracted**  | Deal signed. Project creation begins. Terminal (won).                     | Rep (manual)         |
| **Closed Lost** | Opportunity dead. Requires a reason. Terminal.                            | Rep (manual)         |

### Connection to Leads

```
LEAD (Won) ──convert──▶ OPPORTUNITY (Intake) ──pipeline──▶ CONTRACTED ──▶ PROJECT
```

The opportunity carries the lead's division, source channel, and estimated value. The lead remains as a historical record.

---

## 3. Sales Rep Day & Week

### Morning: Triage (8:00-9:30 AM)

| Action              | Where                 | What                                                                                          |
| ------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Check dashboard     | `/crm/dashboard`      | Pipeline value, conversion rate, win rate, leads by stage, division comparison                |
| Review SLA alerts   | Dashboard + lead list | Overdue leads flagged automatically (48h new, 72h contacted, 120h qualified, 168h estimating) |
| Process new leads   | `/crm/leads`          | Review overnight enrichment results, score breakdowns, AI suggestions                         |
| Approve enrollments | Pending review queue  | Approve or reject auto-enrolled leads before sequences start sending                          |

### Midday: Active Selling (9:30 AM - 3:00 PM)

| Action           | Where                         | What                                                                           |
| ---------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| Outreach         | Lead detail page              | Compose emails (Resend), log calls, record LinkedIn touches                    |
| Advance leads    | Lead detail → stage buttons   | Move leads through contacted → qualified → proposal                            |
| Work pipeline    | `/crm/opportunities` (Kanban) | Drag opportunities between stages, update values, add notes                    |
| Create estimates | `/estimates`                  | Build quotes from templates, link to opportunities                             |
| Track bids       | `/crm/bidding`                | Monitor MERX imports, bid deadlines, submission status                         |
| Enrichment       | `/crm/enrichment`             | Trigger manual enrichment for high-priority leads, review Apollo/Lusha results |

### End of Day: Log & Review (3:00-4:30 PM)

| Action          | Where                         | What                                                              |
| --------------- | ----------------------------- | ----------------------------------------------------------------- |
| Log activities  | Lead/opportunity detail pages | Record all calls, meetings, site visits as activities             |
| Check sequences | `/crm/sequences`              | Review sequence analytics — open rates, reply rates, bounce rates |
| Update notes    | Notes panel on each entity    | Add context for tomorrow's follow-ups                             |

### Weekly Rhythm

| Day           | Focus                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| **Monday**    | Pipeline review. Prioritize overdue leads. Check enrichment backlog. Team standup prep.                       |
| **Wednesday** | Sequence performance check. Adjust scoring rules or email templates if needed. Mid-week course correction.    |
| **Friday**    | CRM overview report. Win/loss analysis. Settings tuning (SLA thresholds, template refresh). Update forecasts. |

### What's Automated vs Manual

| Automated (no rep action needed)   | Manual (rep must act)                 |
| ---------------------------------- | ------------------------------------- |
| Lead scoring & re-scoring          | Stage transitions (except New)        |
| Data enrichment (Apollo waterfall) | Email composition for custom outreach |
| Account matching & suppression     | Activity logging (calls, meetings)    |
| Sequence email sends               | Enrollment approval/rejection         |
| SLA overdue flagging               | Pipeline stage advancement            |
| AI insight generation              | Estimate creation                     |
| Bid board imports (MERX)           | Lead conversion (Won)                 |
| Smoke test & health monitoring     | Lost reason documentation             |

### Bidding & Tenders

Bidding opportunities are tracked separately from leads. Sources:

- **MERX import** — bulk import from bid board exports via `/api/crm/bidding/import`
- **Manual entry** — reps create opportunities directly at `/crm/bidding`

Bids can be linked to opportunities when they progress to the proposal stage.

### Activity Types

Activities are the primary interaction record. Five types are supported:

- **Call** — phone conversations, logged with notes and duration
- **Email** — sent via Resend or logged manually
- **Meeting** — in-person or virtual meetings, including site visits
- **Note** — internal notes, context for team handoffs
- **Task** — action items with due dates and assignees

Activities can be linked to any entity: leads, opportunities, accounts, or contacts. The system auto-logs email sends from sequences and creates activities for overdue follow-up reminders.

---

## 4. Background Automations (Cron Jobs)

14 scheduled jobs run in the background. All times are ET.

### Sales & CRM

| Job                     | Schedule                 | What It Does                                                              |
| ----------------------- | ------------------------ | ------------------------------------------------------------------------- |
| **Scoring**             | Every 4 hours            | Re-evaluates fit/intent/engagement scores for all leads                   |
| **Sequence Processor**  | Every 15 min             | Fires next step in active outreach sequences (emails, call reminders)     |
| **Enrichment**          | Mon / Wed / Fri at 11 AM | Runs Apollo → Clearbit → LinkedIn → Google waterfall on unenriched leads  |
| **Apollo Pump**         | Monday at 10 AM          | Imports new leads from Apollo saved searches                              |
| **ICP Refresh**         | Monday at 11 AM          | Regenerates Ideal Customer Profile model from won/lost data               |
| **SLA Alerts**          | Weekdays at 12 PM        | Flags leads exceeding stage SLA thresholds (48h new, 72h contacted, etc.) |
| **Follow-up Reminders** | Weekdays at 1 PM         | Notifies reps of overdue follow-ups and upcoming tasks                    |

### Operations & Sync

| Job                  | Schedule         | What It Does                                                              |
| -------------------- | ---------------- | ------------------------------------------------------------------------- |
| **ERP Sync**         | Every 30 min     | Syncs customers, invoices, and projects between Supabase and ERPNext      |
| **Portal Reminders** | Weekdays at 1 PM | Sends reminders for pending portal actions (approvals, document uploads)  |
| **Smoke Test**       | Hourly           | Tests all external service connections (Supabase, ERPNext, Resend, Clerk) |
| **Watchdog**         | Hourly           | Monitors smoke test results and sends alerts on consecutive failures      |

### Intelligence & Reporting

| Job                   | Schedule          | What It Does                                                    |
| --------------------- | ----------------- | --------------------------------------------------------------- |
| **Daily Digest**      | Weekdays at 11 AM | Generates pipeline summary email for sales team                 |
| **Generate Insights** | Daily at 3 AM     | AI-generated per-lead insights and next-best-action suggestions |
| **Summarize**         | Weekdays at 10 PM | Creates end-of-day activity summaries and highlights            |

---

## 5. Key Metrics (Dashboard)

| Metric               | What It Shows                                                          |
| -------------------- | ---------------------------------------------------------------------- |
| Pipeline Value       | Total estimated revenue across all active opportunities                |
| Conversion Rate      | Leads that reach Won / Total leads                                     |
| Win Rate             | Opportunities won / Opportunities closed (won + lost)                  |
| Avg. Days in Stage   | Mean time leads spend in each stage (SLA compliance)                   |
| Sequence Performance | Open rate, reply rate, bounce rate across all active sequences         |
| Division Comparison  | Side-by-side metrics for Contracting, Homes, Wood, Telecom, Management |

---

_Last updated: 2026-03-19_
