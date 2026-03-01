# KrewPact — Complete Access & Development Workflow Plan

> Everything Claude (and the app) needs to connect ERPNext, Supabase, M365, and Next.js into one ecosystem.

---

## 1. Complete `.env.local` — Every Credential the App Needs

```env
# ───────────────────────────────────────
# ERPNEXT (Self-hosted on Proxmox)
# ───────────────────────────────────────
ERPNEXT_BASE_URL=https://erp.mdmgroupinc.ca
ERPNEXT_API_KEY=<from ERPNext API user>
ERPNEXT_API_SECRET=<from ERPNext API user>
# Optional: OAuth for user-initiated ERP actions
# ERPNEXT_OAUTH_CLIENT_ID=
# ERPNEXT_OAUTH_CLIENT_SECRET=

# ───────────────────────────────────────
# SUPABASE (PostgreSQL + RLS + Realtime)
# ───────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>         # Server-side only, NEVER expose to client
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres  # For migrations

# ───────────────────────────────────────
# CLERK (Authentication)
# ───────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...                       # For Clerk → KrewPact webhook events

# ───────────────────────────────────────
# MICROSOFT 365 / AZURE AD (Graph API)
# ───────────────────────────────────────
AZURE_TENANT_ID=<MDM Group tenant ID>
AZURE_CLIENT_ID=<App Registration client ID>
AZURE_CLIENT_SECRET=<App Registration client secret>
AZURE_REDIRECT_URI=https://app.krewpact.com/api/auth/azure/callback
# Scopes needed (configured in Azure, not env):
#   Delegated: Mail.Send, Mail.Read, Calendars.ReadWrite, Files.ReadWrite
#   Application: Sites.ReadWrite.All, Directory.ReadWrite.All, User.ReadWrite.All

# ───────────────────────────────────────
# BOLDSIGN (E-Signing)
# ───────────────────────────────────────
BOLDSIGN_API_KEY=<api-key>
BOLDSIGN_WEBHOOK_SECRET=<webhook-signing-secret>
BOLDSIGN_BASE_URL=https://api.boldsign.com

# ───────────────────────────────────────
# ANTHROPIC (In-app AI / ERP Architect)
# ───────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ───────────────────────────────────────
# REDIS (BullMQ Job Queue + Caching)
# ───────────────────────────────────────
REDIS_URL=redis://:<password>@<proxmox-tailscale-ip>:6379/0

# ───────────────────────────────────────
# ADP WORKFORCE NOW (Payroll — Phase 3)
# ───────────────────────────────────────
# ADP_CLIENT_ID=
# ADP_CLIENT_SECRET=
# ADP_API_BASE=https://api.adp.com

# ───────────────────────────────────────
# APP CONFIG
# ───────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://app.krewpact.com
WEBHOOK_SIGNING_SECRET=<shared-secret-for-inbound-webhooks>
```

---

## 2. What You Need to Set Up (Per Service)

### 2.1 ERPNext — `erp.mdmgroupinc.ca` ✅ VM Running

| Task | Status | How |
|------|--------|-----|
| Fresh install accessible at `erp.mdmgroupinc.ca` | ✅ Done | Nginx reverse proxy |
| Create dedicated API user (e.g., `krewpact-service`) | ⬜ | ERPNext Admin → User → create with API access |
| Assign proper Role Profile to API user | ⬜ | Needs: System Manager or custom role with all doctype perms |
| Generate API Key + Secret for that user | ⬜ | User → API Access → Generate Keys (rotate the ones you pasted) |
| Set up Company + Chart of Accounts | ⬜ | Setup Wizard or manual — MDM Group divisions |
| Create 8 custom doctypes | ⬜ | ChangeOrder, CustomContract, SafetyAcknowledgment, InsuranceCertificate, SubcontractorAgreement, WBS, ComplianceRequirement, SiteLocation, SafetyIncident, License |
| Add 40+ custom fields to standard doctypes | ⬜ | All `krewpact_*` prefixed fields per Integration Contracts §2.4 |
| Configure webhooks (document events → KrewPact) | ⬜ | ERPNext Webhook DocType → point to KrewPact webhook endpoint |
| Enable CORS for KrewPact domain | ⬜ | `site_config.json` → `allow_cors: ["https://app.krewpact.com"]` |
| TLS via Nginx (Let's Encrypt) | ⬜ Verify | Certbot on Nginx Proxy Manager |

**ERPNext API user permission scope**: The service account needs read/write on all mapped doctypes. Create a custom Role Profile called `KrewPact Integration` with granular doctype-level perms.

### 2.2 Supabase — PostgreSQL + RLS + Realtime

| Task | Status | How |
|------|--------|-----|
| Create Supabase project (Canadian region if available) | ⬜ | dashboard.supabase.com → New Project |
| Run schema migration (28 enums, 19+ table groups) | ⬜ | From `KrewPact-Backend-SQL-Schema-Draft.sql` |
| Configure RLS policies per table | ⬜ | Per Security Framework doc |
| Set up Realtime channels (projects, notifications) | ⬜ | Supabase Realtime config |
| Create Edge Functions (webhook receivers, cron jobs) | ⬜ | For BullMQ bridge if not using Node.js BFF |
| Set up Storage buckets (documents, photos) | ⬜ | Project files, signed contracts, photos |
| Get project URL + keys | ⬜ | Settings → API → copy URL, anon key, service role key |

### 2.3 Microsoft 365 — Azure AD App Registration

| Task | Status | How |
|------|--------|-----|
| Register app in Azure AD | ⬜ | portal.azure.com → App Registrations → New |
| Set app name: `KrewPact` | ⬜ | |
| Configure redirect URI | ⬜ | `https://app.krewpact.com/api/auth/azure/callback` |
| Add API permissions (delegated + application) | ⬜ | See table below |
| Grant admin consent for MDM Group tenant | ⬜ | Requires Global Admin or Privileged Role Admin |
| Generate client secret | ⬜ | Certificates & Secrets → New client secret (24-month max) |
| Copy Tenant ID, Client ID, Client Secret | ⬜ | Overview page + Secrets page |

**Required Azure AD Permissions:**

| Permission | Type | What It Does |
|------------|------|-------------|
| `Mail.Send` | Delegated | Send emails as logged-in user (contract invites, notifications) |
| `Mail.Read` | Delegated | Read inbox (for reply tracking, thread context) |
| `Calendars.ReadWrite` | Delegated | Create/update meetings (kickoffs, reviews, safety meetings) |
| `Files.ReadWrite` | Delegated | Read/write user's OneDrive (project docs, contracts) |
| `Sites.ReadWrite.All` | Application | Read/write SharePoint sites (shared project docs) |
| `User.ReadWrite.All` | Application | Read/write user profiles (employee directory sync) |

**Admin consent**: You (as MDM M365 admin) grant consent once. After that, delegated permissions use OAuth code flow per user.

### 2.4 Clerk — Authentication

| Task | Status | How |
|------|--------|-----|
| Create Clerk application | ⬜ | dashboard.clerk.com → New Application |
| Configure sign-in methods (email, M365 SSO) | ⬜ | Enable Microsoft OAuth for MDM employees |
| Set up webhook endpoint | ⬜ | Webhooks → `https://app.krewpact.com/api/webhooks/clerk` |
| Copy publishable key + secret key | ⬜ | API Keys page |
| Configure custom claims (division, role) | ⬜ | JWT Templates → add `division_id`, `krewpact_role` |

### 2.5 Redis — Job Queue

| Task | Status | How |
|------|--------|-----|
| Deploy Redis on Proxmox (LXC or VM) | ⬜ | `apt install redis-server` or Docker |
| Configure AOF persistence | ⬜ | `redis.conf` → `appendonly yes` |
| Set password | ⬜ | `requirepass <strong-password>` |
| Expose via Tailscale only (no public) | ⬜ | Bind to Tailscale IP only |
| Test connectivity from Vercel (Edge needs Redis over TLS) | ⬜ | May need Upstash Redis if Vercel can't reach Proxmox Redis |

**✅ RESOLVED (Feb 2026):** Upstash Redis for BullMQ queue. Self-hosted Redis removed from required infrastructure. See `KrewPact-Architecture-Resolution.md` for full rationale.

### 2.6 BoldSign — E-Signing (Phase 2+)

| Task | Status | How |
|------|--------|-----|
| Create BoldSign account | ⬜ | boldsign.com → Sign up |
| Get API key | ⬜ | API Settings |
| Configure webhook endpoint | ⬜ | `https://app.krewpact.com/api/webhooks/boldsign` |
| Create signature templates (contracts, COs, safety) | ⬜ | Template builder |

---

## 3. Development Workflow — How Claude Builds This

### 3.1 Three Layers of Claude Access

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: CLAUDE CODE (Terminal Agent)               │
│  ─ Writes code in the Next.js repo                  │
│  ─ Runs tests, lints, commits                       │
│  ─ Has MCP access to:                               │
│    • Supabase (schema, migrations, queries)          │
│    • ERPNext (inspect doctypes, test API calls)      │
│    • Vercel (deploy, logs)                           │
│  ─ Reads CLAUDE.md for project context               │
├─────────────────────────────────────────────────────┤
│  Layer 2: COWORK (This Session)                      │
│  ─ Planning, architecture, docs                      │
│  ─ Reviews code, designs schemas                     │
│  ─ Generates migration files, test plans             │
│  ─ Accesses project knowledge (18 planning docs)     │
├─────────────────────────────────────────────────────┤
│  Layer 3: IN-APP AI (ERPChat in KrewPact UI)        │
│  ─ Runtime ERP configuration from within the app     │
│  ─ Users ask "set up Jobs module" → Claude calls     │
│    ERPNext API to create doctypes, fields, workflows  │
│  ─ Phase 2+ feature (after core app works)           │
└─────────────────────────────────────────────────────┘
```

### 3.2 Claude Code Setup (Primary Dev Tool)

In your Next.js repo root, create `CLAUDE.md`:

```markdown
# KrewPact — Claude Code Context

## Project
KrewPact is a construction operations platform (Next.js + Supabase + ERPNext).
Built for MDM Group. See /docs/ for full specs.

## Tech Stack
- Next.js 15 (App Router, TypeScript, Server Components)
- Supabase (PostgreSQL, RLS, Realtime, Storage)
- ERPNext (self-hosted at erp.mdmgroupinc.ca, Frappe REST API)
- Clerk (auth, M365 SSO)
- Microsoft Graph API (email, calendar, OneDrive)
- BullMQ + Redis (job queue)
- Tailwind CSS + shadcn/ui

## Conventions
- All server-side ERPNext calls go through `lib/erp/client.ts`
- All Supabase calls go through generated types from `supabase gen types`
- API routes in `app/api/` — BFF pattern (aggregate, transform, authorize)
- Environment variables: NEVER hardcode secrets
- File structure: feature-based (`app/(dashboard)/projects/`, `app/(dashboard)/crm/`)
- Error handling: All external calls wrapped in try/catch with structured error responses
- Testing: Vitest for unit, Playwright for E2E

## ERPNext API Pattern
- Auth: `Authorization: token {key}:{secret}` from env vars
- Base: `${ERPNEXT_BASE_URL}/api/resource/{DocType}`
- Always use `encodeURIComponent()` for document names
- Rate limit: 300 req/min (self-hosted, configurable)

## Key Files
- `lib/erp/client.ts` — ERPNext API client
- `lib/erp/sync.ts` — Bidirectional sync engine
- `lib/supabase/client.ts` — Supabase browser client
- `lib/supabase/server.ts` — Supabase server client
- `lib/microsoft/graph.ts` — Microsoft Graph API client
- `lib/queue/` — BullMQ job definitions

## Data Authority Rules
- ERPNext is authoritative for: GL, invoices, payments, inventory
- Supabase is authoritative for: workflows, field ops, portals, audit trails
- KrewPact ID (`krewpact_id`) links records across both systems
```

### 3.3 ERPNext MCP Server (For Claude Code)

Build a lightweight MCP server so Claude Code can directly inspect and configure ERPNext:

```
krewpact-repo/
├── mcp/
│   └── erpnext-server/
│       ├── index.ts          ← MCP server entry
│       ├── tools.ts          ← Tool definitions (list_docs, get_doc, get_meta, etc.)
│       └── package.json
```

Register in `.claude/mcp_servers.json`:
```json
{
  "erpnext": {
    "command": "npx",
    "args": ["tsx", "mcp/erpnext-server/index.ts"],
    "env": {
      "ERPNEXT_BASE_URL": "https://erp.mdmgroupinc.ca",
      "ERPNEXT_API_KEY": "${ERPNEXT_API_KEY}",
      "ERPNEXT_API_SECRET": "${ERPNEXT_API_SECRET}"
    }
  }
}
```

This gives Claude Code the ability to:
- `erp_get_meta("Sales Order")` — inspect any doctype schema
- `erp_list_docs("Customer", filters)` — see what data exists
- `erp_create_doc("Custom DocType", {...})` — create custom doctypes
- Test API calls before writing integration code

### 3.4 Recommended Build Sequence

```
Phase 0: Foundation (Week 1)
├── Init Next.js 15 project
├── Set up all env vars
├── Clerk auth (email + M365 SSO)
├── Supabase schema migration (core tables)
├── ERPNext API client + health check
├── ERPNext MCP server for Claude Code
└── Basic layout (sidebar, auth guard, dashboard shell)

Phase 1: CRM + Estimating (Weeks 2-4)
├── Accounts, Contacts, Leads CRUD
├── ERPNext sync: Customer, Contact, Opportunity
├── Estimate builder (line items, assemblies, cost catalog)
├── ERPNext sync: Quotation
└── Microsoft Graph: send estimate emails

Phase 2: Contracting + Projects (Weeks 5-8)
├── Proposal → Contract workflow
├── BoldSign e-signature integration
├── Project creation from signed contract
├── Task management, Gantt, milestones
├── ERPNext sync: Sales Order, Project, Task
├── Microsoft Graph: calendar events (kickoffs)
└── OneDrive: project document storage

Phase 3: Finance + Field Ops (Weeks 9-12)
├── Change orders, RFIs, submittals
├── Purchase orders, AP/AR invoices
├── ERPNext sync: financial documents
├── Time tracking + expense claims
├── Daily logs, safety forms
├── Portal for clients + trade partners
└── ADP payroll sync
```

---

## 4. Access Checklist — What to Do Right Now

### Immediate (Today)

- [ ] **Rotate ERPNext API keys** (you posted them in plain text)
- [ ] Create dedicated `krewpact-service` API user in ERPNext
- [ ] Confirm ERPNext is accessible via Tailscale from your dev machine
- [ ] Decide: Init Next.js project locally or in a GitHub repo?

### This Week

- [ ] Create Supabase project → get URL + keys
- [ ] Register Azure AD app for M365 → get tenant/client IDs
- [ ] Set up Clerk project → get keys + configure M365 SSO
- [ ] Init Next.js 15 project with TypeScript
- [ ] Create `.env.local` with all credentials
- [ ] Create `CLAUDE.md` in repo root
- [ ] Build ERPNext MCP server for Claude Code
- [ ] Run first Supabase migration (core tables from SQL schema)

### Before First Feature

- [ ] Verify ERPNext API connectivity from Next.js API route
- [ ] Verify Supabase RLS policies work with Clerk JWT
- [ ] Verify Microsoft Graph OAuth flow works (send test email)
- [ ] Set up Redis (Upstash or self-hosted)
- [ ] Deploy to Vercel (even if empty) to validate env vars

---

## 5. Architecture Decision — RESOLVED

> **✅ RESOLVED (Feb 2026):** Hybrid with Cloudflare Tunnel. See `KrewPact-Architecture-Resolution.md`.

**Locked architecture:**
- **Vercel** handles all user-facing API routes (Next.js API routes = BFF)
- **Cloudflare Tunnel** exposes ERPNext to Vercel without public IP (`erp-api.krewpact.com` → ERPNext localhost)
- **ERPNext host** runs BullMQ workers co-located with ERPNext (direct access, no tunnel needed for workers)
- **Upstash Redis** for BullMQ queue (reachable from both Vercel and ERPNext host)
- **Supabase managed cloud** (accessible from everywhere)

**Connectivity diagram:**
```
User → Vercel (app + API routes) → Cloudflare Tunnel → ERPNext
                                  → Supabase Cloud (direct HTTPS)
                                  → Upstash Redis (enqueue jobs)

ERPNext Host → BullMQ Workers → Upstash Redis (dequeue jobs)
                               → ERPNext (localhost, direct)
                               → Supabase Cloud (direct HTTPS)
```

**ERPNext is NOT hardcoded to Proxmox.** Any Linux machine running ERPNext + `cloudflared` works. The `ERPNEXT_BASE_URL` env var is configurable per deployment.
