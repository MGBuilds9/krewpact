-- Inbound reverse sync (ERPNext → KrewPact) uses ERPNext docnames like
-- 'PROJ-0003' or 'SINV-2026-0042' as entity identifiers. The previous uuid
-- typing caused readSalesInvoice / readPaymentEntry / readGlEntry inserts
-- to fail silently in createSyncJob(), so inbound webhook deliveries were
-- returning 200 externally but never logging a sync job.
--
-- Widen the columns to text. Outbound UUIDs coerce cleanly; indexes stay
-- valid; the unique constraint on (entity_type, local_id, erp_doctype)
-- is recreated automatically against the widened type.
--
-- Applied to production via Supabase MCP on 2026-04-13 after the schema
-- mismatch was observed during end-to-end sync validation.

alter table erp_sync_jobs
  alter column entity_id type text using entity_id::text;

alter table erp_sync_map
  alter column local_id type text using local_id::text;
