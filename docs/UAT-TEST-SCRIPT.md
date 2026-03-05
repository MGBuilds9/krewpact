# KrewPact UAT Test Script

**Version:** 1.0
**Date:** 2026-03-05
**Environment:** app.krewpact.com (production) or staging
**Test Password:** `KrewPact-UAT-2026!` (all test users)

---

## Prerequisites

- [ ] Production Supabase seeded (`npx tsx scripts/seed-org.ts`)
- [ ] Test users created (`npx tsx scripts/seed-test-users.ts`)
- [ ] Clerk production instance configured with JWT template
- [ ] DNS pointing `app.krewpact.com` to Vercel
- [ ] ERPNext accessible via Cloudflare Tunnel

---

## 1. Authentication & Authorization

**Test user:** `admin@krewpact-test.com` (platform_admin)

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 1.1 | Email login | Go to app.krewpact.com, enter test email + password | Redirected to dashboard | [ ] |
| 1.2 | Role-based routing | Login as `field@krewpact-test.com` | See field supervisor view, no admin settings | [ ] |
| 1.3 | Unauthorized access | Login as `trade-user@krewpact-test.com`, navigate to `/org/mdm-group/settings` | 403 or redirect | [ ] |
| 1.4 | Division filtering | Login as `opsmgr@krewpact-test.com` | Only see Contracting + Homes division data | [ ] |
| 1.5 | Session persistence | Login, close browser, reopen app | Still authenticated | [ ] |
| 1.6 | Logout | Click logout | Redirected to login, session cleared | [ ] |

---

## 2. CRM — Leads

**Test user:** `pm@krewpact-test.com` (project_manager)

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 2.1 | View leads list | Navigate to CRM > Leads | Paginated list loads, shows lead score | [ ] |
| 2.2 | Create lead | Click "New Lead", fill company name + division | Lead created with status "new" | [ ] |
| 2.3 | Search leads | Type company name in search box | Filtered results shown | [ ] |
| 2.4 | Filter by status | Select "qualified" from status dropdown | Only qualified leads shown | [ ] |
| 2.5 | Update lead | Open a lead, change source_channel | Saved successfully | [ ] |
| 2.6 | Convert to opportunity | Open a qualified lead, click "Convert" | Opportunity created, lead status → "won" | [ ] |
| 2.7 | Auto-scoring | Create lead with enrichment data | Lead score calculated automatically | [ ] |
| 2.8 | Delete lead | Open a lead, click "Delete" | Soft-deleted (disappears from list) | [ ] |

---

## 3. CRM — Accounts & Contacts

**Test user:** `pm@krewpact-test.com`

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 3.1 | View accounts | Navigate to CRM > Accounts | Paginated list of accounts | [ ] |
| 3.2 | Create account | Click "New Account", fill name + type | Account created | [ ] |
| 3.3 | Add contact | Open account, add contact with email + phone | Contact linked to account | [ ] |
| 3.4 | Contact search | Search contacts by name | Matching contacts shown | [ ] |
| 3.5 | Edit contact | Update contact email | Saved successfully | [ ] |

---

## 4. CRM — Opportunities

**Test user:** `pm@krewpact-test.com`

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 4.1 | View opportunities | Navigate to CRM > Opportunities | Paginated list with stage indicators | [ ] |
| 4.2 | Create opportunity | Click "New", fill name + value + account | Opportunity created in "qualification" stage | [ ] |
| 4.3 | Advance stage | Click "Won" on an opportunity | Stage updates, activity logged | [ ] |
| 4.4 | Mark lost | Click "Lost", enter reason | Opportunity closed, reason saved | [ ] |
| 4.5 | Link estimate | Click "Link Estimate" on opportunity | Estimate attached | [ ] |

---

## 5. CRM — Sequences & Email

**Test user:** `pm@krewpact-test.com`

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 5.1 | View sequences | Navigate to CRM > Sequences | List of outreach sequences | [ ] |
| 5.2 | Create sequence | Add multi-step sequence (email + call) | Sequence created with steps | [ ] |
| 5.3 | Enroll contact | Enroll a contact into a sequence | Enrollment created, first step queued | [ ] |
| 5.4 | Email templates | View/create email templates | Templates saved with merge fields | [ ] |

---

## 6. Estimating

**Test user:** `estimator@krewpact-test.com`

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 6.1 | View estimates | Navigate to Estimates | Paginated list | [ ] |
| 6.2 | Create estimate | Click "New Estimate", add line items | Estimate created with subtotals | [ ] |
| 6.3 | Add line items | Add 3+ line items with qty + unit price | Totals calculated correctly | [ ] |
| 6.4 | Add allowance | Add allowance to estimate | Allowance appears in estimate | [ ] |
| 6.5 | Add alternate | Add alternate pricing option | Alternate linked to estimate | [ ] |
| 6.6 | Create version | Click "Save Version" | Version snapshot created | [ ] |
| 6.7 | Approve estimate | Click "Approve" (as ops manager) | Status → approved | [ ] |

---

## 7. Proposals & E-Sign

**Test user:** `pm@krewpact-test.com`

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 7.1 | Create proposal | Create proposal from approved estimate | Proposal generated | [ ] |
| 7.2 | Send for e-sign | Click "Send for Signature" | BoldSign document created | [ ] |
| 7.3 | Track events | View proposal timeline | Events (sent, viewed, signed) shown | [ ] |

---

## 8. Projects

**Test user:** `pm@krewpact-test.com`

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 8.1 | View projects | Navigate to Projects | Paginated list with status | [ ] |
| 8.2 | Create project | Click "New Project", fill details | Project created | [ ] |
| 8.3 | Add members | Add team members with roles | Members appear in project | [ ] |
| 8.4 | Create task | Add task with assignee + due date | Task created | [ ] |
| 8.5 | Update task status | Move task to "in_progress" | Status updated, timestamp recorded | [ ] |
| 8.6 | Daily log | Create daily log entry | Log saved with date + weather | [ ] |
| 8.7 | Upload file | Upload a document to project | File stored in Supabase Storage | [ ] |
| 8.8 | View meetings | Navigate to project meetings | Meeting list shown | [ ] |

---

## 9. Finance (Read-Only Snapshots)

**Test user:** `accounting@krewpact-test.com`

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 9.1 | View invoices | Navigate to Finance > Invoices | ERPNext invoice snapshots shown | [ ] |
| 9.2 | View POs | Navigate to Finance > Purchase Orders | PO snapshots shown | [ ] |
| 9.3 | Job costs | Navigate to Finance > Job Costs | Cost breakdown by project | [ ] |
| 9.4 | Expense report | Navigate to Expenses | List of expense claims | [ ] |

---

## 10. Admin & Settings

**Test user:** `admin@krewpact-test.com` (platform_admin)

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 10.1 | View divisions | Navigate to Settings > Divisions | All 6 MDM divisions shown | [ ] |
| 10.2 | View roles | Navigate to Settings > Roles | All 13 roles shown | [ ] |
| 10.3 | Manage users | Navigate to Settings > Users | User list with role badges | [ ] |
| 10.4 | Edit user role | Change a user's role | Role updated in Supabase + Clerk | [ ] |
| 10.5 | Notification prefs | Update notification preferences | Preferences saved | [ ] |

---

## 11. Portal (External Users)

**Test user:** `client-owner@krewpact-test.com`

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 11.1 | Portal login | Login as client user | Portal dashboard shown (not internal) | [ ] |
| 11.2 | View project | See assigned project details | Project info visible, limited scope | [ ] |
| 11.3 | Approve change order | View and approve a pending CO | CO status updated | [ ] |
| 11.4 | Messages | Send/receive portal messages | Message delivered | [ ] |

**Test user:** `trade-admin@krewpact-test.com`

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 11.5 | Trade portal | Login as trade partner | Trade-specific views shown | [ ] |
| 11.6 | Submit bid | Submit a bid on an RFQ | Bid recorded | [ ] |
| 11.7 | View tasks | See assigned tasks | Task list with status update | [ ] |

---

## 12. ERPNext Sync Verification

**Test user:** `admin@krewpact-test.com`

| # | Scenario | Steps | Expected | Pass |
|---|----------|-------|----------|------|
| 12.1 | Cron sync | Trigger `/api/cron/erp-sync` manually | Invoice snapshots updated | [ ] |
| 12.2 | Webhook receive | Create a Customer in ERPNext | Webhook fires, data synced to Supabase | [ ] |
| 12.3 | Outbound sync | Create an account in KrewPact | Customer created in ERPNext | [ ] |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| QA Lead | | | |
| Dev Lead | | | |
