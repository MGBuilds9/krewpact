# PIPEDA Privacy Request — Access, Correction, or Deletion

**Severity:** P2
**Time to resolve:** Up to 30 days (legal deadline); initial response in 1–2 business days
**Who can do this:** Platform Admin + Michael Guirguis (final approval required)

## Symptoms / Triggers
- An employee, client, or trade partner submits a written request to:
  - Access their personal data ("what do you have on me?")
  - Correct inaccurate personal data
  - Delete their personal data ("right to erasure")
- A legal notice or OPC complaint is received

## Where Personal Data Lives

| System | What it holds | Who can access |
|--------|--------------|----------------|
| **Clerk** | Name, email, Microsoft account link, sign-in history, phone | Platform Admin via Clerk dashboard |
| **Supabase** | Leads, contacts, project records, daily logs, outreach history, IP addresses in audit logs | Platform Admin via Supabase SQL editor |
| **ERPNext** | Invoices, expense claims, supplier/customer records (if the person is a vendor or client contact) | IT Admin via erp.mdmgroupinc.ca |
| **Microsoft 365** | Email threads, calendar events, Teams messages | IT Admin via M365 admin center |

## Steps

1. **Verify the request in writing**
   - The request must be in writing (email to admin@mdmgroupinc.ca is acceptable)
   - Confirm the identity of the requester before proceeding (ask for a government ID if uncertain)
   - Log the request date — PIPEDA requires a response within **30 calendar days**

2. **Export data from Clerk**
   - Go to https://dashboard.clerk.com → Users → find the user
   - Click the user → note all fields: name, email, created date, last sign-in, linked accounts
   - Screenshot or export as needed

3. **Export data from Supabase**
   - Go to https://supabase.com/dashboard → KrewPact → SQL Editor
   - Run a search across the relevant tables (ask Michael Guirguis for the exact query for the person's email/ID):
   ```sql
   -- Example: find a lead by email
   SELECT * FROM leads WHERE email = 'person@example.com';
   SELECT * FROM contacts WHERE email = 'person@example.com';
   SELECT * FROM audit_logs WHERE user_email = 'person@example.com';
   ```
   - Export results as CSV (copy from SQL editor)

4. **Check ERPNext**
   - Log in to https://erp.mdmgroupinc.ca
   - Search for the person's name/email in Customer, Supplier, Contact doctypes
   - Export or note any records found

5. **For Access Requests**
   - Compile the data from all systems into a single document
   - Redact any third-party personal data that appears in the records
   - Send to the requester via secure email within 30 days

6. **For Correction Requests**
   - Update the incorrect data in each system where it appears
   - Document what was changed and when

7. **For Deletion Requests**
   - Delete from Clerk: Dashboard → Users → Delete user
   - Delete from Supabase: SQL editor (ask Michael Guirguis to review before running DELETE statements)
   - Notify ERPNext admin to anonymize/delete accounting records as allowed by law
   - Note: Some records (financial documents, legal contracts) may have mandatory retention periods — do NOT delete these without legal review
   - Confirm deletion in writing to the requester

## Escalation
- Michael Guirguis must approve all deletions before execution
- For complex requests or complaints: consult MDM's legal counsel
- OPC (Privacy Commissioner of Canada): https://www.priv.gc.ca — complaints must be acknowledged within 30 days
