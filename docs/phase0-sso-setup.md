# Phase 0: SSO Unlock — Manual Setup Steps

These steps require external access (Clerk dashboard, ERPNext SSH, ERPNext desk UI). They cannot be automated from the codebase.

## Prerequisites

- Access to Clerk dashboard (krewpact.ca instance)
- SSH access to ERPNext bench server
- Admin access to ERPNext desk UI

## Step 1: Configure Clerk as OIDC Identity Provider

1. Log into Clerk dashboard → **Configure** → **SSO Connections** (or OAuth Applications)
2. Create a new OAuth application named **"ERPNext"**
3. Enable Clerk as Identity Provider
4. Capture these values:
   - `client_id` (the OAuth client ID)
   - `client_secret` (the OAuth client secret)
   - Authorization URL: `https://clerk.krewpact.ca/oauth/authorize`
   - Token URL: `https://clerk.krewpact.ca/oauth/token_info`
   - UserInfo URL: `https://clerk.krewpact.ca/oauth/userinfo`
   - JWKS URL: `https://clerk.krewpact.ca/.well-known/jwks.json`
5. Store credentials:
   - Add `CLERK_OIDC_CLIENT_ID` and `CLERK_OIDC_CLIENT_SECRET` to Vercel env vars
   - Add the same to ERPNext's `site_config.json` or as environment variables on the bench

## Step 2: Install frappe-oidc-extended on ERPNext

SSH to the ERPNext bench server:

```bash
cd /path/to/frappe-bench
bench get-app frappe-oidc-extended
bench --site mdm install-app frappe_oidc_extended
bench migrate
bench restart
```

Verify installation:

```bash
bench --site mdm list-apps
# Should show: frappe, erpnext, frappe_oidc_extended
```

## Step 3: Configure ERPNext Social Login Key

1. In ERPNext desk: **Setup** → **Integrations** → **Social Login Key** → **+ New**
2. Configure:
   - **Provider Name:** Clerk
   - **Provider Type:** Custom
   - **Client ID:** (from Step 1)
   - **Client Secret:** (from Step 1)
   - **Authorization URL:** `https://clerk.krewpact.ca/oauth/authorize`
   - **Access Token URL:** `https://clerk.krewpact.ca/oauth/token_info`
   - **Redirect URL:** `https://erpnext.mdmgroupinc.ca/api/method/frappe.integrations.oauth2_logins.custom/clerk`
   - **API Endpoint URL:** `https://clerk.krewpact.ca/oauth/userinfo`
3. Claim mapping (in frappe-oidc-extended settings):
   - `email` → ERPNext User email
   - `krewpact_user_id` → stored as custom field
   - `role_keys.*` → mapped to ERPNext Role Profile
   - `division_ids` → mapped to ERPNext Cost Center access
4. Enable **Auto-create user on first login** from the trusted OIDC provider
5. Save and test

## Step 4: Test SSO Flow

1. Log into KrewPact at `https://krewpact.ca` with the ci-test user
2. Navigate to a page that deep-links to ERPNext (e.g., `/go/erpnext/sales-invoice/test`)
3. Verify: ERPNext loads WITHOUT a second login prompt
4. Verify: ERPNext user was auto-created with correct roles

## Step 5: Back-to-KrewPact Bar (Optional — Phase 0 stretch)

Install a custom ERPNext app or CSS override that adds a top bar on ERPNext pages:

```html
<!-- ERPNext Website Settings → Header HTML -->
<div
  style="background:#1e293b;color:white;padding:8px 16px;font-size:14px;display:flex;align-items:center;gap:8px;"
>
  <a href="https://krewpact.ca" style="color:white;text-decoration:none;">← Back to KrewPact</a>
  <span style="opacity:0.6">|</span>
  <span id="kp-context-chip" style="opacity:0.8;font-size:12px;"></span>
</div>
<script>
  // Read the return cookie set by /go/erpnext/... redirect
  const returnUrl = document.cookie.split(';').find((c) => c.trim().startsWith('kp_return_url='));
  if (returnUrl) {
    const url = decodeURIComponent(returnUrl.split('=')[1]);
    document.querySelector('#kp-context-chip').textContent = url.replace('https://krewpact.ca', '');
  }
</script>
```

## Step 6: Verify Sentry → Pushover/ntfy Alerting

1. In Sentry dashboard → **Settings** → **Integrations**
2. Search for **Pushover** or configure a **Webhook** integration pointing to ntfy
3. Create an alert rule:
   - **When:** An event with `level:fatal` is seen
   - **Then:** Send notification via Pushover/ntfy
   - **Frequency:** At most once per 10 minutes
4. Test: trigger a test fatal event from KrewPact's health endpoint
5. Verify: notification received on phone

## Step 7: Supabase PITR Backup Drill

**Status: BLOCKED** — KrewPact's Supabase project is not on Pro plan, so PITR and
restore-to-branch are unavailable. Daily automated backups are active (free tier).
Upgrade to Pro when the project enters Phase 5 (pilot rollout) to enable PITR with
15-minute RPO.

When available, the drill steps are:

1. In Supabase dashboard → **Database** → **Backups**
2. Note the latest PITR restore point timestamp
3. Create a new **branch** (not the main database) and restore to it
4. Time the operation (should be < 15 min for RPO compliance)
5. Verify data in the branch (spot-check a few tables)
6. Delete the branch after verification
7. Document the restore time and any issues in `docs/runbooks/pitr-restore.md`
