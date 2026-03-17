import type { Metadata } from 'next';

import LeadsView from './LeadsView';

export const metadata: Metadata = {
  title: 'Leads — KrewPact',
  description: 'Manage and track your sales leads and pipeline opportunities.',
};

export default function LeadsPage() {
  return <LeadsView />;
}
