# Operations Runbook

## Deployment

KrewPact deploys automatically via Vercel on push to `main`.

| Item | Value |
|------|-------|
| **Vercel Project** | `prj_zoqw9AOSqaUcuKfgzpBFWcIbvRiX` (team: MKG Builds) |
| **Production URLs** | `krewpact.vercel.app`, `hub.mdmgroupinc.ca` |
| **Region** | `iad1` (US East) |
| **Framework** | Next.js 15 (App Router) |

### Deploy Process

1. Push to `main` (or merge a PR)
2. Vercel auto-builds and deploys
3. Preview deployments are created for every PR branch

### Manual Redeploy

Via Vercel Dashboard → Deployments → select a deployment → Redeploy.

Or via CLI:
```bash
vercel --prod
```

## Rollback

1. Go to [Vercel Dashboard](https://vercel.com) → KrewPact project → Deployments
2. Find the last known-good deployment
3. Click the three-dot menu → **Promote to Production**

This is instant — no rebuild required. The previous deployment is served immediately.

## Health Check

```bash
curl https://hub.mdmgroupinc.ca/api/health
# Expected: { "status": "ok", "checks": { "supabase": "ok" } }
```

The health endpoint verifies:
- App is running
- Supabase connection is functional

## Monitoring

| Service | What it covers | Access |
|---------|---------------|--------|
| **Vercel Analytics** | Web vitals, traffic, function execution | Vercel Dashboard |
| **Vercel Logs** | Serverless function logs, errors | Vercel Dashboard → Logs |
| **Sentry** | Error tracking, stack traces (when configured) | sentry.io |
| **BetterStack** | Uptime monitoring | betterstack.com |
| **Supabase Dashboard** | Database metrics, RLS policy hits, storage | supabase.com/dashboard |

## Cron Jobs

Configured in `vercel.json`. All cron endpoints require `CRON_SECRET` for authentication.

| Job | Schedule | Endpoint |
|-----|----------|----------|
| Apollo lead pump | Mon 6:00 AM UTC | `/api/cron/apollo-pump` |
| Lead enrichment | Mon/Thu 7:00 AM UTC | `/api/cron/enrichment` |
| Lead scoring | Every 4 hours | `/api/cron/scoring` |
| Sequence processor | Every 15 minutes | `/api/cron/sequence-processor` |
| SLA alerts | Weekdays 8:00 AM UTC | `/api/cron/sla-alerts` |
| Portal reminders | Weekdays 9:00 AM UTC | `/api/cron/portal-reminders` |
| Daily summary | Weekdays 6:00 PM UTC | `/api/cron/summarize` |
| ERP sync | Every 30 minutes | `/api/cron/erp-sync` |

### Testing a Cron Job Locally

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/scoring
```

## Seed Data

```bash
# Seed MDM organization
npx tsx scripts/seed-org.ts --file supabase/seed/seed-org-mdm.json

# Seed demo data (contacts, leads, projects)
npx tsx scripts/seed-demo.ts

# Seed test users with Clerk metadata
npx tsx scripts/seed-test-users.ts

# Seed real production data
npx tsx scripts/seed-real-data.ts
```

All seed scripts require `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS).

## Environment Strategy

| Environment | Purpose | URL | Branch |
|-------------|---------|-----|--------|
| **Production** | Live app | `hub.mdmgroupinc.ca` | `main` |
| **Preview** | PR review | `*.vercel.app` (per-PR) | PR branches |
| **Local** | Development | `localhost:3000` | any |
| **Demo** | UI dev (no services) | `localhost:3000` | any (`NEXT_PUBLIC_DEMO_MODE=true`) |

Vercel env vars are configured per-environment (Production / Preview / Development) in the Vercel Dashboard.

## Troubleshooting

### Build fails: "demo mode" guard

**Symptom:** Build succeeds locally but fails on Vercel.
**Cause:** `NEXT_PUBLIC_DEMO_MODE=true` was set in Vercel env vars.
**Fix:** Remove `NEXT_PUBLIC_DEMO_MODE` from Vercel environment variables or set to `false`.

### Empty data after deploy

**Symptom:** Dashboard shows all zeros, tables are empty.
**Cause:** RLS is blocking queries — Clerk JWT claims aren't matching.
**Fix:** Verify the Clerk JWT template is named `comet` (not `supabase`). Check the user has `krewpact_user_id` set in their Clerk public metadata.

### Middleware domain error

**Symptom:** `authorizedParties` error in logs.
**Cause:** Request came from a domain not in the allowed list.
**Fix:** Add the domain to `authorizedParties` in `middleware.ts`. The Vercel default domain (`VERCEL_URL`) is already included.

### Supabase connection errors from serverless

**Symptom:** "too many connections" or connection timeouts.
**Cause:** Serverless functions opening direct connections instead of using the pooler.
**Fix:** Use the Supabase pooler URL (port 6543, transaction mode), not the direct connection (port 5432).

### Clerk JWT template mismatch

**Symptom:** `getToken({ template: 'comet' })` returns null.
**Cause:** JWT template doesn't exist or has a different name in Clerk dashboard.
**Fix:** In Clerk Dashboard → JWT Templates, ensure a template named `comet` exists with the correct claims (`krewpact_user_id`, `krewpact_divisions`, `krewpact_roles`).

### CRLF line ending issues

**Symptom:** Git shows every file as modified after checkout.
**Cause:** Windows line endings (CRLF) vs Unix (LF).
**Fix:** `git config core.autocrlf input` and re-checkout.
