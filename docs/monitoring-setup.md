# Monitoring Setup — KrewPact

## Overview

KrewPact uses three layers of observability:

| Layer     | Tool                              | Purpose                                     |
| --------- | --------------------------------- | ------------------------------------------- |
| Uptime    | BetterStack                       | External ping every 60s, incident alerting  |
| Errors    | Sentry                            | Stack traces, release tracking, performance |
| Analytics | Vercel Analytics + Speed Insights | Web vitals, traffic, function duration      |

---

## BetterStack Uptime Monitors

Dashboard: https://betterstack.com — login with team account.

### Recommended Monitors

| Monitor Name         | URL                                                                   | Check Interval | Alert After            |
| -------------------- | --------------------------------------------------------------------- | -------------- | ---------------------- |
| KrewPact Production  | `https://krewpact.ca/api/health`                                      | 1 min          | 2 consecutive failures |
| KrewPact Health Deep | `https://krewpact.ca/api/health?deep=true`                            | 5 min          | 1 failure              |
| Supabase Pooler      | _(set to Supabase project URL TCP check)_                             | 1 min          | 2 failures             |
| ERPNext Tunnel       | `https://<erpnext-tunnel-url>/api/method/frappe.auth.get_logged_user` | 5 min          | 1 failure              |

### Expected Health Response

```json
{
  "status": "ok",
  "timestamp": "2026-03-25T12:00:00.000Z",
  "version": "abc1234",
  "checks": {
    "supabase": "ok"
  }
}
```

Deep response additionally includes: `supabase_data`, `redis`, `clerk`, `erpnext`, `qstash`, `qstash_signing_keys`, `sentry`, `crons`.

### Alert Policy

- **P0 trigger:** `status` field is not `"ok"` OR HTTP status is 503
- **Notify:** PagerDuty or email — configure in BetterStack escalation policy
- **On-call:** See `docs/production-runbook.md` for escalation contacts

### Status Page

Configure a public BetterStack status page at `status.mdmgroupinc.ca` (optional). Include monitors for Production and ERPNext Tunnel.

---

## Sentry

Dashboard: https://sentry.io — project: `krewpact`

### Configuration

Sentry is initialized in `instrumentation.ts` (Next.js instrumentation hook). The DSN is validated on every deep health check (`/api/health?deep=true`).

Required env var:

```
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project-id>
```

Set in Vercel Dashboard → Settings → Environment Variables for **Production** and **Preview**.

### Alerts to Configure

1. **First occurrence of a new issue** — notify Slack `#alerts-krewpact`
2. **Error rate spike** — threshold: >10 errors/min over 5 min
3. **Performance regression** — P95 latency > 3s on any transaction
4. **Release health** — crash-free rate drops below 95%

### Source Maps

Source maps are uploaded during CI via `SENTRY_AUTH_TOKEN`. Do NOT enable `productionBrowserSourceMaps` in `next.config.ts`.

### Releases

Sentry release is tagged with `VERCEL_GIT_COMMIT_SHA` automatically via the Sentry Vercel integration.

---

## Vercel Analytics

Enabled in `app/layout.tsx` via `<Analytics />` and `<SpeedInsights />`.

Access: Vercel Dashboard → KrewPact project → Analytics tab.

Key metrics to watch:

- **Web Vitals:** LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Function duration:** P99 < 10s (Vercel limit: 60s for Pro)
- **Error rate:** < 0.1% of requests

---

## Health Check Deep — Checks Reference

| Check Key             | What it validates                 | Degraded means           |
| --------------------- | --------------------------------- | ------------------------ |
| `supabase`            | DB connectivity (divisions query) | DB unreachable           |
| `supabase_data`       | Row counts (divisions > 0)        | Seed data missing        |
| `redis`               | Upstash set/get/del round-trip    | Rate limiting broken     |
| `clerk`               | Clerk API reachable               | Auth provider issue      |
| `auth_bridge`         | Clerk + Supabase env vars present | RLS will fail            |
| `erpnext`             | ERPNext tunnel auth call          | ERP data unavailable     |
| `qstash`              | QStash topics endpoint            | Background jobs stalled  |
| `qstash_signing_keys` | Signing keys env vars present     | Queue webhooks will fail |
| `sentry`              | SENTRY_DSN env var is valid URL   | Errors not captured      |
| `crons`               | Last cron run statuses            | Scheduled jobs failing   |

---

## Local Health Check

```bash
npm run health           # Shallow check (supabase only)
npm run health:deep      # All checks
```

Or via curl against production:

```bash
curl -s https://krewpact.ca/api/health | jq .
curl -s "https://krewpact.ca/api/health?deep=true" | jq .checks
```
