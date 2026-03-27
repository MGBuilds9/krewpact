# Weekly Review Checklist (~15 minutes)

Run this every Monday morning.

## Error Tracking (Sentry)

- [ ] Open Sentry > Issues > sort by frequency
- [ ] Triage top 5 unresolved errors (assign, resolve, or snooze)
- [ ] Check Sentry > Performance > sort by P95 latency — flag any routes >2s
- [ ] Check quota usage: Settings > Subscription > Usage (stay under 5K errors/mo free tier)

## Uptime (BetterStack)

- [ ] Open BetterStack dashboard — check uptime % for the past 7 days
- [ ] Review any incidents — were they real outages or false positives?
- [ ] Check response time trends — is anything getting slower?

## Performance (Vercel)

- [ ] Open Vercel > Analytics > Web Vitals
- [ ] Check LCP trend — should be <2.5s for all routes
- [ ] Check CLS trend — should be <0.1
- [ ] Check INP — should be <200ms
- [ ] Flag any routes with degraded metrics for investigation

## Health & Crons

- [ ] Hit `/api/health?deep=true` — all services should be `ok`
- [ ] Check cron failure rate (run in Supabase SQL editor):
  ```sql
  SELECT cron_name, count(*) as failures
  FROM cron_runs
  WHERE status = 'failure' AND started_at > now() - interval '7 days'
  GROUP BY cron_name ORDER BY failures DESC;
  ```
- [ ] If any cron has >3 failures, investigate the Vercel function logs

## Quick Wins

- [ ] Any Sentry errors that are trivially fixable? Fix them now.
- [ ] Any slow routes that just need a missing index? Add it.
- [ ] Any BetterStack alerts that were false positives? Tune the check.

## Future Automation Hooks (when ready)

These are not current tasks — document here for when the monitoring stack matures:

1. **Sentry webhook to Claude Code** — auto-generate fix PRs for new errors
2. **BetterStack to auto-restart** — webhook triggers `cloudflared` restart on ERPNext tunnel down
3. **Vercel Rolling Releases** — canary deploys to 10% of traffic, auto-rollback on error spike
4. **Mobile monitoring** — add `sentry-expo` to `mobile/` when Expo app goes live
5. **Per-route SLO tracking** — use withApiRoute() timing data to compute P50/P95/P99 and alert on breaches
