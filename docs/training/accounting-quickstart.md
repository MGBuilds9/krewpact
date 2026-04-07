# Accounting Quick Start Guide

## Getting Started

1. **Login** at `app.krewpact.com` with your MDM email
2. You have access to **Finance** views across all divisions

## Finance Views

### Invoices

1. Navigate to **Finance > Invoices**
2. View sales invoice snapshots synced from ERPNext
3. Filter by project, status (Draft, Submitted, Paid, Overdue), or date range
4. Click an invoice to see line items, amounts, and payment status
5. **Note:** Invoices are read-only in KrewPact — edit in ERPNext

### Purchase Orders

1. Navigate to **Finance > Purchase Orders**
2. View PO snapshots synced from ERPNext
3. Filter by project, supplier, or status
4. **Note:** POs are read-only — create and manage in ERPNext

### Job Costs

1. Navigate to **Finance > Job Costs**
2. View cost breakdown by project and cost code
3. Compare **budgeted** vs **actual** costs
4. Identify cost overruns early

## Expense Management

### Review Expenses

1. Navigate to **Expenses**
2. View submitted expense claims from team members
3. Filter by status: Pending, Approved, Rejected
4. Click an expense to see receipts and details

### Approve/Reject

1. Open a pending expense
2. Review receipts and line items
3. Click **Approve** or **Reject** (with reason)

## Timesheet Batches

1. Navigate to **Timesheet Batches**
2. View submitted time entry batches for payroll processing
3. Review and **approve** batches for payroll sync

## ERPNext Sync

- Invoice and PO data syncs automatically every 30 minutes via cron
- Changes in ERPNext appear in KrewPact within the next sync cycle
- If data seems stale, contact the Platform Admin to trigger a manual sync

## Reports

1. Navigate to **Reports**
2. Available reports include project financials, division summaries, and cost analyses
3. Filter by date range, division, and project

## Tips

- Use job costs view to monitor project profitability in real-time
- Flag overdue invoices to the PM for follow-up
- All financial source-of-truth is ERPNext — KrewPact provides convenient views
- Expense approvals trigger notifications to the submitter

## Need Help?

Contact the Platform Admin or Operations Manager.
