-- ===========================
-- Fix XX000 referential integrity error on parents of inventory_ledger
-- ===========================
--
-- The `inventory_ledger_no_update` rule (DO INSTEAD NOTHING on UPDATE) was
-- rewriting away the internal UPDATE that Postgres' RI trigger issues for
-- ON DELETE SET NULL FK actions. This caused every parent delete to fail with:
--
--   ERROR:  XX000: referential integrity query on "<parent>" from constraint
--           "<fk>" on "inventory_ledger" gave unexpected result
--   HINT:   This is most likely due to a rule having rewritten the query.
--
-- The error fires even when zero referencing rows exist, because Postgres
-- raises before checking row count. Affected parents: projects, inventory_spots,
-- inventory_serials, inventory_locations (via counterpart_location_id).
--
-- Surfaced 2026-04-14 by scripts/audit-write-paths.ts: DELETE /api/projects/[id]
-- always 500'd even on freshly-created projects with no ledger history.
--
-- Fix: change all 4 SET NULL FKs to RESTRICT. RESTRICT uses a SELECT probe
-- (not UPDATE), so the rule no longer interferes. This is also semantically
-- correct for an immutable append-only ledger: historical transactions must
-- preserve the parent reference. Deleting a parent with ledger history now
-- fails with a clear FK violation instead of cryptic XX000.

ALTER TABLE inventory_ledger
  DROP CONSTRAINT inventory_ledger_project_id_fkey,
  ADD  CONSTRAINT inventory_ledger_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;

ALTER TABLE inventory_ledger
  DROP CONSTRAINT inventory_ledger_spot_id_fkey,
  ADD  CONSTRAINT inventory_ledger_spot_id_fkey
    FOREIGN KEY (spot_id) REFERENCES inventory_spots(id) ON DELETE RESTRICT;

ALTER TABLE inventory_ledger
  DROP CONSTRAINT inventory_ledger_serial_id_fkey,
  ADD  CONSTRAINT inventory_ledger_serial_id_fkey
    FOREIGN KEY (serial_id) REFERENCES inventory_serials(id) ON DELETE RESTRICT;

ALTER TABLE inventory_ledger
  DROP CONSTRAINT inventory_ledger_counterpart_location_id_fkey,
  ADD  CONSTRAINT inventory_ledger_counterpart_location_id_fkey
    FOREIGN KEY (counterpart_location_id) REFERENCES inventory_locations(id) ON DELETE RESTRICT;
