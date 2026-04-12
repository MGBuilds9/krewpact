-- Migration: Create a SECURITY INVOKER wrapper view over inventory_stock_summary
-- Purpose: Close the RLS gap where the materialized view returns rows for all
-- divisions regardless of the caller's access. The new view INNER JOINs
-- inventory_items and inventory_locations so RLS policies on those tables
-- gate which rows the caller can see.
--
-- The underlying materialized view stays untouched — it's refreshed by the
-- service role (no RLS) and is needed for performance. User-facing queries
-- should hit inventory_stock_summary_secure instead.

CREATE OR REPLACE VIEW inventory_stock_summary_secure
WITH (security_invoker = true)
AS
SELECT
  iss.item_id,
  iss.location_id,
  iss.spot_id,
  iss.qty_on_hand,
  iss.total_value,
  iss.last_transaction_at,
  ii.name       AS item_name,
  ii.sku        AS item_sku,
  ii.division_id,
  il.name       AS location_name
FROM inventory_stock_summary iss
INNER JOIN inventory_items ii     ON iss.item_id = ii.id
INNER JOIN inventory_locations il ON iss.location_id = il.id;

-- Grant access to authenticated role only (no anon — stock data requires auth)
GRANT SELECT ON inventory_stock_summary_secure TO authenticated;
