# Clerk Outage — Users Can't Log In

**Severity:** P0
**Time to resolve:** 5–30 min (depending on root cause)
**Who can do this:** Platform Admin or IT

## Symptoms
- Users see "Sign in failed" or a blank screen at krewpact.ca/sign-in
- Microsoft SSO button does nothing or loops back to login
- Slack/email reports of "can't get in"

## Steps

1. **Check Clerk status page first**
   - Go to https://status.clerk.com
   - If there is an active incident, this is Clerk's problem — not ours. Post in Slack: "Clerk is down. ETA: [from status page]. Stand by."
   - Do not restart anything. Wait for Clerk to resolve.

2. **If Clerk status is green, check Vercel logs**
   - Go to https://vercel.com/mdm-group/krewpact
   - Click **Deployments** → open the most recent deployment → click **Functions**
   - Filter by errors. Look for anything mentioning `clerk`, `auth`, or `middleware`

3. **Check if the latest deploy broke something**
   - In Vercel, compare the most recent deploy to the previous one
   - If the latest deploy is red/failed, roll back: click the previous green deployment → **Promote to Production**

4. **Verify environment variables are intact**
   - Go to Vercel → Project Settings → Environment Variables
   - Confirm `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are present and not blank
   - If either is missing: contact Michael Guirguis immediately — do not guess the values

5. **Emergency: users who absolutely must access ERPNext**
   - Direct them to https://erp.mdmgroupinc.ca and log in with their ERPNext username/password directly
   - This bypasses KrewPact entirely — ERPNext still works

6. **Once resolved, verify login works**
   - Open https://krewpact.ca/sign-in in an incognito window
   - Complete a full sign-in with Microsoft

## Escalation
- Clerk support: https://clerk.com/support (include your Clerk Application ID)
- Michael Guirguis (platform owner) — call if P0 lasts more than 15 minutes
- Vercel support: https://vercel.com/support
