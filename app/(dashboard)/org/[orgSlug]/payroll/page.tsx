import type { Metadata } from 'next';

import PayrollPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Payroll',
  description: 'ADP payroll export and timesheet batch management.',
};

export default function Page() {
  return <PayrollPageContent />;
}
