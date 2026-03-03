# Contributing to KrewPact

## Quick Start

```bash
# 1. Clone
git clone git@github.com:MGBuilds9/krewpact.git
cd krewpact

# 2. Use correct Node version
nvm use    # reads .nvmrc → Node 20

# 3. Install dependencies
npm ci

# 4. Set up environment
cp .env.example .env.local
# Fill in required values (see .env.example for docs)

# 5. Run dev server
npm run dev
```

## Branch Naming

```
feat/<domain>/<description>    # New feature
fix/<domain>/<description>     # Bug fix
chore/<description>            # Maintenance
```

Domains: `crm`, `projects`, `estimates`, `finance`, `portals`, `admin`, `documents`, `reports`, `shared`

Examples:

- `feat/crm/lead-scoring-v2`
- `fix/estimates/cost-catalog-rounding`
- `chore/update-dependencies`

## Workflow

1. Create a branch from `main` using the naming convention above
2. Make your changes within your assigned domain
3. Run the quality gate before pushing:
   ```bash
   npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
   ```
4. Push and create a PR
5. CI runs automatically — all checks must pass
6. Get a review, then squash-merge to `main`

## Code Standards

- **TypeScript strict** — no `any` types. Use proper types or `unknown`.
- **Prettier** formatting enforced via pre-commit hook (Husky + lint-staged)
- **ESLint** with Next.js rules + TypeScript strict checks
- **Zod** for all input validation (shared between client forms and API routes)
- **Tests** required for new API routes and business logic

## Domain Ownership

See [docs/domains.md](docs/domains.md) for the full ownership map.

Each developer works within their assigned domain. **Shared/Core changes require PR review from the project lead.**

Cross-domain features are coordinated via API contracts, not direct imports between domains.

## Security Checklist

Before submitting a PR, verify:

1. **Auth checks** — Every new API route starts with `auth()` verification
2. **Input validation** — All mutating endpoints use Zod schemas
3. **No sensitive logs** — No `console.log` with tokens, passwords, or PII
4. **Error handling** — No raw database errors or stack traces exposed to clients
5. **CORS** — Not widened beyond what's needed
6. **Webhooks** — Signatures verified (Clerk uses `svix`, BoldSign uses HMAC)
7. **RLS** — New Supabase tables have deny-by-default RLS policies with tests
8. **Storage** — Supabase Storage buckets use RLS policies
9. **Dependencies** — No known high/critical vulnerabilities (`npm audit`)
10. **Env vars** — No hardcoded secrets; all secrets in `.env.local`

See [docs/security.md](docs/security.md) for full details.

## Commit Messages

Use conventional commits:

```
feat(crm): add lead scoring v2
fix(estimates): correct rounding in cost catalog
chore: update dependencies
```

## Environment Variables

See `.env.example` for all required variables with documentation. Key services:

- **Supabase** — Database and storage
- **Clerk** — Authentication
- **ERPNext** — ERP integration (via Cloudflare Tunnel)
- **Upstash** — Redis queue

For demo mode (no external services needed): set `NEXT_PUBLIC_DEMO_MODE=true`

## Testing

```bash
npm run test          # Unit tests (Vitest)
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run test:e2e      # E2E tests (Playwright)
```

Tests live in `__tests__/` directories mirroring the source structure.
