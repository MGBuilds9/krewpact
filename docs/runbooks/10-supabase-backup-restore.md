# Supabase Backup Restore

**Severity:** P0 (data loss scenario)
**Time to resolve:** 30–60 min (restore) + 2–4 hours (validation)
**Who can do this:** Platform Admin + Michael Guirguis (must approve before restoring)

## STOP — Read Before Proceeding
- **Get explicit approval from Michael Guirguis before restoring.** Restoring overwrites all data since the backup was taken.
- **Current tier:** Free tier — daily backups, retained for 7 days. No point-in-time recovery (PITR).
- **PITR (15-minute granularity) requires Supabase Pro** — planned upgrade before Phase 5 pilot. Until then, the maximum data loss on restore is up to 24 hours.
- Restores are performed at the **project level** — all tables are restored together. You cannot restore a single table without help from Supabase support.

## Symptoms / Triggers
- Accidental mass deletion of records (user error or runaway script)
- Database corruption detected
- Security incident where data was tampered with
- Failed migration that cannot be rolled back

## Steps

### Step 1: Assess the Damage
1. Before restoring, determine EXACTLY what was lost or corrupted
2. Run a query in the Supabase SQL editor to confirm the scope:
   ```sql
   -- Example: check if leads table has data
   SELECT COUNT(*), MAX(created_at) FROM leads;
   ```
3. Check Supabase audit logs: **Database** → **Logs** → look for recent DELETE or UPDATE statements
4. Note the timestamp when the data loss occurred — this determines which backup to restore from

### Step 2: Identify the Right Backup
1. Go to https://supabase.com/dashboard → KrewPact project
2. Click **Database** → **Backups**
3. You will see a list of daily backups (up to 7 days back)
4. Choose the most recent backup that was taken **BEFORE** the data loss event

### Step 3: Restore the Backup
1. On the backup you selected, click **Restore**
2. Read the confirmation dialog carefully — it will warn you that all current data will be replaced
3. Type the confirmation text and click **Restore**
4. Wait — the restore process takes 10–30 minutes depending on database size
5. Do NOT refresh or navigate away during the restore
6. Supabase will send an email when the restore is complete

### Step 4: Verify the Restore
1. Go to **Database** → **SQL Editor** and run spot-check queries:
   ```sql
   SELECT COUNT(*) FROM leads;
   SELECT COUNT(*) FROM projects;
   SELECT COUNT(*) FROM inventory_ledger;
   SELECT MAX(created_at) FROM audit_logs;
   ```
2. Confirm that the restored data matches what was expected before the loss
3. Log in to KrewPact and test a few key screens (CRM, Projects, Inventory)

### Step 5: Redeploy KrewPact After Restore
1. Go to https://vercel.com/mdm-group/krewpact → Deployments
2. Click the current production deployment → **Redeploy**
3. This ensures Vercel's serverless functions reconnect cleanly to the restored database

### Step 6: Recover Lost Data (if any)
- Data created AFTER the backup point is permanently lost (free tier limitation)
- Collect any lost data from users manually (e.g., they may have records in email or local files)
- Document the gap in `docs/issues-log.md`

## Upgrade Note
Supabase Pro ($25/mo) enables PITR with 15-minute granularity. This dramatically reduces data loss risk. Upgrade is planned before Phase 5 pilot launch. To upgrade: Supabase dashboard → Project Settings → Billing → Upgrade to Pro.

## Escalation
- Michael Guirguis must approve the restore before it is initiated
- Supabase support for single-table restores or if the restore fails: https://supabase.com/support
- If the restore itself fails, open a critical support ticket immediately — do not retry without guidance
