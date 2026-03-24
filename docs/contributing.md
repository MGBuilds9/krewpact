# Contributing to KrewPact

## Workflow

1. Branch from `main` — use conventional branch names: `feat/`, `fix/`, `refactor/`, `docs/`
2. Make changes — follow CLAUDE.md conventions
3. Run quality checks locally before pushing:
   ```bash
   npm run lint && npm run typecheck && npm run test && npm run build
   ```
4. Create a PR — CI must pass before merge
5. Keep PRs small and focused — one feature or fix per PR

## Commit Messages

Use conventional commits:

- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code restructuring (no behavior change)
- `test:` — adding or updating tests
- `docs:` — documentation only
- `chore:` — tooling, deps, CI

## Testing

- All new code needs tests in `__tests__/` mirroring source structure
- Run `npm run test` before pushing
- RLS policy changes need dedicated RLS tests in `__tests__/rls/`
- Mock helpers: `__tests__/helpers/` (mockSupabaseClient, mockClerkAuth)

## Code Quality

See CLAUDE.md for full rules. Key points:

- No `console.log` — use `lib/logger.ts`
- No `any` type — use `unknown` with type guards
- File size limits enforced by ESLint (300 lines max)
- Import order enforced by simple-import-sort

## Local Setup

See `docs/local-dev.md` for environment setup instructions.
