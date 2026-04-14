# 11. ERPNext Webhook Setup (Reverse Sync)

Configures ERPNext to POST document events to KrewPact so ERPNext-authoritative financial data (invoices, payments, GL entries) mirrors into Supabase snapshot tables for reporting.

## When to run this

- First-time ERPNext install (after the Cloudflare tunnel is up).
- After rotating `ERPNEXT_WEBHOOK_SECRET` in Vercel.
- After adding a new inbound doctype to `app/api/webhooks/erpnext/route.ts`.

## Prerequisites

- `ERPNEXT_WEBHOOK_SECRET` is set in Vercel (Production + Development; Preview
  needs `vercel env add ERPNEXT_WEBHOOK_SECRET preview <branch>` per branch)
  and stored in 1Password.
- `NEXT_PUBLIC_APP_URL` points at the production URL (`https://krewpact.ca`).
- ERPNext System Manager access (or an API key with `Webhook` write permission).
- Migration `20260413_001_erp_sync_text_entity_ids.sql` applied — `erp_sync_jobs.entity_id`
  and `erp_sync_map.local_id` must be `text`, not `uuid`, because inbound docnames
  (`SINV-2026-0042`, `PROJ-0003`) are not UUIDs and previously caused silent insert
  failures in `createSyncJob`.

## Current production state (as of 2026-04-13)

7 webhooks registered and enabled, all pointing at `https://krewpact.ca/api/webhooks/erpnext`:
`KP Sales Invoice Submit` / `Update`, `KP Purchase Invoice Submit` / `Update`,
`KP Payment Entry Submit` / `Cancel`, `KP GL Entry AfterInsert`.
Endpoint verified: fresh POST returns `{"received":true,...}`; repeat within 5 min
returns `{"received":true,"deduplicated":true}`. End-to-end outbound CRUD also
validated against real ERPNext (see "Verify" below for the reproducible steps).

## Supported doctypes

The endpoint at `POST https://krewpact.ca/api/webhooks/erpnext` accepts the following:

| Doctype          | Events                                | Action on KrewPact         |
| ---------------- | ------------------------------------- | -------------------------- |
| Sales Invoice    | `on_submit`, `on_update_after_submit` | Upsert `invoice_snapshots` |
| Purchase Invoice | `on_submit`, `on_update_after_submit` | Upsert `po_snapshots`      |
| Payment Entry    | `on_submit`, `on_cancel`              | Log to `erp_sync_events`   |
| GL Entry         | `after_insert` (not submittable)      | Log to `erp_sync_events`   |

Outbound-only doctypes (Customer, Project, Opportunity, Contact, Quotation, Sales Order, Expense Claim, Item, Supplier, Employee, Stock Entry) are accepted by the endpoint to avoid 4xx noise in ERPNext logs, but no KrewPact write-back occurs — KrewPact is the source of truth for those.

## Configure in ERPNext

For each doctype in the table above:

1. ERPNext → **Integrations → Webhook → New**.
2. **DocType**: the doctype name exactly (e.g. `Sales Invoice`).
3. **DocEvent**: tick the events column above.
4. **Request URL**: `https://krewpact.ca/api/webhooks/erpnext`
5. **Request Structure**: `Form URL-Encoded` → switch to `JSON`.
6. **Webhook Headers**:
   - `Content-Type` = `application/json`
   - `x-webhook-secret` = value of `ERPNEXT_WEBHOOK_SECRET` from Vercel
7. **Webhook Data** — Paste this JSON template (uses Jinja):

   ```json
   {
     "doctype": "{{ doc.doctype }}",
     "name": "{{ doc.name }}",
     "event": "{{ event }}",
     "modified": "{{ doc.modified }}"
   }
   ```

8. **Enable** the webhook and **Save**.

## Verify

From any ERPNext sandbox user:

1. Submit a test Sales Invoice.
2. Tail Vercel logs: `vercel logs krewpact --since 2m | grep erpnext-webhook`.
3. Expect: `ERPNext webhook received` → `Sales Invoice inbound sync complete`.
4. Check Supabase:

   ```sql
   select erp_docname, invoice_number, status, total_amount, updated_at
   from invoice_snapshots
   order by updated_at desc
   limit 5;
   ```

   The test invoice should appear within ~2 seconds of submission.

## Troubleshooting

| Symptom                                   | Cause                                             | Fix                                                  |
| ----------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| `401 Unauthorized` in ERPNext webhook log | `x-webhook-secret` header missing / wrong         | Copy from Vercel env; case-sensitive                 |
| `500 Webhook not configured`              | `ERPNEXT_WEBHOOK_SECRET` unset in Vercel          | `vercel env add ERPNEXT_WEBHOOK_SECRET`              |
| `400 Missing document name`               | Jinja `{{ doc.name }}` empty — draft doc          | Only fire on `on_submit`, not `on_update` for drafts |
| Duplicate entries in `invoice_snapshots`  | Replay protection bypassed                        | Upsert uses `onConflict: erp_docname` — safe         |
| Webhook fires but snapshot never updates  | KrewPact returned 2xx but handler failed silently | Check `erp_sync_jobs` + `erp_sync_errors` tables     |

## Replay protection

KrewPact dedups webhook deliveries via an Upstash Redis `SET NX` keyed on `doctype:name:modified` (5-minute TTL). If Redis is down the request is processed anyway (fail-open). Watch the `Duplicate ERPNext webhook — skipping` log line for dedup hits.

## Security notes

- Only set the webhook secret header in ERPNext — never in the request body.
- Rotate the secret yearly or on any suspected exposure. Updates require both Vercel and ERPNext.
- The endpoint uses `crypto.timingSafeEqual` to avoid timing leaks.
- Webhook events are not authenticated by user identity; treat them as system-level. Never derive user state from webhook payloads.
