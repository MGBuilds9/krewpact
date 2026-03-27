# KrewPact Live Manual Checklist

**Date:** 2026-03-26
**Tester:** Michael Guirguis (platform_admin)
**URL:** https://krewpact.ca (production) or http://localhost:3000 (dev)
**Email safety:** All dev-mode emails route to michael.guirguis@mdmgroupinc.ca

---

## 1. Login + First Impressions

- [ ] Go to the app URL
- [ ] Login with your Clerk account
- [ ] Dashboard loads without errors or blank sections
- [ ] All 6 divisions visible in the sidebar/division selector
- [ ] Dark mode toggle works
- [ ] Navigation shows 7+ items (not truncated oddly)
- [ ] No "Loading..." text stuck anywhere — skeletons show, then content
- [ ] Time-of-day greeting shows correctly (Good morning/afternoon/evening)

## 2. Dashboard

- [ ] Stats cards show real numbers (not all zeros)
- [ ] Charts render without overflow or clipping
- [ ] Recent activity section shows entries (if any exist)
- [ ] Clicking a stat card navigates to the right page
- [ ] Page title shows in browser tab ("Dashboard | KrewPact")

## 3. CRM - Leads

- [ ] Navigate to CRM > Leads
- [ ] Lead list loads with data (637 leads in DB)
- [ ] Search box filters leads by company name
- [ ] Status filter dropdown works (new, contacted, qualified, etc.)
- [ ] Division filter shows all 6 divisions
- [ ] Click a lead — detail page loads with full info
- [ ] **Create a lead:** Click "New Lead", fill company name + source + division, save
- [ ] New lead appears in the list with status "new"
- [ ] Lead score shows a number (auto-calculated)
- [ ] **Delete a lead:** Open the test lead, click Delete, confirm — lead disappears

## 4. CRM - Accounts & Contacts

- [ ] Navigate to CRM > Accounts
- [ ] Account list loads
- [ ] **Create account:** Click "New Account", fill name + type, save
- [ ] Navigate to CRM > Contacts
- [ ] Contact list loads
- [ ] **Create contact:** Add contact with name + email + phone, link to account

## 5. CRM - Opportunities

- [ ] Navigate to CRM > Opportunities
- [ ] List loads with stage indicators (pipeline view or list)
- [ ] **Create opportunity:** Click "New", fill name + value + link to account
- [ ] Opportunity created in "qualification" stage
- [ ] Click through stages if UI supports it

## 6. CRM - Sequences (Outreach)

- [ ] Navigate to CRM > Sequences
- [ ] Sequence list loads
- [ ] View an existing sequence (if any) — steps visible
- [ ] Email templates page accessible

## 7. Estimates

- [ ] Navigate to Estimates
- [ ] List loads
- [ ] **Create estimate:** Click "New Estimate", add a line item with description + qty + unit price
- [ ] Subtotal calculates correctly
- [ ] Estimate saves without error
- [ ] Templates page loads
- [ ] Catalog page loads

## 8. Projects

- [ ] Navigate to Projects
- [ ] List loads (may be empty — 0 projects in DB)
- [ ] **Create project:** Click "New Project", fill name + division + status
- [ ] Project detail page loads with tabs (Overview, Diary, RFIs, Submittals, etc.)
- [ ] Daily log tab — create an entry
- [ ] RFI tab — page loads without error
- [ ] Submittals tab — page loads without error
- [ ] Change Orders tab — page loads without error
- [ ] Photos tab — page loads
- [ ] Time tab — page loads
- [ ] Closeout tab — page loads

## 9. Inventory

- [ ] Navigate to Inventory
- [ ] Item list loads
- [ ] Locations page loads
- [ ] **Create location:** Add a new warehouse/location
- [ ] Stock adjustments page loads
- [ ] Purchase Orders page — active PO counter shows a number
- [ ] Transactions page loads
- [ ] Fleet page loads (if applicable)

## 10. Finance

- [ ] Navigate to Finance
- [ ] Invoice snapshots page loads (may be empty if no ERPNext invoices)
- [ ] Purchase Orders from ERPNext visible (1 purchase invoice exists: ACC-PINV-2026-00001)
- [ ] Holdbacks page loads (Ontario Construction Act)
- [ ] Aged receivables page loads
- [ ] Expenses page loads

## 11. Executive Dashboard

- [ ] Navigate to Executive (role-gated — should work for platform_admin)
- [ ] Dashboard loads with charts/KPIs
- [ ] If charts show, verify no overflow/clipping
- [ ] Forecast chart renders
- [ ] Pipeline value chart renders

## 12. Timesheets

- [ ] Navigate to Timesheets
- [ ] Batch list loads
- [ ] Timesheet entry form accessible

## 13. Team

- [ ] Navigate to Team
- [ ] Team member list loads with real names (not "Loading... Team Member")
- [ ] Users without divisions still appear in the list
- [ ] Division filter works

## 14. Settings

- [ ] Navigate to Settings
- [ ] Divisions tab shows all 6 MDM divisions with correct names
- [ ] Roles tab shows 13 roles
- [ ] Users tab shows team members
- [ ] Notification preferences page loads
- [ ] Scoring rules page loads — rules visible

## 15. Admin

- [ ] Navigate to Admin area
- [ ] Reference data page loads
- [ ] Audit log page loads
- [ ] System health card shows service status

## 16. Navigation + UX Polish

- [ ] Breadcrumbs show correct labels on every page visited
- [ ] No page shows raw UUIDs where names should be
- [ ] No `window.prompt()` or `window.confirm()` browser popups — all use shadcn dialogs
- [ ] Empty states show helpful messages (not blank white pages)
- [ ] Loading skeletons appear during page transitions
- [ ] Mobile responsive — resize browser to mobile width, nav still usable
- [ ] Command palette opens (Cmd+K or Ctrl+K)

## 17. ERPNext Sync (if tunnel is live)

- [ ] Create an account in KrewPact — check if Customer appears in ERPNext
- [ ] View Finance > Invoices — purchase invoice ACC-PINV-2026-00001 should appear
- [ ] Admin > System Health shows ERPNext connectivity green

## 18. Error Handling

- [ ] Navigate to a bogus URL (e.g., /org/mdm-group/nonexistent) — 404 page shows, not crash
- [ ] Open browser console (F12) — no red errors on any visited page
- [ ] Sentry: check https://sentry.io for any new errors during testing

---

## Issues Found

| #   | Page | Issue | Severity | Screenshot |
| --- | ---- | ----- | -------- | ---------- |
| 1   |      |       |          |            |
| 2   |      |       |          |            |
| 3   |      |       |          |            |

## Sign-Off

| Role          | Name             | Date | Notes |
| ------------- | ---------------- | ---- | ----- |
| Product Owner | Michael Guirguis |      |       |
