# Operations Runbook

## Deployment

KrewPact deploys automatically via Vercel on push to `main`.

| Item                | Value                                                 |
| ------------------- | ----------------------------------------------------- |
| **Vercel Project**  | `prj_zoqw9AOSqaUcuKfgzpBFWcIbvRiX` (team: MKG Builds) |
| **Production URLs** | `krewpact.vercel.app`, `krewpact.ca`                  |
| **Region**          | `iad1` (US East)                                      |
| **Framework**       | Next.js 16 (App Router)                               |

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
curl https://krewpact.ca/api/health
# Expected: { "status": "ok", "checks": { "supabase": "ok" } }
```

The health endpoint verifies:

- App is running
- Supabase connection is functional

## Monitoring

| Service                | What it covers                                 | Access                  |
| ---------------------- | ---------------------------------------------- | ----------------------- |
| **Vercel Analytics**   | Web vitals, traffic, function execution        | Vercel Dashboard        |
| **Vercel Logs**        | Serverless function logs, errors               | Vercel Dashboard → Logs |
| **Sentry**             | Error tracking, stack traces (when configured) | sentry.io               |
| **BetterStack**        | Uptime monitoring                              | betterstack.com         |
| **Supabase Dashboard** | Database metrics, RLS policy hits, storage     | supabase.com/dashboard  |

## Cron Jobs

Configured in `vercel.json`. All cron endpoints require `CRON_SECRET` for authentication.

| Job                 | Schedule             | Endpoint                       |
| ------------------- | -------------------- | ------------------------------ |
| Smoke test          | Every 15 minutes     | `/api/cron/smoke-test`         |
| Apollo lead pump    | Mon 6:00 AM UTC      | `/api/cron/apollo-pump`        |
| Lead enrichment     | Mon/Thu 7:00 AM UTC  | `/api/cron/enrichment`         |
| Lead scoring        | Every 4 hours        | `/api/cron/scoring`            |
| Sequence processor  | Every 15 minutes     | `/api/cron/sequence-processor` |
| Follow-up reminders | Weekdays 9:00 AM UTC | `/api/cron/followup-reminders` |
| SLA alerts          | Weekdays 8:00 AM UTC | `/api/cron/sla-alerts`         |
| Portal reminders    | Weekdays 9:00 AM UTC | `/api/cron/portal-reminders`   |
| Daily summary       | Weekdays 6:00 PM UTC | `/api/cron/summarize`          |
| ERP sync            | Every 30 minutes     | `/api/cron/erp-sync`           |
| ICP refresh         | Mon 6:30 AM UTC      | `/api/cron/icp-refresh`        |
| Watchdog            | Every hour           | `/api/cron/watchdog`           |

### Testing a Cron Job Locally

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/scoring
```

### Alert Cooldown Pattern (smoke-test + watchdog)

Both crons use an alert cooldown to prevent email flooding:

- **Smoke test** (`/api/cron/smoke-test`): Runs every 15 minutes. Only sends an alert email on state transition (pass→fail) or if the last failure alert was sent more than 1 hour ago. This prevents 70+ alert emails per day on sustained failures.
- **Watchdog** (`/api/cron/watchdog`): Runs every hour. Only sends an alert when the set of overdue crons **changes** (a new overdue cron appears). Repeated runs with the same overdue set are suppressed. Expected cron intervals are defined in `CRON_SCHEDULE` const in the route file.

Both patterns fail open: if the cooldown state check itself fails, the alert is sent.

### Apollo Pump Pipeline

The lead generation pipeline runs in three stages:

1. **`/api/cron/apollo-pump`** (Mon 6:00 AM) — Queries Apollo.io API for new leads matching ICP criteria. Writes raw results to `bidding_opportunities` / lead staging tables.
2. **`/api/cron/enrichment`** (Mon + Thu 7:00 AM) — Runs the enrichment waterfall: Apollo → Clearbit → LinkedIn → Google. Updates `enrichment_jobs` table.
3. **`/api/cron/scoring`** (every 4 hours) — Re-scores all unenriched or recently updated leads using `lead_scoring_rules`.

### Scoring Engine Rules and Caps

Scoring uses configurable rules in the `lead_scoring_rules` table, evaluated by `lib/crm/scoring-engine.ts`.

**Dimension caps (hard limits):**
| Dimension | Max Score |
|-----------|-----------|
| Fit | 40 |
| Intent | 35 |
| Engagement | 25 |
| **Total** | **100** |

**Supported operators:** `eq`, `gt`, `lt`, `gte`, `lte`, `contains`, `in_set`, `contains_any`

- `in_set`: matches field value against `|`-delimited list (e.g., `Toronto|Mississauga|Brampton`)
- `contains_any`: field contains at least one value from `|`-delimited list

Scores below 0 per dimension are clamped to 0. Score history is tracked in `lead_score_history`.

## Seed Data

```bash
# Seed MDM organization
npx tsx scripts/seed-org.ts --file supabase/seed/seed-org-mdm.json

# Seed test users with Clerk metadata
npx tsx scripts/seed-test-users.ts

# Seed real production data
npx tsx scripts/seed-real-data.ts
```

All seed scripts require `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS).

## Environment Strategy

| Environment    | Purpose     | URL                     | Branch      |
| -------------- | ----------- | ----------------------- | ----------- |
| **Production** | Live app    | `krewpact.ca`           | `main`      |
| **Preview**    | PR review   | `*.vercel.app` (per-PR) | PR branches |
| **Local**      | Development | `localhost:3000`        | any         |

Vercel env vars are configured per-environment (Production / Preview / Development) in the Vercel Dashboard.

## Troubleshooting

### Empty data after deploy

**Symptom:** Dashboard shows all zeros, tables are empty.
**Cause:** RLS is blocking queries — Clerk JWT claims aren't matching.
**Fix:** Verify Clerk Third-Party Auth is enabled for Supabase and the user has `krewpact_user_id`, `krewpact_org_id`, `division_ids`, and `role_keys` in Clerk metadata.

### Middleware domain error

**Symptom:** `authorizedParties` error in logs.
**Cause:** Request came from a domain not in the allowed list.
**Fix:** Add the domain to `authorizedParties` in `middleware.ts`. The Vercel default domain (`VERCEL_URL`) is already included.

### Supabase connection errors from serverless

**Symptom:** "too many connections" or connection timeouts.
**Cause:** Serverless functions opening direct connections instead of using the pooler.
**Fix:** Use the Supabase pooler URL (port 6543, transaction mode), not the direct connection (port 5432).

### Clerk auth bridge mismatch

**Symptom:** Supabase queries return empty results or `Authentication failed — please sign in again`.
**Cause:** Clerk Third-Party Auth or KrewPact metadata claims are missing, so Supabase RLS has no usable `metadata.*` values.
**Fix:** In Clerk Dashboard, verify the Supabase Third-Party Auth integration/JWKS is active and the user metadata includes `krewpact_user_id`, `krewpact_org_id`, `division_ids`, and `role_keys`.

### QStash signature failures

**Symptom:** `/api/queue/process` returns 401 or background jobs stay queued.
**Cause:** `QSTASH_CURRENT_SIGNING_KEY` or `QSTASH_NEXT_SIGNING_KEY` is missing, or the queue target URL is wrong.
**Fix:** Set both signing keys, verify `QSTASH_TOKEN` and `QSTASH_URL`, then re-run `npx tsx scripts/health-check.ts --deep`.

### CRLF line ending issues

**Symptom:** Git shows every file as modified after checkout.
**Cause:** Windows line endings (CRLF) vs Unix (LF).
**Fix:** `git config core.autocrlf input` and re-checkout.
