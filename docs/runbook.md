# Runbook (Deploy / Rollback / Troubleshooting)

## Deploy (Vercel)
- Push to `main` → Vercel builds and deploys
- Verify build passes in CI before merge

## Rollback
- Use Vercel dashboard to roll back to the previous successful deploy
- Confirm critical flows (login, dashboard load, core forms)

## Troubleshooting
- CI failing: check lint/typecheck/tests output
- E2E failing: validate placeholder envs in CI config
- Runtime errors: check logs in Vercel + add Sentry traces

## Data Safety
- Never test with production data
- Use dev Supabase + Clerk test keys
