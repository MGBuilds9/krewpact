# CLAUDE.md

## Project Overview

KrewPact is a construction operations platform for MDM Group Inc. (Mississauga, Ontario). Hybrid ERPNext-first architecture: ERPNext is finance/procurement/inventory source-of-truth; KrewPact is UX shell, field operations, portals, orchestration, identity, and reporting.

**Domain:** krewpact.com

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Server Components) on Vercel
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Forms:** React Hook Form + Zod (shared client/server validation)
- **Database:** Supabase PostgreSQL (RLS, Realtime, Storage)
- **ERP:** ERPNext (GPL v3, Cloudflare Tunnel)
- **Auth:** Clerk (email + M365 SSO, custom JWT → Supabase RLS)
- **Queue:** BullMQ + Upstash Redis
- **Testing:** Vitest + Playwright + @axe-core/playwright
- **CI:** GitHub Actions

## Build Commands

```bash
npm run dev          # Local dev server
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E
npm run format       # Prettier format all
npm run format:check # Prettier check (CI)
```

## File Structure

```
app/
├── (auth)/                    # Login, signup
├── (dashboard)/org/[orgSlug]/ # Org-scoped dashboard (path-based multi-tenant)
│   ├── crm/                   # CRM: leads, contacts, accounts, opportunities
│   ├── projects/              # Projects, milestones, daily logs
│   ├── contracts/             # Proposals, e-sign, change orders
│   ├── estimates/             # Estimate builder, cost catalog
│   ├── finance/               # Invoices, POs, job costs
│   ├── expenses/              # Expense claims
│   ├── timesheets/            # Timesheet management
│   ├── portals/               # Client & trade partner portals
│   ├── documents/             # Document management
│   ├── reports/               # Reporting & analytics
│   ├── admin/                 # RBAC, org settings
│   ├── team/                  # Team management
│   ├── notifications/         # Notification center
│   ├── schedule/              # Project scheduling
│   ├── settings/              # User settings
│   └── dashboard/             # Main dashboard
├── api/                       # BFF API routes (see app/api/CLAUDE.md)
lib/                           # Shared libs (see lib/CLAUDE.md)
components/                    # UI components (shadcn/ui + custom)
hooks/                         # React hooks (1 per domain)
contexts/                      # React contexts (Org, Division, Theme)
types/                         # Shared TypeScript types
```

## Key Conventions

- All ERPNext calls go through `lib/erp/client.ts` — never call ERPNext directly
- All Supabase calls use generated types from `supabase gen types`
- API routes: BFF pattern — aggregate, transform, authorize
- RLS: deny-by-default, JWT claims drive policies
- Forms: React Hook Form + Zod. Schemas shared between client and API.
- DB from Vercel: use Supabase pooler (port 6543), NOT direct (port 5432)
- Environment variables: never hardcode secrets; see `.env.example`
- TypeScript strict: no `any` types

## Domain Ownership

See [docs/domains.md](docs/domains.md) for the full ownership map and boundaries.

| Domain      | Path                                                                    | Independent?          |
| ----------- | ----------------------------------------------------------------------- | --------------------- |
| CRM         | `crm/`, `api/crm/`                                                      | Yes                   |
| Projects    | `projects/`, `contracts/`, `schedule/`, `api/projects/`, `api/tasks/`   | Yes                   |
| Estimates   | `estimates/`, `api/estimates/`, `api/cost-catalog/`                     | Yes                   |
| Finance     | `finance/`, `expenses/`, `timesheets/`, `api/finance/`, `api/expenses/` | Yes                   |
| Portals     | `portals/`, `api/portal/`, `api/portals/`                               | Yes                   |
| Admin       | `admin/`, `settings/`, `team/`, `api/rbac/`, `api/settings/`            | Yes                   |
| Documents   | `documents/`, `api/compliance/`, `api/governance/`                      | Yes                   |
| Reports     | `reports/`, `api/reports/`, `api/dashboard/`                            | Yes                   |
| Shared/Core | `lib/`, `components/`, `hooks/`, `contexts/`                            | Requires coordination |

## Deep Dives

- [Architecture & ERP integration](docs/architecture-overview.md)
- [Security best practices](docs/security.md)
- [Domain ownership & boundaries](docs/domains.md)
- [Session history](docs/session-log.md)
