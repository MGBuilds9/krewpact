-- ===========================
-- INVENTORY SYSTEM — RLS POLICIES
-- ===========================

-- Enable RLS on all inventory tables
ALTER TABLE fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_item_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_po_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_gr_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_bom_lines ENABLE ROW LEVEL SECURITY;

-- ===========================
-- Parent tables: org + division scoped
-- ===========================

-- fleet_vehicles
CREATE POLICY fleet_vehicles_select ON fleet_vehicles FOR SELECT USING (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY fleet_vehicles_insert ON fleet_vehicles FOR INSERT WITH CHECK (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY fleet_vehicles_update ON fleet_vehicles FOR UPDATE USING (
  division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()
);
CREATE POLICY fleet_vehicles_delete ON fleet_vehicles FOR DELETE USING (is_platform_admin());

-- inventory_item_categories
CREATE POLICY inventory_item_categories_select ON inventory_item_categories FOR SELECT USING (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_item_categories_insert ON inventory_item_categories FOR INSERT WITH CHECK (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_item_categories_update ON inventory_item_categories FOR UPDATE USING (
  division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()
);
CREATE POLICY inventory_item_categories_delete ON inventory_item_categories FOR DELETE USING (is_platform_admin());

-- inventory_items
CREATE POLICY inventory_items_select ON inventory_items FOR SELECT USING (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_items_insert ON inventory_items FOR INSERT WITH CHECK (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_items_update ON inventory_items FOR UPDATE USING (
  division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()
);
CREATE POLICY inventory_items_delete ON inventory_items FOR DELETE USING (is_platform_admin());

-- inventory_locations
CREATE POLICY inventory_locations_select ON inventory_locations FOR SELECT USING (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_locations_insert ON inventory_locations FOR INSERT WITH CHECK (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_locations_update ON inventory_locations FOR UPDATE USING (
  division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()
);
CREATE POLICY inventory_locations_delete ON inventory_locations FOR DELETE USING (is_platform_admin());

-- inventory_serials
CREATE POLICY inventory_serials_select ON inventory_serials FOR SELECT USING (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_serials_insert ON inventory_serials FOR INSERT WITH CHECK (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_serials_update ON inventory_serials FOR UPDATE USING (
  division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()
);
CREATE POLICY inventory_serials_delete ON inventory_serials FOR DELETE USING (is_platform_admin());

-- inventory_lots (no UPDATE — immutable)
CREATE POLICY inventory_lots_select ON inventory_lots FOR SELECT USING (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_lots_insert ON inventory_lots FOR INSERT WITH CHECK (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_lots_delete ON inventory_lots FOR DELETE USING (is_platform_admin());

-- inventory_ledger (SELECT + INSERT only — update/delete blocked by RULE)
CREATE POLICY inventory_ledger_select ON inventory_ledger FOR SELECT USING (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_ledger_insert ON inventory_ledger FOR INSERT WITH CHECK (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);

-- inventory_purchase_orders
CREATE POLICY inventory_purchase_orders_select ON inventory_purchase_orders FOR SELECT USING (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_purchase_orders_insert ON inventory_purchase_orders FOR INSERT WITH CHECK (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_purchase_orders_update ON inventory_purchase_orders FOR UPDATE USING (
  division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()
);
CREATE POLICY inventory_purchase_orders_delete ON inventory_purchase_orders FOR DELETE USING (is_platform_admin());

-- inventory_goods_receipts
CREATE POLICY inventory_goods_receipts_select ON inventory_goods_receipts FOR SELECT USING (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_goods_receipts_insert ON inventory_goods_receipts FOR INSERT WITH CHECK (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_goods_receipts_update ON inventory_goods_receipts FOR UPDATE USING (
  division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()
);
CREATE POLICY inventory_goods_receipts_delete ON inventory_goods_receipts FOR DELETE USING (is_platform_admin());

-- inventory_bom
CREATE POLICY inventory_bom_select ON inventory_bom FOR SELECT USING (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_bom_insert ON inventory_bom FOR INSERT WITH CHECK (
  (org_id::text = krewpact_org_id()) AND (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin())
);
CREATE POLICY inventory_bom_update ON inventory_bom FOR UPDATE USING (
  division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()
);
CREATE POLICY inventory_bom_delete ON inventory_bom FOR DELETE USING (is_platform_admin());

-- ===========================
-- Child tables: parent-join policies
-- ===========================

-- inventory_item_suppliers (via inventory_items)
CREATE POLICY inventory_item_suppliers_select ON inventory_item_suppliers FOR SELECT USING (
  EXISTS (SELECT 1 FROM inventory_items i WHERE i.id = inventory_item_suppliers.item_id
    AND i.org_id::text = krewpact_org_id()
    AND (i.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_item_suppliers_insert ON inventory_item_suppliers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM inventory_items i WHERE i.id = inventory_item_suppliers.item_id
    AND i.org_id::text = krewpact_org_id()
    AND (i.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_item_suppliers_update ON inventory_item_suppliers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM inventory_items i WHERE i.id = inventory_item_suppliers.item_id
    AND (i.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_item_suppliers_delete ON inventory_item_suppliers FOR DELETE USING (is_platform_admin());

-- inventory_spots (via inventory_locations)
CREATE POLICY inventory_spots_select ON inventory_spots FOR SELECT USING (
  EXISTS (SELECT 1 FROM inventory_locations l WHERE l.id = inventory_spots.location_id
    AND l.org_id::text = krewpact_org_id()
    AND (l.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_spots_insert ON inventory_spots FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM inventory_locations l WHERE l.id = inventory_spots.location_id
    AND l.org_id::text = krewpact_org_id()
    AND (l.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_spots_update ON inventory_spots FOR UPDATE USING (
  EXISTS (SELECT 1 FROM inventory_locations l WHERE l.id = inventory_spots.location_id
    AND (l.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_spots_delete ON inventory_spots FOR DELETE USING (is_platform_admin());

-- inventory_po_lines (via inventory_purchase_orders)
CREATE POLICY inventory_po_lines_select ON inventory_po_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM inventory_purchase_orders po WHERE po.id = inventory_po_lines.po_id
    AND po.org_id::text = krewpact_org_id()
    AND (po.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_po_lines_insert ON inventory_po_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM inventory_purchase_orders po WHERE po.id = inventory_po_lines.po_id
    AND po.org_id::text = krewpact_org_id()
    AND (po.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_po_lines_update ON inventory_po_lines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM inventory_purchase_orders po WHERE po.id = inventory_po_lines.po_id
    AND (po.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_po_lines_delete ON inventory_po_lines FOR DELETE USING (is_platform_admin());

-- inventory_gr_lines (via inventory_goods_receipts)
CREATE POLICY inventory_gr_lines_select ON inventory_gr_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM inventory_goods_receipts gr WHERE gr.id = inventory_gr_lines.gr_id
    AND gr.org_id::text = krewpact_org_id()
    AND (gr.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_gr_lines_insert ON inventory_gr_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM inventory_goods_receipts gr WHERE gr.id = inventory_gr_lines.gr_id
    AND gr.org_id::text = krewpact_org_id()
    AND (gr.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_gr_lines_delete ON inventory_gr_lines FOR DELETE USING (is_platform_admin());

-- inventory_bom_lines (via inventory_bom)
CREATE POLICY inventory_bom_lines_select ON inventory_bom_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM inventory_bom b WHERE b.id = inventory_bom_lines.bom_id
    AND b.org_id::text = krewpact_org_id()
    AND (b.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_bom_lines_insert ON inventory_bom_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM inventory_bom b WHERE b.id = inventory_bom_lines.bom_id
    AND b.org_id::text = krewpact_org_id()
    AND (b.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions())) OR is_platform_admin()))
);
CREATE POLICY inventory_bom_lines_delete ON inventory_bom_lines FOR DELETE USING (is_platform_admin());
