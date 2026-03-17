# Local Development Setup

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm** (comes with Node)
- **Git**

## Quick Start

```bash
git clone git@github.com:mkgbuilds/krewpact.git
cd krewpact
npm ci
cp .env.example .env.local
# Fill in keys (see below)
npm run dev
```

App runs at `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values. The example file documents where to get each key.

### Required Services (5 for full operation)

| Service      | Dashboard                                                                    | What to grab                                                                                      |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Supabase** | [Dashboard](https://supabase.com/dashboard) → Project `wmeaabrchkysogmeroye` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`          |
| **Clerk**    | [Dashboard](https://dashboard.clerk.com) → KrewPact app                      | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. Domain: `mdmgroupinc.ca`                 |
| **ERPNext**  | Via Cloudflare Tunnel at `erp-api.mdmgroupinc.ca`                            | `ERPNEXT_BASE_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`                                       |
| **Upstash**  | [Console](https://console.upstash.com) → QStash + Redis                      | QStash: `QSTASH_URL`, `QSTASH_TOKEN`. Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| **Resend**   | [Dashboard](https://resend.com/api-keys)                                     | `RESEND_API_KEY`                                                                                  |

### Clerk JWT Template

Clerk is configured with a JWT template named **`comet`** (not `supabase`). This template includes custom claims that drive Supabase RLS:

- `krewpact_user_id` — maps to Supabase user records
- `krewpact_divisions` — JSONB array for division filtering
- `krewpact_roles` — role keys for RBAC

If the JWT template name doesn't match, you'll get empty results from Supabase (RLS blocks everything).

## Database

### Row-Level Security (RLS)

All tables have RLS enabled. Policies use JWT claims from Clerk (not `auth.uid()`):

```sql
auth.jwt() ->> 'krewpact_user_id'    -- user identity
auth.jwt() -> 'krewpact_divisions'   -- division access (JSONB array)
```

**Service role key** bypasses RLS entirely — used only server-side for admin operations, migrations, and seed scripts. Never expose to the client.

**Anon key** respects RLS — used for client-side Supabase calls where the Clerk JWT provides the auth context.

### Seed Data

```bash
# Seed the MDM organization
npx tsx scripts/seed-org.ts --file supabase/seed/seed-org-mdm.json

# Seed test users
npx tsx scripts/seed-test-users.ts
```

## Running Tests

```bash
# Unit tests (Vitest + jsdom)
npm run test

# Watch mode
npm run test -- --watch

# Single file
npm run test -- src/path/to/file.test.ts

# E2E tests (Playwright — requires running dev server)
npm run test:e2e
```

### Test Conventions

- Tests live in `__tests__/` directories alongside source code
- Mock helpers in `__tests__/helpers/`: `mockSupabaseClient`, `mockClerkAuth`, `mockClerkUnauth`
- `vi.mock()` calls must come BEFORE imports
- Dynamic route context: `{ params: Promise.resolve({ id }) }` (Next.js 15 pattern)

## Code Quality

```bash
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run build        # Production build
```

CI runs: Lint → Type Check → Unit Test → Build → Integration Test.

## Common Issues

| Issue                           | Cause                                      | Fix                                                                                                       |
| ------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Empty data from Supabase        | RLS blocking — JWT claims missing or wrong | Check Clerk JWT template is named `comet`, verify user has `krewpact_user_id` in public metadata          |
| CRLF warnings in git            | Windows-origin files                       | `git config core.autocrlf input`                                                                          |
| Type errors after schema change | Stale generated types                      | Run `npx supabase gen types typescript --project-id wmeaabrchkysogmeroye > types/supabase.ts 2>/dev/null` |
| Rate limit errors in tests      | Rate limit mock missing                    | Add `vi.mock('@/lib/api/rate-limit', ...)` — see test helpers                                             |

## Project Structure

```
app/                  # Next.js App Router pages + API routes
  (auth)/             # Login, signup
  (dashboard)/        # Authenticated routes (CRM, projects, estimates, settings)
  api/                # BFF API routes, webhooks, cron jobs
components/           # React components
  ui/                 # shadcn/ui primitives
  layout/             # App shell (sidebar, header)
lib/                  # Shared libraries
  erp/client.ts       # ERPNext API client
  supabase/           # Supabase client (browser + server)
  validators/         # Shared Zod schemas
types/                # TypeScript type definitions
  supabase.ts         # Generated Supabase types
scripts/              # Seed scripts, utilities
docs/                 # Architecture docs, runbook, planning
supabase/             # Migrations, seed data
```
