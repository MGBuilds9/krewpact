import type { Metadata } from 'next';

import OpportunitiesView from './OpportunitiesView';

export const metadata: Metadata = {
  title: 'Opportunities — KrewPact',
  description: 'Track and manage your sales pipeline and opportunity stages.',
};

export default function OpportunitiesPage() {
  return <OpportunitiesView />;
}
