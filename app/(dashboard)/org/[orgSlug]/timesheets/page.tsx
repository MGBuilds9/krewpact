import type { Metadata } from 'next';

import TimesheetsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Timesheets',
  description: 'Submit, review, and approve employee timesheets and batches.',
};

export default function Page() {
  return <TimesheetsPageContent />;
}
