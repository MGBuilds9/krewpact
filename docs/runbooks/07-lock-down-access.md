# Lock Down Access — Security Incident

**Severity:** P0
**Time to resolve:** 10–20 min
**Who can do this:** Platform Admin

## Symptoms
- A user account is suspected compromised (phishing, leaked password, unauthorized activity)
- An API key or secret was accidentally committed to GitHub or shared publicly
- Unusual activity detected in Sentry, Vercel logs, or Supabase audit logs
- A terminated employee still has active access

## Steps

### Part A: Disable a Compromised User Account

1. **Disable in Clerk (blocks all KrewPact login immediately)**
   - Go to https://dashboard.clerk.com → MDM Group application
   - Click **Users** → search for the user by name or email
   - Click the user → toggle **Locked** to ON (or click **Delete** for terminated employees)
   - This immediately prevents new sign-ins. Active sessions expire within minutes.

2. **Revoke any active Supabase sessions**
   - Go to https://supabase.com/dashboard → KrewPact → **Authentication** → **Users**
   - Find the user → click **Delete user** or look for a way to sign out sessions
   - Alternatively, run in the SQL editor:
   ```sql
   DELETE FROM auth.sessions WHERE user_id = 'the-users-supabase-uuid';
   ```
   - Note: With Clerk Third-Party Auth, Supabase sessions are tied to Clerk tokens. Disabling in Clerk is the primary control.

3. **Check what the user accessed recently**
   - In Sentry, filter issues by user email to see recent errors they triggered
   - In Vercel logs, filter function logs by the time window of concern

### Part B: Rotate a Compromised API Key or Secret

4. **Identify which key was exposed**
   - Check the CLAUDE.md Required Environment Variables list for the affected service
   - Common targets: `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ERPNEXT_API_KEY/SECRET`

5. **Generate a new key in the service dashboard**
   - Clerk: https://dashboard.clerk.com → API Keys → roll the secret key
   - Supabase: https://supabase.com/dashboard → Project Settings → API → roll the service role key
   - ERPNext: erp.mdmgroupinc.ca → user settings → API access → regenerate key pair

6. **Update the key in Vercel**
   - Go to Vercel → Project Settings → Environment Variables
   - Find the affected variable → click edit → paste the new value → Save
   - Trigger a redeploy: Deployments → **Redeploy** on the latest production build

7. **Revoke the old key in the source service** (after Vercel is updated and deployed)
   - Do not revoke the old key until the new one is live — or KrewPact will break during the gap

8. **Audit for damage**
   - Check Supabase logs for unusual queries during the exposure window
   - Check ERPNext for unusual document changes
   - Note findings in `docs/issues-log.md`

## Escalation
- Michael Guirguis must be notified for any security incident within 1 hour
- If personal data may have been accessed: notify PIPEDA obligations may apply (72-hour breach notification window)
- For GitHub key exposure: use GitHub's secret scanning alerts as a starting point
