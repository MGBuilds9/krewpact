# MDM Ecosystem Optimization — Design Document

**Date:** February 14, 2026
**Author:** Michael Guirguis + Claude
**Status:** Approved
**Approach:** Website-First Funnel (Approach A)

---

## 1. Project Structure

### Active Ecosystem (3 repos + 1 automation)

| Repo                  | Role                                                           | Deploy                                    |
| --------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| **mdm-website-v2**    | Public site + client portal + lead capture + visitor tracking  | Vercel → mdmcontracting.ca                |
| **KrewPact**          | Operations nucleus: CRM, estimating, projects, analytics, APIs | Vercel (frontend) + ERPNext (self-hosted) |
| **MDM-Book-Internal** | Strategic intelligence, SOPs, templates, company knowledge     | Cloudflare Pages (dashboards)             |
| **n8n/MDM**           | Workflow automation (email gen, intake, enrichment)            | Self-hosted n8n.mdmgroupinc.ca            |

### Archived

| Repo                | Reason                                           |
| ------------------- | ------------------------------------------------ |
| LeadForge-MDM-Group | Merged into KrewPact CRM (Feb 2026)              |
| MDM-Hub-Project     | Superseded by KrewPact (Feb 2026)                |
| mdm-contracting-hub | Dead scaffold, superseded by KrewPact (Feb 2026) |

### Corrections Applied

- **JobTread:** Evaluated as construction PM platform. Serves as KrewPact's long-term feature floor — the minimum feature set to match or exceed. MDM currently uses Sage 50 Accounting + Sage Construction Management.
- **Sage:** Sage 50 Accounting (5 entities) + Sage Construction Management. Being migrated to ERPNext.

### Folder Structure

```
Code/MDM-Projects/
├── krewpact/
├── mdm-website-v2/
├── MDM-Book-Internal/
├── _archived/
│   ├── LeadForge-MDM-Group/
│   ├── MDM-Hub-Project/
│   └── mdm-contracting-hub/
├── CLAUDE.md
├── erpnext-migration-mapping.md
├── onedrive-audit-report.md
├── smb-audit-report.md
└── memory/
```

---

## 2. Website-First Lead Capture (Weeks 1-2)

### Tools & Costs

| Category             | Tool                      | Cost     | Notes                |
| -------------------- | ------------------------- | -------- | -------------------- |
| Visitor tracking     | PostHog (cloud free tier) | $0/mo    | 1M events/mo free    |
| Lead enrichment      | Apollo.io (free tier)     | $0/mo    | 100 credits/mo       |
| Email verification   | Reoon (free tier)         | $0/mo    | 600 verifications/mo |
| Speed-to-lead alerts | Microsoft Teams webhook   | $0/mo    | Already have M365    |
| Cookie consent       | CookieYes or open-source  | $0-12/mo | PIPEDA compliance    |
| Email sending        | Resend (free tier)        | $0/mo    | 3,000 emails/mo      |
| Website hosting      | Vercel                    | Existing | Already configured   |
| CMS database         | Neon                      | Existing | Already configured   |

**Total new cost: $0-12/month**

### What We Build

**Visitor Tracking:**

- PostHog snippet on all pages
- Cookie consent banner (PIPEDA)
- Track: pages viewed, time on page, return visits, service pages visited, gallery projects viewed
- Anonymous visitor profiles accumulate behavior data

**Smart Contact Forms (upgrade existing):**

- Add fields: project type, budget range, timeline, how they found us
- POST to KrewPact API (queued locally until CRM exists)
- Auto-enrichment on submit: Apollo company lookup, Reoon email verification
- Speed-to-lead: Teams webhook alert within 60 seconds
- Auto-reply email with relevant case studies based on project type

**Lead Scoring (passive):**

| Signal                     | Points | Source                  |
| -------------------------- | ------ | ----------------------- |
| Visited services page      | +5     | PostHog                 |
| Viewed gallery project     | +3     | PostHog                 |
| Visited contact page       | +10    | PostHog                 |
| Return visit               | +15    | PostHog                 |
| Form submission            | +50    | Website                 |
| Email verified valid       | +10    | Reoon                   |
| Company found in Apollo    | +20    | Apollo                  |
| Company size 10+ employees | +10    | Apollo                  |
| Budget > $100K             | +25    | Form field              |
| Hot lead threshold         | 80+    | Triggers priority alert |

### Integration Pattern

```
Website visitor → PostHog tracking → anonymous profile
                                          ↓
Contact form submit → KrewPact API → CRM lead record
                          ↓                    ↓
                    Enrichment pipeline    Teams alert
                    (Apollo/Reoon via n8n) Auto-reply email
```

---

## 3. KrewPact CRM Module (Weeks 3-5)

### Core Tables (from existing schema)

- `leads` — Inbound from website, outbound from prospecting, bid platforms
- `contacts` — People (linked to accounts)
- `accounts` — Companies/organizations
- `opportunities` — Qualified leads with deal value, stage, probability
- `activities` — Calls, emails, meetings, notes (timeline on every record)
- `lead_scoring_rules` + `lead_score_history` — Configurable scoring engine

### Lead Lifecycle

```
Website form / Outbound / Bid platform
        ↓
    LEAD (unqualified)
        ↓  enrichment + verification (Apollo + Reoon)
    LEAD (enriched, scored)
        ↓  sales qualifies
    OPPORTUNITY (with value, stage, timeline)
        ↓  proposal sent
    ACCOUNT + CONTACT (won deal → client)
        ↓
    PROJECT (in KrewPact ops modules, later phase)
```

### API Endpoints

- `POST /api/leads` — New lead from website (public, rate-limited)
- `POST /api/leads/track` — Visitor behavior from PostHog webhook
- `GET /api/leads/:id/score` — Lead score (internal)
- `POST /api/leads/:id/enrich` — Trigger enrichment pipeline
- `POST /api/webhooks/posthog` — PostHog behavioral events

### Auth & RBAC

- Clerk handles auth (email + M365 SSO)
- CRM roles: `admin`, `sales_manager`, `sales_rep`, `viewer`
- Sales reps see own leads. Managers see all. Admins configure scoring.

### Outbound Prospecting

- Manual lead creation by sales team
- Bulk import from Apollo (CSV → import endpoint)
- Bid platforms (MERX, Bids & Tenders) — manual entry initially, automated feed later
- Outreach sequences: multi-step email/call cadences
- Templates: "New inbound follow-up", "Cold outreach GC", "Bid response"

---

## 4. Client Portal on Website (Weeks 6-8)

### Layer 1: Authenticated Portal (/portal)

**Access:** MDM creates account when deal won → client gets invite email → Clerk auth (client role) → sees only their data (Supabase RLS)

| Section       | Data Source                    | Description                                     |
| ------------- | ------------------------------ | ----------------------------------------------- |
| My Projects   | KrewPact API                   | Active projects, status, milestones, % complete |
| Documents     | KrewPact API + S3              | Contracts, change orders, permits, drawings     |
| Invoices      | KrewPact API (Sage data later) | Invoice history, amounts, payment status        |
| Messages      | KrewPact API                   | Thread-based PM communication                   |
| Photo Updates | KrewPact API + S3              | Site progress photos                            |

**Technical flow:**

```
mdm-website-v2 (/portal routes)
    → Clerk auth (client role)
    → fetch from KrewPact API
    → KrewPact checks JWT → Supabase RLS filters to client data
    → renders in website UI (branded, polished)
```

Portal lives IN the website. Clients never see internal tools.

### Layer 2: Smart Personalization (anonymous + known visitors)

**Known visitors (cookie-linked to CRM):**

- Contact form pre-fills name/email
- Gallery highlights project types matching their inquiry
- CTA changes: "Get a Quote" → "Check on Your Project" for active clients

**Anonymous visitors:**

- Standard marketing experience
- PostHog tracks behavior → feeds lead scoring

### Privacy

- Cookie consent (PIPEDA) — tracking starts after consent
- No PII in cookies — hashed visitor ID maps server-side
- Portal data only after Clerk authentication

---

## 5. Analytics & Decision Dashboards (Weeks 9-11)

### Data Sources

| Data                  | Source                  | Method                              |
| --------------------- | ----------------------- | ----------------------------------- |
| Revenue by division   | Sage 50 exports         | CSV import (manual → ERPNext later) |
| Project profitability | Sage Construction Mgmt  | CSV import                          |
| Lead pipeline         | KrewPact CRM (Supabase) | Direct query                        |
| Website traffic       | PostHog                 | PostHog API                         |
| Conversion rates      | KrewPact CRM            | Calculated                          |
| Win rates             | KrewPact CRM            | Calculated                          |

### Three Dashboards

**Executive Overview** (Ehab, David, Nervine):

- Revenue trend (monthly, by division)
- Active pipeline value
- Win rate (30/60/90 days)
- Top 5 opportunities
- Projects in progress + total contract value
- Cash position (Sage export)

**Marketing & Sales Funnel** (Sales team + Michael):

- Full funnel: visitors → forms → leads → qualified → opps → won
- Lead source breakdown
- Cost per lead by source
- Lead score distribution
- Outreach performance (open/reply rates)
- Top website pages (PostHog)
- Speed-to-lead metric

**Operations** (David + PMs):

- Active projects by stage
- Budget vs actuals (Sage exports)
- Timeline adherence
- Subcontractor utilization
- Outstanding invoices / AR aging

### Technical

- Built as KrewPact pages (`/dashboard/executive`, `/dashboard/marketing`, `/dashboard/operations`)
- RBAC: executives see all, sales sees marketing, PMs see operations
- Charts: Recharts
- Sage data: CSV import admin page with column parser
- Replaces MDM-Book static dashboard (hardcoded data.json → live data)

---

## 6. Phased Roadmap

### Phase 0: Clean House (NOW — 1 week)

- Archive `mdm-contracting-hub`
- Reframe JobTread as feature floor benchmark across all docs
- Update glossary, company.md, CLAUDE.md
- Consolidate planning pack (7 overlaps)
- Complete OneDrive/SMB extractions
- Present reorganization plan to management
- **Gate:** Management sign-off

### Phase 1: Website Live + Lead Capture (Weeks 1-2)

- Production deploy mdm-website-v2
- PostHog integration + cookie consent
- Contact form upgrade (new fields, enrichment hooks)
- Speed-to-lead (Teams alerts, auto-reply)
- Passive lead scoring in PostHog
- **Gate:** Website live, forms working, Teams alerts firing

### Phase 2: KrewPact CRM (Weeks 3-5)

- KrewPact foundation (Clerk, Supabase schema, RBAC, CI/CD)
- CRM API endpoints + lead management UI
- Website → CRM connection (form POST, PostHog webhook)
- Enrichment pipeline (Apollo + Reoon via n8n)
- Opportunities + pipeline board
- Outreach sequences
- **Gate:** Sales team using CRM daily, website leads flowing automatically

### Phase 3: Client Portal + Personalization (Weeks 6-8)

- Client auth + portal shell on website
- Documents + invoices views
- Messages + photo updates
- Website personalization (cookie-based)
- Onboard 2-3 pilot clients
- **Gate:** 3+ clients using portal, personalization live

### Phase 4: Analytics Dashboards (Weeks 9-11)

- Executive dashboard + Sage CSV import tool
- Marketing funnel dashboard
- Operations dashboard
- Reporting + export (PDF/CSV, weekly email digest)
- **Gate:** Leadership using dashboards for weekly decisions

### Phase 5: Full Operations (Weeks 12-16)

- Estimating module
- Project management
- Field execution (daily logs, time tracking, docs)
- ERPNext integration (financial sync)
- Bid platform monitoring (MERX, Bids & Tenders)

### Phase 6: Scale (Weeks 17+)

- BoldSign e-signatures
- Instantly.ai campaigns
- AI-powered lead scoring
- RAG/knowledge layer (pgvector)
- Trade partner portal
- Full ERPNext migration (Sage retirement)
- ADP payroll
- Offline mode

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     MDM GROUP ECOSYSTEM                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              KREWPACT (Operations Nucleus)                │  │
│  │  CRM · Estimating · Projects · Analytics · Portals · API │  │
│  │  Next.js + Supabase + Clerk + ERPNext                    │  │
│  └─────────────┬──────────────────────┬─────────────────────┘  │
│                │                      │                         │
│    ┌───────────▼──────────┐  ┌───────▼──────────────┐         │
│    │ mdm-website-v2       │  │ MDM-Book-Internal    │         │
│    │ Public site + portal │  │ Intelligence + SOPs  │         │
│    │ Lead capture         │  │ Dashboards           │         │
│    │ Payload CMS + Neon   │  │ Markdown + HTML      │         │
│    └──────────────────────┘  └──────────────────────┘         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    INTEGRATIONS                           │  │
│  │  PostHog · Apollo · Reoon · Resend · Teams · n8n         │  │
│  │  Clerk · Supabase · ERPNext · Vercel · Cloudflare        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Legacy (migrating out): Sage 50 + Sage Construction Mgmt     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Decisions

1. **Website-first** — Fastest path to revenue. Website is 95% done.
2. **KrewPact API as integration layer** — Website talks to KrewPact API, not directly to Supabase.
3. **Free tier stack** — PostHog, Apollo, Reoon, Resend all on free tiers ($0-12/mo total).
4. **Sage CSV bridge** — Manual import until ERPNext is live. No direct Sage API (not possible with Sage 50).
5. **Client portal on website** — Branded experience at mdmcontracting.ca, not separate app.
6. **Cookie-based personalization** — No PII in cookies, server-side mapping to CRM records.
7. **JobTread benchmarked** — Serves as feature floor for KrewPact feature parity. Sage 50 + Sage Construction Management are current systems.
