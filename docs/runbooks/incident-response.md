# Incident Response Runbook

## Alert: BetterStack "Site Down"

1. Check Vercel dashboard for failed deploys
2. Hit `/api/health` manually — if 200, it's a DNS/CDN issue
3. Hit `/api/health?deep=true` with `Authorization: Bearer $CRON_SECRET` — identifies which dependency is down
4. Triage by failing service:

| Service Down    | Action                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Supabase        | Check [status.supabase.com](https://status.supabase.com) — wait for resolution                             |
| Clerk           | Check [status.clerk.com](https://status.clerk.com) — auth is down, no action possible                      |
| ERPNext         | SSH to ERPNext server, check `systemctl status cloudflared`. Restart: `sudo systemctl restart cloudflared` |
| Redis (Upstash) | Check [console.upstash.com](https://console.upstash.com) — usually transient. Rate limiting fails open.    |
| QStash          | Check Upstash console — background jobs will queue and retry                                               |

5. BetterStack auto-resolves when the service recovers

## Alert: Smoke Test Email ("X checks failed")

The smoke test cron runs hourly and emails on state transition (pass to fail).

1. Read the email — it lists exactly which checks failed
2. Follow the same service-specific triage as above
3. The smoke test will send a recovery email when checks pass again

## Alert: Watchdog Email ("X cron jobs overdue")

The watchdog cron runs hourly and checks if other crons are running on schedule.

1. Read the email — it lists which crons are overdue
2. Check Vercel dashboard > Cron Jobs for failed invocations
3. Common causes:
   - Vercel cron invocation limits exceeded (check billing)
   - Function timeout (check Vercel logs for the specific cron route)
   - Dependency down (ERPNext, Supabase) causing the cron handler to fail
4. Manual recovery — trigger the cron directly:
   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
     https://krewpact.com/api/cron/<cron-name>
   ```

## Alert: Sentry Error Spike

1. Open Sentry > Issues > sort by "First Seen" — find the new issue
2. Check the **release tag** — which deploy introduced this error?
3. Read the **stack trace** — source maps should be readable (if not, check SENTRY_AUTH_TOKEN)
4. Check **request context** — `requestId`, `userId`, `route` in the error extras
5. Severity assessment:

| Severity | Criteria                                         | Action                                                             |
| -------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| Critical | Auth broken, data loss, >50% of requests failing | Rollback: Vercel dashboard > Deployments > Promote previous deploy |
| High     | Feature broken, affecting multiple users         | Fix and deploy within 4 hours                                      |
| Medium   | Edge case, single user affected                  | Fix in next work session                                           |
| Low      | Cosmetic, no user impact                         | Add to backlog                                                     |

6. If rolling back: Vercel dashboard > Deployments > find last known good deploy > "Promote to Production"

## General Triage Steps

1. **Don't panic** — the 99.5% SLO allows 3.6 hours/month of downtime
2. **Check the health endpoint first** — it tells you exactly what's broken
3. **Check Vercel logs** — `vercel logs https://krewpact.com --level error --since 1h`
4. **Check Sentry** — look for new issues correlated with the incident time
5. **Communicate** — if the outage affects users, update the BetterStack status page
