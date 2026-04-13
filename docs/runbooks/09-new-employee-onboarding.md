# New Employee Onboarding — KrewPact + ERPNext Access

**Severity:** N/A (routine)
**Time to complete:** 30–60 min (spread across first day)
**Who can do this:** Platform Admin + HR (M365 step)

## Overview
KrewPact uses Microsoft SSO via Clerk. Employees sign in with their MDM Microsoft 365 account — no separate KrewPact password needed.

## Steps

### Step 1: Create the M365 Account (HR / IT)
1. Log in to https://admin.microsoft.com with an M365 admin account
2. **Users** → **Add a user**
3. Fill in: first name, last name, display name, username (`firstname.lastname@mdmgroupinc.ca`)
4. Assign an **M365 Business Standard** (or appropriate) license
5. Set a temporary password and send it to the employee's personal email
6. The employee must sign in and change their password before proceeding

### Step 2: Employee Signs In to KrewPact for the First Time
1. Direct the employee to https://krewpact.ca
2. Click **Sign in with Microsoft**
3. They enter their `@mdmgroupinc.ca` email and the password set in Step 1
4. On first sign-in, Clerk will create their KrewPact account automatically
5. They will land on the dashboard — but with no role or division assigned yet (limited access)

### Step 3: Assign Role and Division in KrewPact
1. Log in to KrewPact as Platform Admin
2. Go to **Settings** → **Team** (at the org level)
3. Find the new employee — they should appear after completing their first sign-in
4. Assign their **Role** from the canonical list:
   - Internal: `project_coordinator`, `project_manager`, `estimator`, `field_supervisor`, `accounting`, `operations_manager`, `executive`, `payroll_admin`
   - External (for trade partners/clients): `trade_partner_user`, `client_owner`, etc.
5. Assign their **Division(s)**: contracting, homes, wood, telecom, group-inc, management
6. Save — the employee's access to routes and data is now restricted to their role/division

### Step 4: ERPNext Access via SSO (OIDC)
1. Direct the employee to https://erp.mdmgroupinc.ca
2. Click **Login with Clerk** (or the SSO button)
3. They sign in with their Microsoft credentials — same as KrewPact
4. ERPNext will auto-provision their account via OIDC on first login
5. In ERPNext, assign their **Role Profile** via: Settings → Users → find the user → assign roles

### Step 5: Verify Access
- [ ] Employee can sign in to https://krewpact.ca
- [ ] Employee sees the correct navigation for their role (some sections may be locked if feature flags are off)
- [ ] Employee can sign in to https://erp.mdmgroupinc.ca via SSO
- [ ] Employee cannot see data from divisions they are not assigned to

## Common Issues
- **"User not found" in KrewPact Team Settings**: Employee must complete their first sign-in before they appear in the list
- **ERPNext SSO fails**: Ensure the employee's M365 account is active and they have changed their temporary password
- **Employee sees wrong division data**: Double-check division assignments in KrewPact Settings → Team

## Escalation
- Michael Guirguis for role/permission questions
- IT Admin for M365 account issues
