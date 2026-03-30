BEGIN;

-- P1-4: Fix payroll_export_rows select to enforce role check
DROP POLICY IF EXISTS payroll_export_rows_select ON payroll_export_rows;
CREATE POLICY payroll_export_rows_select ON payroll_export_rows FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_any_role(ARRAY['payroll_admin', 'executive', 'accounting'])
  );

-- P2-4: Fix adp_field_mappings select to restrict to payroll roles
DROP POLICY IF EXISTS adp_field_mappings_select ON adp_field_mappings;
CREATE POLICY adp_field_mappings_select ON adp_field_mappings FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_any_role(ARRAY['payroll_admin', 'accounting'])
  );

COMMIT;
