# KrewPact

> Unified operations hub for construction lifecycle management.
> Built by MDM Group Inc., Mississauga, Ontario, Canada.

**Domain:** [krewpact.com](https://app.krewpact.com) · **Stack:** Next.js 15 · Supabase · Clerk · ERPNext · Vercel

---

## Quickstart

```bash
npm ci
cp .env.example .env.local   # Fill in keys — see docs/local-dev.md
npm run dev                   # http://localhost:3000
```

Full setup guide: [docs/local-dev.md](docs/local-dev.md)

---

## Tech Stack

| Layer      | Technology                                    | Purpose                           |
| ---------- | --------------------------------------------- | --------------------------------- |
| Frontend   | Next.js 15 (App Router, TypeScript, React 19) | SSR, API routes, edge middleware  |
| UI         | Tailwind CSS + shadcn/ui (Radix)              | WCAG AA accessible components     |
| Database   | Supabase PostgreSQL                           | RLS, Realtime, Storage, pgvector  |
| Auth       | Clerk → Supabase JWT bridge                   | SSO, RBAC, division-scoped access |
| ERP        | ERPNext (via Cloudflare Tunnel)               | Accounting, inventory, invoicing  |
| Hosting    | Vercel (frontend) + self-hosted (ERPNext)     | Auto-deploy from main branch      |
| Monitoring | Sentry + Vercel Analytics + BetterStack       | Errors, performance, uptime       |

---

## Project Structure

```
app/
├── (dashboard)/org/[orgSlug]/     # Authenticated routes
│   ├── crm/                       # Leads, contacts, accounts, pipeline
│   ├── estimates/                  # Estimate builder, templates
│   ├── contracts/                  # Contracts, e-sign
│   ├── projects/                   # Projects, milestones, tasks
│   ├── finance/                    # Expenses, invoices
│   ├── admin/                      # Audit log, sync, governance
│   └── settings/                   # Profile, team, notifications
├── (portal)/                       # Client + trade partner portals
├── api/                            # 43+ BFF API route groups
├── auth/                           # Login page
└── layout.tsx                      # Root layout (Clerk + React Query)

components/                         # 24 feature dirs + shadcn/ui
contexts/                           # Division, Impersonation providers
hooks/                              # Custom React hooks
lib/                                # Shared utilities
├── erp/                            # ERPNext API client
├── supabase/                       # Supabase client (browser + server)
├── validators/                     # Shared Zod schemas
└── ...
supabase/migrations/                # 37 SQL migrations
types/                              # Shared TypeScript types
__tests__/                          # Vitest unit tests (127+ files)
docs/                               # Architecture, runbook, local dev
└── architecture/                   # 22 planning & strategy documents
```

---

## Commands

```bash
npm run dev          # Local dev server
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
npm run format       # Prettier
npm run seed:demo    # Seed demo data
npm run seed:real    # Seed real MDM data
```

---

## Feature Domains

| Domain      | Path          | Status                                                       |
| ----------- | ------------- | ------------------------------------------------------------ |
| CRM         | `/crm/`       | ✅ Complete — leads, pipeline, scoring, sequences, analytics |
| Estimating  | `/estimates/` | ✅ Complete — builder, templates, assemblies, cost codes     |
| Contracting | `/contracts/` | ✅ Complete — creation, detail, e-sign                       |
| Projects    | `/projects/`  | ✅ Complete — lifecycle, milestones, tasks, daily logs       |
| Finance     | `/finance/`   | ✅ Partial — expenses, dashboard, ERPNext invoice snapshots  |
| Portals     | `(portal)/`   | ✅ Complete — client + trade partner                         |
| Admin       | `/admin/`     | ✅ Complete — audit, sync, governance, privacy, BCP          |
| Search      | Cmd+K         | ✅ Complete — global search across 7 entities                |

See [docs/domains.md](docs/domains.md) for branch naming and domain ownership.

---

## Architecture & Planning

Deep-dive planning documents live in `docs/architecture/` (~22 docs). Key reads:

1. **[KrewPact-Strategy-Brief.md](KrewPact-Strategy-Brief.md)** — Start here. Full strategy overview.
2. `docs/architecture/KrewPact-Master-Plan.md` — Locked decisions
3. `docs/architecture/KrewPact-Technology-Stack-ADRs.md` — 25 ADRs
4. `docs/architecture/KrewPact-Feature-Function-PRD-Checklist.md` — 16 epics, 70+ features

---

## Environment Variables

Five services required for local development:

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Clerk:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **ERPNext:** `ERPNEXT_BASE_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`
- **Upstash:** `QSTASH_URL`, `QSTASH_TOKEN`
- **App:** `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`

Full template with all vars: [.env.example](.env.example)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/domains.md](docs/domains.md) for branch naming, PR process, and domain ownership rules.

---

## License

Proprietary — MDM Group Inc. ERPNext integration maintains strict GPL v3 API boundary.
