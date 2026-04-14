# Sentry Fatal Error Spike

**Severity:** P0
**Time to resolve:** 10–30 min
**Who can do this:** Platform Admin or Developer

## Symptoms

- Phone alert fires (Sentry "Fatal Event → Phone Alert" rule)
- Sentry shows a sudden spike in fatal errors — many in a short window
- Users report crashes, blank screens, or "Something went wrong" across the platform
- Vercel may also show increased function errors

## Steps

1. **Open Sentry immediately**
   - Go to https://sentry.io → MDM Group → KrewPact project
   - Click **Issues** → sort by **Events** (last hour)
   - The top issue is almost certainly the cause

2. **Read the error details**
   - Click the top issue → read the stack trace
   - Look for: which file/function is throwing, what the error message says, and what URL/route is affected
   - Note the "First Seen" time — this tells you when the spike started

3. **Correlate with deploys**
   - Go to https://vercel.com/mdm-group/krewpact → Deployments
   - Compare the "First Seen" time from Sentry to the deployment timestamps
   - If a deploy happened within 5–10 minutes before the spike, that deploy is almost certainly the cause

4. **Roll back the bad deploy**
   - In Vercel, find the last GREEN deployment before the spike
   - Click it → **Promote to Production**
   - This takes 30–60 seconds. Vercel will swap traffic to the old build.

5. **Verify the rollback worked**
   - Wait 2 minutes
   - In Sentry, check if new error events are still coming in
   - The spike should stop. Existing open issues will remain but new ones should cease.

6. **Check if the issue is infrastructure (not code)**
   - If no deploy happened near the spike time, check:
     - Supabase status: https://status.supabase.com
     - Clerk status: https://status.clerk.com
     - Upstash status: https://status.upstash.com
   - If a third-party service is down, that is the root cause — wait for their recovery

7. **Notify the team**
   - Post in Slack: what broke, what action was taken, current status
   - After recovery, note the issue in `docs/issues-log.md` with the date

8. **After rolling back, do NOT re-deploy the bad commit**
   - Contact Michael Guirguis or the developer who made the deploy
   - The fix must be confirmed locally before re-deploying

## Escalation

- Michael Guirguis if you cannot identify the cause or the rollback does not stop the spike
- Sentry support: https://sentry.io/support
- Vercel support: https://vercel.com/support
