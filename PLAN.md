# 4-Hour CRM & Frontend Completion Plan

## Analysis Summary

The CRM has solid backend API coverage (50+ routes) and extensive hooks (`useCRM.ts` with ~40 hooks). The frontend pages exist with good list/detail patterns BUT many purpose-built CRM components are unused. There are ~15 components in `components/CRM/` that were built but never wired into pages.

---

## Phase 1: CRM Navigation & Layout Polish (30 min)

### 1.1 Add missing tabs to CRM Layout

**File:** `app/(dashboard)/org/[orgSlug]/crm/layout.tsx`

- Add "Dashboard" tab (href: `/crm/dashboard`)
- Add "Settings" dropdown or tab for Templates + Scoring
- Fix CRM redirect page to use org-aware path

### 1.2 Add CRM Global Search

**File:** `app/(dashboard)/org/[orgSlug]/crm/layout.tsx`

- Wire in the existing `GlobalSearch` component into the CRM header area
- Component already exists at `components/CRM/GlobalSearch.tsx`

---

## Phase 2: Lead Detail Page Enhancements (45 min)

### 2.1 Wire up Log Activity dialog

**Files:** `crm/leads/[id]/page.tsx`

- Add "Log Activity" button that opens `ActivityLogDialog` (component exists at `components/CRM/ActivityLogDialog.tsx`)
- Pass leadId context to pre-fill the activity

### 2.2 Add Notes Panel

- Wire `NotesPanel` component (exists at `components/CRM/NotesPanel.tsx`) into lead detail page
- Add as a card section below lead info

### 2.3 Add Lead Score Card

- Wire `LeadScoreCard` component into lead detail, replacing the inline score display
- Shows score breakdown (fit/intent/engagement) and recalculate button

### 2.4 Use ConvertLeadDialog

- Replace the simple `createOpportunity.mutate` with the proper `ConvertLeadDialog` component
- Dialog allows setting account, contact, opportunity name during conversion

### 2.5 Add Email Compose from Lead Detail

- Add "Send Email" button that opens `EmailComposeDialog`
- Pre-fills with lead's primary contact email

### 2.6 Add Tags support

- Add `TagSelector` to lead edit form
- Display `TagBadge` components on lead detail
- Add `TagFilterBar` to leads list page for filtering by tags

### 2.7 Add SLA Badge

- Show `SLABadge` on lead detail header showing follow-up urgency

---

## Phase 3: Opportunity Detail Enhancements (45 min)

### 3.1 Replace window.prompt with proper dialogs

**File:** `crm/opportunities/[id]/page.tsx`

- Replace `handleMarkLost` window.prompt with `LostDealDialog` component
- Add `WonDealDialog` for marking deals as won (with won_date, won_notes, sync_to_erp options)

### 3.2 Add Activity Log Dialog

- Add "Log Activity" button on opportunity detail page
- Opens `ActivityLogDialog` with opportunity context

### 3.3 Add Notes Panel

- Wire `NotesPanel` into opportunity detail page

### 3.4 Add Weighted Pipeline Header

- Wire `WeightedPipelineHeader` into opportunities list page header
- Shows weighted vs total pipeline value

### 3.5 Create New Opportunity Page

**File:** `crm/opportunities/new/page.tsx` (NEW)

- Form with: opportunity name, account select, contact select, division, stage, estimated revenue, probability, target close date
- Uses `OpportunityForm` component
- Add "New Opportunity" button to pipeline page

---

## Phase 4: Contact & Account Detail Enhancements (30 min)

### 4.1 Contact Detail: Add Log Activity + Email

- Add "Log Activity" button → `ActivityLogDialog`
- Add "Send Email" button → `EmailComposeDialog` (pre-filled with contact email)

### 4.2 Account Detail: Add Log Activity

- Add "Log Activity" button → `ActivityLogDialog`

### 4.3 Contact/Lead Creation: Duplicate Warning

- Wire `DuplicateWarningDialog` into new contact and new lead pages
- Check for duplicates before submission using existing `/api/crm/leads/check-duplicates` and `/api/crm/contacts/check-duplicates` endpoints

---

## Phase 5: Leads List Bulk Actions (30 min)

### 5.1 Add bulk selection to Leads DataTable

**File:** `crm/leads/page.tsx`

- Add checkbox column to DataTable for row selection
- Show `BulkActionBar` component when rows selected
- Actions: Bulk stage change, bulk assign, bulk delete, bulk export

---

## Phase 6: Documents Page (45 min)

### 6.1 Build functional Documents page

**File:** `app/(dashboard)/org/[orgSlug]/documents/page.tsx`

- Folder sidebar navigation (create folders)
- File list/grid with upload button
- Wire to existing `useDocuments` hook
- File upload using Supabase storage
- File preview/download
- Search and filter by folder

---

## Phase 7: Settings & Schedule Improvements (30 min)

### 7.1 Notification Preferences

**File:** `app/(dashboard)/org/[orgSlug]/settings/page.tsx`

- Build out notification preferences form (email digest frequency, notification types toggle)
- Categories: CRM updates, project updates, task assignments, system alerts

### 7.2 Schedule Calendar View

**File:** `app/(dashboard)/org/[orgSlug]/schedule/page.tsx`

- Replace "coming soon" with a basic month/week calendar grid
- Display tasks on their due dates
- Click task to navigate to project

---

## Phase 8: Build Verification & Tests (15 min)

- Run `npm run build` to verify no TypeScript/build errors
- Run `npm run test` to verify existing tests pass
- Fix any regressions

---

## Summary

| Phase     | Focus                       | Time        | Impact                                       |
| --------- | --------------------------- | ----------- | -------------------------------------------- |
| 1         | CRM Nav + Global Search     | 30m         | High - navigation completeness               |
| 2         | Lead Detail Enhancement     | 45m         | High - core CRM workflow                     |
| 3         | Opportunity Enhancement     | 45m         | High - deal management                       |
| 4         | Contact/Account Enhancement | 30m         | Medium - relationship management             |
| 5         | Bulk Actions                | 30m         | Medium - operational efficiency              |
| 6         | Documents Page              | 45m         | High - replaces stub with real functionality |
| 7         | Settings + Schedule         | 30m         | Medium - replaces stubs                      |
| 8         | Build Verification          | 15m         | Critical - ensure nothing broke              |
| **Total** |                             | **~4h 30m** |                                              |

### Components to Wire Up (already built, just not connected):

1. `ActivityLogDialog` → lead, contact, account, opportunity detail pages
2. `NotesPanel` → lead, opportunity detail pages
3. `EmailComposeDialog` → lead, contact detail pages
4. `ConvertLeadDialog` → lead detail page
5. `WonDealDialog` → opportunity detail page
6. `LostDealDialog` → opportunity detail page
7. `GlobalSearch` → CRM layout
8. `TagSelector` + `TagBadge` + `TagFilterBar` → leads pages
9. `LeadScoreCard` → lead detail page
10. `BulkActionBar` → leads list page
11. `SLABadge` → lead/opportunity detail pages
12. `WeightedPipelineHeader` → opportunities list page
13. `DuplicateWarningDialog` → new lead/contact pages
