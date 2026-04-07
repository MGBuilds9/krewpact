# Production Runbook — KrewPact

**Production URL:** https://krewpact.ca
**Vercel Project:** `prj_zoqw9AOSqaUcuKfgzpBFWcIbvRiX` (team: MKG Builds)
**Region:** `iad1` (US East)
**SLO:** 99.5% uptime — error budget: 3.6 hours/month

---

## Incident Severity Levels

| Level  | Name     | Definition                        | Response Time     | Example                             |
| ------ | -------- | --------------------------------- | ----------------- | ----------------------------------- |
| **P0** | Critical | Production down or data loss      | 15 min            | 503 on all requests, DB unreachable |
| **P1** | High     | Core feature broken for all users | 1 hour            | Auth failing, projects not loading  |
| **P2** | Medium   | Feature degraded or slow          | 4 hours           | ERPNext sync stalled, cron failures |
| **P3** | Low      | Minor issue, workaround exists    | Next business day | UI glitch, one user affected        |

---

## Escalation Contacts

> Fill in with actual contacts before go-live.

| Role              | Name     | Contact              | Escalate When                    |
| ----------------- | -------- | -------------------- | -------------------------------- |
| Primary On-Call   | _[name]_ | _[phone/Slack]_      | P0, P1 immediately               |
| Secondary On-Call | _[name]_ | _[phone/Slack]_      | Primary unreachable after 10 min |
| Platform Lead     | _[name]_ | _[email]_            | P0 sustained > 30 min            |
| Supabase Support  | Supabase | support.supabase.com | DB infrastructure issues         |
| Clerk Support     | Clerk    | clerk.com/support    | Auth infrastructure issues       |

---

## Monitoring Dashboard URLs

| Dashboard          | URL                                                          | Credentials   |
| ------------------ | ------------------------------------------------------------ | ------------- |
| BetterStack Uptime | https://betterstack.com                                      | Team login    |
| Sentry Errors      | https://sentry.io/organizations/mdm-group/projects/krewpact/ | Team login    |
| Vercel Analytics   | https://vercel.com/mkg-builds/krewpact/analytics             | Vercel team   |
| Vercel Logs        | https://vercel.com/mkg-builds/krewpact/logs                  | Vercel team   |
| Supabase Dashboard | https://supabase.com/dashboard/project/_your-project-ref_    | Supabase team |
| ERPNext            | Via Cloudflare Tunnel (see ERPNEXT_BASE_URL env var)         | ERPNext admin |

---

## Rollback Procedure

### Via Vercel Dashboard (fastest — instant, no rebuild)

1. Open https://vercel.com → KrewPact → **Deployments**
2. Find the last known-good deployment (look for the green "Production" tag or check by timestamp)
3. Click the three-dot menu → **Promote to Production**
4. Confirm — previous deployment is served within ~10 seconds
5. Verify: `curl -s https://krewpact.ca/api/health | jq .version`

### Via Vercel CLI

```bash
vercel rollback --scope mkg-builds
# Or target a specific deployment URL:
vercel promote <deployment-url> --scope mkg-builds
```

### After Rollback

1. Create a GitHub issue or Sentry issue documenting what caused the rollback
2. Do not re-deploy the bad commit without a fix
3. Update `docs/issues-log.md` with date, symptom, and resolution

---

## Common Failure Scenarios

### 503 — App Not Responding

**Diagnosis:**

```bash
curl -sv https://krewpact.ca/api/health
vercel logs --follow --scope mkg-builds
```

**Checks:**

- Vercel function timeout? Check function duration in Vercel Analytics
- Build failure? Check Vercel Deployments — look for a failed build
- CSP/headers issue? Unlikely to cause 503 — check Vercel logs for errors

**Resolution:** If latest deployment is broken → rollback (see above).

---

### Supabase Connection Errors

**Symptoms:** `supabase: "down"` in health check, "too many connections", timeout errors in logs.

**Diagnosis:**

```bash
curl -s "https://krewpact.ca/api/health?deep=true" | jq .checks.supabase
```

**Checks:**

1. Are all functions using the pooler URL (port 6543)? Never use port 5432 from serverless.
2. Supabase dashboard → Database → Connection Pooling — check active connections
3. Supabase status: https://status.supabase.com

**Resolution:**

- High connections: wait for idle connections to expire (serverless functions are short-lived)
- Supabase outage: check status page, follow Supabase incident updates
- Point-in-time restore: see "Database Recovery" section below

---

### Auth / Clerk Failures

**Symptoms:** Users can't sign in, `clerk: "degraded"` in health check, `auth_bridge: "degraded"`.

**Diagnosis:**

```bash
curl -s "https://krewpact.ca/api/health?deep=true" | jq '{clerk: .checks.clerk, auth_bridge: .checks.auth_bridge}'
```

**Checks:**

1. Clerk status: https://status.clerk.com
2. Vercel env vars: `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set?
3. Clerk Dashboard → Users — can you see users? Is the production instance selected?
4. Check `NEXT_PUBLIC_CLERK_DOMAIN` is not set to a wrong value (causes DNS failures)

**Resolution:**

- Clerk outage: inform users, wait for resolution
- Wrong env var: fix in Vercel Dashboard → redeploy

---

### ERPNext Tunnel Down

**Symptoms:** `erpnext: "down"` in health check, finance data not updating, ERP sync cron failing.

**Diagnosis:**

```bash
curl -s "https://krewpact.ca/api/health?deep=true" | jq .checks.erpnext
# Try the tunnel directly:
curl -s https://<erpnext-tunnel-url>/api/method/frappe.ping
```

**Checks:**

1. Is the ERPNext server (on-prem) running? SSH to the host and check `docker ps` or `systemctl status frappe`
2. Is `cloudflared` tunnel running? `systemctl status cloudflared` on the ERPNext host
3. Cloudflare Tunnel dashboard: https://dash.cloudflare.com — check tunnel status

**Resolution:**

1. Restart cloudflared: `sudo systemctl restart cloudflared`
2. If ERPNext is down: `cd /path/to/frappe && bench start` or restart the container
3. ERP-dependent features (finance sync, invoice view) will be degraded until resolved — inform operations team
4. QStash jobs will retry automatically once the tunnel is back

---

### Background Jobs Stalled (QStash)

**Symptoms:** `qstash: "degraded"`, enrichment/scoring not running, `crons: "degraded"`.

**Diagnosis:**

```bash
curl -s "https://krewpact.ca/api/health?deep=true" | jq '{qstash: .checks.qstash, crons: .checks.crons, cron_last_runs: .details.cron_last_runs}'
```

**Checks:**

1. QStash dashboard: https://console.upstash.com — check dead-letter queue
2. Are `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` set in Vercel?
3. Is the queue target URL correct? Should be `https://krewpact.ca/api/queue/process`

**Resolution:**

1. Fix env vars if missing → redeploy
2. Re-queue stuck jobs from QStash dashboard (Dead Letter Queue → Retry)
3. For scoring/enrichment, manually trigger cron: `curl -H "Authorization: Bearer $CRON_SECRET" https://krewpact.ca/api/cron/scoring`

---

### Sentry Not Capturing Errors

**Symptoms:** `sentry: "degraded"` in deep health check, no errors appearing in Sentry despite known issues.

**Diagnosis:**

```bash
curl -s "https://krewpact.ca/api/health?deep=true" | jq .checks.sentry
```

**Resolution:**

1. Set `SENTRY_DSN` in Vercel Dashboard → Environment Variables (Production)
2. Ensure `SENTRY_AUTH_TOKEN` is set for source map uploads in CI
3. Redeploy after fixing env vars
4. Verify in Sentry: send a test event via `npx @sentry/cli send-event`

---

### Redis / Rate Limiting Down

**Symptoms:** `redis: "down"`, rate limiting disabled (fails open — app still works), potential abuse.

**Resolution:**

- Rate limiting fails open by design (circuit breaker) — app continues to function
- Check Upstash dashboard: https://console.upstash.com
- If Upstash is down: monitor for unusual traffic manually, fix when Upstash recovers
- No user-facing action needed unless abuse is detected

---

## Database Recovery (Supabase Point-in-Time Restore)

**RPO:** 15 minutes | **RTO:** 2 hours

### When to Use

- Accidental data deletion (no soft-delete)
- Corrupted data from a bad migration
- Data loss from a bug

### Process

1. **Assess scope** — which tables, how far back?
2. **Open Supabase Dashboard** → project → **Database** → **Backups**
3. Supabase Pro tier provides PITR (point-in-time recovery) — select a timestamp before the incident
4. **Create a branch** first to test the restore: Supabase Dashboard → Branches → New branch from backup
5. Verify data integrity on the branch
6. If correct: promote branch to production OR use the restored branch as the data source for a targeted re-import
7. Notify affected users

> Supabase PITR window: 7 days (Pro tier). Contact Supabase support for restores older than 7 days.

---

## Post-Incident Process

1. **Resolve** — confirm health check returns `"ok"`, BetterStack shows green
2. **Document** — add entry to `docs/issues-log.md`: date, symptom, root cause, resolution
3. **Review** — within 24h: what failed, why, what prevented faster detection
4. **Improve** — add a test or monitoring rule to catch the same issue earlier next time

---

## Useful Commands

```bash
# Check production health
curl -s https://krewpact.ca/api/health | jq .

# Deep health check
curl -s "https://krewpact.ca/api/health?deep=true" | jq .

# Stream Vercel logs
vercel logs --follow --scope mkg-builds

# Manually trigger a cron job
curl -H "Authorization: Bearer $CRON_SECRET" https://krewpact.ca/api/cron/watchdog

# Run local deep health check
npm run health:deep

# Check current deployment version
curl -s https://krewpact.ca/api/health | jq .version
```
