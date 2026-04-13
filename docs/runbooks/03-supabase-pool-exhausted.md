# Supabase Connection Pool Exhausted

**Severity:** P1
**Time to resolve:** 5–15 min
**Who can do this:** Platform Admin

## Symptoms
- KrewPact shows "Something went wrong" on data-heavy pages (Inventory, Projects, CRM)
- Errors in Vercel logs: `remaining connection slots are reserved`, `too many connections`, or `connection pool exhausted`
- Health check at https://krewpact.ca/api/health returns an error or slow response
- BetterStack alert firing for the health endpoint

## Steps

1. **Check Supabase dashboard**
   - Go to https://supabase.com/dashboard → select the KrewPact project
   - Click **Database** → **Connection Pooling**
   - Look at the active connections count. If it is at or near the maximum (free tier: 60 pooled connections), that confirms the issue.

2. **Check for stuck/idle connections**
   - In Supabase dashboard, go to **Database** → **SQL Editor**
   - Run this query to see who is holding connections:
   ```sql
   SELECT pid, state, query_start, query, client_addr
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY query_start;
   ```
   - If you see queries that have been running for more than 5 minutes, they are likely stuck.

3. **Terminate stuck connections**
   - To kill a specific stuck connection (replace `12345` with the actual `pid`):
   ```sql
   SELECT pg_terminate_backend(12345);
   ```
   - To kill ALL idle connections at once (safe — Vercel will reconnect automatically):
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND pid != pg_backend_pid();
   ```

4. **Verify Vercel is using the pooler URL**
   - Go to Vercel → Project Settings → Environment Variables
   - Confirm `SUPABASE_DB_URL` contains port **6543** (the pooler), not 5432
   - If it says 5432, contact Michael Guirguis immediately — this is a configuration error

5. **Restart the Vercel deployment as a last resort**
   - Go to https://vercel.com/mdm-group/krewpact → Deployments
   - Click the current production deployment → **Redeploy**
   - This forces all serverless functions to restart and re-establish fresh connections

6. **Verify recovery**
   - Wait 2 minutes, then check https://krewpact.ca/api/health
   - Reload a data-heavy page like Inventory

## Escalation
- Michael Guirguis if connections keep exhausting within minutes of being killed (may indicate a runaway background job or missing connection cleanup)
- Supabase support: https://supabase.com/support (free tier has email support)
- Note: Upgrade to Supabase Pro before Phase 5 pilot — Pro tier has higher connection limits
