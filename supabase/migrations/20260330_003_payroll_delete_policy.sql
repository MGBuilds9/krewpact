CREATE POLICY payroll_export_rows_delete ON payroll_export_rows FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_any_role(ARRAY['payroll_admin'])
  );
