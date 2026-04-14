# QStash Dead Letters — Background Jobs Failing

**Severity:** P2
**Time to resolve:** 15–30 min
**Who can do this:** Platform Admin

## Symptoms

- ERPNext sync appears delayed or stale (data in KrewPact doesn't match ERPNext)
- Email notifications are not being sent
- Sentry shows errors from `/api/queue/process`
- QStash alert fires (if configured)

## Steps

1. **Log into Upstash console**
   - Go to https://console.upstash.com
   - Sign in with MDM credentials (stored in password manager)
   - Click **QStash** in the left menu

2. **Check the Dead Letter Queue**
   - In QStash, click **Dead Letter Queue** (or **DLQ**)
   - You will see a list of failed messages with: endpoint, number of attempts, last error, and timestamp
   - Read the "last error" for each message — this tells you WHY the job failed

3. **Identify the pattern**
   - **ERPNext errors** (`ERPNEXT_`, connection refused, 502): ERPNext may have been down when the job ran — safe to replay
   - **Auth errors** (401, 403): An API key may have changed — check environment variables before replaying
   - **Validation errors** (400, Zod): The job payload had bad data — do NOT replay, contact Michael Guirguis to investigate
   - **Timeout errors**: The job took too long — safe to replay, but watch if it fails again

4. **Replay failed jobs**
   - Click a failed message → **Replay** button
   - QStash will re-attempt delivery to `/api/queue/process`
   - Watch Sentry or Vercel logs to confirm the replayed job succeeds

5. **Replay all safe messages at once**
   - If all failures are ERPNext-related (and ERPNext is back up), click **Replay All** in the DLQ interface
   - Do NOT use Replay All if there are validation errors — replay only ERPNext/timeout failures

6. **Check Vercel logs for the queue endpoint**
   - Go to https://vercel.com/mdm-group/krewpact → Deployments → Functions
   - Search for `/api/queue/process` — review the most recent errors

7. **Verify jobs are processing**
   - After replay, wait 2–3 minutes
   - Check the DLQ again — it should be empty or shrinking
   - Check that ERPNext data appears updated in KrewPact (e.g., open a finance screen)

## Escalation

- Michael Guirguis if jobs keep failing after replay (may indicate a broken endpoint or changed API contract)
- Upstash support: https://upstash.com/support
- Check `lib/queue/` in the codebase for job definitions if you need to understand what a job does
