import type { Metadata } from 'next';

import LeadsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Leads — KrewPact',
  description: 'Manage and track your sales leads and pipeline opportunities.',
};

export default function LeadsPage() {
  return <LeadsPageContent />;
}
