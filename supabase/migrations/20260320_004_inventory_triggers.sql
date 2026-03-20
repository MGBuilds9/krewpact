-- ===========================
-- INVENTORY SYSTEM — TRIGGERS
-- updated_at for mutable tables only
-- ===========================

CREATE TRIGGER trg_fleet_vehicles_updated_at BEFORE UPDATE ON fleet_vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_item_categories_updated_at BEFORE UPDATE ON inventory_item_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_item_suppliers_updated_at BEFORE UPDATE ON inventory_item_suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_locations_updated_at BEFORE UPDATE ON inventory_locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_serials_updated_at BEFORE UPDATE ON inventory_serials FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_purchase_orders_updated_at BEFORE UPDATE ON inventory_purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_po_lines_updated_at BEFORE UPDATE ON inventory_po_lines FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_goods_receipts_updated_at BEFORE UPDATE ON inventory_goods_receipts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_bom_updated_at BEFORE UPDATE ON inventory_bom FOR EACH ROW EXECUTE FUNCTION set_updated_at();
